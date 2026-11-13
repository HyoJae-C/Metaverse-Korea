// Rooftop Rumble: the arcade's 3D one-on-one fighting game (rules in
// core/brawl.js). You fight as your own character, dressed as you are,
// against five rivals on a night rooftop. The stage is built in the room's
// own scene, far under its floor, and the game's camera goes there while
// you play (like darts and bowling: game/arcade.js). Loaded the first time
// you play, from the game cabinet in a claw-machine room.
import * as THREE from 'three';
import { createCharacter } from '../core/character.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { TICK, RING_R, ROUNDS_TO_WIN, moveTicks, createMatch, loadBrawl, afterMatch, saveStyle, RIVALS, STYLES, STYLE_IDS, movesFor, SP_COST } from '../core/brawl.js';
import { createSession } from '../core/brawl-net.js';
import { createCaster, createSoloCaster } from '../core/brawl-tv.js';

const T = {
  title: { en: 'Rooftop Rumble', ko: '���� ������', ja: '�߾���֫�', zh: '����̫����', es: 'Rooftop Rumble', id: 'Rooftop Rumble', vi: 'Rooftop Rumble', hi: '??????? ????', fr: 'Rooftop Rumble', th: '?????????', ar: '???? ?????' },
  how: {
    en: 'You fight as your own character. Keep pressing punch, or kick, and a string of hits comes out. Hold away from your rival to guard, and step up or down to slip round a punch. Hitting, guarding and being hit fill the special bar; each half of it is one special. Best of three rounds.',
    ko: '�� ĳ���� �״�� �ο���. �ָ��̳� �� ��ư�� ��� ������ ���ӱⰡ ������. ��� �ݴ������� ������ ������ ����, ���Ʒ��� �������ؼ� �ָ��� ���ؿ�. ������, ����, ������ �ʻ�� �������� ����, �� ĭ�� �ʻ�� �� ���̿���. 3�� 2����.',
    ja: '���ªΫ���髯��?�Ϊު�?���ު����ѫ�������ë����㪷?���������֧?������ު�����⢪���?������êѪʪ��ǫ�?�ɡ�߾����?��Ѫ��ƫѫ���򪫪諾����?�ƪ�?��?�ɪ���?���骦����߯��?�������ުꡢ���ª���߯��1�ޡ�3���ݶ��',
    zh: '��?����������߾?��?����������������?�������???���۰�����٣�߾��?�??���롣?�顢���١�?��Դ???��?�ˣ�����̫ʦۯ�����?����߲��??��',
    es: 'Peleas con tu propio personaje. Sigue pulsando puno o patada y sale un combo. Manten hacia atras para cubrirte y da un paso arriba o abajo para esquivar. Golpear, cubrirte y recibir golpes llenan la barra especial; cada mitad es un especial. Al mejor de tres.',
    id: 'Kamu bertarung dengan karaktermu sendiri. Tekan terus pukulan atau tendangan dan kombonya keluar. Tahan menjauh dari lawan untuk bertahan, melangkah ke atas atau bawah untuk menghindar. Memukul, bertahan, dan terkena pukulan mengisi bar spesial; tiap setengahnya satu jurus spesial. Dua dari tiga ronde.',
    vi: 'B?n chi?n ��?u b?ng chinh nhan v?t c?a minh. C? b?m lien t?c ��?m ho?c ��a la ra chu?i ��on. Gi? h??ng ra xa ��?i th? ��? ��?, b??c len ho?c xu?ng ��? ne. ��anh trung, ��? ��on va b? ��anh ��?u n?p thanh tuy?t chieu; m?i n?a thanh la m?t tuy?t chieu. Th?ng 2 tren 3 hi?p.',
    hi: '?? ???? ?? ?????? ?? ????? ???? ?????? ?? ??? ???-??? ????? ???? ?? ?????? ?????? ??? ???? ?? ??? ????????????? ?? ??? ???? ????, ?????? ?? ???? ?? ??? ??? ?? ???? ????? ?????, ????? ?? ??? ???? ?? ?????? ??? ???? ??; ?? ??? ?????? ?? ?? ??????? ??? ??? ?? ?? ??????',
    fr: "Tu te bats avec ton propre personnage. Continue d'appuyer sur poing ou sur pied et un enchainement sort. Maintiens la direction opposee pour te proteger, fais un pas en haut ou en bas pour esquiver. Frapper, parer et encaisser remplissent la jauge speciale ; chaque moitie vaut un coup special. Deux manches gagnantes.",
    th: '??????????????????????? ???????????????? ? ????????????? ???????????????????????????????????? ?????????????????????????? ????? ??????? ?????????????????????????? ???????????????????????? ??? 2 ?? 3 ??',
    ar: '????? ??????? ??? ??. ???? ????? ??? ?????? ?? ?????? ????? ????? ?????. ???? ??????? ?? ???? ????? ?????? ?????? ?? ?????? ?????? ??????. ????? ????? ?????? ??????? ???? ???? ?????? ??????? ??? ??? ??? ???? ???? ?????. ?????? ?? ???? ?????.',
  },
  moves: {
    en: '�� + punch: launcher �� ?1: guard breaker �� ?2: flying kick',
    ko: '�� + �ָ�: ���� �� ?1: ���� ���� �� ?2: ��������',
    ja: '�棫�ѫ����ݩ������ �� ?1����?���ڪ� �� ?2��ޫ������',
    zh: '�� + �룺ݩ�� �� ?1������ �� ?2��??',
    es: '�� + puno: lanzador �� ?1: rompeguardias �� ?2: patada voladora',
    id: '�� + pukulan: pelontar �� ?1: pemecah pertahanan �� ?2: tendangan terbang',
    vi: '�� + ��?m: h?t tung �� ?1: pha th? �� ?2: ��a bay',
    hi: '�� + ??????: ?????? �� ?1: ????? ???? �� ?2: ????? ???',
    fr: '�� + poing : lanceur �� ?1 : brise-garde �� ?2 : coup de pied saute',
    th: '�� + ????: ?????? �� ?1: ?????????? �� ?2: ??????',
    ar: '�� + ????: ???? ????? �� ?1: ????? ???? �� ?2: ???? ?????',
  },
  keys: {
    en: 'A D move �� W S side-step �� J punch �� K kick �� U I specials',
    ko: 'A D �̵� �� W S ������ �� J �ָ� �� K �� �� U I �ʻ��',
    ja: 'A D ��� �� W S ?��� �� J �ѫ�� �� K ���ë� �� U I ��߯��',
    zh: 'A D �? �� W S ?� �� J �� �� K �� �� U I ��?��',
    es: 'A D mover �� W S paso lateral �� J puno �� K patada �� U I especiales',
    id: 'A D gerak �� W S langkah samping �� J pukulan �� K tendangan �� U I spesial',
    vi: 'A D di chuy?n �� W S b??c ngang �� J ��?m �� K ��a �� U I tuy?t chieu',
    hi: 'A D ???? �� W S ??? ??? �� J ?????? �� K ??? �� U I ??????',
    fr: 'A D bouger �� W S pas de cote �� J poing �� K pied �� U I speciaux',
    th: 'A D ???? �� W S ???????? �� J ???? �� K ??? �� U I ?????????',
    ar: 'A D ????? �� W S ???? ?????? �� J ???? �� K ???? �� U I ????? ????',
  },
  start: { en: 'Fight {name}', ko: '{name}�� ���', ja: '{name}��??', zh: '��?{name}', es: 'Pelear contra {name}', id: 'Lawan {name}', vi: '��?u v?i {name}', hi: '{name} ?? ?????', fr: 'Affronter {name}', th: '?????? {name}', ar: '???? {name}' },
  rival: { en: 'Rival {n} of {max}', ko: '��� {n} / {max}', ja: '�髤�Ы� {n} / {max}', zh: '?� {n} / {max}', es: 'Rival {n} de {max}', id: 'Lawan {n} dari {max}', vi: '��?i th? {n} / {max}', hi: '????????????? {n} / {max}', fr: 'Rival {n} sur {max}', th: '????????? {n} / {max}', ar: '????? {n} ?? {max}' },
  best: { en: 'Best: {n} rivals beaten', ko: '�ְ� ���: {n}�� ����', ja: '�٫��ȣ�{n}��?��', zh: '��ʢ��??{n}��', es: 'Record: {n} rivales vencidos', id: 'Terbaik: {n} lawan kalah', vi: 'T?t nh?t: h? {n} ��?i th?', hi: '?????: {n} ????????????? ????', fr: 'Record : {n} rivaux battus', th: '????????: ??? {n} ??', ar: '??????: ???? {n} ????' },
  crowns: { en: '?? Champion �� {n}', ko: '?? è�Ǿ� {n}ȸ', ja: '?? �����ԫ��� {n}��', zh: '?? ή? {n}�', es: '?? Campeon �� {n}', id: '?? Juara �� {n}', vi: '?? Vo ��?ch �� {n}', hi: '?? ??????? �� {n}', fr: '?? Champion �� {n}', th: '?? ????? �� {n}', ar: '?? ??? �� {n}' },
  won: { en: 'You beat {name}!', ko: '{name}�� �̰���!', ja: '{name}��㭪��ު�����', zh: '?��?��{name}��', es: '��Venciste a {name}!', id: 'Kamu mengalahkan {name}!', vi: 'B?n ��a th?ng {name}!', hi: '???? {name} ?? ??? ????!', fr: 'Tu as battu {name} !', th: '?????? {name}!', ar: '???? {name}!' },
  lost: { en: '{name} wins this time. Try again?', ko: '�̹��� {name}�� �¸�. �ٽ� �� �����?', ja: '���ު�{name}��㭪����⪦������', zh: '?�{name}?�����?��󭣿', es: 'Esta vez gana {name}. ��Otra vez?', id: 'Kali ini {name} menang. Coba lagi?', vi: 'L?n nay {name} th?ng. Th? l?i nhe?', hi: '?? ??? {name} ????? ??? ????? ?????', fr: 'Cette fois, {name} gagne. On reessaie ?', th: '?????? {name} ??? ???????????????', ar: '??? {name} ??? ?????. ????? ???????' },
  champ: { en: '?? You are the rooftop champion!', ko: '?? ���� è�Ǿ��� �ƾ��!', ja: '?? �߾�����ԫ���˪ʪ�ު�����', zh: '?? ?��������ή?��', es: '?? ��Eres el campeon de la azotea!', id: '?? Kamu juara atap!', vi: '?? B?n la nha vo ��?ch san th??ng!', hi: '?? ?? ?? ?? ??????? ???!', fr: '?? Tu es le champion du toit !', th: '?? ?????????????????!', ar: '?? ??? ??? ?????!' },
  next: { en: 'Next rival', ko: '���� ���', ja: '�Ϋ髤�Ы�', zh: '����??�', es: 'Siguiente rival', id: 'Lawan berikutnya', vi: '��?i th? ti?p theo', hi: '???? ?????????????', fr: 'Rival suivant', th: '????????', ar: '????? ??????' },
  again: { en: 'Again', ko: '�� �� ��', ja: '�⪦����', zh: '�?���', es: 'Otra vez', id: 'Lagi', vi: 'L?n n?a', hi: '??? ??', fr: 'Rejouer', th: '????????', ar: '??? ????' },
  close: { en: 'Leave', ko: '������', ja: '����', zh: '??', es: 'Salir', id: 'Keluar', vi: 'R?i ��i', hi: '????', fr: 'Quitter', th: '???', ar: '????' },
  hits: { en: '{n} HITS', ko: '{n} ��Ÿ', ja: '{n} HITS', zh: '{n} ??', es: '{n} GOLPES', id: '{n} HIT', vi: '{n} ��ON', hi: '{n} ???', fr: '{n} COUPS', th: '{n} ???', ar: '{n} ?????' },
  pick: { en: 'Pick your style', ko: '��Ÿ���� ����', ja: '����������Ԫܪ�', zh: '???��׵��', es: 'Elige tu estilo', id: 'Pilih gayamu', vi: 'Ch?n phong cach', hi: '???? ???? ?????', fr: 'Choisis ton style', th: '????????????????', ar: '???? ??????' },
  dash: {
    en: 'Dash: tap �� or �� twice (or hold Shift). An attack can cut a dash short.',
    ko: '���: �� �Ǵ� �渦 �� �� ���� (�Ǵ� Shift). ��� �߿� �������� �̾�����.',
    ja: '���ë��壺�� �� �� ��2�ޣ��ު���Shift�������ë��������?�تĪʪ��ު���',
    zh: '?����?��?�� �� �� �棨����� Shift����?����ʦ�����?��',
    es: 'Carrera: pulsa �� o �� dos veces (o Shift). Un ataque puede cortar la carrera.',
    id: 'Dash: ketuk �� atau �� dua kali (atau Shift). Serangan bisa memotong dash.',
    vi: 'L??t: nh?n �� ho?c �� hai l?n (ho?c Shift). Co th? ra ��on gi?a luc l??t.',
    hi: '???: �� ?? �� ?? ??? ????? (?? Shift)? ??? ?? ??? ??? ???? ?? ???? ???',
    fr: 'Dash : appuie deux fois sur �� ou �� (ou Maj). Une attaque peut couper le dash.',
    th: '???: ?? �� ???? �� ???????? (???? Shift) ????????????????????????',
    ar: '??????: ???? �� ?? �� ????? (?? Shift). ???? ?? ????? ????.',
  },
  you: { en: 'You', ko: '��', ja: '����', zh: '?', es: 'Tu', id: 'Kamu', vi: 'B?n', hi: '??', fr: 'Toi', th: '???', ar: '???' },
  // With someone else in the room.
  vsTitle: { en: '?? Fight someone here', ko: '?? �� ����� ����', ja: '?? �����˪����Ѫ�??', zh: '?? ��?������??', es: '?? Pelea con alguien de aqui', id: '?? Lawan orang di sini', vi: '?? ��?u v?i ng??i ? ��ay', hi: '?? ???? ???? ?? ?????', fr: '?? Affronte quelqu��un ici', th: '?? ?????????????????', ar: '?? ???? ????? ???' },
  vsNone: { en: 'Nobody else is in this room right now.', ko: '���� �� �濡 �ٸ� ����� �����.', ja: '�Ѫ���ݻ詪˪۪����ѪϪ��ު���', zh: '?�??ۮ?��?�������ѡ�', es: 'Ahora no hay nadie mas en esta sala.', id: 'Belum ada orang lain di ruangan ini.', vi: 'Hi?n khong co ai khac trong phong nay.', hi: '??? ?? ???? ??? ?? ??? ???? ???', fr: 'Personne d��autre dans cette salle pour l��instant.', th: '??????????????????????????', ar: '?? ??? ???? ?? ??? ?????? ????.' },
  vsWait: { en: 'Waiting for {name}��', ko: '{name}���� ��ٸ��� �ߡ�', ja: '{name}�������êƪ��ު���', zh: '�������{name}��', es: 'Esperando a {name}��', id: 'Menunggu {name}��', vi: '��ang ch? {name}��', hi: '{name} ?? ???????��', fr: 'En attente de {name}��', th: '??????? {name}��', ar: '??????? {name}��' },
  vsAsk: { en: '{name} challenges you!', ko: '{name}���� ����� ��û�߾��!', ja: '{name}�����ݶ������Ǫ��ު�����', zh: '{name}��??����?��', es: '��{name} te reta!', id: '{name} menantangmu!', vi: '{name} thach ��?u b?n!', hi: '{name} ?? ???? ?????? ??!', fr: '{name} te defie !', th: '{name} ??????!', ar: '{name} ??????!' },
  ready: { en: 'Ready', ko: '�غ� �Ϸ�', ja: '����OK', zh: '��?����', es: 'Listo', id: 'Siap', vi: 'S?n sang', hi: '?????', fr: 'Pret', th: '?????', ar: '????' },
  cancel: { en: 'Cancel', ko: '���', ja: '����󫻫�', zh: '���', es: 'Cancelar', id: 'Batal', vi: 'H?y', hi: '???? ????', fr: 'Annuler', th: '??????', ar: '?????' },
  no: { en: 'No thanks', ko: '�����ƿ�', ja: '���ƪ���', zh: '����', es: 'No, gracias', id: 'Tidak, terima kasih', vi: 'Khong, c?m ?n', hi: '????, ???????', fr: 'Non merci', th: '?????????', ar: '??? ?????' },
  vsNo: { en: '{name} said no this time.', ko: '{name}���� �̹��� �����߾��.', ja: '{name}��������ު�?��ު�����', zh: '{name}?���?����', es: '{name} dijo que no esta vez.', id: '{name} menolak kali ini.', vi: '{name} t? ch?i l?n nay.', hi: '{name} ?? ?? ??? ??? ?????', fr: '{name} a refuse cette fois.', th: '{name} ????????????', ar: '{name} ??? ??? ?????.' },
  vsBusy: { en: '{name} is busy right now.', ko: '{name}���� ���� �ٺ���.', ja: '{name}�������⢪���ު���', zh: '{name}?����ϡ�', es: '{name} esta ocupado ahora.', id: '{name} sedang sibuk.', vi: '{name} ��ang b?n.', hi: '{name} ??? ?????? ????', fr: '{name} est occupe pour l��instant.', th: '{name} ?????????????', ar: '{name} ????? ????.' },
  vsGone: { en: 'No answer.', ko: '������ �����.', ja: '����������ު���', zh: '?����?��', es: 'Sin respuesta.', id: 'Tidak ada jawaban.', vi: 'Khong co ph?n h?i.', hi: '??? ???? ?????', fr: 'Pas de reponse.', th: '??????????????', ar: '?? ??.' },
  vsLink: { en: 'Connecting��', ko: '���� �ߡ�', ja: '��?�顦', zh: '?���顦', es: 'Conectando��', id: 'Menghubungkan��', vi: '��ang k?t n?i��', hi: '???? ??? ??��', fr: 'Connexion��', th: '??????????????��', ar: '???? ???????��' },
  vsLeft: { en: '{name} left the fight. You win!', ko: '{name}���� �������. �¸�!', ja: '{name}�������󪷪ު��������ʪ���㭪���', zh: '{name}??����??����', es: '{name} se fue. ��Ganas tu!', id: '{name} keluar. Kamu menang!', vi: '{name} ��a r?i ��i. B?n th?ng!', hi: '{name} ??? ??? ?? ????!', fr: '{name} est parti. Tu gagnes !', th: '{name} ????????? ??????!', ar: '{name} ????. ???!' },
  vsLost: { en: 'The connection was lost.', ko: '������ ������.', ja: '��?��﷪�ު�����', zh: '?���??��', es: 'Se perdio la conexion.', id: 'Koneksi terputus.', vi: 'M?t k?t n?i.', hi: '??????? ??? ????', fr: 'La connexion a ete perdue.', th: '????????????????', ar: '????? ???????.' },
  vsLose: { en: '{name} wins this time.', ko: '�̹��� {name}���� �¸�.', ja: '���ު�{name}�����㭪���', zh: '?�{name}?����', es: 'Esta vez gana {name}.', id: 'Kali ini {name} menang.', vi: 'L?n nay {name} th?ng.', hi: '?? ??? {name} ?????', fr: 'Cette fois, {name} gagne.', th: '?????? {name} ???', ar: '??? {name} ??? ?????.' },
  draw: { en: 'Draw!', ko: '���º�!', ja: '�ڪ��ª���', zh: '���ѣ�', es: '��Empate!', id: 'Seri!', vi: 'Hoa!', hi: '????!', fr: 'Egalite !', th: '????!', ar: '?????!' },
  vsSlow: { en: 'Waiting for the other player��', ko: '��븦 ��ٸ��� �ߡ�', ja: '��⢪���êƪ��ު���', zh: '�������?۰��', es: 'Esperando al otro jugador��', id: 'Menunggu pemain lain��', vi: '��ang ch? ng??i ch?i kia��', hi: '????? ??????? ?? ???????��', fr: 'En attente de l��autre joueur��', th: '??????????????��', ar: '??????? ?????? ?????��' },
};
const tt = (k, v) => fmt(L(T[k]), v);

