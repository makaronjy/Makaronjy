/* ===== admin-core.js — النواة: D1 + صور R2 مضغوطة + سلة مهملات (v6.4) =====
   v6.4: • تنظيف الكود الميت (10 عناصر غير مستخدمة — بقايا حقبة GitHub)
         • لا تغيير وظيفي إطلاقاً — نفس سلوك v6.3 بالكامل
   v6.3: زر «تنظيف صور الأصناف اليتيمة» مع عرض القائمة والأحجام
         + حمايات: رفض عند منيو فارغ + تحذير النسبة العالية + تأكيد delete
         + النقل إلى سلة المهملات (لا حذف نهائي) قابل للاسترجاع
   v6.2: ضغط كل صورة قبل رفعها (WebP/JPEG + تصغير الأبعاد + هدف حجم)
         + بطاقة تحكم في الضغط + سلة مهملات الصور + بطاقة النسخ الاحتياطي
   v6.1: حذف زر «نقل صور المستودع إلى السحابة» (النقل صار ذاتياً في الووركر)
         + إخفاء «إظهار الوصف / إظهار الأسعار» وفرضهما دائمين
         + نقل «عنوان فوق الإضافات» إلى الإعدادات (عام لكل الأصناف)
         + نقل «توفر خدمة التوصيل» أسفل بطاقة رسوم التوصيل
   v6.0: الصور تُرفع/تُحذف من R2 عبر الووركر بصلاحيات JWT — لا توكن GitHub
         + حذف صورة الصنف المحذوف عند نشر المنيو
         + حذف صور البانرات المحذوفة عند نشر الإعدادات
   v5.3: الدخول عبر API، وقراءة/حفظ menu.js و settings.js من D1
   v3.7: إصلاح معالج التبويبات
   v3.5: كسر كاش المتصفح/Service Worker
   v3.2: حذف البانر الفعلي + تنظيف اليتيمة
   v3.1: try-catch شامل + هجرات */

/* ===== إيقاف التكبير ===== */
document.addEventListener(`touchstart`,
function(e){
if(e.touches.length > 1) e.preventDefault();
}, {passive:false});
document.addEventListener(`touchmove`,
function(e){
if(e.touches.length > 1) e.preventDefault();
}, {passive:false});
[`gesturestart`,`gesturechange`,
`gestureend`].forEach(function(ev){
document.addEventListener(ev,
function(e){ e.preventDefault(); });
});
document.addEventListener(`dblclick`,
function(e){ e.preventDefault(); });

/* ===== ثوابت الدخول والنشر ===== */
const API_BASE = `https://makaronjy-api.makaronjy.workers.dev`;
const IMG_BASE = API_BASE + `/api/img/`;
const GH_OWNER = `makaronjy`;
const GH_REPO = `Makaronjy`;
const GH_BRANCH = `main`;
let CFG = null;
let STATE = null;
let modalOnSave = null;
let ALANG =
(localStorage.getItem(`mk_admin_lang`) === `en`) ? `en` : `ar`;

/* ===== أدوات عامة ===== */
const el = function(id){
return document.getElementById(id);
};
function esc(s){
var v = String(s == null ? `` : s);
return v.replace(/[&<>"']/g, function(c){
var m = {
[`&`]:`&amp;`,
[`<`]:`&lt;`,
[`>`]:`&gt;`,
[`"`]:`&quot;`,
[`'`]:`&#39;`
};
return m[c];
});
}
function L(k, a){
var src = (typeof ASTR !== `undefined`) ? ASTR : {};
var d = src[ALANG] || src.ar || {};
var v = d[k];
if(v === undefined && src.ar) v = src.ar[k];
if(v === undefined) v = k;
if(typeof v === `function`) return v(a);
return v;
}
function LF(k){
var args = [].slice.call(arguments, 1);
var src = (typeof ASTR !== `undefined`) ? ASTR : {};
var d = src[ALANG] || src.ar || {};
var v = d[k];
if(v === undefined && src.ar) v = src.ar[k];
if(typeof v === `function`) return v.apply(null, args);
return v;
}
function mv(id){
var n = el(id);
return n ? n.value : ``;
}
function radioVal(name, dflt){
var sel = `input[name="` + name + `"]:checked`;
var n = document.querySelector(sel);
return n ? n.value : dflt;
}
function checkedVals(cls){
var sel = `.` + cls + `:checked`;
var list = document.querySelectorAll(sel);
return [].slice.call(list).map(function(c){
return c.value;
});
}
/* تنسيق أحجام الملفات */
function fmtKB(bytes){
if(!isFinite(bytes)) return `—`;
if(bytes < 1024) return bytes + ` B`;
if(bytes < 1024*1024) return (bytes/1024).toFixed(0) + ` KB`;
return (bytes/1024/1024).toFixed(2) + ` MB`;
}

/* ===== حاجز زر الرجوع ===== */
let guardDepth = 0;
let suppressCount = 0;
function modalOpen(){
return !el(`modal`).classList.contains(`hidden`);
}
function confirmOpen(){
return !el(`confirmModal`).classList.contains(`hidden`);
}
function pushGuard(){
try{
history.pushState({ mkAdminGuard: 1 }, ``);
guardDepth++;
}catch(e){ guardDepth++; }
}
function consumeGuard(){
if(guardDepth <= 0) return;
guardDepth--;
suppressCount++;
try{ history.back(); }catch(e){ suppressCount--; }
setTimeout(function(){
if(suppressCount > 0) suppressCount--;
}, 600);
}
window.addEventListener(`popstate`, function(){
if(suppressCount > 0){ suppressCount--; return; }
if(guardDepth > 0) guardDepth--;
if(confirmOpen()){ settleConfirm(false, false); return; }
if(modalOpen()){ hideModalOnly(); return; }
});
document.addEventListener(`keydown`, function(e){
if(e.key !== `Escape`) return;
if(confirmOpen()){ settleConfirm(false); return; }
if(modalOpen()){ closeModal(); return; }
});
/* فتح المعاينات بالحجم الكامل */
document.addEventListener(`click`, function(e){
var im = e.target.closest(`.img-prev img`);
if(im && im.getAttribute(`src`)){
window.open(im.getAttribute(`src`), `_blank`);
}
});

/* ===== اللغة ===== */
function applyAdminLang(){
document.documentElement.lang = ALANG;
var nodes = document.querySelectorAll(`[data-al]`);
nodes.forEach(function(n){
var k = n.getAttribute(`data-al`);
var v = L(k);
if(v !== k) n.textContent = v;
});
var segs =
document.querySelectorAll(`.lang-seg[data-alang]`);
segs.forEach(function(s){
var on = s.getAttribute(`data-alang`) === ALANG;
s.classList.toggle(`active`, on);
});
localStorage.setItem(`mk_admin_lang`, ALANG);
}
el(`adminLangBtn`).addEventListener(`click`,
function(e){
var s = e.target.closest(`.lang-seg`);
if(!s) return;
ALANG = s.getAttribute(`data-alang`);
applyAdminLang();
if(STATE && typeof renderAll === `function`) renderAll();
});

/* ===== التوستات ===== */
function toast(title, kind, sub){
kind = kind || `info`;
var wrap = el(`toasts`);
if(!wrap) return;
var icons = {
success:`✔`, error:`✖`, info:`ℹ`, warn:`⚠`
};
var div = document.createElement(`div`);
div.className = `toast ` + kind;
div.innerHTML =
`<div class="t-ico">` + (icons[kind] || `ℹ`) + `</div>` +
`<div class="t-body"><b>` + esc(title) + `</b>` +
(sub ? `<small>` + esc(sub) + `</small>` : ``) +
`</div>` +
`<div class="t-bar" style="animation-duration:3.5s"></div>`;
wrap.appendChild(div);
setTimeout(function(){
div.classList.add(`out`);
setTimeout(function(){ div.remove(); }, 350);
}, 3400);
}

