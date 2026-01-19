/* React app extracted from index.html for bundling */
import React, { useState, useEffect, useMemo, useContext, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';

// Utils
const STORAGE_KEYS = {
  lang: 'catering.lang',
  cart: 'catering.cart.v1',
  customer: 'catering.customer.v1',
};
const formatPrice = (n) => (
  <span className="inline-flex items-baseline gap-0.5">
    <span>{n.toFixed(2)}</span>
    <span className="font-system">₾</span>
  </span>
);
const formatPriceString = (n) => `${n.toFixed(2)} ₾`;
const tbilisiNow = () => new Date().toLocaleString('en-GB', { timeZone: 'Asia/Tbilisi' });

const getProductImg = (p, size = 400) => p?.image || `https://picsum.photos/seed/${p?.id}/${size}/${size}`;
const getSetImg = (s, w = 640, h = 360) => s?.image || `https://picsum.photos/seed/${s?.id}/${w}/${h}`;

/**
 * INTEGRATION SETTINGS
 * To connect Google Sheets:
 * 1. Create a Google Apps Script that receives a POST request.
 * 2. Deploy it as a Web App.
 * 3. Paste the URL here.
 */
const SHEETS_WEBHOOK_URL = "";

function parseMenuJsonWithComments(text) {
  const noBlock = text.replace(/\/\*[^]*?\*\//g, '');
  const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return JSON.parse(noLine);
}

// i18n dictionary for UI strings
const UI_STRINGS = {
  en: { home: 'Home', sets: 'Sets', about: 'About Us', search: 'Search menu...', popular: 'Popular Now', checkout: 'Checkout', cart: 'My Order', clearAll: 'Clear All', subtotal: 'Subtotal', delivery: 'Delivery Fee', discount: 'Discount', total: 'Total', reviewOrder: 'Review Order', eventDetails: 'Event Details', eventDate: 'Event Date', fullName: 'Full Name', guests: 'Guests', phone: 'Phone', createdInTbilisi: 'Created in Tbilisi', sendOrder: 'Send Order', proceedToPayment: 'Proceed to Payment', addToCart: 'Add to Order', saveSet: 'Save Set', editSet: 'Edit Set', persons: 'Number of Guests', portion: 'Portion Type', adult: 'Adult', child: 'Child', included: 'INCLUDED', frequently: 'Complete Your Meal', placeOrder: 'Place Order', submitOrder: 'Submit Order', personsShort: 'pax', language: 'Language' },
  ru: { home: 'Главная', sets: 'Сеты', about: 'О нас', search: 'Поиск по меню...', popular: 'Популярно сейчас', checkout: 'Оформить', cart: 'Мой заказ', clearAll: 'Очистить', subtotal: 'Промежуточный итог', delivery: 'Доставка', discount: 'Скидка', total: 'Итого', reviewOrder: 'Проверка заказа', eventDetails: 'Детали мероприятия', eventDate: 'Дата мероприятия', fullName: 'Имя', guests: 'Гостей', phone: 'Телефон', createdInTbilisi: 'Создано в Тбилиси', sendOrder: 'Отправить заказ', proceedToPayment: 'Перейти к оплате', addToCart: 'В корзину', saveSet: 'Сохранить сет', editSet: 'Редактировать сет', persons: 'Количество гостей', portion: 'Тип порции', adult: 'Взрослая', child: 'Детская', included: 'ВКЛЮЧЕНО', frequently: 'Дополнить заказ', placeOrder: 'Сформировать заказ', submitOrder: 'Отправить заказ', personsShort: 'перс.', language: 'Язык' },
  ka: { home: 'მთავარი', sets: 'სეტები', about: 'ჩვენ შესახებ', search: 'მოძებნე მენიუში...', popular: 'პოპულარული', checkout: 'გადახდა', cart: 'ჩემი შეკვეთა', clearAll: 'გასუფთავება', subtotal: 'ერთობლივი', delivery: 'მიწოდება', discount: 'ფასდაკლება', total: 'ჯამი', reviewOrder: 'შეკვეთის დათვალიერება', eventDetails: 'ღონისძიების დეტალები', eventDate: 'თარიღი', fullName: 'სახელი', guests: 'პერსონები', phone: 'ტელეფონი', createdInTbilisi: 'დრო თბილისი', sendOrder: 'შეკვეთის გაგზავნა', proceedToPayment: 'გადახდაზე გადასვლა', addToCart: 'კალათში დამატება', saveSet: 'სეტის შენახვა', editSet: 'რედაქტირება', persons: 'პერსონების რაოდენობა', portion: 'პორციის ტიპი', adult: 'ზრდასრული', child: 'ბავშვი', included: 'შეყვანილი', frequently: 'დაამატე წყვილად', placeOrder: 'შეკვეთის ფორმირება', submitOrder: 'გაგზავნა', personsShort: 'პერს.', language: 'ენა' },
};

// Global App Context
const AppCtx = createContext(null);

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial; } catch (e) { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }, [key, val]);
  return [val, setVal];
}

