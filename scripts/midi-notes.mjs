// Reads a MIDI file's notes: for turning a public-domain score (typeset in
// LilyPond by the Mutopia Project, converted with `lilypond` to MIDI) into the
// written notes core/concert-player.js plays. No dependency: a small parser.
//
//   import { readMidi } from './midi-notes.mjs';
//   const { ppq, tempos, tracks } = readMidi(buffer);
//   tracks[i].notes: [startTick, lengthTicks, midiNote, velocity]
//
//   node scripts/midi-notes.mjs file.midi      prints a summary
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function readMidi(buf) {
  let p = 0;
  const u32 = () => { const v = buf.readUInt32BE(p); p += 4; return v; };
  const u16 = () => { const v = buf.readUInt16BE(p); p += 2; return v; };
  const str = (n) => { const s = buf.toString('latin1', p, p + n); p += n; return s; };
  const vlq = () => { let v = 0, b; do { b = buf[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };
  if (str(4) !== 'MThd') throw new Error('not a MIDI file');
  u32(); u16();
  const n = u16(), ppq = u16();
  if (ppq & 0x8000) throw new Error('SMPTE time is not supported');
  const tempos = [], sigs = [], tracks = [];
  for (let k = 0; k < n; k++) {
    if (str(4) !== 'MTrk') throw new Error('bad track');
    const end = u32() + p, notes = [], on = new Map();
    let tick = 0, status = 0, name = '';
    while (p < end) {
      tick += vlq();
      let b = buf[p];
      if (b & 0x80) { status = b; p++; } // (else: running status)
      if (status === 0xff) {
        const type = buf[p++], len = vlq();
        if (type === 0x51) tempos.push([tick, 60000000 / ((buf[p] << 16) | (buf[p + 1] << 8) | buf[p + 2])]);
        else if (type === 0x58) sigs.push([tick, buf[p], 2 ** buf[p + 1]]);
        else if (type === 0x03 && !name) name = buf.toString('utf8', p, p + len);
        p += len;
      } else if (status === 0xf0 || status === 0xf7) p += vlq();
      else {
        const hi = status & 0xf0, d1 = buf[p++], d2 = hi === 0xc0 || hi === 0xd0 ? 0 : buf[p++];
        const key = (status & 0x0f) * 128 + d1;
        if (hi === 0x90 && d2 > 0) { if (!on.has(key)) on.set(key, [tick, d2]); }
        else if (hi === 0x80 || hi === 0x90) { const s = on.get(key); if (s) { on.delete(key); if (tick > s[0]) notes.push([s[0], tick - s[0], d1, s[1]]); } }
      }
    }
    p = end;
    notes.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
    tracks.push({ name, notes });
  }
  tempos.sort((a, b) => a[0] - b[0]);
  return { ppq, tempos, sigs, tracks };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const m = readMidi(readFileSync(process.argv[2]));
  console.log('ppq', m.ppq, 'tempos', m.tempos.slice(0, 8).map(([t, b]) => `${(t / m.ppq).toFixed(1)}:${b.toFixed(0)}`).join(' '), m.tempos.length > 8 ? `(+${m.tempos.length - 8})` : '', 'time', m.sigs.map(([t, a, b]) => `${(t / m.ppq).toFixed(0)}:${a}/${b}`).join(' '));
  for (const t of m.tracks) if (t.notes.length) console.log(`  ${t.name || '(no name)'}: ${t.notes.length} notes, quarters ${(t.notes[0][0] / m.ppq).toFixed(2)} to ${((t.notes.at(-1)[0] + t.notes.at(-1)[1]) / m.ppq).toFixed(2)}, pitch ${Math.min(...t.notes.map((x) => x[2]))}..${Math.max(...t.notes.map((x) => x[2]))}`);
}