/* ===== نافذة التأكيد + حقل كتابة delete ===== */
let confirmResolve = null;
let cfRequireDelete = false;
let cfDeleteInput = null;
let cfDeleteHint = null;
function ensureCfDelete(){
if(cfDeleteInput) return cfDeleteInput;
cfDeleteInput = document.createElement(`input`);
cfDeleteInput.id = `cfDeleteInput`;
cfDeleteInput.type = `text`;
cfDeleteInput.autocomplete = `off`;
cfDeleteInput.spellcheck = false;
cfDeleteInput.style.cssText =
`width:100%;margin:0 0 .5rem;` +
`border:1.5px solid var(--line);border-radius:12px;` +
`padding:.6rem .8rem;font-family:inherit;` +
`font-weight:800;font-size:.95rem;text-align:center;` +
`background:#fff;color:var(--ink);outline:none;` +
`direction:ltr;letter-spacing:1px`;
cfDeleteHint = document.createElement(`small`);
cfDeleteHint.id = `cfDeleteHintLbl`;
cfDeleteHint.style.cssText =
`display:block;color:var(--muted);font-weight:700;` +
`font-size:.7rem;margin:0 0 .8rem;line-height:1.6`;
var msgEl = el(`cfMsg`);
if(msgEl && msgEl.parentNode){
msgEl.parentNode.insertBefore(cfDeleteInput,
msgEl.nextSibling);
msgEl.parentNode.insertBefore(cfDeleteHint,
cfDeleteInput.nextSibling);
}
cfDeleteInput.addEventListener(`input`,
refreshCfDelete);
return cfDeleteInput;
}
function cfDeleteOk(){
var v = cfDeleteInput ? (cfDeleteInput.value || ``) : ``;
return v.trim().toLowerCase() === `delete`;
}
function refreshCfDelete(){
if(!cfRequireDelete) return;
var ok = cfDeleteOk();
var yes = el(`cfYes`);
if(!yes) return;
yes.disabled = !ok;
yes.style.opacity = ok ? `1` : `.45`;
yes.style.cursor = ok ? `pointer` : `default`;
}
function askConfirm(msg, title, ico, yesLbl,
requireDelete){
return new Promise(function(resolve){
confirmResolve = resolve;
cfRequireDelete = !!requireDelete;
el(`cfIco`).textContent = ico || `⚠️`;
el(`cfTitle`).textContent =
title || L(`confirmDefault`);
el(`cfMsg`).textContent = msg;
el(`cfYes`).textContent =
yesLbl || L(`btnDelFinal`);
el(`cfNo`).textContent = L(`modalCancel`);
var inp = ensureCfDelete();
if(cfRequireDelete){
inp.style.display = ``;
cfDeleteHint.style.display = ``;
cfDeleteHint.textContent =
L(`cfDeleteWord`) + ` — ` + L(`cfDeleteHint`);
inp.value = ``;
refreshCfDelete();
setTimeout(function(){
try{ inp.focus(); }catch(e){}
}, 80);
}else{
inp.style.display = `none`;
cfDeleteHint.style.display = `none`;
var yes = el(`cfYes`);
yes.disabled = false;
yes.style.opacity = `1`;
yes.style.cursor = `pointer`;
}
el(`confirmModal`).classList.remove(`hidden`);
pushGuard();
});
}
function settleConfirm(val, consume){
if(consume === undefined) consume = true;
if(!confirmOpen() && !confirmResolve) return;
if(cfRequireDelete && val === true && !cfDeleteOk()){
return;
}
el(`confirmModal`).classList.add(`hidden`);
if(cfDeleteInput) cfDeleteInput.value = ``;
cfRequireDelete = false;
var yes = el(`cfYes`);
yes.disabled = false;
yes.style.opacity = `1`;
var r = confirmResolve;
confirmResolve = null;
if(consume) consumeGuard();
if(r) r(val);
}
el(`cfYes`).addEventListener(`click`, function(){
settleConfirm(true);
});
el(`cfNo`).addEventListener(`click`, function(){
settleConfirm(false);
});
el(`confirmModal`).addEventListener(`click`,
function(e){
if(e.target === el(`confirmModal`)){
settleConfirm(false);
}
});

/* ===== نافذة النماذج ===== */
function openModal(title, bodyHtml, onSave){
el(`modalTitle`).textContent = title;
el(`modalBody`).innerHTML = bodyHtml;
modalOnSave = onSave;
el(`modal`).classList.remove(`hidden`);
pushGuard();
}
function hideModalOnly(){
el(`modal`).classList.add(`hidden`);
modalOnSave = null;
}
function closeModal(){
hideModalOnly();
consumeGuard();
}
el(`modalCancel`).addEventListener(`click`, closeModal);
el(`modal`).addEventListener(`click`, function(e){
if(e.target === el(`modal`)) closeModal();
});
el(`modalSave`).addEventListener(`click`,
async function(){
if(!modalOnSave) return;
try{
var res = await modalOnSave();
if(res !== false) closeModal();
}catch(err){
var m = (err && err.message) ? err.message : err;
toast(L(`errGeneric`) + m, `error`);
}
});

/* ===== لافتات الأخطاء ===== */
function showBanner(id, msg, detail){
var b = el(id);
if(!b) return;
b.innerHTML =
`<span>⚠️</span><div><span class="msg"></span>` +
(detail ? `<small>` + esc(detail) + `</small>` : ``) +
`</div>`;
b.querySelector(`.msg`).textContent = msg;
b.classList.remove(`show`);
void b.offsetWidth;
b.classList.add(`show`);
}
function hideBanner(id){
var b = el(id);
if(b) b.classList.remove(`show`);
}
function classifyGhError(e){
var status = e.http || 0;
var msg = (e.message || ``).toLowerCase();
if(status === 0){
return {
key:`errNetwork`,
detail: e.message || `No connection`
};
}
if(status === 401){
return { key:`errAuth`, detail:`Bad credentials` };
}
if(status === 403){
if(msg.includes(`rate limit`)){
return { key:`errGeneric`, detail:`Rate limit` };
}
return { key:`errPermission`, detail: e.message };
}
if(status === 404){
return { key:`errNotFound`, detail: e.message };
}
return {
key:`errGeneric`,
detail: e.message || (`HTTP ` + status)
};
}
function handlePublishError(e, btn, label){
if(e.http === 401 || e.http === 403){
toast(e.http === 401
? L(`errAuth`)
: L(`errPermission`), `error`);
showRenew();
}else{
toast(L(`publishFail`) + e.message, `error`);
}
if(btn){
btn.disabled = false;
btn.textContent = label;
}
}

/* ===== طبقة السحابة D1 ===== */
async function apiFetch(path, opts){
opts = opts || {};
var headers = {
[`Content-Type`]:`application/json`
};
if(opts.headers){
Object.assign(headers, opts.headers);
}
var tok = (CFG && CFG.token) ? CFG.token
: sessionStorage.getItem(`mk_admin_token`);
if(tok) headers[`Authorization`] = `Bearer ` + tok;
var r = await fetch(API_BASE + path,
Object.assign({}, opts, {
headers: headers,
cache: `no-store`
}));
if(!r.ok){
var e = new Error(`HTTP ` + r.status);
e.http = r.status;
try{
var j = await r.json();
e.message = j.error || j.message || e.message;
}catch(err){}
throw e;
}
return r.json();
}

/* =====================================================
   ===== ضغط الصور قبل الرفع =====
===================================================== */
const CMP_KEY = `mk_img_compress`;
const CMP_DEFAULTS = {
enabled: true,
format: `webp`,
itemMax: 1200,
bannerMax: 1600,
appMax: 1600,
quality: 0.82,
targetKB: 320
};
let CMP = (function(){
try{
var raw = JSON.parse(localStorage.getItem(CMP_KEY) || `null`);
if(raw && typeof raw === `object`){
return Object.assign({}, CMP_DEFAULTS, raw);
}
}catch(e){}
return Object.assign({}, CMP_DEFAULTS);
})();
function cmpSave(){
try{ localStorage.setItem(CMP_KEY, JSON.stringify(CMP)); }catch(e){}
}
function cmpPreset(kind){
var max = CMP.itemMax;
if(kind === `banner`) max = CMP.bannerMax;
else if(kind === `app`) max = CMP.appMax;
return {
max: Math.max(320, Math.min(4000, +max || 1200)),
quality: Math.max(0.4, Math.min(0.98, +CMP.quality || 0.82)),
targetKB: Math.max(60, Math.min(2000, +CMP.targetKB || 320))
};
}
function cmpLoadViaImg(file){
return new Promise(function(resolve, reject){
var url = URL.createObjectURL(file);
var im = new Image();
im.onload = function(){
URL.revokeObjectURL(url);
resolve(im);
};
im.onerror = function(){
URL.revokeObjectURL(url);
reject(new Error(`تعذر قراءة الصورة — جرّب صيغة PNG أو JPG`));
};
im.src = url;
});
}
function cmpLoadSource(file){
if(window.createImageBitmap){
return createImageBitmap(file).catch(function(){
return cmpLoadViaImg(file);
});
}
return cmpLoadViaImg(file);
}
function cmpToBlob(cv, type, q){
return new Promise(function(resolve){
try{
cv.toBlob(function(b){ resolve(b); }, type, q);
}catch(e){ resolve(null); }
});
}
/* الضغط: تصغير الأبعاد ثم خفض الجودة تدريجياً حتى الهدف */
async function compressImage(file, kind){
var before = (file && file.size) || 0;
if(!CMP.enabled || !file || !/^image\//.test(file.type || ``)){
return {
base64: await b64OfFile(file),
before: before, after: before,
type: (file && file.type) || `image/png`,
width: 0, height: 0, skipped: true
};
}
var p = cmpPreset(kind);
var src = await cmpLoadSource(file);
var sw = src.width || src.naturalWidth || 0;
var sh = src.height || src.naturalHeight || 0;
if(!sw || !sh){
if(src.close) src.close();
throw new Error(`أبعاد الصورة غير معروفة`);
}
var wanted = (CMP.format === `jpeg`) ? `image/jpeg` : `image/webp`;
var maxDim = p.max;
var q = p.quality;
var blob = null, outType = wanted, tw = sw, th = sh;
for(var attempt = 0; attempt < 8; attempt++){
var scale = Math.min(1, maxDim / Math.max(sw, sh));
tw = Math.max(1, Math.round(sw * scale));
th = Math.max(1, Math.round(sh * scale));
var cv = document.createElement(`canvas`);
cv.width = tw; cv.height = th;
var ctx = cv.getContext(`2d`);
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = `high`;
if(wanted === `image/jpeg`){
ctx.fillStyle = `#ffffff`;
ctx.fillRect(0, 0, tw, th);
}
ctx.drawImage(src, 0, 0, tw, th);
blob = await cmpToBlob(cv, wanted, q);
outType = wanted;
if(!blob || (wanted === `image/webp` && blob.type !== `image/webp`)){
outType = `image/jpeg`;
blob = await cmpToBlob(cv, `image/jpeg`, q);
}
if(!blob) break;
if(blob.size <= p.targetKB * 1024) break;
if(q > 0.56){ q = Math.max(0.5, q - 0.08); }
else { maxDim = Math.max(320, Math.round(maxDim * 0.84)); }
}
if(src.close) src.close();
if(!blob) throw new Error(`تعذر ضغط الصورة في هذا المتصفح`);
/* لا نستخدم نسخة أكبر من الأصل */
if(before && blob.size >= before){
return {
base64: await b64OfFile(file),
before: before, after: before,
type: file.type || `image/png`,
width: sw, height: sh, skipped: true
};
}
return {
base64: await b64OfFile(blob),
before: before, after: blob.size,
type: outType, width: tw, height: th, skipped: false
};
}
function cmpReport(res, label){
var box = el(`cmpLast`);
var pct = res.before ? Math.max(0, Math.round((1 - res.after/res.before)*100)) : 0;
if(box){
box.innerHTML = res.skipped
? `آخر صورة: <b>` + esc(label) + `</b> — رُفعت كما هي (` + fmtKB(res.after) + `)`
: `آخر صورة: <b>` + esc(label) + `</b> — ` +
fmtKB(res.before) + ` ← <b style="color:var(--green)">` + fmtKB(res.after) + `</b> ` +
`<span style="color:var(--green);font-weight:900">−` + pct + `%</span>` +
` · ` + res.width + `×` + res.height + ` · ` + esc(String(res.type).replace(`image/`,``));
}
if(!res.skipped && res.before){
toast(`🗜️ ضُغطت الصورة −` + pct + `%`, `success`,
fmtKB(res.before) + ` ← ` + fmtKB(res.after));
}
}

