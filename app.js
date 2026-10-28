/* =====================================================
مكرونجي — سكربت التطبيق الرئيسي (app.js)
v16.0: دمج نظام الطلبات السحابي (رقم 12345A# + تتبع حي)
       مع الحفاظ الكامل على كل وظائف v15.8
===================================================== */

/* ===== إضافة v16: الربط السحابي + أدوات الأمان ===== */
const CLOUD_API = 'https://makaronjy-api.makaronjy.workers.dev'; // ⚠️ غيّره لرابط الـ Worker الفعلي
function sanitize(str){
  if(!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g,'').replace(/javascript:/gi,'').replace(/on\w+=/gi,'').trim().slice(0,1000);
}
function getCustomerInfo(){
  try{ return JSON.parse(localStorage.getItem('mk_customer')) || {name:'',phone:''}; }catch(e){ return {name:'',phone:''}; }
}
function saveCustomerInfo(name, phone){
  try{ localStorage.setItem('mk_customer', JSON.stringify({name:name, phone:phone})); }catch(e){}
}

/* ===== استعادة لقطة محلية عند فشل تحميل الملفات ===== */
(function(){
  if(window.MENU && window.APP_SETTINGS) return;
  try{
    var m = localStorage.getItem('mk_snap_menu');
    var s = localStorage.getItem('mk_snap_settings');
    if(!window.MENU && m) new Function(m)();
    if(!window.APP_SETTINGS && s) new Function(s)();
  }catch(e){}
})();
document.addEventListener('touchstart', e=>{ if(e.touches.length > 1) e.preventDefault(); }, {passive:false});
document.addEventListener('touchmove', e=>{ if(e.touches.length > 1) e.preventDefault(); }, {passive:false});
['gesturestart','gesturechange','gestureend'].forEach(ev=> document.addEventListener(ev, e=> e.preventDefault()));
document.addEventListener('dblclick', e=> e.preventDefault());
const t0 = Date.now();
let guardOn = false;
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
function pushGuard(){
  if(guardOn) return;
  try{ history.pushState({rb:1}, ''); guardOn = true; }catch(e){}
}
/* ===== Stack للنوافذ: حالة تاريخ + موضع تمرير لكل نافذة ===== */
let overlayStack = [];
const LOCK_TYPES = ['detail','featured','sidemenu','fav','slot','welcome'];
function restoreScroll(y){
  setTimeout(()=>{ window.scrollTo({top:y, behavior:'instant'}); }, 30);
}
function pushOverlay(type){
  const scrollY = window.scrollY || window.pageYOffset || 0;
  overlayStack.push({ type, scrollY });
  try{ history.pushState({rb:1, ov:type}, ''); guardOn = true; }catch(e){}
}
function dropOverlay(type){
  for(let i=overlayStack.length-1;i>=0;i--){
    if(overlayStack[i].type===type){
      return overlayStack.splice(i,1)[0];
    }
  }
  return null;
}
function settleOverlay(type){
  const en = dropOverlay(type);
  if(en && LOCK_TYPES.indexOf(type) >= 0) restoreScroll(en.scrollY);
  return en;
}
function closeByType(t){
  if(t==='detail') closeDetail();
  else if(t==='cart') closeCart();
  else if(t==='sidemenu') closeSideMenu();
  else if(t==='fav') closeFavSheet();
  else if(t==='slot') closeSlotPicker();
  else if(t==='otp') closeOrderType();
  else if(t==='search') closeSearchMode();
  else if(t==='toast') hideActionToast();
  else if(t==='featured') closeFeatured();
  else if(t==='ad') closeAd();
  else if(t==='closed') closeClosedNotice();
  else if(t==='sheet') closeSheet();
  else if(t==='welcome') {
    introFinished = true;
    el('welcome').classList.remove('show');
    document.body.style.overflow='';
  }
}
pushGuard();
document.addEventListener('DOMContentLoaded', pushGuard);
window.addEventListener('load', pushGuard);
window.addEventListener('pageshow', pushGuard);
function el(id){ return document.getElementById(id); }
function toast(msg){
  const t = el('toastMsg');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(()=> t.classList.remove('show'), 2600);
}
function welcomeShown(){ return el('welcome').classList.contains('show'); }
function sheetShown(){ return el('installSheet').classList.contains('show'); }
function drawerShown(){ return el('drawer').classList.contains('show'); }
function featuredShown(){ return el('featured').classList.contains('show'); }
function confirmShown(){ return el('confirmModal').classList.contains('show'); }
function adShown(){ return el('adModal').classList.contains('show'); }
function closedShown(){ return el('closedModal').classList.contains('show'); }
function detailShown(){ const d = el('detail'); return !!d && d.classList.contains('show'); }
function tt(key, ar, en){
  const v = (window.I18N && T()[key] !== undefined) ? T()[key] : undefined;
  return (v !== undefined && typeof v !== 'function') ? v : (currentLang==='ar' ? ar : en);
}
function tFn(key, arg, arFn, enFn){
  const v = T()[key];
  if(typeof v === 'function') return v(arg);
  return currentLang==='ar' ? arFn(arg) : enFn(arg);
}
function tCall(key, fallbackFn, ...args){
  const v = T()[key];
  if(typeof v === 'function') return v(...args);
  return fallbackFn(...args);
}
function favSlotsArr(){
  const v = T().favSlots;
  return Array.isArray(v) ? v : (currentLang==='ar' ? ['فطور 🌅','غداء ☀️','عشاء 🌙'] : ['Breakfast 🌅','Lunch ☀️','Dinner 🌙']);
}
function S(){ return window.APP_SETTINGS; }
function branches(){ return S().branches; }
function savedBranchId(){ return localStorage.getItem('mk_branch'); }
function currentBranch(){ return branches().find(b=>b.id===savedBranchId()) || null; }
function branchName(b){ return (currentLang==='ar') ? b.nameAr : b.nameEn; }
function brandName(){ return (currentLang==='ar') ? S().brand.nameAr : S().brand.nameEn; }
function brandTag(){ return (currentLang==='ar') ? S().brand.tagAr : S().brand.tagEn; }
function brandize(str){
  if(typeof str !== 'string') return str;
  return str.replace(/مكرونجي/g, S().brand.nameAr).replace(/Makaronjy/g, S().brand.nameEn);
}
function bestSellers(){ return Array.isArray(S().bestSellers) ? S().bestSellers : []; }
function bestItems(){ return bestSellers().map(id=> findMenuItem(id)).filter(Boolean); }
function isBestSeller(it){ return bestSellers().includes(it.id); }
function itemImgUrl(it){ return it.imgv ? ('img/items/' + it.id + '.png?v=' + it.imgv) : null; }
function itemPlaceholder(name){
  const safe = String(name).replace(/[&<>"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#e8a04c"/><rect y="330" width="800" height="80" fill="#8e2a4a"/><text x="400" y="290" font-size="90" text-anchor="middle">🍝</text><text x="400" y="500" font-size="40" text-anchor="middle" fill="#8e2a4a" font-family="Cairo,sans-serif" font-weight="bold">${safe}</text><text x="400" y="555" font-size="24" text-anchor="middle" fill="#f2b95f" font-family="Cairo,sans-serif">مكرونجي ⭐</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function branchNum(b){
  if(b && typeof b.num === 'number' && isFinite(b.num) && b.num >= 1) return b.num;
  const i = branches().indexOf(b);
  return i >= 0 ? i+1 : 1;
}
function branchCode(b){ return 'B' + branchNum(b); }
function generateInvoiceID(code){
  const now = new Date();
  const hours = String(now.getHours()).padStart(2,'0');
  const minutes = String(now.getMinutes()).padStart(2,'0');
  const milliseconds = String(now.getMilliseconds()).padStart(3,'0');
  const randomChar = Math.random().toString(36).substring(2,3).toUpperCase();
  return `${code}-${hours}${minutes}${milliseconds}-${randomChar}`;
}
function hav(la1,lo1,la2,lo2){
  const R=6371, r=d=>d*Math.PI/180;
  const dLa=r(la2-la1), dLo=r(lo2-lo1);
  const a=Math.sin(dLa/2)**2 + Math.cos(r(la1))*Math.cos(r(la2))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function findMenuItem(id){
  for(const s of MENU){ const it = s.items.find(x=>x.id===id); if(it) return it; }
  return null;
}
function findMenuItemByAr(name){
  for(const s of MENU){ const it = s.items.find(x=>x.ar===name); if(it) return it; }
  return null;
}
function findSectionOfItem(id){
  for(const s of MENU){ if(s.items.some(x=>x.id===id)) return s; }
  return null;
}
function itemSoldOut(it, brId){ return Array.isArray(it.so) && it.so.includes(brId); }
function itemPrice(it, sizeIdx){ return it.prices[sizeIdx >=0 ? sizeIdx : 0]; }
function itemDesc(it){
  const d = (currentLang==='ar') ? it.desc : (it.descEn || it.desc);
  return d || '';
}
function secAvailAt(sec, brId){ return !Array.isArray(sec.only) || !sec.only.length || sec.only.includes(brId); }
function itAvailAt(it, brId){ return !Array.isArray(it.only) || !it.only.length || it.only.includes(brId); }
function sectionViewState(sec, brId){
  if(secAvailAt(sec, brId)) return 'normal';
  return (sec.miss === 'hide') ? 'hide' : 'gray';
}
function itemViewState(sec, it, brId){
  const sA = secAvailAt(sec, brId);
  const iA = itAvailAt(it, brId);
  if(!sA && !iA) return (it.miss === 'hide') ? 'hide' : 'gray';
  if(!sA) return (sec.miss === 'hide') ? 'hide' : 'gray';
  if(!iA) return (it.miss === 'hide') ? 'hide' : 'gray';
  return 'normal';
}
function itemAvailable(id, brId){
  const it = findMenuItem(id);
  const sec = findSectionOfItem(id);
  if(!it || !sec) return false;
  if(it.hidden === true) return false;
  if(itemSoldOut(it, brId)) return false;
  return itemViewState(sec, it, brId) === 'normal';
}
/* ===== خيارات العرض ===== */
function displayOpts(){
  const d = (S() && S().display) || {};
  return {
    mode: (d.mode === 'list') ? 'list' : 'grid',
    showDesc: d.showDesc !== false,
    showCal: d.showCal !== false
  };
}
/* ===== الإضافات ===== */
function modsRefs(it){
  if(!it.mods) return [];
  if(Array.isArray(it.mods)){
    const out = [];
    it.mods.forEach(g=>{
      (g.opts||[]).forEach(o=>{
        if(out.indexOf(o.ref) < 0) out.push(o.ref);
      });
    });
    return out;
  }
  return Array.isArray(it.mods.refs) ? it.mods.refs.slice() : [];
}
function modsTitleAr(it){
  if(it.mods && !Array.isArray(it.mods) && it.mods.tAr) return it.mods.tAr;
  if(Array.isArray(it.mods) && it.mods.length && it.mods[0].tAr) return it.mods[0].tAr;
  return tt('oftenWith','غالبًا ما يتم طلبه مع','Often ordered with');
}
function modsTitleEn(it){
  if(it.mods && !Array.isArray(it.mods) && it.mods.tEn) return it.mods.tEn;
  if(Array.isArray(it.mods) && it.mods.length && it.mods[0].tEn) return it.mods[0].tEn;
  return tt('oftenWithEn','Often ordered with','Often ordered with');
}
function modsSubAr(){ return tt('oftenWithSub','عادة ما يضيف الأشخاص هذه العناصر','People usually add these items'); }
function modsSubEn(){ return tt('oftenWithSubEn','People usually add these items','People usually add these items'); }
function modPriceFor(it, ref){
  const rit = findMenuItem(ref);
  return rit ? rit.prices[0] : 0;
}
/* ===== تحديث موضعي لبطاقة إضافة واحدة (بدون وميض) ===== */
function updateAddOnCard(ref){
  const box = el('dtMods');
  if(!box || !dtState) return;
  const card = box.querySelector('.dt-ocard[data-ref="'+ref+'"]');
  if(!card) return;
  const ctrl = card.querySelector('.dt-octrl');
  if(!ctrl) return;
  const q = dtState.sel[ref] || 0;
  if(q > 0){
    ctrl.innerHTML = '<span class="dt-mini"><button class="dec" data-mact="dec" data-ref="'+ref+'">−</button><span>'+q+'</span><button data-mact="inc" data-ref="'+ref+'">+</button></span>';
  } else {
    ctrl.innerHTML = '<button class="dt-pick" data-mact="inc" data-ref="'+ref+'">+</button>';
  }
}
/* ===== مفاتيح السلة ===== */
function cartKey(id, sizeIdx){ return id+'|'+sizeIdx; }
function keyId(k){ return String(k).split('|')[0]; }
function keySize(k){ return +String(k).split('|')[1]; }
function qtyForItemSize(id, sizeIdx){
  let q = 0;
  cart.forEach((v,k)=>{
    if(keyId(k) === id && keySize(k) === sizeIdx) q += v.qty;
  });
  return q;
}
function normHM(t){
  if(t && typeof t === 'object') return { h:(t.h|0), m:(t.m|0) };
  const n = Math.floor(+t) || 0;
  return { h:n, m:0 };
}
function hmToMin(t){ const o = normHM(t); return o.h*60 + o.m; }
function defaultSchedule(){
  const H = S().hours || { open:{h:13,m:0}, close:{h:2,m:0} };
  const o = normHM(H.open), c = normHM(H.close);
  return [0,1,2,3,4,5,6].map(()=> ({ o:{h:o.h,m:o.m}, c:{h:c.h,m:c.m} }));
}
function branchSchedule(br){
  if(br && Array.isArray(br.hours) && br.hours.length === 7){
    return br.hours.map(d=> ({ o:normHM(d.o), c:normHM(d.c), closed:!!d.closed }));
  }
  return defaultSchedule();
}
function within(tMin, d){
  if(!d || d.closed) return false;
  const o = hmToMin(d.o), c = hmToMin(d.c);
  if(o < c) return tMin >= o && tMin < c;
  if(o > c) return tMin >= o || tMin < c;
  return false;
}
function branchStatus(br){
  const sched = branchSchedule(br);
  const now = new Date();
  const day = now.getDay();
  const tMin = now.getHours()*60 + now.getMinutes();
  const today = sched[day];
  const yest = sched[(day+6)%7];
  if(yest && !yest.closed && hmToMin(yest.o) > hmToMin(yest.c) && tMin < hmToMin(yest.c)) return {open:true, closeMin:hmToMin(yest.c)}};
  if(within(tMin, today)) return {open:true, closeMin:hmToMin(today.c)};
  if(today && !today.closed && tMin < hmToMin(today.o)) return {open:false, openMin:hmToMin(today.o), openDay:null};
  for(let i=1;i<=7;i++){
    const d=(day+i)%7;
    const ds=sched[d];
    if(ds && !ds.closed) return {open:false, openMin:hmToMin(ds.o), openDay:d};
  }
  return {open:false, openMin:null, openDay:null};
}
function fmtMin(min, lang){
  let h = Math.floor(min/60) % 24;
  const m = min % 60;
  const ampm = h < 12 ? (lang==='ar'?'ص':'AM') : (lang==='ar'?'م':'PM');
  let h12 = h % 12; if(h12 === 0) h12 = 12;
  const pad = n=> String(n).padStart(2,'0');
  if(lang==='ar'){
    const arDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const toAr = s=> String(s).split('').map(d=> arDigits[+d]).join('');
    return toAr(h12) + (m ? ':' + toAr(pad(m)) : '') + ' ' + ampm;
  }
  return h12 + (m ? ':' + pad(m) : '') + ' ' + ampm;
}
let currentLang = localStorage.getItem('mk_lang') || 'ar';
function T(){ return window.I18N[currentLang]; }
function itemName(it){ return (currentLang==='ar') ? it.ar : it.en; }
let deferredPrompt = null;
const installBtn = el('installBtn');
const installSheet = el('installSheet');
const sheetBody = el('sheetBody');
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function runningAsApp(){
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.navigator.standalone === true;
}
function refreshInstallBtn(){
  const installed = runningAsApp() || localStorage.getItem('mk_app_installed') === '1';
  installBtn.classList.toggle('show', !installed);
}
if(runningAsApp()){
  localStorage.setItem('mk_app_installed','1');
  document.body.classList.add('is-app');
}
refreshInstallBtn();
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt = e; });
window.addEventListener('appinstalled', ()=>{
  localStorage.setItem('mk_app_installed','1');
  refreshInstallBtn();
  toast(T().installed);
});
function fillSheet(){ sheetBody.innerHTML = isIOS ? T().iosSteps : T().otherSteps; }
function installApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(res=>{
      if(res.outcome==='accepted'){
        localStorage.setItem('mk_app_installed','1');
        refreshInstallBtn();
      }
      deferredPrompt = null;
    });
  } else {
    fillSheet();
    installSheet.classList.add('show');
    pushOverlay('sheet');
  }
}
function closeSheet(){ installSheet.classList.remove('show'); settleOverlay('sheet'); }
/* ===== أيقونات التواصل ===== */
const SOC_SVG = {
  instagram:'<svg viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4m.9 2.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.83 5.7 3.24 0 5.81-2.35 5.81-5.7l.03-6.14c1.15.82 2.53 1.27 3.97 1.27V7.34c-1.28 0-2.46-.55-3.2-1.52z"/></svg>',
  email:'<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z"/></svg>',
  youtube:'<svg viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.13L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4 .19-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.13L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73 2.08.89 2.5.71 2.95.66.45-.04 1.45-.59 1.65-1.16.21-.57.21-1 .05-1.16-.16-.17-1.16-.06-1.23-.16-.48-.27-.14-1.47-.73-1.69-.81-.23-.08-.38-.12-.55-.12-.16-.25-.64-.81-.78-.97-.15-.17-.29-.19-.53-.06-.25.12-1.05.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.37.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.55-.43-.14 0-.3-.01-.46-.01z"/></svg>',
  custom:'<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'
};
const SOC_EMOJI = { snapchat:{ch:'👻', bg:'#FFFC00'} };
function socEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function socialList(){
  const s = S().social;
  if(Array.isArray(s)) return s.filter(x=> x && x.url).slice(0,5);
  const out = [];
  if(s && s.instagram) out.push({key:'instagram', nameAr:'انستقرام', nameEn:'Instagram', url:s.instagram});
  if(s && s.tiktok) out.push({key:'tiktok', nameAr:'تيك توك', nameEn:'TikTok', url:s.tiktok});
  return out.slice(0,5);
}
function socialHref(x){
  if(x.key==='email') return /^mailto:/i.test(x.url) ? x.url : ('mailto:'+x.url);
  return x.url;
}
function renderSocial(){
  const list = socialList();
  const html = list.map(x=>{
    const em = SOC_EMOJI[x.key];
    const ic = em ? em.ch : (SOC_SVG[x.key] || SOC_SVG.custom);
    const cls = em ? ' class="soc-emoji"' : '';
    const stl = em ? ' style="background:'+em.bg+';border-color:transparent"' : '';
    const nm = socEsc(currentLang==='ar' ? (x.nameAr||x.nameEn||'') : (x.nameEn||x.nameAr||''));
    return '<a href="'+socEsc(socialHref(x))+'"'+cls+stl+' target="_blank" rel="noopener noreferrer" aria-label="'+nm+'">'+ic+'</a>';
  }).join('');
  const sm = el('smSocial');
  if(sm) sm.innerHTML = html;
  const smT = el('smSocialTitle');
  if(smT){
    smT.textContent = tt('followUs','تابعنا على','Follow us on');
    smT.style.display = list.length ? '' : 'none';
  }
}
/* ===== إصدار الصور ===== */
function imagesVersion(){ const s = S(); return (s && s.imagesVersion) || 0; }
function applyImageVersions(){
  const v = imagesVersion();
  document.querySelectorAll('img[data-appimg]').forEach(im=>{
    const p = im.getAttribute('data-appimg');
    const want = p + (v ? '?v='+v : '');
    if(im.getAttribute('src') !== want) im.src = want;
  });
}
/* ===== شركاء التوصيل: احتياطي مدمج ===== */
const DEFAULT_DELIVERY_APPS = [
  { id:'d-jahez', nameAr:'جاهز', nameEn:'Jahez', url:'https://jahez.go.link/avE5E', color:'#e30613', img:'img/d-jahez.png' },
  { id:'d-hungerstation', nameAr:'هنقرستيشن', nameEn:'HungerStation', url:'https://hungerstation.go.link/?c=SA&s=c&v=96730', color:'#ffb700', img:'img/d-hungerstation.png' },
  { id:'d-keeta', nameAr:'كيتا', nameEn:'Keeta', url:'https://url.mykeeta.com/qXA45r7z', color:'#ffd400', img:'img/d-keeta.png' }
];
function deliveryApps(){
  const d = S().delivery;
  return (Array.isArray(d) && d.length) ? d : DEFAULT_DELIVERY_APPS;
}
function renderDelivery(){
  const d = deliveryApps();
  const box = el('otpApps');
  if(!box) return;
  if(!d.length){ box.innerHTML = ''; return; }
  const name = x=> currentLang==='ar' ? x.nameAr : (x.nameEn || x.nameAr);
  box.innerHTML = `<div class="gd-tiles">${d.map((x,i)=>`<button class="gd-btn" aria-label="${name(x)}" onclick="return openDeliveryApp(event, ${i});">
    <img src="${x.img || 'img/missing.png'}" alt="${name(x)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="gd-fallback" style="display:none;background:${x.color || '#8e2a4a'}">${name(x).charAt(0)}</span>
    <span class="gd-name">${name(x)}</span></button>`).join('')}</div>`;
}
function openDeliveryApp(event, idx){
  event.preventDefault();
  const d = deliveryApps();
  const x = d[idx];
  if(!x) return false;
  window.location.href = x.url;
  setTimeout(()=>{
    if(!document.hidden){
      const w = window.open(x.url, '_blank');
      if(!w) window.location.href = x.url;
    }
  }, 1500);
  return false;
}
/* ===== أكورديون تطبيقات التوصيل: زر واحد + طي ذكي ===== */
let appsAutoTimer = null;
function appsZoneOpen(){
  const z = el('otpAppsZone');
  return !!z && z.classList.contains('apps-open');
}
function clearAppsAutoTimer(){
  if(appsAutoTimer){ clearTimeout(appsAutoTimer); appsAutoTimer = null; }
}
function collapseAppsPanel(){
  const z = el('otpAppsZone');
  if(!z) return;
  z.classList.remove('apps-open');
  const b = el('otpAppsToggle');
  if(b) b.setAttribute('aria-expanded','false');
  clearAppsAutoTimer();
}
function armAppsAutoTimer(){
  clearAppsAutoTimer();
  appsAutoTimer = setTimeout(collapseAppsPanel, 5000);
}
function expandAppsPanel(){
  const z = el('otpAppsZone');
  if(!z) return;
  z.classList.add('apps-open');
  const b = el('otpAppsToggle');
  if(b) b.setAttribute('aria-expanded','true');
  armAppsAutoTimer();
}
function ensureAppsAccordion(){
  const zone = el('otpAppsZone');
  if(!zone || el('otpAppsToggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'otp-apps-toggle';
  btn.id = 'otpAppsToggle';
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML =
    '<span class="oat-txt">' +
      '<span class="oat-main">🛵 <span id="otpAppsToggleLbl"></span></span>' +
      '<span class="oat-sub" id="otpAppsToggleSub"></span>' +
    '</span>' +
    '<span class="oat-chev">⌄</span>';
  const panel = document.createElement('div');
  panel.className = 'otp-apps-panel';
  panel.id = 'otpAppsPanel';
  while(zone.firstChild) panel.appendChild(zone.firstChild);
  zone.appendChild(btn);
  zone.appendChild(panel);
  btn.addEventListener('click', ()=>{
    if(appsZoneOpen()) collapseAppsPanel(); else expandAppsPanel();
  });
  zone.addEventListener('pointerdown', ()=>{
    if(appsZoneOpen()) armAppsAutoTimer();
  }, {passive:true});
  document.addEventListener('click', (e)=>{
    if(!appsZoneOpen()) return;
    if(zone.contains(e.target)) return;
    collapseAppsPanel();
  }, true);
}
ensureAppsAccordion();
/* ===== اللغة ===== */
function applyLang(lang){
  currentLang = lang;
  localStorage.setItem('mk_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang==='ar') ? 'rtl' : 'ltr';
  document.title = brandize(T().docTitle);
  document.querySelectorAll('.lang-seg').forEach(s=> s.classList.toggle('active', s.dataset.lang===lang));
  document.querySelectorAll('[data-i18n]').forEach(elm=>{
    const key = elm.getAttribute('data-i18n');
    const val = T()[key];
    if(val===undefined || typeof val === 'function') return;
    if(elm.hasAttribute('data-i18n-html')) elm.innerHTML = brandize(val);
    else elm.textContent = brandize(val);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(elm=>{
    const val = T()[elm.getAttribute('data-i18n-ph')];
    if(val) elm.placeholder = val;
  });
  const bn = document.querySelector('[data-i18n="brandName"]');
  if(bn) bn.textContent = brandName();
  const bt = document.querySelector('[data-i18n="brandTag"]');
  if(bt) bt.textContent = brandTag();
  el('confirmYes').textContent = tt('favConfirmYes','نعم، استبدال','Yes, Replace');
  el('confirmNo').textContent = tt('favCancel','إلغاء','Cancel');
  const cbl = el('changeBranchLbl');
  if(cbl) cbl.textContent = tt('changeBranch','تغيير الفرع','Change Branch');
  el('closedNoteTxt').textContent = tt('closedNote','مغلق يرجى العودة لاحقاً','Closed — please come back later');
  updateBranchFooter();
  renderSocial();
  renderDelivery();
  applyImageVersions();
  if(installSheet.classList.contains('show')) fillSheet();
  if(detailShown()) closeDetail();
  search.value = '';
  isSearching = false;
  cats.classList.remove('searching');
  searchStats.classList.remove('show');
  updateStatus();
  buildMenu();
  showSection(currentSection, false);
  refreshSteps();
  updateCart();
  updateFavBadge();
  if(el('favSheet').classList.contains('show')) renderFavSheet();
  setTimeout(()=>{ catsSign = 0; catsPos = 0; cats.scrollLeft = 0; }, 50);
}
function toggleLang(){ applyLang(currentLang==='ar' ? 'en' : 'ar'); }
/* ===== الحالة (داخلية فقط) ===== */
function updateStatus(){
  const pill = el('statusPill');
  const txt = el('statusText');
  const note = el('statusNote');
  if(pill && txt && note){
    const br = currentBranch() || branches()[0] || null;
    if(!br){
      pill.classList.remove('open'); pill.classList.add('closed');
      txt.textContent = T().closed; note.textContent = '';
    } else {
      const st = branchStatus(br);
      const lang = currentLang;
      const days = T().days || (lang==='ar' ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
      pill.classList.toggle('open', st.open);
      pill.classList.toggle('closed', !st.open);
      txt.textContent = st.open ? T().open : T().closed;
      if(st.open){
        note.textContent = tCall('closesAt', h=> 'يغلق عند الساعة ' + h, fmtMin(st.closeMin, lang));
      } else if(st.openMin !== null && st.openDay === null){
        note.textContent = tCall('opensAt', h=> 'يفتح عند الساعة ' + h, fmtMin(st.openMin, lang));
      } else if(st.openMin !== null){
        note.textContent = tCall('opensOn', (d,h)=> 'يفتح يوم ' + d + ' عند الساعة ' + h, days[st.openDay] || '', fmtMin(st.openMin, lang));
      } else {
        note.textContent = tt('closedWeek','مغلق هذا الأسبوع','Closed this week');
      }
    }
  }
  applyClosedState();
}
updateStatus();
setInterval(updateStatus, 30000);
/* ===== حالة الإغلاق ===== */
let closedNoticeShown = false;
function closedNow(){
  const br = currentBranch() || branches()[0] || null;
  if(!br) return false;
  return !branchStatus(br).open;
}
function orderLocked(){ return closedNow(); }
function applyClosedState(){
  const locked = closedNow();
  document.body.classList.toggle('order-locked', locked);
  const note = el('closedNote');
  if(note) note.classList.toggle('show', locked);
  if(locked && featuredShown()) closeFeatured();
  if(locked && detailShown()) closeDetail();
}
function closedOpenLine(){
  const br = currentBranch() || branches()[0] || null;
  if(!br) return '';
  const st = branchStatus(br);
  if(st.open || st.openMin === null) return '';
  const lang = currentLang;
  const days = T().days || (lang==='ar' ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
  if(st.openDay === null || st.openDay === undefined){
    return lang==='ar' ? ('🕐 يفتح عند الساعة ' + fmtMin(st.openMin, lang)) : ('🕐 Opens at ' + fmtMin(st.openMin, lang));
  }
  return lang==='ar' ? ('🕐 يفتح يوم ' + days[st.openDay] + ' عند الساعة ' + fmtMin(st.openMin, lang)) : ('🕐 Opens on ' + days[st.openDay] + ' at ' + fmtMin(st.openMin, lang));
}
function showClosedNotice(){
  if(closedNoticeShown) return;
  closedNoticeShown = true;
  el('closedTitle').textContent = tt('closedTitle','المطعم مغلق','The Restaurant Closed');
  el('closedText').textContent = tt('closedText','نعتذر منك، المطعم حالياً لا يستقبل الطلبات، ولكن بإمكانك اكتشاف وعرض قائمة الطعام','We are sorry, the restaurant is not accepting orders right now, but you can still explore and view the menu');
  const line = closedOpenLine();
  const openAtEl = el('closedOpenAt');
  openAtEl.textContent = line;
  openAtEl.style.display = line ? '' : 'none';
  el('closedBtn').textContent = tt('closedBtn','عرض قائمة الطعام','View Menu');
  el('closedModal').classList.add('show');
  pushOverlay('closed');
}
function closeClosedNotice(){ el('closedModal').classList.remove('show'); settleOverlay('closed'); }
el('closedBtn').addEventListener('click', ()=>{
  closeClosedNotice();
  const m = el('menu');
  if(m) m.scrollIntoView({behavior:'smooth', block:'start'});
});
el('closedClose').addEventListener('click', closeClosedNotice);
/* ===== الإعلان ===== */
function showAdOnce(){
  const ad = S().ad;
  if(!ad || !ad.enabled) return;
  if(ad.oncePerDay){
    const today = new Date().toDateString();
    if(localStorage.getItem('mk_ad_day') === today) return;
    localStorage.setItem('mk_ad_day', today);
  }
  const ar = currentLang==='ar';
  el('adMedal').textContent = ad.icon || '🍝';
  el('adTitle').textContent = ar ? ad.titleAr : ad.titleEn;
  el('adText').textContent = ar ? ad.textAr : ad.textEn;
  el('adBtn').textContent = ar ? (ad.btnAr || 'حسناً 🍝') : (ad.btnEn || 'Got it 🍝');
  el('adModal').classList.add('show');
  pushOverlay('ad');
}
function closeAd(){ el('adModal').classList.remove('show'); settleOverlay('ad'); }
/* ===== الأكثر مبيعاً ===== */
let featIndex = 0, featAuto = true, featToken = 0, autoTimeout = null;
const featImg = el('featImg');
const featAnim = el('featAnim');
const featCaption = el('featCaption');
const featReady = {};
function withFeatSrc(it, cb){
  const url = itemImgUrl(it);
  if(!url){ cb(itemPlaceholder(it.ar)); return; }
  if(featReady[url]){ cb(featReady[url]); return; }
  const im = new Image();
  im.onload = ()=>{ featReady[url] = url; cb(url); };
  im.onerror = ()=>{ const ph = itemPlaceholder(it.ar); featReady[url] = ph; cb(ph); };
  im.src = url;
}
function renderFeatDots(){
  const items = bestItems();
  const box = el('featDots');
  box.innerHTML = '';
  items.forEach((_,i)=>{
    const d = document.createElement('button');
    d.className='f-dot'; d.setAttribute('aria-label','صنف '+(i+1));
    d.onclick = ()=>{ featAuto=false; stopFeatAuto(); showFeat(i, i>featIndex?'next':'prev', false); };
    box.appendChild(d);
  });
}
function showFeat(i, dir, fromAuto){
  const items = bestItems();
  if(!items.length) return;
  featIndex = (i + items.length) % items.length;
  const item = items[featIndex];
  const myToken = ++featToken;
  withFeatSrc(item, src=>{
    if(myToken !== featToken) return;
    featImg.src = src;
    featImg.alt = itemName(item);
    featCaption.textContent = itemName(item);
    document.querySelectorAll('.f-dot').forEach((d,di)=> d.classList.toggle('active', di===featIndex));
    featAnim.classList.remove('anim-next','anim-prev');
    void featAnim.offsetWidth;
    featAnim.classList.add(dir==='prev' ? 'anim-prev' : 'anim-next');
    if(fromAuto && featAuto) scheduleAuto();
  });
}
function scheduleAuto(){ clearTimeout(autoTimeout); autoTimeout = setTimeout(()=> showFeat(featIndex+1,'next',true), 3500); }
function stopFeatAuto(){ clearTimeout(autoTimeout); autoTimeout = null; }
function startFeatAuto(){ stopFeatAuto(); scheduleAuto(); }
function manualNav(d){ featAuto=false; stopFeatAuto(); showFeat(featIndex+d, d<0?'prev':'next', false); }
function openFeatured(){
  pushOverlay('featured');
  renderFeatDots();
  el('featured').classList.add('show');
  document.body.style.overflow='hidden';
  featAuto = true;
  featIndex = 0;
  showFeat(0,'next',false);
  startFeatAuto();
}
function closeFeatured(){
  el('featured').classList.remove('show');
  document.body.style.overflow='';
  settleOverlay('featured');
  stopFeatAuto();
  showAdOnce();
}
document.addEventListener('click', e=>{
  const bd = e.target.closest('[data-openfeat]');
  if(!bd) return;
  if(closedNow()){ showClosedNotice(); return; }
  openFeatured();
});
let touchX = null;
el('featStage').addEventListener('touchstart', e=>{ touchX = e.touches[0].clientX; }, {passive:true});
el('featStage').addEventListener('touchend', e=>{
  if(touchX===null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if(Math.abs(dx) > 45) manualNav(dx > 0 ? 1 : -1);
  touchX = null;
}, {passive:true});
/* ===== شاشة الترحيب ===== */
let introFinished = false;
const MIN_INTRO_MS = 7000;
const firstVisit = !localStorage.getItem('mk_welcome_seen');
function maybeAdOrClosed(){
  if(closedNow()){ showClosedNotice(); return; }
  showAdOnce();
}
function afterWelcome(){
  maybeAdOrClosed();
}
if(firstVisit){
  localStorage.setItem('mk_welcome_seen','1');
  setTimeout(()=>{
    el('welcome').classList.add('show');
    document.body.style.overflow='hidden';
    pushOverlay('welcome');
  }, 250);
  const assets = ['img/logo.png','img/welcome.png','img/bg.png',
    ...bestItems().map(it=> itemImgUrl(it)).filter(Boolean)];
  let imgLoaded = 0, done = false;
  const tick = ()=>{
    imgLoaded++;
    if(imgLoaded >= assets.length && !done){ done = true; finishIntro(); }
  };
  assets.forEach(src=>{ const im = new Image(); im.onload = im.onerror = tick; im.src = src; });
  setTimeout(()=>{ if(!done){ done = true; finishIntro(); } }, 25000);
} else {
  let loaded = 0, opened = false;
  const imgs = bestItems().map(it=> itemImgUrl(it)).filter(Boolean);
  const open = ()=>{ if(!opened){ opened=true; afterWelcome(); } };
  if(!imgs.length){ setTimeout(open, 400); }
  imgs.forEach(src=>{
    const im = new Image();
    im.onload = im.onerror = ()=>{ loaded++; if(loaded >= imgs.length) open(); };
    im.src = src;
  });
  setTimeout(open, 3000);
}
function finishIntro(){
  if(introFinished) return;
  introFinished = true;
  const wait = Math.max(0, MIN_INTRO_MS - (Date.now() - t0));
  setTimeout(()=>{
    el('welcome').classList.remove('show');
    document.body.style.overflow='';
    settleOverlay('welcome');
    setTimeout(afterWelcome, 400);
  }, wait);
}
function skipIntro(){
  if(introFinished) return;
  introFinished = true;
  el('welcome').classList.remove('show');
  document.body.style.overflow='';
  settleOverlay('welcome');
  afterWelcome();
}
el('welcome').addEventListener('click', e=>{ if(e.target.id==='welcome') skipIntro(); });
/* ===== محرك المسارات الدقيقة (OSRM) ===== */
const OSRM_HOSTS = ['https://routing.openstreetmap.de/routed-car','https://router.project-osrm.org'];
let routeInfo = {};
function round3(n){ return Math.round(n*1000)/1000; }
function routeCacheKey(la, lo, id){
  const bucket = Math.floor(Date.now()/(15*60*1000));
  return 'mk_rc|'+round3(la)+','+round3(lo)+'|'+id+'|'+bucket;
}
function readRouteCache(la, lo, id){ try{ return JSON.parse(localStorage.getItem(routeCacheKey(la,lo,id))) || null; }catch(e){ return null; } }
function writeRouteCache(la, lo, id, val){ try{ localStorage.setItem(routeCacheKey(la,lo,id), JSON.stringify(val)); }catch(e){} }
function trafficFactor(d){
  const day = d.getDay();
  const h = d.getHours() + d.getMinutes()/60;
  if(day >=0 && day <=3){
    if(h >=7 && h <9) return 1.30;
    if(h >=12 && h <14) return 1.15;
    if(h >=16 && h <20) return 1.40;
    if(h >=20 && h <23) return 1.15;
    return 1.0;
  }
  if(day===4){
    if(h >=7 && h <9) return 1.30;
    if(h >=16 && h <23) return 1.35;
    return 1.05;
  }
  if(day===5){
    if(h >=12 && h <14) return 1.25;
    if(h >=16 && h <23) return 1.30;
    return 1.0;
  }
  if(h >=16 && h <23) return 1.25;
  return 1.0;
}
function trafficLevel(f){ return f <1.12 ? 0 : (f <1.3 ? 1 : 2); }
async function osrmRoute(la, lo, b){
  const from = lo+','+la, to = b.lng+','+b.lat;
  let lastErr = null;
  for(const host of OSRM_HOSTS){
    try{
      const r = await fetch(host+'/route/v1/driving/'+from+';'+to+'?overview=false&alternatives=false&steps=false', {cache:'no-store'});
      if(!r.ok) throw new Error('http');
      const j = await r.json();
      const rt = j && j.routes && j.routes[0];
      if(!rt || !rt.distance) throw new Error('empty');
      return { km: rt.distance/1000, sec: rt.duration };
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('route-fail');
}
function routeFallback(la, lo, b){
  const km = hav(la, lo, b.lat, b.lng) * 1.25;
  const sec = (km/35)*3600;
  return { km, sec };
}
let geoBusy = false;
function geoOnce(opts){
  return new Promise((res, rej)=>{ navigator.geolocation.getCurrentPosition(pos=> res(pos), err=> rej(err), opts); });
}
function withWatchdog(promise, ms){
  return new Promise((res, rej)=>{
    const t = setTimeout(()=> rej(new Error('watchdog')), ms);
    promise.then(v=>{ clearTimeout(t); res(v); }, e=>{ clearTimeout(t); rej(e); });
  });
}
/* ===== صفحة التفاصيل ===== */
let dtState = null;
(function injectDetailCss(){
  const st = document.createElement('style');
  st.textContent =
    '.dt-often{margin-top:1rem}' +
    '.dt-often h5{color:var(--ink);font-size:1.05rem;font-weight:900;line-height:1.6}' +
    '.dt-often small{display:block;color:var(--muted);font-weight:700;font-size:.72rem;margin:.1rem 0 .6rem}' +
    '.dt-often-row{display:flex;gap:.7rem;overflow-x:auto;padding:.1rem .1rem .5rem;scrollbar-width:none}' +
    '.dt-often-row::-webkit-scrollbar{display:none}' +
    '.dt-ocard{flex:0 0 150px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:.6rem;' +
    'display:flex;flex-direction:column;gap:.35rem;align-items:center;text-align:center;' +
    'box-shadow:0 2px 8px rgba(90,24,48,.06)}' +
    '.dt-oimg{width:100%;aspect-ratio:1;border-radius:12px;overflow:hidden;' +
    'background-color:var(--phbg);background-image:url("img/bg.png");background-size:cover;background-position:center}' +
    '.dt-oimg img{width:100%;height:100%;object-fit:contain;padding:8%;display:block}' +
    '.dt-ocard b{font-size:.8rem;font-weight:900;color:var(--ink);line-height:1.5;' +
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.dt-oprice{font-size:.72rem;font-weight:800;color:var(--muted)}' +
    '.dt-octrl{margin-top:.15rem}';
  document.head.appendChild(st);
})();
function ensureDetailSheet(){
  if(el('detail')) return el('detail');
  const d = document.createElement('div');
  d.id = 'detail'; d.className = 'detail';
  d.innerHTML = `<div class="dt-card"><div class="dt-hero"><button class="dt-close" id="dtClose">✕</button><img id="dtImg" alt=""></div><div class="dt-body"><h3 id="dtName"></h3><p id="dtDesc" class="dt-desc"></p><span id="dtCal" class="dt-cal"></span><div id="dtSizeWrap"></div><div id="dtMods"></div></div><div class="dt-bar"><div class="dt-step"><button id="dtDec">−</button><span id="dtQty">1</span><button id="dtInc">+</button></div><button id="dtAdd" class="dt-add"></button></div></div>`;
  document.body.appendChild(d);
  el('dtClose').addEventListener('click', closeDetail);
  el('dtInc').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    dtState.qty++;
    renderDetailBar();
  });
  el('dtDec').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    if(dtState.qty > 0) dtState.qty--;
    renderDetailBar();
  });
  el('dtAdd').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    const it = curDetailItem();
    [...cart.keys()].forEach(k=>{
      if(keyId(k) === it.id) cart.delete(k);
    });
    if(dtState.qty > 0){
      cart.set(cartKey(it.id, dtState.sizeIdx),
        {id:it.id, sizeIdx:dtState.sizeIdx, qty:dtState.qty});
    }
    modsRefs(it).forEach(ref=>{
      const q = dtState.sel[ref] || 0;
      const k = cartKey(ref, -1);
      if(q > 0) cart.set(k, {id:ref, sizeIdx:-1, qty:q});
      else cart.delete(k);
    });
    updateCart();
    closeDetail();
    toast(tt('addedToCart','🛒 تمت الإضافة إلى سلتك','🛒 Added to your cart'));
  });
  el('dtSizeWrap').addEventListener('change', e=>{
    if(e.target.id !== 'dtSize' || !dtState) return;
    dtState.sizeIdx = +e.target.value;
    const q = qtyForItemSize(curDetailItem().id, dtState.sizeIdx);
    dtState.qty = q > 0 ? q : 1;
    renderDetailBar();
  });
  el('dtMods').addEventListener('click', e=>{
    const btn = e.target.closest('[data-mact]');
    if(!btn || !dtState) return;
    if(orderLocked()) return;
    const ref = btn.dataset.ref;
    const act = btn.dataset.mact;
    if(act === 'inc'){
      dtState.sel[ref] = (dtState.sel[ref]||0) + 1;
    }
    if(act === 'dec'){
      if(dtState.sel[ref] > 0){
        dtState.sel[ref]--;
        if(dtState.sel[ref] <= 0) delete dtState.sel[ref];
      }
    }
    updateAddOnCard(ref);
    renderDetailBar();
  });
  return d;
}
function curDetailItem(){ return MENU[dtState.si].items[dtState.ii]; }
function detailTotal(){
  const it = curDetailItem();
  let t = itemPrice(it, dtState.sizeIdx) * dtState.qty;
  Object.keys(dtState.sel).forEach(ref=>{
    t += modPriceFor(it, ref) * dtState.sel[ref];
  });
  return t;
}
function renderDetailBar(){
  const TT = T();
  el('dtQty').textContent = dtState.qty;
  el('dtAdd').textContent = (TT.addToCart || 'إضافة للسلة') + ' • ' + detailTotal() + ' ' + TT.currency;
}
function renderDetailMods(){
  const it = curDetailItem();
  const box = el('dtMods');
  const brId = savedBranchId() || '';
  const prevRow = box.querySelector('.dt-often-row');
  const sl = prevRow ? prevRow.scrollLeft : 0;
  const refs = modsRefs(it).filter(ref=> itemAvailable(ref, brId));
  if(!refs.length){ box.innerHTML = ''; return; }
  const ar = (currentLang==='ar');
  const head = ar ? modsTitleAr(it) : modsTitleEn(it);
  const sub = ar ? modsSubAr() : modsSubEn();
  const cards = refs.map(ref=>{
    const rit = findMenuItem(ref);
    const q = dtState.sel[ref] || 0;
    const thumb = itemImgUrl(rit) || itemPlaceholder(rit.ar);
    const ctrl = q > 0
      ? `<span class="dt-mini"><button class="dec" data-mact="dec" data-ref="${ref}">−</button><span>${q}</span><button data-mact="inc" data-ref="${ref}">+</button></span>`
      : `<button class="dt-pick" data-mact="inc" data-ref="${ref}">+</button>`;
    return `<div class="dt-ocard" data-ref="${ref}"><div class="dt-oimg"><img src="${thumb}" alt="${itemName(rit)}" loading="lazy"></div><b>${itemName(rit)}</b><span class="dt-oprice">+${rit.prices[0]} ${T().currency}</span><div class="dt-octrl">${ctrl}</div></div>`;
  }).join('');
  box.innerHTML = `<div class="dt-often">
    <h5>${head}</h5>
    <small>${sub}</small>
    <div class="dt-often-row">${cards}</div>
  </div>`;
  const newRow = box.querySelector('.dt-often-row');
  if(newRow) newRow.scrollLeft = sl;
}
function openDetail(si, ii){
  ensureDetailSheet();
  pushOverlay('detail');
  const it = MENU[si].items[ii];
  let sizeIdx = -1;
  let qty = 0;
  if(it.prices.length > 1){
    sizeIdx = 0;
    for(let i=0;i<it.prices.length;i++){
      const q = qtyForItemSize(it.id, i);
      if(q > 0){ sizeIdx = i; qty = q; break; }
    }
    if(qty === 0){ sizeIdx = 0; qty = 1; }
  } else {
    qty = qtyForItemSize(it.id, -1);
    if(qty === 0) qty = 1;
  }
  const sel = {};
  modsRefs(it).forEach(ref=>{
    const q = qtyForItemSize(ref, -1);
    if(q > 0) sel[ref] = q;
  });
  dtState = { si:si, ii:ii, sizeIdx:sizeIdx, qty:qty, sel:sel };
  const TT = T();
  const DO = displayOpts();
  el('dtImg').src = itemImgUrl(it) || itemPlaceholder(it.ar);
  el('dtName').textContent = itemName(it);
  const desc = itemDesc(it);
  const dEl = el('dtDesc');
  dEl.textContent = desc;
  dEl.style.display = (DO.showDesc && desc) ? '' : 'none';
  const cEl = el('dtCal');
  if(DO.showCal && it.cal){ cEl.textContent = '🔥 ' + it.cal + ' ' + TT.cal; cEl.style.display = ''; }
  else cEl.style.display = 'none';
  const sw = el('dtSizeWrap');
  sw.innerHTML = it.prices.length > 1
    ? `<select id="dtSize" class="dt-size">${it.prices.map((p,i)=>`<option value="${i}"${i===sizeIdx?' selected':''}>${TT.sizes[i]} • ${p} ${TT.currency}</option>`).join('')}</select>`
    : '';
  renderDetailMods();
  renderDetailBar();
  el('detail').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeDetail(){
  if(!detailShown()) return;
  el('detail').classList.remove('show');
  document.body.style.overflow = '';
  dtState = null;
  settleOverlay('detail');
}
/* ===== لوحة المفاتيح والرجوع ===== */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && adShown()){ closeAd(); return; }
  if(e.key==='Escape' && confirmShown()){ resolveConfirm(false); return; }
  if(e.key==='Escape' && installSheet.classList.contains('show')){ closeSheet(); return; }
  if(e.key==='Escape' && closedShown()){ closeClosedNotice(); return; }
  if(e.key==='Escape' && detailShown()){ closeDetail(); return; }
  if(e.key==='Escape' && actionToastShown()){ hideActionToast(); return; }
  if(e.key==='Escape' && searchModeOn()){ closeSearchMode(); return; }
  if(e.key==='Escape' && gateShown()){ closeGate(); return; }
  if(!featuredShown()) return;
  if(e.key==='Escape') closeFeatured();
  else if(e.key==='ArrowLeft') manualNav(1);
  else if(e.key==='ArrowRight') manualNav(-1);
});
let lastBackPress = 0;
window.addEventListener('popstate', ()=>{
  if(overlayStack.length){
    const entry = overlayStack.pop();
    guardOn = false;
    closeByType(entry.type);
    if(LOCK_TYPES.indexOf(entry.type) >= 0) restoreScroll(entry.scrollY);
    if(overlayStack.length) pushGuard();
    return;
  }
  guardOn = false;
  const anyOverlay = welcomeShown() || sheetShown() || drawerShown() || featuredShown() || adShown() || gateShown() || closedShown() || detailShown() || actionToastShown() || el('favSheet').classList.contains('show') || el('slotPicker').classList.contains('show') || confirmShown();
  if(anyOverlay){
    goHome();
    pushGuard();
    return;
  }
  const now = Date.now();
  if(now - lastBackPress < 2500){
    history.back();
  } else {
    lastBackPress = now;
    toast(T().backToExit);
    pushGuard();
  }
});
/* ===== بناء المنيو + بحث ثنائي اللغة ===== */
const cats = el('cats'), search = el('search'), main = el('menu');
const searchStats = el('searchStats'), statsCount = el('statsCount');
let currentSection = 0;
let isSearching = false;
function buildMenu(){
  cats.innerHTML = '';
  main.innerHTML = '';
  const TT = T();
  const DO = displayOpts();
  const soldTxt = tt('soldOut','نفد ❌','Sold out ❌');
  const grayTxt = tt('notAvailableBranch','غير متوفر في هذا الفرع','Not available at this branch');
  const bestTxt = tt('bestBadge','الأكثر مبيعًا','Best Seller');
  const brId = savedBranchId() || '';
  MENU.forEach((sec,si)=>{
    if(sec.hidden === true) return;
    if(sectionViewState(sec, brId) === 'hide') return;
    const views = sec.items.map(it=> (it.hidden === true) ? 'hide' : itemViewState(sec, it, brId));
    const renderable = sec.items.filter((it,idx)=> views[idx] !== 'hide');
    if(!renderable.length) return;
    const secTitle = (currentLang==='ar') ? sec.t : sec.tEn;
    const chip = document.createElement('button');
    chip.className='chip';
    chip.textContent = sec.i+' '+secTitle;
    chip.onclick = ()=>{
      if(isSearching) clearSearch();
      showSection(si, true);
      pauseCats(3000);
      chip.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    };
    cats.appendChild(chip);
    const s = document.createElement('section');
    s.className='section'; s.id='sec-'+si;
    s.innerHTML = `<h3 class="ribbon"><span class="rib-ico">${sec.i}</span> ${secTitle}</h3><div class="${DO.mode==='list'?'listwrap':'grid'}"></div>`;
    const g = s.querySelector('.listwrap, .grid');
    sec.items.forEach((it,ii)=>{
      const view = views[ii];
      if(view === 'hide') return;
      const gray = (view === 'gray');
      const sold = !gray && itemSoldOut(it, brId);
      const prices = it.prices, cal = it.cal, multi = prices.length>1;
      const desc = itemDesc(it);
      const imgURL = itemImgUrl(it);
      const ph = itemPlaceholder(it.ar);
      const mode = (it.imgMode === 'full') ? 'full' : '';
      const calTxt = cal ? ('🔥 '+cal+' '+TT.cal) : TT.zeroCal;
      const priceTxt = multi ? (TT.from+' '+prices[0]+' '+TT.currency) : (prices[0]+' '+TT.currency);
      const bestBadge = isBestSeller(it)
        ? `<span class="c-badge" data-openfeat="1" style="cursor:pointer">🏆 ${bestTxt}</span>` : '';
      const sd = {
        ar: (it.ar||'').toLowerCase(),
        en: (it.en||'').toLowerCase(),
        dar: (it.desc||'').toLowerCase(),
        den: (it.descEn||'').toLowerCase()
      };
      if(DO.mode === 'list'){
        const badges = [];
        if(gray) badges.push(`<span class="l-badge">${grayTxt}</span>`);
        else if(sold) badges.push(`<span class="l-badge sold">${soldTxt}</span>`);
        else if(isBestSeller(it)) badges.push(`<span class="l-badge best" data-openfeat="1">🏆 ${bestTxt}</span>`);
        if(DO.showCal && cal) badges.push(`<span class="l-badge cal">🔥 ${cal} ${TT.cal}</span>`);
        const row = document.createElement('div');
        row.className='lrow' + (gray?' card-gray':'');
        row.dataset.name = sd.ar; row.dataset.en = sd.en;
        row.dataset.dar = sd.dar; row.dataset.den = sd.den;
        row.dataset.si = si; row.dataset.ii = ii;
        row.innerHTML = `
          <div class="l-img"><img class="${mode}" src="${imgURL || ph}" alt="${itemName(it)}" loading="lazy" onerror="this.onerror=null;this.src='${ph}'"></div>
          <div class="l-body">
            <h4>${itemName(it)}</h4>
            ${DO.showDesc && desc ? `<p class="l-desc">${desc}</p>` : ''}
            <div class="l-badges">${badges.join('')}</div>
            <div class="l-price">${priceTxt}</div>
          </div>`;
        g.appendChild(row);
        return;
      }
      const badge = gray ? `<span class="c-badge grayb">${grayTxt}</span>`
        : (sold ? `<span class="c-badge sold">${soldTxt}</span>` : bestBadge);
      const metaParts = [];
      if(DO.showCal) metaParts.push(calTxt);
      if(DO.showDesc && desc) metaParts.push(desc);
      const card = document.createElement('div');
      card.className='card' + (gray?' card-gray':'');
      card.dataset.name = sd.ar; card.dataset.en = sd.en;
      card.dataset.dar = sd.dar; card.dataset.den = sd.den;
      card.dataset.si = si;
      card.dataset.ii = ii;
      card.innerHTML = `
        <div class="c-img">
          <img class="${mode}" src="${imgURL || ph}" alt="${itemName(it)}" loading="lazy"
               onerror="this.onerror=null;this.src='${ph}'">
          ${badge}
          <div class="step ${(sold||gray)?'disabled':''}" data-si="${si}" data-ii="${ii}">
            <button class="st inc" aria-label="إضافة"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
            <span class="qnum">0</span>
            <button class="st dec" aria-label="إنقاص"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
          </div>
        </div>
        <div class="c-body">
          <div class="c-info">
            <h4>${itemName(it)}</h4>
            ${metaParts.length ? `<p class="c-meta">${metaParts.join(' | ')}</p>` : ''}
            ${multi? `<select class="size" ${(sold||gray)?'disabled':''}>${prices.map((p,i)=>`<option value="${i}">${TT.sizes[i]} • ${p} ${TT.currency}</option>`).join('')}</select>`:''}
          </div>
          <div class="c-price">${priceTxt}</div>
        </div>`;
      g.appendChild(card);
    });
    const n = MENU.length;
    const prev = (si-1+n)%n, next = (si+1)%n;
    const nav = document.createElement('div');
    nav.className='sec-nav';
    const prevT = (currentLang==='ar') ? MENU[prev].t : MENU[prev].tEn;
    const nextT = (currentLang==='ar') ? MENU[next].t : MENU[next].tEn;
    nav.innerHTML = `
      <button class="nav-btn" data-go="${prev}">
        <span class="arr">→</span>
        <span class="lbl"><small>${TT.prevSec}</small><b>${MENU[prev].i} ${prevT}</b></span>
      </button>
      <button class="nav-btn" data-go="${next}">
        <span class="lbl"><small>${TT.nextSec}</small><b>${MENU[next].i} ${nextT}</b></span>
        <span class="arr">←</span>
      </button>`;
    s.appendChild(nav);
    main.appendChild(s);
  });
  const calNote = document.createElement('div');
  calNote.className='cal-note';
  calNote.innerHTML = `<span class="cal-icon">🔥</span><span>${TT.calInfo}</span>`;
  main.appendChild(calNote);
  const socBox = document.createElement('div');
  socBox.className = 'menu-social'; socBox.id = 'menuSocial';
  main.appendChild(socBox);
  renderSocial();
}
buildMenu();
/* ===== + / − في الشبكي ===== */
document.addEventListener('click', e=>{
  const b = e.target.closest('.st'); if(!b) return;
  const step = b.closest('.step');
  if(step.classList.contains('disabled')) return;
  if(orderLocked()) return;
  const si = +step.dataset.si, ii = +step.dataset.ii;
  const sec = MENU[si];
  const it = sec.items[ii];
  const brId = savedBranchId() || '';
  if(itemViewState(sec, it, brId) !== 'normal') return;
  if(itemSoldOut(it, brId)) return;
  const sel = step.closest('.card').querySelector('select');
  const sizeIdx = sel ? +sel.value : -1;
  const key = cartKey(it.id, sizeIdx);
  const cur = cart.get(key) || {id:it.id, sizeIdx:sizeIdx, qty:0};
  b.classList.contains('inc') ? cur.qty++ : cur.qty--;
  if(cur.qty <=0) cart.delete(key); else cart.set(key,cur);
  updateCart();
  if(b.classList.contains('inc') && modsRefs(it).length){
    openDetail(si, ii);
  }
});
main.addEventListener('click', e=>{
  const card = e.target.closest('.card');
  if(!card) return;
  if(e.target.closest('.step')) return;
  if(e.target.closest('select')) return;
  if(e.target.closest('[data-openfeat]')) return;
  if(orderLocked()) return;
  const si = +card.dataset.si, ii = +card.dataset.ii;
  const sec = MENU[si], it = sec.items[ii];
  const brId = savedBranchId() || '';
  if(itemViewState(sec, it, brId) !== 'normal') return;
  if(itemSoldOut(it, brId)) return;
  if(!modsRefs(it).length) return;
  openDetail(si, ii);
});
main.addEventListener('click', e=>{
  const row = e.target.closest('.lrow');
  if(!row) return;
  if(e.target.closest('[data-openfeat]')) return;
  if(orderLocked()) return;
  const si = +row.dataset.si, ii = +row.dataset.ii;
  const sec = MENU[si], it = sec.items[ii];
  const brId = savedBranchId() || '';
  const view = itemViewState(sec, it, brId);
  if(view === 'gray'){ toast(T().notAvailableBranch); return; }
  if(itemSoldOut(it, brId)){ toast(T().soldOut); return; }
  openDetail(si, ii);
});
document.addEventListener('change', e=>{ if(e.target.matches('.size')) refreshSteps(); });
function refreshSteps(){
  document.querySelectorAll('.step').forEach(st=>{
    const it = MENU[+st.dataset.si].items[+st.dataset.ii];
    const sel = st.closest('.card').querySelector('select');
    const sizeIdx = sel ? +sel.value : -1;
    const q = qtyForItemSize(it.id, sizeIdx);
    st.querySelector('.qnum').textContent = q;
    st.classList.toggle('on', q >0);
  });
}
main.addEventListener('click', e=>{
  const b = e.target.closest('.nav-btn'); if(!b) return;
  showSection(+b.dataset.go, true);
});
function showSection(si, scroll=false){
  currentSection = si;
  document.querySelectorAll('.section').forEach((s,i)=> s.style.display = (i===si)? '' : 'none');
  document.querySelectorAll('.chip').forEach((c,i)=> c.classList.toggle('active', i===si));
  if(scroll){
    const target = document.getElementById('sec-'+si);
    if(target) requestAnimationFrame(()=>{
      const tb = document.querySelector('.topbar');
      const sr = el('stickyRow');
      const ct = el('cats');
      const off = (tb?tb.offsetHeight:56)+(sr?sr.offsetHeight:66)+(ct?ct.offsetHeight:48)+10;
      const y = target.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({top:y, behavior:'smooth'});
    });
  }
}
showSection(0);
function itemMatches(c, q){
  return (c.dataset.name||'').includes(q)
    || (c.dataset.en||'').includes(q)
    || (c.dataset.dar||'').includes(q)
    || (c.dataset.den||'').includes(q);
}
search.addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.card.highlight, .lrow.highlight').forEach(c=> c.classList.remove('highlight'));
  if(!q){ clearSearch(); return; }
  isSearching = true;
  cats.classList.add('searching');
  searchStats.classList.add('show');
  let firstMatch = null, totalMatches = 0;
  document.querySelectorAll('.section').forEach(s=>{
    s.style.display='';
    let sectionHasMatch = false;
    s.querySelectorAll('.card, .lrow').forEach(c=>{
      const match = itemMatches(c, q);
      c.style.display = match ? '' : 'none';
      if(match){ sectionHasMatch = true; totalMatches++; if(!firstMatch) firstMatch = c; }
    });
    s.style.display = sectionHasMatch ? '' : 'none';
  });
  statsCount.textContent = T().results(totalMatches);
  if(firstMatch){
    setTimeout(()=>{
      firstMatch.scrollIntoView({behavior:'smooth', block:'center'});
      firstMatch.classList.add('highlight');
    }, 150);
  } else {
    toast(T().noResults);
  }
});
function clearSearch(){
  search.value = '';
  isSearching = false;
  cats.classList.remove('searching');
  searchStats.classList.remove('show');
  statsCount.textContent = T().results(0);
  document.querySelectorAll('.card.highlight, .lrow.highlight').forEach(c=> c.classList.remove('highlight'));
  document.querySelectorAll('.section').forEach(s=>{
    s.style.display='';
    s.querySelectorAll('.card, .lrow').forEach(c=> c.style.display = '');
  });
  showSection(currentSection);
}
/* ===== السلة ===== */
const cart = new Map();
try{ (JSON.parse(localStorage.getItem('mk_cart'))||[]).forEach(([k,v])=> cart.set(k,v)); }catch(e){}
function reconcileCart(){
  const brId = savedBranchId() || '';
  let removed = 0, removedMods = false;
  const rebuilt = new Map();
  const addLine = (id, sizeIdx, qty)=>{
    const k = cartKey(id, sizeIdx);
    const cur = rebuilt.get(k) || {id:id, sizeIdx:sizeIdx, qty:0};
    cur.qty += qty;
    rebuilt.set(k, cur);
  };
  cart.forEach((v)=>{
    let id = v.id, sizeIdx = v.sizeIdx, qty = v.qty;
    if(id === undefined){
      const mig = findMenuItemByAr(v.ar);
      if(!mig){ removed++; return; }
      id = mig.id;
    }
    if(!itemAvailable(id, brId)){ removed++; return; }
    const mods = Array.isArray(v.mods) ? v.mods : null;
    if(mods && mods.length){
      addLine(id, sizeIdx, qty);
      mods.forEach(m=>{
        if(!itemAvailable(m.ref, brId)){ removedMods = true; return; }
        addLine(m.ref, -1, qty * (m.qty || 1));
      });
    } else {
      addLine(id, sizeIdx, qty);
    }
  });
  cart.clear();
  rebuilt.forEach((v,k)=> cart.set(k,v));
  if(removed > 0) toast(tt('reconciled','⚠️ أصناف لم تعد متوفرة أُزيلت من طلبك','⚠️ Unavailable items were removed from your order'));
  else if(removedMods) toast(tt('modsInvalid','⚠️ بعض الإضافات لم تعد متوفرة — أُزيلت من طلبك','⚠️ Some add-ons are no longer available — removed from your order'));
}
el('dItems').addEventListener('click', e=>{
  const b = e.target.closest('.q'); if(!b) return;
  if(b.dataset.a==='inc' && orderLocked()) return;
  const item = cart.get(b.dataset.k);
  if(!item) return;
  b.dataset.a==='inc' ? item.qty++ : item.qty--;
  if(item.qty <=0) cart.delete(b.dataset.k);
  updateCart();
  if(detailShown()) renderDetailMods();
});
let confirmResolve = null;
function customConfirm(msg, title){
  return new Promise(res=>{
    confirmResolve = res;
    el('confirmMsg').textContent = msg;
    el('confirmTitle').textContent = title || tt('favReplaceTitle','استبدال الوجبة المحفوظة','Replace Saved Meal');
    el('confirmYes').textContent = tt('favConfirmYes','نعم، استبدال','Yes, Replace');
    el('confirmNo').textContent = tt('favCancel','إلغاء','Cancel');
    el('confirmModal').classList.add('show');
  });
}
function resolveConfirm(val){
  if(!el('confirmModal').classList.contains('show')) return;
  el('confirmModal').classList.remove('show');
  if(confirmResolve){ const r = confirmResolve; confirmResolve = null; r(val); }
}
/* ===== المفضلة ===== */
const FAV_KEY = 'mk_favs_v1';
const MAX_FAVS = 3;
function getFavs(){
  try {
    let f = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    while(f.length < MAX_FAVS) f.push(null);
    return f.slice(0, MAX_FAVS);
  } catch(e) { return [null, null, null]; }
}
function persistFavs(list){ localStorage.setItem(FAV_KEY, JSON.stringify(list)); }
function migrateFavs(){
  const favs = getFavs();
  let changed = false;
  const out = favs.map(f=>{
    if(!f) return null;
    const items = [];
    (f.items||[]).forEach(xi=>{
      let id = null;
      if(xi && xi.id) id = xi.id;
      else if(xi){
        const it = findMenuItemByAr(xi.ar);
        if(it){ id = it.id; changed = true; } else { changed = true; return; }
      }
      if(!id || !findMenuItem(id)){ changed = true; return; }
      const sizeIdx = xi.sizeIdx;
      const qty = xi.qty;
      const mods = Array.isArray(xi.mods) ? xi.mods : null;
      if(mods && mods.length){
        changed = true;
        items.push({id:id, sizeIdx:sizeIdx, qty:qty});
        mods.forEach(m=>{
          if(findMenuItem(m.ref)){
            items.push({id:m.ref, sizeIdx:-1, qty: qty*(m.qty||1)});
          }
        });
      } else {
        items.push({id:id, sizeIdx:sizeIdx, qty:qty});
      }
    });
    if(!items.length){ if(f) changed = true; return null; }
    return { items:items, savedAt: f.savedAt || Date.now() };
  });
  if(changed) persistFavs(out);
}
function renderFavSheet(){
  const favs = getFavs();
  const TT = T();
  const slots = favSlotsArr();
  let html = '';
  favs.forEach((f, i) => {
    if(f){
      const preview = f.items.map(xi=>{
        const it = findMenuItem(xi.id);
        if(!it) return null;
        const size = xi.sizeIdx >= 0 ? (' (' + TT.sizes[xi.sizeIdx] + ')') : '';
        return xi.qty + '× ' + itemName(it) + size;
      }).filter(Boolean).join('، ');
      let total = 0;
      f.items.forEach(xi=>{
        const it = findMenuItem(xi.id);
        if(it) total += xi.qty * itemPrice(it, xi.sizeIdx);
      });
      html += `<div class="fav-card">
        <div class="fav-card-head"><span class="fav-slot-name">${slots[i]}</span><span class="fav-total">${total} ${TT.currency}</span></div>
        <p class="fav-items-preview">${preview}</p>
        <div class="fav-actions">
          <button class="fav-order-btn" onclick="orderFav(${i})">${tt('favOrderNow','🛒 اطلبها الآن','🛒 Order Now')}</button>
          <button class="fav-del-btn" onclick="deleteFav(${i})">${tt('favDelete','🗑 حذف','🗑 Delete')}</button>
        </div></div>`;
    } else {
      html += `<div class="fav-empty-slot">💭 ${tt('favEmptySlot','خانة فارغة — احفظ وجبة من السلة','Empty slot — save a meal from the cart')}</div>`;
    }
  });
  el('favList').innerHTML = html;
}
function openFavSheet(){
  pushOverlay('fav');
  renderFavSheet();
  el('favSheet').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeFavSheet(){
  el('favSheet').classList.remove('show');
  document.body.style.overflow = '';
  settleOverlay('fav');
}
function openSlotPicker(){
  if(!cart.size){ toast(tt('favCartEmpty','⚠️ السلة فارغة، أضف أصنافاً أولاً','⚠️ Cart is empty, add items first')); return; }
  const favs = getFavs();
  const slots = favSlotsArr();
  document.querySelectorAll('#slotBtns .slot-btn').forEach((b, i) => {
    b.innerHTML = slots[i] + (favs[i] ? `<small>✔ ${currentLang==='ar'?'موجودة':'Saved'}</small>` : '');
  });
  pushOverlay('slot');
  el('slotPicker').classList.add('show');
}
function closeSlotPicker(){ el('slotPicker').classList.remove('show'); settleOverlay('slot'); }
async function saveFavToSlot(i){
  const favs = getFavs();
  if(favs[i]){
    const ok = await customConfirm(tt('favOverwrite','هذه الخانة تحتوي على وجبة محفوظة، هل تريد استبدالها؟','This slot already has a saved meal. Replace it?'), favSlotsArr()[i]);
    if(!ok) return;
  }
  const items = [];
  cart.forEach(v=> items.push({id:v.id, sizeIdx:v.sizeIdx, qty:v.qty}));
  favs[i] = { items:items, savedAt: Date.now() };
  persistFavs(favs);
  closeSlotPicker();
  updateFavBadge();
  toast(tt('favSavedOk','✔ تم حفظ الوجبة بنجاح','✔ Meal saved successfully'));
}
function orderFav(i){
  if(orderLocked()) return;
  const f = getFavs()[i];
  if(!f) return;
  const brId = savedBranchId() || '';
  f.items.forEach(xi=>{
    if(!itemAvailable(xi.id, brId)) return;
    const key = cartKey(xi.id, xi.sizeIdx);
    const cur = cart.get(key) || {id:xi.id, sizeIdx:xi.sizeIdx, qty:0};
    cur.qty += xi.qty;
    cart.set(key, cur);
  });
  updateCart();
  closeFavSheet();
  openCart();
  toast(tt('favAddedToCart','🛒 تمت إضافة الوجبة إلى سلتك','🛒 Meal added to your cart'));
}
function deleteFav(i){
  const favs = getFavs();
  favs[i] = null;
  persistFavs(favs);
  renderFavSheet();
  updateFavBadge();
  toast(tt('favDeleted','تم حذف الوجبة','Meal deleted'));
}
el('favFab').addEventListener('click', openFavSheet);
el('saveFavBtn').addEventListener('click', openSlotPicker);
document.querySelectorAll('#slotBtns .slot-btn').forEach(b => {
  b.addEventListener('click', () => saveFavToSlot(+b.dataset.slot));
});
/* ===== شريط الأقسام المتحرك ===== */
let catsDir = 1, catsPauseUntil = 0, catsLast = performance.now(), catsSign = 0;
let catsPos = 0, catsSynced = false;
const CATS_SPEED = 28;
function pauseCats(ms){ catsPauseUntil = performance.now() + (ms || 3000); }
(function initCatsMarquee(){
  function tickCats(now){
    const max = cats.scrollWidth - cats.clientWidth;
    if(max > 5){
      if(!catsSign){
        cats.scrollLeft = -1;
        catsSign = (cats.scrollLeft < 0) ? -1 : 1;
        cats.scrollLeft = 0;
        catsPos = 0;
        catsSynced = true;
      }
      if(now >= catsPauseUntil){
        if(!catsSynced){
          catsPos = Math.min(max, Math.abs(cats.scrollLeft));
          catsSynced = true;
        }
        const dt = Math.min(.05, (now - catsLast)/1000);
        catsPos += dt * CATS_SPEED * catsDir;
        if(catsPos >= max){ catsPos = max; catsDir = -1; }
        else if(catsPos <= 0){ catsPos = 0; catsDir = 1; }
        cats.scrollLeft = catsSign * catsPos;
      } else {
        catsSynced = false;
      }
    }
    catsLast = now;
    requestAnimationFrame(tickCats);
  }
  requestAnimationFrame(tickCats);
})();
cats.addEventListener('pointerdown', ()=> pauseCats(3000), {passive:true});
cats.addEventListener('touchstart', ()=> pauseCats(3000), {passive:true});
cats.addEventListener('wheel', ()=> pauseCats(3000), {passive:true});
/* =====================================================
مكرونجي — سكربت التطبيق الرئيسي (app.js)
v16.0: دمج نظام الطلبات السحابي (رقم 12345A# + تتبع حي)
       مع الحفاظ الكامل على كل وظائف v15.8
===================================================== */

/* ===== إضافة v16: الربط السحابي + أدوات الأمان ===== */
const CLOUD_API = 'https://makaronjy-api.makaronjy.workers.dev'; // ⚠️ غيّره لرابط الـ Worker الفعلي
function sanitize(str){
  if(!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g,'').replace(/javascript:/gi,'').replace(/on\w+=/gi,'').trim().slice(0,1000);
}
function getCustomerInfo(){
  try{ return JSON.parse(localStorage.getItem('mk_customer')) || {name:'',phone:''}; }catch(e){ return {name:'',phone:''}; }
}
function saveCustomerInfo(name, phone){
  try{ localStorage.setItem('mk_customer', JSON.stringify({name:name, phone:phone})); }catch(e){}
}

/* ===== استعادة لقطة محلية عند فشل تحميل الملفات ===== */
(function(){
  if(window.MENU && window.APP_SETTINGS) return;
  try{
    var m = localStorage.getItem('mk_snap_menu');
    var s = localStorage.getItem('mk_snap_settings');
    if(!window.MENU && m) new Function(m)();
    if(!window.APP_SETTINGS && s) new Function(s)();
  }catch(e){}
})();
document.addEventListener('touchstart', e=>{ if(e.touches.length > 1) e.preventDefault(); }, {passive:false});
document.addEventListener('touchmove', e=>{ if(e.touches.length > 1) e.preventDefault(); }, {passive:false});
['gesturestart','gesturechange','gestureend'].forEach(ev=> document.addEventListener(ev, e=> e.preventDefault()));
document.addEventListener('dblclick', e=> e.preventDefault());
const t0 = Date.now();
let guardOn = false;
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
function pushGuard(){
  if(guardOn) return;
  try{ history.pushState({rb:1}, ''); guardOn = true; }catch(e){}
}
/* ===== Stack للنوافذ: حالة تاريخ + موضع تمرير لكل نافذة ===== */
let overlayStack = [];
const LOCK_TYPES = ['detail','featured','sidemenu','fav','slot','welcome'];
function restoreScroll(y){
  setTimeout(()=>{ window.scrollTo({top:y, behavior:'instant'}); }, 30);
}
function pushOverlay(type){
  const scrollY = window.scrollY || window.pageYOffset || 0;
  overlayStack.push({ type, scrollY });
  try{ history.pushState({rb:1, ov:type}, ''); guardOn = true; }catch(e){}
}
function dropOverlay(type){
  for(let i=overlayStack.length-1;i>=0;i--){
    if(overlayStack[i].type===type){
      return overlayStack.splice(i,1)[0];
    }
  }
  return null;
}
function settleOverlay(type){
  const en = dropOverlay(type);
  if(en && LOCK_TYPES.indexOf(type) >= 0) restoreScroll(en.scrollY);
  return en;
}
function closeByType(t){
  if(t==='detail') closeDetail();
  else if(t==='cart') closeCart();
  else if(t==='sidemenu') closeSideMenu();
  else if(t==='fav') closeFavSheet();
  else if(t==='slot') closeSlotPicker();
  else if(t==='otp') closeOrderType();
  else if(t==='search') closeSearchMode();
  else if(t==='toast') hideActionToast();
  else if(t==='featured') closeFeatured();
  else if(t==='ad') closeAd();
  else if(t==='closed') closeClosedNotice();
  else if(t==='sheet') closeSheet();
  else if(t==='welcome') {
    introFinished = true;
    el('welcome').classList.remove('show');
    document.body.style.overflow='';
  }
}
pushGuard();
document.addEventListener('DOMContentLoaded', pushGuard);
window.addEventListener('load', pushGuard);
window.addEventListener('pageshow', pushGuard);
function el(id){ return document.getElementById(id); }
function toast(msg){
  const t = el('toastMsg');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(()=> t.classList.remove('show'), 2600);
}
function welcomeShown(){ return el('welcome').classList.contains('show'); }
function sheetShown(){ return el('installSheet').classList.contains('show'); }
function drawerShown(){ return el('drawer').classList.contains('show'); }
function featuredShown(){ return el('featured').classList.contains('show'); }
function confirmShown(){ return el('confirmModal').classList.contains('show'); }
function adShown(){ return el('adModal').classList.contains('show'); }
function closedShown(){ return el('closedModal').classList.contains('show'); }
function detailShown(){ const d = el('detail'); return !!d && d.classList.contains('show'); }
function tt(key, ar, en){
  const v = (window.I18N && T()[key] !== undefined) ? T()[key] : undefined;
  return (v !== undefined && typeof v !== 'function') ? v : (currentLang==='ar' ? ar : en);
}
function tFn(key, arg, arFn, enFn){
  const v = T()[key];
  if(typeof v === 'function') return v(arg);
  return currentLang==='ar' ? arFn(arg) : enFn(arg);
}
function tCall(key, fallbackFn, ...args){
  const v = T()[key];
  if(typeof v === 'function') return v(...args);
  return fallbackFn(...args);
}
function favSlotsArr(){
  const v = T().favSlots;
  return Array.isArray(v) ? v : (currentLang==='ar' ? ['فطور 🌅','غداء ☀️','عشاء 🌙'] : ['Breakfast 🌅','Lunch ☀️','Dinner 🌙']);
}
function S(){ return window.APP_SETTINGS; }
function branches(){ return S().branches; }
function savedBranchId(){ return localStorage.getItem('mk_branch'); }
function currentBranch(){ return branches().find(b=>b.id===savedBranchId()) || null; }
function branchName(b){ return (currentLang==='ar') ? b.nameAr : b.nameEn; }
function brandName(){ return (currentLang==='ar') ? S().brand.nameAr : S().brand.nameEn; }
function brandTag(){ return (currentLang==='ar') ? S().brand.tagAr : S().brand.tagEn; }
function brandize(str){
  if(typeof str !== 'string') return str;
  return str.replace(/مكرونجي/g, S().brand.nameAr).replace(/Makaronjy/g, S().brand.nameEn);
}
function bestSellers(){ return Array.isArray(S().bestSellers) ? S().bestSellers : []; }
function bestItems(){ return bestSellers().map(id=> findMenuItem(id)).filter(Boolean); }
function isBestSeller(it){ return bestSellers().includes(it.id); }
function itemImgUrl(it){ return it.imgv ? ('img/items/' + it.id + '.png?v=' + it.imgv) : null; }
function itemPlaceholder(name){
  const safe = String(name).replace(/[&<>"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#e8a04c"/><rect y="330" width="800" height="80" fill="#8e2a4a"/><text x="400" y="290" font-size="90" text-anchor="middle">🍝</text><text x="400" y="500" font-size="40" text-anchor="middle" fill="#8e2a4a" font-family="Cairo,sans-serif" font-weight="bold">${safe}</text><text x="400" y="555" font-size="24" text-anchor="middle" fill="#f2b95f" font-family="Cairo,sans-serif">مكرونجي ⭐</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function branchNum(b){
  if(b && typeof b.num === 'number' && isFinite(b.num) && b.num >= 1) return b.num;
  const i = branches().indexOf(b);
  return i >= 0 ? i+1 : 1;
}
function branchCode(b){ return 'B' + branchNum(b); }
function generateInvoiceID(code){
  const now = new Date();
  const hours = String(now.getHours()).padStart(2,'0');
  const minutes = String(now.getMinutes()).padStart(2,'0');
  const milliseconds = String(now.getMilliseconds()).padStart(3,'0');
  const randomChar = Math.random().toString(36).substring(2,3).toUpperCase();
  return `${code}-${hours}${minutes}${milliseconds}-${randomChar}`;
}
function hav(la1,lo1,la2,lo2){
  const R=6371, r=d=>d*Math.PI/180;
  const dLa=r(la2-la1), dLo=r(lo2-lo1);
  const a=Math.sin(dLa/2)**2 + Math.cos(r(la1))*Math.cos(r(la2))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}
function findMenuItem(id){
  for(const s of MENU){ const it = s.items.find(x=>x.id===id); if(it) return it; }
  return null;
}
function findMenuItemByAr(name){
  for(const s of MENU){ const it = s.items.find(x=>x.ar===name); if(it) return it; }
  return null;
}
function findSectionOfItem(id){
  for(const s of MENU){ if(s.items.some(x=>x.id===id)) return s; }
  return null;
}
function itemSoldOut(it, brId){ return Array.isArray(it.so) && it.so.includes(brId); }
function itemPrice(it, sizeIdx){ return it.prices[sizeIdx >=0 ? sizeIdx : 0]; }
function itemDesc(it){
  const d = (currentLang==='ar') ? it.desc : (it.descEn || it.desc);
  return d || '';
}
function secAvailAt(sec, brId){ return !Array.isArray(sec.only) || !sec.only.length || sec.only.includes(brId); }
function itAvailAt(it, brId){ return !Array.isArray(it.only) || !it.only.length || it.only.includes(brId); }
function sectionViewState(sec, brId){
  if(secAvailAt(sec, brId)) return 'normal';
  return (sec.miss === 'hide') ? 'hide' : 'gray';
}
function itemViewState(sec, it, brId){
  const sA = secAvailAt(sec, brId);
  const iA = itAvailAt(it, brId);
  if(!sA && !iA) return (it.miss === 'hide') ? 'hide' : 'gray';
  if(!sA) return (sec.miss === 'hide') ? 'hide' : 'gray';
  if(!iA) return (it.miss === 'hide') ? 'hide' : 'gray';
  return 'normal';
}
function itemAvailable(id, brId){
  const it = findMenuItem(id);
  const sec = findSectionOfItem(id);
  if(!it || !sec) return false;
  if(it.hidden === true) return false;
  if(itemSoldOut(it, brId)) return false;
  return itemViewState(sec, it, brId) === 'normal';
}
/* ===== خيارات العرض ===== */
function displayOpts(){
  const d = (S() && S().display) || {};
  return {
    mode: (d.mode === 'list') ? 'list' : 'grid',
    showDesc: d.showDesc !== false,
    showCal: d.showCal !== false
  };
}
/* ===== الإضافات ===== */
function modsRefs(it){
  if(!it.mods) return [];
  if(Array.isArray(it.mods)){
    const out = [];
    it.mods.forEach(g=>{
      (g.opts||[]).forEach(o=>{
        if(out.indexOf(o.ref) < 0) out.push(o.ref);
      });
    });
    return out;
  }
  return Array.isArray(it.mods.refs) ? it.mods.refs.slice() : [];
}
function modsTitleAr(it){
  if(it.mods && !Array.isArray(it.mods) && it.mods.tAr) return it.mods.tAr;
  if(Array.isArray(it.mods) && it.mods.length && it.mods[0].tAr) return it.mods[0].tAr;
  return tt('oftenWith','غالبًا ما يتم طلبه مع','Often ordered with');
}
function modsTitleEn(it){
  if(it.mods && !Array.isArray(it.mods) && it.mods.tEn) return it.mods.tEn;
  if(Array.isArray(it.mods) && it.mods.length && it.mods[0].tEn) return it.mods[0].tEn;
  return tt('oftenWithEn','Often ordered with','Often ordered with');
}
function modsSubAr(){ return tt('oftenWithSub','عادة ما يضيف الأشخاص هذه العناصر','People usually add these items'); }
function modsSubEn(){ return tt('oftenWithSubEn','People usually add these items','People usually add these items'); }
function modPriceFor(it, ref){
  const rit = findMenuItem(ref);
  return rit ? rit.prices[0] : 0;
}
/* ===== تحديث موضعي لبطاقة إضافة واحدة (بدون وميض) ===== */
function updateAddOnCard(ref){
  const box = el('dtMods');
  if(!box || !dtState) return;
  const card = box.querySelector('.dt-ocard[data-ref="'+ref+'"]');
  if(!card) return;
  const ctrl = card.querySelector('.dt-octrl');
  if(!ctrl) return;
  const q = dtState.sel[ref] || 0;
  if(q > 0){
    ctrl.innerHTML = '<span class="dt-mini"><button class="dec" data-mact="dec" data-ref="'+ref+'">−</button><span>'+q+'</span><button data-mact="inc" data-ref="'+ref+'">+</button></span>';
  } else {
    ctrl.innerHTML = '<button class="dt-pick" data-mact="inc" data-ref="'+ref+'">+</button>';
  }
}
/* ===== مفاتيح السلة ===== */
function cartKey(id, sizeIdx){ return id+'|'+sizeIdx; }
function keyId(k){ return String(k).split('|')[0]; }
function keySize(k){ return +String(k).split('|')[1]; }
function qtyForItemSize(id, sizeIdx){
  let q = 0;
  cart.forEach((v,k)=>{
    if(keyId(k) === id && keySize(k) === sizeIdx) q += v.qty;
  });
  return q;
}
function normHM(t){
  if(t && typeof t === 'object') return { h:(t.h|0), m:(t.m|0) };
  const n = Math.floor(+t) || 0;
  return { h:n, m:0 };
}
function hmToMin(t){ const o = normHM(t); return o.h*60 + o.m; }
function defaultSchedule(){
  const H = S().hours || { open:{h:13,m:0}, close:{h:2,m:0} };
  const o = normHM(H.open), c = normHM(H.close);
  return [0,1,2,3,4,5,6].map(()=> ({ o:{h:o.h,m:o.m}, c:{h:c.h,m:c.m} }));
}
function branchSchedule(br){
  if(br && Array.isArray(br.hours) && br.hours.length === 7){
    return br.hours.map(d=> ({ o:normHM(d.o), c:normHM(d.c), closed:!!d.closed }));
  }
  return defaultSchedule();
}
function within(tMin, d){
  if(!d || d.closed) return false;
  const o = hmToMin(d.o), c = hmToMin(d.c);
  if(o < c) return tMin >= o && tMin < c;
  if(o > c) return tMin >= o || tMin < c;
  return false;
}
function branchStatus(br){
  const sched = branchSchedule(br);
  const now = new Date();
  const day = now.getDay();
  const tMin = now.getHours()*60 + now.getMinutes();
  const today = sched[day];
  const yest = sched[(day+6)%7];
  if(yest && !yest.closed && hmToMin(yest.o) > hmToMin(yest.c) && tMin < hmToMin(yest.c)) return {open:true, closeMin:hmToMin(yest.c)}};
  if(within(tMin, today)) return {open:true, closeMin:hmToMin(today.c)};
  if(today && !today.closed && tMin < hmToMin(today.o)) return {open:false, openMin:hmToMin(today.o), openDay:null};
  for(let i=1;i<=7;i++){
    const d=(day+i)%7;
    const ds=sched[d];
    if(ds && !ds.closed) return {open:false, openMin:hmToMin(ds.o), openDay:d};
  }
  return {open:false, openMin:null, openDay:null};
}
function fmtMin(min, lang){
  let h = Math.floor(min/60) % 24;
  const m = min % 60;
  const ampm = h < 12 ? (lang==='ar'?'ص':'AM') : (lang==='ar'?'م':'PM');
  let h12 = h % 12; if(h12 === 0) h12 = 12;
  const pad = n=> String(n).padStart(2,'0');
  if(lang==='ar'){
    const arDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const toAr = s=> String(s).split('').map(d=> arDigits[+d]).join('');
    return toAr(h12) + (m ? ':' + toAr(pad(m)) : '') + ' ' + ampm;
  }
  return h12 + (m ? ':' + pad(m) : '') + ' ' + ampm;
}
let currentLang = localStorage.getItem('mk_lang') || 'ar';
function T(){ return window.I18N[currentLang]; }
function itemName(it){ return (currentLang==='ar') ? it.ar : it.en; }
let deferredPrompt = null;
const installBtn = el('installBtn');
const installSheet = el('installSheet');
const sheetBody = el('sheetBody');
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
function runningAsApp(){
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         window.navigator.standalone === true;
}
function refreshInstallBtn(){
  const installed = runningAsApp() || localStorage.getItem('mk_app_installed') === '1';
  installBtn.classList.toggle('show', !installed);
}
if(runningAsApp()){
  localStorage.setItem('mk_app_installed','1');
  document.body.classList.add('is-app');
}
refreshInstallBtn();
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredPrompt = e; });
window.addEventListener('appinstalled', ()=>{
  localStorage.setItem('mk_app_installed','1');
  refreshInstallBtn();
  toast(T().installed);
});
function fillSheet(){ sheetBody.innerHTML = isIOS ? T().iosSteps : T().otherSteps; }
function installApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(res=>{
      if(res.outcome==='accepted'){
        localStorage.setItem('mk_app_installed','1');
        refreshInstallBtn();
      }
      deferredPrompt = null;
    });
  } else {
    fillSheet();
    installSheet.classList.add('show');
    pushOverlay('sheet');
  }
}
function closeSheet(){ installSheet.classList.remove('show'); settleOverlay('sheet'); }
/* ===== أيقونات التواصل ===== */
const SOC_SVG = {
  instagram:'<svg viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8C2 4.6 4.6 2 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4m.9 2.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.83 5.7 3.24 0 5.81-2.35 5.81-5.7l.03-6.14c1.15.82 2.53 1.27 3.97 1.27V7.34c-1.28 0-2.46-.55-3.2-1.52z"/></svg>',
  email:'<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
  x:'<svg viewBox="0 0 24 24"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z"/></svg>',
  youtube:'<svg viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.13L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4 .19-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.13L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>',
  whatsapp:'<svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73 2.08.89 2.5.71 2.95.66.45-.04 1.45-.59 1.65-1.16.21-.57.21-1 .05-1.16-.16-.17-1.16-.06-1.23-.16-.48-.27-.14-1.47-.73-1.69-.81-.23-.08-.38-.12-.55-.12-.16-.25-.64-.81-.78-.97-.15-.17-.29-.19-.53-.06-.25.12-1.05.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.37.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.55-.43-.14 0-.3-.01-.46-.01z"/></svg>',
  custom:'<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>'
};
const SOC_EMOJI = { snapchat:{ch:'👻', bg:'#FFFC00'} };
function socEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function socialList(){
  const s = S().social;
  if(Array.isArray(s)) return s.filter(x=> x && x.url).slice(0,5);
  const out = [];
  if(s && s.instagram) out.push({key:'instagram', nameAr:'انستقرام', nameEn:'Instagram', url:s.instagram});
  if(s && s.tiktok) out.push({key:'tiktok', nameAr:'تيك توك', nameEn:'TikTok', url:s.tiktok});
  return out.slice(0,5);
}
function socialHref(x){
  if(x.key==='email') return /^mailto:/i.test(x.url) ? x.url : ('mailto:'+x.url);
  return x.url;
}
function renderSocial(){
  const list = socialList();
  const html = list.map(x=>{
    const em = SOC_EMOJI[x.key];
    const ic = em ? em.ch : (SOC_SVG[x.key] || SOC_SVG.custom);
    const cls = em ? ' class="soc-emoji"' : '';
    const stl = em ? ' style="background:'+em.bg+';border-color:transparent"' : '';
    const nm = socEsc(currentLang==='ar' ? (x.nameAr||x.nameEn||'') : (x.nameEn||x.nameAr||''));
    return '<a href="'+socEsc(socialHref(x))+'"'+cls+stl+' target="_blank" rel="noopener noreferrer" aria-label="'+nm+'">'+ic+'</a>';
  }).join('');
  const sm = el('smSocial');
  if(sm) sm.innerHTML = html;
  const smT = el('smSocialTitle');
  if(smT){
    smT.textContent = tt('followUs','تابعنا على','Follow us on');
    smT.style.display = list.length ? '' : 'none';
  }
}
/* ===== إصدار الصور ===== */
function imagesVersion(){ const s = S(); return (s && s.imagesVersion) || 0; }
function applyImageVersions(){
  const v = imagesVersion();
  document.querySelectorAll('img[data-appimg]').forEach(im=>{
    const p = im.getAttribute('data-appimg');
    const want = p + (v ? '?v='+v : '');
    if(im.getAttribute('src') !== want) im.src = want;
  });
}
/* ===== شركاء التوصيل: احتياطي مدمج ===== */
const DEFAULT_DELIVERY_APPS = [
  { id:'d-jahez', nameAr:'جاهز', nameEn:'Jahez', url:'https://jahez.go.link/avE5E', color:'#e30613', img:'img/d-jahez.png' },
  { id:'d-hungerstation', nameAr:'هنقرستيشن', nameEn:'HungerStation', url:'https://hungerstation.go.link/?c=SA&s=c&v=96730', color:'#ffb700', img:'img/d-hungerstation.png' },
  { id:'d-keeta', nameAr:'كيتا', nameEn:'Keeta', url:'https://url.mykeeta.com/qXA45r7z', color:'#ffd400', img:'img/d-keeta.png' }
];
function deliveryApps(){
  const d = S().delivery;
  return (Array.isArray(d) && d.length) ? d : DEFAULT_DELIVERY_APPS;
}
function renderDelivery(){
  const d = deliveryApps();
  const box = el('otpApps');
  if(!box) return;
  if(!d.length){ box.innerHTML = ''; return; }
  const name = x=> currentLang==='ar' ? x.nameAr : (x.nameEn || x.nameAr);
  box.innerHTML = `<div class="gd-tiles">${d.map((x,i)=>`<button class="gd-btn" aria-label="${name(x)}" onclick="return openDeliveryApp(event, ${i});">
    <img src="${x.img || 'img/missing.png'}" alt="${name(x)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <span class="gd-fallback" style="display:none;background:${x.color || '#8e2a4a'}">${name(x).charAt(0)}</span>
    <span class="gd-name">${name(x)}</span></button>`).join('')}</div>`;
}
function openDeliveryApp(event, idx){
  event.preventDefault();
  const d = deliveryApps();
  const x = d[idx];
  if(!x) return false;
  window.location.href = x.url;
  setTimeout(()=>{
    if(!document.hidden){
      const w = window.open(x.url, '_blank');
      if(!w) window.location.href = x.url;
    }
  }, 1500);
  return false;
}
/* ===== أكورديون تطبيقات التوصيل: زر واحد + طي ذكي ===== */
let appsAutoTimer = null;
function appsZoneOpen(){
  const z = el('otpAppsZone');
  return !!z && z.classList.contains('apps-open');
}
function clearAppsAutoTimer(){
  if(appsAutoTimer){ clearTimeout(appsAutoTimer); appsAutoTimer = null; }
}
function collapseAppsPanel(){
  const z = el('otpAppsZone');
  if(!z) return;
  z.classList.remove('apps-open');
  const b = el('otpAppsToggle');
  if(b) b.setAttribute('aria-expanded','false');
  clearAppsAutoTimer();
}
function armAppsAutoTimer(){
  clearAppsAutoTimer();
  appsAutoTimer = setTimeout(collapseAppsPanel, 5000);
}
function expandAppsPanel(){
  const z = el('otpAppsZone');
  if(!z) return;
  z.classList.add('apps-open');
  const b = el('otpAppsToggle');
  if(b) b.setAttribute('aria-expanded','true');
  armAppsAutoTimer();
}
function ensureAppsAccordion(){
  const zone = el('otpAppsZone');
  if(!zone || el('otpAppsToggle')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'otp-apps-toggle';
  btn.id = 'otpAppsToggle';
  btn.setAttribute('aria-expanded','false');
  btn.innerHTML =
    '<span class="oat-txt">' +
      '<span class="oat-main">🛵 <span id="otpAppsToggleLbl"></span></span>' +
      '<span class="oat-sub" id="otpAppsToggleSub"></span>' +
    '</span>' +
    '<span class="oat-chev">⌄</span>';
  const panel = document.createElement('div');
  panel.className = 'otp-apps-panel';
  panel.id = 'otpAppsPanel';
  while(zone.firstChild) panel.appendChild(zone.firstChild);
  zone.appendChild(btn);
  zone.appendChild(panel);
  btn.addEventListener('click', ()=>{
    if(appsZoneOpen()) collapseAppsPanel(); else expandAppsPanel();
  });
  zone.addEventListener('pointerdown', ()=>{
    if(appsZoneOpen()) armAppsAutoTimer();
  }, {passive:true});
  document.addEventListener('click', (e)=>{
    if(!appsZoneOpen()) return;
    if(zone.contains(e.target)) return;
    collapseAppsPanel();
  }, true);
}
ensureAppsAccordion();
/* ===== اللغة ===== */
function applyLang(lang){
  currentLang = lang;
  localStorage.setItem('mk_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang==='ar') ? 'rtl' : 'ltr';
  document.title = brandize(T().docTitle);
  document.querySelectorAll('.lang-seg').forEach(s=> s.classList.toggle('active', s.dataset.lang===lang));
  document.querySelectorAll('[data-i18n]').forEach(elm=>{
    const key = elm.getAttribute('data-i18n');
    const val = T()[key];
    if(val===undefined || typeof val === 'function') return;
    if(elm.hasAttribute('data-i18n-html')) elm.innerHTML = brandize(val);
    else elm.textContent = brandize(val);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(elm=>{
    const val = T()[elm.getAttribute('data-i18n-ph')];
    if(val) elm.placeholder = val;
  });
  const bn = document.querySelector('[data-i18n="brandName"]');
  if(bn) bn.textContent = brandName();
  const bt = document.querySelector('[data-i18n="brandTag"]');
  if(bt) bt.textContent = brandTag();
  el('confirmYes').textContent = tt('favConfirmYes','نعم، استبدال','Yes, Replace');
  el('confirmNo').textContent = tt('favCancel','إلغاء','Cancel');
  const cbl = el('changeBranchLbl');
  if(cbl) cbl.textContent = tt('changeBranch','تغيير الفرع','Change Branch');
  el('closedNoteTxt').textContent = tt('closedNote','مغلق يرجى العودة لاحقاً','Closed — please come back later');
  updateBranchFooter();
  renderSocial();
  renderDelivery();
  applyImageVersions();
  if(installSheet.classList.contains('show')) fillSheet();
  if(detailShown()) closeDetail();
  search.value = '';
  isSearching = false;
  cats.classList.remove('searching');
  searchStats.classList.remove('show');
  updateStatus();
  buildMenu();
  showSection(currentSection, false);
  refreshSteps();
  updateCart();
  updateFavBadge();
  if(el('favSheet').classList.contains('show')) renderFavSheet();
  setTimeout(()=>{ catsSign = 0; catsPos = 0; cats.scrollLeft = 0; }, 50);
}
function toggleLang(){ applyLang(currentLang==='ar' ? 'en' : 'ar'); }
/* ===== الحالة (داخلية فقط) ===== */
function updateStatus(){
  const pill = el('statusPill');
  const txt = el('statusText');
  const note = el('statusNote');
  if(pill && txt && note){
    const br = currentBranch() || branches()[0] || null;
    if(!br){
      pill.classList.remove('open'); pill.classList.add('closed');
      txt.textContent = T().closed; note.textContent = '';
    } else {
      const st = branchStatus(br);
      const lang = currentLang;
      const days = T().days || (lang==='ar' ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
      pill.classList.toggle('open', st.open);
      pill.classList.toggle('closed', !st.open);
      txt.textContent = st.open ? T().open : T().closed;
      if(st.open){
        note.textContent = tCall('closesAt', h=> 'يغلق عند الساعة ' + h, fmtMin(st.closeMin, lang));
      } else if(st.openMin !== null && st.openDay === null){
        note.textContent = tCall('opensAt', h=> 'يفتح عند الساعة ' + h, fmtMin(st.openMin, lang));
      } else if(st.openMin !== null){
        note.textContent = tCall('opensOn', (d,h)=> 'يفتح يوم ' + d + ' عند الساعة ' + h, days[st.openDay] || '', fmtMin(st.openMin, lang));
      } else {
        note.textContent = tt('closedWeek','مغلق هذا الأسبوع','Closed this week');
      }
    }
  }
  applyClosedState();
}
updateStatus();
setInterval(updateStatus, 30000);
/* ===== حالة الإغلاق ===== */
let closedNoticeShown = false;
function closedNow(){
  const br = currentBranch() || branches()[0] || null;
  if(!br) return false;
  return !branchStatus(br).open;
}
function orderLocked(){ return closedNow(); }
function applyClosedState(){
  const locked = closedNow();
  document.body.classList.toggle('order-locked', locked);
  const note = el('closedNote');
  if(note) note.classList.toggle('show', locked);
  if(locked && featuredShown()) closeFeatured();
  if(locked && detailShown()) closeDetail();
}
function closedOpenLine(){
  const br = currentBranch() || branches()[0] || null;
  if(!br) return '';
  const st = branchStatus(br);
  if(st.open || st.openMin === null) return '';
  const lang = currentLang;
  const days = T().days || (lang==='ar' ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
  if(st.openDay === null || st.openDay === undefined){
    return lang==='ar' ? ('🕐 يفتح عند الساعة ' + fmtMin(st.openMin, lang)) : ('🕐 Opens at ' + fmtMin(st.openMin, lang));
  }
  return lang==='ar' ? ('🕐 يفتح يوم ' + days[st.openDay] + ' عند الساعة ' + fmtMin(st.openMin, lang)) : ('🕐 Opens on ' + days[st.openDay] + ' at ' + fmtMin(st.openMin, lang));
}
function showClosedNotice(){
  if(closedNoticeShown) return;
  closedNoticeShown = true;
  el('closedTitle').textContent = tt('closedTitle','المطعم مغلق','The Restaurant Closed');
  el('closedText').textContent = tt('closedText','نعتذر منك، المطعم حالياً لا يستقبل الطلبات، ولكن بإمكانك اكتشاف وعرض قائمة الطعام','We are sorry, the restaurant is not accepting orders right now, but you can still explore and view the menu');
  const line = closedOpenLine();
  const openAtEl = el('closedOpenAt');
  openAtEl.textContent = line;
  openAtEl.style.display = line ? '' : 'none';
  el('closedBtn').textContent = tt('closedBtn','عرض قائمة الطعام','View Menu');
  el('closedModal').classList.add('show');
  pushOverlay('closed');
}
function closeClosedNotice(){ el('closedModal').classList.remove('show'); settleOverlay('closed'); }
el('closedBtn').addEventListener('click', ()=>{
  closeClosedNotice();
  const m = el('menu');
  if(m) m.scrollIntoView({behavior:'smooth', block:'start'});
});
el('closedClose').addEventListener('click', closeClosedNotice);
/* ===== الإعلان ===== */
function showAdOnce(){
  const ad = S().ad;
  if(!ad || !ad.enabled) return;
  if(ad.oncePerDay){
    const today = new Date().toDateString();
    if(localStorage.getItem('mk_ad_day') === today) return;
    localStorage.setItem('mk_ad_day', today);
  }
  const ar = currentLang==='ar';
  el('adMedal').textContent = ad.icon || '🍝';
  el('adTitle').textContent = ar ? ad.titleAr : ad.titleEn;
  el('adText').textContent = ar ? ad.textAr : ad.textEn;
  el('adBtn').textContent = ar ? (ad.btnAr || 'حسناً 🍝') : (ad.btnEn || 'Got it 🍝');
  el('adModal').classList.add('show');
  pushOverlay('ad');
}
function closeAd(){ el('adModal').classList.remove('show'); settleOverlay('ad'); }
/* ===== الأكثر مبيعاً ===== */
let featIndex = 0, featAuto = true, featToken = 0, autoTimeout = null;
const featImg = el('featImg');
const featAnim = el('featAnim');
const featCaption = el('featCaption');
const featReady = {};
function withFeatSrc(it, cb){
  const url = itemImgUrl(it);
  if(!url){ cb(itemPlaceholder(it.ar)); return; }
  if(featReady[url]){ cb(featReady[url]); return; }
  const im = new Image();
  im.onload = ()=>{ featReady[url] = url; cb(url); };
  im.onerror = ()=>{ const ph = itemPlaceholder(it.ar); featReady[url] = ph; cb(ph); };
  im.src = url;
}
function renderFeatDots(){
  const items = bestItems();
  const box = el('featDots');
  box.innerHTML = '';
  items.forEach((_,i)=>{
    const d = document.createElement('button');
    d.className='f-dot'; d.setAttribute('aria-label','صنف '+(i+1));
    d.onclick = ()=>{ featAuto=false; stopFeatAuto(); showFeat(i, i>featIndex?'next':'prev', false); };
    box.appendChild(d);
  });
}
function showFeat(i, dir, fromAuto){
  const items = bestItems();
  if(!items.length) return;
  featIndex = (i + items.length) % items.length;
  const item = items[featIndex];
  const myToken = ++featToken;
  withFeatSrc(item, src=>{
    if(myToken !== featToken) return;
    featImg.src = src;
    featImg.alt = itemName(item);
    featCaption.textContent = itemName(item);
    document.querySelectorAll('.f-dot').forEach((d,di)=> d.classList.toggle('active', di===featIndex));
    featAnim.classList.remove('anim-next','anim-prev');
    void featAnim.offsetWidth;
    featAnim.classList.add(dir==='prev' ? 'anim-prev' : 'anim-next');
    if(fromAuto && featAuto) scheduleAuto();
  });
}
function scheduleAuto(){ clearTimeout(autoTimeout); autoTimeout = setTimeout(()=> showFeat(featIndex+1,'next',true), 3500); }
function stopFeatAuto(){ clearTimeout(autoTimeout); autoTimeout = null; }
function startFeatAuto(){ stopFeatAuto(); scheduleAuto(); }
function manualNav(d){ featAuto=false; stopFeatAuto(); showFeat(featIndex+d, d<0?'prev':'next', false); }
function openFeatured(){
  pushOverlay('featured');
  renderFeatDots();
  el('featured').classList.add('show');
  document.body.style.overflow='hidden';
  featAuto = true;
  featIndex = 0;
  showFeat(0,'next',false);
  startFeatAuto();
}
function closeFeatured(){
  el('featured').classList.remove('show');
  document.body.style.overflow='';
  settleOverlay('featured');
  stopFeatAuto();
  showAdOnce();
}
document.addEventListener('click', e=>{
  const bd = e.target.closest('[data-openfeat]');
  if(!bd) return;
  if(closedNow()){ showClosedNotice(); return; }
  openFeatured();
});
let touchX = null;
el('featStage').addEventListener('touchstart', e=>{ touchX = e.touches[0].clientX; }, {passive:true});
el('featStage').addEventListener('touchend', e=>{
  if(touchX===null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if(Math.abs(dx) > 45) manualNav(dx > 0 ? 1 : -1);
  touchX = null;
}, {passive:true});
/* ===== شاشة الترحيب ===== */
let introFinished = false;
const MIN_INTRO_MS = 7000;
const firstVisit = !localStorage.getItem('mk_welcome_seen');
function maybeAdOrClosed(){
  if(closedNow()){ showClosedNotice(); return; }
  showAdOnce();
}
function afterWelcome(){
  maybeAdOrClosed();
}
if(firstVisit){
  localStorage.setItem('mk_welcome_seen','1');
  setTimeout(()=>{
    el('welcome').classList.add('show');
    document.body.style.overflow='hidden';
    pushOverlay('welcome');
  }, 250);
  const assets = ['img/logo.png','img/welcome.png','img/bg.png',
    ...bestItems().map(it=> itemImgUrl(it)).filter(Boolean)];
  let imgLoaded = 0, done = false;
  const tick = ()=>{
    imgLoaded++;
    if(imgLoaded >= assets.length && !done){ done = true; finishIntro(); }
  };
  assets.forEach(src=>{ const im = new Image(); im.onload = im.onerror = tick; im.src = src; });
  setTimeout(()=>{ if(!done){ done = true; finishIntro(); } }, 25000);
} else {
  let loaded = 0, opened = false;
  const imgs = bestItems().map(it=> itemImgUrl(it)).filter(Boolean);
  const open = ()=>{ if(!opened){ opened=true; afterWelcome(); } };
  if(!imgs.length){ setTimeout(open, 400); }
  imgs.forEach(src=>{
    const im = new Image();
    im.onload = im.onerror = ()=>{ loaded++; if(loaded >= imgs.length) open(); };
    im.src = src;
  });
  setTimeout(open, 3000);
}
function finishIntro(){
  if(introFinished) return;
  introFinished = true;
  const wait = Math.max(0, MIN_INTRO_MS - (Date.now() - t0));
  setTimeout(()=>{
    el('welcome').classList.remove('show');
    document.body.style.overflow='';
    settleOverlay('welcome');
    setTimeout(afterWelcome, 400);
  }, wait);
}
function skipIntro(){
  if(introFinished) return;
  introFinished = true;
  el('welcome').classList.remove('show');
  document.body.style.overflow='';
  settleOverlay('welcome');
  afterWelcome();
}
el('welcome').addEventListener('click', e=>{ if(e.target.id==='welcome') skipIntro(); });
/* ===== محرك المسارات الدقيقة (OSRM) ===== */
const OSRM_HOSTS = ['https://routing.openstreetmap.de/routed-car','https://router.project-osrm.org'];
let routeInfo = {};
function round3(n){ return Math.round(n*1000)/1000; }
function routeCacheKey(la, lo, id){
  const bucket = Math.floor(Date.now()/(15*60*1000));
  return 'mk_rc|'+round3(la)+','+round3(lo)+'|'+id+'|'+bucket;
}
function readRouteCache(la, lo, id){ try{ return JSON.parse(localStorage.getItem(routeCacheKey(la,lo,id))) || null; }catch(e){ return null; } }
function writeRouteCache(la, lo, id, val){ try{ localStorage.setItem(routeCacheKey(la,lo,id), JSON.stringify(val)); }catch(e){} }
function trafficFactor(d){
  const day = d.getDay();
  const h = d.getHours() + d.getMinutes()/60;
  if(day >=0 && day <=3){
    if(h >=7 && h <9) return 1.30;
    if(h >=12 && h <14) return 1.15;
    if(h >=16 && h <20) return 1.40;
    if(h >=20 && h <23) return 1.15;
    return 1.0;
  }
  if(day===4){
    if(h >=7 && h <9) return 1.30;
    if(h >=16 && h <23) return 1.35;
    return 1.05;
  }
  if(day===5){
    if(h >=12 && h <14) return 1.25;
    if(h >=16 && h <23) return 1.30;
    return 1.0;
  }
  if(h >=16 && h <23) return 1.25;
  return 1.0;
}
function trafficLevel(f){ return f <1.12 ? 0 : (f <1.3 ? 1 : 2); }
async function osrmRoute(la, lo, b){
  const from = lo+','+la, to = b.lng+','+b.lat;
  let lastErr = null;
  for(const host of OSRM_HOSTS){
    try{
      const r = await fetch(host+'/route/v1/driving/'+from+';'+to+'?overview=false&alternatives=false&steps=false', {cache:'no-store'});
      if(!r.ok) throw new Error('http');
      const j = await r.json();
      const rt = j && j.routes && j.routes[0];
      if(!rt || !rt.distance) throw new Error('empty');
      return { km: rt.distance/1000, sec: rt.duration };
    }catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('route-fail');
}
function routeFallback(la, lo, b){
  const km = hav(la, lo, b.lat, b.lng) * 1.25;
  const sec = (km/35)*3600;
  return { km, sec };
}
let geoBusy = false;
function geoOnce(opts){
  return new Promise((res, rej)=>{ navigator.geolocation.getCurrentPosition(pos=> res(pos), err=> rej(err), opts); });
}
function withWatchdog(promise, ms){
  return new Promise((res, rej)=>{
    const t = setTimeout(()=> rej(new Error('watchdog')), ms);
    promise.then(v=>{ clearTimeout(t); res(v); }, e=>{ clearTimeout(t); rej(e); });
  });
}
/* ===== صفحة التفاصيل ===== */
let dtState = null;
(function injectDetailCss(){
  const st = document.createElement('style');
  st.textContent =
    '.dt-often{margin-top:1rem}' +
    '.dt-often h5{color:var(--ink);font-size:1.05rem;font-weight:900;line-height:1.6}' +
    '.dt-often small{display:block;color:var(--muted);font-weight:700;font-size:.72rem;margin:.1rem 0 .6rem}' +
    '.dt-often-row{display:flex;gap:.7rem;overflow-x:auto;padding:.1rem .1rem .5rem;scrollbar-width:none}' +
    '.dt-often-row::-webkit-scrollbar{display:none}' +
    '.dt-ocard{flex:0 0 150px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:.6rem;' +
    'display:flex;flex-direction:column;gap:.35rem;align-items:center;text-align:center;' +
    'box-shadow:0 2px 8px rgba(90,24,48,.06)}' +
    '.dt-oimg{width:100%;aspect-ratio:1;border-radius:12px;overflow:hidden;' +
    'background-color:var(--phbg);background-image:url("img/bg.png");background-size:cover;background-position:center}' +
    '.dt-oimg img{width:100%;height:100%;object-fit:contain;padding:8%;display:block}' +
    '.dt-ocard b{font-size:.8rem;font-weight:900;color:var(--ink);line-height:1.5;' +
    'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '.dt-oprice{font-size:.72rem;font-weight:800;color:var(--muted)}' +
    '.dt-octrl{margin-top:.15rem}';
  document.head.appendChild(st);
})();
function ensureDetailSheet(){
  if(el('detail')) return el('detail');
  const d = document.createElement('div');
  d.id = 'detail'; d.className = 'detail';
  d.innerHTML = `<div class="dt-card"><div class="dt-hero"><button class="dt-close" id="dtClose">✕</button><img id="dtImg" alt=""></div><div class="dt-body"><h3 id="dtName"></h3><p id="dtDesc" class="dt-desc"></p><span id="dtCal" class="dt-cal"></span><div id="dtSizeWrap"></div><div id="dtMods"></div></div><div class="dt-bar"><div class="dt-step"><button id="dtDec">−</button><span id="dtQty">1</span><button id="dtInc">+</button></div><button id="dtAdd" class="dt-add"></button></div></div>`;
  document.body.appendChild(d);
  el('dtClose').addEventListener('click', closeDetail);
  el('dtInc').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    dtState.qty++;
    renderDetailBar();
  });
  el('dtDec').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    if(dtState.qty > 0) dtState.qty--;
    renderDetailBar();
  });
  el('dtAdd').addEventListener('click', ()=>{
    if(!dtState || orderLocked()) return;
    const it = curDetailItem();
    [...cart.keys()].forEach(k=>{
      if(keyId(k) === it.id) cart.delete(k);
    });
    if(dtState.qty > 0){
      cart.set(cartKey(it.id, dtState.sizeIdx),
        {id:it.id, sizeIdx:dtState.sizeIdx, qty:dtState.qty});
    }
    modsRefs(it).forEach(ref=>{
      const q = dtState.sel[ref] || 0;
      const k = cartKey(ref, -1);
      if(q > 0) cart.set(k, {id:ref, sizeIdx:-1, qty:q});
      else cart.delete(k);
    });
    updateCart();
    closeDetail();
    toast(tt('addedToCart','🛒 تمت الإضافة إلى سلتك','🛒 Added to your cart'));
  });
  el('dtSizeWrap').addEventListener('change', e=>{
    if(e.target.id !== 'dtSize' || !dtState) return;
    dtState.sizeIdx = +e.target.value;
    const q = qtyForItemSize(curDetailItem().id, dtState.sizeIdx);
    dtState.qty = q > 0 ? q : 1;
    renderDetailBar();
  });
  el('dtMods').addEventListener('click', e=>{
    const btn = e.target.closest('[data-mact]');
    if(!btn || !dtState) return;
    if(orderLocked()) return;
    const ref = btn.dataset.ref;
    const act = btn.dataset.mact;
    if(act === 'inc'){
      dtState.sel[ref] = (dtState.sel[ref]||0) + 1;
    }
    if(act === 'dec'){
      if(dtState.sel[ref] > 0){
        dtState.sel[ref]--;
        if(dtState.sel[ref] <= 0) delete dtState.sel[ref];
      }
    }
    updateAddOnCard(ref);
    renderDetailBar();
  });
  return d;
}
function curDetailItem(){ return MENU[dtState.si].items[dtState.ii]; }
function detailTotal(){
  const it = curDetailItem();
  let t = itemPrice(it, dtState.sizeIdx) * dtState.qty;
  Object.keys(dtState.sel).forEach(ref=>{
    t += modPriceFor(it, ref) * dtState.sel[ref];
  });
  return t;
}
function renderDetailBar(){
  const TT = T();
  el('dtQty').textContent = dtState.qty;
  el('dtAdd').textContent = (TT.addToCart || 'إضافة للسلة') + ' • ' + detailTotal() + ' ' + TT.currency;
}
function renderDetailMods(){
  const it = curDetailItem();
  const box = el('dtMods');
  const brId = savedBranchId() || '';
  const prevRow = box.querySelector('.dt-often-row');
  const sl = prevRow ? prevRow.scrollLeft : 0;
  const refs = modsRefs(it).filter(ref=> itemAvailable(ref, brId));
  if(!refs.length){ box.innerHTML = ''; return; }
  const ar = (currentLang==='ar');
  const head = ar ? modsTitleAr(it) : modsTitleEn(it);
  const sub = ar ? modsSubAr() : modsSubEn();
  const cards = refs.map(ref=>{
    const rit = findMenuItem(ref);
    const q = dtState.sel[ref] || 0;
    const thumb = itemImgUrl(rit) || itemPlaceholder(rit.ar);
    const ctrl = q > 0
      ? `<span class="dt-mini"><button class="dec" data-mact="dec" data-ref="${ref}">−</button><span>${q}</span><button data-mact="inc" data-ref="${ref}">+</button></span>`
      : `<button class="dt-pick" data-mact="inc" data-ref="${ref}">+</button>`;
    return `<div class="dt-ocard" data-ref="${ref}"><div class="dt-oimg"><img src="${thumb}" alt="${itemName(rit)}" loading="lazy"></div><b>${itemName(rit)}</b><span class="dt-oprice">+${rit.prices[0]} ${T().currency}</span><div class="dt-octrl">${ctrl}</div></div>`;
  }).join('');
  box.innerHTML = `<div class="dt-often">
    <h5>${head}</h5>
    <small>${sub}</small>
    <div class="dt-often-row">${cards}</div>
  </div>`;
  const newRow = box.querySelector('.dt-often-row');
  if(newRow) newRow.scrollLeft = sl;
}
function openDetail(si, ii){
  ensureDetailSheet();
  pushOverlay('detail');
  const it = MENU[si].items[ii];
  let sizeIdx = -1;
  let qty = 0;
  if(it.prices.length > 1){
    sizeIdx = 0;
    for(let i=0;i<it.prices.length;i++){
      const q = qtyForItemSize(it.id, i);
      if(q > 0){ sizeIdx = i; qty = q; break; }
    }
    if(qty === 0){ sizeIdx = 0; qty = 1; }
  } else {
    qty = qtyForItemSize(it.id, -1);
    if(qty === 0) qty = 1;
  }
  const sel = {};
  modsRefs(it).forEach(ref=>{
    const q = qtyForItemSize(ref, -1);
    if(q > 0) sel[ref] = q;
  });
  dtState = { si:si, ii:ii, sizeIdx:sizeIdx, qty:qty, sel:sel };
  const TT = T();
  const DO = displayOpts();
  el('dtImg').src = itemImgUrl(it) || itemPlaceholder(it.ar);
  el('dtName').textContent = itemName(it);
  const desc = itemDesc(it);
  const dEl = el('dtDesc');
  dEl.textContent = desc;
  dEl.style.display = (DO.showDesc && desc) ? '' : 'none';
  const cEl = el('dtCal');
  if(DO.showCal && it.cal){ cEl.textContent = '🔥 ' + it.cal + ' ' + TT.cal; cEl.style.display = ''; }
  else cEl.style.display = 'none';
  const sw = el('dtSizeWrap');
  sw.innerHTML = it.prices.length > 1
    ? `<select id="dtSize" class="dt-size">${it.prices.map((p,i)=>`<option value="${i}"${i===sizeIdx?' selected':''}>${TT.sizes[i]} • ${p} ${TT.currency}</option>`).join('')}</select>`
    : '';
  renderDetailMods();
  renderDetailBar();
  el('detail').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeDetail(){
  if(!detailShown()) return;
  el('detail').classList.remove('show');
  document.body.style.overflow = '';
  dtState = null;
  settleOverlay('detail');
}
/* ===== لوحة المفاتيح والرجوع ===== */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && adShown()){ closeAd(); return; }
  if(e.key==='Escape' && confirmShown()){ resolveConfirm(false); return; }
  if(e.key==='Escape' && installSheet.classList.contains('show')){ closeSheet(); return; }
  if(e.key==='Escape' && closedShown()){ closeClosedNotice(); return; }
  if(e.key==='Escape' && detailShown()){ closeDetail(); return; }
  if(e.key==='Escape' && actionToastShown()){ hideActionToast(); return; }
  if(e.key==='Escape' && searchModeOn()){ closeSearchMode(); return; }
  if(e.key==='Escape' && gateShown()){ closeGate(); return; }
  if(!featuredShown()) return;
  if(e.key==='Escape') closeFeatured();
  else if(e.key==='ArrowLeft') manualNav(1);
  else if(e.key==='ArrowRight') manualNav(-1);
});
let lastBackPress = 0;
window.addEventListener('popstate', ()=>{
  if(overlayStack.length){
    const entry = overlayStack.pop();
    guardOn = false;
    closeByType(entry.type);
    if(LOCK_TYPES.indexOf(entry.type) >= 0) restoreScroll(entry.scrollY);
    if(overlayStack.length) pushGuard();
    return;
  }
  guardOn = false;
  const anyOverlay = welcomeShown() || sheetShown() || drawerShown() || featuredShown() || adShown() || gateShown() || closedShown() || detailShown() || actionToastShown() || el('favSheet').classList.contains('show') || el('slotPicker').classList.contains('show') || confirmShown();
  if(anyOverlay){
    goHome();
    pushGuard();
    return;
  }
  const now = Date.now();
  if(now - lastBackPress < 2500){
    history.back();
  } else {
    lastBackPress = now;
    toast(T().backToExit);
    pushGuard();
  }
});
/* ===== بناء المنيو + بحث ثنائي اللغة ===== */
const cats = el('cats'), search = el('search'), main = el('menu');
const searchStats = el('searchStats'), statsCount = el('statsCount');
let currentSection = 0;
let isSearching = false;
function buildMenu(){
  cats.innerHTML = '';
  main.innerHTML = '';
  const TT = T();
  const DO = displayOpts();
  const soldTxt = tt('soldOut','نفد ❌','Sold out ❌');
  const grayTxt = tt('notAvailableBranch','غير متوفر في هذا الفرع','Not available at this branch');
  const bestTxt = tt('bestBadge','الأكثر مبيعًا','Best Seller');
  const brId = savedBranchId() || '';
  MENU.forEach((sec,si)=>{
    if(sec.hidden === true) return;
    if(sectionViewState(sec, brId) === 'hide') return;
    const views = sec.items.map(it=> (it.hidden === true) ? 'hide' : itemViewState(sec, it, brId));
    const renderable = sec.items.filter((it,idx)=> views[idx] !== 'hide');
    if(!renderable.length) return;
    const secTitle = (currentLang==='ar') ? sec.t : sec.tEn;
    const chip = document.createElement('button');
    chip.className='chip';
    chip.textContent = sec.i+' '+secTitle;
    chip.onclick = ()=>{
      if(isSearching) clearSearch();
      showSection(si, true);
      pauseCats(3000);
      chip.scrollIntoView({behavior:'smooth', inline:'center', block:'nearest'});
    };
    cats.appendChild(chip);
    const s = document.createElement('section');
    s.className='section'; s.id='sec-'+si;
    s.innerHTML = `<h3 class="ribbon"><span class="rib-ico">${sec.i}</span> ${secTitle}</h3><div class="${DO.mode==='list'?'listwrap':'grid'}"></div>`;
    const g = s.querySelector('.listwrap, .grid');
    sec.items.forEach((it,ii)=>{
      const view = views[ii];
      if(view === 'hide') return;
      const gray = (view === 'gray');
      const sold = !gray && itemSoldOut(it, brId);
      const prices = it.prices, cal = it.cal, multi = prices.length>1;
      const desc = itemDesc(it);
      const imgURL = itemImgUrl(it);
      const ph = itemPlaceholder(it.ar);
      const mode = (it.imgMode === 'full') ? 'full' : '';
      const calTxt = cal ? ('🔥 '+cal+' '+TT.cal) : TT.zeroCal;
      const priceTxt = multi ? (TT.from+' '+prices[0]+' '+TT.currency) : (prices[0]+' '+TT.currency);
      const bestBadge = isBestSeller(it)
        ? `<span class="c-badge" data-openfeat="1" style="cursor:pointer">🏆 ${bestTxt}</span>` : '';
      const sd = {
        ar: (it.ar||'').toLowerCase(),
        en: (it.en||'').toLowerCase(),
        dar: (it.desc||'').toLowerCase(),
        den: (it.descEn||'').toLowerCase()
      };
      if(DO.mode === 'list'){
        const badges = [];
        if(gray) badges.push(`<span class="l-badge">${grayTxt}</span>`);
        else if(sold) badges.push(`<span class="l-badge sold">${soldTxt}</span>`);
        else if(isBestSeller(it)) badges.push(`<span class="l-badge best" data-openfeat="1">🏆 ${bestTxt}</span>`);
        if(DO.showCal && cal) badges.push(`<span class="l-badge cal">🔥 ${cal} ${TT.cal}</span>`);
        const row = document.createElement('div');
        row.className='lrow' + (gray?' card-gray':'');
        row.dataset.name = sd.ar; row.dataset.en = sd.en;
        row.dataset.dar = sd.dar; row.dataset.den = sd.den;
        row.dataset.si = si; row.dataset.ii = ii;
        row.innerHTML = `
          <div class="l-img"><img class="${mode}" src="${imgURL || ph}" alt="${itemName(it)}" loading="lazy" onerror="this.onerror=null;this.src='${ph}'"></div>
          <div class="l-body">
            <h4>${itemName(it)}</h4>
            ${DO.showDesc && desc ? `<p class="l-desc">${desc}</p>` : ''}
            <div class="l-badges">${badges.join('')}</div>
            <div class="l-price">${priceTxt}</div>
          </div>`;
        g.appendChild(row);
        return;
      }
      const badge = gray ? `<span class="c-badge grayb">${grayTxt}</span>`
        : (sold ? `<span class="c-badge sold">${soldTxt}</span>` : bestBadge);
      const metaParts = [];
      if(DO.showCal) metaParts.push(calTxt);
      if(DO.showDesc && desc) metaParts.push(desc);
      const card = document.createElement('div');
      card.className='card' + (gray?' card-gray':'');
      card.dataset.name = sd.ar; card.dataset.en = sd.en;
      card.dataset.dar = sd.dar; card.dataset.den = sd.den;
      card.dataset.si = si;
      card.dataset.ii = ii;
      card.innerHTML = `
        <div class="c-img">
          <img class="${mode}" src="${imgURL || ph}" alt="${itemName(it)}" loading="lazy"
               onerror="this.onerror=null;this.src='${ph}'">
          ${badge}
          <div class="step ${(sold||gray)?'disabled':''}" data-si="${si}" data-ii="${ii}">
            <button class="st inc" aria-label="إضافة"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
            <span class="qnum">0</span>
            <button class="st dec" aria-label="إنقاص"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg></button>
          </div>
        </div>
        <div class="c-body">
          <div class="c-info">
            <h4>${itemName(it)}</h4>
            ${metaParts.length ? `<p class="c-meta">${metaParts.join(' | ')}</p>` : ''}
            ${multi? `<select class="size" ${(sold||gray)?'disabled':''}>${prices.map((p,i)=>`<option value="${i}">${TT.sizes[i]} • ${p} ${TT.currency}</option>`).join('')}</select>`:''}
          </div>
          <div class="c-price">${priceTxt}</div>
        </div>`;
      g.appendChild(card);
    });
    const n = MENU.length;
    const prev = (si-1+n)%n, next = (si+1)%n;
    const nav = document.createElement('div');
    nav.className='sec-nav';
    const prevT = (currentLang==='ar') ? MENU[prev].t : MENU[prev].tEn;
    const nextT = (currentLang==='ar') ? MENU[next].t : MENU[next].tEn;
    nav.innerHTML = `
      <button class="nav-btn" data-go="${prev}">
        <span class="arr">→</span>
        <span class="lbl"><small>${TT.prevSec}</small><b>${MENU[prev].i} ${prevT}</b></span>
      </button>
      <button class="nav-btn" data-go="${next}">
        <span class="lbl"><small>${TT.nextSec}</small><b>${MENU[next].i} ${nextT}</b></span>
        <span class="arr">←</span>
      </button>`;
    s.appendChild(nav);
    main.appendChild(s);
  });
  const calNote = document.createElement('div');
  calNote.className='cal-note';
  calNote.innerHTML = `<span class="cal-icon">🔥</span><span>${TT.calInfo}</span>`;
  main.appendChild(calNote);
  const socBox = document.createElement('div');
  socBox.className = 'menu-social'; socBox.id = 'menuSocial';
  main.appendChild(socBox);
  renderSocial();
}
buildMenu();
/* ===== + / − في الشبكي ===== */
document.addEventListener('click', e=>{
  const b = e.target.closest('.st'); if(!b) return;
  const step = b.closest('.step');
  if(step.classList.contains('disabled')) return;
  if(orderLocked()) return;
  const si = +step.dataset.si, ii = +step.dataset.ii;
  const sec = MENU[si];
  const it = sec.items[ii];
  const brId = savedBranchId() || '';
  if(itemViewState(sec, it, brId) !== 'normal') return;
  if(itemSoldOut(it, brId)) return;
  const sel = step.closest('.card').querySelector('select');
  const sizeIdx = sel ? +sel.value : -1;
  const key = cartKey(it.id, sizeIdx);
  const cur = cart.get(key) || {id:it.id, sizeIdx:sizeIdx, qty:0};
  b.classList.contains('inc') ? cur.qty++ : cur.qty--;
  if(cur.qty <=0) cart.delete(key); else cart.set(key,cur);
  updateCart();
  if(b.classList.contains('inc') && modsRefs(it).length){
    openDetail(si, ii);
  }
});
main.addEventListener('click', e=>{
  const card = e.target.closest('.card');
  if(!card) return;
  if(e.target.closest('.step')) return;
  if(e.target.closest('select')) return;
  if(e.target.closest('[data-openfeat]')) return;
  if(orderLocked()) return;
  const si = +card.dataset.si, ii = +card.dataset.ii;
  const sec = MENU[si], it = sec.items[ii];
  const brId = savedBranchId() || '';
  if(itemViewState(sec, it, brId) !== 'normal') return;
  if(itemSoldOut(it, brId)) return;
  if(!modsRefs(it).length) return;
  openDetail(si, ii);
});
main.addEventListener('click', e=>{
  const row = e.target.closest('.lrow');
  if(!row) return;
  if(e.target.closest('[data-openfeat]')) return;
  if(orderLocked()) return;
  const si = +row.dataset.si, ii = +row.dataset.ii;
  const sec = MENU[si], it = sec.items[ii];
  const brId = savedBranchId() || '';
  const view = itemViewState(sec, it, brId);
  if(view === 'gray'){ toast(T().notAvailableBranch); return; }
  if(itemSoldOut(it, brId)){ toast(T().soldOut); return; }
  openDetail(si, ii);
});
document.addEventListener('change', e=>{ if(e.target.matches('.size')) refreshSteps(); });
function refreshSteps(){
  document.querySelectorAll('.step').forEach(st=>{
    const it = MENU[+st.dataset.si].items[+st.dataset.ii];
    const sel = st.closest('.card').querySelector('select');
    const sizeIdx = sel ? +sel.value : -1;
    const q = qtyForItemSize(it.id, sizeIdx);
    st.querySelector('.qnum').textContent = q;
    st.classList.toggle('on', q >0);
  });
}
main.addEventListener('click', e=>{
  const b = e.target.closest('.nav-btn'); if(!b) return;
  showSection(+b.dataset.go, true);
});
function showSection(si, scroll=false){
  currentSection = si;
  document.querySelectorAll('.section').forEach((s,i)=> s.style.display = (i===si)? '' : 'none');
  document.querySelectorAll('.chip').forEach((c,i)=> c.classList.toggle('active', i===si));
  if(scroll){
    const target = document.getElementById('sec-'+si);
    if(target) requestAnimationFrame(()=>{
      const tb = document.querySelector('.topbar');
      const sr = el('stickyRow');
      const ct = el('cats');
      const off = (tb?tb.offsetHeight:56)+(sr?sr.offsetHeight:66)+(ct?ct.offsetHeight:48)+10;
      const y = target.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({top:y, behavior:'smooth'});
    });
  }
}
showSection(0);
function itemMatches(c, q){
  return (c.dataset.name||'').includes(q)
    || (c.dataset.en||'').includes(q)
    || (c.dataset.dar||'').includes(q)
    || (c.dataset.den||'').includes(q);
}
search.addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.card.highlight, .lrow.highlight').forEach(c=> c.classList.remove('highlight'));
  if(!q){ clearSearch(); return; }
  isSearching = true;
  cats.classList.add('searching');
  searchStats.classList.add('show');
  let firstMatch = null, totalMatches = 0;
  document.querySelectorAll('.section').forEach(s=>{
    s.style.display='';
    let sectionHasMatch = false;
    s.querySelectorAll('.card, .lrow').forEach(c=>{
      const match = itemMatches(c, q);
      c.style.display = match ? '' : 'none';
      if(match){ sectionHasMatch = true; totalMatches++; if(!firstMatch) firstMatch = c; }
    });
    s.style.display = sectionHasMatch ? '' : 'none';
  });
  statsCount.textContent = T().results(totalMatches);
  if(firstMatch){
    setTimeout(()=>{
      firstMatch.scrollIntoView({behavior:'smooth', block:'center'});
      firstMatch.classList.add('highlight');
    }, 150);
  } else {
    toast(T().noResults);
  }
});
function clearSearch(){
  search.value = '';
  isSearching = false;
  cats.classList.remove('searching');
  searchStats.classList.remove('show');
  statsCount.textContent = T().results(0);
  document.querySelectorAll('.card.highlight, .lrow.highlight').forEach(c=> c.classList.remove('highlight'));
  document.querySelectorAll('.section').forEach(s=>{
    s.style.display='';
    s.querySelectorAll('.card, .lrow').forEach(c=> c.style.display = '');
  });
  showSection(currentSection);
}
/* ===== السلة ===== */
const cart = new Map();
try{ (JSON.parse(localStorage.getItem('mk_cart'))||[]).forEach(([k,v])=> cart.set(k,v)); }catch(e){}
function reconcileCart(){
  const brId = savedBranchId() || '';
  let removed = 0, removedMods = false;
  const rebuilt = new Map();
  const addLine = (id, sizeIdx, qty)=>{
    const k = cartKey(id, sizeIdx);
    const cur = rebuilt.get(k) || {id:id, sizeIdx:sizeIdx, qty:0};
    cur.qty += qty;
    rebuilt.set(k, cur);
  };
  cart.forEach((v)=>{
    let id = v.id, sizeIdx = v.sizeIdx, qty = v.qty;
    if(id === undefined){
      const mig = findMenuItemByAr(v.ar);
      if(!mig){ removed++; return; }
      id = mig.id;
    }
    if(!itemAvailable(id, brId)){ removed++; return; }
    const mods = Array.isArray(v.mods) ? v.mods : null;
    if(mods && mods.length){
      addLine(id, sizeIdx, qty);
      mods.forEach(m=>{
        if(!itemAvailable(m.ref, brId)){ removedMods = true; return; }
        addLine(m.ref, -1, qty * (m.qty || 1));
      });
    } else {
      addLine(id, sizeIdx, qty);
    }
  });
  cart.clear();
  rebuilt.forEach((v,k)=> cart.set(k,v));
  if(removed > 0) toast(tt('reconciled','⚠️ أصناف لم تعد متوفرة أُزيلت من طلبك','⚠️ Unavailable items were removed from your order'));
  else if(removedMods) toast(tt('modsInvalid','⚠️ بعض الإضافات لم تعد متوفرة — أُزيلت من طلبك','⚠️ Some add-ons are no longer available — removed from your order'));
}
el('dItems').addEventListener('click', e=>{
  const b = e.target.closest('.q'); if(!b) return;
  if(b.dataset.a==='inc' && orderLocked()) return;
  const item = cart.get(b.dataset.k);
  if(!item) return;
  b.dataset.a==='inc' ? item.qty++ : item.qty--;
  if(item.qty <=0) cart.delete(b.dataset.k);
  updateCart();
  if(detailShown()) renderDetailMods();
});
let confirmResolve = null;
function customConfirm(msg, title){
  return new Promise(res=>{
    confirmResolve = res;
    el('confirmMsg').textContent = msg;
    el('confirmTitle').textContent = title || tt('favReplaceTitle','استبدال الوجبة المحفوظة','Replace Saved Meal');
    el('confirmYes').textContent = tt('favConfirmYes','نعم، استبدال','Yes, Replace');
    el('confirmNo').textContent = tt('favCancel','إلغاء','Cancel');
    el('confirmModal').classList.add('show');
  });
}
function resolveConfirm(val){
  if(!el('confirmModal').classList.contains('show')) return;
  el('confirmModal').classList.remove('show');
  if(confirmResolve){ const r = confirmResolve; confirmResolve = null; r(val); }
}
/* ===== المفضلة ===== */
const FAV_KEY = 'mk_favs_v1';
const MAX_FAVS = 3;
function getFavs(){
  try {
    let f = JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    while(f.length < MAX_FAVS) f.push(null);
    return f.slice(0, MAX_FAVS);
  } catch(e) { return [null, null, null]; }
}
function persistFavs(list){ localStorage.setItem(FAV_KEY, JSON.stringify(list)); }
function migrateFavs(){
  const favs = getFavs();
  let changed = false;
  const out = favs.map(f=>{
    if(!f) return null;
    const items = [];
    (f.items||[]).forEach(xi=>{
      let id = null;
      if(xi && xi.id) id = xi.id;
      else if(xi){
        const it = findMenuItemByAr(xi.ar);
        if(it){ id = it.id; changed = true; } else { changed = true; return; }
      }
      if(!id || !findMenuItem(id)){ changed = true; return; }
      const sizeIdx = xi.sizeIdx;
      const qty = xi.qty;
      const mods = Array.isArray(xi.mods) ? xi.mods : null;
      if(mods && mods.length){
        changed = true;
        items.push({id:id, sizeIdx:sizeIdx, qty:qty});
        mods.forEach(m=>{
          if(findMenuItem(m.ref)){
            items.push({id:m.ref, sizeIdx:-1, qty: qty*(m.qty||1)});
          }
        });
      } else {
        items.push({id:id, sizeIdx:sizeIdx, qty:qty});
      }
    });
    if(!items.length){ if(f) changed = true; return null; }
    return { items:items, savedAt: f.savedAt || Date.now() };
  });
  if(changed) persistFavs(out);
}
function renderFavSheet(){
  const favs = getFavs();
  const TT = T();
  const slots = favSlotsArr();
  let html = '';
  favs.forEach((f, i) => {
    if(f){
      const preview = f.items.map(xi=>{
        const it = findMenuItem(xi.id);
        if(!it) return null;
        const size = xi.sizeIdx >= 0 ? (' (' + TT.sizes[xi.sizeIdx] + ')') : '';
        return xi.qty + '× ' + itemName(it) + size;
      }).filter(Boolean).join('، ');
      let total = 0;
      f.items.forEach(xi=>{
        const it = findMenuItem(xi.id);
        if(it) total += xi.qty * itemPrice(it, xi.sizeIdx);
      });
      html += `<div class="fav-card">
        <div class="fav-card-head"><span class="fav-slot-name">${slots[i]}</span><span class="fav-total">${total} ${TT.currency}</span></div>
        <p class="fav-items-preview">${preview}</p>
        <div class="fav-actions">
          <button class="fav-order-btn" onclick="orderFav(${i})">${tt('favOrderNow','🛒 اطلبها الآن','🛒 Order Now')}</button>
          <button class="fav-del-btn" onclick="deleteFav(${i})">${tt('favDelete','🗑 حذف','🗑 Delete')}</button>
        </div></div>`;
    } else {
      html += `<div class="fav-empty-slot">💭 ${tt('favEmptySlot','خانة فارغة — احفظ وجبة من السلة','Empty slot — save a meal from the cart')}</div>`;
    }
  });
  el('favList').innerHTML = html;
}
function openFavSheet(){
  pushOverlay('fav');
  renderFavSheet();
  el('favSheet').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeFavSheet(){
  el('favSheet').classList.remove('show');
  document.body.style.overflow = '';
  settleOverlay('fav');
}
function openSlotPicker(){
  if(!cart.size){ toast(tt('favCartEmpty','⚠️ السلة فارغة، أضف أصنافاً أولاً','⚠️ Cart is empty, add items first')); return; }
  const favs = getFavs();
  const slots = favSlotsArr();
  document.querySelectorAll('#slotBtns .slot-btn').forEach((b, i) => {
    b.innerHTML = slots[i] + (favs[i] ? `<small>✔ ${currentLang==='ar'?'موجودة':'Saved'}</small>` : '');
  });
  pushOverlay('slot');
  el('slotPicker').classList.add('show');
}
function closeSlotPicker(){ el('slotPicker').classList.remove('show'); settleOverlay('slot'); }
async function saveFavToSlot(i){
  const favs = getFavs();
  if(favs[i]){
    const ok = await customConfirm(tt('favOverwrite','هذه الخانة تحتوي على وجبة محفوظة، هل تريد استبدالها؟','This slot already has a saved meal. Replace it?'), favSlotsArr()[i]);
    if(!ok) return;
  }
  const items = [];
  cart.forEach(v=> items.push({id:v.id, sizeIdx:v.sizeIdx, qty:v.qty}));
  favs[i] = { items:items, savedAt: Date.now() };
  persistFavs(favs);
  closeSlotPicker();
  updateFavBadge();
  toast(tt('favSavedOk','✔ تم حفظ الوجبة بنجاح','✔ Meal saved successfully'));
}
function orderFav(i){
  if(orderLocked()) return;
  const f = getFavs()[i];
  if(!f) return;
  const brId = savedBranchId() || '';
  f.items.forEach(xi=>{
    if(!itemAvailable(xi.id, brId)) return;
    const key = cartKey(xi.id, xi.sizeIdx);
    const cur = cart.get(key) || {id:xi.id, sizeIdx:xi.sizeIdx, qty:0};
    cur.qty += xi.qty;
    cart.set(key, cur);
  });
  updateCart();
  closeFavSheet();
  openCart();
  toast(tt('favAddedToCart','🛒 تمت إضافة الوجبة إلى سلتك','🛒 Meal added to your cart'));
}
function deleteFav(i){
  const favs = getFavs();
  favs[i] = null;
  persistFavs(favs);
  renderFavSheet();
  updateFavBadge();
  toast(tt('favDeleted','تم حذف الوجبة','Meal deleted'));
}
el('favFab').addEventListener('click', openFavSheet);
el('saveFavBtn').addEventListener('click', openSlotPicker);
document.querySelectorAll('#slotBtns .slot-btn').forEach(b => {
  b.addEventListener('click', () => saveFavToSlot(+b.dataset.slot));
});
/* ===== شريط الأقسام المتحرك ===== */
let catsDir = 1, catsPauseUntil = 0, catsLast = performance.now(), catsSign = 0;
let catsPos = 0, catsSynced = false;
const CATS_SPEED = 28;
function pauseCats(ms){ catsPauseUntil = performance.now() + (ms || 3000); }
(function initCatsMarquee(){
  function tickCats(now){
    const max = cats.scrollWidth - cats.clientWidth;
    if(max > 5){
      if(!catsSign){
        cats.scrollLeft = -1;
        catsSign = (cats.scrollLeft < 0) ? -1 : 1;
        cats.scrollLeft = 0;
        catsPos = 0;
        catsSynced = true;
      }
      if(now >= catsPauseUntil){
        if(!catsSynced){
          catsPos = Math.min(max, Math.abs(cats.scrollLeft));
          catsSynced = true;
        }
        const dt = Math.min(.05, (now - catsLast)/1000);
        catsPos += dt * CATS_SPEED * catsDir;
        if(catsPos >= max){ catsPos = max; catsDir = -1; }
        else if(catsPos <= 0){ catsPos = 0; catsDir = 1; }
        cats.scrollLeft = catsSign * catsPos;
      } else {
        catsSynced = false;
      }
    }
    catsLast = now;
    requestAnimationFrame(tickCats);
  }
  requestAnimationFrame(tickCats);
})();
cats.addEventListener('pointerdown', ()=> pauseCats(3000), {passive:true});
cats.addEventListener('touchstart', ()=> pauseCats(3000), {passive:true});
cats.addEventListener('wheel', ()=> pauseCats(3000), {passive:true});