// The five rivals (made up for this game), easy to champion: their look and
// the sky over their round.
// The eight styles: a name, a line about it, the signature move's name, and
// how it stands (bone offsets like STANCE below).
export const STYLE = {
  brawler: {
    icon: '??',
    name: { en: 'Brawler', ko: '������', ja: '̫?ʫ', zh: '̫��ʫ', es: 'Luchador', id: 'Petarung', vi: 'Vo s?', hi: '??????', fr: 'Bagarreur', th: '??????', ar: '???????' },
    line: { en: 'Good at everything. Keeps both the guard breaker and the flying kick.', ko: '���� ������ ���ؿ�. ���� ����� �������⸦ �� �� ���.', ja: '���Ǫ⪳�ʪ�ز��������?���ڪ���ޫ��������Ū��ު���', zh: '??г����������??Դ���ġ�', es: 'Bueno en todo. Tiene rompeguardias y patada voladora.', id: 'Serba bisa. Punya pemecah pertahanan dan tendangan terbang.', vi: 'Gi?i ��?u m?i th?. Co c? pha th? l?n ��a bay.', hi: '?? ???? ??? ?????? ????? ???? ?? ????? ??? ??????', fr: 'Bon partout. Garde le brise-garde et le coup de pied saute.', th: '??????????? ????????????????????????????????', ar: '??? ?? ?? ???. ???? ????? ???? ??????? ???????.' },
    sig: { en: 'Guard breaker', ko: '���� ����', ja: '��?���ڪ�', zh: '������', es: 'Rompeguardias', id: 'Pemecah pertahanan', vi: 'Pha th?', hi: '????? ????', fr: 'Brise-garde', th: '??????????', ar: '????? ????' },
  },
  ninja: {
    icon: '??',
    name: { en: 'Ninja', ko: '����', ja: '����', zh: '����', es: 'Ninja', id: 'Ninja', vi: 'Ninja', hi: '?????', fr: 'Ninja', th: '?????', ar: '???????' },
    line: { en: 'Very fast, little health. Vanishes and strikes from behind.', ko: '���� �������� ü���� �����. ������ٰ� �� �ڿ��� �Ŀ�.', ja: '�Ȫƪ��ܪ���?����ᴪʪᡣἪ������������֪�ު���', zh: '����?��ӣ����ᴡ���?�����?������?��', es: 'Muy rapido, poca vida. Desaparece y golpea por la espalda.', id: 'Sangat cepat, darah sedikit. Menghilang lalu menyerang dari belakang.', vi: 'R?t nhanh, it mau. Bi?n m?t r?i ��anh t? sau l?ng.', hi: '???? ????, ?? ????? ????? ???? ???? ?? ????', fr: 'Tres rapide, peu de vie. Disparait et frappe dans le dos.', th: '??????????????????? ??????????????????????????', ar: '???? ???? ????? ?????. ????? ????? ?? ?????.' },
    sig: { en: 'Shadow step', ko: '�׸��� ����', ja: '�?��', zh: '���', es: 'Paso sombra', id: 'Langkah bayangan', vi: 'B??c bong', hi: '???? ????', fr: 'Pas de l\'ombre', th: '???????', ar: '???? ????' },
    stance: { armL: [-1.1, 0, 0], foreL: [-0.6, 0, 0], armR: [0.5, 0, 0], foreR: [-1.2, 0, 0], legL: [-0.5, 0, 0], kneeL: [0.75, 0, 0], legR: [0.3, 0, 0], kneeR: [0.6, 0, 0], spine: [0.32, 0, 0] },
  },
  tank: {
    icon: '???',
    name: { en: 'Tank', ko: '��Ŀ', ja: '����', zh: '��к', es: 'Tanque', id: 'Tank', vi: '��? ��on', hi: '????', fr: 'Tank', th: '?????', ar: '???????' },
    line: { en: 'Slow, lots of health. Its charge keeps going through a hit.', ko: '�������� ü���� ���ƿ�. ������ �� �� �¾Ƶ� ������ �ʾƿ�.', ja: '?����?�����êתꡣ�����1?�����ƪ��ު�ު���', zh: 'طӣ������?��??�������?�Ρ�', es: 'Lento, mucha vida. Su carga aguanta un golpe sin pararse.', id: 'Lambat, darah banyak. Serudukannya tidak berhenti walau kena pukul.', vi: 'Ch?m, nhi?u mau. Cu huc khong d?ng du trung m?t ��on.', hi: '????, ??? ????? ???? ???? ?? ??? ???? ?? ???? ??????', fr: 'Lent, beaucoup de vie. Sa charge encaisse un coup sans s\'arreter.', th: '??????????????? ???????????????????????????????', ar: '???? ????? ?????. ??????? ?? ????? ??? ????.' },
    sig: { en: 'Shoulder charge', ko: '��� ����', ja: '������?����?��', zh: '̷��', es: 'Carga de hombro', id: 'Seruduk bahu', vi: 'Huc vai', hi: '???? ????', fr: 'Charge d\'epaule', th: '??????????', ar: '?????? ?????' },
    stance: { armL: [-0.5, -0.5, 0], foreL: [-1.2, 0, 0], armR: [-0.5, 0.5, 0], foreR: [-1.2, 0, 0], legL: [-0.35, 0, 0], kneeL: [0.55, 0, 0], legR: [0.3, 0, 0], kneeR: [0.5, 0, 0], spine: [0.22, 0, 0] },
  },
  kicker: {
    icon: '??',
    name: { en: 'Kicker', ko: '������ ����', ja: '���ë�?', zh: '??�', es: 'Pateador', id: 'Penendang', vi: 'Cao th? ��a', hi: '????', fr: 'Kicker', th: '??????', ar: '??????' },
    line: { en: 'Fast, strong kicks and weak punches. A spinning kick hits three times.', ko: '���� ������ ������ �ָ��� ���ؿ�. �������Ⱑ �� �� �¾ƿ�.', ja: '���ë����ܪ���?�����ѫ����尪ᡣ�ު����ꪬ3��?����ު���', zh: '������죬����尡���??��߲����', es: 'Patadas rapidas y fuertes, punos flojos. Su patada giratoria golpea tres veces.', id: 'Tendangan cepat dan kuat, pukulan lemah. Tendangan putar kena tiga kali.', vi: '��a nhanh va m?nh, ��?m y?u. Cu ��a xoay trung ba l?n.', hi: '???? ????? ???, ?????? ??????? ????? ??? ??? ??? ???? ???', fr: 'Pieds rapides et forts, poings faibles. Son coup tournant touche trois fois.', th: '????????????? ??????? ??????????????????', ar: '????? ????? ???? ?????? ?????. ????? ???????? ???? ???? ????.' },
    sig: { en: 'Whirlwind kick', ko: 'ȸ���� ����', ja: '������', zh: '��??', es: 'Patada torbellino', id: 'Tendangan puting beliung', vi: '��a l?c xoay', hi: '????? ???', fr: 'Coup de pied tourbillon', th: '???????????', ar: '???? ???????' },
    stance: { armL: [-0.3, 0, 0], foreL: [-0.9, 0, 0], armR: [-0.2, 0, 0], foreR: [-0.8, 0, 0], legL: [-0.25, 0, 0], kneeL: [0.3, 0, 0], legR: [0.2, 0, 0], kneeR: [0.25, 0, 0], spine: [0.05, 0, 0] }, bounce: 0.05,
  },
  boxer: {
    icon: '??',
    name: { en: 'Boxer', ko: '����', ja: '�ܫ���?', zh: '��?�', es: 'Boxeador', id: 'Petinju', vi: 'Tay ��?m', hi: '??????????', fr: 'Boxeur', th: '??????', ar: '???????' },
    line: { en: 'Fast, heavy fists and long dashes. Kicks are slow.', ko: '�ָ��� ������ �����ϰ� ��ð� ����. ���� ������.', ja: '�ѫ�����ܪ����쪯�����ë�������������ë���?�ᡣ', zh: '���������죬?����??������?ط��', es: 'Punos rapidos y duros, carreras largas. Patadas lentas.', id: 'Pukulan cepat dan berat, dash jauh. Tendangan lambat.', vi: '��?m nhanh va n?ng, l??t xa. ��a ch?m.', hi: '???? ???? ??????, ???? ???? ??? ?????', fr: 'Poings rapides et lourds, longs dashs. Pieds lents.', th: '??????????????? ?????? ??????', ar: '????? ????? ????? ??????? ????. ?????? ?????.' },
    sig: { en: 'Haymaker', ko: '�� �� ��', ja: '����Ϋիë�', zh: '������', es: 'Gancho total', id: 'Hook pamungkas', vi: 'Cu moc tr?i giang', hi: '??????? ???', fr: 'Crochet massue', th: '??????????', ar: '??????? ??????' },
    stance: { armL: [-1.3, 0.2, 0], foreL: [-2.1, 0, 0], armR: [-1.2, -0.2, 0], foreR: [-2.2, 0, 0], legL: [-0.3, 0, 0], kneeL: [0.4, 0, 0], legR: [0.25, 0, 0], kneeR: [0.35, 0, 0], spine: [0.25, 0, 0], head: [0.15, 0, 0] }, bounce: 0.035,
  },
  grappler: {
    icon: '??',
    name: { en: 'Grappler', ko: '������', ja: '�쫹��?', zh: '??�', es: 'Luchador de agarre', id: 'Pegulat', vi: '��o v?t', hi: '??????', fr: 'Lutteur', th: '??????????', ar: '???????' },
    line: { en: 'Sturdy and strong up close. Its throw cannot be guarded.', ko: 'ưư�ϰ� ������ ���ؿ�. ��ġ��� ���� �� �����.', ja: '���۪�����?��?�����᪲�ϫ�?�ɪǪ��ު���', zh: '??��?��?˭��?���������١�', es: 'Robusto y fuerte de cerca. Su proyeccion no se puede cubrir.', id: 'Kokoh dan kuat dari dekat. Bantingannya tak bisa ditahan.', vi: 'Li ��on, m?nh khi ap sat. Cu qu?t khong th? ��?.', hi: '??????, ??? ?? ?????? ???? ???? ???? ???? ?? ?????', fr: 'Solide et fort au corps a corps. Sa projection ne se pare pas.', th: '?????????????????????? ????????????????????', ar: '???? ???? ?? ???. ????? ?? ?????.' },
    sig: { en: 'Big throw', ko: '��ġ��', ja: '���᪲', zh: '��?', es: 'Gran proyeccion', id: 'Bantingan besar', vi: 'Qu?t nga', hi: '???? ????', fr: 'Grande projection', th: '????????', ar: '?????? ??????' },
    stance: { armL: [-1.1, -0.6, 0], foreL: [-0.7, 0, 0], armR: [-1.1, 0.6, 0], foreR: [-0.7, 0, 0], legL: [-0.4, 0, 0], kneeL: [0.6, 0, 0], legR: [0.3, 0, 0], kneeR: [0.6, 0, 0], spine: [0.35, 0, 0] },
  },
  mystic: {
    icon: '??',
    name: { en: 'Mystic', ko: '�����', ja: '?����', zh: '?��?', es: 'Mistico', id: 'Ahli tenaga dalam', vi: 'Khi cong s?', hi: '????', fr: 'Mystique', th: '?????????????', ar: '???? ??????' },
    line: { en: 'Fights from far away: throws a ball of light across the ring.', ko: '�ָ��� �ο���. �� �ǳ������� �� ����� ������.', ja: '��������?���ު����ê�謪��󫰪��������ު�ޫ�Ъ��ު���', zh: '?��?��?������Ϲ����?��?��?��', es: 'Pelea de lejos: lanza una bola de luz por el ring.', id: 'Bertarung dari jauh: melempar bola cahaya ke seberang ring.', vi: '��anh t? xa: phong qu? c?u anh sang ngang vo ��ai.', hi: '??? ?? ????? ??: ???? ?? ??? ????? ?? ???? ?????? ???', fr: 'Combat de loin : lance une boule de lumiere a travers le ring.', th: '????????????? ???????????????????', ar: '????? ?? ????: ???? ??? ??? ??? ??????.' },
    sig: { en: 'Light ball', ko: '�� ���', ja: '��?', zh: '��?', es: 'Bola de luz', id: 'Bola cahaya', vi: 'C?u anh sang', hi: '????? ?? ????', fr: 'Boule de lumiere', th: '??????', ar: '??? ?????' },
    stance: { armL: [-1.4, 0, 0], foreL: [-0.3, 0, 0], armR: [-0.1, 0, 0], foreR: [-1.5, 0, 0], legL: [-0.35, 0, 0], kneeL: [0.45, 0, 0], legR: [0.3, 0, 0], kneeR: [0.4, 0, 0], spine: [0.05, 0, 0] },
  },
  dancer: {
    icon: '??',
    name: { en: 'Dancer', ko: '���', ja: '����?', zh: '����', es: 'Bailarin', id: 'Penari', vi: 'V? cong', hi: '?????', fr: 'Danseur', th: '???????', ar: '??????' },
    line: { en: 'Light on its feet. Spins across the floor with legs flying.', ko: '���� ��������. �ٸ��� �ֵ����� �ٴ��� ���� ��������.', ja: '��?������ɪ��ު��ʪ����ɪ��ުê���ߪު���', zh: '���?�á�?��?���??�����', es: 'Pies ligeros. Cruza el suelo girando con las piernas al aire.', id: 'Lincah. Berputar melintasi lantai dengan kaki melayang.', vi: 'Nh? nhang. Xoay tron tren san v?i ��oi chan tung bay.', hi: '????????? ?????? ?????? ??? ????? ??? ???? ???', fr: 'Leger sur ses pieds. Traverse le sol en tournant, jambes en l\'air.', th: '?????? ???????????????????????', ar: '???? ???????. ???? ??? ????? ?????? ??????.' },
    sig: { en: 'Floor spin', ko: '�ٴ� ȸ��', ja: '�ի������ԫ�', zh: '�����?', es: 'Giro de suelo', id: 'Putaran lantai', vi: 'Xoay san', hi: '????? ?????', fr: 'Vrille au sol', th: '????????', ar: '????? ?????' },
    stance: { armL: [-0.4, -0.7, 0], foreL: [-0.8, 0, 0], armR: [-0.4, 0.7, 0], foreR: [-0.8, 0, 0], legL: [-0.3, 0, 0], kneeL: [0.45, 0, 0], legR: [0.25, 0, 0], kneeR: [0.4, 0, 0], spine: [0.1, 0, 0] }, sway: 0.25, bounce: 0.04,
  },
};
const BTN = { p: '??', k: '??', s1: '?1', s2: '?2' };