/* ===== طبقة الصور عبر R2 (بدون GitHub / بدون توكن صور) ===== */
async function imgPut(path, base64){
return apiFetch(`/api/img/` + path, {
method:`PUT`,
body: JSON.stringify({ data: base64 })
});
}
async function imgDelete(path){
if(!path) return null;
try{
return await apiFetch(`/api/img/` + path, { method:`DELETE` });
}catch(e){ return null; /* الحذف متسامح — نتجاهل غير الموجود */ }
}
async function imgList(prefix){
var j = await apiFetch(`/api/img?prefix=` + encodeURIComponent(prefix || ``));
return j.files || [];
}
function bumpImagesVersion(){
if(STATE && STATE.SETTINGS){
STATE.SETTINGS.imagesVersion = Date.now();
}
}
function b64OfFile(file){
return file.arrayBuffer().then(function(buf){
var bytes = ``;
var u8 = new Uint8Array(buf);
for(var i=0;i<u8.length;i+=32768){
bytes += String.fromCharCode.apply(null,
u8.subarray(i, i+32768));
}
return btoa(bytes);
});
}
/* استخراج البيانات من نص JS أو JSON
   ملاحظة: مستخدمة من putFile فقط — واجهة كتابة عامة محفوظة للتوافق */
function extractData(text, kind){
try{
var w = parseJs(text);
return kind === `menu` ? w.MENU : w.APP_SETTINGS;
}catch(e){
var j = JSON.parse(text);
return kind === `menu` ? (j.menu || j) : (j.settings || j);
}
}

/* ===== قراءة/حفظ: المنيو والإعدادات من D1، والصور من R2 ===== */
async function getFile(path){
if(path === `menu.js`){
var jm = await apiFetch(`/api/data/menu`);
return {
text: `window.MENU = ` + JSON.stringify(jm.menu) + `;\n`,
sha: null
};
}
if(path === `settings.js`){
var js = await apiFetch(`/api/data/settings`);
return {
text: `window.APP_SETTINGS = ` + JSON.stringify(js.settings) + `;\n`,
sha: null
};
}
return { text:``, sha:null, url: IMG_BASE + path };
}
/* واجهة كتابة عامة — غير مستخدمة حالياً (النشر يمرّ عبر publishMenu/publishSettings)
   محفوظة عمداً للتوافق مع أي مستدعٍ خارجي */
async function putFile(path, content, sha, msg){
if(path === `menu.js`){
var menu = extractData(content, `menu`);
await apiFetch(`/api/data/menu`, {
method:`PUT`,
body: JSON.stringify({ menu: menu })
});
return { content:{ sha:null } };
}
if(path === `settings.js`){
var settings = extractData(content, `settings`);
await apiFetch(`/api/data/settings`, {
method:`PUT`,
body: JSON.stringify({ settings: settings })
});
return { content:{ sha:null } };
}
await imgPut(path, content);
return { content:{ sha:null } };
}
/* سرد صور مجلد من السحابة */
async function listDir(dirPath){
var prefix = String(dirPath || ``).replace(/\/?$/, `/`);
return imgList(prefix);
}
/* كل الرفع يمرّ بالضغط */
async function uploadItemImgById(id, file){
var path = `img/items/` + id + `.png`;
var res = await compressImage(file, `item`);
await imgPut(path, res.base64);
cmpReport(res, `صورة صنف`);
bumpImagesVersion();
return path;
}
async function uploadAppImage(path, file){
/* الاستبدال على نفس المفتاح يمسح الصورة القديمة تلقائياً */
var res = await compressImage(file, `app`);
await imgPut(path, res.base64);
cmpReport(res, `صورة التطبيق`);
bumpImagesVersion();
return path;
}
async function uploadBannerImg(path, file){
var res = await compressImage(file, `banner`);
await imgPut(path, res.base64);
cmpReport(res, `بانر`);
return path;
}

/* parseJs محمي من النصوص الفارغة أو المكسورة */
function parseJs(text){
if(!text || typeof text !== `string`){
throw new Error(`الملف فارغ أو غير صالح`);
}
var w = { window:{} };
try{
new Function(`window`, text)(w.window);
}catch(e){
throw new Error(`خطأ في قراءة الملف: ` + e.message);
}
return w.window;
}

/* ===== الحالة والهجرات ===== */
function branches(){
return STATE.SETTINGS.branches ||
(STATE.SETTINGS.branches = []);
}
function brName(b){
var n = (ALANG===`ar`) ? b.nameAr : b.nameEn;
return n || (`B` + b.num);
}
function findItemAdmin(id){
for(var s of STATE.MENU){
for(var it of s.items){
if(it.id === id) return it;
}
}
return null;
}
function renumberBranches(){
branches().forEach(function(b, i){
b.num = i + 1;
});
}
function migrateBranchNums(){
branches().forEach(function(b,i){
if(!Number.isFinite(b.num)) b.num = i + 1;
});
var seen = new Set();
branches().forEach(function(b){
while(seen.has(b.num)) b.num++;
seen.add(b.num);
});
}
function migrateHours(){
branches().forEach(function(b){
if(!b.hours || b.hours.length !== 7){
b.hours = [];
for(var i=0;i<7;i++){
b.hours.push({
o:{h:9,m:0}, c:{h:23,m:0}, closed:false
});
}
}
b.hours.forEach(function(d){
if(!d.o) d.o = {h:9,m:0};
if(!d.c) d.c = {h:23,m:0};
if(typeof d.closed !== `boolean`){
d.closed = false;
}
});
});
}
function migrateBestSellers(){
var s = STATE.SETTINGS;
if(!s.bestSellers || s.bestSellers.length !== 4){
s.bestSellers = [``,``,``,``];
}
}
function migrateSocial(){
if(STATE.SETTINGS.social === undefined){
STATE.SETTINGS.social = [];
}
}
function migratePayments(){
var s = STATE.SETTINGS;
if(!s.payments){
s.payments = {
cod: { enabled: true },
gateway: {
enabled: false,
provider: `moyasar`,
publishableKey: ``
}
};
}
if(!s.payments.cod) s.payments.cod = { enabled: true };
if(!s.payments.gateway){
s.payments.gateway = {
enabled: false,
provider: `moyasar`,
publishableKey: ``
};
}
}
/* عنوان الإضافات العام + فرض الوصف والسعرات */
function migrateModsTitles(){
var s = STATE.SETTINGS;
if(!s.modsTitles || typeof s.modsTitles !== `object`){
s.modsTitles = { ar:`غالبًا ما يتم طلبه مع`, en:`Often ordered with` };
}
if(typeof s.modsTitles.ar !== `string`) s.modsTitles.ar = ``;
if(typeof s.modsTitles.en !== `string`) s.modsTitles.en = ``;
}
function forceDisplayFlags(){
if(!STATE || !STATE.SETTINGS) return;
var d = STATE.SETTINGS.display = STATE.SETTINGS.display || {};
d.showDesc = true;
d.showCal = true;
if(d.mode !== `list` && d.mode !== `grid`) d.mode = `grid`;
}

/* ===== أدوات الوقت ===== */
function clamp12(v){
var n = parseInt(v,10);
if(!isFinite(n)) n = 12;
if(n<1) n = 1;
if(n>12) n = 12;
return n;
}
function to24h(h, ap){
var v = +h;
if(ap===`pm` && v<12) v+=12;
if(ap===`am` && v===12) v=0;
return v;
}
function h12of(h){
h = +h;
if(h===0) return 12;
if(h>12) return h-12;
return h;
}
function minSelect(cls, d, val){
var o0 = (val===0) ? ` selected` : ``;
var o30 = (val===30) ? ` selected` : ``;
return `<select class="` + cls +
`" data-d="` + d + `">` +
`<option value="0"` + o0 + `>00</option>` +
`<option value="30"` + o30 + `>30</option>` +
`</select>`;
}
function validWa(v){
return /^\d{1,3}\d{9}$/.test(v);
}
function waFeedback(inp, msg){
var v = inp.value.trim();
if(!v){
msg.className=`wa-preview`;
msg.textContent=``;
return;
}
if(validWa(v)){
var cc = v.slice(0,-9);
var link = `https://wa.me/` + v;
msg.className=`wa-preview ok`;
if(cc === `966`){
msg.innerHTML = L(`waOk`) +
` <a href="` + link +
`" target="_blank" rel="noopener" ` +
`style="color:#2d6a4f;` +
`text-decoration:underline">` +
link + `</a>`;
}else{
msg.textContent = L(`waNonSa`);
}
}else{
msg.className=`wa-preview bad`;
msg.textContent = L(`waBad`);
}
}

/* ===== التبويبات (v3.7: إصلاح الإخفاء) ===== */
document.querySelectorAll(`.tab`).forEach(function(t){
t.addEventListener(`click`, function(){
document.querySelectorAll(`.tab`).forEach(function(x){
x.classList.remove(`active`);
});
t.classList.add(`active`);
document.querySelectorAll(`main > section`).forEach(
function(s){ s.classList.add(`hidden`); });
var sec = el(`tab-` + t.dataset.tab);
if(sec) sec.classList.remove(`hidden`);
});
});

