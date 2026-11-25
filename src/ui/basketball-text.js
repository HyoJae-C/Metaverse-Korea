// Text for the mini basketball court (ui/basketball-ui.js), in every UI
// language. English is the source; a missing language falls back to
// English and Traditional Chinese is made from zh (core/i18n.js localName).
import { getLanguage, localName } from '../core/i18n.js';
import { BASKET_OPEN } from './basketball-labels.js';

const L = (en, ko, ja, zh, es, id, vi, ar, fr, th, pt) => ({ en, ko, ja, zh, es, id, vi, ar, fr, th, pt });

export const BT = {
  title: L('Mini basketball', '미니 농구', 'ミニバスケット', '迷你篮球', 'Minibaloncesto', 'Basket mini', 'Bóng rổ mini', 'كرة سلة مصغّرة', 'Mini basket', 'บาสเกตบอลมินิ', "Minibasquete"),
  open: BASKET_OPEN,
  court: L('Peace Plaza Court', '평화의광장 농구장', '平和の広場コート', '和平广场球场', 'Cancha de la Plaza de la Paz', 'Lapangan Alun-alun Perdamaian', 'Sân Quảng trường Hòa bình', 'ملعب ساحة السلام', 'Terrain de la Place de la Paix', 'สนามพีซพลาซ่า', "Quadra da Praça da Paz"),
  howTo: L(
    'Five shots a round. Pick a shot, then play its little gauge: the better you do, the better the move (3 levels). A made shot scores its points; a level 3 move gets +1 style point.',
    '한 판에 5번 슛해요. 슛을 고르고 짧은 게이지 게임을 하면, 잘할수록 더 멋진 동작이 나와요 (3단계). 들어가면 점수를 얻고, 3단계 동작은 스타일 점수 1점이 더 붙어요.',
    '1ゲーム5本。シュートを選んで短いゲージに挑戦。うまくいくほどカッコいい技になります（3段階）。入れば得点、レベル3の技はスタイル点+1。',
    '一局投5次。选好投篮方式，玩一个小量表：表现越好，动作越帅（3个等级）。投进得分，3级动作再加1分风格分。',
    'Cinco tiros por ronda. Elige un tiro y juega su pequeño indicador: cuanto mejor lo hagas, mejor será la jugada (3 niveles). Una canasta suma sus puntos; una jugada de nivel 3 suma +1 de estilo.',
    'Lima tembakan per ronde. Pilih tembakan, lalu mainkan meteran kecilnya: makin bagus, makin keren gerakannya (3 level). Tembakan masuk dapat poin; gerakan level 3 dapat +1 poin gaya.',
    'Mỗi ván 5 cú ném. Chọn kiểu ném rồi chơi thanh đo nhỏ: càng tốt, động tác càng đẹp (3 cấp). Ném vào được điểm; động tác cấp 3 được thêm 1 điểm phong cách.',
    'خمس رميات في الجولة. اختر الرمية ثم العب مؤشرها الصغير: كلما أحسنت كانت الحركة أروع (3 مستويات). الرمية الناجحة تمنحك نقاطها، وحركة المستوى 3 تمنح نقطة أسلوب إضافية.', 'Cinq tirs par manche. Choisis un tir, puis joue sa petite jauge : mieux tu fais, plus le geste est beau (3 niveaux). Un panier marqué rapporte ses points ; un geste de niveau 3 donne +1 point de style.', 'รอบละห้าช็อต เลือกช็อตแล้วเล่นเกจสั้นๆ ยิ่งทำได้ดี ท่ายิ่งเท่ (3 ระดับ) ยิงลงได้คะแนนตามช็อต ท่าระดับ 3 ได้แต้มสไตล์เพิ่ม +1', "Cinco arremessos por rodada. Escolha um arremesso e jogue o medidor dele: quanto melhor, melhor o movimento (3 níveis). Arremesso convertido vale seus pontos; movimento nível 3 ganha +1 ponto de estilo.",
  ),
  pick: L('Pick your shot', '슛을 골라요', 'シュートを選んで', '选择投篮方式', 'Elige tu tiro', 'Pilih tembakanmu', 'Chọn cú ném', 'اختر رميتك', 'Choisis ton tir', 'เลือกช็อตของคุณ', "Escolha seu arremesso"),
  shotN: L('Shot {i} of {n}', '{i}/{n}번째 슛', '{n}本中{i}本目', '第{i}/{n}投', 'Tiro {i} de {n}', 'Tembakan {i} dari {n}', 'Cú ném {i}/{n}', 'الرمية {i} من {n}', 'Tir {i} sur {n}', 'ช็อตที่ {i}/{n}', "Arremesso {i} de {n}"),
  pts: L('{n} pts', '{n}점', '{n}点', '{n}分', '{n} pts', '{n} poin', '{n} điểm', '{n} نقاط', '{n} pts', '{n} แต้ม', "{n} pts"),
  score: L('Score: {n}', '점수: {n}', 'スコア：{n}', '得分：{n}', 'Puntos: {n}', 'Skor: {n}', 'Điểm: {n}', 'النقاط: {n}', 'Score : {n}', 'คะแนน: {n}', "Pontos: {n}"),
  best: L('Best: {n}', '최고: {n}', 'ベスト：{n}', '最佳：{n}', 'Mejor: {n}', 'Terbaik: {n}', 'Cao nhất: {n}', 'الأفضل: {n}', 'Record : {n}', 'ดีที่สุด: {n}', "Recorde: {n}"),
  start: L('Start', '시작', 'スタート', '开始', 'Empezar', 'Mulai', 'Bắt đầu', 'ابدأ', 'Commencer', 'เริ่ม', "Começar"),
  again: L('Play again', '한 판 더', 'もう一回', '再来一局', 'Jugar otra vez', 'Main lagi', 'Chơi lại', 'العب مرة أخرى', 'Rejouer', 'เล่นอีกครั้ง', "Jogar de novo"),
  close: L('Close', '닫기', '閉じる', '关闭', 'Cerrar', 'Tutup', 'Đóng', 'إغلاق', 'Fermer', 'ปิด', "Fechar"),
  tap: L('TAP', '탭', 'タップ', '点击', 'TOCA', 'KETUK', 'CHẠM', 'انقر', 'TOUCHE', 'แตะ', "TOQUE"),
  keys: L('Tap the button, the gauge or Space', '버튼, 게이지 또는 스페이스바를 눌러요', 'ボタンかゲージかスペースキーを押してね', '点按钮、量表或按空格键', 'Toca el botón, el indicador o Espacio', 'Ketuk tombol, meteran, atau Spasi', 'Chạm nút, thanh đo hoặc phím Space', 'انقر الزر أو المؤشر أو مفتاح المسافة', 'Touche le bouton, la jauge ou Espace', 'แตะปุ่ม เกจ หรือ Space', "Toque no botão, no medidor ou em Espaço"),
  made: L('Made it! +{n}', '골인! +{n}', '入った！+{n}', '进了！+{n}', '¡Canasta! +{n}', 'Masuk! +{n}', 'Vào rồi! +{n}', 'سجّلت! +{n}', 'Marqué ! +{n}', 'ลง! +{n}', "Cesta! +{n}"),
  missed: L('Missed!', '아깝다!', '外れた！', '没进！', '¡Fallaste!', 'Meleset!', 'Trượt rồi!', 'أخطأت!', 'Raté !', 'พลาด!', "Errou!"),
  style: L('+1 style', '스타일 +1', 'スタイル+1', '风格+1', '+1 estilo', '+1 gaya', '+1 phong cách', '+1 أسلوب', '+1 style', 'สไตล์ +1', "+1 de estilo"),
  level: L('Level {n}', '{n}단계', 'レベル{n}', '{n}级', 'Nivel {n}', 'Level {n}', 'Cấp {n}', 'المستوى {n}', 'Niveau {n}', 'ระดับ {n}', "Nível {n}"),
  done: L('Round over: {n} points, {m} of 5 in', '경기 끝: {n}점, 5개 중 {m}개 성공', '終了：{n}点、5本中{m}本成功', '结束：{n}分，5投{m}中', 'Fin de la ronda: {n} puntos, {m} de 5 dentro', 'Ronde selesai: {n} poin, {m} dari 5 masuk', 'Hết ván: {n} điểm, vào {m}/5', 'انتهت الجولة: {n} نقاط، {m} من 5 ناجحة', 'Manche terminée : {n} points, {m} sur 5 marqués', 'จบรอบ: {n} คะแนน ลง {m} จาก 5', "Fim da rodada: {n} pontos, {m} de 5 convertidos"),
  watching: L('Watch your move…', '동작을 보세요…', '技を見てね…', '看你的动作……', 'Mira tu jugada…', 'Lihat gerakanmu…', 'Xem động tác của bạn…', 'شاهد حركتك…', 'Regarde ton geste…', 'ดูท่าของคุณ…', "Veja seu movimento…"),

  // The four shots and what decides the level
  'shot.free': L('Free throw', '자유투', 'フリースロー', '罚球', 'Tiro libre', 'Lemparan bebas', 'Ném phạt', 'رمية حرة', 'Lancer franc', 'ลูกโทษ', "Lance livre"),
  'shot.dunk': L('Dunk', '덩크슛', 'ダンク', '扣篮', 'Mate', 'Dunk', 'Úp rổ', 'تغميس', 'Dunk', 'ดังก์', "Enterrada"),
  'shot.fade': L('Fadeaway', '페이드어웨이', 'フェイダウェイ', '后仰跳投', 'Fadeaway', 'Fadeaway', 'Ném ngả người', 'رمية متراجعة', 'Fadeaway', 'เฟดอะเวย์', "Fadeaway"),
  'shot.layup': L('Layup', '레이업', 'レイアップ', '上篮', 'Bandeja', 'Layup', 'Lên rổ', 'رمية سلمية', 'Double pas', 'เลย์อัป', "Bandeja"),
  'mode.needle': L('Stop the needle in the green middle.', '움직이는 바늘을 가운데 초록 칸에서 멈춰요.', '動く針を真ん中の緑で止めてね。', '让指针停在中间的绿色区域。', 'Para la aguja en el centro verde.', 'Hentikan jarum di tengah yang hijau.', 'Dừng kim ở vùng xanh giữa.', 'أوقف المؤشر في الوسط الأخضر.', 'Arrête l\'aiguille au milieu vert.', 'หยุดเข็มตรงกลางสีเขียว', "Pare o ponteiro no meio verde."),
  'mode.mash': L('Tap as fast as you can to jump high!', '최대한 빠르게 연타해서 높이 뛰어요!', 'できるだけ速く連打して高く跳ぼう！', '尽快连点，跳得更高！', '¡Toca lo más rápido que puedas para saltar alto!', 'Ketuk secepat mungkin untuk lompat tinggi!', 'Chạm thật nhanh để bật cao!', 'انقر بأسرع ما يمكن لتقفز عاليًا!', 'Touche aussi vite que possible pour sauter haut !', 'แตะให้เร็วที่สุดเพื่อกระโดดสูง!', "Toque o mais rápido que puder para pular alto!"),
  'mode.double': L('Two taps: the top of your jump, then the release. Both in the green!', '두 번 눌러요: 점프 꼭대기에서 한 번, 손에서 놓을 때 한 번. 둘 다 초록 칸에서!', '2回押す：ジャンプの頂点で1回、手を離すときに1回。どちらも緑で！', '点两次：跳到最高点一次，出手时一次。都要在绿色区域！', 'Dos toques: en lo alto del salto y al soltar. ¡Los dos en verde!', 'Dua ketukan: di puncak lompatan, lalu saat melepas. Keduanya di hijau!', 'Chạm hai lần: lúc lên cao nhất và lúc ném. Cả hai ở vùng xanh!', 'نقرتان: في قمة القفزة ثم عند الإطلاق. كلتاهما في الأخضر!', 'Deux touches : le haut de ton saut, puis le lâcher. Les deux dans le vert !', 'แตะสองครั้ง: จุดสูงสุดของการกระโดด แล้วตอนปล่อยลูก ทั้งสองต้องอยู่ในโซนเขียว!', "Dois toques: o alto do pulo e depois o arremesso. Os dois no verde!"),
  'mode.rhythm': L('Step, step, shoot: tap as each ring closes.', '스텝, 스텝, 슛: 원이 줄어들어 맞을 때마다 눌러요.', 'ステップ、ステップ、シュート：輪が閉じるたびに押してね。', '一步、两步、投篮：圆圈收拢时点击。', 'Paso, paso, tiro: toca cuando se cierre cada anillo.', 'Langkah, langkah, tembak: ketuk saat tiap lingkaran menutup.', 'Bước, bước, ném: chạm khi mỗi vòng khép lại.', 'خطوة، خطوة، رمية: انقر عندما تنغلق كل دائرة.', 'Pas, pas, tir : touche quand chaque cercle se referme.', 'ก้าว ก้าว ยิง: แตะตอนที่วงแต่ละวงหดลง', "Passo, passo, arremesso: toque quando cada anel fechar."),
  'phase.jump': L('Top of the jump!', '점프 꼭대기!', 'ジャンプの頂点！', '跳到最高点！', '¡Arriba del salto!', 'Puncak lompatan!', 'Lên cao nhất!', 'قمة القفزة!', 'Haut du saut !', 'จุดสูงสุด!', "Alto do pulo!"),
  'phase.release': L('Release!', '슛!', 'リリース！', '出手！', '¡Suelta!', 'Lepas!', 'Ném!', 'أطلق!', 'Lâcher !', 'ปล่อย!', "Solta!"),
  'beat.0': L('Step', '스텝', 'ステップ', '一步', 'Paso', 'Langkah', 'Bước', 'خطوة', 'Pas', 'ก้าว', "Passo"),
  'beat.1': L('Step', '스텝', 'ステップ', '两步', 'Paso', 'Langkah', 'Bước', 'خطوة', 'Pas', 'ก้าว', "Passo"),
  'beat.2': L('Shoot', '슛', 'シュート', '投', 'Tiro', 'Tembak', 'Ném', 'ارمِ', 'Tirer', 'ยิง', "Arremesso"),
  great: L('Great!', '최고!', '最高！', '完美！', '¡Genial!', 'Hebat!', 'Tuyệt!', 'رائع!', 'Super !', 'ยอดเยี่ยม!', "Ótimo!"),
  good: L('Good', '좋아요', 'いいね', '不错', 'Bien', 'Bagus', 'Tốt', 'جيد', 'Bien', 'ดี', "Bom"),
  off: L('Off', '빗나감', 'ずれた', '偏了', 'Fuera', 'Meleset', 'Lệch', 'خارج', 'Raté', 'พลาด', "Fora"),

  // The twelve moves (shot.tier)
  'free.miss': L('Off the rim', '림 맞고 실패', 'リングに弾かれた', '打框而出', 'Rebota en el aro', 'Kena ring, gagal', 'Chạm vành, trượt', 'ارتدت من الحلقة', 'Sur l\'arceau', 'ชนห่วง', "Bateu no aro"),
  'free.make': L('Rolls in', '림 돌고 성공', 'リングを回って成功', '转框而进', 'Entra rodando', 'Berputar lalu masuk', 'Lăn vành rồi vào', 'تدور وتدخل', 'Ça roule dedans', 'กลิ้งลง', "Rolou para dentro"),
  'free.swish': L('Clean swish', '클린 (그물만)', 'クリーン（スウィッシュ）', '空心入网', 'Limpia, solo red', 'Bersih, hanya jaring', 'Vào sạch lưới', 'نظيفة، الشبكة فقط', 'Swish parfait', 'ลงแบบไม่แตะห่วง', "Cesta limpa"),
  'dunk.twohand': L('Two-hand dunk', '두손 덩크', '両手ダンク', '双手扣篮', 'Mate a dos manos', 'Dunk dua tangan', 'Úp rổ hai tay', 'تغميس باليدين', 'Dunk à deux mains', 'ดังก์สองมือ', "Enterrada com as duas mãos"),
  'dunk.onehand': L('One-hand dunk', '원핸드 덩크', '片手ダンク', '单手扣篮', 'Mate a una mano', 'Dunk satu tangan', 'Úp rổ một tay', 'تغميس بيد واحدة', 'Dunk à une main', 'ดังก์มือเดียว', "Enterrada com uma mão"),
  'dunk.back': L('Clean back dunk', '클린 백덩크', 'クリーン・バックダンク', '漂亮的背扣', 'Mate de espaldas limpio', 'Dunk membelakangi yang bersih', 'Úp rổ quay lưng sạch đẹp', 'تغميس خلفي نظيف', 'Dunk dos au panier parfait', 'แบ็กดังก์สวยๆ', "Enterrada de costas perfeita"),
  'fade.airball': L('Airball', '에어볼 실패', 'エアボール', '三不沾', 'Air ball', 'Air ball', 'Ném hụt (air ball)', 'كرة هوائية', 'Air ball', 'แอร์บอล', "Air ball"),
  'fade.bank': L('Bank shot', '백보드 맞고 성공', 'バンクショット', '打板进球', 'Tiro a tabla', 'Pantul papan, masuk', 'Đập bảng rồi vào', 'رمية ترتد من اللوحة', 'Tir avec la planche', 'ยิงกระดาน', "Tabela"),
  'fade.clean': L('Clean fadeaway', '클린 페이드어웨이', 'クリーン・フェイダウェイ', '漂亮的后仰跳投', 'Fadeaway limpio', 'Fadeaway bersih', 'Ngả người sạch lưới', 'رمية متراجعة نظيفة', 'Fadeaway parfait', 'เฟดอะเวย์สวยๆ', "Fadeaway perfeito"),
  'layup.basic': L('Basic layup', '기본 레이업', '基本のレイアップ', '基本上篮', 'Bandeja básica', 'Layup dasar', 'Lên rổ cơ bản', 'رمية سلمية أساسية', 'Double pas simple', 'เลย์อัปพื้นฐาน', "Bandeja simples"),
  'layup.finger': L('Finger roll', '핑거롤', 'フィンガーロール', '挑篮', 'Finger roll', 'Finger roll', 'Lên rổ móc nhẹ', 'رمية بأطراف الأصابع', 'Finger roll', 'ฟิงเกอร์โรล', "Finger roll"),
  'layup.euro': L('Euro step layup', '유로스텝 레이업', 'ユーロステップ・レイアップ', '欧洲步上篮', 'Bandeja con euro step', 'Layup euro step', 'Lên rổ euro step', 'رمية سلمية بخطوة أوروبية', 'Double pas eurostep', 'เลย์อัปยูโรสเต็ป', "Bandeja com euro step"),
};

export const BL = (k, vars) => {
  let s = localName(BT[k], getLanguage()) ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll('{' + a + '}', b);
  return s;
};
