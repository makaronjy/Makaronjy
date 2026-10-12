/* ===== admin-core.js — النواة: دخول + GitHub + نوافذ (v3) ===== */
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
const ADMIN_USER = `mahmoud`;
const ADMIN_PASS = `123456`;
const GH_OWNER = `makaronjy`;
const GH_REPO = `Makaronjy`;
const GH_BRANCH = `main`;
const GH_TOKEN = ``;
let CFG = null;
let STATE = null;
let modalOnSave = null;
let ALANG =
localStorage.getItem(`mk_admin_lang`) || `ar`;
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
var d = ASTR[ALANG] || ASTR.ar;
var v = d[k];
if(v === undefined) v = ASTR.ar[k];
if(v === undefined) v = k;
if(typeof v === `function`) return v(a);
return v;
}
function LF(k){
var args = [].slice.call(arguments, 1);
var d = ASTR[ALANG] || ASTR.ar;
var v = d[k];
if(v === undefined) v = ASTR.ar[k];
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
if(STATE) renderAll();
});
/* ===== التوستات ===== */
let toastSeq = 0;
function toast(title, kind, sub){
kind = kind || `info`;
var wrap = el(`toasts`);
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
msgEl.parentNode.insertBefore(cfDeleteInput,
msgEl.nextSibling);
msgEl.parentNode.insertBefore(cfDeleteHint,
cfDeleteInput.nextSibling);
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
el(id).classList.remove(`show`);
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
/* ===== طبقة GitHub ===== */
const GH_API = `https://api.github.com`;
async function gh(path, opts){
opts = opts || {};
var headers = {
[`Accept`]:`application/vnd.github+json`,
[`Authorization`]:`Bearer ` + (CFG ? CFG.token : ``),
[`X-GitHub-Api-Version`]:`2022-11-28`
};
if(opts.headers){
Object.assign(headers, opts.headers);
}
var init = Object.assign({}, opts,
{ headers: headers });
var r = await fetch(GH_API + path, init);
if(!r.ok){
var e = new Error(`HTTP ` + r.status);
e.http = r.status;
try{
var j = await r.json();
e.message = j.message || e.message;
}catch(err){}
throw e;
}
var ct = r.headers.get(`content-type`) || ``;
if(ct.includes(`json`)) return r.json();
return {
text: await r.text(),
sha: r.headers.get(`etag`)
};
}
/* فك Base64 إلى نص UTF-8 سليم */
function b64ToUtf8(b64){
var bin = atob(b64);
var bytes = new Uint8Array(bin.length);
for(var i=0;i<bin.length;i++){
bytes[i] = bin.charCodeAt(i);
}
if(window.TextDecoder){
return new TextDecoder(`utf-8`).decode(bytes);
}
return decodeURIComponent(escape(bin));
}
async function getFile(path){
var q = `/repos/` + CFG.owner + `/` + CFG.repo +
`/contents/` + path + `?ref=` + CFG.branch;
var r = await gh(q);
return { text: b64ToUtf8(r.content), sha: r.sha };
}
async function putFile(path, content, sha, msg){
var body = {
message: msg,
content: btoa(unescape(encodeURIComponent(content))),
branch: CFG.branch
};
if(sha) body.sha = sha;
var q = `/repos/` + CFG.owner + `/` + CFG.repo +
`/contents/` + path;
return gh(q, {
method:`PUT`,
headers:{ [`Content-Type`]:`application/json` },
body: JSON.stringify(body)
});
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
async function uploadItemImgById(id, file){
var path = `img/items/` + id + `.png`;
var cur = await getFile(path).catch(function(){
return { sha:null };
});
var body = {
message:`رفع صورة صنف: ` + id,
content: await b64OfFile(file),
branch: CFG.branch
};
if(cur.sha) body.sha = cur.sha;
var q = `/repos/` + CFG.owner + `/` + CFG.repo +
`/contents/` + path;
await gh(q, {
method:`PUT`,
headers:{ [`Content-Type`]:`application/json` },
body: JSON.stringify(body)
});
return path;
}
async function uploadAppImage(path, file){
var cur = await getFile(path).catch(function(){
return { sha:null };
});
var body = {
message:`تحديث صورة: ` + path,
content: await b64OfFile(file),
branch: CFG.branch
};
if(cur.sha) body.sha = cur.sha;
var q = `/repos/` + CFG.owner + `/` + CFG.repo +
`/contents/` + path;
await gh(q, {
method:`PUT`,
headers:{ [`Content-Type`]:`application/json` },
body: JSON.stringify(body)
});
return path;
}
function parseJs(text){
var w = { window:{} };
try{
new Function(`window`, text)(w.window);
}catch(e){
throw new Error(`JS parse error: ` + e.message);
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
function findSectionOfItem(id){
for(var s of STATE.MENU){
var hit = s.items.some(function(x){
return x.id===id;
});
if(hit) return s;
}
return null;
}
function nextBranchNum(){
var used = branches().map(function(b){
return b.num;
}).filter(Number.isFinite);
var n = 1;
while(used.includes(n)) n++;
return n;
}
/* الترقيم الآلي: الموضع في المصفوفة = رقم الفرع */
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
/* ===== التبويبات ===== */
document.querySelectorAll(`.tab`).forEach(function(t){
t.addEventListener(`click`, function(){
document.querySelectorAll(`.tab`).forEach(function(x){
x.classList.remove(`active`);
});
t.classList.add(`active`);
document.querySelectorAll(`main > section`).forEach(
function(s){ s.classList.add(`hidden`); });
el(`tab-` + t.dataset.tab).classList.remove(`hidden`);
});
});
/* ===== الخروج (تأكيد عادي بدون delete) ===== */
el(`btnLogout`).addEventListener(`click`,
async function(){
var ok = await askConfirm(
L(`logoutMsg`), L(`logoutTitle`), `🚪`, L(`logoutYes`));
if(!ok) return;
sessionStorage.removeItem(`mk_admin`);
location.reload();
});
/* ===== تحميل البيانات ===== */
async function loadAll(){
var both = await Promise.all([
getFile(`menu.js`),
getFile(`settings.js`)
]);
var mw = parseJs(both[0].text);
var sw = parseJs(both[1].text);
STATE = {
MENU: mw.MENU,
SETTINGS: sw.APP_SETTINGS,
shas: { menu: both[0].sha, settings: both[1].sha }
};
var S0 = STATE.SETTINGS;
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
migrateBranchNums();
migrateHours();
migrateBestSellers();
migrateSocial();
el(`renewScreen`).classList.add(`hidden`);
el(`loginScreen`).classList.add(`hidden`);
el(`app`).classList.remove(`hidden`);
renderAll();
}
/* ===== الدخول: ثلاث طرق قبول ===== */
el(`btnLogin`).addEventListener(`click`,
async function(){
var owner = el(`inOwner`).value.trim();
var repo = el(`inRepo`).value.trim() || GH_REPO;
var branch = el(`inBranch`).value.trim() || GH_BRANCH;
var token = el(`inToken`).value.trim();
hideBanner(`loginErr`);
if(!owner || !token){
showBanner(`loginErr`, L(`errComplete`));
return;
}
var pat1 = `^(github_pat_|ghp_|`;
var pat2 = `gho_|ghu_|ghs_|ghr_)`;
var tokenLike =
new RegExp(pat1 + pat2, `i`).test(token);
var isLocal =
(owner.toLowerCase() === ADMIN_USER.toLowerCase()) &&
(token === ADMIN_PASS);
var isEmbed =
(GH_TOKEN !== ``) && (token === GH_TOKEN);
if(!isLocal && !tokenLike && !isEmbed){
showBanner(`loginErr`, L(`errCreds`));
return;
}
var finalOwner = isLocal ? GH_OWNER : owner;
var finalToken = isLocal ? (GH_TOKEN || ``) : token;
if(!finalToken){
showBanner(`loginErr`, L(`errNoToken`));
return;
}
CFG = {
owner: finalOwner,
repo: repo,
branch: branch,
token: finalToken
};
sessionStorage.setItem(`mk_admin`,
JSON.stringify(CFG));
var btn = el(`btnLogin`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await loadAll();
applyAdminLang();
toast(L(`loggedIn`), `success`, L(`loggedSub`));
}catch(e){
var cls = classifyGhError(e);
showBanner(`loginErr`, L(`errPublish`),
L(cls.key) +
(cls.detail ? ` — ` + cls.detail : ``));
sessionStorage.removeItem(`mk_admin`);
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
/* ===== شاشة تجديد التوكن ===== */
function showRenew(){
el(`loginScreen`).classList.add(`hidden`);
el(`app`).classList.add(`hidden`);
el(`renewScreen`).classList.remove(`hidden`);
}
el(`btnRenew`).addEventListener(`click`,
async function(){
var t = el(`inRenewToken`).value.trim();
hideBanner(`renewErr`);
if(!t){
showBanner(`renewErr`, L(`errRenewEmpty`));
return;
}
CFG.token = t;
sessionStorage.setItem(`mk_admin`,
JSON.stringify(CFG));
var btn = el(`btnRenew`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await loadAll();
toast(L(`loggedIn`), `success`, L(`loggedSub`));
}catch(e){
var cls = classifyGhError(e);
var bad = (e.http===401||e.http===403);
showBanner(`renewErr`,
bad ? L(`errRenewBad`) : L(cls.key),
cls.detail);
}
btn.disabled = false;
btn.textContent = L(`btnRenew`);
});
/* ===== تحديث من المستودع ===== */
el(`btnRefresh`).addEventListener(`click`,
async function(){
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
toast(L(`refreshFail`) + e.message, `error`);
}
}
b.disabled = false;
b.textContent = old;
});
/* ===== نصوص النشر ===== */
function menuText(){
return `window.MENU = ` +
JSON.stringify(STATE.MENU, null, 2) + `;\n`;
}
function settingsText(){
return `window.APP_SETTINGS = ` +
JSON.stringify(STATE.SETTINGS, null, 2) + `;\n`;
}
async function publishSettings(msg){
var r = await putFile(`settings.js`,
settingsText(), STATE.shas.settings, msg);
STATE.shas.settings =
r.content ? r.content.sha : r.sha;
}
async function publishMenu(msg){
var r = await putFile(`menu.js`,
menuText(), STATE.shas.menu, msg);
STATE.shas.menu =
r.content ? r.content.sha : r.sha;
}

/* =====================================================
   ===== v15: سلايدر الصفحة الرئيسية + رسوم التوصيل =====
   (واجهة تُحقن داخل تبويب الإعلان — بدون تعديل admin.html)
===================================================== */
function migrateBanners(){
var S0 = STATE.SETTINGS;
if(!Array.isArray(S0.banners)) S0.banners = [];
S0.banners.forEach(function(b, i){
if(!b || typeof b !== `object`) return;
if(!b.id) b.id = `bn-` + (i + 1);
if(typeof b.v !== `number`) b.v = 0;
});
if(typeof S0.deliveryFee !== `number`){
S0.deliveryFee = 5;
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
`.v15-fee{width:110px;border:1.5px solid var(--line);border-radius:10px;padding:.55rem .6rem;font-family:inherit;font-weight:900;font-size:1rem;text-align:center}` +
`.v15-empty{color:var(--muted);font-weight:700;font-size:.8rem;padding:.6rem;border:1.5px dashed var(--line);border-radius:10px;text-align:center}`;
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
`<input type="number" min="0" step="0.5" class="v15-fee" id="v15FeeInput">` +
`<span>ريال / SAR</span>` +
`<button class="v15-pub" id="feePublishBtn">🚀 نشر / Publish</button>` +
`</div>`;
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
toast(`جارٍ رفع البانر...`, `info`);
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
el(`feePublishBtn`).addEventListener(`click`, publishV15);
el(`v15FeeInput`).addEventListener(`change`, function(e){
var v = parseFloat(e.target.value);
STATE.SETTINGS.deliveryFee =
(isFinite(v) && v >= 0) ? v : 5;
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
var ok = await askConfirm(
`سيُحذف البانر من السلايدر (ملف الصورة يبقى بالمستودع).`,
`حذف بانر`, `🗑`, `حذف`);
if(!ok) return;
list.splice(k, 1);
renderBannersAdmin();
toast(`✔ تم الحذف — اضغط نشر`, `success`);
}
});
}
function renderBannersAdmin(){
var box = el(`bnAdminList`);
if(!box || !STATE) return;
var list = STATE.SETTINGS.banners || [];
var fi = el(`v15FeeInput`);
if(fi) fi.value = STATE.SETTINGS.deliveryFee;
if(!list.length){
box.innerHTML =
`<div class="v15-empty">لا توجد بانرات — أضف أول بانر ليظهر السلايدر بالتطبيق / No banners yet</div>`;
return;
}
box.innerHTML = list.map(function(b, i){
return `<div class="bn-adm">` +
`<div class="img-prev"><img src="` +
esc(b.img) + (b.v ? `?v=` + b.v : ``) + `"></div>` +
`<div class="bn-adm-act">` +
`<button class="bn-up" data-bnup="` + i + `">↑</button>` +
`<button class="bn-dn" data-bndn="` + i + `">↓</button>` +
`<button class="bn-del" data-bndel="` + i + `">🗑</button>` +
`</div></div>`;
}).join(``);
}
async function uploadBannerImg(path, file){
var cur = await getFile(path).catch(function(){
return { sha:null };
});
var body = {
message:`رفع بانر: ` + path,
content: await b64OfFile(file),
branch: CFG.branch
};
if(cur.sha) body.sha = cur.sha;
var q = `/repos/` + CFG.owner + `/` + CFG.repo +
`/contents/` + path;
await gh(q, {
method:`PUT`,
headers:{ [`Content-Type`]:`application/json` },
body: JSON.stringify(body)
});
return path;
}
async function publishV15(){
var btn = el(`bnPublishBtn`);
var old = btn.textContent;
btn.disabled = true;
btn.textContent = `...`;
try{
await publishSettings(`🖼️ تحديث السلايدر ورسوم التوصيل`);
toast(`✔ تم النشر — سيظهر بالتطبيق خلال دقيقة`,
`success`);
}catch(e){
handlePublishError(e, btn, old);
return;
}
btn.disabled = false;
btn.textContent = old;
}
/* لفّ loadAll لتشغيل هجرات وواجهة v15 بعد كل تحميل */
var _loadAllOrig = loadAll;
loadAll = async function(){
var r = await _loadAllOrig();
migrateBanners();
ensureV15Cards();
renderBannersAdmin();
return r;
};
/* ===== END admin-core.js ===== */