/* ===== الخروج ===== */
el(`btnLogout`).addEventListener(`click`,
async function(){
var ok = await askConfirm(
L(`logoutMsg`), L(`logoutTitle`), `🚪`, L(`logoutYes`));
if(!ok) return;
sessionStorage.removeItem(`mk_admin`);
sessionStorage.removeItem(`mk_admin_token`);
sessionStorage.removeItem(`mk_admin_user`);
sessionStorage.removeItem(`mk_gh_asset_token`);
location.reload();
});

/* ===== تحميل البيانات (المصدر D1) ===== */
async function loadAll(){
var menuText, settingsText;
try{
var both = await Promise.all([
getFile(`menu.js`),
getFile(`settings.js`)
]);
menuText = both[0].text;
settingsText = both[1].text;
}catch(e){
var cls = classifyGhError(e);
throw new Error(
L(cls.key) +
(cls.detail ? ` — ` + cls.detail : ``)
);
}
var mw, sw;
try{
mw = parseJs(menuText);
}catch(e){
throw new Error(
`ملف menu.js غير صالح: ` + e.message
);
}
try{
sw = parseJs(settingsText);
}catch(e){
throw new Error(
`ملف settings.js غير صالح: ` + e.message
);
}
if(!mw.MENU || !Array.isArray(mw.MENU)){
throw new Error(
`ملف menu.js لا يحتوي على مصفوفة MENU`
);
}
if(!sw.APP_SETTINGS || typeof sw.APP_SETTINGS !== `object`){
throw new Error(
`ملف settings.js لا يحتوي على APP_SETTINGS`
);
}
var newState = {
MENU: mw.MENU,
SETTINGS: sw.APP_SETTINGS,
shas: { menu: both[0].sha, settings: both[1].sha }
};
var S0 = newState.SETTINGS;
if(!S0.ad) S0.ad = {};
if(!S0.ad.icon) S0.ad.icon = `🍝`;
if(!S0.delivery) S0.delivery = [];
if(S0.social === undefined) S0.social = [];
if(!S0.imagesVersion) S0.imagesVersion = 0;
if(!S0.display){
S0.display = {
mode:`grid`, showDesc:true, showCal:true
};
}
if(S0.bgs) delete S0.bgs;
STATE = newState;
migrateBranchNums();
migrateHours();
migrateBestSellers();
migrateSocial();
migratePayments();
migrateModsTitles();
forceDisplayFlags();
el(`renewScreen`).classList.add(`hidden`);
el(`loginScreen`).classList.add(`hidden`);
el(`app`).classList.remove(`hidden`);
if(typeof renderAll === `function`) renderAll();
}

/* ===== الدخول عبر API (اسم مستخدم + كلمة مرور) ===== */
el(`btnLogin`).addEventListener(`click`,
async function(){
var username = el(`inOwner`).value.trim();
var password = el(`inToken`).value.trim();
hideBanner(`loginErr`);
if(!username || !password){
showBanner(`loginErr`, `اسم المستخدم وكلمة المرور مطلوبان`);
return;
}
var btn = el(`btnLogin`);
btn.textContent = `جارٍ تسجيل الدخول...`;
btn.disabled = true;
try{
var response = await fetch(API_BASE + `/api/auth/login`, {
method: `POST`,
headers: { [`Content-Type`]: `application/json` },
body: JSON.stringify({ username: username, password: password })
});
var data = await response.json();
if(!response.ok){
throw new Error(data.error || `بيانات الدخول غير صحيحة`);
}
sessionStorage.setItem(`mk_admin_token`, data.token);
sessionStorage.setItem(`mk_admin_user`, JSON.stringify(data.user));
CFG = {
owner: GH_OWNER,
repo: GH_REPO,
branch: GH_BRANCH,
token: data.token
};
sessionStorage.setItem(`mk_admin`,
JSON.stringify(CFG));
await loadAll();
applyAdminLang();
toast(L(`loggedIn`), `success`, L(`loggedSub`));
}catch(e){
var errMsg = (e && e.message) ? e.message : String(e);
showBanner(`loginErr`,
L(`errPublish`),
errMsg
);
sessionStorage.removeItem(`mk_admin`);
sessionStorage.removeItem(`mk_admin_token`);
sessionStorage.removeItem(`mk_admin_user`);
CFG = null;
}
btn.disabled = false;
btn.textContent = L(`btnLogin`);
});
[`inOwner`,`inToken`].forEach(function(id){
el(id).addEventListener(`keydown`, function(e){
if(e.key === `Enter`) el(`btnLogin`).click();
});
});

/* ===== شاشة تجديد الجلسة (كلمة المرور) ===== */
function showRenew(){
el(`loginScreen`).classList.add(`hidden`);
el(`app`).classList.add(`hidden`);
el(`renewScreen`).classList.remove(`hidden`);
var inp = el(`inRenewToken`);
if(inp){ inp.type = `password`; inp.placeholder = `كلمة المرور`; inp.value = ``; }
}
el(`btnRenew`).addEventListener(`click`,
async function(){
var p = el(`inRenewToken`).value.trim();
hideBanner(`renewErr`);
if(!p){
showBanner(`renewErr`, L(`errRenewEmpty`));
return;
}
var u = `owner`;
try{
u = (JSON.parse(sessionStorage.getItem(`mk_admin_user`) || `{}`).username) || `owner`;
}catch(e){}
var btn = el(`btnRenew`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
var r = await fetch(API_BASE + `/api/auth/login`, {
method: `POST`,
headers: { [`Content-Type`]: `application/json` },
body: JSON.stringify({ username: u, password: p })
});
var d = await r.json();
if(!r.ok){
var er = new Error(d.error || `HTTP ` + r.status);
er.http = r.status;
throw er;
}
CFG = {
owner: GH_OWNER,
repo: GH_REPO,
branch: GH_BRANCH,
token: d.token
};
sessionStorage.setItem(`mk_admin`, JSON.stringify(CFG));
sessionStorage.setItem(`mk_admin_token`, d.token);
sessionStorage.setItem(`mk_admin_user`, JSON.stringify(d.user));
await loadAll();
toast(L(`loggedIn`), `success`, L(`loggedSub`));
}catch(e){
var cls = classifyGhError(e);
var bad = (e.http===401||e.http===403);
showBanner(`renewErr`,
bad ? L(`errRenewBad`) : L(cls.key),
cls.detail || (e && e.message));
}
btn.disabled = false;
btn.textContent = L(`btnRenew`);
});

/* ===== تحديث ===== */
el(`btnRefresh`).addEventListener(`click`,
async function(){
if(!CFG){
var t0 = sessionStorage.getItem(`mk_admin_token`);
if(t0) CFG = { owner:GH_OWNER, repo:GH_REPO, branch:GH_BRANCH, token:t0 };
}
if(!CFG) return;
var b = el(`btnRefresh`);
var old = b.textContent;
b.textContent = L(`refreshing`);
b.disabled = true;
try{
await loadAll();
toast(L(`refreshed`), `success`);
}catch(e){
if(e.http===401||e.http===403){
toast(L(`errAuth`), `error`);
showRenew();
}else{
toast(
(L(`refreshFail`) + ` `) +
(e && e.message ? e.message : ``),
`error`
);
}
}
b.disabled = false;
b.textContent = old;
});

/* ===== النشر إلى D1 + حذف الصور القديمة تلقائياً ===== */
var LAST_MENU = null;
var LAST_SETTINGS = null;

async function publishSettings(msg){
forceDisplayFlags();
var prevBanners = (LAST_SETTINGS && Array.isArray(LAST_SETTINGS.banners))
? LAST_SETTINGS.banners.map(function(b){ return b && b.img; }).filter(Boolean) : [];
var nowBanners = (STATE.SETTINGS.banners || [])
.map(function(b){ return b && b.img; }).filter(Boolean);
for(var i=0;i<prevBanners.length;i++){
if(nowBanners.indexOf(prevBanners[i]) < 0){
await imgDelete(prevBanners[i]);
}
}
await apiFetch(`/api/data/settings`, {
method:`PUT`,
body: JSON.stringify({ settings: STATE.SETTINGS })
});
STATE.shas.settings = null;
LAST_SETTINGS = JSON.parse(JSON.stringify(STATE.SETTINGS));
}

async function publishMenu(msg){
applyGlobalModsTitles();
var prev = menuItemIds(LAST_MENU), now = menuItemIds(STATE.MENU);
for(var i=0;i<prev.length;i++){
if(now.indexOf(prev[i]) < 0){
await imgDelete(`img/items/` + prev[i] + `.png`);
}
}
await apiFetch(`/api/data/menu`, {
method:`PUT`,
body: JSON.stringify({ menu: STATE.MENU })
});
STATE.shas.menu = null;
LAST_MENU = JSON.parse(JSON.stringify(STATE.MENU));
}
function menuItemIds(m){
var out = [];
(m || []).forEach(function(s){
(s.items || []).forEach(function(it){ out.push(it.id); });
});
return out;
}
/* حقن عنوان الإضافات العام في كل الأصناف */
function applyGlobalModsTitles(){
if(!STATE || !STATE.MENU || !STATE.SETTINGS) return;
var t = STATE.SETTINGS.modsTitles || { ar:``, en:`` };
STATE.MENU.forEach(function(s){
(s.items || []).forEach(function(it){
if(it.mods && !Array.isArray(it.mods)){
it.mods.tAr = t.ar || ``;
it.mods.tEn = t.en || ``;
}
});
});
}

