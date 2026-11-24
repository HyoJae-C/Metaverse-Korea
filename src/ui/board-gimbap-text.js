// Gimbap Master's own words (ui/board-gimbap-ui.js); the shared ones are in board-games-text.js.
const R = (en, ko, ja, zh, es, id, vi, hi, fr, th, ar) => ({ en, ko, ja, zh, es, id, vi, hi, fr, th, ar });
// The seaweed, the rice and the twelve fillings (core/board-games.js GIMBAP_BASE, GIMBAP_FILLINGS).
export const GB_NAME = {
  kim: R('Seaweed', '김', 'のり', '紫菜', 'Alga', 'Rumput laut', 'Rong biển', 'समुद्री शैवाल', 'Algue', 'สาหร่าย', 'أعشاب بحرية'),
  rice: R('Rice', '밥', 'ごはん', '米饭', 'Arroz', 'Nasi', 'Cơm', 'चावल', 'Riz', 'ข้าว', 'أرز'),
  danmuji: R('Pickled radish', '단무지', 'たくあん', '腌萝卜', 'Rábano encurtido', 'Acar lobak', 'Củ cải muối', 'मूली का अचार', 'Radis mariné', 'หัวไชเท้าดอง', 'فجل مخلل'),
  spinach: R('Spinach', '시금치', 'ほうれん草', '菠菜', 'Espinaca', 'Bayam', 'Rau bina', 'पालक', 'Épinards', 'ผักโขม', 'سبانخ'),
  carrot: R('Carrot', '당근', 'にんじん', '胡萝卜', 'Zanahoria', 'Wortel', 'Cà rốt', 'गाजर', 'Carotte', 'แครอท', 'جزر'),
  egg: R('Egg', '계란', 'たまご', '鸡蛋', 'Huevo', 'Telur', 'Trứng', 'अंडा', 'Œuf', 'ไข่', 'بيض'),
  ham: R('Ham', '햄', 'ハム', '火腿', 'Jamón', 'Ham', 'Giăm bông', 'हैम', 'Jambon', 'แฮม', 'هام'),
  burdock: R('Burdock', '우엉', 'ごぼう', '牛蒡', 'Bardana', 'Gobo', 'Ngưu bàng', 'बर्डॉक', 'Bardane', 'โกโบ', 'أرقطيون'),
  tuna: R('Tuna', '참치', 'ツナ', '金枪鱼', 'Atún', 'Tuna', 'Cá ngừ', 'टूना', 'Thon', 'ทูน่า', 'تونة'),
  cheese: R('Cheese', '치즈', 'チーズ', '奶酪', 'Queso', 'Keju', 'Phô mai', 'चीज़', 'Fromage', 'ชีส', 'جبن'),
  cucumber: R('Cucumber', '오이', 'きゅうり', '黄瓜', 'Pepino', 'Timun', 'Dưa chuột', 'खीरा', 'Concombre', 'แตงกวา', 'خيار'),
  crab: R('Crab stick', '맛살', 'カニカマ', '蟹棒', 'Palito de cangrejo', 'Stik kepiting', 'Thanh cua', 'क्रैब स्टिक', 'Surimi', 'ปูอัด', 'أصابع السلطعون'),
  fishcake: R('Fish cake', '어묵', 'さつま揚げ', '鱼糕', 'Pastel de pescado', 'Odeng', 'Chả cá', 'फिश केक', 'Pâte de poisson', 'โอเด้ง', 'كعكة السمك'),
  perilla: R('Perilla leaf', '깻잎', 'えごまの葉', '苏子叶', 'Hoja de perilla', 'Daun perilla', 'Lá tía tô', 'पेरिला पत्ता', 'Feuille de périlla', 'ใบงา', 'ورق البريلا'),
};
export const GB = {
  rollHow: R('Roll the two dice: their sum is how many fillings go in.', '주사위 두 개를 굴려요. 합만큼 재료가 들어가요.', 'サイコロを2つ振ります。合計が具の数です。', '掷两颗骰子：点数和就是配料的数量。', 'Tira los dos dados: su suma es el número de ingredientes.', 'Lempar dua dadu: jumlahnya adalah banyaknya isian.', 'Gieo hai xúc xắc: tổng là số nhân.', 'दो पासे फेंकिए: उनका जोड़ ही भरावन की गिनती है।', 'Lance les deux dés : leur somme donne le nombre de garnitures.', 'ทอยลูกเต๋าสองลูก ผลรวมคือจำนวนไส้', 'ارمِ النردين: مجموعهما هو عدد الحشوات.'),
  count: R('{n} fillings · counts {w}', '재료 {n}개 · {w}줄짜리', '具{n}つ · {w}本分', '{n}种配料 · 算{w}卷', '{n} ingredientes · vale {w}', '{n} isian · bernilai {w}', '{n} nhân · tính {w}', '{n} भरावन · {w} गिना जाएगा', '{n} garnitures · compte {w}', 'ไส้ {n} อย่าง · นับ {w}', '{n} حشوات · تُحسب {w}'),
  go: R('Seaweed, rice, then the fillings in order!', '김, 밥, 그다음 순서대로 눌러요!', 'のり、ごはん、それから順番に！', '紫菜、米饭，然后按顺序按！', '¡Alga, arroz y luego los ingredientes en orden!', 'Rumput laut, nasi, lalu isian sesuai urutan!', 'Rong biển, cơm, rồi các nhân theo thứ tự!', 'समुद्री शैवाल, चावल, फिर क्रम से भरावन!', 'Algue, riz, puis les garnitures dans l\'ordre !', 'สาหร่าย ข้าว แล้วกดไส้ตามลำดับ!', 'أعشاب بحرية، أرز، ثم الحشوات بالترتيب!'),
  oops: R('Wrong one! From the seaweed again.', '틀렸어요! 김부터 다시.', 'ちがう！のりからもう一度。', '按错了！从紫菜重新开始。', '¡Esa no! Otra vez desde el alga.', 'Salah! Ulangi dari rumput laut.', 'Sai rồi! Làm lại từ rong biển.', 'गलत! समुद्री शैवाल से फिर शुरू।', 'Raté ! On reprend à l\'algue.', 'ผิด! เริ่มใหม่จากสาหร่าย', 'خطأ! من الأعشاب البحرية مجددًا.'),
  mine: R('✓ {t} s. Waiting for the others…', '✓ {t}초! 다른 사람을 기다려요…', '✓ {t}秒！ほかの人を待っています…', '✓ {t}秒！等待其他人…', '✓ {t} s. Esperando a los demás…', '✓ {t} dtk. Menunggu yang lain…', '✓ {t} giây. Đang chờ người khác…', '✓ {t} सेकंड। बाकियों का इंतज़ार…', '✓ {t} s. On attend les autres…', '✓ {t} วิ รอคนอื่น…', '✓ {t} ث. بانتظار الآخرين…'),
  took: R('{name} rolled it in {t} s: +{w}', '{name}님이 {t}초 만에 말았어요: +{w}줄', '{name}さんが{t}秒で巻きました：+{w}本', '{name}用{t}秒卷好了：+{w}卷', '{name} lo enrolló en {t} s: +{w}', '{name} menggulungnya dalam {t} dtk: +{w}', '{name} cuộn xong trong {t} giây: +{w}', '{name} ने {t} सेकंड में रोल किया: +{w}', '{name} l\'a roulé en {t} s : +{w}', '{name} ม้วนเสร็จใน {t} วิ: +{w}', '{name} لفّها في {t} ث: +{w}'),
  nobody: R('Nobody made this one.', '아무도 못 말았어요.', 'だれも巻けませんでした。', '没有人卷好。', 'Nadie lo consiguió.', 'Tak ada yang berhasil.', 'Không ai cuộn xong.', 'कोई नहीं बना पाया।', 'Personne n\'y est arrivé.', 'ไม่มีใครม้วนได้', 'لم ينجح أحد.'),
  making: R('Everyone is rolling gimbap!', '모두 김밥을 마는 중!', 'みんなでキンパを巻いています！', '大家都在卷紫菜包饭！', '¡Todos enrollando gimbap!', 'Semua sedang menggulung gimbap!', 'Mọi người đang cuộn gimbap!', 'सब गिम्बाप रोल कर रहे हैं!', 'Tout le monde roule son gimbap !', 'ทุกคนกำลังม้วนคิมบับ!', 'الجميع يلفّ الكيمباب!'),
  big: R('👑 Giant gimbap!', '👑 왕김밥!', '👑 特大キンパ！', '👑 巨无霸紫菜包饭！', '👑 ¡Gimbap gigante!', '👑 Gimbap raksasa!', '👑 Gimbap khổng lồ!', '👑 विशाल गिम्बाप!', '👑 Gimbap géant !', '👑 คิมบับยักษ์!', '👑 كيمباب عملاق!'),
  mini: R('🤏 Mini gimbap!', '🤏 꼬마김밥!', '🤏 ミニキンパ！', '🤏 迷你紫菜包饭！', '🤏 ¡Mini gimbap!', '🤏 Gimbap mini!', '🤏 Gimbap mini!', '🤏 मिनी गिम्बाप!', '🤏 Mini gimbap !', '🤏 คิมบับจิ๋ว!', '🤏 كيمباب صغير!'),
};
