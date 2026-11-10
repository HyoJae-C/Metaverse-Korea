// Clothes, shoes and accessories from the clothes and accessory shops
// (each shop product's `item` in stores.json). wear: what the item changes
// on your look; off: what taking it off changes back (null: it can only be
// swapped for another, like trousers).
import { WEAR_DESC } from './wear-desc.js';
import { SKIRTS, SKIRT_PRICE, skirtName } from './skirts.js';
import { ANIMAL_LOOKS } from './appearance.js';

const ANIMAL_NAMES = {
  'cat-black': { en: 'Black cat', ko: '검은 고양이', ja: '黒猫', zh: '黑猫' },
  'cat-ginger': { en: 'Ginger cat', ko: '치즈 고양이', ja: '茶トラ猫', zh: '橘猫' },
  dog: { en: 'Puppy', ko: '강아지', ja: '子犬', zh: '小狗' },
  'bunny-white': { en: 'White bunny', ko: '흰 토끼', ja: '白うさぎ', zh: '小白兔' },
  'bunny-pink': { en: 'Pink bunny', ko: '분홍 토끼', ja: 'ピンクうさぎ', zh: '粉兔子' },
  panda: { en: 'Panda', ko: '판다', ja: 'パンダ', zh: '熊猫' },
};

// Taken off the shops to keep at most two colours of one design (2026-11-10).
// Anyone who bought one keeps it: it still works and shows "Retired".
export const RETIRED = new Set([
  'outfit-jacket-cocoa', 'outfit-jacket-olive', 'outfit-hoodie-orange', 'outfit-shirt-olive', 'outfit-varsity-green', 'outfit-knit-navy',
  'skirt-pleats-mini-white', 'skirt-pleats-mini-black', 'skirt-solid-mini-black', 'skirt-solid-mini-camel', 'skirt-solid-long-butter', 'skirt-floral-long-butter',
  'acc-cap-sky', 'acc-cap-orange', 'acc-beanie-mustard',
  'acc-glasses-gold', 'acc-glasses-pink', 'acc-sunglasses-brown', 'acc-sunglasses-blue',
  'acc-scarf-cream', 'acc-tote-brick',
]);

// price: listed in ₩1,000s (70 = ₩70,000).
const item = (emoji, price, wear, off, desc, name, extra = {}) => ({ emoji, price: price * 1000, wear, off, desc, name, ...extra });
// Trousers also take a skirt off (look.skirt), so a pair can be put back on.
const pants = (id) => ({ pants: id, skirt: null });