/* =====================================================
   ===== v15.4: السلايدر + أنظمة رسوم التوصيل =====
===================================================== */
function migrateBanners(){
var S0 = STATE.SETTINGS;
if(!Array.isArray(S0.banners)) S0.banners = [];
S0.banners.forEach(function(b, i){
if(!b || typeof b !== `object`) return;
if(!b.id) b.id = `bn-` + (i + 1);
if(typeof b.v !== `number`) b.v = 0;
});
if(S0.deliveryFeeMode !== `free` &&
   S0.deliveryFeeMode !== `fixed` &&
   S0.deliveryFeeMode !== `perBranch`){
S0.deliveryFeeMode = `fixed`;
}
if(typeof S0.deliveryFee !== `number`){
S0.deliveryFee = 5;
}
if(S0.deliveryFeeMode === `perBranch`){
branches().forEach(function(b){
if(typeof b.deliveryFee !== `number`){
b.deliveryFee = S0.deliveryFee;
}
});
}
}
function v15Style(){
if(el(`v15Style`)) return;
var st = document.createElement(`style`);
st.id = `v15Style`;
st.textContent =
`.v15-card{background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:1rem;margin:0 0 1rem}` +
`.v15-card h3{font-size:1rem;font-weight:900;color:var(--ink);margin:0 0 .6rem}` +
`.v15-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:.6rem;margin:0 0 .7rem}` +
`.bn-adm{position:relative;border:1.5px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}` +
`.bn-adm .img-prev{aspect-ratio:16/9;overflow:hidden;background:#f0e8dc}` +
`.bn-adm .img-prev img{width:100%;height:100%;object-fit:cover;display:block}` +
`.bn-adm-act{display:flex;gap:.3rem;padding:.4rem}` +
`.bn-adm-act button{flex:1;border:none;border-radius:8px;padding:.35rem 0;font-weight:900;cursor:pointer;font-family:inherit;font-size:.72rem}` +
`.bn-up,.bn-dn{background:#f3e7d7;color:var(--ink)}` +
`.bn-del{background:#fee2e2;color:#b91c1c}` +
`.v15-row{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap}` +
`.v15-add{border:none;border-radius:12px;padding:.7rem 1.2rem;background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--dark);font-weight:900;cursor:pointer;font-family:inherit}` +
`.v15-pub{border:none;border-radius:12px;padding:.7rem 1.2rem;background:var(--wa);color:#fff;font-weight:900;cursor:pointer;font-family:inherit}` +
`.v15-clean{border:none;border-radius:12px;padding:.7rem 1.2rem;background:#fff6e6;color:#a06b1c;border:1.5px dashed #e0912f;font-weight:900;cursor:pointer;font-family:inherit}` +
`.v15-fee{width:110px;border:1.5px solid var(--line);border-radius:10px;padding:.55rem .6rem;font-family:inherit;font-weight:900;font-size:1rem;text-align:center}` +
`.v15-sel{width:110px;border:1.5px solid var(--line);border-radius:10px;padding:.55rem .6rem;font-family:inherit;font-weight:800;background:#fff;color:var(--ink)}` +
`.v15-bfees{display:flex;flex-direction:column;gap:.5rem;margin-top:.7rem}` +
`.v15-bfee-row{display:flex;align-items:center;gap:.6rem;background:#fff;border:1.5px solid var(--line);border-radius:10px;padding:.45rem .6rem}` +
`.v15-bfee-row span{flex:1;font-weight:800;font-size:.85rem;color:var(--ink)}` +
`.v15-bfee-row small{color:var(--muted);font-weight:700}` +
`.v15-inp{width:100%;padding:.6rem .7rem;border:1.5px solid var(--line);border-radius:10px;font-family:inherit;font-weight:800;font-size:.9rem;background:#fff;color:var(--ink);outline:none}` +
`.v15-inp:focus{border-color:var(--rust)}` +
`.v15-empty{color:var(--muted);font-weight:700;font-size:.8rem;padding:.6rem;border:1.5px dashed var(--line);border-radius:10px;text-align:center}` +
`.cmp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.7rem}` +
`.cmp-fld{display:flex;flex-direction:column;gap:.3rem}` +
`.cmp-fld label{font-size:.72rem;font-weight:900;color:var(--muted)}` +
`.cmp-fld input[type=range]{width:100%;accent-color:var(--rust)}` +
`.cmp-val{font-size:.78rem;font-weight:900;color:var(--rust)}` +
`.cmp-last{margin-top:.7rem;padding:.6rem .8rem;background:#fff;border:1.5px dashed var(--line);border-radius:10px;font-size:.76rem;font-weight:800;color:var(--ink);line-height:1.9}` +
`.cmp-sw{display:inline-flex;align-items:center;gap:.45rem;font-size:.8rem;font-weight:900;cursor:pointer}` +
`.trash-list{display:flex;flex-direction:column;gap:.5rem;max-height:340px;overflow-y:auto;padding:.2rem}` +
`.trash-list::-webkit-scrollbar{width:9px}` +
`.trash-list::-webkit-scrollbar-track{background:#f3e7d7;border-radius:9px}` +
`.trash-list::-webkit-scrollbar-thumb{background:var(--rust);border-radius:9px;border:2px solid #f3e7d7}` +
`.trash-row{display:flex;align-items:center;gap:.6rem;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:.5rem .6rem}` +
`.trash-ico{width:44px;height:44px;flex:0 0 auto;border-radius:10px;background:#f3e7d7;display:flex;align-items:center;justify-content:center;font-size:1.2rem}` +
`.trash-meta{flex:1;min-width:0;font-size:.74rem;font-weight:800;line-height:1.6}` +
`.trash-meta small{display:block;color:var(--muted);font-weight:700;font-size:.66rem;word-break:break-all}` +
`.trash-act{display:flex;gap:.3rem;flex-shrink:0}` +
`.trash-act button{border:none;border-radius:8px;padding:.4rem .55rem;font-family:inherit;font-weight:900;font-size:.7rem;cursor:pointer}` +
`.tr-restore{background:#e8f5e9;color:#2d6a4f}` +
`.tr-purge{background:#fee2e2;color:#b91c1c}` +
`.bk-info{margin-top:.6rem;font-size:.74rem;font-weight:800;color:var(--muted);line-height:1.9}`;
document.head.appendChild(st);
}
function adminSection(reList){
var tabs = document.querySelectorAll(`.tab`);
for(var i=0;i<tabs.length;i++){
var t = tabs[i];
var key = ((t.dataset && t.dataset.tab) || ``) +
` ` + (t.textContent || ``);
for(var r=0;r<reList.length;r++){
if(reList[r].test(key)){
return el(`tab-` + t.dataset.tab);
}
}
}
return null;
}
function ensureV15Cards(){
if(el(`v15BannerCard`)) return;
v15Style();
var adsSec = adminSection([/ads?|إعلان/i]);
var setSec = adminSection([/settings?|إعداد|ضبط/i]);
var host = adsSec || setSec ||
document.querySelector(`main > section`);
if(!host) return;
var card = document.createElement(`div`);
card.className = `v15-card`;
card.id = `v15BannerCard`;
card.innerHTML =
`<h3>🖼️ سلايدر الصفحة الرئيسية / Home Slider</h3>` +
`<div class="v15-grid" id="bnAdminList"></div>` +
`<div class="v15-row">` +
`<button class="v15-add" id="bnAddBtn">➕ إضافة بانر / Add</button>` +
`<button class="v15-pub" id="bnPublishBtn">🚀 نشر / Publish</button>` +
`<button class="v15-clean" id="bnCleanBtn">🧹 تنظيف اليتيمة / Clean orphans</button>` +
`<button class="v15-clean" id="itCleanBtn">🍝 تنظيف صور الأصناف اليتيمة</button>` +
`<input type="file" id="bnFile" accept="image/*" hidden>` +
`</div>`;
host.insertBefore(card, host.firstChild);
var feeHost = setSec || host;
var fee = document.createElement(`div`);
fee.className = `v15-card`;
fee.id = `v15FeeCard`;
fee.innerHTML =
`<h3>🛵 رسوم توصيل المطعم / Restaurant Delivery Fee</h3>` +
`<div class="v15-row">` +
`<select class="v15-sel" id="v15FeeMode">` +
`<option value="free">مجاني / Free</option>` +
`<option value="fixed">ثابت لكل الفروع / Fixed</option>` +
`<option value="perBranch">سعر لكل فرع / Per branch</option>` +
`</select>` +
`<input type="number" min="0" step="0.5" class="v15-fee" id="v15FeeInput">` +
`<span id="v15FeeUnit">ريال / SAR</span>` +
`<button class="v15-pub" id="feePublishBtn">🚀 نشر / Publish</button>` +
`</div>` +
`<div class="v15-bfees" id="v15BranchFees"></div>`;
feeHost.insertBefore(fee, feeHost.firstChild);
el(`bnAddBtn`).addEventListener(`click`, function(){
el(`bnFile`).click();
});
el(`bnFile`).addEventListener(`change`,
async function(e){
var f = e.target.files && e.target.files[0];
e.target.value = ``;
if(!f) return;
try{
toast(`جارٍ ضغط ورفع البانر...`, `info`);
var path = await uploadBannerImg(
`img/banners/bn-` + Date.now() + `.png`, f);
STATE.SETTINGS.banners.push({
id: `bn-` + Date.now(),
img: path,
v: Date.now(),
titleAr: ``,
titleEn: ``
});
renderBannersAdmin();
toast(`✔ تم إضافة البانر — اضغط نشر`, `success`);
}catch(err){
toast(`فشل الرفع: ` + err.message, `error`);
}
});
el(`bnPublishBtn`).addEventListener(`click`, publishV15);
el(`bnCleanBtn`).addEventListener(`click`, cleanOrphanBanners);
el(`itCleanBtn`).addEventListener(`click`, cleanOrphanItems);
el(`feePublishBtn`).addEventListener(`click`, publishV15);
el(`v15FeeMode`).addEventListener(`change`, function(e){
STATE.SETTINGS.deliveryFeeMode = e.target.value;
if(e.target.value === `perBranch`){
branches().forEach(function(b){
if(typeof b.deliveryFee !== `number`){
b.deliveryFee = STATE.SETTINGS.deliveryFee || 0;
}
});
}
renderFeeAdmin();
});
el(`v15FeeInput`).addEventListener(`change`, function(e){
var v = parseFloat(e.target.value);
STATE.SETTINGS.deliveryFee =
(isFinite(v) && v >= 0) ? v : 0;
});
el(`v15BranchFees`).addEventListener(`change`, function(e){
var id = e.target.getAttribute ?
e.target.getAttribute(`data-bfee`) : null;
if(!id) return;
var b = branches().find(function(x){ return x.id === id; });
if(!b) return;
var v = parseFloat(e.target.value);
b.deliveryFee = (isFinite(v) && v >= 0) ? v : 0;
});
el(`bnAdminList`).addEventListener(`click`,
async function(e){
var up = e.target.closest(`[data-bnup]`);
var dn = e.target.closest(`[data-bndn]`);
var del = e.target.closest(`[data-bndel]`);
var list = STATE.SETTINGS.banners;
if(up){
var i = +up.dataset.bnup;
if(i > 0){
var t = list[i-1]; list[i-1] = list[i]; list[i] = t;
renderBannersAdmin();
}
return;
}
if(dn){
var j = +dn.dataset.bndn;
if(j < list.length - 1){
var t2 = list[j+1]; list[j+1] = list[j]; list[j] = t2;
renderBannersAdmin();
}
return;
}
if(del){
var k = +del.dataset.bndel;
var bn = list[k];
var ok = await askConfirm(
`سيُحذف البانر من السلايدر.\nالصورة تنتقل إلى سلة المهملات (30 يوماً) ويمكن استرجاعها.\n\nالملف: ` +
(bn && bn.img ? bn.img : `—`),
`حذف بانر`, `🗑`, `حذف`);
if(!ok) return;
list.splice(k, 1);
if(bn && bn.img){
var dr = await imgDelete(bn.img);
if(dr && dr.trashed){
toast(`✔ حُذف — نُسخ إلى سلة المهملات`, `success`);
}else{
toast(`✔ حُذف من السحابة`, `success`);
}
renderTrash();
}
renderBannersAdmin();
toast(`✔ تم الحذف — اضغط نشر`, `success`);
}
});
}
function retryAdminBn(im){
if(!im || im.dataset.retrying) return;
var n = (+im.dataset.retry || 0) + 1;
if(n > 6) return;
im.dataset.retry = n;
im.dataset.retrying = `1`;
var s = im.getAttribute(`src`);
setTimeout(function(){
delete im.dataset.retrying;
im.removeAttribute(`src`);
im.src = s + (s.indexOf(`?`) >= 0 ? `&` : `?`) + `rr=` + Date.now();
}, 5000);
}
function renderBannersAdmin(){
var box = el(`bnAdminList`);
if(!box || !STATE) return;
var list = STATE.SETTINGS.banners || [];
if(!list.length){
box.innerHTML =
`<div class="v15-empty">لا توجد بانرات — أضف أول بانر ليظهر السلايدر بالتطبيق / No banners yet</div>`;
}else{
var bnAdmStamp = Date.now();
box.innerHTML = list.map(function(b, i){
var bq = (b.v ? `?v=` + b.v : ``) + (b.v ? `&r=` : `?r=`) + bnAdmStamp;
return `<div class="bn-adm">` +
`<div class="img-prev"><img src="` +
IMG_BASE + esc(b.img) + bq + `" onerror="retryAdminBn(this)"></div>` +
`<div class="bn-adm-act">` +
`<button class="bn-up" data-bnup="` + i + `">↑</button>` +
`<button class="bn-dn" data-bndn="` + i + `">↓</button>` +
`<button class="bn-del" data-bndel="` + i + `">🗑</button>` +
`</div></div>`;
}).join(``);
}
renderFeeAdmin();
}
function renderFeeAdmin(){
if(!STATE) return;
var S0 = STATE.SETTINGS;
var sel = el(`v15FeeMode`);
var inp = el(`v15FeeInput`);
var unit = el(`v15FeeUnit`);
var wrap = el(`v15BranchFees`);
if(!sel || !inp) return;
sel.value = S0.deliveryFeeMode || `fixed`;
inp.value = S0.deliveryFee;
var isFree = (S0.deliveryFeeMode === `free`);
inp.style.display = isFree ? `none` : ``;
if(unit) unit.style.display = isFree ? `none` : ``;
if(wrap){
if(S0.deliveryFeeMode === `perBranch`){
wrap.style.display = ``;
wrap.innerHTML = branches().map(function(b){
var val = (typeof b.deliveryFee === `number`)
? b.deliveryFee : (S0.deliveryFee || 0);
return `<div class="v15-bfee-row"><span>` +
esc(brName(b)) + `</span>` +
`<input type="number" min="0" step="0.5" class="v15-fee" ` +
`data-bfee="` + esc(b.id) + `" value="` + val + `">` +
`<small>ريال</small></div>`;
}).join(``);
}else{
wrap.style.display = `none`;
wrap.innerHTML = ``;
}
}
}
async function publishV15(){
var btn = el(`bnPublishBtn`);
var old = btn.textContent;
btn.disabled = true;
btn.textContent = `...`;
try{
await publishSettings(`🖼️ تحديث السلايدر ورسوم التوصيل`);
toast(`✔ تم النشر — سيظهر بالتطبيق خلال ثوانٍ`,
`success`);
}catch(e){
handlePublishError(e, btn, old);
return;
}
btn.disabled = false;
btn.textContent = old;
}