export const RIVAL = [
  { name: { en: 'Dalgona Kid', ko: '�ް��� Ű��', ja: '���뫴��?���ë�', zh: '?�����' }, style: 'brawler', look: { model: 'hoodie-orange', pants: 'denim', hair: 'caramel', skin: 'fair', hairStyle: 'bowl' }, sky: ['#2a1f4d', '#c9587a'] },
  { name: { en: 'Night-shift Mina', ko: '�߰��� �̳�', ja: '��êΫ߫�', zh: '���ڷ��' }, style: 'ninja', look: { model: 'track-blue', pants: 'navy', hair: 'black', skin: 'light', hairStyle: 'pony' }, sky: ['#0d1233', '#3c4fa8'] },
  { name: { en: 'Busker Joon', ko: '����Ŀ ��', ja: '�Ы���??�����', zh: 'ʶ??����' }, style: 'dancer', look: { model: 'jacket-black', pants: 'black', hair: 'ash', skin: 'warm', hairStyle: 'wolf' }, sky: ['#170d2e', '#7a3fb0'] },
  { name: { en: 'Auntie Kimchi', ko: '��ġ �̸�', ja: '��������Ъ���', zh: '������' }, style: 'grappler', look: { model: 'cardigan-brown', pants: 'cocoa', hair: 'espresso', skin: 'fair', hairStyle: 'curly' }, sky: ['#101a2a', '#1f7a6a'] },
  { name: { en: 'Master Baekho', ko: '��ȣ ����', ja: '����ν��', zh: '����??' }, style: 'kicker', look: { model: 'hanbok-durumagi-white', pants: 'cream', hair: 'ash', skin: 'tan', hairStyle: 'manbun' }, sky: ['#0a0a14', '#a8322e'] },
];

// The ring's build (�� the street's): about three heads tall instead of two.
const BUILD = globalThis.__brawlBuild || { head: 0.75, torso: 1.08, arm: 1.3, leg: 1.4, lift: 0.1 };
export const VS_SKY = ['#121a3a', '#d06a3c']; // the sky over a fight between two players
const STAGE_Y = -80; // under the room, out of its sight
const FOV = 38;

