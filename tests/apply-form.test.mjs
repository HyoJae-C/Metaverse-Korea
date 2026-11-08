import test from 'node:test';
import assert from 'node:assert/strict';
import { TEXT, firstError, checkFiles, uploadPath, fill, MAX_BYTES } from '../src/apply/form.js';

const img = (name, size = 1000, type = 'image/jpeg') => ({ name, size, type });
const ok = { name: 'Mina', email: 'mina@example.com', kinds: ['solo'], who: 'artist', intro: 'Hello', christmas: 'no', consent: true };

test('a filled-in form can be sent', () => {
  assert.equal(firstError(ok, [img('a.jpg')]), null);
});

test('the first missing field is named, in form order', () => {
  assert.equal(firstError({ ...ok, name: ' ' }, [img('a.jpg')]), 'name');
  assert.equal(firstError({ ...ok, email: 'nope' }, [img('a.jpg')]), 'email');
  assert.equal(firstError({ ...ok, kinds: [] }, [img('a.jpg')]), 'kinds');
  assert.equal(firstError({ ...ok, kinds: ['billboard'] }, [img('a.jpg')]), 'kinds');
  assert.equal(firstError({ ...ok, who: '' }, [img('a.jpg')]), 'who');
  assert.equal(firstError(ok, []), 'images');
  assert.equal(firstError({ ...ok, christmas: '' }, [img('a.jpg')]), 'christmas');
  assert.equal(firstError({ ...ok, consent: false }, [img('a.jpg')]), 'consent');
});

test('images: only pictures, 10 MB each, 10 at most', () => {
  assert.deepEqual(checkFiles([img('a.png', 10, 'image/png')]), []);
  assert.equal(checkFiles([img('big.jpg', MAX_BYTES + 1)])[0].key, 'tooBig');
  assert.equal(checkFiles([img('doc.pdf', 10, 'application/pdf')])[0].key, 'type');
  assert.equal(checkFiles([img('phone.HEIC', 10, '')]).length, 0); // (some phones send no type)
  assert.equal(checkFiles(Array.from({ length: 11 }, (_, i) => img(i + '.jpg')))[0].key, 'tooMany');
});

test('upload paths match what the server accepts', () => {
  const re = /^apps\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+$/;
  for (const f of [img('내 그림.JPG'), img('noext', 1, 'image/webp'), img('x.heic', 1, '')]) {
    assert.match(uploadPath('abc-123', 0, f), re);
  }
  assert.equal(uploadPath('f', 2, img('a.PNG')), 'apps/f/03.png');
});

test('every Korean text has an English one', () => {
  const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]));
  assert.deepEqual(keys(TEXT.en).sort(), keys(TEXT.ko).sort());
  assert.equal(fill(TEXT.en.err.tooBig, { f: 'a.jpg' }), 'This image is over 10 MB: a.jpg');
});