/* ===== تنظيف صور البانرات اليتيمة (إلى سلة المهملات) ===== */
async function cleanOrphanBanners(){
if(!STATE || !CFG){
toast(`سجّل الدخول أولاً`, `error`);
return;
}
var btn = el(`bnCleanBtn`);
var old = btn.textContent;
btn.disabled = true;
btn.textContent = `... جاري الفحص ...`;
try{
var files = await listDir(`img/banners`);
var used = {};
(STATE.SETTINGS.banners || []).forEach(function(b){
if(b && b.img) used[b.img] = true;
});
var orphans = files.filter(function(f){
return !used[f.path];
});
if(!orphans.length){
toast(`✔ لا توجد صور يتيمة — التخزين نظيف`, `success`);
btn.disabled = false;
btn.textContent = old;
return;
}
var list = orphans.map(function(f){ return `• ${f.name}`; }).join(`\n`);
var msg = `يوجد ${orphans.length} صورة بانر يتيمة:\n\n${list}\n\nستُنقل إلى سلة المهملات (30 يوماً). متابعة؟`;
var ok = await askConfirm(msg, `تنظيف اليتيمة`, `🧹`, `نقل للمهملات`, true);
if(!ok){
btn.disabled = false;
btn.textContent = old;
return;
}
var successCount = 0;
var failCount = 0;
for(var i=0; i<orphans.length; i++){
var dr = await imgDelete(orphans[i].path);
if(dr && dr.success){
successCount++;
toast(`✔ ${orphans[i].name}`, `success`);
}else{
failCount++;
console.warn(`فشل حذف:`, orphans[i].path);
}
}
toast(
`انتهى التنظيف: ${successCount} نُقلت، ${failCount} فشلت`,
successCount > 0 ? `success` : `error`
);
renderTrash();
}catch(err){
toast(`⚠️ فشل التنظيف: ` + err.message, `error`);
}
btn.disabled = false;
btn.textContent = old;
}

/* =====================================================
   ===== v6.3: تنظيف صور الأصناف اليتيمة =====
   يقرأ القائمة من الووركر، يعرضها، ثم ينقلها للمهملات
===================================================== */
async function cleanOrphanItems(){
if(!STATE || !CFG){
toast(`سجّل الدخول أولاً`, `error`);
return;
}
var btn = el(`itCleanBtn`);
var old = btn ? btn.textContent : ``;
if(btn){ btn.disabled = true; btn.textContent = `... جاري الفحص ...`; }
try{
var scan = await apiFetch(`/api/admin/item-orphans`);
if(!scan.success){
toast(scan.error || `أُلغي الفحص`, `warn`);
if(btn){ btn.disabled = false; btn.textContent = old; }
return;
}
if(!scan.orphan_count){
toast(`✔ لا توجد صور أصناف يتيمة — التخزين نظيف`, `success`,
`${scan.images_total} صورة / ${scan.menu_items} صنف`);
if(btn){ btn.disabled = false; btn.textContent = old; }
return;
}
var names = (scan.orphans || []).slice(0,40).map(function(o){
return `• ` + o.name + ` (` + fmtKB(o.size) + `)`;
}).join(`\n`);
if(scan.orphan_count > 40){
names += `\n… و` + (scan.orphan_count - 40) + ` غيرها`;
}
var warn = scan.high_risk
? `\n\n⚠️ تحذير: عدد اليتيم كبير جداً مقارنة بالإجمالي — تأكد أن المنيو منشور وكامل قبل المتابعة.`
: ``;
var msg = `المنيو: ` + scan.menu_items + ` صنف · صور الأصناف: ` + scan.images_total +
`\nاليتيمة: ` + scan.orphan_count + ` (` + fmtKB(scan.orphan_bytes) + `)\n\n` +
names + warn + `\n\nستُنقل إلى سلة المهملات (30 يوماً) ويمكن استرجاعها. متابعة؟`;
var ok = await askConfirm(msg, `تنظيف صور الأصناف`, `🍝`, `نقل للمهملات`, true);
if(!ok){
if(btn){ btn.disabled = false; btn.textContent = old; }
return;
}
if(btn){ btn.textContent = `... جاري النقل ...`; }
var r = await apiFetch(`/api/admin/item-orphans-clean`, { method:`POST` });
toast(`انتهى: ${r.moved} نُقلت للمهملات، ${r.failed} فشلت`,
r.moved > 0 ? `success` : `warn`);
renderTrash();
}catch(e){
toast(`⚠️ فشل التنظيف: ` + e.message, `error`);
}
if(btn){ btn.disabled = false; btn.textContent = old; }
}