const CSS = `
html.brawl-on #hud > *, html.brawl-on #labels, html.brawl-on .credit { visibility: hidden !important; }
#brawl { position: fixed; inset: 0; z-index: 60; pointer-events: none; font: 700 15px system-ui, sans-serif; color: #fff; user-select: none; -webkit-user-select: none; touch-action: none; }
#brawl * { box-sizing: border-box; }
.bw-top { position: absolute; top: max(8px, env(safe-area-inset-top)); left: 0; right: 0; display: grid; grid-template-columns: 1fr 58px 1fr; gap: 8px; padding: 0 max(54px, env(safe-area-inset-right)) 0 max(10px, env(safe-area-inset-left)); align-items: start; }
.bw-side { min-width: 0; }
.bw-bar { height: 18px; border-radius: 6px; background: rgba(10,10,20,.72); border: 2px solid #fff; overflow: hidden; position: relative; }
.bw-bar i { position: absolute; top: 0; bottom: 0; left: 0; width: 100%; transform-origin: left; }
.bw-side.r .bw-bar i { transform-origin: right; }
.bw-bar .ghost { background: #fff; transition: transform .5s .25s; }
.bw-bar .hp { background: linear-gradient(#ffe46b, #ff9a2e); }
.bw-side.rage .hp { background: linear-gradient(#ff8a7a, #e0242e); animation: bw-pulse .5s infinite alternate; }
@keyframes bw-pulse { to { filter: brightness(1.5); } }
.bw-sp { display: flex; gap: 4px; margin-top: 3px; width: 46%; }
.bw-side.r .bw-sp { margin-left: auto; flex-direction: row-reverse; }
.bw-sp b { flex: 1; height: 7px; border-radius: 4px; background: rgba(10,10,20,.72); border: 1.5px solid #fff; overflow: hidden; position: relative; }
.bw-sp i { position: absolute; inset: 0; background: #7df0ff; transform: scaleX(0); transform-origin: left; }
.bw-side.r .bw-sp i { transform-origin: right; }
.bw-sp b.full { box-shadow: 0 0 8px #7df0ff; }
.bw-sp b.full i { background: #fff36b; }
.bw-pad.no-sp .bw-btns .sp { opacity: .4; }
.bw-name { display: flex; gap: 6px; align-items: center; margin-top: 3px; font-size: 13px; text-shadow: 0 1px 3px #000; white-space: nowrap; overflow: hidden; }
.bw-side.r .bw-name { flex-direction: row-reverse; }
.bw-name span { overflow: hidden; text-overflow: ellipsis; }
.bw-pip { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 2px solid #fff; background: rgba(0,0,0,.4); }
.bw-pip.on { background: #ffd23c; }
.bw-time { text-align: center; font: 900 28px system-ui, sans-serif; text-shadow: 0 2px 4px #000; line-height: 1; padding-top: 0; }
.bw-msg { position: absolute; left: 0; right: 0; top: 30%; text-align: center; font: 900 clamp(38px, 11vw, 92px) system-ui, sans-serif; font-style: italic; letter-spacing: 1px; color: #ffd23c; -webkit-text-stroke: 2px #2a1030; text-shadow: 0 5px 0 #2a1030, 0 0 24px rgba(255,120,60,.8); opacity: 0; }
.bw-msg.show { animation: bw-in .28s cubic-bezier(.2,1.6,.4,1) forwards; }
@keyframes bw-in { from { opacity: 0; transform: scale(2.2); } to { opacity: 1; transform: scale(1); } }
.bw-sub { position: absolute; left: 0; right: 0; top: calc(30% + clamp(46px, 13vw, 104px)); text-align: center; font: 800 clamp(16px, 4.2vw, 26px) system-ui, sans-serif; text-shadow: 0 2px 4px #000; }
.bw-combo { position: absolute; left: max(12px, env(safe-area-inset-left)); top: 22%; font: 900 clamp(20px, 6vw, 40px) system-ui, sans-serif; font-style: italic; color: #7df0ff; -webkit-text-stroke: 1px #0a2030; text-shadow: 0 3px 0 #0a2030; opacity: 0; transition: opacity .3s; }
.bw-combo.r { left: auto; right: max(12px, env(safe-area-inset-right)); color: #ff9aa8; }
.bw-combo.show { opacity: 1; transition: none; }
.bw-x { position: absolute; top: max(8px, env(safe-area-inset-top)); right: max(8px, env(safe-area-inset-right)); width: 38px; height: 38px; border-radius: 50%; border: 0; background: rgba(10,10,20,.7); color: #fff; font: 700 18px system-ui; pointer-events: auto; cursor: pointer; }
.bw-keys { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font-size: 13px; font-weight: 600; opacity: .85; text-shadow: 0 1px 3px #000; }
.bw-pad { position: absolute; left: 0; right: 0; bottom: 0; height: min(46%, 300px); pointer-events: auto; }
.bw-stick { position: absolute; left: 0; top: 0; bottom: 0; width: 50%; }
.bw-ring { position: absolute; width: 120px; height: 120px; margin: -60px; border-radius: 50%; border: 3px solid rgba(255,255,255,.55); background: rgba(10,10,20,.3); left: calc(28px + 60px + env(safe-area-inset-left)); bottom: calc(26px + 60px + env(safe-area-inset-bottom)); }
.bw-knob { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px; border-radius: 50%; background: rgba(255,255,255,.85); }
.bw-btns { position: absolute; right: calc(14px + env(safe-area-inset-right)); bottom: calc(18px + env(safe-area-inset-bottom)); display: grid; grid-template-columns: 68px 68px; gap: 10px; }
.bw-btns button { width: 68px; height: 68px; border-radius: 50%; border: 3px solid #fff; color: #fff; font: 800 22px system-ui; line-height: 1; padding: 0; touch-action: none; }
.bw-btns button small { display: block; font-size: 11px; margin-top: 2px; }
.bw-btns button.on { filter: brightness(1.6); transform: scale(.93); }
.bw-card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(92vw, 430px); max-height: 88vh; overflow: auto; background: rgba(18,14,34,.93); border: 2px solid #ffd23c; border-radius: 18px; padding: 16px 18px; pointer-events: auto; font-weight: 500; text-align: center; }
.bw-card h3 { margin: 0 0 4px; font: 900 26px system-ui; font-style: italic; color: #ffd23c; }
.bw-card p { margin: 8px 0; font-size: 14px; line-height: 1.45; }
.bw-card .dim { opacity: .8; font-size: 13px; }
.bw-card .big { font-size: 18px; font-weight: 800; }
.bw-vs { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 2px 0 10px; }
.bw-vs p { margin: 0; }
.bw-vs button { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bw-note { background: rgba(255,210,60,.16); border-radius: 10px; padding: 6px 10px; }
.bw-ladder { display: flex; justify-content: center; gap: 6px; margin: 10px 0; }
.bw-ladder b { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #2c2550; border: 2px solid #5a4f8c; font-size: 13px; }
.bw-ladder b.done { background: #ffd23c; color: #2a1030; border-color: #fff; }
.bw-ladder b.now { border-color: #ff5a6e; box-shadow: 0 0 10px #ff5a6e; }
.bw-styles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin: 8px 0; }
.bw-card .bw-styles button { padding: 8px 0; font-size: clamp(10px, 2.9vw, 13px); min-width: 0; overflow-wrap: anywhere; font-weight: 700; border: 2px solid transparent; line-height: 1.2; }
.bw-card .bw-styles button b { display: block; font-size: 22px; }
.bw-card .bw-styles button.sel { border-color: #ffd23c; background: #4a3f86; }
.bw-stat { display: grid; grid-template-columns: 26px 1fr; gap: 6px; align-items: center; margin: 3px auto; max-width: 240px; font-size: 14px; }
.bw-stat i { height: 8px; border-radius: 4px; background: #2c2550; overflow: hidden; display: block; }
.bw-stat i u { display: block; height: 100%; background: #ffd23c; }
.bw-card .seq { font-size: 13px; margin: 4px 0; }
.bw-style { font-size: 11px; opacity: .9; margin-top: 1px; text-shadow: 0 1px 3px #000; white-space: nowrap; }
.bw-side.r .bw-style { text-align: right; }
.bw-dash { position: absolute; right: calc(170px + env(safe-area-inset-right)); bottom: calc(40px + env(safe-area-inset-bottom)); width: 56px; height: 56px; border-radius: 50%; border: 3px solid #fff; background: #6a5acd; color: #fff; font: 800 20px system-ui; padding: 0; touch-action: none; }
.bw-dash.on { filter: brightness(1.6); }
.bw-card .row { display: flex; gap: 10px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.bw-card button { border: 0; border-radius: 12px; padding: 12px 18px; font: 800 16px system-ui; cursor: pointer; background: #3a3260; color: #fff; }
.bw-card button.go { background: linear-gradient(#ffd23c, #ff8a2e); color: #2a1030; }
`;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const lerp = (a, b, k) => a + (b - a) * k;

// ���� Poses ��������������������������������������������������������������������������������������������������������������������������������
// Bone offsets over the standing clip (core/model-pack.js): arm -x forward
// and up, fore -x bends the elbow, leg -x forward, knee +x bends.
const BONES = ['armL', 'armR', 'foreL', 'foreR', 'spine', 'head', 'legL', 'legR', 'kneeL', 'kneeR'];
const P = (o) => { const p = {}; for (const b of BONES) p[b] = o[b] || [0, 0, 0]; return p; };
const STANCE = P({ armL: [-0.95, 0, 0], foreL: [-1.5, 0, 0], armR: [-0.7, 0, 0], foreR: [-1.75, 0, 0], legL: [-0.32, 0, 0], kneeL: [0.42, 0, 0], legR: [0.26, 0, 0], kneeR: [0.3, 0, 0], spine: [0.12, 0, 0] });
const GUARD = P({ armL: [-1.5, 0.45, 0], foreL: [-2.0, 0, 0], armR: [-1.5, -0.45, 0], foreR: [-2.0, 0, 0], legL: [-0.2, 0, 0], kneeL: [0.5, 0, 0], legR: [0.3, 0, 0], kneeR: [0.5, 0, 0], spine: [0.28, 0, 0], head: [0.2, 0, 0] });
const HURT = P({ armL: [-0.3, -0.9, 0], armR: [-0.3, 0.9, 0], foreL: [-0.5, 0, 0], foreR: [-0.5, 0, 0], spine: [-0.5, 0, 0], head: [-0.45, 0, 0], legL: [-0.15, 0, 0], legR: [0.3, 0, 0], kneeL: [0.3, 0, 0], kneeR: [0.5, 0, 0] });
const LOOSE = P({ armL: [-1.2, -0.9, 0], armR: [-1.2, 0.9, 0], foreL: [-0.3, 0, 0], foreR: [-0.3, 0, 0], legL: [-0.7, 0, 0], legR: [-0.4, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.9, 0, 0], spine: [-0.2, 0, 0], head: [-0.3, 0, 0] });
const WIND = { // drawing back before the hit
  lp: P({ ...STANCE, armL: [-0.5, 0, 0], foreL: [-2.0, 0, 0] }),
  rp: P({ ...STANCE, armR: [-0.2, 0, 0], foreR: [-2.1, 0, 0], spine: [0.1, -0.35, 0] }),
  lk: P({ ...STANCE, legL: [-0.9, 0, 0], kneeL: [1.6, 0, 0] }),
  rk: P({ ...STANCE, legR: [-0.8, 0, 0], kneeR: [1.7, 0, 0], spine: [0.05, -0.5, 0] }),
  upper: P({ ...STANCE, armR: [0.2, 0, 0], foreR: [-1.6, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.0, 0, 0], legR: [-0.1, 0, 0], kneeR: [0.9, 0, 0], spine: [0.45, 0, 0] }),
  palm: P({ ...STANCE, armL: [0.1, 0, 0], foreL: [-2.0, 0, 0], armR: [0.1, 0, 0], foreR: [-2.0, 0, 0], spine: [0.3, 0, 0] }),
  fly: P({ ...STANCE, legL: [-0.5, 0, 0], kneeL: [1.2, 0, 0], legR: [-0.3, 0, 0], kneeR: [1.2, 0, 0], spine: [0.35, 0, 0] }),
};
const HIT = { // the limb all the way out
  lp: P({ ...STANCE, armL: [-1.6, 0, 0], foreL: [0, 0, 0], spine: [0.15, -0.3, 0] }),
  rp: P({ ...STANCE, armR: [-1.6, 0, 0], foreR: [0, 0, 0], armL: [-0.6, 0, 0], spine: [0.2, 0.45, 0] }),
  lk: P({ ...STANCE, legL: [-1.45, 0, 0], kneeL: [0.05, 0, 0], spine: [-0.25, 0, 0] }),
  rk: P({ ...STANCE, legR: [-1.75, 0, 0], kneeR: [0, 0, 0], legL: [0.1, 0, 0], kneeL: [0.15, 0, 0], spine: [-0.4, 0.5, 0], armL: [-0.4, -0.8, 0], armR: [-0.2, 0.9, 0] }),
  upper: P({ ...STANCE, armR: [-2.75, 0, 0], foreR: [-0.5, 0, 0], legL: [-0.1, 0, 0], kneeL: [0.1, 0, 0], legR: [0.2, 0, 0], kneeR: [0.1, 0, 0], spine: [-0.25, 0.3, 0], head: [-0.3, 0, 0] }),
  palm: P({ ...STANCE, armL: [-1.55, 0.2, 0], foreL: [0, 0, 0], armR: [-1.55, -0.2, 0], foreR: [0, 0, 0], spine: [0.4, 0, 0], legL: [-0.6, 0, 0], kneeL: [0.7, 0, 0], legR: [0.5, 0, 0] }),
  fly: P({ ...STANCE, legR: [-1.6, 0, 0], kneeR: [0, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.7, 0, 0], spine: [-0.3, 0, 0], armL: [-0.5, -0.9, 0], armR: [-0.5, 0.9, 0] }),
};
// The rival's pose is the player's in a mirror, so the limb on the camera's
// side is the one that swings for both.
const PAIRS = [['armL', 'armR'], ['foreL', 'foreR'], ['legL', 'legR'], ['kneeL', 'kneeR']];
function mirror(p) {
  for (const [l, r] of PAIRS) { const t = p[l]; p[l] = p[r]; p[r] = t; }
  for (const n of BONES) { p[n][1] = -p[n][1]; p[n][2] = -p[n][2]; }
}
WIND.charge = P({ ...STANCE, armL: [-0.9, 0.5, 0], foreL: [-2.0, 0, 0], armR: [-0.3, 0, 0], foreR: [-1.6, 0, 0], legL: [-0.6, 0, 0], kneeL: [1.0, 0, 0], legR: [0.2, 0, 0], kneeR: [0.9, 0, 0], spine: [0.5, 0, 0] });
HIT.charge = P({ ...STANCE, armL: [-1.2, 0.6, 0], foreL: [-2.1, 0, 0], armR: [0.3, 0, 0], foreR: [-1.0, 0, 0], legL: [-0.8, 0, 0], kneeL: [0.8, 0, 0], legR: [0.6, 0, 0], kneeR: [0.2, 0, 0], spine: [0.65, -0.4, 0], head: [-0.3, 0, 0] });
WIND.hook = P({ ...STANCE, armR: [-0.7, 1.1, 0], foreR: [-1.3, 0, 0], spine: [0.15, -0.6, 0] });
HIT.hook = P({ ...STANCE, armR: [-1.5, -0.7, 0], foreR: [-1.3, 0, 0], armL: [-0.7, 0, 0], spine: [0.25, 0.8, 0], legR: [0.4, 0, 0] });
WIND.grab = P({ ...STANCE, armL: [-1.3, -1.0, 0], foreL: [-0.3, 0, 0], armR: [-1.3, 1.0, 0], foreR: [-0.3, 0, 0], spine: [0.25, 0, 0] });
HIT.grab = P({ ...STANCE, armL: [-1.5, 0.35, 0], foreL: [-0.9, 0, 0], armR: [-1.5, -0.35, 0], foreR: [-0.9, 0, 0], spine: [0.55, 0, 0], legL: [-0.6, 0, 0], kneeL: [0.8, 0, 0] });
WIND.mill = P({ ...STANCE, armL: [-1.6, 0, 0], foreL: [-0.2, 0, 0], armR: [-1.6, 0, 0], foreR: [-0.2, 0, 0], legL: [-0.8, 0, 0], kneeL: [1.3, 0, 0], legR: [-0.4, 0, 0], kneeR: [1.2, 0, 0], spine: [0.7, 0, 0] });
HIT.mill = P({ armL: [-2.7, -0.3, 0], armR: [-2.7, 0.3, 0], foreL: [-0.2, 0, 0], foreR: [-0.2, 0, 0], legL: [-1.3, 0, 0], legR: [0.9, 0, 0], kneeL: [0.1, 0, 0], kneeR: [0.2, 0, 0], spine: [0.3, 0, 0], head: [-0.4, 0, 0] });
const DASH = P({ ...STANCE, armL: [0.5, 0, 0], foreL: [-1.0, 0, 0], armR: [0.6, 0, 0], foreR: [-1.0, 0, 0], legL: [-0.9, 0, 0], kneeL: [0.9, 0, 0], legR: [0.7, 0, 0], kneeR: [0.5, 0, 0], spine: [0.5, 0, 0] });
const STANCES = {};
for (const id of STYLE_IDS) STANCES[id] = STYLE[id].stance ? P({ ...STYLE[id].stance }) : STANCE;
const mix = (out, a, b, k) => { for (const n of BONES) for (let i = 0; i < 3; i++) out[n][i] = lerp(a[n][i], b[n][i], k); return out; };