function AppProvider({ children }) {
  const [lang, setLang] = useLocalStorage(STORAGE_KEYS.lang, 'en');
  const t = useMemo(() => UI_STRINGS[lang] || UI_STRINGS.en, [lang]);

  const [catalog, setCatalog] = useState({ meta: { currency: 'GEL' }, categories: [], products: [], sets: [] });
  const [loadingData, setLoadingData] = useState(true);

  // Cart structure
  const [cart, setCart] = useLocalStorage(STORAGE_KEYS.cart, []);
  const currency = catalog?.meta?.currency || 'GEL';

  // UI state moved to provider for global layout
  const [query, setQuery] = useState('');
  const [activeSidebar, setActiveSidebar] = useState('all');
  const mainRef = React.useRef(null);

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of catalog.products) m.set(p.id, p);
    return m;
  }, [catalog]);

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of catalog.categories) m.set(c.id, c);
    return m;
  }, [catalog]);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const res = await fetch('menu.json');
        if (!res.ok) throw new Error('failed to fetch');
        const text = await res.text();
        const data = parseMenuJsonWithComments(text);
        setCatalog(data);
      } catch (e) {
        console.warn('Failed to load menu.json', e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  // Cart ops
  const addProduct = (productId, qty = 1) => {
    const p = productsById.get(productId);
    if (!p) return;
    setCart((prev) => {
      const idx = prev.findIndex((it) => it.type === 'product' && it.productId === productId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      const title = (p.i18n?.[lang]?.name) || (p.i18n?.en?.name) || productId;
      return [
        ...prev,
        { id: (crypto?.randomUUID?.()||Math.random().toString(36).slice(2)), type: 'product', productId, title, lang, price: Number(p.price || 0), qty }
      ];
    });
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const changeQty = (id, delta) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const clearCart = () => setCart([]);

  // Set builder helpers
  const priceOfProduct = (pid) => Number(productsById.get(pid)?.price || 0);
  const getNameOfProduct = (pid) => {
    const p = productsById.get(pid); if (!p) return pid; return (p.i18n?.[lang]?.name) || (p.i18n?.en?.name) || pid;
  };
  const getNameOfCategory = (cid) => {
    const c = categoriesById.get(cid); if (!c) return cid; return c.i18n?.[lang] || c.i18n?.en || cid;
  };

  const addSetToCart = (config, cartItemId = null) => {
    const setMeta = catalog.sets.find(s => s.id === config.setId);
    const title = setMeta ? (setMeta.i18n?.[lang] || setMeta.i18n?.en || setMeta.id) : config.setId;
    const pricePerPerson = config.pricePerPerson;
    const totalPersons = config.persons;
    const totalPrice = pricePerPerson * totalPersons;

    setCart(prev => {
      if (cartItemId) {
        return prev.map(it => it.id === cartItemId ? { ...it, title, price: totalPrice, setConfig: config } : it);
      }
      return [...prev, {
        id: (crypto?.randomUUID?.()||Math.random().toString(36).slice(2)),
        type: 'set',
        title,
        lang,
        qty: 1,
        price: totalPrice,
        setConfig: config,
      }];
    });
  };

  const recalcCartTotals = (list) => {
    const subtotal = list.reduce((s, it) => s + (Number(it.price) * (it.type === 'product' ? it.qty : 1)), 0);
    const discount = 0;
    const delivery = 0;
    const total = subtotal - discount + delivery;
    return { subtotal, discount, delivery, total };
  };

  const totals = useMemo(() => recalcCartTotals(cart), [cart]);

  const value = {
    lang, setLang, t,
    catalog, loadingData, productsById, categoriesById,
    addProduct, addSetToCart, removeItem, changeQty, clearCart,
    priceOfProduct, getNameOfProduct, getNameOfCategory,
    cart, totals, currency,
    query, setQuery, activeSidebar, setActiveSidebar, mainRef,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

function useApp() { return useContext(AppCtx); }

function LanguageSwitcher() {
  const { lang, setLang } = useApp();
  return (
    <div className="flex items-center bg-[#1E1E1E] rounded-xl p-1 gap-0.5 border border-[#333]">
      {['en','ru','ka'].map(code => (
        <button key={code}
          onClick={() => setLang(code)}
          className={`px-3.5 py-2 rounded-lg text-[11px] font-bold leading-none transition-all active:scale-95 ${lang===code? 'bg-brand-yellow text-brand-dark border-2 border-brand-yellow/30' : 'text-gray-400 hover:text-white'}`}>
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ProductCard({ product }) {
  const { addProduct, cart, changeQty, removeItem, lang } = useApp();
  const name = (product.i18n?.[lang]?.name) || (product.i18n?.en?.name) || product.id;
  const price = Number(product.price || 0);
  const inCart = cart.find(it => it.type === 'product' && it.productId === product.id);

  return (
    <div className="bg-brand-surface rounded-2xl p-3 shadow-soft flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-glow transition-transform duration-150">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#222]">
          <div
            className="w-full h-full bg-center bg-cover"
            style={{ backgroundImage: `url('${getProductImg(product)}')` }}
          />
        </div>
      </Link>
      <div className="flex justify-between items-end gap-2">
        <div className="flex-1 min-w-0">
          <Link to={`/product/${product.id}`} className="block">
            <h4 className="text-xs font-bold leading-tight mb-0.5 truncate">{name}</h4>
            {product.weight && (
              <p className="text-[10px] text-gray-400 truncate">{product.weight}</p>
            )}
            {product.description && (
              <p className="text-[9px] text-gray-500 line-clamp-1">{product.description}</p>
            )}
            <span className="block text-sm font-black text-brand-yellow mt-1">{formatPrice(price)}</span>
          </Link>
        </div>
        {inCart ? (
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10 shrink-0">
            <button
              onClick={() => inCart.qty > 1 ? changeQty(inCart.id, -1) : removeItem(inCart.id)}
              className="w-6 h-6 bg-brand-surface rounded flex items-center justify-center text-white active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm font-black">remove</span>
            </button>
            <span className="text-xs font-bold min-w-[1rem] text-center">{inCart.qty}</span>
            <button
              onClick={() => changeQty(inCart.id, 1)}
              className="w-6 h-6 bg-brand-yellow rounded flex items-center justify-center text-black active:scale-90 transition-all"
            >
              <span className="material-symbols-outlined text-sm font-black">add</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              addProduct(product.id, 1);
            }}
            className="w-8 h-8 bg-brand-yellow rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-white shrink-0"
          >
            <span className="material-symbols-outlined text-black font-black text-lg">add</span>
          </button>
        )}
      </div>
    </div>
  );
}

function SetCard({ setDef }) {
  const { t, lang, priceOfProduct } = useApp();
  const title = setDef.i18n?.[lang] || setDef.i18n?.en || setDef.id;
  const perPerson = setDef.base.map(b => ({ productId: b.productId, qtyPerPerson: b.qty / setDef.default_persons }));
  const pricePerPerson = perPerson.reduce((s, it) => s + priceOfProduct(it.productId) * it.qtyPerPerson, 0);
  const total = pricePerPerson * setDef.default_persons;
  return (
    <div className="bg-brand-surface rounded-2xl p-3 shadow-soft flex flex-col gap-3 border border-white/5">
      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[#222]">
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-brand-yellow text-black text-[10px] font-black px-2 py-1 rounded uppercase shadow-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">star</span>
            Chef's Special
          </div>
        </div>
        <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url('${getSetImg(setDef)}')` }}></div>
      </div>
      <div className="flex justify-between items-end">
        <div className="flex-1 pr-2">
          <h4 className="text-lg font-bold leading-tight mb-1">{title}</h4>
          <p className="text-[11px] text-gray-400">{setDef.default_persons} {t.personsShort}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-brand-yellow">{formatPrice(total)}</span>
          </div>
        </div>
        <Link to={`/set/${setDef.id}`} className="w-11 h-11 bg-brand-yellow rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-white hover:scale-105 shrink-0">
          <span className="material-symbols-outlined text-black font-black text-2xl">tune</span>
        </Link>
      </div>
    </div>
  );
}

function CategoryBar({ categories, current, onSelect }) {
  const { getNameOfCategory } = useApp();
  return (
    <div className="sticky top-0 z-20 bg-[#121212]/95 backdrop-blur py-2">
      <div className="flex items-center gap-4 px-1 overflow-x-auto hide-scrollbar">
        {categories.map(cat => (
          <button key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap border ${current===cat.id? 'bg-brand-yellow text-black border-brand-yellow' : 'bg-[#1E1E1E] text-gray-300 border-[#333] hover:text-white'}`}>
            {getNameOfCategory(cat.id)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const { catalog, lang, t, getNameOfCategory, query, activeSidebar } = useApp();

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = catalog.products;
    if (activeSidebar === 'all') {
      // no filter
    } else if (activeSidebar === 'top') {
      list = list.filter((p) => p.popular);
    } else {
      list = list.filter((p) => p.category === activeSidebar);
    }
    if (q) {
      list = list.filter((p) => (p.i18n?.[lang]?.name || p.i18n?.en?.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [catalog.products, activeSidebar, query, lang]);

  const promoSets = useMemo(() => (catalog.sets || []).slice(0, 3), [catalog.sets]);

  return (
    <div className="p-4 flex flex-col gap-6">
      {(activeSidebar === 'all' || activeSidebar === 'top') && (
        <section className="w-full">
          <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x snap-mandatory">
            {promoSets.map(s => (
              <Link to={`/set/${s.id}`} key={s.id} className="snap-center shrink-0 relative w-[240px] h-[130px] bg-brand-charcoal rounded-xl overflow-hidden shadow-soft group">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${getSetImg(s, 480, 260)}')`,
                    filter: 'brightness(0.6)',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-transparent"></div>
                <div className="absolute inset-0 p-4 flex flex-col justify-center items-start">
                  <span className="bg-brand-orange text-white text-[9px] font-black uppercase px-2 py-0.5 rounded mb-1">
                    {t.sets}
                  </span>
                  <h2 className="text-xl font-black text-white leading-none uppercase italic mb-1 truncate w-full">
                    {s.i18n?.[lang] || s.i18n?.en || s.id}
                  </h2>
                  <p className="text-[10px] text-gray-300 font-medium">{s.default_persons} {t.personsShort}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-black text-white italic tracking-tight uppercase">
            {activeSidebar === 'all' ? t.home : activeSidebar === 'top' ? t.popular : getNameOfCategory(activeSidebar)}
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNav() {
  const { totals, t } = useApp();
  return (
    <nav className="flex-none z-50 bg-[#1E1E1E] border-t border-[#333] pb-6 pt-3 px-8">
      <div className="flex items-center justify-between">
        <Link className="flex flex-col items-center justify-center w-14 gap-1.5 text-brand-yellow group -mt-4" to="/">
          <span className="material-symbols-outlined text-[26px] filled group-hover:scale-110 transition-transform">home</span>
          <span className="text-[10px] font-bold">{t.home}</span>
        </Link>
        <Link className="flex flex-col items-center justify-center w-14 gap-1.5 text-gray-400 hover:text-white transition-colors group -mt-4" to="/sets">
          <span className="material-symbols-outlined text-[26px] group-hover:scale-110 transition-transform">view_list</span>
          <span className="text-[10px] font-medium">{t.sets}</span>
        </Link>
        <div className="relative -top-10 mx-2">
          <Link to="/cart" className="w-[90px] h-[90px] bg-brand-yellow rounded-full shadow-[0_4px_30px_rgba(255,199,44,0.6)] flex flex-col items-center justify-center border-4 border-[#1E1E1E] active:scale-95 transition-transform group relative z-10">
            <span className="material-symbols-outlined text-black text-[40px] group-hover:scale-110 transition-transform mb-0.5">shopping_cart</span>
            <span className="absolute -bottom-4 bg-[#121212] border border-[#333] text-white px-3 py-1 rounded-full text-[13px] font-black shadow-md whitespace-nowrap min-w-[80px] text-center">{formatPrice(totals.total)}</span>
          </Link>
        </div>
        <Link className="flex flex-col items-center justify-center w-14 gap-1.5 text-gray-400 hover:text-white transition-colors group -mt-4" to="/about">
          <span className="material-symbols-outlined text-[26px] group-hover:scale-110 transition-transform">info</span>
          <span className="text-[10px] font-medium">{t.about}</span>
        </Link>
      </div>
    </nav>
  );
}

function SetsList() {
  const { catalog } = useApp();
  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-black mb-2">Chef's Specials</h1>
      <div className="grid grid-cols-1 gap-4">
        {catalog.sets.map(s => <SetCard key={s.id} setDef={s} />)}
      </div>
    </div>
  );
}

function useSetParamsSafe() {
  const { pathname, search } = useLocation();
  const m = pathname.match(/\/set\/(.+)$/);
  const q = new URLSearchParams(search);
  return {
    setId: m ? decodeURIComponent(m[1]).split('?')[0] : null,
    editId: q.get('edit')
  };
}

function useProductParamsSafe() {
  const { pathname } = useLocation();
  const m = pathname.match(/\/product\/(.+)$/);
  return { productId: m ? decodeURIComponent(m[1]) : null };
}

function SetEditor() {
  const { t, catalog, priceOfProduct, getNameOfProduct, productsById, lang, addSetToCart, cart } = useApp();
  const navigate = useNavigate();
  const { setId, editId } = useSetParamsSafe();
  const setDef = catalog.sets.find(s => s.id === setId);
  const existingItem = editId ? cart.find(it => it.id === editId) : null;

  const [persons, setPersons] = useState(10);
  const [variant, setVariant] = useState('adult');
  const [perPerson, setPerPerson] = useState([]);

  useEffect(() => {
    if (!setDef) return;
    if (existingItem && existingItem.setConfig) {
      setPersons(existingItem.setConfig.persons);
      setVariant(existingItem.setConfig.variant);
      setPerPerson(existingItem.setConfig.perPerson);
    } else {
      setPersons(setDef.default_persons);
      setVariant((setDef.variants && setDef.variants[0]) || 'adult');
      setPerPerson(setDef.base.map(b => ({ productId: b.productId, qtyPerPerson: b.qty / setDef.default_persons })));
    }
  }, [setDef?.id, editId]);

  const bump = (pid, d) => setPerPerson(list => list.map(x => x.productId === pid ? { ...x, qtyPerPerson: Math.max(0, Number((x.qtyPerPerson + d).toFixed(2))) } : x));
  const pricePerPerson = useMemo(() => {
    const base = perPerson.reduce((s, it) => s + priceOfProduct(it.productId) * it.qtyPerPerson, 0);
    return variant === 'kids' ? base * 0.7 : base; // 30% discount for kids portions
  }, [perPerson, priceOfProduct, variant]);
  const totalPrice = useMemo(() => pricePerPerson * persons, [pricePerPerson, persons]);

  if (!setDef) return <div className="p-6">Not found</div>;

  const title = setDef.i18n?.[lang] || setDef.i18n?.en || setDef.id;

  const saveAndBack = () => {
    addSetToCart({ setId: setDef.id, persons, variant, perPerson, pricePerPerson }, editId);
    navigate('/cart');
  };

  return (
    <div className="pb-32">
      <header className="relative w-full h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${getSetImg(setDef, 800, 480)}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/40 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full px-6 pb-6">
          <h1 className="text-2xl font-black italic uppercase leading-none mb-2">{title}</h1>
        </div>
      </header>

      <div className="px-4 py-2 space-y-3 mb-4">
        <div className="bg-brand-surface rounded-xl p-4 flex items-center justify-between border border-white/5 shadow-soft">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">{t.persons}</span>
            <span className="text-white font-bold text-xl">{persons} {t.personsShort}</span>
          </div>
          <div className="flex items-center bg-[#1a1a1a] rounded-lg p-1 border border-white/5">
            <button onClick={() => setPersons(Math.max(1, persons-1))} className="w-10 h-10 rounded-md hover:bg-white/5 flex items-center justify-center text-gray-400 active:text-white transition-colors">
              <span className="material-symbols-outlined">remove</span>
            </button>
            <div className="w-[1px] h-6 bg-white/10"></div>
            <button onClick={() => setPersons(persons+1)} className="w-10 h-10 rounded-md hover:bg-white/5 flex items-center justify-center text-brand-yellow active:text-white transition-colors">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>

        <div className="bg-brand-surface rounded-xl p-4 flex items-center justify-between border border-white/5 shadow-soft">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-1">{t.portion}</span>
            <span className="text-brand-yellow font-bold text-sm">{variant === 'adult' ? t.adult : t.child}</span>
          </div>
          <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-white/5">
            {(setDef.variants||['adult']).map(v => (
              <button key={v} onClick={()=>setVariant(v)} className={`px-4 py-2 rounded-[6px] text-xs font-bold ${variant===v? 'bg-brand-yellow text-black' : 'text-gray-400 hover:text-white'}`}>{v==='adult'?t.adult:t.child}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-4 py-6 flex flex-col gap-4">
        {perPerson.map(row => (
          <div key={row.productId} className="group relative bg-brand-surface rounded-2xl p-3 flex gap-4 overflow-hidden border border-white/5 shadow-soft">
            <Link to={`/product/${row.productId}`} className="w-20 h-20 shrink-0 rounded-xl bg-gray-800 overflow-hidden relative shadow-inner block hover:opacity-80 transition-opacity">
              <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage: `url('${getProductImg(productsById.get(row.productId), 160)}')`}}></div>
            </Link>
            <div className="flex flex-col flex-1 py-1">
              <div className="flex justify-between items-start mb-1">
                <Link to={`/product/${row.productId}`} className="hover:text-brand-yellow transition-colors flex-1 min-w-0 pr-2">
                  <h3 className="font-bold text-white text-base leading-tight truncate">{getNameOfProduct(row.productId)}</h3>
                </Link>
                <span className="text-brand-yellow font-black text-xs bg-brand-yellow/10 px-1.5 py-0.5 rounded border border-brand-yellow/20 shrink-0">{t.included}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="text-[11px] text-gray-400">{row.qtyPerPerson} / person</div>
                <div className="flex items-center gap-3 bg-brand-dark rounded-full px-1 py-1 border border-white/10 shadow-inner">
                  <button onClick={()=>bump(row.productId, -0.5)} className="w-7 h-7 rounded-full bg-brand-surface flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                    <span className="material-symbols-outlined text-sm font-bold">remove</span>
                  </button>
                  <span className="text-sm font-bold text-white w-8 text-center">{row.qtyPerPerson.toFixed(2)}</span>
                  <button onClick={()=>bump(row.productId, +0.5)} className="w-7 h-7 rounded-full bg-brand-yellow flex items-center justify-center text-black hover:bg-white transition-colors shadow-[0_0_10px_rgba(255,199,44,0.3)]">
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
      <div className="absolute bottom-6 left-0 right-0 p-4 z-40 flex justify-center">
        <button onClick={saveAndBack} className="w-full bg-brand-yellow text-black font-black uppercase text-sm py-4 rounded-full shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all">
          <span>{t.saveSet}</span>
          <span>•</span>
          <span>{formatPrice(totalPrice)}</span>
        </button>
      </div>
    </div>
  );
}

function ShoppingCart() {
  const { t, cart, removeItem, changeQty, totals, productsById, catalog } = useApp();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <header className="bg-[#1a1a1a] px-5 py-4 flex items-center justify-between border-b border-white/5">
        <h1 className="text-xl font-black italic uppercase">{t.cart} <span className="text-brand-yellow">({cart.length})</span></h1>
        <button onClick={() => { if (confirm('Clear?')) { localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify([])); location.reload(); } }} className="text-[10px] font-black text-gray-500 uppercase">{t.clearAll}</button>
      </header>
      <div className="flex flex-col">
        {cart.map(item => (
          <div key={item.id} className="p-5 border-b border-white/5 flex gap-4 bg-brand-charcoal/30 relative">
            <div className="w-24 h-24 rounded-xl bg-[#222] bg-cover bg-center shrink-0 shadow-sm" style={{
              backgroundImage: `url('${item.type==='product'
                ? getProductImg(productsById.get(item.productId), 256)
                : getSetImg(catalog.sets.find(s => s.id === item.setConfig.setId), 256, 256)}')`
            }}></div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-white text-lg leading-tight">{item.title}</h3>
                  <span className="font-black text-brand-yellow">{formatPrice(item.type==='product' ? item.price*item.qty : item.price)}</span>
                </div>
                {item.type==='set' && (
                  <button onClick={() => navigate(`/set/${item.setConfig.setId}?edit=${item.id}`)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-yellow uppercase tracking-wider border border-brand-yellow/30 px-2 py-1 rounded hover:bg-brand-yellow hover:text-black transition-colors">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    {t.editSet}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                {item.type==='product' ? (
                  <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                    <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 rounded bg-brand-surface flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">remove</span>
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                    <button onClick={() => changeQty(item.id, +1)} className="w-7 h-7 rounded bg-brand-yellow flex items-center justify-center text-black hover:brightness-110 transition-colors shadow-sm">
                      <span className="material-symbols-outlined text-sm font-bold">add</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-400">{item.setConfig.persons} {t.personsShort}</div>
                )}
                <button onClick={() => removeItem(item.id)} className="text-brand-orange text-sm font-bold">Remove</button>
              </div>
            </div>
          </div>
        ))}

        <section className="bg-[#1a1a1a] rounded-t-3xl p-6 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] border-t border-white/5">
          <div className="flex flex-col gap-3 text-sm mb-6">
            <div className="flex justify-between text-gray-400">
              <span>{t.subtotal}</span>
              <span className="font-medium text-gray-200">{formatPrice(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>{t.delivery}</span>
              <span className="font-medium text-gray-200">{formatPrice(totals.delivery)}</span>
            </div>
            <div className="flex justify-between text-brand-yellow">
              <span>{t.discount}</span>
              <span className="font-medium">{formatPrice(totals.discount)}</span>
            </div>
            <div className="w-full h-px bg-white/10 my-2"></div>
            <div className="flex justify-between items-end">
              <span className="font-bold text-white text-lg">{t.total}</span>
              <div className="text-right">
                <span className="block text-xs text-gray-500 font-medium mb-0.5">Incl. VAT</span>
                <span className="font-black text-3xl">{formatPrice(totals.total)}</span>
              </div>
            </div>
          </div>
          <Link to="/review" className="w-full bg-brand-yellow py-4 rounded-2xl flex items-center justify-between px-6 shadow-[0_4px_20px_rgba(255,199,44,0.3)] active:scale-[0.98] transition-transform group relative overflow-hidden">
            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
            <span className="font-black text-brand-dark uppercase tracking-wide text-base relative z-10 truncate mr-2">{t.checkout}</span>
            <div className="bg-black/80 px-3 py-1.5 rounded-lg text-sm font-bold text-white flex items-center gap-1 relative z-10 shrink-0">
              <span>Pay</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}

function ReviewOrder() {
  const { t, totals, cart, getNameOfProduct } = useApp();
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [guests, setGuests] = useState('');
  const [phone, setPhone] = useState('');
  const createdAt = tbilisiNow();

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEYS.customer) || '{}');
      if (v.date) setDate(v.date);
      if (v.name) setName(v.name);
      if (v.guests) setGuests(v.guests);
      if (v.phone) setPhone(v.phone);
    } catch (e) {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.customer, JSON.stringify({ date, name, guests, phone }));
    } catch (e) {}
  }, [date, name, guests, phone]);

  const payload = useMemo(() => ({
    created_at_tbilisi: createdAt, currency: 'GEL', items: cart, totals, customer: { name, date, guests, phone },
  }), [cart, totals, name, date, guests, phone]);

  const getOrderSummary = () => {
    return `Order (Tbilisi time: ${createdAt})\n` +
      cart.map((i, idx) => {
        let details = i.type === 'product' ? `${i.qty}x` : `${i.setConfig?.persons} pax, ${i.setConfig?.variant || 'adult'}`;
        if (i.type === 'set' && i.setConfig?.perPerson) {
          details += `\n` + i.setConfig.perPerson.filter(p => p.qtyPerPerson > 0).map(p => `  - ${getNameOfProduct(p.productId)}: ${p.qtyPerPerson}/pers`).join('\n');
        }
        return `${idx+1}. ${i.title}\n(${details.trim()})\nPrice: ${formatPriceString(i.type==='product' ? i.price*i.qty : i.price)}`;
      }).join('\n\n') +
      `\n\nTotal: ${formatPriceString(totals.total)}\nName: ${name}\nDate: ${date}\nGuests: ${guests}\nPhone: ${phone}`;
  };

  const whatsappLink = () => `https://wa.me/?text=${encodeURIComponent(getOrderSummary())}`;

  const submitOrder = async () => {
    if (SHEETS_WEBHOOK_URL) {
      try { await fetch(SHEETS_WEBHOOK_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (e) {}
    }
    window.open(whatsappLink(), '_blank');
    alert('Order processing via WhatsApp...');
  };

  return (
    <div className="relative">
      <div className="flex flex-col p-6 space-y-8 pb-72">
        <section className="bg-brand-charcoal w-full rounded-sm relative overflow-hidden shadow-soft">
          <div className="h-1.5 w-full bg-brand-yellow"></div>
          <div className="p-5">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-dashed border-[#444]">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ID</span>
                <span className="text-base font-bold tracking-widest font-mono">#TB-{String(Date.now()).slice(-4)}</span>
              </div>
              <div className="px-2 py-1 rounded bg-brand-yellow/10 border border-brand-yellow/20">
                <span className="text-[9px] font-bold text-brand-yellow uppercase">{t.createdInTbilisi} • {createdAt}</span>
              </div>
            </div>

            <div className="space-y-5">
              {cart.map((it) => (
                <div key={it.id} className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-[#2A2A2A] text-brand-yellow font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                      {it.type==='product'? it.qty : it.setConfig?.persons}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold leading-tight truncate">{it.title}</h3>
                      {it.type === 'product' && (
                        <p className="text-[10px] text-gray-500 font-medium">
                          {formatPrice(it.price)} / unit
                        </p>
                      )}
                      {it.type === 'set' && (
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase font-bold tracking-tight">
                          {it.setConfig?.variant === 'kids' ? t.child : t.adult} • {it.setConfig?.persons} {t.personsShort}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold shrink-0">{formatPrice(it.type==='product'? it.price*it.qty : it.price)}</span>
                  </div>
                  {it.type === 'set' && it.setConfig?.perPerson && (
                    <div className="ml-9 flex flex-col gap-0.5">
                      {it.setConfig.perPerson.filter(p => p.qtyPerPerson > 0).map(p => (
                        <div key={p.productId} className="flex justify-between text-[10px] text-gray-500 italic">
                          <span>{getNameOfProduct(p.productId)}</span>
                          <span>{p.qtyPerPerson} / pers</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-dashed border-[#444] space-y-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                <span>{t.subtotal}</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                <span>{t.delivery}</span>
                <span>{formatPrice(totals.delivery)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                <span>{t.discount}</span>
                <span>{formatPrice(totals.discount)}</span>
              </div>
            </div>
          </div>
          <div className="h-4 w-full bg-[#121212]" style={{ background: "linear-gradient(135deg, #1E1E1E 5px, transparent 0) 0 5px, linear-gradient(-135deg, #1E1E1E 5px, transparent 0) 0 5px", backgroundColor: "#121212", backgroundPosition: "left bottom", backgroundRepeat: "repeat-x", backgroundSize: "10px 10px" }}></div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="material-symbols-outlined text-brand-yellow text-lg">edit_note</span>
            <h2 className="text-xs font-black uppercase tracking-wider">{t.eventDetails}</h2>
          </div>
          <div className="group bg-brand-surface rounded-xl p-1 pr-4 flex items-center gap-3 border border-transparent focus-within:border-brand-yellow/50 transition-all shadow-soft overflow-hidden">
            <div className="w-12 h-12 bg-[#222] flex items-center justify-center group-focus-within:bg-brand-yellow group-focus-within:text-brand-dark transition-colors">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-brand-dark transition-colors text-xl">calendar_month</span>
            </div>
            <div className="flex-1 py-1">
              <label className="block text-[9px] text-gray-500 font-bold uppercase mb-0.5">{t.eventDate}</label>
              <input value={date} onChange={(e)=>setDate(e.target.value)} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 placeholder-gray-600 font-display" type="date" />
            </div>
          </div>
          <div className="group bg-brand-surface rounded-xl p-1 pr-4 flex items-center gap-3 border border-transparent focus-within:border-brand-yellow/50 transition-all shadow-soft overflow-hidden">
            <div className="w-12 h-12 bg-[#222] flex items-center justify-center group-focus-within:bg-brand-yellow group-focus-within:text-brand-dark transition-colors">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-brand-dark transition-colors text-xl">badge</span>
            </div>
            <div className="flex-1 py-1">
              <label className="block text-[9px] text-gray-500 font-bold uppercase mb-0.5">{t.fullName}</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 placeholder-gray-600 font-display" placeholder="e.g. Giorgi Beridze" type="text" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2 group bg-brand-surface rounded-xl p-1 pr-2 flex items-center gap-2 border border-transparent focus-within:border-brand-yellow/50 transition-all shadow-soft overflow-hidden">
              <div className="w-12 h-12 bg-[#222] flex items-center justify-center group-focus-within:bg-brand-yellow group-focus-within:text-brand-dark transition-colors shrink-0">
                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-brand-dark transition-colors text-xl">group</span>
              </div>
              <div className="flex-1 py-1 min-w-0">
                <label className="block text-[9px] text-gray-500 font-bold uppercase mb-0.5">{t.guests}</label>
                <input value={guests} onChange={(e)=>setGuests(e.target.value)} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 placeholder-gray-600 font-display" placeholder="0" type="number" />
              </div>
            </div>
            <div className="col-span-3 group bg-brand-surface rounded-xl p-1 pr-4 flex items-center gap-3 border border-transparent focus-within:border-brand-yellow/50 transition-all shadow-soft overflow-hidden">
              <div className="w-12 h-12 bg-[#222] flex items-center justify-center group-focus-within:bg-brand-yellow group-focus-within:text-brand-dark transition-colors shrink-0">
                <span className="material-symbols-outlined text-gray-400 group-focus-within:text-brand-dark transition-colors text-xl">call</span>
              </div>
              <div className="flex-1 py-1 min-w-0">
                <label className="block text-[9px] text-gray-500 font-bold uppercase mb-0.5">{t.phone}</label>
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 placeholder-gray-600 font-display" placeholder="+995" type="tel" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-40 bg-[#121212] border-t border-[#2C2C2C] px-6 pt-4 pb-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span className="text-[10px] font-bold uppercase tracking-wide">{t.createdInTbilisi} • {createdAt}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">{t.total}</span>
                <span className="text-4xl font-black text-brand-yellow tracking-tight leading-none">{totals.total.toFixed(2)}</span>
                <span className="text-2xl font-bold text-brand-yellow font-system">₾</span>
              </div>
            </div>
          </div>
          <button onClick={submitOrder} className="w-full group bg-brand-yellow text-brand-dark py-4 rounded-xl flex items-center justify-between px-6 shadow-glow hover:bg-[#ffcf4d] active:scale-[0.98] transition-all duration-200">
            <span className="flex flex-col items-start">
              <span className="font-black text-base uppercase tracking-wider">{t.sendOrder}</span>
              <span className="text-[9px] font-bold opacity-70">{t.proceedToPayment}</span>
            </span>
            <div className="w-10 h-10 bg-brand-dark/10 rounded-full flex items-center justify-center group-hover:bg-brand-dark/20 transition-colors">
              <span className="material-symbols-outlined font-black">arrow_forward</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductPage() {
  const { catalog, productsById, lang, addProduct, cart, changeQty, removeItem, t } = useApp();
  const navigate = useNavigate();
  const { productId } = useProductParamsSafe();
  const product = productsById.get(productId);

  const inCart = useMemo(() => product ? cart.find(it => it.type === 'product' && it.productId === product.id) : null, [cart, product]);
  const recommendations = useMemo(() => product ? (catalog.products || []).filter(p => p.id !== product.id && (p.category === product.category || p.popular)).slice(0, 3) : [], [catalog.products, product]);

  if (!product) return <div className="p-6">Product not found</div>;

  const name = (product.i18n?.[lang]?.name) || (product.i18n?.en?.name) || product.id;
  const price = Number(product.price || 0);

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 py-4 flex flex-col gap-4">
        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#222] relative">
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
            <span className="material-symbols-outlined text-white">close</span>
          </button>
          <div className="w-full h-full bg-center bg-cover" style={{ backgroundImage: `url('${getProductImg(product, 600)}')` }} />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex flex-col">
            <h2 className="text-xl font-black mb-1">{name}</h2>
            {product.weight && (
              <p className="text-xs text-gray-400">{product.weight}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block mb-0.5">Price</span>
            <span className="text-2xl font-black text-brand-yellow">{formatPrice(price)}</span>
          </div>
        </div>
        {product.description && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{product.description}</p>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{t.frequently}</h3>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar -mx-4 px-4">
            {recommendations.map(rp => (
              <div key={rp.id} className="flex-shrink-0 w-40 bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                <div className="h-24 relative overflow-hidden">
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${getProductImg(rp, 300)}')` }}></div>
                  <button
                    onClick={() => addProduct(rp.id, 1)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-brand-yellow flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-black text-base font-black">add</span>
                  </button>
                </div>
                <div className="p-3">
                  <p className="text-[10px] font-black text-white uppercase truncate mb-1">{rp.i18n?.[lang]?.name || rp.i18n?.en?.name || rp.id}</p>
                  <span className="text-xs font-bold text-brand-yellow">{formatPrice(Number(rp.price || 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 left-0 right-0 px-4 z-40">
        {inCart ? (
          <div className="w-full bg-brand-surface rounded-2xl p-2 border border-white/10 flex items-center justify-between shadow-glow">
            <button
              onClick={() => inCart.qty > 1 ? changeQty(inCart.id, -1) : removeItem(inCart.id)}
              className="w-12 h-12 bg-[#222] rounded-xl flex items-center justify-center text-white active:scale-90 transition-all hover:bg-white/10"
            >
              <span className="material-symbols-outlined font-black">remove</span>
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5">{t.cart}</span>
              <span className="text-2xl font-black text-white leading-none">{inCart.qty}</span>
            </div>
            <button
              onClick={() => changeQty(inCart.id, 1)}
              className="w-12 h-12 bg-brand-yellow rounded-xl flex items-center justify-center text-black active:scale-90 transition-all hover:bg-white"
            >
              <span className="material-symbols-outlined font-black">add</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => addProduct(product.id, 1)}
            className="w-full bg-brand-yellow text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all hover:bg-white"
          >
            <span className="material-symbols-outlined">add_shopping_cart</span>
            <span className="uppercase tracking-wide">{t.addToCart}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function About() {
  const { t } = useApp();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-black mb-4 italic uppercase">{t.about}</h1>
      <div className="bg-brand-surface rounded-2xl p-6 border border-white/5 space-y-4">
         <p className="text-gray-300 leading-relaxed text-sm">Welcome to GamarjobaFood. We provide premium catering services in Tbilisi, specializing in authentic appetizers, sets, and gourmet snacks for your special events.</p>
         <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-gray-400 text-xs">
               <span className="material-symbols-outlined text-brand-yellow">location_on</span>
               <span>Tbilisi, Georgia</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 text-xs">
               <span className="material-symbols-outlined text-brand-yellow">mail</span>
               <span>dondigidonkarton@gmail.com</span>
            </div>
         </div>
      </div>
    </div>
  );
}

function AppShell({ children }) {
  const { t, query, setQuery, activeSidebar, setActiveSidebar, catalog, getNameOfCategory, mainRef } = useApp();
  const navigate = useNavigate();

  const categoryIconMap = useMemo(() => ({
    bruschettas: 'restaurant_menu', pastry: 'bakery_dining', fried_meat: 'kebab_dining',
    salads: 'eco', seafood: 'set_meal', assortment: 'layers', desserts: 'icecream', default: 'restaurant',
  }), []);

  const sidebarItems = useMemo(() => {
    const items = [
      { id: 'all', icon: 'grid_view', label: t.home || 'All' },
      { id: 'top', icon: 'local_fire_department', label: t.popular || 'Top' },
    ];
    for (const cat of catalog.categories || []) {
      items.push({ id: cat.id, icon: categoryIconMap[cat.id] || categoryIconMap.default, label: getNameOfCategory(cat.id) });
    }
    return items;
  }, [catalog.categories, categoryIconMap, getNameOfCategory, t.home, t.popular]);

  return (
    <div className="mx-auto max-w-md w-full relative h-[100dvh] flex flex-col bg-[#121212] overflow-hidden shadow-2xl">
      <header className="flex-none bg-[#121212]/95 backdrop-blur-sm z-30 px-4 pt-8 pb-4 flex flex-col items-center gap-4 border-b border-[#222]">
        <div className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-brand-orange rounded-xl rotate-3 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(255,165,0,0.3)] mb-1">
            GF
          </div>
          <h1 className="text-xl font-black text-white italic tracking-tighter uppercase">GamarjobaFood</h1>
        </div>

        <LanguageSwitcher />

        <div className="relative w-full h-11 bg-brand-surface rounded-xl flex items-center px-4 gap-3 border border-[#333] focus-within:border-brand-yellow transition-colors">
          <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (window.location.hash !== '#/') navigate('/');
            }}
            className="bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm flex-1 p-0 focus:ring-0"
            placeholder={t.search}
            type="text"
          />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-[72px] bg-[#181818] overflow-y-auto hide-scrollbar flex flex-col py-2 gap-1 border-r border-[#222] flex-none">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={`w-full py-3 flex flex-col items-center gap-1 group transition-colors relative ${
                activeSidebar === item.id ? 'bg-[#2C2C2C] border-r-[3px] border-brand-yellow' : 'hover:bg-[#222]'
              }`}
              onClick={() => {
                setActiveSidebar(item.id);
                navigate('/');
                if (mainRef.current) mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className={`material-symbols-outlined text-2xl ${activeSidebar === item.id ? 'text-brand-yellow' : 'text-gray-500 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] uppercase tracking-tight text-center px-1 ${activeSidebar === item.id ? 'text-white font-bold' : 'text-gray-500 group-hover:text-white'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </aside>

        <main ref={mainRef} className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sets" element={<SetsList />} />
            <Route path="/set/:id" element={<SetEditor />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<ShoppingCart />} />
            <Route path="/review" element={<ReviewOrder />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </AppProvider>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
