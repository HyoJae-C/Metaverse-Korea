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
  hint: { en: 'Stand at a stove on the far side of the table for japchae, or at a bamboo mat on the near side for kimbap.', ko: '조리대 안쪽 화구 앞에 서면 잡채, 바깥쪽 김발 앞에 서면 김밥 수업이에요.', ja: '調理台の奥のコンロの前ならチャプチェ、手前の巻きすの前ならキンパの教室です。', zh: '站在长桌里侧的炉子前学杂菜，站在外侧的竹帘前学紫菜包饭。', es: 'Ponte frente a un fogón del lado de dentro para el japchae, o frente a una esterilla del lado de fuera para el kimbap.', id: 'Berdiri di depan kompor di sisi dalam meja untuk japchae, atau di depan tikar bambu di sisi luar untuk kimbap.', vi: 'Đứng trước bếp ở phía trong bàn để làm japchae, hoặc trước mành tre ở phía ngoài để làm kimbap.', hi: 'जापचे के लिए टेबल के अंदर वाले चूल्हे के सामने, किम्बाप के लिए बाहर वाली बाँस की चटाई के सामने खड़े हों।', fr: 'Mets-toi devant un réchaud au fond de la table pour le japchae, ou devant une natte en bambou du côté proche pour le kimbap.', th: 'ยืนที่เตาฝั่งไกลของโต๊ะเพื่อทำจับแช หรือที่เสื่อไม้ไผ่ฝั่งใกล้เพื่อทำคิมบับ', ar: 'قف أمام موقد في الجهة الداخلية من الطاولة للجابتشي، أو أمام حصيرة خيزران في الجهة الخارجية للكيمباب.' },
};

export const KIMBAP_LABELS = {
  item: { en: 'Homemade kimbap', ko: '직접 만든 김밥', ja: '手作りキンパ', zh: '自制紫菜包饭', es: 'Kimbap casero', id: 'Kimbap buatan sendiri', vi: 'Kimbap tự làm', hi: 'घर का बना किम्बाप', fr: 'Kimbap maison', th: 'คิมบับทำเอง', ar: 'كيمباب منزلي' },
  open: { en: 'Make kimbap', ko: '김밥 만들기', ja: 'キンパを作る', zh: '做紫菜包饭', es: 'Hacer kimbap', id: 'Membuat kimbap', vi: 'Làm kimbap', hi: 'किम्बाप बनाएँ', fr: 'Faire du kimbap', th: 'ทำคิมบับ', ar: 'اصنع الكيمباب' },
};