// f: the fighter (core/brawl.js). Fills `out` with the bone offsets and
// returns { pitch (lying back), lift (off the floor), yaw (a body turn) }.
function poseOf(f, time, out, body) {
  const look = STYLE[f.style] || STYLE.brawler, S = STANCES[f.style] || STANCE;
  body.pitch = 0; body.lift = f.y; body.yaw = 0; body.hide = false;
  const bob = Math.sin(time * 5 + f.side * 2) * 0.05;
  if (f.st === 'atk') {
    const m = f.mv[f.move], t = f.t, key = m.pose || f.move;
    if (t <= m.startup) {
      const u = t / m.startup;
      if (u < 0.55) mix(out, S, WIND[key], smooth(u / 0.55));
      else mix(out, WIND[key], HIT[key], ((u - 0.55) / 0.45) ** 2);
    } else if (t <= m.startup + m.active) mix(out, HIT[key], HIT[key], 0);
    else mix(out, HIT[key], S, smooth((t - m.startup - m.active) / m.recover));
    const whole = Math.min(1, t / (m.startup + m.active));
    const out01 = Math.max(0, Math.min(1, (t - m.startup) / m.active));
    if (key === 'rk' && !m.spin) body.yaw = 0.2 * Math.sin(Math.min(1, t / moveTicks(m)) * Math.PI);
    if (m.spin) body.yaw = m.spin * Math.PI * 2 * smooth(out01);
    if (m.blink) body.hide = t >= m.startup - 7 && t < m.startup - 1; // gone for a moment
    if (key === 'mill') { const k = Math.sin(Math.min(1, t / (m.startup + m.active + 10)) * Math.PI); body.pitch = 1.25 * k; body.lift += 0.34 * k; }
    if (key === 'charge') body.pitch = 0.25 * Math.sin(whole * Math.PI * 0.5) * (t > m.startup + m.active ? 1 - smooth((t - m.startup - m.active) / 12) : 1);
    if (f.move === 'upper') body.lift += 0.16 * Math.sin(smooth((t - m.startup * 0.6) / (m.active + m.recover * 0.5)) * Math.PI);
    if (f.move === 'fly' && !m.pose) body.pitch = -0.35 * Math.sin(whole * Math.PI * 0.5) * (t > m.startup + m.active ? 1 - smooth((t - m.startup - m.active) / 14) : 1);
  } else if (f.st === 'dash') {
    mix(out, S, DASH, Math.sin(Math.min(1, f.t / 9) * Math.PI));
    if (f.dashDir < 0) { out.spine[0] = -0.2; }
    body.lift += 0.05;
  } else if (f.st === 'hit') {
    mix(out, S, HURT, Math.min(1, f.stun / 8) * Math.min(1, f.t / 2));
  } else if (f.st === 'block') {
    mix(out, GUARD, GUARD, 0); out.spine[0] += Math.min(1, f.stun / 6) * 0.12;
  } else if (f.st === 'air') {
    mix(out, HURT, LOOSE, Math.min(1, f.t / 8));
    body.pitch = -Math.min(1.35, f.t * 0.11);
    body.lift += 0.15 * Math.min(1, f.t / 6);
  } else if (f.st === 'down' || f.st === 'ko') {
    mix(out, LOOSE, LOOSE, 0);
    body.pitch = -1.45; body.lift = 0.14;
  } else if (f.st === 'getup') {
    const u = smooth(f.t / 16);
    mix(out, LOOSE, S, u);
    body.pitch = -1.45 * (1 - u); body.lift = 0.14 * (1 - u);
  } else {
    mix(out, S, GUARD, f.guard ? 1 : 0);
    out.armL[0] += bob; out.armR[0] -= bob; out.spine[0] += bob * 0.4;
    if (look.sway) { out.spine[1] += Math.sin(time * 3.2) * look.sway; out.spine[2] += Math.cos(time * 3.2) * look.sway * 0.4; }
    if (look.bounce) body.lift += Math.abs(Math.sin(time * 7 + f.side)) * look.bounce;
    const stepping = f.st === 'step';
    if (f.walk || stepping) { // a shuffle
      const s = Math.sin(time * 16) * (stepping ? 0.5 : 0.38);
      out.legL[0] += s; out.legR[0] -= s; out.kneeL[0] += Math.max(0, s) * 0.6; out.kneeR[0] += Math.max(0, -s) * 0.6;
    }
    if (stepping) body.lift += 0.06 * Math.sin((f.t / 13) * Math.PI);
  }
  return body;
}

