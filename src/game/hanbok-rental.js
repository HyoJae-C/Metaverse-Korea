// Hanbok rental (Dano Hanbok Rental by Gyeongbokgung): pay coins, wear it for
// a few hours, then your own clothes come back by themselves, also after a
// reload (core/hanbok-rental.js). A chip shows the time left.
import { L, fmt } from '../ui/pocha-ui.js';
import { RENT } from '../ui/shop-ui.js';
import { RENT_HOURS, hanbokById } from '../data/hanbok.js';
import { checkRental, endRental, formatLeft, isRenting, loadRental, saveRental, startRental, timeLeft } from '../core/hanbok-rental.js';
import { onLanguageChange, t } from '../core/i18n.js';
import { saveLook } from '../core/look-editor.js';

export function createHanbokRental(game) {
  const { $, refreshWallet, setLook, shop } = game;
  const RENT_TEXT = {
    rented: { en: '🪭 Rented! Enjoy your hanbok for {h} hours.', ko: '🪭 대여 완료! {h}시간 동안 한복을 즐겨요.', ja: '🪭 レンタル完了！{h}時間韓服を楽しんでね。', zh: '🪭 租好了！尽情穿{h}小时韩服吧。', es: '🪭 ¡Alquilado! Disfruta tu hanbok {h} horas.', ar: '🪭 تم الاستئجار! استمتع بالهانبوك لمدة {h} ساعات.', vi: '🪭 Đã thuê! Tận hưởng hanbok trong {h} giờ.', hi: '🪭 किराए पर लिया! {h} घंटे हानबोक का मज़ा लें।', id: '🪭 Tersewa! Nikmati hanbokmu selama {h} jam.' },
    ended: { en: '🪭 Your hanbok rental is over: back in your own clothes.', ko: '🪭 한복 대여 시간이 끝나서 원래 옷으로 돌아왔어요.', ja: '🪭 韓服のレンタル時間が終わり、元の服に戻りました。', zh: '🪭 韩服租借时间到了，已换回原来的衣服。', es: '🪭 Terminó el alquiler del hanbok: vuelves a tu ropa.', ar: '🪭 انتهى إيجار الهانبوك: عدت إلى ملابسك.', vi: '🪭 Hết giờ thuê hanbok: bạn đã mặc lại đồ của mình.', hi: '🪭 हानबोक का किराया ख़त्म: आप अपने कपड़ों में वापस हैं।', id: '🪭 Sewa hanbok selesai: kembali ke bajumu sendiri.' },
    returned: { en: '🪭 Hanbok returned. Thank you!', ko: '🪭 한복을 반납했어요. 감사합니다!', ja: '🪭 韓服を返却しました。ありがとう！', zh: '🪭 韩服已归还，谢谢！', es: '🪭 Hanbok devuelto. ¡Gracias!', ar: '🪭 أُعيد الهانبوك. شكرًا!', vi: '🪭 Đã trả hanbok. Cảm ơn!', hi: '🪭 हानबोक लौटा दिया। धन्यवाद!', id: '🪭 Hanbok dikembalikan. Terima kasih!' },
    chipHint: { en: 'Your own clothes come back when the time is up. Return it early at the hanbok shop.', ko: '시간이 끝나면 원래 옷으로 돌아와요. 한복집에서 미리 반납할 수도 있어요.', ja: '時間が来ると元の服に戻ります。韓服店で早めに返すこともできます。', zh: '时间到了会换回原来的衣服，也可以在韩服店提前归还。', es: 'Tu ropa vuelve cuando se acaba el tiempo. Puedes devolverlo antes en la tienda.', ar: 'تعود ملابسك عند انتهاء الوقت. يمكنك إعادته مبكرًا في متجر الهانبوك.', vi: 'Hết giờ quần áo của bạn sẽ trở lại. Có thể trả sớm ở tiệm hanbok.', hi: 'समय पूरा होने पर आपके कपड़े लौट आते हैं। चाहें तो दुकान पर पहले लौटा दें।', id: 'Bajumu kembali saat waktunya habis. Bisa dikembalikan lebih awal di toko hanbok.' },
  };
  let rental = loadRental();
  function rentHanbok(product) {
    const set = hanbokById(product.rent);
    if (!set) return;
    if (isRenting(rental, product.rent)) { // give it back early
      game.myLook = endRental(game.myLook, rental);
      rental = null;
      shop.toast(L(RENT_TEXT.returned));
    } else {
      if (!game.wallet.spend(set.coins, { name: product.name, at: game.interior?.store.name })) { shop.toast(t('pet.noCoins', { n: set.coins - game.wallet.coins })); return; }
      refreshWallet();
      game.sfx.pop?.();
      const r = startRental(game.myLook, product.rent, Date.now(), rental);
      game.myLook = r.look;
      rental = r.rental;
      shop.toast(fmt(L(RENT_TEXT.rented), { h: RENT_HOURS }));
    }
    $('revert-look').hidden = true;
    saveRental(rental);
    saveLook(game.myLook);
    setLook(game.myLook);
    refreshRentChip();
  }
  function refreshRentChip() {
    const chip = $('rent-chip');
    chip.hidden = !rental;
    if (rental) chip.textContent = '🪭 ' + formatLeft(timeLeft(rental));
    chip.title = rental ? fmt(L(RENT.left), { t: formatLeft(timeLeft(rental)) }) : '';
  }
  // Time up (checked now, then every 20 s): your own clothes back.
  function tickRental() {
    const r = checkRental(game.myLook, rental);
    if (r.rental !== rental || r.look !== game.myLook) {
      rental = r.rental;
      saveRental(rental);
      if (r.look !== game.myLook) {
        game.myLook = r.look;
        saveLook(game.myLook);
        if (game.currentLook !== game.myLook) $('revert-look').hidden = true;
        setLook(game.myLook);
        if (r.ended) shop.toast(L(RENT_TEXT.ended));
      }
    }
    refreshRentChip();
  }
  setTimeout(tickRental, 0);
  setInterval(tickRental, 20000);
  onLanguageChange(refreshRentChip);
  $('rent-chip').onclick = () => shop.toast(`${fmt(L(RENT.left), { t: formatLeft(timeLeft(rental)) })} · ${L(RENT_TEXT.chipHint)}`);
  return { rentHanbok, get rental() { return rental; } };
}
