// Shopping UI: store banner, product card, cart. Prices are virtual.
import { ITEMS } from '../core/inventory.js';
import { t, localName, getLanguage } from '../core/i18n.js';

const UMB = {
  buy: { en: 'Buy', ko: '사기', ja: '買う', zh: '购买' },
  have: { en: 'You have one', ko: '이미 있어요', ja: '持っています', zh: '已经有了' },
};
const L = (o) => localName(o, getLanguage());
const MODEL_ICON = { samgak: '🍙', milk: '🍌', umbrella: '☂️', 'pet:dog': '🐶', 'pet:cat': '🐱',
  tee: '👕', jeans: '👖', sneaker: '👟', bottle: '🧴', jar: '🫙', lipstick: '💄', cap: '🧢',
  hat: '👒', tote: '👜', plush: '🧸', notebook: '📓', pen: '🖊️', candle: '🕯️', bread: '🥐',
  cup: '🥤', scarf: '🧣', bowl: '🍲', roll: '🍙',
};
const CART_KEY = 'mk.cart';

export function formatPrice(krw) {
  return '₩' + Math.round(krw).toLocaleString('en-US');
}

export class Cart {
  constructor() {
    this.items = [];
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      if (Array.isArray(raw)) this.items = raw.filter((i) => i && i.id && i.price >= 0).slice(0, 50);
    } catch { /* ignore */ }
    this.listeners = new Set();
  }
  _save() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(this.items)); } catch { /* ignore */ }
    this.listeners.forEach((fn) => fn());
  }
  add(store, product) {
    const key = `${store.id}/${product.id}`;
    const found = this.items.find((i) => i.key === key);
    if (found) found.qty += 1;
    else this.items.push({ key, id: product.id, store: store.id, storeName: store.name, name: product.name, price: product.price, model: product.model, qty: 1 });
    this._save();
  }
  remove(key) {
    this.items = this.items.filter((i) => i.key !== key);
    this._save();
  }
  count() { return this.items.reduce((n, i) => n + i.qty, 0); }
  total() { return this.items.reduce((n, i) => n + i.qty * i.price, 0); }
  onChange(fn) { this.listeners.add(fn); }
}

export class ShopUI {
  constructor({ cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella }) {
    Object.assign(this, { cart, onTryOn, onExit, onTake, onAdopt, owns, onAdd, hasUmbrella, onUmbrella });
    this.$ = (id) => document.getElementById(id);
    this.store = null;
    this.$('product-close').onclick = () => this.closeProduct();
    this.$('cart-btn').onclick = () => this.openCart();
    this.$('cart-close').onclick = () => { this.$('cart-panel').hidden = true; };
    this.$('cart-checkout').onclick = () => { this.$('cart-note').hidden = false; };
    this.$('store-exit').onclick = () => this.onExit();
    cart.onChange(() => this.refreshCart());
    this.refreshCart();
  }

  enterStore(store) {
    this.store = store;
    const lang = getLanguage();
    this.$('store-banner').hidden = false;
    this.$('store-name').textContent = localName(store.name, lang);
    this.$('store-name-ko').textContent = lang === 'ko' ? '' : store.name.ko;
    this.$('store-tagline').textContent = localName(store.tagline, lang) || '';
    this.$('store-banner').style.setProperty('--store', store.colors.sign);
    this.$('store-banner').querySelector('.sample').hidden = store.category === 'home' || store.category === 'school';
  }

  leaveStore() {
    this.store = null;
    this.$('store-banner').hidden = true;
    this.closeProduct();
  }

