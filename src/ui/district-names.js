// District names in every language: the map's labels, and the start
// screen's "Last time: …" line (which must not wait for the map code).
// Districts of a joined city (see core/districts.js), with names for the
// "more over here" badges at the map's edge.
export const DISTRICT_NAME = {
  seongsu: { en: 'Seongsu', ko: '성수', ja: '聖水', zh: '圣水', es: 'Seongsu', id: 'Seongsu', ar: 'سونغسو', vi: 'Seongsu', hi: 'सोंगसू', fr: 'Seongsu', th: 'ซองซู' },
  gyeongbokgung: { en: 'Gyeongbokgung', ko: '경복궁', ja: '景福宮', zh: '景福宫', es: 'Gyeongbokgung', id: 'Gyeongbokgung', ar: 'قصر غيونغبوكغونغ', vi: 'Gyeongbokgung', hi: 'ग्योंगबोकगुंग', fr: 'Gyeongbokgung', th: 'เคียงบกกุง' },
  jongmyo: { en: 'Jongmyo', ko: '종묘', ja: '宗廟', zh: '宗庙', es: 'Jongmyo', id: 'Jongmyo', ar: 'جونغميو', vi: 'Jongmyo', hi: 'जोंगम्यो', fr: 'Jongmyo', th: 'ชงมโย' },
  euljiro: { en: 'Euljiro', ko: '을지로', ja: '乙支路', zh: '乙支路', es: 'Euljiro', id: 'Euljiro', ar: 'أولجيرو', vi: 'Euljiro', hi: 'उलजीरो', fr: 'Euljiro', th: 'อึลจีโร' },
  myeongdong: { en: 'Myeongdong', ko: '명동', ja: '明洞', zh: '明洞', es: 'Myeongdong', id: 'Myeongdong', ar: 'ميونغدونغ', vi: 'Myeongdong', hi: 'म्योंगदोंग', fr: 'Myeongdong', th: 'มย็องดง' },
  itaewon: { en: 'Itaewon', ko: '이태원', ja: '梨泰院', zh: '梨泰院', es: 'Itaewon', id: 'Itaewon', ar: 'إيتايوون', vi: 'Itaewon', hi: 'इतेवॉन', fr: 'Itaewon', th: 'อิแทวอน' },
  songpa: { en: 'Songpa', ko: '송파', ja: '松坡', zh: '松坡', es: 'Songpa', id: 'Songpa', ar: 'سونغبا', vi: 'Songpa', hi: 'सोंगपा', fr: 'Songpa', th: 'ซงพา' },
  bukchon: { en: 'Bukchon', ko: '북촌', ja: '北村', zh: '北村', es: 'Bukchon', id: 'Bukchon', ar: 'بوكتشون', vi: 'Bukchon', hi: 'बुकचोन', fr: 'Bukchon', th: 'บุกชอน' },
  'olympic-park': { en: 'Olympic Park', ko: '올림픽공원', ja: 'オリンピック公園', zh: '奥林匹克公园', es: 'Parque Olímpico', id: 'Taman Olimpiade', ar: 'الحديقة الأولمبية', vi: 'Công viên Olympic', hi: 'ओलंपिक पार्क', fr: 'Parc olympique', th: 'สวนโอลิมปิก' },
  'grand-park': { en: "Grown-ups' Grand Park", ko: '어른도대공원', ja: '大人も大公園', zh: '大人也大公园', es: 'Gran Parque para Adultos También', id: 'Taman Raya Dewasa Juga', ar: 'حديقة الكبار أيضًا', vi: 'Công viên Cả Người lớn', hi: 'बड़ों का भी ग्रैंड पार्क', fr: 'Grand Parc des grands aussi', th: 'สวนผู้ใหญ่ก็เล่นได้' },
  seodaemun: { en: 'Seodaemun (Sinchon)', ko: '서대문 (신촌)', ja: '西大門（新村）', zh: '西大门（新村）', es: 'Seodaemun (Sinchon)', id: 'Seodaemun (Sinchon)', ar: 'سوديمون (سينتشون)', vi: 'Seodaemun (Sinchon)', hi: 'सोदेमुन (सिनचोन)', fr: 'Seodaemun (Sinchon)', th: 'ซอแดมุน (ชินชน)' },
  hongdae: { en: 'Hongdae', ko: '홍대', ja: '弘大', zh: '弘大', es: 'Hongdae', id: 'Hongdae', ar: 'هونغداي', vi: 'Hongdae', hi: 'होंगदे', fr: 'Hongdae', th: 'ฮงแด' },
  yeonnam: { en: 'Yeonnam-dong', ko: '연남동', ja: '延南洞', zh: '延南洞', es: 'Yeonnam-dong', id: 'Yeonnam-dong', ar: 'يونّام دونغ', vi: 'Yeonnam-dong', hi: 'योननाम-दोंग', fr: 'Yeonnam-dong', th: 'ยอนนัม-ดง' },
  samseong: { en: 'Samseong-dong', ko: '삼성동', ja: '三成洞', zh: '三成洞', es: 'Samseong-dong', id: 'Samseong-dong', ar: 'سامسونغ دونغ', vi: 'Samseong-dong', hi: 'सामसोंग-दोंग', fr: 'Samseong-dong', th: 'ซัมซอง-ดง' },
  yeouido: { en: 'Yeouido', ko: '여의도', ja: '汝矣島', zh: '汝矣岛', es: 'Yeouido', id: 'Yeouido', ar: 'يويدو', vi: 'Yeouido', hi: 'योइदो', fr: 'Yeouido', th: 'ยออีโด' },
  'banpo-jamwon': { en: 'Banpo-Jamwon', ko: '반포·잠원', ja: '盤浦・蚕院', zh: '盘浦·蚕院', es: 'Banpo-Jamwon', id: 'Banpo-Jamwon', ar: 'بانبو-جاموون', vi: 'Banpo-Jamwon', hi: 'बानपो-जामवॉन', fr: 'Banpo-Jamwon', th: 'บันโพ-จัมวอน' },
  mangwon: { en: 'Mangwon-dong', ko: '망원동', ja: '望遠洞', zh: '望远洞', es: 'Mangwon-dong', id: 'Mangwon-dong', ar: 'مانغوون دونغ', vi: 'Mangwon-dong', hi: 'मांगवॉन-दोंग', fr: 'Mangwon-dong', th: 'มังวอน-ดง' },
};
