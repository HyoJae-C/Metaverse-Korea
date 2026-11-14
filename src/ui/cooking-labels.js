// The few cooking-class words the street needs before you start a class (the
// action button, the teacher's name tag, the hint). The classes' own long texts
// (kimchi-text.js, japchae-text.js, kimbap-text.js) load only when a class opens.

export const KIMCHI_LABELS = {
  item: { en: 'Homemade kimchi', ko: '직접 담근 김치', ja: '手作りキムチ', zh: '自制泡菜', es: 'Kimchi casero', id: 'Kimchi buatan sendiri', vi: 'Kim chi tự làm', hi: 'घर की बनी किमची', fr: 'Kimchi maison', th: 'กิมจิทำเอง', ar: 'كيمتشي منزلي' }, // (also the market stall's jar label)
  open: { en: 'Make kimchi', ko: '김치 담그기', ja: 'キムチを漬ける', zh: '腌泡菜', es: 'Hacer kimchi', id: 'Membuat kimchi', vi: 'Làm kim chi', hi: 'किमची बनाएँ', fr: 'Faire du kimchi', th: 'ทำกิมจิ', ar: 'اصنع الكيمتشي' },
  teacher: { en: 'Kimchi teacher', ko: '김치 선생님', ja: 'キムチ先生', zh: '泡菜老师', es: 'Maestra de kimchi', id: 'Guru kimchi', vi: 'Cô giáo kim chi', hi: 'किमची टीचर', fr: 'Professeure de kimchi', th: 'ครูสอนทำกิมจิ', ar: 'معلّمة الكيمتشي' },
  hint: { en: 'Stand at the long work table to join the class.', ko: '긴 작업대 앞에 서면 수업을 시작해요.', ja: '長い作業台の前に立つと教室が始まります。', zh: '站到长工作台前就可以上课。', es: 'Ponte junto a la mesa larga para unirte a la clase.', id: 'Berdirilah di meja kerja panjang untuk ikut kelas.', vi: 'Đứng cạnh bàn làm việc dài để vào lớp.', hi: 'क्लास में शामिल होने के लिए लंबी वर्क टेबल के पास खड़े हों।', fr: 'Mets-toi devant la longue table de travail pour rejoindre le cours.', th: 'ยืนที่โต๊ะทำงานยาวเพื่อเข้าคลาส', ar: 'قف عند طاولة العمل الطويلة لتنضم إلى الدرس.' },
};

export const JAPCHAE_LABELS = {
  item: { en: 'Homemade japchae', ko: '직접 만든 잡채', ja: '手作りチャプチェ', zh: '自制杂菜', es: 'Japchae casero', id: 'Japchae buatan sendiri', vi: 'Japchae tự làm', hi: 'घर का बना जापचे', fr: 'Japchae maison', th: 'จับแชทำเอง', ar: 'جابتشي منزلي' },
  open: { en: 'Make japchae', ko: '잡채 만들기', ja: 'チャプチェを作る', zh: '做杂菜', es: 'Hacer japchae', id: 'Membuat japchae', vi: 'Làm japchae', hi: 'जापचे बनाएँ', fr: 'Faire du japchae', th: 'ทำจับแช', ar: 'اصنع الجابتشي' },
  teacher: { en: 'Cooking teacher', ko: '요리 선생님', ja: '料理の先生', zh: '烹饪老师', es: 'Maestro de cocina', id: 'Guru masak', vi: 'Thầy dạy nấu ăn', hi: 'कुकिंग टीचर', fr: 'Professeur de cuisine', th: 'ครูสอนทำอาหาร', ar: 'معلّم الطبخ' },
  hint: { en: 'Stand at a stove at the long table to join the japchae class.', ko: '긴 조리대의 화구 앞에 서면 잡채 수업을 시작해요.', ja: '長い調理台のコンロの前に立つとチャプチェ教室が始まります。', zh: '站到长桌的炉子前就可以上杂菜课。', es: 'Ponte frente a un fogón de la mesa larga para unirte a la clase de japchae.', id: 'Berdiri di depan kompor di meja panjang untuk ikut kelas japchae.', vi: 'Đứng trước bếp ở bàn dài để vào lớp japchae.', hi: 'जापचे क्लास में शामिल होने के लिए लंबी टेबल के चूल्हे के सामने खड़े हों।', fr: 'Mets-toi devant un réchaud de la longue table pour suivre le cours de japchae.', th: 'ยืนที่เตาของโต๊ะยาวเพื่อเข้าคลาสจับแช', ar: 'قف أمام موقد على الطاولة الطويلة لتنضم إلى صف الجابتشي.' },
};