// ���� The stage ������������������������������������������������������������������������������������������������������������������������
function skyTexture([top, glow]) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, top); grad.addColorStop(0.55, top); grad.addColorStop(0.8, glow); grad.addColorStop(1, '#05050a');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.fillStyle = '#fff';
  for (let i = 0; i < 120; i++) { g.globalAlpha = 0.3 + rnd() * 0.6; g.fillRect(rnd() * 1024, rnd() * 250, 2, 2); }
  g.globalAlpha = 1;
  g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(770, 110, 34, 0, Math.PI * 2); g.fill();
  // Far towers with lit windows, all the way round.
  for (let layer = 0; layer < 2; layer++) {
    let x = 0;
    while (x < 1024) {
      const w = 26 + rnd() * 46, h = (layer ? 60 : 110) + rnd() * (layer ? 90 : 120), y = 430 - h + layer * 20;
      g.fillStyle = layer ? '#0b0b18' : '#191a33';
      g.fillRect(x, y, w, 512 - y);
      for (let wy = y + 6; wy < 420; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 8) {
        if (rnd() < 0.3) { g.fillStyle = ['#ffd98a', '#9fd8ff', '#ffb0c8'][Math.floor(rnd() * 3)]; g.globalAlpha = 0.5 + rnd() * 0.5; g.fillRect(wx, wy, 4, 5); g.globalAlpha = 1; }
      }
      x += w + rnd() * 6;
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function floorTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2740'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#37324f'; g.lineWidth = 2;
  for (let i = 0; i <= S; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
  g.fillStyle = '#3a3463'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffd23c'; g.lineWidth = 10; g.beginPath(); g.arc(S / 2, S / 2, S * 0.47, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ff5a6e'; g.lineWidth = 5; g.beginPath(); g.arc(S / 2, S / 2, S * 0.2, 0, Math.PI * 2); g.stroke();
  // An eight-point star in the middle.
  g.fillStyle = '#ff5a6e';
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = S * (i % 2 ? 0.07 : 0.16); g[i ? 'lineTo' : 'moveTo'](S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); }
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function sparkTexture() {
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = i % 2 ? 16 : 58 - (i % 4) * 8; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
  g.fill();
  return new THREE.CanvasTexture(c);
}
export function buildStage(sky, y = STAGE_Y) {
  const g = new THREE.Group();
  g.position.y = y;
  const own = []; // to free
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); own.push(geo, mat); if (mat.map) own.push(mat.map); g.add(m); return m; };
  const dome = add(new THREE.SphereGeometry(60, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture(sky), side: THREE.BackSide, depthWrite: false }));
  dome.position.y = 6;
  const roof = add(new THREE.CircleGeometry(RING_R / 0.47 / 2, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: floorTexture() }));
  roof.position.y = 0;
  const slab = add(new THREE.CylinderGeometry(9.4, 9.4, 3, 40), new THREE.MeshLambertMaterial({ color: '#1b1830' }));
  slab.position.y = -1.52;
  // Neon posts round the ring, and a low glowing rail between them.
  // (Low: the camera looks in over them from outside the ring.)
  const N = 10, posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), new THREE.MeshLambertMaterial({ color: '#2a2540' }), N);
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), N);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, r = RING_R + 0.9;
    posts.setMatrixAt(i, mtx.makeTranslation(Math.cos(a) * r, 0.22, Math.sin(a) * r));
    lamps.setMatrixAt(i, mtx.makeTranslation(Math.cos(a) * r, 0.5, Math.sin(a) * r));
    lamps.setColorAt(i, new THREE.Color(['#ff5a6e', '#ffd23c', '#7df0ff'][i % 3]));
  }
  own.push(posts.geometry, posts.material, lamps.geometry, lamps.material);
  g.add(posts, lamps);
  const rail = add(new THREE.TorusGeometry(RING_R + 0.9, 0.03, 6, 60).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff5a6e' }));
  rail.position.y = 0.3;
  // Hit sparks.
  const sparkMap = sparkTexture();
  own.push(sparkMap);
  const sparks = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.SpriteMaterial({ map: sparkMap, transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.visible = false; sp.renderOrder = 20;
    own.push(mat);
    g.add(sp);
    sparks.push({ sp, t: 1 });
  }
  const shots = [0, 1].map((i) => {
    const mat = new THREE.SpriteMaterial({ map: sparkMap, color: i ? '#ff9aa8' : '#7df0ff', transparent: true, depthTest: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.visible = false; sp.renderOrder = 21;
    own.push(mat);
    g.add(sp);
    return sp;
  });
  return { g, sparks, shots, dispose() { g.removeFromParent(); posts.dispose(); lamps.dispose(); for (const o of own) o.dispose(); } };
}

// ���� The fighters (also stood on the arcade's wall screen: game/brawl-tv.js) ����
export function makeFighter(look, side, parent) {
  const ch = createCharacter(look);
  const rig = ch.root.children.find((c) => c.rotation.order === 'YXZ') || ch.root;
  const f = { ch, rig, pose: P({}), body: {}, clipT: 0, live: true, side };
  ch.root.position.set(side ? 1.1 : -1.1, 0, 0);
  ch.root.rotation.y = side ? -Math.PI / 2 : Math.PI / 2;
  ch.setMoves(() => (f.live ? f.pose : null));
  parent.add(ch.root);
  return f;
}
// In the ring only, fighters are built taller: a smaller head and longer
// arms and legs, so a punch and a kick read from across the screen. Set
// every frame after the clip's own pose (the model resets the head's size).
function reshape(f) {
  const root = f.ch.root;
  if (!f.bones) {
    const get = (n) => root.getObjectByName(n);
    const b = { head: get('head'), spine: get('spine'), arms: [get('upperarml'), get('upperarmr')], legs: [get('upperlegl'), get('upperlegr')] };
    if (!b.head || !b.legs[0]) return; // (the model is still on its way)
    f.bones = b;
  }
  const b = f.bones;
  b.spine?.scale.setScalar(BUILD.torso);
  b.head.scale.multiplyScalar(BUILD.head / BUILD.torso);
  for (const a of b.arms) a?.scale.setScalar(BUILD.arm / BUILD.torso);
  for (const l of b.legs) l?.scale.setScalar(BUILD.leg);
}
// Stand fighter f as the rules have it (s). right: on the right of the picture.
export function placeFighter(f, s, dt, time, right) {
  const root = f.ch.root;
  root.position.set(s.x, 0, s.z);
  poseOf(s, time, f.pose, f.body);
  if (right) mirror(f.pose);
  if (f.clipT > 0) f.clipT -= dt;
  f.live = !(f.clipT > 0) || s.st !== 'idle'; // (bowing or cheering: the clip alone)
  f.rig.position.y = f.body.lift + BUILD.lift * Math.cos(f.body.pitch);
  f.rig.rotation.x = f.body.pitch;
  root.visible = !f.body.hide;
  // Chest a little toward the camera, like a fighting stance.
  const open = (s.st === 'down' || s.st === 'ko' || s.st === 'air') ? 0 : (right ? 0.4 : -0.4);
  root.rotation.y = Math.PI / 2 - s.face + open + (right ? 1 : -1) * f.body.yaw;
  f.ch.animate(dt, 0, false);
  reshape(f);
}

// ���� The game ��������������������������������������������������������������������������������������������������������������������������
export function createBrawl(game) {
  const store = localStorage;
  let on = null; // the stage, the two characters, the screen�� while open
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  if (!document.getElementById('brawl-css')) { const st = el('style'); st.id = 'brawl-css'; st.textContent = CSS; document.head.append(st); }

  // ���� Input ����
  const held = new Set(), pressed = new Set();
  const stick = { mx: 0, mz: 0 };
  const KEYS = {
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyJ: 'p', KeyK: 'k', KeyU: 's1', KeyI: 's2', Numpad1: 'p', Numpad2: 'k', Numpad4: 's1', Numpad5: 's2',
  };
  const onKey = (e) => {
    if (!on) return;
    if (on.hud?.commands?.open) {
      e.stopPropagation();
      if (e.code === 'Escape') { e.preventDefault(); on.hud.commands.close(); }
      return;
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const down = e.type === 'keydown';
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); if (down) close(); return; }
    if ((e.code === 'Enter' || e.code === 'Space') && on.card) { e.preventDefault(); e.stopPropagation(); if (down && !e.repeat) on.card.querySelector('.go')?.click(); return; }
    const k = KEYS[e.code];
    e.stopPropagation(); // (the game under us must not walk, chat or honk)
    if (!k) return;
    e.preventDefault();
    if (down) {
      if (!held.has(k)) {
        pressed.add(k);
        if (k === 'left' || k === 'right') tapped(k === 'right' ? 1 : -1);
      }
      held.add(k);
    } else held.delete(k);
  };
  // Twice the same way in a quarter of a second is a dash.
  let lastTap = 0, lastTapAt = 0, dashAsk = 0;
  function tapped(dir) {
    const now = performance.now();
    if (dir === lastTap && now - lastTapAt < 280) { dashAsk = dir; lastTap = 0; } else { lastTap = dir; lastTapAt = now; }
  }
  const onShift = (e) => {
    if (!on || e.key !== 'Shift' || e.repeat || e.type !== 'keydown') return;
    dashAsk = held.has('left') ? -1 : 1;
  };
  function readInput() {
    const inp = { mx: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0) || stick.mx, mz: (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0) || stick.mz };
    for (const b of ['p', 'k', 's1', 's2']) if (pressed.has(b)) inp[b] = true;
    if (dashAsk) { inp.dash = dashAsk; dashAsk = 0; }
    pressed.clear();
    return inp;
  }

  // ���� The screen ����
  function buildHud() {
    const root = el('div');
    root.id = 'brawl';
    const side = (r) => {
      const s = el('div', 'bw-side' + (r ? ' r' : ''));
      const bar = el('div', 'bw-bar'), ghost = el('i', 'ghost'), hp = el('i', 'hp');
      bar.append(ghost, hp);
      const name = el('div', 'bw-name'), label = el('span');
      const pips = Array.from({ length: ROUNDS_TO_WIN }, () => el('i', 'bw-pip'));
      name.append(label, ...pips);
      const style = el('div', 'bw-style');
      const sp = el('div', 'bw-sp'), cells = [el('i'), el('i')];
      sp.append(...cells.map((c) => { const w = el('b'); w.append(c); return w; }));
      s.append(bar, sp, name, style);
      return { s, ghost, hp, label, pips, style, cells, shown: -1, sp: -1 };
    };
    const a = side(0), b = side(1), time = el('div', 'bw-time', '45');
    const top = el('div', 'bw-top');
    top.append(a.s, time, b.s);
    const msg = el('div', 'bw-msg'), sub = el('div', 'bw-sub');
    const combo = [el('div', 'bw-combo'), el('div', 'bw-combo r')];
    const x = el('button', 'bw-x', '?');
    x.setAttribute('aria-label', tt('close'));
    x.onclick = () => close();
    root.append(top, msg, sub, ...combo, x);
    const commandButton = el('button', 'bw-command-button', L({ en: 'Commands', ko: 'Ŀ�ǵ�ǥ' }));
    commandButton.style.cssText = 'position:absolute;right:12px;top:110px;pointer-events:auto;padding:12px 18px;border:2px solid #c39bff;border-radius:14px;background:#211932;color:white;font:bold 17px system-ui;cursor:pointer';
    const commands = document.createElement('dialog');
    commands.style.cssText = 'pointer-events:auto;box-sizing:border-box;width:min(94vw,720px);max-height:88dvh;overflow:auto;padding:24px;border:2px solid #c39bff;border-radius:20px;background:#171329;color:white;font:18px system-ui';
    commands.setAttribute('aria-label', L({ en: 'Commands', ko: 'Ŀ�ǵ�ǥ' }));
    const heading = el('h2', null, L({ en: 'Commands', ko: 'Ŀ�ǵ�ǥ' }));
    const note = el('p', null, L({ en: 'Solo pauses here. Online matches keep running. �� means toward your rival. Specials cost 50 gauge.', ko: '�̱��� �Ͻ������˴ϴ�. �¶��� ������ ��� ����˴ϴ�. ��� ��� �����̸�, �ʻ��� ������ 50�� �ʿ��մϴ�.' }));
    const table = document.createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;font-size:clamp(18px,3.6vw,24px)';
    for (const [label, input] of [
      [L({ en: 'Punch / kick', ko: '��ġ / ű' }), '?? J / ?? K'],
      [L({ en: 'Combo', ko: '���� ����' }), '?? �� ?? �� ?? / ?? �� ?? �� ??'],
      [L({ en: 'Launcher', ko: '����' }), '�� + ?? J'],
      [L({ en: 'Special 1', ko: '�ʻ�� 1' }), '�� �� + ?? J  /  ?1 U'],
      [L({ en: 'Special 2', ko: '�ʻ�� 2' }), '�� �� + ?? K  /  ?2 I'],
      [L({ en: 'Guard', ko: '���' }), '��'],
      [L({ en: 'Dash', ko: '���' }), '�� �� / �� �� / Shift'],
    ]) {
      const row = document.createElement('tr');
      for (const text of [label, input]) { const cell = document.createElement('td'); cell.textContent = text; cell.style.cssText = 'padding:15px 8px;border-bottom:1px solid #49365f'; row.append(cell); }
      table.append(row);
    }
    const dismiss = el('button', null, L({ en: 'Close', ko: '�ݱ�' }));
    dismiss.style.cssText = 'margin-top:20px;width:100%;padding:14px;border:0;border-radius:12px;background:#c39bff;font:bold 20px system-ui;cursor:pointer';
    dismiss.onclick = () => commands.close();
    commands.append(heading, note, table, dismiss);
    commandButton.onclick = () => { held.clear(); pressed.clear(); stick.mx = stick.mz = 0; dashAsk = 0; commands.showModal(); };
    root.append(commandButton, commands);
    let pad = null;
    if (touch) {
      pad = el('div', 'bw-pad');
      const zone = el('div', 'bw-stick'), ring = el('div', 'bw-ring'), knob = el('div', 'bw-knob');
      ring.append(knob); zone.append(ring);
      let id = null, ox = 0, oy = 0;
      const move = (e) => {
        const dx = e.clientX - ox, dy = e.clientY - oy, d = Math.hypot(dx, dy), k = d > 44 ? 44 / d : 1;
        knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
        const was = stick.mx;
        stick.mx = Math.abs(dx) > 16 ? Math.sign(dx) : 0;
        if (stick.mx && stick.mx !== was) tapped(stick.mx);
        stick.mz = Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 0.7 ? -Math.sign(dy) : 0;
      };
      zone.onpointerdown = (e) => {
        if (id != null) return;
        id = e.pointerId; zone.setPointerCapture(id);
        const r = ring.getBoundingClientRect();
        ox = r.left + r.width / 2; oy = r.top + r.height / 2;
        move(e);
      };
      zone.onpointermove = (e) => { if (e.pointerId === id) move(e); };
      zone.onpointerup = zone.onpointercancel = (e) => { if (e.pointerId !== id) return; id = null; stick.mx = stick.mz = 0; knob.style.transform = ''; };
      const btns = el('div', 'bw-btns');
      for (const [k, icon, tag, col] of [['s1', '?', '1', '#8a5ad6'], ['s2', '?', '2', '#d9982a'], ['p', '??', '', '#3f7fe0'], ['k', '??', '', '#e0483f']]) {
        const b = el('button', k[0] === 's' ? 'sp' : null, icon);
        if (tag) b.append(el('small', null, tag));
        b.style.background = col;
        b.onpointerdown = (e) => { e.preventDefault(); pressed.add(k); b.classList.add('on'); };
        b.onpointerup = b.onpointercancel = b.onpointerleave = () => b.classList.remove('on');
        btns.append(b);
      }
      const dash = el('button', 'bw-dash', '??');
      dash.onpointerdown = (e) => { e.preventDefault(); dashAsk = stick.mx < 0 ? -1 : 1; dash.classList.add('on'); };
      dash.onpointerup = dash.onpointercancel = dash.onpointerleave = () => dash.classList.remove('on');
      pad.append(zone, btns, dash);
      root.append(pad);
    } else root.append(el('div', 'bw-keys', tt('keys') + ' �� �� �� + J / K = ?1 / ?2'));
    if (touch) root.append(el('div', 'bw-keys', '�� �� + ?? / ?? = ?1 / ?2'));
    root.oncontextmenu = (e) => e.preventDefault();
    document.body.append(root);
    return { root, a, b, time, msg, sub, combo, pad, commands, comboT: [0, 0], msgT: 0 };
  }
  function say(text, sub = '', secs = 1.4) {
    const h = on.hud;
    h.msg.textContent = text; h.sub.textContent = sub;
    h.msg.classList.remove('show'); void h.msg.offsetWidth; h.msg.classList.add('show');
    h.msgT = secs;
  }
  function card(build) {
    on.card?.remove();
    const c = on.card = el('div', 'bw-card');
    build(c);
    on.hud.root.append(c);
    if (on.hud.pad) on.hud.pad.style.display = 'none';
    on.hud.root.querySelector('.bw-keys')?.style.setProperty('display', 'none');
  }
  const button = (text, cls, fn) => { const b = el('button', cls, text); b.onclick = fn; return b; };
  function ladder(c, rec, now) {
    const row = el('div', 'bw-ladder');
    for (let i = 0; i < RIVALS; i++) row.append(el('b', i < now ? 'done' : i === now ? 'now' : '', i === RIVALS - 1 ? '??' : String(i + 1)));
    c.append(row);
  }
  const styleTag = (id) => STYLE[id].icon + ' ' + L(STYLE[id].name);
  const seqText = (seq, i) => (i ? BTN.k : BTN.p).repeat(seq.length); // (the same button, once a hit)
  function styleInfo(box, id) {
    const st = STYLES[id], mv = movesFor(id);
    box.replaceChildren();
    box.append(el('p', 'big', styleTag(id)), el('p', null, L(STYLE[id].line)));
    const power = (st.punch[1] + st.kick[1]) / 2;
    for (const [icon, k] of [['??', st.hp / 120], ['?', st.walk / 1.25], ['??', (power - 0.7) / 0.5]]) {
      const row = el('div', 'bw-stat'), bar = el('i'), fill = el('u');
      fill.style.width = Math.round(Math.max(0.12, Math.min(1, k)) * 100) + '%';
      bar.append(fill); row.append(el('span', null, icon), bar);
      box.append(row);
    }
    box.append(el('p', 'seq', '? ' + L(STYLE[id].sig) + ': ' + (st.slot === 'palm' ? BTN.s1 : BTN.s2) + (mv[st.slot].hits ? ` ��${mv[st.slot].hits}` : '')));
    box.append(el('p', 'seq', '?? ' + st.combos.map(seqText).join('   ��   ')));
  }
  // The eight styles to pick from, and what the picked one does.
  function styleGrid(c) {
    const grid = el('div', 'bw-styles'), info = el('div');
    const pick = (id) => {
      on.style = id;
      saveStyle(store, id);
      for (const b of grid.children) b.classList.toggle('sel', b.dataset.id === id);
      styleInfo(info, id);
      showStyles();
    };
    for (const id of STYLE_IDS) {
      const b = button(L(STYLE[id].name), null, () => pick(id));
      b.dataset.id = id;
      b.prepend(el('b', null, STYLE[id].icon));
      grid.append(b);
    }
    c.append(grid, info);
    pick(on.style);
  }
  function menu(note) {
    endCast();
    const rec = loadBrawl(store);
    on.style = rec.style || on.style || 'brawler';
    on.flip = 0;
    setRival(rec.stage);
    on.match = null;
    card((c) => {
      c.append(el('h3', null, '?? ' + tt('title')));
      if (note) c.append(el('p', 'bw-note', note));
      // Anyone else in the room: fight them instead (no need to be friends).
      const list = el('div', 'bw-vs');
      c.append(el('p', 'dim', tt('vsTitle')), list);
      on.vsList = { list, at: -9, key: null };
      c.append(el('p', 'dim', tt('rival', { n: rec.stage + 1, max: RIVALS }) + ' �� ' + L(RIVAL[rec.stage].name) + ' (' + styleTag(RIVAL[rec.stage].style) + ')'));
      ladder(c, rec, rec.stage);
      c.append(el('p', 'big', tt('pick')));
      styleGrid(c);
      const more = el('details');
      more.append(el('summary', 'dim', '?'), el('p', null, tt('how')), el('p', 'dim', tt('moves')), el('p', 'dim', tt('dash')));
      if (!touch) more.append(el('p', 'dim', tt('keys')));
      c.append(more);
      if (rec.best) c.append(el('p', 'dim', tt('best', { n: rec.best }) + (rec.crowns ? ' �� ' + tt('crowns', { n: rec.crowns }) : '')));
      const row = el('div', 'row');
      row.append(button('?? ' + tt('start', { name: L(RIVAL[rec.stage].name) }), 'go', () => begin(rec.stage)), button(tt('close'), null, () => close()));
      c.append(row);
    });
    fillPeople();
  }
  const people = () => {
    const p = game.me?.root?.position;
    if (!p || !game.others?.nearbyFree) return [];
    return game.others.nearbyFree(p.x, p.z, 40).filter((f) => !game.safety?.isBlocked(f.id, f.name)).slice(0, 8);
  };
  function fillPeople() {
    const v = on.vsList;
    if (!v?.list.isConnected) { on.vsList = null; return; }
    v.at = on.time;
    const now = people(), key = now.map((f) => f.id + f.name).join('|');
    if (key === v.key) return;
    v.key = key;
    v.list.replaceChildren();
    if (!now.length) v.list.append(el('p', 'dim', tt('vsNone')));
    for (const f of now) { const b = button('?? ' + f.name, null, () => invite(f)); b.dataset.peer = f.id; v.list.append(b); }
  }

  // ���� With someone else in the room (core/brawl-net.js) ����
  // The asking and answering go over the room's messages (game/arcade.js
  // hands us ours): brawl:<to>:<kind>:<nonce>:<style>, kind i (fight me?),
  // a (picking a style), y (ready), n (no), b (busy), c (never mind). The
  // match itself has its own channel, so the room hears none of it.
  const tell = (to, kind, nonce) => game.net?.sendEmote?.(`brawl:${to}:${kind}:${nonce}:${Math.max(0, STYLE_IDS.indexOf(on.style))}`);
  function invite(peer) {
    if (on.vs || on.match) return;
    const nonce = Math.random().toString(36).slice(2, 10);
    on.vs = { host: true, peer: { id: peer.id, name: peer.name }, nonce, st: 'wait', until: on.time + 32 };
    tell(peer.id, 'i', nonce);
    waitCard(tt('vsWait', { name: peer.name }));
  }
  function waitCard(text) {
    card((c) => {
      c.append(el('h3', null, '?? ' + tt('title')), el('p', 'big', text));
      const row = el('div', 'row');
      row.append(button(tt('cancel'), null, () => { leaveVs(true); menu(); }));
      c.append(row);
    });
  }
  // Out of a fight with someone, at any point. say: let them know.
  function leaveVs(say) {
    const vs = on?.vs;
    if (!vs) return;
    if (say) {
      if (vs.link) { try { vs.link.send({ bye: 1 }); } catch { /* closed */ } }
      else tell(vs.peer.id, vs.host ? 'c' : 'n', vs.nonce);
    }
    vs.dead = true;
    endCast();
    const link = vs.link;
    if (link) setTimeout(() => link.close(), 300); // (after the goodbye has gone)
    on.vs = null; on.match = null; on.flip = 0;
  }
  // Someone asked us (we said yes on the room's card, or the game was open).
  function invited(inv) {
    if (on.vs || on.match) { game.net?.sendEmote?.(`brawl:${inv.from}:b:${inv.nonce}:0`); return; }
    on.vs = { host: false, peer: { id: inv.from, name: inv.name }, nonce: inv.nonce, st: 'pick', until: on.time + 28, style: STYLE_IDS[inv.style] || 'brawler' };
    on.style = loadBrawl(store).style || on.style;
    tell(inv.from, 'a', inv.nonce);
    setFoe('p:' + inv.from, game.others.lookOf?.(inv.from) || {}, inv.name, on.vs.style, VS_SKY);
    card((c) => {
      c.append(el('h3', null, '?? ' + tt('title')), el('p', 'big', tt('vsAsk', { name: inv.name })), el('p', 'dim', inv.name + ': ' + styleTag(on.vs.style)));
      c.append(el('p', 'big', tt('pick')));
      styleGrid(c);
      const row = el('div', 'row');
      row.append(button('?? ' + tt('ready'), 'go', () => { const vs = on.vs; tell(vs.peer.id, 'y', vs.nonce); connect(vs.style); }), button(tt('no'), null, () => { leaveVs(true); menu(); }));
      c.append(row);
    });
  }
  // A message about a fight, from the other player (game/arcade.js).
  function heard(from, kind, nonce, style) {
    const vs = on?.vs;
    if (!vs || vs.peer.id !== from || vs.nonce !== nonce) return;
    if (vs.host && vs.st === 'wait') {
      if (kind === 'a') vs.until = on.time + 32;
      else if (kind === 'y') connect(STYLE_IDS[style] || 'brawler');
      else if (kind === 'n' || kind === 'b') { leaveVs(false); menu(tt(kind === 'n' ? 'vsNo' : 'vsBusy', { name: vs.peer.name })); }
    } else if (!vs.host && vs.st === 'pick' && kind === 'c') { leaveVs(false); menu(tt('vsGone')); }
  }
  // Both said yes: open the match's own channel and say hello on it until
  // the other answers; then the match starts on both screens.
  function connect(theirStyle) {
    const vs = on.vs;
    vs.st = 'link'; vs.style = theirStyle; vs.until = on.time + 15; vs.hiAt = 0;
    on.flip = vs.host ? 0 : 1;
    setFoe('p:' + vs.peer.id, game.others.lookOf?.(vs.peer.id) || {}, vs.peer.name, theirStyle, VS_SKY);
    waitCard(tt('vsLink'));
    const onMsg = (m) => {
      if (vs.dead || !on || on.vs !== vs || !m || typeof m !== 'object') return;
      vs.heardAt = on.time;
      if (m.bye) { leaveVs(false); menu(tt('vsLeft', { name: vs.peer.name })); return; }
      if (!vs.session) startVs();
      if (m.hi) { if (m.hi === 1) vs.link?.send({ hi: 2 }); } else vs.session.receive(m);
    };
    Promise.resolve().then(() => game.link('brawl-' + vs.nonce, onMsg)).then((link) => {
      if (vs.dead) { link.close(); return; }
      vs.link = link;
    }).catch((err) => {
      console.warn('[brawl] no channel for the match:', err);
      if (on?.vs === vs) { leaveVs(false); menu(tt('vsLost')); }
    });
  }
  function startVs() {
    const vs = on.vs;
    vs.st = 'play';
    vs.session = createSession({
      side: vs.host ? 0 : 1, styles: vs.host ? [on.style, vs.style] : [vs.style, on.style], send: (m) => { if (!vs.dead) vs.link?.send(m); },
      onSure: vs.host ? (ia, ib, m) => on?.cast?.step(ia, ib, m) : undefined, // (the host shows it to the room)
    });
    if (vs.host) cast({ b: vs.peer.id, n: [game.nickname || '', vs.peer.name] }, vs.session.certain);
    startUi();
    on.match = vs.session.match;
  }
  function vsResult(res) {
    const vs = on.vs, name = vs.peer.name, peer = vs.peer;
    const won = res === on.flip;
    if (won) game.me?.play?.('cheer');
    leaveVs(false);
    card((c) => {
      c.append(el('h3', null, '?? ' + tt('title')));
      c.append(el('p', 'big', res === 2 ? tt('draw') : won ? tt('won', { name }) : tt('vsLose', { name })));
      const row = el('div', 'row');
      row.append(button('?? ' + tt('again'), 'go', () => { const f = people().find((q) => q.id === peer.id); if (f) invite(f); else menu(tt('vsGone')); }), button(styleTag(on.style) + ' ?', null, () => menu()), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function result(stage, won) {
    const rec = afterMatch(store, stage, won), name = L(RIVAL[stage].name);
    const champ = won && stage === RIVALS - 1;
    card((c) => {
      c.append(el('h3', null, '?? ' + tt('title')));
      c.append(el('p', 'big', champ ? tt('champ') : won ? tt('won', { name }) : tt('lost', { name })));
      ladder(c, rec, champ ? RIVALS : rec.stage);
      if (rec.best) c.append(el('p', 'dim', tt('best', { n: rec.best }) + (rec.crowns ? ' �� ' + tt('crowns', { n: rec.crowns }) : '')));
      const row = el('div', 'row');
      row.append(button('?? ' + (won && !champ ? tt('next') : tt('again')), 'go', () => { setRival(rec.stage); begin(rec.stage); }), button(styleTag(on.style) + ' ?', null, () => menu()), button(tt('close'), null, () => close()));
      c.append(row);
    });
  }
  function showStyles() {
    if (!on.hud) return;
    on.hud.a.style.textContent = styleTag(on.style);
    if (on.foeStyle) on.hud.b.style.textContent = styleTag(on.foeStyle);
  }

  // ���� The fighters ����
  const fighter = (look, side) => makeFighter(look, side, on.stage.g);
  // Who stands across the ring: one of the five rivals, or another player.
  function setFoe(key, look, name, style, sky) {
    on.foeStyle = style;
    if (on.foeKey === key) { showStyles(); return; }
    on.foeKey = key;
    if (on.rival) { on.rival.ch.setMoves(null); on.rival.ch.root.removeFromParent(); }
    // The sky of this rival's round.
    const stageNow = buildStage(sky);
    for (const f of [on.me, on.rival]) if (f) f.ch.root.removeFromParent();
    on.stage?.dispose();
    on.stage = stageNow;
    on.scene.add(stageNow.g);
    if (on.me) stageNow.g.add(on.me.ch.root); else on.me = fighter(game.look, 0);
    on.rival = fighter(look, 1);
    on.hud.a.label.textContent = game.nickname || tt('you');
    on.hud.b.label.textContent = name;
    showStyles();
  }
  function setRival(stage) {
    on.rivalStage = stage;
    setFoe('r:' + stage, RIVAL[stage].look, L(RIVAL[stage].name), RIVAL[stage].style, RIVAL[stage].sky);
  }
  // The match goes out to the room, for the arcade's wall screens (core/brawl-tv.js).
  function cast(about, m) {
    endCast();
    on.cast = createCaster((text) => game.net?.sendEmote?.(text), about);
    on.cast.start(m);
  }
  function endCast() { on?.cast?.end(); if (on) on.cast = null; }
  function startUi() {
    on.card?.remove(); on.card = null;
    if (on.hud.pad) on.hud.pad.style.display = '';
    on.hud.root.querySelector('.bw-keys')?.style.removeProperty('display');
    held.clear(); pressed.clear();
    on.acc = 0; on.freeze = 0; on.shake = 0; on.overT = 0; on.cheer = null;
    for (const s of [on.hud.a, on.hud.b]) { s.shown = s.sp = -1; s.s.classList.remove('rage'); }
  }
  function begin(stage) {
    if (on.vs) return;
    startUi();
    const m = on.match = createMatch({ level: stage, style: on.style, rivalStyle: RIVAL[stage].style });
    endCast();
    on.cast = createSoloCaster((text) => game.net?.sendEmote?.(text));
    on.cast.start();
    m.onStep = () => on?.cast?.step();
    on.stageNo = stage;
  }

  function spark(x, y, z, color, size) {
    const s = on.stage.sparks.reduce((a, b) => (b.t > a.t ? b : a));
    s.t = 0; s.size = size;
    s.sp.position.set(x, y, z);
    s.sp.material.color.set(color);
    s.sp.material.rotation = Math.random() * Math.PI;
    s.sp.visible = true;
  }
  function onEvents(ev) {
    const m = on.match, { sfx } = game;
    for (const e of ev) {
      if (e.k === 'round') {
        say(m.wins[0] === ROUNDS_TO_WIN - 1 && m.wins[1] === ROUNDS_TO_WIN - 1 ? 'FINAL ROUND' : 'ROUND ' + e.n, styleTag((on.flip ? m.b : m.a).style) + '  VS  ' + styleTag((on.flip ? m.a : m.b).style), 1.6);
        for (const f of [on.me, on.rival]) { f.clipT = 1.7; f.ch.play('bow'); }
        sfx.tock(0.5, 500);
      } else if (e.k === 'fight') { say('FIGHT!', '', 0.8); sfx.tock(0.9, 900); }
      else if (e.k === 'swing') {
        const fighter = e.by ? m.b : m.a;
        if (fighter.mv[e.move].level >= 9) {
          spark(fighter.x, 0.85, fighter.z, '#c39bff', 2.1);
          sfx.tock(0.7, 1250);
          const c = on.hud.combo[e.by ^ on.flip];
          c.textContent = '? ' + (e.move === 'palm' ? '1' : '2');
          c.classList.add('show'); on.hud.comboT[e.by] = 0.8;
        } else sfx.tock(0.18, fighter.mv[e.move].level >= 3 ? 520 : 760);
      }
      else if (e.k === 'dash') sfx.tock(0.2, 1100);
      else if (e.k === 'shot') sfx.tock(0.5, 1500);
      else if (e.k === 'blink') { spark(e.from[0], 0.7, e.from[1], '#b9a6f0', 1.2); spark(e.x, 0.7, e.z, '#b9a6f0', 1.2); sfx.tock(0.4, 1800); }
      else if (e.k === 'combo') { const c = on.hud.combo[e.by ^ on.flip]; c.textContent = 'COMBO!'; c.classList.add('show'); on.hud.comboT[e.by] = 1.3; on.comboAt = on.time; }
      else if (e.k === 'block') { spark(e.x, e.y, e.z, '#7df0ff', 0.7); sfx.tock(0.45, 420); if (!on.vs) on.freeze = 3; }
      else if (e.k === 'hit') {
        const special = ['palm', 'fly', 'shot'].includes(e.move);
        const big = special || e.dmg >= 14 || e.launch || e.ko || e.fin;
        spark(e.x, e.y, e.z, special ? '#c39bff' : e.armor ? '#9fb4c8' : e.counter ? '#ff6a5a' : '#ffe9a0', special ? 2.3 : big ? 1.5 : 1);
        sfx.tock(big ? 1 : 0.7, big ? 170 : 250);
        if (!on.vs) on.freeze = e.ko ? 16 : big ? 7 : 4; // (two screens cannot stop the clock for a hit)
        on.shake = Math.max(on.shake, big ? 0.14 : 0.06);
        const c = on.hud.combo[e.by ^ on.flip];
        if ((e.combo >= 2 || e.counter) && !(e.fin && on.comboAt === on.time)) {
          c.textContent = e.combo >= 2 ? tt('hits', { n: e.combo }) : 'COUNTER!';
          c.classList.add('show'); on.hud.comboT[e.by] = 1.1;
        }
      } else if (e.k === 'down') { sfx.tock(0.6, 110); on.shake = Math.max(on.shake, 0.08); }
      else if (e.k === 'rage') on.hud[e.who ^ on.flip ? 'b' : 'a'].s.classList.add('rage');
      else if (e.k === 'ko' || e.k === 'time') {
        say(e.k === 'time' ? 'TIME UP' : 'K.O.', e.perfect ? 'PERFECT!' : '', 2.4);
        sfx.tock(1, 130);
        on.cheer = e.winner == null ? null : { who: e.winner, at: 55 };
      } else if (e.k === 'over') { on.overT = on.vs ? 1.2 : 0.6; on.overRes = e.result; }
    }
  }

  const v = new THREE.Vector3(), camAt = new THREE.Vector3(), camTo = new THREE.Vector3();
  const place = (f, st, dt) => placeFighter(f, st, dt, on.time, st.side ^ on.flip);

  // A fight with someone: waiting for an answer runs out, hello on the
  // match's channel, and the match itself (the clock never stops for a hit).
  function versus(dt) {
    const vs = on.vs;
    if (vs.st !== 'play') {
      if (on.time > vs.until) { const st = vs.st; leaveVs(true); menu(tt(st === 'link' ? 'vsLost' : 'vsGone')); return; }
      if (vs.st === 'link' && vs.link && on.time - vs.hiAt > 0.4) { vs.hiAt = on.time; vs.link.send({ hi: 1 }); }
      return;
    }
    const sn = vs.session;
    on.acc = Math.min(on.acc + dt, 0.25);
    while (on.acc >= TICK && on.vs === vs) {
      on.acc -= TICK;
      const ev = sn.tick(readInput());
      on.match = sn.match;
      onEvents(ev);
    }
    if (on.vs !== vs) return;
    if (sn.waiting && on.hud.msgT <= 0) on.hud.sub.textContent = tt('vsSlow');
    else if (!sn.waiting && on.hud.msgT <= 0 && on.hud.sub.textContent) on.hud.sub.textContent = '';
    // Nothing from them for a while (they closed the game, or the network did).
    if (on.overT <= 0 && on.time - (vs.heardAt ?? on.time) > 8) { leaveVs(true); menu(tt('vsLost')); }
  }
  function frame(dt) {
    const h = on.hud;
    on.time += dt;
    if (on.vs) versus(dt);
    if (on.vsList && on.time - on.vsList.at > 1.5) fillPeople();
    const m = on.match;
    if (m) {
      if (on.vs) { /* (played above) */ }
      else if (on.freeze > 0) on.freeze -= dt * 60;
      else {
        on.acc = Math.min(on.acc + dt, 0.1);
        while (on.acc >= TICK && on.freeze <= 0) {
          on.acc -= TICK;
          onEvents(m.step(m.phase === 'fight' ? readInput() : undefined));
        }
      }
      // The winner cheers a moment after the other is down.
      if (on.cheer && m.phase === 'ko' && m.t >= on.cheer.at) {
        const w = on.cheer.who ^ on.flip ? on.rival : on.me, s = on.cheer.who ? m.b : m.a;
        if (s.st === 'idle') { w.clipT = 1.7; w.ch.play('cheer'); }
        on.cheer = null;
      }
      const mine = on.flip ? m.b : m.a, theirs = on.flip ? m.a : m.b;
      place(on.me, mine, dt); place(on.rival, theirs, dt);
      // Balls of light in flight.
      for (const [i, f] of [m.a, m.b].entries()) {
        const sp = on.stage.shots[i];
        sp.visible = !!f.shot;
        if (f.shot) { sp.position.set(f.shot.x, 0.78, f.shot.z); sp.material.rotation += dt * 9; sp.scale.setScalar(0.75 + Math.sin(on.time * 30) * 0.08); }
      }
      // The bars, the clock, the rounds won.
      for (const [s, f] of [[h.a, mine], [h.b, theirs]]) {
        if (s.shown !== f.hp) { s.shown = f.hp; const k = `scaleX(${f.hp / f.maxHp})`; s.hp.style.transform = k; s.ghost.style.transform = k; }
        if (!f.rage) s.s.classList.remove('rage');
        if (s.sp !== f.sp) {
          s.sp = f.sp;
          s.cells.forEach((c, i) => { const k = Math.max(0, Math.min(1, (f.sp - SP_COST * i) / SP_COST)); c.style.transform = `scaleX(${k})`; c.parentNode.classList.toggle('full', k >= 1); });
          if (f === mine) h.pad?.classList.toggle('no-sp', f.sp < SP_COST);
        }
        s.pips.forEach((p, i) => p.classList.toggle('on', i < m.wins[f.side]));
      }
      const left = String(Math.ceil(m.left / 60));
      if (h.time.textContent !== left) h.time.textContent = left;
      if (on.vs) { if (on.overT > 0 && (on.overT -= dt) <= 0) vsResult(on.overRes); }
      else if (m.phase === 'over' && on.overT > 0 && (on.overT -= dt) <= 0) {
        const won = m.result === 0;
        if (won) game.me?.play?.('cheer');
        on.match = null;
        endCast();
        result(on.stageNo, won);
      }
    } else {
      // Waiting at the menu: both stand ready.
      for (const sp of on.stage.shots) sp.visible = false;
      on.idle[0].style = on.style; on.idle[1].style = on.foeStyle || 'brawler';
      for (const f of [on.me, on.rival]) {
        const s = on.idle[f === on.me ? 0 : 1];
        place(f, s, dt);
      }
    }
    for (let i = 0; i < 2; i++) if (h.comboT[i] > 0 && (h.comboT[i] -= dt) <= 0) h.combo[i].classList.remove('show');
    if (h.msgT > 0 && (h.msgT -= dt) <= 0) { h.msg.classList.remove('show'); h.sub.textContent = ''; }
    for (const s of on.stage.sparks) {
      if (!s.sp.visible) continue;
      s.t += dt / 0.22;
      if (s.t >= 1) { s.sp.visible = false; continue; }
      s.sp.scale.setScalar(s.size * (0.3 + s.t * 0.6));
      s.sp.material.opacity = 1 - s.t * s.t;
    }
  }

  function camera(dt) {
    const { camera: cam } = game;
    const flip = on.match ? on.flip : 0; // (the guest looks from the other side: their fighter on the left too)
    const a = on.match ? (flip ? on.match.b : on.match.a) : on.idle[0], b = on.match ? (flip ? on.match.a : on.match.b) : on.idle[1];
    const dx = b.x - a.x, dz = b.z - a.z, dist = Math.hypot(dx, dz) || 1;
    const ux = dx / dist, uz = dz / dist;
    const aspect = innerWidth / innerHeight;
    // Both fit across the screen; a phone held upright is narrow, so there
    // the view opens wider instead of backing far away.
    const tanH = Math.max(0.36, Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect);
    const fov = Math.max(FOV, THREE.MathUtils.radToDeg(2 * Math.atan(tanH / aspect)));
    if (Math.abs(cam.fov - fov) > 0.01 || cam.view) { cam.clearViewOffset(); cam.fov = fov; cam.updateProjectionMatrix(); }
    const half = dist / 2 + 0.95;
    const back = Math.max(3.1, half / tanH);
    const portrait = aspect < 0.9;
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    camTo.set(mx, STAGE_Y + (portrait ? 0.2 : 0.72) + Math.max(a.y, b.y) * 0.3, mz);
    v.set(mx - uz * back, STAGE_Y + 1.0 + back * 0.09, mz + ux * back);
    if (!on.camSet) { camAt.copy(v); on.camSet = true; } else camAt.lerp(v, 1 - Math.exp(-dt * 7));
    cam.position.copy(camAt);
    if (on.shake > 0.001) { cam.position.x += (Math.random() - 0.5) * on.shake; cam.position.y += (Math.random() - 0.5) * on.shake; on.shake *= Math.exp(-dt * 12); }
    cam.lookAt(camTo);
  }

  function close() {
    if (!on) return;
    leaveVs(true);
    endCast();
    const o = on;
    on = null;
    removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); removeEventListener('keydown', onShift, true);
    held.clear(); pressed.clear(); stick.mx = stick.mz = 0;
    for (const f of [o.me, o.rival]) { f.ch.setMoves(null); f.ch.root.removeFromParent(); }
    o.stage.dispose();
    o.hud.root.remove();
    document.documentElement.classList.remove('brawl-on');
    const cam = game.camera;
    cam.fov = o.fov; cam.updateProjectionMatrix();
  }

  return {
    get open() { return !!on; },
    get active() { return !!on; },
    close,
    show() {
      if (on || !game.interior || !game.activeScene) return;
      on = { interior: game.interior, scene: game.activeScene, fov: game.camera.fov, time: 0, acc: 0, freeze: 0, shake: 0, overT: 0, camSet: false, rivalStage: -1, flip: 0, vs: null, foeKey: null, foeStyle: null, vsList: null, cheer: null, cast: null, style: 'brawler', comboAt: -1, stage: null, me: null, rival: null, match: null, card: null };
      on.idle = [{ side: 0, x: -1.1, z: 0, y: 0, face: 0, st: 'idle', t: 0, style: 'brawler' }, { side: 1, x: 1.1, z: 0, y: 0, face: Math.PI, st: 'idle', t: 0, style: 'brawler' }];
      on.hud = buildHud();
      document.documentElement.classList.add('brawl-on');
      addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true); addEventListener('keydown', onShift, true);
      menu();
    },
    // Each frame, after the game's own camera (game/arcade.js).
    update(dt) {
      if (!on) return;
      if (game.interior !== on.interior) { close(); return; }
      if (on.hud.commands.open && !on.vs) { on.cast?.step(); return; }
      frame(dt);
      if (on) camera(dt);
    },
    // For tests: the match in play and a way to start one.
    get match() { return on?.match || null; },
    // Fighting, or waiting for someone to answer (game/arcade.js: no new invites).
    get busy() { return !!(on && (on.vs || on.match)); },
    get versus() { return on?.vs ? { st: on.vs.st, host: on.vs.host, head: on.vs.session?.head ?? 0, sure: on.vs.session?.sure ?? 0 } : null; },
    invited(inv) { if (on) invited(inv); },
    heard(from, kind, nonce, style) { if (on) heard(from, kind, nonce, style); },
    // Two invites crossing: the smaller id stays the host, the other answers.
    crossed(from) { const vs = on?.vs; if (!(vs?.host && vs.st === 'wait' && vs.peer.id === from)) return false; if (game.myId < from) return 'keep'; leaveVs(false); return 'yield'; },
    start(stage = 0) { if (on) { setRival(stage); begin(stage); } },
  };
}