/* =====================================================
   ===== بطاقة ضغط الصور =====
===================================================== */
function ensureCompressCard(){
var sec = uiSettingsSection() ||
document.querySelector(`main > section`);
if(!sec) return;
v15Style();
var card = el(`cmpCard`);
if(!card){
card = document.createElement(`div`);
card.className = `v15-card`;
card.id = `cmpCard`;
card.innerHTML =
`<h3>🗜️ ضغط الصور قبل الرفع</h3>` +
`<div class="v15-row" style="justify-content:space-between">` +
`<label class="cmp-sw"><input type="checkbox" id="cmpOn"> تفعيل الضغط التلقائي</label>` +
`<button class="v15-clean" id="cmpReset">↺ الإعدادات الافتراضية</button>` +
`</div>` +
`<div class="cmp-grid" style="margin-top:.7rem">` +
`<div class="cmp-fld"><label>الصيغة</label>` +
`<select class="v15-sel" id="cmpFmt" style="width:100%">` +
`<option value="webp">WebP (الأفضل)</option>` +
`<option value="jpeg">JPEG (توافق أوسع)</option>` +
`</select></div>` +
`<div class="cmp-fld"><label>أقصى بُعد — الأصناف <span class="cmp-val" id="cmpItemV"></span></label>` +
`<input type="range" id="cmpItem" min="480" max="2400" step="40"></div>` +
`<div class="cmp-fld"><label>أقصى بُعد — البانرات <span class="cmp-val" id="cmpBanV"></span></label>` +
`<input type="range" id="cmpBan" min="640" max="3200" step="40"></div>` +
`<div class="cmp-fld"><label>أقصى بُعد — صور التطبيق <span class="cmp-val" id="cmpAppV"></span></label>` +
`<input type="range" id="cmpApp" min="480" max="3200" step="40"></div>` +
`<div class="cmp-fld"><label>الجودة <span class="cmp-val" id="cmpQV"></span></label>` +
`<input type="range" id="cmpQ" min="40" max="98" step="1"></div>` +
`<div class="cmp-fld"><label>الحجم المستهدف <span class="cmp-val" id="cmpTKV"></span></label>` +
`<input type="range" id="cmpTK" min="80" max="1200" step="20"></div>` +
`</div>` +
`<div class="cmp-last" id="cmpLast">لم تُرفع صورة بعد في هذه الجلسة.</div>`;
var anchor = el(`modsTitlesCard`) || el(`v15FeeCard`);
if(anchor && anchor.parentNode === sec) sec.insertBefore(card, anchor.nextSibling);
else sec.insertBefore(card, sec.firstChild);

var sync = function(){
el(`cmpOn`).checked = !!CMP.enabled;
el(`cmpFmt`).value = CMP.format;
el(`cmpItem`).value = CMP.itemMax;
el(`cmpBan`).value = CMP.bannerMax;
el(`cmpApp`).value = CMP.appMax;
el(`cmpQ`).value = Math.round(CMP.quality*100);
el(`cmpTK`).value = CMP.targetKB;
el(`cmpItemV`).textContent = CMP.itemMax + `px`;
el(`cmpBanV`).textContent = CMP.bannerMax + `px`;
el(`cmpAppV`).textContent = CMP.appMax + `px`;
el(`cmpQV`).textContent = Math.round(CMP.quality*100) + `%`;
el(`cmpTKV`).textContent = CMP.targetKB + `KB`;
};
sync();
el(`cmpOn`).addEventListener(`change`, function(){
CMP.enabled = this.checked; cmpSave();
toast(CMP.enabled ? `الضغط مُفعّل` : `الضغط مُعطّل — سترفع الصور بأحجامها الأصلية`,
CMP.enabled ? `success` : `warn`);
});
el(`cmpFmt`).addEventListener(`change`, function(){
CMP.format = this.value; cmpSave();
});
el(`cmpItem`).addEventListener(`input`, function(){
CMP.itemMax = +this.value;
el(`cmpItemV`).textContent = CMP.itemMax + `px`;
cmpSave();
});
el(`cmpBan`).addEventListener(`input`, function(){
CMP.bannerMax = +this.value;
el(`cmpBanV`).textContent = CMP.bannerMax + `px`;
cmpSave();
});
el(`cmpApp`).addEventListener(`input`, function(){
CMP.appMax = +this.value;
el(`cmpAppV`).textContent = CMP.appMax + `px`;
cmpSave();
});
el(`cmpQ`).addEventListener(`input`, function(){
CMP.quality = (+this.value)/100;
el(`cmpQV`).textContent = this.value + `%`;
cmpSave();
});
el(`cmpTK`).addEventListener(`input`, function(){
CMP.targetKB = +this.value;
el(`cmpTKV`).textContent = CMP.targetKB + `KB`;
cmpSave();
});
el(`cmpReset`).addEventListener(`click`, function(){
CMP = Object.assign({}, CMP_DEFAULTS);
cmpSave(); sync();
toast(`↺ أُعيدت إعدادات الضغط الافتراضية`, `success`);
});
return;
}
/* إعادة التموضع إن أُعيد رسم القسم */
var anchor2 = el(`modsTitlesCard`) || el(`v15FeeCard`);
if(anchor2 && anchor2.parentNode === sec &&
   card.previousElementSibling !== anchor2){
sec.insertBefore(card, anchor2.nextSibling);
}
}

/* =====================================================
   ===== سلة مهملات الصور =====
===================================================== */
function ensureTrashCard(){
if(el(`trashCard`)) return;
var bc = el(`v15BannerCard`);
var host = bc ? bc.parentNode :
(adminSection([/ads?|إعلان/i]) || document.querySelector(`main > section`));
if(!host) return;
v15Style();
var card = document.createElement(`div`);
card.className = `v15-card`;
card.id = `trashCard`;
card.innerHTML =
`<h3>🗑️ سلة مهملات الصور (30 يوماً)</h3>` +
`<div class="v15-row">` +
`<button class="v15-clean" id="trashRefresh">🔄 تحديث القائمة</button>` +
`<span id="trashCount" style="font-size:.76rem;font-weight:900;color:var(--muted)"></span>` +
`</div>` +
`<div class="trash-list" id="trashList" style="margin-top:.7rem"></div>`;
if(bc && bc.parentNode === host) host.insertBefore(card, bc.nextSibling);
else host.appendChild(card);
el(`trashRefresh`).addEventListener(`click`, renderTrash);
el(`trashList`).addEventListener(`click`, async function(e){
var rs = e.target.closest(`[data-restore]`);
var pg = e.target.closest(`[data-purge]`);
if(rs){
var key = rs.getAttribute(`data-restore`);
rs.disabled = true; rs.textContent = `...`;
try{
var r = await apiFetch(`/api/img/restore`, {
method:`POST`, body: JSON.stringify({ trashKey: key })
});
toast(`✔ استُرجعت الصورة`, `success`, r.restored);
renderTrash();
renderBannersAdmin();
}catch(err){
toast(`فشل الاسترجاع: ` + err.message, `error`);
rs.disabled = false; rs.textContent = `↩ استرجاع`;
}
return;
}
if(pg){
var key2 = pg.getAttribute(`data-purge`);
var ok = await askConfirm(
`حذف نهائي من سلة المهملات — لا يمكن التراجع.\n\n` + key2,
`حذف نهائي`, `⛔`, `حذف نهائي`, true);
if(!ok) return;
pg.disabled = true; pg.textContent = `...`;
try{
await apiFetch(`/api/img/purge`, {
method:`POST`, body: JSON.stringify({ trashKey: key2 })
});
toast(`⛔ حُذفت نهائياً`, `success`);
renderTrash();
}catch(err){
toast(`فشل الحذف: ` + err.message, `error`);
pg.disabled = false; pg.textContent = `⛔ نهائي`;
}
}
});
renderTrash();
}
async function renderTrash(){
var box = el(`trashList`);
if(!box) return;
if(!CFG && !sessionStorage.getItem(`mk_admin_token`)){
box.innerHTML = `<div class="v15-empty">سجّل الدخول لعرض سلة المهملات</div>`;
return;
}
box.innerHTML = `<div class="v15-empty">⏳ جارٍ التحميل...</div>`;
try{
var j = await apiFetch(`/api/img/trash`);
var items = j.items || [];
var cnt = el(`trashCount`);
if(cnt) cnt.textContent = items.length ? (items.length + ` عنصر`) : ``;
if(!items.length){
box.innerHTML = `<div class="v15-empty">سلة المهملات فارغة ✔</div>`;
return;
}
box.innerHTML = items.map(function(it){
return `<div class="trash-row">` +
`<div class="trash-ico">🖼️</div>` +
`<div class="trash-meta">` + esc(it.name) +
`<small>` + esc(it.originalKey) + `</small>` +
`<small>` + fmtKB(it.size) + ` · متبقٍ ` + it.daysLeft + ` يوم</small>` +
`</div>` +
`<div class="trash-act">` +
`<button class="tr-restore" data-restore="` + esc(it.trashKey) + `">↩ استرجاع</button>` +
`<button class="tr-purge" data-purge="` + esc(it.trashKey) + `">⛔ نهائي</button>` +
`</div></div>`;
}).join(``);
}catch(e){
box.innerHTML = `<div class="v15-empty">تعذر التحميل: ` + esc(e.message) + `</div>`;
}
}