  openProduct(product) {
    const lang = getLanguage();
    const p = this.$('product-panel');
    p.hidden = false;
    this.$('product-icon').textContent = MODEL_ICON[product.model] || '🛍️';
    this.$('product-icon').style.background = product.color;
    this.$('product-name').textContent = localName(product.name, lang);
    this.$('product-name-ko').textContent = lang === 'ko' ? '' : product.name.ko;
    this.$('product-price').textContent = formatPrice(product.price);
    this.$('product-desc').textContent = localName(product.desc, lang) || '';
    const tryBtn = this.$('product-try');
    tryBtn.hidden = !product.tryOn;
    tryBtn.onclick = () => this.onTryOn(product);
    // Restaurant dishes are a menu to read, not something to buy.
    // Takeaway shops (META COFFEE) hand you the drink to carry around.
    // Pet shop: adopt with coins (or walk a pet you already have).
    const adopt = product.adopt && ITEMS[product.adopt];
    const ab = this.$('product-adopt');
    ab.hidden = !adopt;
    if (adopt) {
      const mine = this.owns?.(product.adopt);
      ab.textContent = mine ? '🐾 ' + t('pet.walk') : `🪙 ${adopt.price} · ${t('pet.adopt')}`;
      ab.onclick = () => this.onAdopt?.(product);
      this.$('product-price').textContent = `🪙 ${adopt.price}`;
    }
    // Convenience store umbrella: bought with coins, kept for rainy days.
    if (product.umbrella) {
      const mine = this.hasUmbrella?.();
      ab.hidden = false;
      ab.disabled = !!mine;
      ab.textContent = mine ? '☂️ ' + L(UMB.have) : `🪙 ${product.coins} · ${L(UMB.buy)}`;
      ab.onclick = () => this.onUmbrella?.(product);
      this.$('product-price').textContent = `🪙 ${product.coins}`;
    } else ab.disabled = false;
    const take = !!this.store?.takeaway;
    this.$('product-take').hidden = !take;
    this.$('product-take').onclick = () => { this.onTake?.(product); this.closeProduct(); };
    this.$('product-add').hidden = take || adopt || product.umbrella;
    this.$('product-add').onclick = () => {
      this.cart.add(this.store, product);
      if (!this.onAdd?.(product)) this.toast(t('shop.added')); // onAdd may show its own toast
    };
  }

  closeProduct() {
    this.$('product-panel').hidden = true;
  }

  openCart() {
    const lang = getLanguage();
    this.$('cart-panel').hidden = false;
    this.$('cart-note').hidden = true;
    const list = this.$('cart-list');
    list.innerHTML = '';
    if (!this.cart.items.length) {
      const e = document.createElement('p');
      e.className = 'cart-empty';
      e.textContent = t('cart.empty');
      list.appendChild(e);
    }
    for (const it of this.cart.items) {
      const row = document.createElement('div');
      row.className = 'cart-row';
      const icon = document.createElement('span');
      icon.className = 'cart-icon';
      icon.textContent = MODEL_ICON[it.model] || '🛍️';
      const txt = document.createElement('span');
      txt.className = 'cart-text';
      const n = document.createElement('strong');
      n.textContent = `${localName(it.name, lang)}${it.qty > 1 ? ' × ' + it.qty : ''}`;
      const s = document.createElement('small');
      s.textContent = localName(it.storeName, lang);
      txt.append(n, s);
      const price = document.createElement('span');
      price.className = 'cart-price';
      price.textContent = formatPrice(it.price * it.qty);
      const rm = document.createElement('button');
      rm.className = 'cart-remove';
      rm.setAttribute('aria-label', t('cart.remove'));
      rm.textContent = '✕';
      rm.onclick = () => { this.cart.remove(it.key); this.openCart(); };
      row.append(icon, txt, price, rm);
      list.appendChild(row);
    }
    this.$('cart-total').textContent = formatPrice(this.cart.total());
    this.$('cart-checkout').disabled = !this.cart.items.length;
  }

  refreshCart() {
    const n = this.cart.count();
    this.$('cart-count').textContent = n;
    this.$('cart-count').hidden = n === 0;
  }

  toast(text) {
    const el = this.$('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(this._tt);
    this._tt = setTimeout(() => { el.hidden = true; }, 1600);
  }
}