export const WEARABLES = {
  // Clothes: the Daily Closet's clothes in other colours (data/characters).
  'outfit-jacket-black': item('🧥', 70, { model: 'jacket-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black denim jacket', ko: '블랙 청재킷', ja: 'ブラックデニムジャケット', zh: '黑色牛仔夹克' }, { outfit: 'jacket-black' }),
  'outfit-jacket-indigo': item('🧥', 70, { model: 'jacket-indigo' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Indigo denim jacket', ko: '인디고 청재킷', ja: 'インディゴデニムジャケット', zh: '靛蓝牛仔夹克' }, { outfit: 'jacket-indigo' }),
  'outfit-jacket-cocoa': item('🧥', 70, { model: 'jacket-cocoa' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Brown corduroy jacket', ko: '브라운 코듀로이 재킷', ja: 'ブラウンのコーデュロイジャケット', zh: '棕色灯芯绒夹克' }, { outfit: 'jacket-cocoa' }),
  'outfit-jacket-olive': item('🧥', 70, { model: 'jacket-olive' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Olive field jacket', ko: '올리브 필드 재킷', ja: 'オリーブのフィールドジャケット', zh: '橄榄色工装夹克' }, { outfit: 'jacket-olive' }),
  'outfit-hoodie-black': item('🖤', 60, { model: 'hoodie-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black hoodie', ko: '블랙 후드티', ja: '黒のパーカー', zh: '黑色连帽卫衣' }, { outfit: 'hoodie-black' }),
  'outfit-hoodie-wine': item('🍷', 60, { model: 'hoodie-wine' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Burgundy hoodie', ko: '버건디 후드티', ja: 'バーガンディのパーカー', zh: '酒红色连帽卫衣' }, { outfit: 'hoodie-wine' }),
  'outfit-hoodie-orange': item('🧡', 60, { model: 'hoodie-orange' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Orange hoodie', ko: '오렌지 후드티', ja: 'オレンジのパーカー', zh: '橙色连帽卫衣' }, { outfit: 'hoodie-orange' }),
  'outfit-shirt-white': item('👔', 50, { model: 'shirt-white' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'White shirt', ko: '화이트 셔츠', ja: '白シャツ', zh: '白衬衫' }, { outfit: 'shirt-white' }),
  'outfit-shirt-denim': item('👔', 50, { model: 'shirt-denim' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Denim shirt', ko: '데님 셔츠', ja: 'デニムシャツ', zh: '牛仔衬衫' }, { outfit: 'shirt-denim' }),
  'outfit-shirt-olive': item('👔', 50, { model: 'shirt-olive' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Olive shirt', ko: '올리브 셔츠', ja: 'オリーブのシャツ', zh: '橄榄色衬衫' }, { outfit: 'shirt-olive' }),
  'outfit-puffer-black': item('🧥', 110, { model: 'puffer-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black puffer jacket', ko: '블랙 숏패딩', ja: '黒のショートダウン', zh: '黑色短款羽绒服' }, { outfit: 'puffer-black' }),
  'outfit-puffer-mustard': item('🧥', 110, { model: 'puffer-mustard' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Mustard puffer jacket', ko: '머스타드 숏패딩', ja: 'マスタードのショートダウン', zh: '芥末黄短款羽绒服' }, { outfit: 'puffer-mustard' }),
  'outfit-padding-white': item('🤍', 140, { model: 'padding-white' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'White long padded coat', ko: '화이트 롱패딩', ja: '白のロングダウン', zh: '白色长款羽绒服' }, { outfit: 'padding-white' }),
  // Men's clothes (Dongdaemun Fashion Town: Gentle Floor, Gwajam Club).
  'outfit-suit-charcoal': item('🤵', 150, { model: 'suit-charcoal' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Charcoal suit jacket', ko: '차콜 수트 재킷', ja: 'チャコールのスーツジャケット', zh: '炭灰色西装外套' }, { outfit: 'suit-charcoal' }),
  'outfit-suit-navy': item('🤵', 150, { model: 'suit-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Navy suit jacket', ko: '네이비 수트 재킷', ja: 'ネイビーのスーツジャケット', zh: '藏青色西装外套' }, { outfit: 'suit-navy' }),
  'outfit-coat-camel': item('🧥', 180, { model: 'coat-camel' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Camel wool coat', ko: '카멜 울 코트', ja: 'キャメルのウールコート', zh: '驼色羊毛大衣' }, { outfit: 'coat-camel' }),
  'outfit-coat-charcoal': item('🧥', 180, { model: 'coat-charcoal' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Charcoal wool coat', ko: '차콜 울 코트', ja: 'チャコールのウールコート', zh: '炭灰色羊毛大衣' }, { outfit: 'coat-charcoal' }),
  'outfit-varsity-navy': item('🧥', 90, { model: 'varsity-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Navy varsity jacket', ko: '네이비 과잠', ja: 'ネイビーのスタジャン', zh: '藏青色棒球夹克' }, { outfit: 'varsity-navy' }),
  'outfit-varsity-black': item('🧥', 90, { model: 'varsity-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black varsity jacket', ko: '블랙 과잠', ja: 'ブラックのスタジャン', zh: '黑色棒球夹克' }, { outfit: 'varsity-black' }),
  'outfit-varsity-green': item('🧥', 90, { model: 'varsity-green' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Green varsity jacket', ko: '그린 과잠', ja: 'グリーンのスタジャン', zh: '绿色棒球夹克' }, { outfit: 'varsity-green' }),
  'outfit-knit-grey': item('🧶', 55, { model: 'knit-grey' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Grey crew-neck knit', ko: '그레이 라운드 니트', ja: 'グレーのクルーネックニット', zh: '灰色圆领毛衣' }, { outfit: 'knit-grey' }),
  'outfit-knit-navy': item('🧶', 55, { model: 'knit-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Navy crew-neck knit', ko: '네이비 라운드 니트', ja: 'ネイビーのクルーネックニット', zh: '藏青色圆领毛衣' }, { outfit: 'knit-navy' }),
  'outfit-knit-cream': item('🧶', 55, { model: 'knit-cream' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Cream crew-neck knit', ko: '크림 라운드 니트', ja: 'クリームのクルーネックニット', zh: '奶油色圆领毛衣' }, { outfit: 'knit-cream' }),
  // Unisex tops, one colour each (data/characters/kaykit2.js, TOPS).
  'outfit-sweat-oatmeal': item('👕', 50, { model: 'sweat-oatmeal' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Oatmeal sweatshirt', ko: '오트밀 맨투맨', ja: 'オートミールのスウェット', zh: '燕麦色卫衣' }, { outfit: 'sweat-oatmeal' }),
  'outfit-cardigan-brown': item('🧥', 55, { model: 'cardigan-brown' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Brown cardigan', ko: '브라운 가디건', ja: 'ブラウンのカーディガン', zh: '棕色开衫' }, { outfit: 'cardigan-brown' }),
  'outfit-vest-denim': item('🦺', 50, { model: 'vest-denim' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Denim vest', ko: '데님 조끼', ja: 'デニムベスト', zh: '牛仔背心' }, { outfit: 'vest-denim' }),
  'outfit-rugby-green': item('👕', 50, { model: 'rugby-green' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Green rugby shirt', ko: '그린 럭비 티', ja: 'グリーンのラガーシャツ', zh: '绿色橄榄球衫' }, { outfit: 'rugby-green' }),
  'outfit-polo-navy': item('👕', 45, { model: 'polo-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Navy polo shirt', ko: '네이비 카라 티', ja: 'ネイビーのポロシャツ', zh: '藏青色Polo衫' }, { outfit: 'polo-navy' }),
  'outfit-jersey-baseball': item('⚾', 60, { model: 'jersey-baseball' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Baseball jersey', ko: '야구 저지', ja: 'ベースボールシャツ', zh: '棒球衫' }, { outfit: 'jersey-baseball' }),
  'outfit-track-black': item('🧥', 60, { model: 'track-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black track jacket', ko: '블랙 트레이닝 집업', ja: '黒のトラックジャケット', zh: '黑色运动夹克' }, { outfit: 'track-black' }),
  'outfit-fleece-cream': item('🧥', 70, { model: 'fleece-cream' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Cream fleece jacket', ko: '크림 플리스', ja: 'クリームのフリース', zh: '奶油色摇粒绒外套' }, { outfit: 'fleece-cream' }),
  'outfit-breton-navy': item('👕', 40, { model: 'breton-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Striped long-sleeve tee', ko: '스트라이프 티', ja: 'ボーダーの長袖T', zh: '条纹长袖T恤' }, { outfit: 'breton-navy' }),
  'outfit-turtle-black': item('👕', 50, { model: 'turtle-black' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Black turtleneck', ko: '블랙 터틀넥', ja: '黒のタートルネック', zh: '黑色高领衫' }, { outfit: 'turtle-black' }),
  'outfit-windbreaker-navy': item('🧥', 75, { model: 'windbreaker-navy' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Navy windbreaker', ko: '네이비 바람막이', ja: 'ネイビーのウィンドブレーカー', zh: '藏青色防风夹克' }, { outfit: 'windbreaker-navy' }),
  'outfit-vest-padded': item('🦺', 80, { model: 'vest-padded' }, { model: 'basic' }, WEAR_DESC.clothes, { en: 'Khaki padded vest', ko: '카키 패딩 조끼', ja: 'カーキのダウンベスト', zh: '卡其色羽绒背心' }, { outfit: 'vest-padded' }),
  // Trousers (a colour of look.pants).
  'pants-indigo': item('👖', 40, pants('indigo'), null, WEAR_DESC.swap, { en: 'Indigo jeans', ko: '인디고 청바지', ja: 'インディゴジーンズ', zh: '靛蓝牛仔裤' }),
  'pants-lightwash': item('👖', 40, pants('lightwash'), null, WEAR_DESC.swap, { en: 'Light-wash jeans', ko: '연청바지', ja: 'ライトウォッシュジーンズ', zh: '浅色牛仔裤' }),
  'pants-black': item('👖', 40, pants('black'), null, WEAR_DESC.swap, { en: 'Black jeans', ko: '흑청바지', ja: 'ブラックジーンズ', zh: '黑色牛仔裤' }),
  'pants-sand': item('👖', 40, pants('sand'), null, WEAR_DESC.swap, { en: 'Beige wide pants', ko: '베이지 와이드 팬츠', ja: 'ベージュのワイドパンツ', zh: '米色阔腿裤' }),
  'pants-charcoal': item('👖', 40, pants('charcoal'), null, WEAR_DESC.swap, { en: 'Charcoal slacks', ko: '차콜 슬랙스', ja: 'チャコールのスラックス', zh: '炭灰色西裤' }),
  'pants-cream': item('👖', 40, pants('cream'), null, WEAR_DESC.swap, { en: 'Cream wide pants', ko: '크림 와이드 팬츠', ja: 'クリームのワイドパンツ', zh: '奶油色阔腿裤' }),
  'pants-olive': item('👖', 40, pants('olive'), null, WEAR_DESC.swap, { en: 'Olive cargo pants', ko: '올리브 카고 팬츠', ja: 'オリーブのカーゴパンツ', zh: '橄榄色工装裤' }),
  'pants-cocoa': item('👖', 40, pants('cocoa'), null, WEAR_DESC.swap, { en: 'Brown cotton pants', ko: '브라운 면바지', ja: 'ブラウンのチノパン', zh: '棕色棉裤' }),
  'pants-denim': item('👖', 40, pants('denim'), null, WEAR_DESC.swap, { en: 'Classic blue jeans', ko: '기본 청바지', ja: 'ブルージーンズ', zh: '经典蓝色牛仔裤' }),
  // Shoes (look.shoes; taking them off goes back to white sneakers).
  'shoes-white': item('👟', 45, { shoes: 'white' }, { shoes: null }, WEAR_DESC.shoes, { en: 'White sneakers', ko: '흰 운동화', ja: '白いスニーカー', zh: '白色运动鞋' }),
  'shoes-black': item('👟', 45, { shoes: 'black' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Black sneakers', ko: '검정 운동화', ja: '黒いスニーカー', zh: '黑色运动鞋' }),
  'shoes-pink': item('👟', 45, { shoes: 'pink' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Pink sneakers', ko: '핑크 운동화', ja: 'ピンクのスニーカー', zh: '粉色运动鞋' }),
  'shoes-sky': item('👟', 45, { shoes: 'sky' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Sky blue sneakers', ko: '하늘색 운동화', ja: '水色のスニーカー', zh: '天蓝色运动鞋' }),
  'shoes-butter': item('👟', 45, { shoes: 'butter' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Butter yellow sneakers', ko: '버터 옐로 운동화', ja: 'バターイエローのスニーカー', zh: '奶油黄运动鞋' }),
  'shoes-red': item('👟', 50, { shoes: 'red' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Red high-tops', ko: '빨간 하이탑', ja: '赤いハイカット', zh: '红色高帮鞋' }),
  'shoes-lime': item('👟', 50, { shoes: 'lime' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Lime high-tops', ko: '라임 하이탑', ja: 'ライムのハイカット', zh: '青柠色高帮鞋' }),
  'shoes-brown': item('👞', 60, { shoes: 'brown' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Brown leather loafers', ko: '브라운 가죽 로퍼', ja: 'ブラウンの革ローファー', zh: '棕色皮质乐福鞋' }),
  'shoes-tan': item('👞', 60, { shoes: 'tan' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Tan leather loafers', ko: '탄 가죽 로퍼', ja: 'タンの革ローファー', zh: '浅棕色皮质乐福鞋' }),
  'shoes-burgundy': item('👞', 60, { shoes: 'burgundy' }, { shoes: null }, WEAR_DESC.shoes, { en: 'Burgundy leather shoes', ko: '버건디 가죽 구두', ja: 'バーガンディの革靴', zh: '酒红色皮鞋' }),
  // Accessories: one per slot (data/appearance.js ACCESSORIES).
  'acc-cap-red': item('🧢', 25, { head: 'cap-red', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Red cap', ko: '빨간 캡모자', ja: '赤いキャップ', zh: '红色棒球帽' }),
  'acc-cap-sky': item('🧢', 25, { head: 'cap-sky', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Sky blue cap', ko: '하늘색 캡모자', ja: '水色のキャップ', zh: '天蓝色棒球帽' }),
  'acc-cap-black': item('🧢', 25, { head: 'cap-black', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Black cap', ko: '검정 캡모자', ja: '黒いキャップ', zh: '黑色棒球帽' }),
  'acc-cap-orange': item('🧢', 25, { head: 'cap-orange', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Orange graffiti cap', ko: '오렌지 그래피티 캡', ja: 'オレンジのグラフィティキャップ', zh: '橙色涂鸦棒球帽' }),
  'acc-bucket-cream': item('👒', 30, { head: 'bucket-cream', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Cream bucket hat', ko: '크림 버킷햇', ja: 'クリームのバケットハット', zh: '奶油色渔夫帽' }),
  'acc-bucket-denim': item('👒', 30, { head: 'bucket-denim', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Denim bucket hat', ko: '데님 버킷햇', ja: 'デニムのバケットハット', zh: '牛仔渔夫帽' }),
  'acc-beanie-grey': item('🧶', 20, { head: 'beanie-grey', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Grey beanie', ko: '회색 비니', ja: 'グレーのニット帽', zh: '灰色毛线帽' }),
  'acc-beanie-cream': item('🧶', 20, { head: 'beanie-cream', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Cream knit beanie', ko: '크림 니트 비니', ja: 'クリームのニット帽', zh: '奶油色针织帽' }),
  'acc-beanie-mustard': item('🧶', 20, { head: 'beanie-mustard', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Mustard knit beanie', ko: '머스타드 니트 비니', ja: 'マスタードのニット帽', zh: '芥末黄针织帽' }),
  'acc-beret-black': item('🎨', 30, { head: 'beret-black', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Black beret', ko: '검정 베레모', ja: '黒いベレー帽', zh: '黑色贝雷帽' }),
  'acc-ribbon-red': item('🎀', 10, { head: 'ribbon-red', hatPatch: null }, { head: null }, WEAR_DESC.accessory, { en: 'Red hair ribbon', ko: '빨간 리본 핀', ja: '赤いリボン', zh: '红色发带蝴蝶结' }),
  'acc-glasses': item('👓', 30, { face: 'glasses' }, { face: null }, WEAR_DESC.accessory, { en: 'Brown round glasses', ko: '브라운 동그란 안경', ja: 'ブラウンの丸メガネ', zh: '棕色圆框眼镜' }),
  'acc-glasses-black': item('👓', 30, { face: 'glasses-black' }, { face: null }, WEAR_DESC.accessory, { en: 'Black round glasses', ko: '검정 동그란 안경', ja: '黒の丸メガネ', zh: '黑色圆框眼镜' }),
  'acc-glasses-gold': item('👓', 35, { face: 'glasses-gold' }, { face: null }, WEAR_DESC.accessory, { en: 'Gold wire glasses', ko: '골드 메탈 안경', ja: 'ゴールドのメタルメガネ', zh: '金色金属框眼镜' }),
  'acc-glasses-pink': item('👓', 30, { face: 'glasses-pink' }, { face: null }, WEAR_DESC.accessory, { en: 'Pink round glasses', ko: '핑크 동그란 안경', ja: 'ピンクの丸メガネ', zh: '粉色圆框眼镜' }),
  'acc-sunglasses': item('🕶️', 35, { face: 'sunglasses' }, { face: null }, WEAR_DESC.accessory, { en: 'Black sunglasses', ko: '검정 선글라스', ja: '黒いサングラス', zh: '黑色墨镜' }),
  'acc-sunglasses-brown': item('🕶️', 35, { face: 'sunglasses-brown' }, { face: null }, WEAR_DESC.accessory, { en: 'Brown tinted sunglasses', ko: '브라운 틴트 선글라스', ja: 'ブラウンのカラーサングラス', zh: '棕色墨镜' }),
  'acc-sunglasses-pink': item('🕶️', 35, { face: 'sunglasses-pink' }, { face: null }, WEAR_DESC.accessory, { en: 'Pink tinted sunglasses', ko: '핑크 틴트 선글라스', ja: 'ピンクのカラーサングラス', zh: '粉色墨镜' }),
  'acc-sunglasses-blue': item('🕶️', 35, { face: 'sunglasses-blue' }, { face: null }, WEAR_DESC.accessory, { en: 'Blue tinted sunglasses', ko: '블루 틴트 선글라스', ja: 'ブルーのカラーサングラス', zh: '蓝色墨镜' }),
  'acc-hoops-gold': item('💛', 20, { ear: 'hoops-gold' }, { ear: null }, WEAR_DESC.accessory, { en: 'Gold hoop earrings', ko: '골드 링 귀걸이', ja: 'ゴールドのフープピアス', zh: '金色圈形耳环' }),
  'acc-hoops-silver': item('🩶', 20, { ear: 'hoops-silver' }, { ear: null }, WEAR_DESC.accessory, { en: 'Silver hoop earrings', ko: '실버 링 귀걸이', ja: 'シルバーのフープピアス', zh: '银色圈形耳环' }),
  'acc-pearls': item('🤍', 25, { ear: 'pearls' }, { ear: null }, WEAR_DESC.accessory, { en: 'Pearl studs', ko: '진주 귀걸이', ja: 'パールのピアス', zh: '珍珠耳钉' }),
  'acc-stars': item('⭐', 15, { ear: 'stars' }, { ear: null }, WEAR_DESC.accessory, { en: 'Star drop earrings', ko: '별 귀걸이', ja: '星のピアス', zh: '星星耳坠' }),
  'acc-hearts': item('💗', 15, { ear: 'hearts' }, { ear: null }, WEAR_DESC.accessory, { en: 'Heart drop earrings', ko: '하트 귀걸이', ja: 'ハートのピアス', zh: '爱心耳坠' }),
  'acc-cherries': item('🍒', 15, { ear: 'cherries' }, { ear: null }, WEAR_DESC.accessory, { en: 'Cherry earrings', ko: '체리 귀걸이', ja: 'さくらんぼのピアス', zh: '樱桃耳坠' }),
  'acc-scarf': item('🧣', 25, { neck: 'scarf' }, { neck: null }, WEAR_DESC.accessory, { en: 'Coral knit scarf', ko: '코랄 니트 목도리', ja: 'コーラルのニットマフラー', zh: '珊瑚色针织围巾' }),
  'acc-scarf-mint': item('🧣', 25, { neck: 'scarf-mint' }, { neck: null }, WEAR_DESC.accessory, { en: 'Mint knit scarf', ko: '민트 니트 목도리', ja: 'ミントのニットマフラー', zh: '薄荷色针织围巾' }),
  'acc-scarf-cream': item('🧣', 25, { neck: 'scarf-cream' }, { neck: null }, WEAR_DESC.accessory, { en: 'Cream knit scarf', ko: '크림 니트 목도리', ja: 'クリームのニットマフラー', zh: '奶油色针织围巾' }),
  // Pendants (Seosunra-gil): silver or gold, a moon, a plum blossom or the 복 (luck) charm.
  ...Object.fromEntries(['silver', 'gold'].flatMap((metal) => ['moon', 'plum', 'bok'].map((charm) => {
    const M = metal === 'gold' ? { en: 'Gold', ko: '골드', ja: 'ゴールドの', zh: '金色' } : { en: 'Silver', ko: '실버', ja: 'シルバーの', zh: '银色' };
    const S = { moon: { en: 'moon', ko: '달', ja: '月', zh: '月亮' }, plum: { en: 'plum blossom', ko: '매화', ja: '梅', zh: '梅花' }, bok: { en: '복 (luck)', ko: '복', ja: '福（ポク）', zh: '福字' } }[charm];
    return [`acc-pendant-${metal}-${charm}`, item(charm === 'moon' ? '🌙' : charm === 'plum' ? '🌸' : '🍀', metal === 'gold' ? 30 : 25, { neck: `pendant-${metal}-${charm}` }, { neck: null }, WEAR_DESC.accessory, { en: `${M.en} ${S.en} pendant`, ko: `${M.ko} ${S.ko} 펜던트`, ja: `${M.ja}${S.ja}ペンダント`, zh: `${M.zh}${S.zh}吊坠` })];
  }))),
  'acc-tote-forest': item('👜', 25, { back: 'tote-forest' }, { back: null }, WEAR_DESC.accessory, { en: 'Forest green tote bag', ko: '숲 초록 에코백', ja: 'フォレストグリーンのトート', zh: '森林绿帆布包' }),
  'acc-tote-river': item('👜', 25, { back: 'tote-river' }, { back: null }, WEAR_DESC.accessory, { en: 'River blue tote bag', ko: '강물 파랑 에코백', ja: 'リバーブルーのトート', zh: '河水蓝帆布包' }),
  'acc-tote-brick': item('👜', 25, { back: 'tote-brick' }, { back: null }, WEAR_DESC.accessory, { en: 'Brick red tote bag', ko: '벽돌 빨강 에코백', ja: 'レンガ色のトート', zh: '砖红色帆布包' }),
  'acc-backpack-graffiti': item('🎒', 45, { back: 'backpack-graffiti' }, { back: null }, WEAR_DESC.accessory, { en: 'Graffiti backpack', ko: '그래피티 백팩', ja: 'グラフィティのリュック', zh: '涂鸦双肩包' }),
  // Nyang Meong To Pan (Another Land): animal-ear headbands and matching paw gloves.
  ...Object.fromEntries(ANIMAL_LOOKS.flatMap((a) => {
    const n = ANIMAL_NAMES[a.id];
    return [
      ['acc-ears-' + a.id, item(a.emoji, 20, { head: 'ears-' + a.id, hatPatch: null }, { head: null }, WEAR_DESC.accessory,
        { en: `${n.en} ears headband`, ko: `${n.ko} 귀 머리띠`, ja: `${n.ja}耳カチューシャ`, zh: `${n.zh}耳朵发箍` })],
      ['acc-paws-' + a.id, item(a.emoji, 25, { hand: 'paws-' + a.id }, { hand: null }, WEAR_DESC.accessory,
        { en: `${n.en} paw gloves`, ko: `${n.ko} 발바닥 장갑`, ja: `${n.ja}の肉球手袋`, zh: `${n.zh}爪爪手套` })],
    ];
  })),
  // Skirts (look.skirt, data/skirts.js): two lengths, many colours and patterns.
  ...Object.fromEntries(Object.entries(SKIRTS).map(([id, sk]) => ['skirt-' + id,
    item('👗', SKIRT_PRICE[sk.length], { skirt: id }, { skirt: null }, WEAR_DESC.skirt, skirtName(sk))])),
};