/* =====================================================
   ===== النسخ الاحتياطي =====
===================================================== */
function ensureBackupCard(){
if(el(`bkCard`)) return;
var sec = uiSettingsSection() ||
document.querySelector(`main > section`);
if(!sec) return;
v15Style();
var card = document.createElement(`div`);
card.className = `v15-card`;
card.id = `bkCard`;
card.innerHTML =
`<h3>🛡️ النسخ الاحتياطي (يشمل المنيو والإعدادات)</h3>` +
`<div class="v15-row">` +
`<button class="v15-pub" id="bkNow">💾 إنشاء نسخة الآن</button>` +
`<button class="v15-clean" id="bkList">📋 عرض النسخ المحفوظة</button>` +
`</div>` +
`<div class="bk-info" id="bkInfo">النسخة الليلية تعمل تلقائياً وتحفظ المنيو والإعدادات والطلبات والمستخدمين وجرد الصور.</div>`;
sec.appendChild(card);
el(`bkNow`).addEventListener(`click`, async function(){
var b = this, old = b.textContent;
b.disabled = true; b.textContent = `... جارٍ النسخ ...`;
try{
var r = await apiFetch(`/api/admin/backup-now`, { method:`POST` });
el(`bkInfo`).innerHTML =
`✔ حُفظت: <b>` + esc(r.key) + `</b><br>` +
`المنيو: ` + r.menu_sections + ` أقسام / ` + r.menu_items + ` صنف · ` +
`الإعدادات: ` + r.settings_keys + ` مفتاح<br>` +
`الصور: ` + r.images_count + ` · الطلبات: ` + r.orders + ` · المستخدمون: ` + r.users;
toast(`✔ نسخة احتياطية كاملة`, `success`, `تشمل المنيو والإعدادات`);
}catch(e){
toast(`فشل النسخ: ` + e.message, `error`);
}
b.disabled = false; b.textContent = old;
});
el(`bkList`).addEventListener(`click`, async function(){
var b = this, old = b.textContent;
b.disabled = true; b.textContent = `...`;
try{
var r = await apiFetch(`/api/admin/backups`);
var items = r.items || [];
if(!items.length){
el(`bkInfo`).textContent = `لا توجد نسخ محفوظة بعد.`;
}else{
el(`bkInfo`).innerHTML = items.slice(0,10).map(function(it){
return `• <b>` + esc(it.name) + `</b> — ` + fmtKB(it.size);
}).join(`<br>`);
}
}catch(e){
toast(`فشل العرض: ` + e.message, `error`);
}
b.disabled = false; b.textContent = old;
});
}

/* =====================================================
   ===== تخصيصات واجهة اللوحة =====
   • إخفاء «إظهار الوصف / إظهار الأسعار» وفرضهما دائمين
   • عنوان الإضافات عام في الإعدادات بدل نافذة كل صنف
   • نقل «توفر خدمة التوصيل» أسفل بطاقة رسوم التوصيل
===================================================== */
function uiTxt(n){
return (n && n.textContent || ``).trim();
}
function uiSettingsSection(){
return adminSection([/settings?|إعداد|ضبط/i]);
}
/* 1) فرض الوصف + السعرات وإخفاء مفاتيحهما */
function uiHideDisplayToggles(){
var labels = document.querySelectorAll(`label`);
for(var i=0;i<labels.length;i++){
var l = labels[i];
if(l.closest(`#cmpCard`)) continue;
var t = uiTxt(l);
if(t.indexOf(`إظهار الوصف`) >= 0 ||
   t.indexOf(`إظهار الأسعار`) >= 0 ||
   t.indexOf(`إظهار السعرات`) >= 0){
var cb = l.querySelector(`input[type=checkbox]`);
if(cb){ cb.checked = true; cb.disabled = true; }
if(l.style.display !== `none`) l.style.display = `none`;
var fs = l.closest(`fieldset`);
if(fs && uiTxt(fs).indexOf(`عناصر البطاقة`) >= 0){
if(fs.style.display !== `none`) fs.style.display = `none`;
}
}
}
}
/* 2) إخفاء حقول عنوان الإضافات من نافذة الصنف */
function uiHideModsTitleFields(){
var labels = document.querySelectorAll(`label`);
for(var i=0;i<labels.length;i++){
var l = labels[i];
if(uiTxt(l).indexOf(`عنوان فوق الإضافات`) >= 0){
if(l.style.display !== `none`) l.style.display = `none`;
var nx = l.nextElementSibling;
if(nx && (nx.tagName === `INPUT` || nx.tagName === `TEXTAREA`)){
if(nx.style.display !== `none`) nx.style.display = `none`;
}
}
}
}
/* 3) بطاقة عنوان الإضافات العام داخل الإعدادات */
function uiEnsureModsTitlesCard(){
var sec = uiSettingsSection();
if(!sec || !STATE || !STATE.SETTINGS) return;
var fee = el(`v15FeeCard`);
var anchor = (fee && fee.parentNode === sec) ? fee : null;
var card = el(`modsTitlesCard`);
if(!card){
card = document.createElement(`div`);
card.className = `v15-card`;
card.id = `modsTitlesCard`;
card.innerHTML =
`<h3>🧩 عنوان قسم الإضافات (عام لكل الأصناف)</h3>` +
`<div style="display:flex;flex-direction:column;gap:.55rem">` +
`<input id="gmAr" class="v15-inp" type="text" placeholder="عنوان فوق الإضافات (عربي)">` +
`<input id="gmEn" class="v15-inp" type="text" dir="ltr" placeholder="Title above add-ons (English)">` +
`<button class="v15-pub" id="gmPub" style="align-self:flex-start">🚀 نشر العنوان لكل الأصناف</button>` +
`</div>`;
if(anchor) sec.insertBefore(card, anchor.nextSibling);
else sec.insertBefore(card, sec.firstChild);
var t = STATE.SETTINGS.modsTitles || { ar:``, en:`` };
el(`gmAr`).value = t.ar || ``;
el(`gmEn`).value = t.en || ``;
el(`gmAr`).addEventListener(`input`, function(){
STATE.SETTINGS.modsTitles = STATE.SETTINGS.modsTitles || { ar:``, en:`` };
STATE.SETTINGS.modsTitles.ar = this.value;
});
el(`gmEn`).addEventListener(`input`, function(){
STATE.SETTINGS.modsTitles = STATE.SETTINGS.modsTitles || { ar:``, en:`` };
STATE.SETTINGS.modsTitles.en = this.value;
});
el(`gmPub`).addEventListener(`click`, async function(){
var b = this, old = b.textContent;
b.disabled = true; b.textContent = `...`;
try{
STATE.SETTINGS.modsTitles = {
ar: (el(`gmAr`).value || ``).trim(),
en: (el(`gmEn`).value || ``).trim()
};
applyGlobalModsTitles();
await publishMenu(`تحديث عنوان الإضافات`);
await publishSettings(`تحديث عنوان الإضافات`);
toast(`✔ نُشر العنوان لكل الأصناف`, `success`);
}catch(e){
handlePublishError(e, b, old);
return;
}
b.disabled = false; b.textContent = old;
});
return;
}
/* إعادة التموضع إن أُعيد رسم القسم */
if(anchor && card.previousElementSibling !== anchor &&
   card.parentNode === sec){
sec.insertBefore(card, anchor.nextSibling);
}
}
/* 4) نقل بطاقة توفر التوصيل أسفل بطاقة الرسوم */
function uiMoveDeliveryCard(){
var sec = uiSettingsSection();
var fee = el(`v15FeeCard`);
if(!sec || !fee || fee.parentNode !== sec) return;
var heads = sec.querySelectorAll(`legend, h3, h4, b, strong`);
var target = null;
for(var i=0;i<heads.length;i++){
if(uiTxt(heads[i]).indexOf(`توفر خدمة التوصيل`) >= 0){
target = heads[i].closest(`fieldset`) ||
         heads[i].closest(`.v15-card`) ||
         heads[i].parentElement;
break;
}
}
if(!target || target === fee) return;
if(target.parentNode !== sec) return;
var anchor = el(`cmpCard`) || el(`modsTitlesCard`) || fee;
if(anchor.parentNode !== sec) anchor = fee;
if(target.previousElementSibling !== anchor){
sec.insertBefore(target, anchor.nextSibling);
}
}
/* تطبيق شامل */
function uiApplyAll(){
try{ forceDisplayFlags(); }catch(e){}
try{ uiHideDisplayToggles(); }catch(e){}
try{ uiHideModsTitleFields(); }catch(e){}
try{ uiEnsureModsTitlesCard(); }catch(e){}
try{ ensureCompressCard(); }catch(e){}
try{ ensureTrashCard(); }catch(e){}
try{ ensureBackupCard(); }catch(e){}
try{ uiMoveDeliveryCard(); }catch(e){}
}
var uiBusy = false;
function uiSchedule(){
if(uiBusy) return;
uiBusy = true;
setTimeout(function(){
uiBusy = false;
uiApplyAll();
}, 60);
}
try{
var uiObserver = new MutationObserver(function(){ uiSchedule(); });
uiObserver.observe(document.body, { childList:true, subtree:true });
}catch(e){}
var uiTries = 0;
var uiInterval = setInterval(function(){
uiTries++;
uiApplyAll();
if(uiTries > 240) clearInterval(uiInterval);
}, 500);
document.addEventListener(`DOMContentLoaded`, uiApplyAll);
window.addEventListener(`load`, uiApplyAll);

/* لفّ loadAll لتشغيل هجرات وواجهة v15 بعد كل تحميل */
var _loadAllOrig = loadAll;
loadAll = async function(){
var r = await _loadAllOrig();
migrateBanners();
ensureV15Cards();
renderBannersAdmin();
LAST_MENU = JSON.parse(JSON.stringify(STATE.MENU));
LAST_SETTINGS = JSON.parse(JSON.stringify(STATE.SETTINGS));
uiApplyAll();
renderTrash();
return r;
};
/* ===== END admin-core.js (v6.4) ===== */