export const KIMBAP_LABELS = {
  item: { en: 'Homemade kimbap', ko: '직접 만든 김밥', ja: '手作りキンパ', zh: '自制紫菜包饭', es: 'Kimbap casero', id: 'Kimbap buatan sendiri', vi: 'Kimbap tự làm', hi: 'घर का बना किम्बाप', fr: 'Kimbap maison', th: 'คิมบับทำเอง', ar: 'كيمباب منزلي' },
  open: { en: 'Make kimbap', ko: '김밥 만들기', ja: 'キンパを作る', zh: '做紫菜包饭', es: 'Hacer kimbap', id: 'Membuat kimbap', vi: 'Làm kimbap', hi: 'किम्बाप बनाएँ', fr: 'Faire du kimbap', th: 'ทำคิมบับ', ar: 'اصنع الكيمباب' },
  hint: { en: 'Stand at a bamboo mat at the long table to join the kimbap class.', ko: '긴 조리대의 김발 앞에 서면 김밥 수업을 시작해요.', ja: '長い調理台の巻きすの前に立つとキンパ教室が始まります。', zh: '站到长桌的竹帘前就可以上紫菜包饭课。', es: 'Ponte frente a una esterilla de la mesa larga para unirte a la clase de kimbap.', id: 'Berdiri di depan tikar bambu di meja panjang untuk ikut kelas kimbap.', vi: 'Đứng trước mành tre ở bàn dài để vào lớp kimbap.', hi: 'किम्बाप क्लास में शामिल होने के लिए लंबी टेबल की बाँस की चटाई के सामने खड़े हों।', fr: 'Mets-toi devant une natte en bambou de la longue table pour suivre le cours de kimbap.', th: 'ยืนที่เสื่อไม้ไผ่ของโต๊ะยาวเพื่อเข้าคลาสคิมบับ', ar: 'قف أمام حصيرة خيزران على الطاولة الطويلة لتنضم إلى صف الكيمباب.' },
};

export const TTEOK_LABELS = {
  item: { en: 'Homemade songpyeon', ko: '직접 빚은 송편', ja: '手作りソンピョン', zh: '自制松饼', es: 'Songpyeon caseros', id: 'Songpyeon buatan sendiri', vi: 'Songpyeon tự làm', hi: 'घर के बने सोंगप्योन', fr: 'Songpyeon maison', th: 'ซงพยอนทำเอง', ar: 'سونغبيون منزلي' },
  open: { en: 'Make songpyeon', ko: '송편 빚기', ja: 'ソンピョンを作る', zh: '包松饼', es: 'Hacer songpyeon', id: 'Membuat songpyeon', vi: 'Nặn songpyeon', hi: 'सोंगप्योन बनाएँ', fr: 'Faire des songpyeon', th: 'ปั้นซงพยอน', ar: 'اصنع السونغبيون' },
  hint: { en: 'Stand at a wooden board at the long table to join the tteok class.', ko: '긴 상의 나무 도마 앞에 서면 떡 수업을 시작해요.', ja: '長いテーブルの木の板の前に立つとお餅教室が始まります。', zh: '站到长桌的木案板前就可以上米糕课。', es: 'Ponte frente a una tabla de madera de la mesa larga para unirte a la clase de tteok.', id: 'Berdiri di depan papan kayu di meja panjang untuk ikut kelas tteok.', vi: 'Đứng trước tấm thớt gỗ ở bàn dài để vào lớp làm bánh tteok.', hi: 'टोक क्लास में शामिल होने के लिए लंबी टेबल के लकड़ी के बोर्ड के सामने खड़े हों।', fr: 'Mets-toi devant une planche en bois de la longue table pour suivre l\'atelier de tteok.', th: 'ยืนที่เขียงไม้ของโต๊ะยาวเพื่อเข้าคลาสทำต็อก', ar: 'قف أمام لوح خشبي على الطاولة الطويلة لتنضم إلى صف التوك.' },
};

export const BIBIMBAP_LABELS = {
  item: { en: 'Homemade bibimbap', ko: '직접 만든 비빔밥', ja: '手作りビビンバ', zh: '自制拌饭', es: 'Bibimbap casero', id: 'Bibimbap buatan sendiri', vi: 'Bibimbap tự làm', hi: 'घर का बना बिबिम्बाप', fr: 'Bibimbap maison', th: 'บิบิมบับทำเอง', ar: 'بيبيمباب منزلي' },
  open: { en: 'Make bibimbap', ko: '비빔밥 만들기', ja: 'ビビンバを作る', zh: '做拌饭', es: 'Hacer bibimbap', id: 'Membuat bibimbap', vi: 'Làm bibimbap', hi: 'बिबिम्बाप बनाएँ', fr: 'Faire du bibimbap', th: 'ทำบิบิมบับ', ar: 'اصنع البيبيمباب' },
  hint: { en: 'Stand at a bowl at the long table to join the bibimbap class.', ko: '긴 조리대의 그릇 앞에 서면 비빔밥 수업을 시작해요.', ja: '長い調理台の器の前に立つとビビンバ教室が始まります。', zh: '站到长桌的碗前就可以上拌饭课。', es: 'Ponte frente a un bol de la mesa larga para unirte a la clase de bibimbap.', id: 'Berdiri di depan mangkuk di meja panjang untuk ikut kelas bibimbap.', vi: 'Đứng trước một bát ở bàn dài để vào lớp bibimbap.', hi: 'बिबिम्बाप क्लास में शामिल होने के लिए लंबी टेबल के कटोरे के सामने खड़े हों।', fr: 'Mets-toi devant un bol de la longue table pour suivre l\'atelier de bibimbap.', th: 'ยืนที่ชามของโต๊ะยาวเพื่อเข้าคลาสบิบิมบับ', ar: 'قف أمام وعاء على الطاولة الطويلة لتنضم إلى صف البيبيمباب.' },
};
