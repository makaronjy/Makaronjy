/* ===== admin-tabs.js — التبويبات والحفظ والنشر (v9.8) ===== */
/* v9.8: هيدر Excel منسق (عنابي/كريمي/ارتفاعات/توسيط) بلا مرجع التقرير
         + PDF بلا مرجع + اسم ملف بالتواريخ */
function nmOf(x){
return (ALANG===`ar`) ? x.ar : (x.en || x.ar);
}
function emptySecNote(){
return (ALANG===`ar`)
? `هذا القسم فارغ أو كل أصنافه مخفية — لن يظهر للزبائن حتى تضيف صنفاً ظاهراً واحداً على الأقل ثم تضغط «حفظ ونشر المنيو».`
: `This section is empty or all its items are hidden — customers will not see it until you add at least one visible item and publish the menu.`;
}
const SQ_STYLE =
` style="display:inline-grid;` +
`grid-template-columns:repeat(2,auto);` +
`gap:3px;vertical-align:middle"`;
function disSt(on){
return on ? ` disabled style="opacity:.35;pointer-events:none"` : ``;
}
/* ===== v9: الطبقة السحابية ===== */
const CLOUD_API = 'https://makaronjy-api.makaronjy.workers.dev';
let CLOUD_JWT = sessionStorage.getItem('mk_cloud_jwt') || '';
async function cloudBridge(){
try{
var c = JSON.parse(sessionStorage.getItem('mk_admin') || 'null');
if(!c || !c.token) throw new Error('سجّل الدخول في لوحة التحكم أولاً');
var r = await fetch(CLOUD_API + '/api/auth/admin-bridge', {
method:'POST',
headers:{'Content-Type':'application/json'},
body: JSON.stringify({ github_token: c.token })
});
var d = await r.json().catch(function(){ return {}; });
if(!r.ok) throw new Error(d.error || ('فشل الجسر HTTP ' + r.status));
CLOUD_JWT = d.token;
sessionStorage.setItem('mk_cloud_jwt', CLOUD_JWT);
return CLOUD_JWT;
}catch(e){ throw e; }
}
async function capi(path, opts){
opts = opts || {};
var headers = {'Content-Type':'application/json'};
if(CLOUD_JWT) headers['Authorization'] = 'Bearer ' + CLOUD_JWT;
var r = await fetch(CLOUD_API + path, Object.assign({}, opts, {headers:headers}));
if(r.status === 401){
try{
await cloudBridge();
headers['Authorization'] = 'Bearer ' + CLOUD_JWT;
r = await fetch(CLOUD_API + path, Object.assign({}, opts, {headers:headers}));
}catch(e){}
}
var d = await r.json().catch(function(){ return {}; });
if(!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
return d;
}
(function injectCloudStyles(){
if(el('v9CloudStyles')) return;
var st = document.createElement('style');
st.id = 'v9CloudStyles';
st.textContent =
'.cl-card{background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:1rem;margin:0 0 1rem}' +
'.cl-card h3{font-size:1rem;font-weight:900;color:var(--ink);margin:0 0 .7rem}' +
'.cl-row{display:flex;gap:.6rem;flex-wrap:wrap;align-items:flex-end}' +
'.cl-f{display:flex;flex-direction:column;gap:.25rem;flex:1;min-width:130px}' +
'.cl-f label{font-size:.72rem;font-weight:900;color:var(--brown)}' +
'.cl-f input,.cl-f select{border:1.5px solid var(--line);border-radius:10px;padding:.55rem .6rem;font-family:inherit;font-weight:800;background:#fff;font-size:.88rem}' +
'.cl-btn{border:none;border-radius:10px;padding:.6rem 1.1rem;font-family:inherit;font-weight:900;cursor:pointer;font-size:.85rem}' +
'.cl-add{background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--dark)}' +
'.cl-plain{background:#f3e7d7;color:var(--brown)}' +
'.cl-err{background:#fee2e2;color:#b91c1c}' +
'.cl-ok{background:#1e5b4f;color:#fff}' +
'.cl-res{margin-top:.8rem;background:#dcf5e8;border:1.5px solid #128c5e44;border-radius:12px;padding:.8rem;font-size:.82rem;font-weight:800;line-height:1.9;display:none}' +
'.cl-res.show{display:block}' +
'.cl-res .pass{direction:ltr;display:inline-block;background:#5a1830;color:#f2b95f;border-radius:8px;padding:.15rem .7rem;font-weight:900;font-family:monospace}' +
'.cl-tbl{width:100%;border-collapse:collapse;font-size:.78rem;margin-top:.8rem}' +
'.cl-tbl th,.cl-tbl td{border:1px solid var(--line);padding:.45rem .4rem;text-align:center;font-weight:800}' +
'.cl-tbl th{background:#f3e7d7;color:var(--brown)}' +
'.cl-tbl tr:hover{background:#faf3ea}' +
'.cl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.6rem;margin-top:.8rem}' +
'.cl-stat{background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:.7rem;text-align:center}' +
'.cl-stat b{display:block;font-size:1.4rem;color:var(--brown);margin-bottom:.15rem}' +
'.cl-stat small{color:var(--muted);font-weight:800;font-size:.68rem}' +
'.cl-badge-off{background:#fee2e2;color:#b91c1c;border-radius:50px;padding:.1rem .5rem;font-size:.66rem;font-weight:800}' +
'.cl-badge-on{background:#dcf5e8;color:#1e5b4f;border-radius:50px;padding:.1rem .5rem;font-size:.66rem;font-weight:800}' +
'.cl-badge-pickup{background:#fff6e6;color:#b45309;border-radius:50px;padding:.1rem .5rem;font-size:.66rem;font-weight:800}' +
'.cl-badge-delivery{background:#dbeafe;color:#1e40af;border-radius:50px;padding:.1rem .5rem;font-size:.66rem;font-weight:800}' +
'.cl-locked{display:inline-flex;align-items:center;justify-content:center;font-size:1rem}' +
'.cl-btn-sm{padding:.3rem .6rem;font-size:.72rem;border-radius:8px;border:none;font-weight:900;cursor:pointer;font-family:inherit;margin:0 .1rem}' +
'.cl-empty{padding:2rem;text-align:center;color:var(--muted);font-weight:800;border:1.5px dashed var(--line);border-radius:12px;margin-top:.8rem}' +
'.cl-actions{display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap}';
document.head.appendChild(st);
})();
/* ===== المنيو ===== */
function renderMenu(){
var wrap = el(`menuWrap`);
var addSecBtn =
`<button class="add-item" data-act="addSec" ` +
`style="border-radius:14px;margin-top:.8rem">` +
L(`addSec`) + `</button>`;
if(!STATE.MENU.length){
wrap.innerHTML =
`<div class="note">` + emptySecNote() + `</div>` +
addSecBtn;
return;
}
var brs = branches();
var lastSec = STATE.MENU.length - 1;
wrap.innerHTML = STATE.MENU.map(function(sec, si){
var hidCls = sec.hidden ? ` is-hidden` : ``;
var hidTag = sec.hidden
? ` <span style="opacity:.7;font-weight:700;font-size:.72rem">` +
L(`hidden`) + `</span>`
: ``;
var togCls = sec.hidden ? `show` : `hide`;
var togTxt = sec.hidden ? L(`show`) : L(`hide`);
var lastItem = sec.items.length - 1;
var rows = sec.items.map(function(it, ii){
var onlyArr = Array.isArray(it.only) ? it.only : null;
var un = ``;
if(onlyArr && onlyArr.length){
un = brs.filter(function(b){
return !onlyArr.includes(b.id);
}).map(brName).join(`، `);
}
var soArr = Array.isArray(it.so) ? it.so : [];
var soldNames = ``;
var soldAll = false;
if(soArr.length){
if(brs.length && soArr.length >= brs.length){
soldAll = true;
}else{
soldNames = soArr.map(function(id){
var b = brs.find(function(x){ return x.id===id; });
return b ? brName(b) : id;
}).join(`، `);
}
}
var missMode = it.miss || `gray`;
var name = nmOf(it);
var tag = ``;
if(un){
var mm = (missMode===`hide`)
? L(`modeHide`) : L(`modeGray`);
tag = LF(`availTag`, un, mm);
}
var soldTag = ``;
if(soArr.length){
soldTag = soldAll ? L(`soldAll`)
: (L(`soldSome`) + soldNames);
}
var modsCount = 0;
if(it.mods){
if(Array.isArray(it.mods)){
it.mods.forEach(function(g){
modsCount += (g.opts||[]).length;
});
}else if(Array.isArray(it.mods.refs)){
modsCount = it.mods.refs.length;
}
}
var price0 = (it.prices && it.prices[0])
? it.prices[0] : 0;
var small = esc(price0 + ` ` + L(`riyal`));
if(it.cal){
small += ` • ` + it.cal + ` ` + L(`calWord`);
}
if(modsCount){ small += ` • ➕ ` + modsCount; }
small += esc(tag) + esc(soldTag);
var hidIt = it.hidden
? ` <span style="opacity:.6;font-weight:700;font-size:.7rem">` +
L(`hidden`) + `</span>`
: ``;
var rowCls = it.hidden ? ` is-hidden` : ``;
return `<div class="item-row` + rowCls + `">` +
`<div class="item-info">` +
`<b>` + esc(name) + hidIt + `</b>` +
`<small>` + small + `</small>` +
`</div>` +
`<span class="item-ops"><span` + SQ_STYLE + `>` +
`<button class="edit" data-act="editItem" data-si="` + si + `" data-ii="` + ii + `" title="` + esc(L(`editItemTitle`)) + `">✏️</button>` +
`<button class="del" data-act="delItem" data-si="` + si + `" data-ii="` + ii + `" title="` + esc(L(`btnDelFinal`)) + `">🗑</button>` +
`<button class="edit" data-act="moveItemUp" data-si="` + si + `" data-ii="` + ii + `" title="` + esc(L(`moveUp`)) + `"` + disSt(ii===0) + `>▲</button>` +
`<button class="edit" data-act="moveItemDown" data-si="` + si + `" data-ii="` + ii + `" title="` + esc(L(`moveDown`)) + `"` + disSt(ii===lastItem) + `>▼</button>` +
`</span></span></div>`;
}).join(``);
var visibleRows = sec.items.filter(function(x){
return x.hidden !== true;
});
var bodyHtml = (visibleRows.length ? rows :
`<div class="note" style="margin:.5rem 0 0">` +
emptySecNote() + `</div>`) +
`<button class="add-item" data-act="addItem" data-si="` + si + `">` +
L(`addItem`) + `</button>`;
return `<div class="sec-card` + hidCls + `">` +
`<div class="sec-head">` +
`<b>` + esc(sec.i) + ` ` +
esc((ALANG===`ar`)?sec.t:sec.tEn) + hidTag + `</b>` +
`<span class="sec-ops">` +
`<button class="` + togCls + `" data-act="hideSec" data-i="` + si + `">` + togTxt + `</button>` +
`<span` + SQ_STYLE + `>` +
`<button class="edit" data-act="editSec" data-i="` + si + `" title="` + esc(L(`editSecTitle`)) + `">✏️</button>` +
`<button class="del" data-act="delSec" data-i="` + si + `" title="` + esc(L(`btnDelFinal`)) + `">🗑</button>` +
`<button class="edit" data-act="moveSecUp" data-i="` + si + `" title="` + esc(L(`moveUp`)) + `"` + disSt(si===0) + `>▲</button>` +
`<button class="edit" data-act="moveSecDown" data-i="` + si + `" title="` + esc(L(`moveDown`)) + `"` + disSt(si===lastSec) + `>▼</button>` +
`</span></span></div>` +
`<div class="items">` + bodyHtml +
`</div></div>`;
}).join(``) + addSecBtn;
}
el(`menuWrap`).addEventListener(`click`,
async function(e){
var b = e.target.closest(`button[data-act]`);
if(!b) return;
var act = b.dataset.act;
var si = +b.dataset.i;
var ii = +b.dataset.ii;
var sIdx = +b.dataset.si;
if(act === `addSec`) openSectionModal(null);
if(act === `editSec`) openSectionModal(si);
if(act === `delSec`){
var sec = STATE.MENU[si];
var secNm = (ALANG===`ar`) ? sec.t : sec.tEn;
var ok = await askConfirm(LF(`delSecMsg`, secNm),
L(`confirmDefault`), `🗑`, L(`btnDelFinal`), true);
if(ok){
STATE.MENU.splice(si,1);
renderMenu();
toast(L(`deletedSec`), `warn`, L(`dontForget`));
}
}
if(act === `hideSec`){
STATE.MENU[si].hidden = !STATE.MENU[si].hidden;
renderMenu();
toast(STATE.MENU[si].hidden ? L(`hide`) : L(`show`),
`info`, L(`dontForget`));
}
if(act === `editItem`) openItemModal(sIdx, ii);
if(act === `delItem`){
var it = STATE.MENU[sIdx].items[ii];
var ok2 = await askConfirm(LF(`delItemMsg`, nmOf(it)),
L(`confirmDefault`), `🗑`, L(`btnDelFinal`), true);
if(ok2){
STATE.MENU[sIdx].items.splice(ii,1);
renderMenu();
toast(L(`deletedItem`), `warn`, L(`dontForget`));
}
}
if(act === `moveItemUp` || act === `moveItemDown`){
var arr = STATE.MENU[sIdx].items;
var d2 = (act === `moveItemUp`) ? -1 : 1;
var j2 = ii + d2;
if(j2 < 0 || j2 >= arr.length) return;
var tmp2 = arr[ii];
arr[ii] = arr[j2];
arr[j2] = tmp2;
renderMenu();
toast(L(`dontForget`), `info`);
}
if(act === `moveSecUp` || act === `moveSecDown`){
var d1 = (act === `moveSecUp`) ? -1 : 1;
var j1 = si + d1;
if(j1 < 0 || j1 >= STATE.MENU.length) return;
var tmp1 = STATE.MENU[si];
STATE.MENU[si] = STATE.MENU[j1];
STATE.MENU[j1] = tmp1;
renderMenu();
toast(L(`dontForget`), `info`);
}
if(act === `addItem`) openItemModal(sIdx, null);
});
const pendingItemImgs = {};
el(`saveMenu`).addEventListener(`click`,
async function(){
var btn = el(`saveMenu`);
var label = L(`btnSaveMenu`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
for(var sec of STATE.MENU){
for(var it of sec.items){
var pend = pendingItemImgs[it.id];
if(!pend) continue;
if(pend === `delete`){
it.imgv = 0;
}else{
try{
await uploadItemImgById(it.id, pend);
it.imgv = Date.now();
}catch(err){
toast(L(`imgUploadFail`), `warn`);
}
}
delete pendingItemImgs[it.id];
}
}
await publishMenu(`تحديث المنيو من لوحة التحكم 🍝`);
renderMenu();
toast(L(`publishedMenu`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
function openSectionModal(i){
var s = (i===null) ? null : STATE.MENU[i];
openModal(s ? L(`editSecTitle`) : L(`addSecTitle`),
`<div class="form-grid">` +
`<label>` + L(`lblSecNameAr`) +
`<input id="sec_ar" value="` + esc(s?s.t:``) + `"></label>` +
`<label>` + L(`lblSecNameEn`) +
`<input id="sec_en" class="ltr" value="` + esc(s?s.tEn:``) + `"></label>` +
`<label>` + L(`lblSecIcon`) +
`<input id="sec_i" value="` + esc(s?s.i:`🍝`) + `" maxlength="4"></label>` +
`</div>`, async function(){
var ar = mv(`sec_ar`).trim();
var en = mv(`sec_en`).trim();
var ic = mv(`sec_i`).trim() || `🍝`;
if(!ar){ toast(L(`warnSecName`), `warn`); return false; }
if(s){ s.t = ar; s.tEn = en || ar; s.i = ic; }
else{
STATE.MENU.push({
id:`sec-` + Date.now(),
i: ic, t: ar, tEn: en || ar,
hidden:false, items: []
});
}
renderMenu();
toast(L(`savedSec`), `success`, L(`dontForget`));
});
}
/* ===== نافذة الصنف + محرر الإضافات ===== */
let itemModalFile = null;
let itemModalDelete = false;
function openItemModal(si, ii){
var it = (ii===null) ? null : STATE.MENU[si].items[ii];
itemModalFile = null;
itemModalDelete = false;
var curItemId = it ? it.id : null;
var brs = branches();
var onlyVal = `all`;
if(it && Array.isArray(it.only) && it.only.length){
onlyVal = it.only.join(`,`);
}
var missVal = it ? (it.miss || `gray`) : `gray`;
var soArr = (it && Array.isArray(it.so)) ? it.so : [];
var soldVal = `none`;
if(soArr.length){
if(brs.length && soArr.length >= brs.length){
soldVal = `all`;
}else{
soldVal = soArr.join(`,`);
}
}
var curImg = null;
if(it && it.imgv){
curImg = `img/items/` + it.id + `.png?v=` + it.imgv;
}
var hidChk = (it && it.hidden) ? ` checked` : ``;
var acChk = (onlyVal !== `all`) ? ` checked` : ``;
var availCustomHtml = brs.length
? (`<label><input type="radio" name="it_avail" value="custom"` +
acChk + `> ` + L(`customChoice`) + `</label>`)
: ``;
var saChk = (soldVal === `all`) ? ` checked` : ``;
var scChk = (soldVal !== `none` && soldVal !== `all`)
? ` checked` : ``;
var soldAllHtml = brs.length
? (`<label><input type="radio" name="it_sold" value="all"` +
saChk + `> ` + L(`soldAllBranches`) + `</label>`)
: ``;
var soldCustomHtml = brs.length
? (`<label><input type="radio" name="it_sold" value="custom"` +
scChk + `> ` + L(`customChoice`) + `</label>`)
: ``;
var availBoxes = brs.map(function(b){
var ck = onlyVal.split(`,`).includes(b.id)
? ` checked` : ``;
return `<label><input type="checkbox" class="it_br" value="` +
b.id + `"` + ck + `> ` + esc(brName(b)) + `</label>`;
}).join(``);
var soldBoxes = brs.map(function(b){
var ck = soArr.includes(b.id) ? ` checked` : ``;
return `<label><input type="checkbox" class="it_sold_br" value="` +
b.id + `"` + ck + `> ` + esc(brName(b)) + `</label>`;
}).join(``);
var availWrapShow = (brs.length && onlyVal !== `all`)
? `block` : `none`;
var soldWrapShow =
(brs.length && soldVal !== `none` && soldVal !== `all`)
? `block` : `none`;
var cutSel = ((it && it.imgMode===`cut`) || !it)
? ` selected` : ``;
var fullSel = (it && it.imgMode===`full`)
? ` selected` : ``;
var modsRefsArr = [];
if(it && it.mods){
if(Array.isArray(it.mods)){
it.mods.forEach(function(g){
(g.opts||[]).forEach(function(o){
if(modsRefsArr.indexOf(o.ref) < 0){
modsRefsArr.push(o.ref);
}
});
});
}else if(Array.isArray(it.mods.refs)){
modsRefsArr = it.mods.refs.slice();
}
}
var modsTitleArVal = ``;
var modsTitleEnVal = ``;
if(it && it.mods && !Array.isArray(it.mods)){
modsTitleArVal = it.mods.tAr || ``;
modsTitleEnVal = it.mods.tEn || ``;
}
var modsSecOptions = STATE.MENU.map(function(sec, sIdx){
var snm = (ALANG===`ar`) ? sec.t : sec.tEn;
return `<option value="` + sIdx + `">` +
esc(sec.i + ` ` + snm) + `</option>`;
}).join(``);
openModal(ii===null ? L(`addItemTitle`) : L(`editItemTitle`),
`<div class="form-grid">` +
`<label>` + L(`lblNameAr`) +
`<input id="it_ar" value="` + esc(it?it.ar:``) + `"></label>` +
`<label>` + L(`lblNameEn`) +
`<input id="it_en" class="ltr" value="` + esc(it?it.en:``) + `"></label>` +
`<label class="full">` + L(`lblDescAr`) +
`<textarea id="it_descAr" rows="2">` +
esc(it?it.desc||``:``) + `</textarea></label>` +
`<label class="full">` + L(`lblDescEn`) +
`<textarea id="it_descEn" rows="2">` +
esc(it?it.descEn||``:``) + `</textarea></label>` +
`<label>` + L(`lblPrices`) +
`<input id="it_prices" class="ltr" value="` +
esc(it&&it.prices?it.prices.join(`,`):``) +
`" placeholder="` + esc(L(`pricesPh`)) + `"></label>` +
`<label>` + L(`lblCal`) +
`<input id="it_cal" type="number" min="0" value="` +
esc(it&&it.cal?it.cal:``) + `"></label>` +
`</div>` +
`<label style="display:flex;align-items:center;` +
`gap:.5rem;font-size:.8rem;font-weight:800;` +
`color:var(--ink);margin:0 0 .8rem">` +
`<input type="checkbox" id="it_hidden"` + hidChk +
` style="width:auto;margin:0"> ` + L(`hide`) + `</label>` +
`<div class="full"><label>` + L(`lblImgMode`) +
`<select id="it_imgMode">` +
`<option value="cut"` + cutSel + `>` + L(`imgModeCut`) + `</option>` +
`<option value="full"` + fullSel + `>` + L(`imgModeFull`) + `</option>` +
`</select></label></div>` +
`<fieldset><legend>` + L(`lblItemImage`) + `</legend>` +
`<div id="it_imgBox" class="img-prev" style="height:140px">` +
`<div class="none">` + L(`imgPreviewNone`) + `</div></div>` +
`<div class="img-ops">` +
`<button type="button" class="img-btn" id="it_imgPick">` +
L(`imgChange`) + `</button>` +
`<button type="button" class="img-btn del" id="it_imgDel">` +
L(`imgDelete`) + `</button>` +
`</div>` +
`<input type="file" accept="image/png,image/jpeg,image/webp" hidden id="it_imgFile">` +
`</fieldset>` +
`<fieldset><legend>` + L(`legendMods`) + `</legend>` +
`<div class="form-grid">` +
`<label>` + L(`modsTitleArLbl`) +
`<input id="modsTAr" placeholder="` +
esc(L(`modsTitlePhAr`)) + `" value="` +
esc(modsTitleArVal) + `"></label>` +
`<label>` + L(`modsTitleEnLbl`) +
`<input id="modsTEn" class="ltr" placeholder="` +
esc(L(`modsTitlePhEn`)) + `" value="` +
esc(modsTitleEnVal) + `"></label>` +
`</div>` +
`<div class="full"><label>` + L(`modsOpenSec`) +
`<select id="modsSecSel"><option value="">—</option>` +
modsSecOptions + `</select></label></div>` +
`<div id="modsItemsBox" class="mg_opts"></div>` +
`<div class="note" style="margin:.6rem 0 .4rem">` +
L(`modsSelectedLbl`) + `</div>` +
`<div id="modsChips" class="mg_opts"></div>` +
`<button type="button" class="img-btn del" id="modsClearAll" style="margin-top:.5rem">` +
L(`modsClearAll`) + `</button>` +
`</fieldset>` +
`<fieldset><legend>` + L(`legendAvail`) + `</legend>` +
`<label><input type="radio" name="it_avail" value="all"` +
((onlyVal===`all`) ? ` checked` : ``) + `> ` +
L(`allBranches`) + `</label>` +
availCustomHtml +
`<div id="availCustomWrap" style="display:` +
availWrapShow + `">` +
`<div class="miss-wrap">` + availBoxes + `</div>` +
`<label style="margin-top:.4rem"><small>` +
L(`missLegend`) + `</small></label>` +
`<label><input type="radio" name="it_miss" value="gray"` +
((missVal===`gray`) ? ` checked` : ``) + `> ` +
L(`missGray`) + `</label>` +
`<label><input type="radio" name="it_miss" value="hide"` +
((missVal===`hide`) ? ` checked` : ``) + `> ` +
L(`missHide`) + `</label>` +
`</div></fieldset>` +
`<fieldset><legend>` + L(`legendSold`) + `</legend>` +
`<label><input type="radio" name="it_sold" value="none"` +
((soldVal===`none`) ? ` checked` : ``) + `> ` +
L(`soldNone`) + `</label>` +
soldAllHtml + soldCustomHtml +
`<div id="soldCustomWrap" style="display:` +
soldWrapShow + `">` +
`<div class="miss-wrap">` + soldBoxes + `</div>` +
`</div></fieldset>`, async function(){
var targetSec = STATE.MENU[si];
if(!targetSec){
toast(L(`errGeneric`) + `section`, `error`);
return false;
}
var ar = mv(`it_ar`).trim();
var en = mv(`it_en`).trim();
var prices = mv(`it_prices`).trim().split(`,`)
.map(function(s){ return parseFloat(s.trim()); })
.filter(isFinite);
var cal = parseInt(mv(`it_cal`), 10) || 0;
if(!ar || !prices.length){
toast(L(`warnItem`), `warn`);
return false;
}
var availRadio = radioVal(`it_avail`, `all`);
var only = [];
var miss = `gray`;
if(availRadio === `custom`){
only = checkedVals(`it_br`);
if(!only.length){
toast(L(`warnAvail`), `warn`);
return false;
}
miss = radioVal(`it_miss`, `gray`);
}
var soldRadio = radioVal(`it_sold`, `none`);
var so = [];
if(soldRadio === `all`){
so = brs.map(function(b){ return b.id; });
}else if(soldRadio === `custom`){
so = checkedVals(`it_sold_br`);
}
var id = it ? it.id : (`it-` + Date.now());
var data = {
id: id, ar: ar, en: en || ar,
desc: mv(`it_descAr`).trim(),
descEn: mv(`it_descEn`).trim(),
prices: prices, cal: cal,
imgv: it ? (it.imgv || 0) : 0,
imgMode: mv(`it_imgMode`) || `cut`,
hidden: el(`it_hidden`).checked
};
if(only.length){ data.only = only; data.miss = miss; }
if(so.length){ data.so = so; }
var mods = readMods();
if(mods) data.mods = mods;
if(itemModalFile) pendingItemImgs[id] = itemModalFile;
else if(itemModalDelete) pendingItemImgs[id] = `delete`;
if(it){
delete it.only; delete it.miss;
delete it.so; delete it.mods;
Object.assign(it, data);
}else{
targetSec.items.push(data);
}
renderMenu();
toast(L(`savedItem`), `success`, L(`dontForget`));
});
var itemsBox = el(`modsItemsBox`);
var chipsBox = el(`modsChips`);
function miThumb(x){
var st = ` style="width:40px;height:40px;` +
`border-radius:8px;overflow:hidden;` +
`background:#f1f2f4;display:inline-grid;` +
`place-items:center;font-weight:900;` +
`color:#b45309;flex:0 0 auto"`;
if(x.imgv){
return `<span` + st + `><img src="img/items/` + x.id +
`.png?v=` + x.imgv +
`" alt="" style="width:100%;height:100%;` +
`object-fit:contain"></span>`;
}
return `<span` + st + `>` + esc(nmOf(x).charAt(0)) + `</span>`;
}
function renderModsItems(){
var v = mv(`modsSecSel`);
if(v === ``){ itemsBox.innerHTML = ``; return; }
var idx = +v;
var sec = STATE.MENU[idx];
if(!sec){ itemsBox.innerHTML = ``; return; }
var list = sec.items.filter(function(x){
if(x.hidden === true) return false;
if(idx === si && x.id === curItemId) return false;
return true;
});
if(!list.length){
itemsBox.innerHTML =
`<div class="note">` + L(`modsNone`) + `</div>`;
return;
}
itemsBox.innerHTML = list.map(function(x){
var ck = (modsRefsArr.indexOf(x.id) >= 0)
? ` checked` : ``;
return `<div class="mg_opt">` +
`<input type="checkbox" class="mi_chk" value="` +
x.id + `"` + ck + `>` +
miThumb(x) +
`<b>` + esc(nmOf(x)) + `</b>` +
`<span style="color:var(--muted);font-weight:800;` +
`font-size:.72rem">` + x.prices[0] + ` ` +
L(`riyal`) + `</span>` +
`</div>`;
}).join(``);
}
var chipBtnSt =
`border:none;border-radius:50%;width:20px;height:20px;` +
`font-weight:900;cursor:pointer;font-size:.6rem;`;
function renderModsChips(){
if(!modsRefsArr.length){
chipsBox.innerHTML =
`<div class="note" style="margin:0">` +
L(`modsNone`) + `</div>`;
return;
}
var last = modsRefsArr.length - 1;
chipsBox.innerHTML = modsRefsArr.map(function(ref, idx){
var x = findItemAdmin(ref);
if(!x) return ``;
return `<span style="display:inline-flex;` +
`align-items:center;gap:.35rem;background:#fff;` +
`border:1px solid var(--line);border-radius:50px;` +
`padding:.25rem .6rem;font-size:.72rem;` +
`font-weight:800;color:var(--ink)">` +
`<button type="button" class="mv_up" data-ref="` + ref +
`" title="` + esc(L(`moveUp`)) + `" style="` + chipBtnSt +
`background:var(--panel);color:var(--rust);` +
(idx===0 ? `opacity:.35;pointer-events:none;` : ``) +
`">▲</button>` +
`<button type="button" class="mv_down" data-ref="` + ref +
`" title="` + esc(L(`moveDown`)) + `" style="` + chipBtnSt +
`background:var(--panel);color:var(--rust);` +
(idx===last ? `opacity:.35;pointer-events:none;` : ``) +
`">▼</button>` +
esc(nmOf(x)) +
`<button type="button" class="mi_rm" data-ref="` +
ref + `" style="` + chipBtnSt +
`background:var(--red-bg);color:var(--red);">✕</button>` +
`</span>`;
}).join(` `);
}
function readMods(){
var refs = modsRefsArr.filter(function(r){
return !!findItemAdmin(r);
});
if(!refs.length) return null;
return {
tAr: mv(`modsTAr`).trim(),
tEn: mv(`modsTEn`).trim(),
refs: refs
};
}
el(`modsSecSel`).addEventListener(`change`,
renderModsItems);
itemsBox.addEventListener(`change`, function(e){
var c = e.target.closest(`.mi_chk`);
if(!c) return;
var idx2 = modsRefsArr.indexOf(c.value);
if(c.checked && idx2 < 0) modsRefsArr.push(c.value);
if(!c.checked && idx2 >= 0) modsRefsArr.splice(idx2, 1);
renderModsChips();
});
chipsBox.addEventListener(`click`, function(e){
var rm = e.target.closest(`.mi_rm`);
if(rm){
var i0 = modsRefsArr.indexOf(rm.dataset.ref);
if(i0 >= 0) modsRefsArr.splice(i0, 1);
renderModsChips();
renderModsItems();
return;
}
var up = e.target.closest(`.mv_up`);
var dn = e.target.closest(`.mv_down`);
var ref = up ? up.dataset.ref : (dn ? dn.dataset.ref : null);
if(!ref) return;
var i1 = modsRefsArr.indexOf(ref);
var i2 = up ? i1 - 1 : i1 + 1;
if(i1 < 0 || i2 < 0 || i2 >= modsRefsArr.length) return;
modsRefsArr[i1] = modsRefsArr[i2];
modsRefsArr[i2] = ref;
renderModsChips();
});
el(`modsClearAll`).addEventListener(`click`, function(){
modsRefsArr.length = 0;
renderModsChips();
renderModsItems();
});
renderModsChips();
var imgBox = el(`it_imgBox`);
var imgFile = el(`it_imgFile`);
var stImg = ` style="width:100%;height:100%;` +
`object-fit:contain;padding:6%"`;
function renderImgBox(){
if(itemModalFile){
imgBox.innerHTML = `<img src="` +
URL.createObjectURL(itemModalFile) + `"` + stImg + `>`;
}else if(itemModalDelete || !curImg){
imgBox.innerHTML =
`<div class="none">` + L(`imgPreviewNone`) + `</div>`;
}else{
imgBox.innerHTML = `<img src="` + curImg + `"` + stImg + `>`;
}
}
renderImgBox();
el(`it_imgPick`).addEventListener(`click`, function(){
imgFile.click();
});
el(`it_imgDel`).addEventListener(`click`, function(){
itemModalFile = null;
itemModalDelete = true;
renderImgBox();
});
imgFile.addEventListener(`change`, function(){
var f = imgFile.files[0];
if(!f) return;
if(!/image\/(png|jpeg|webp)/.test(f.type)){
toast(L(`imgBadType`), `warn`);
return;
}
if(f.size > 4*1024*1024){
toast(L(`imgTooBig`), `warn`);
return;
}
itemModalFile = f;
itemModalDelete = false;
renderImgBox();
});
document.querySelectorAll(
`input[name="it_avail"]`).forEach(function(r){
r.addEventListener(`change`, function(){
var v = radioVal(`it_avail`, `all`);
el(`availCustomWrap`).style.display =
(v === `custom`) ? `block` : `none`;
});
});
document.querySelectorAll(
`input[name="it_sold"]`).forEach(function(r){
r.addEventListener(`change`, function(){
var v = radioVal(`it_sold`, `none`);
el(`soldCustomWrap`).style.display =
(v === `custom`) ? `block` : `none`;
});
});
}
/* ===== الفروع ===== */
function renderBranches(){
var wrap = el(`branchWrap`);
var brs = branches();
if(!brs.length){
wrap.innerHTML =
`<div class="note">لا توجد فروع بعد.</div>`;
return;
}
var last = brs.length - 1;
wrap.innerHTML = brs.map(function(b,i){
var delDis = (brs.length<=1)
? ` disabled style="opacity:.35;pointer-events:none"`
: ``;
var coords = ``;
if(b.lat && b.lng){
coords = L(`brCoords`) + b.lat.toFixed(4) +
`, ` + b.lng.toFixed(4) + `<br>`;
}
var otherNm = (ALANG===`ar`) ? b.nameEn : b.nameAr;
return `<div class="br-card">` +
`<div class="br-head">` +
`<b>` + esc(brName(b)) +
` <span class="br-code">B` + b.num + `</span></b>` +
`<span class="item-ops"><span` + SQ_STYLE + `>` +
`<button class="edit" data-act="editBranch" data-i="` + i + `" title="` + esc(L(`editBranchTitle`)) + `">✏️</button>` +
`<button class="del" data-act="delBranch" data-i="` + i + `" title="` + esc(L(`btnDelFinal`)) + `"` + delDis + `>🗑</button>` +
`<button class="edit" data-act="moveBranchUp" data-i="` + i + `" title="` + esc(L(`moveUp`)) + `"` + disSt(i===0) + `>▲</button>` +
`<button class="edit" data-act="moveBranchDown" data-i="` + i + `" title="` + esc(L(`moveDown`)) + `"` + disSt(i===last) + `>▼</button>` +
`</span></span></div>` +
`<div class="br-info">` +
esc(otherNm||``) + `<br>` +
esc(b.addrAr||``) + `<br>` +
`<span class="sec-line">` + esc(b.addrEn||``) + `</span><br>` +
L(`brNum`) + b.num + ` • ` + L(`brWa`) + esc(b.wa||``) + `<br>` +
coords +
`</div></div>`;
}).join(``);
}
el(`branchWrap`).addEventListener(`click`,
async function(e){
var b = e.target.closest(`button[data-act]`);
if(!b) return;
var i = +b.dataset.i;
var act = b.dataset.act;
if(act === `editBranch`) openBranchModal(i);
if(act === `delBranch`){
if(branches().length <= 1){
toast(L(`warnLastBranch`), `warn`);
return;
}
var br = branches()[i];
var ok = await askConfirm(
LF(`delBranchMsg`, brName(br)),
L(`confirmDefault`), `🗑`, L(`btnDelFinal`), true);
if(ok){
branches().splice(i,1);
renumberBranches();
renderBranches();
toast(L(`deletedBranch`), `warn`, L(`dontForget`));
}
}
if(act === `moveBranchUp` || act === `moveBranchDown`){
var brs = branches();
var d = (act === `moveBranchUp`) ? -1 : 1;
var j = i + d;
if(j < 0 || j >= brs.length) return;
var tmp = brs[i];
brs[i] = brs[j];
brs[j] = tmp;
renumberBranches();
renderBranches();
toast(L(`dontForget`), `info`);
}
});
el(`addBranch`).addEventListener(`click`, function(){
openBranchModal(null);
});
function hoursFieldset(b){
var hours = (b && b.hours) ? b.hours : null;
if(!hours){
hours = [];
for(var i=0;i<7;i++){
hours.push({o:{h:9,m:0}, c:{h:23,m:0}, closed:false});
}
}
var rows = L(`days`).map(function(dn,i){
var d = hours[i] ||
{o:{h:9,m:0}, c:{h:23,m:0}, closed:false};
var cChk = d.closed ? ` checked` : ``;
var oaSel = (d.o.h<12) ? `am` : `pm`;
var caSel = (d.c.h<12) ? `am` : `pm`;
var oaAm = (oaSel===`am`) ? ` selected` : ``;
var oaPm = (oaSel===`pm`) ? ` selected` : ``;
var caAm = (caSel===`am`) ? ` selected` : ``;
var caPm = (caSel===`pm`) ? ` selected` : ``;
return `<div class="day-row">` +
`<span class="day-name">` + dn + `</span>` +
`<label class="day-closed"><input type="checkbox" class="d_closed" data-d="` + i + `"` + cChk + `> ` + L(`dayClosed`) + `</label>` +
`<span class="day-times">` +
L(`openLbl`) +
`<input type="number" min="1" max="12" class="d_oh" data-d="` + i + `" value="` + h12of(d.o.h) + `">` +
`<select class="d_oa" data-d="` + i + `">` +
`<option value="am"` + oaAm + `>` + L(`am`) + `</option>` +
`<option value="pm"` + oaPm + `>` + L(`pm`) + `</option>` +
`</select>` +
minSelect(`d_om`, i, d.o.m) +
L(`closeLbl`) +
`<input type="number" min="1" max="12" class="d_ch" data-d="` + i + `" value="` + h12of(d.c.h) + `">` +
`<select class="d_ca" data-d="` + i + `">` +
`<option value="am"` + caAm + `>` + L(`am`) + `</option>` +
`<option value="pm"` + caPm + `>` + L(`pm`) + `</option>` +
`</select>` +
minSelect(`d_cm`, i, d.c.m) +
`</span></div>`;
}).join(``);
return `<fieldset><legend>` + L(`legendHours`) +
`</legend>` + rows + `</fieldset>`;
}
function readHours(){
var hours = [];
for(var i=0;i<7;i++){
var closed = document.querySelector(
`.d_closed[data-d="` + i + `"]`).checked;
var oh = clamp12(document.querySelector(
`.d_oh[data-d="` + i + `"]`).value);
var oa = document.querySelector(
`.d_oa[data-d="` + i + `"]`).value;
var om = +document.querySelector(
`.d_om[data-d="` + i + `"]`).value;
var ch = clamp12(document.querySelector(
`.d_ch[data-d="` + i + `"]`).value);
var ca = document.querySelector(
`.d_ca[data-d="` + i + `"]`).value;
var cm = +document.querySelector(
`.d_cm[data-d="` + i + `"]`).value;
hours.push({
o:{ h: to24h(oh,oa), m: om },
c:{ h: to24h(ch,ca), m: cm },
closed: closed
});
}
return hours;
}
function openBranchModal(i){
var b = (i===null) ? null : branches()[i];
var code = b ? (`B` + b.num)
: (`B` + (branches().length + 1));
openModal(b ? L(`editBranchTitle`) : L(`addBranchTitle`),
`<div class="note" style="margin:0 0 .8rem">` +
L(`lblBrCodeAuto`) + `: <b>` + code + `</b></div>` +
`<div class="form-grid">` +
`<label>` + L(`lblBrNameAr`) +
`<input id="f_nameAr" value="` + esc(b?b.nameAr:``) + `"></label>` +
`<label>` + L(`lblBrNameEn`) +
`<input id="f_nameEn" class="ltr" value="` + esc(b?b.nameEn:``) + `"></label>` +
`<label>` + L(`lblBrAddrAr`) +
`<input id="f_addrAr" value="` + esc(b?b.addrAr:``) + `"></label>` +
`<label>` + L(`lblBrAddrEn`) +
`<input id="f_addrEn" class="ltr" value="` + esc(b?b.addrEn:``) + `"></label>` +
`<label>` + L(`lblMap`) +
`<input id="f_map" class="ltr" value="` + esc(b?b.map:``) + `"></label>` +
`<label>` + L(`lblLat`) +
`<input id="f_lat" class="ltr" type="number" step="0.000001" value="` +
(b?b.lat:``) + `"></label>` +
`<label>` + L(`lblLng`) +
`<input id="f_lng" class="ltr" type="number" step="0.000001" value="` +
(b?b.lng:``) + `"></label>` +
`</div>` +
`<div class="full"><label>` + L(`lblWa`) +
`<input id="f_wa" class="ltr" placeholder="9665XXXXXXXX" value="` +
esc(b?b.wa:``) + `">` +
`<small id="f_waMsg" class="wa-preview"></small></label></div>` +
hoursFieldset(b), async function(){
var wa = mv(`f_wa`).trim();
var lat = parseFloat(mv(`f_lat`));
var lng = parseFloat(mv(`f_lng`));
if(!validWa(wa)){
toast(L(`waBad`), `error`); return false;
}
if(!isFinite(lat) || !isFinite(lng)){
toast(L(`warnCoords`), `warn`); return false;
}
if(!mv(`f_nameAr`).trim()){
toast(L(`warnName`), `warn`); return false;
}
var data = {
nameAr: mv(`f_nameAr`).trim(),
nameEn: mv(`f_nameEn`).trim(),
addrAr: mv(`f_addrAr`).trim(),
addrEn: mv(`f_addrEn`).trim(),
wa: wa, lat: lat, lng: lng,
map: mv(`f_map`).trim(),
hours: readHours()
};
if(b) Object.assign(b, data);
else{
data.id = `b-` + Date.now();
branches().push(data);
renumberBranches();
}
renderBranches();
toast(L(`savedBranch`), `success`, L(`dontForget`));
});
var inp = el(`f_wa`);
var msg = el(`f_waMsg`);
inp.addEventListener(`input`, function(){
waFeedback(inp, msg);
});
waFeedback(inp, msg);
}
el(`saveBranches`).addEventListener(`click`,
async function(){
var btn = el(`saveBranches`);
var label = L(`btnSaveBranches`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث الفروع من لوحة التحكم 🍝`);
toast(L(`published`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== خيارات العرض ===== */
function renderDisplay(){
var d = STATE.SETTINGS.display || {};
var mode = (d.mode === `list`) ? `list` : `grid`;
el(`dispGrid`).checked = (mode === `grid`);
el(`dispList`).checked = (mode === `list`);
el(`dispDesc`).checked = d.showDesc !== false;
el(`dispCal`).checked = d.showCal !== false;
}
el(`saveDisplay`).addEventListener(`click`,
async function(){
STATE.SETTINGS.display = {
mode: el(`dispList`).checked ? `list` : `grid`,
showDesc: el(`dispDesc`).checked,
showCal: el(`dispCal`).checked
};
var btn = el(`saveDisplay`);
var label = L(`btnSaveDisplay`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث خيارات العرض من لوحة التحكم 🖥`);
toast(L(`savedDisplay`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== الأكثر مبيعاً ===== */
function allItemsOptions(sel){
return STATE.MENU.map(function(sec){
var opts = sec.items.map(function(it){
var s = (it.id===sel) ? ` selected` : ``;
return `<option value="` + it.id + `"` + s + `>` +
esc(nmOf(it)) + ` — ` + it.prices[0] + `</option>`;
}).join(``);
var lb = sec.i + ` ` +
esc((ALANG===`ar`)?sec.t:sec.tEn);
return `<optgroup label="` + lb + `">` + opts +
`</optgroup>`;
}).join(``);
}
function renderBest(){
var bs = STATE.SETTINGS.bestSellers || [];
var html = [0,1,2,3].map(function(i){
return `<div class="full"><label>` + L(`bestSlot`) +
`<b>` + (i+1) + `</b>` +
`<select id="best_` + i + `">` +
allItemsOptions(bs[i]) + `</select></label></div>`;
}).join(``);
html += `<div class="best-preview" id="bestPreview"></div>`;
el(`bestForm`).innerHTML = html;
[0,1,2,3].forEach(function(i){
el(`best_` + i).addEventListener(`change`,
updateBestPreview);
});
updateBestPreview();
}
function updateBestPreview(){
var ids = [0,1,2,3].map(function(i){
return el(`best_` + i).value;
});
var lines = ids.map(function(id,i){
var it = findItemAdmin(id);
if(!it) return ``;
return `<b>` + (i+1) + `.</b> ` + esc(nmOf(it)) +
` — ` + it.prices[0] + ` ` + L(`riyal`);
}).filter(Boolean).join(`<br>`);
el(`bestPreview`).innerHTML = lines;
}
el(`saveBest`).addEventListener(`click`,
async function(){
var ids = [0,1,2,3].map(function(i){
return el(`best_` + i).value;
});
if(ids.some(function(x){ return !x; })){
toast(L(`warnBestEmpty`), `warn`); return;
}
if(new Set(ids).size !== 4){
toast(L(`warnBestDup`), `warn`); return;
}
STATE.SETTINGS.bestSellers = ids;
var btn = el(`saveBest`);
var label = L(`btnSaveBest`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث الأكثر مبيعاً من لوحة التحكم ⭐`);
toast(L(`savedBest`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== التوصيل ===== */
function renderDeliveryAdmin(){
var d = STATE.SETTINGS.delivery || [];
if(d.length){
el(`deliveryWrap`).innerHTML = d.map(function(x,i){
var col = x.color || `#b45309`;
var dot = `<span style="display:inline-block;` +
`width:12px;height:12px;border-radius:50%;` +
`background:` + esc(col) +
`margin-inline-end:.4rem"></span>`;
var imgLine = x.img ? (`<br>img: ` + esc(x.img)) : ``;
var dn = (ALANG===`ar`) ? x.nameAr : (x.nameEn||x.nameAr);
return `<div class="br-card">` +
`<div class="br-head"><b>` + dot + esc(dn) +
` <span class="br-code">` + esc(x.nameEn||``) +
`</span></b>` +
`<span class="item-ops">` +
`<button class="edit" data-dact="edit" data-i="` + i + `">✏️</button>` +
`<button class="del" data-dact="del" data-i="` + i + `">🗑</button>` +
`</span></div>` +
`<div class="br-info ltr">` + esc(x.url) + imgLine +
`</div>` +
`</div>`;
}).join(``);
}else{
el(`deliveryWrap`).innerHTML =
`<div class="note">` + L(`noDelivery`) + `</div>`;
}
renderSocialAdmin();
}
el(`deliveryWrap`).addEventListener(`click`,
async function(e){
var b = e.target.closest(`button[data-dact]`);
if(!b) return;
var i = +b.dataset.i;
var act = b.dataset.dact;
if(act===`edit`) openDeliveryModal(i);
if(act===`del`){
var x = STATE.SETTINGS.delivery[i];
var dn = (ALANG===`ar`) ? x.nameAr : (x.nameEn||x.nameAr);
var ok = await askConfirm(
LF(`delDeliveryMsg`, dn),
L(`confirmDefault`), `🗑`, L(`btnDelFinal`), true);
if(ok){
STATE.SETTINGS.delivery.splice(i,1);
renderDeliveryAdmin();
toast(L(`deletedDelivery`), `warn`, L(`dontForget`));
}
}
});
el(`addDelivery`).addEventListener(`click`, function(){
openDeliveryModal(null);
});
function openDeliveryModal(i){
var x = (i===null) ? null : STATE.SETTINGS.delivery[i];
openModal(x ? L(`editDeliveryTitle`) : L(`addDeliveryTitle`),
`<div class="form-grid">` +
`<label>` + L(`lblDelNameAr`) +
`<input id="f_dar" value="` + esc(x?x.nameAr:``) + `"></label>` +
`<label>` + L(`lblDelNameEn`) +
`<input id="f_den" class="ltr" value="` + esc(x?x.nameEn:``) + `"></label>` +
`</div>` +
`<div class="full"><label>` + L(`lblDelUrl`) +
`<input id="f_durl" class="ltr" placeholder="https://..." value="` +
esc(x?x.url:``) + `"></label></div>` +
`<div class="form-grid">` +
`<label>` + L(`lblDelColor`) +
`<input id="f_dcolor" type="color" value="` +
esc(x && x.color ? x.color : `#b45309`) + `"></label>` +
`<label>` + L(`lblDelImg`) +
`<input id="f_dimg" class="ltr" placeholder="img/d-jahez.png" value="` +
esc(x && x.img ? x.img : ``) + `"></label>` +
`</div>`, function(){
var nameAr = mv(`f_dar`).trim();
var url = mv(`f_durl`).trim();
if(!nameAr){
toast(L(`warnDelName`), `warn`); return false;
}
if(!/^https:\/\/.+/i.test(url)){
toast(L(`warnDelUrl`), `warn`); return false;
}
var data = {
id: x ? x.id : (`d-` + Date.now()),
nameAr: nameAr,
nameEn: mv(`f_den`).trim(),
url: url,
color: mv(`f_dcolor`),
img: mv(`f_dimg`).trim()
};
if(x) Object.assign(x, data);
else STATE.SETTINGS.delivery.push(data);
renderDeliveryAdmin();
toast(L(`savedDelivery`), `success`, L(`dontForget`));
});
}
/* ===== السوشيال ===== */
const SOCIAL_PLATFORMS = {
instagram:{ar:`انستقرام`, en:`Instagram`},
tiktok:{ar:`تيك توك`, en:`TikTok`},
snapchat:{ar:`سناب شات`, en:`Snapchat`},
facebook:{ar:`فيس بوك`, en:`Facebook`},
x:{ar:`إكس (X)`, en:`X`},
youtube:{ar:`يوتيوب`, en:`YouTube`},
whatsapp:{ar:`واتساب`, en:`WhatsApp`},
email:{ar:`البريد الإلكتروني`, en:`Email`}
};
const SOC_EMOJI = {
snapchat:{ch:`👻`, bg:`#FFFC00`}
};
const SOC_SVG = {
instagram:`<svg viewBox="0 0 24 24"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.4 5.6 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.6 18.4 4 16.4 4m.9 2.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>`,
tiktok:`<svg viewBox="0 0 24 24"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.83 5.7 3.24 0 5.81-2.35 5.81-5.7l.03-6.14c1.15.82 2.53 1.27 3.97 1.27V7.34c-1.28 0-2.46-.55-3.2-1.52z"/></svg>`,
email:`<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
facebook:`<svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
x:`<svg viewBox="0 0 24 24"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z"/></svg>`,
youtube:`<svg viewBox="0 0 24 24"><path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.13L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.13L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/></svg>`,
whatsapp:`<svg viewBox="0 0 24 24"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.39 1 2.56.14.17 1.76 2.67 4.25 3.73 2.08.89 2.5.71 2.95.66.45-.04 1.45-.59 1.65-1.16.21-.57.21-1.05.15-1.16-.06-.1-.23-.16-.48-.27-.25-.14-1.47-.73-1.69-.81-.23-.08-.38-.12-.55.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.37.11-.5.11-.11.27-.29.37-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.55-.43-.14 0-.3-.01-.46-.01z"/></svg>`,
custom:`<svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`
};
function socAdminIcon(key){
var em = SOC_EMOJI[key];
if(em){
return `<span class="soc-ico" style="background:` +
em.bg + `;border-radius:50%;font-size:14px">` +
em.ch + `</span>`;
}
return `<span class="soc-ico">` +
(SOC_SVG[key]||SOC_SVG.custom) + `</span>`;
}
function renderSocialAdmin(){
var list = STATE.SETTINGS.social || [];
if(list.length){
el(`socialWrap`).innerHTML = list.map(function(x,i){
var nm = (ALANG===`ar`) ? x.nameAr : (x.nameEn||x.nameAr);
return `<div class="br-card">` +
`<div class="br-head"><b>` + socAdminIcon(x.key) +
esc(nm) +
` <span class="br-code">` + esc(x.key) + `</span></b>` +
`<span class="item-ops">` +
`<button class="edit" data-sact="edit" data-i="` + i + `">✏️</button>` +
`<button class="del" data-sact="del" data-i="` + i + `">🗑</button>` +
`</span></div>` +
`<div class="br-info ltr">` + esc(x.url) + `</div>` +
`</div>`;
}).join(``);
}else{
el(`socialWrap`).innerHTML =
`<div class="note">` + L(`noSocial`) + `</div>`;
}
el(`addSocial`).disabled = list.length >= 5;
}
el(`socialWrap`).addEventListener(`click`,
async function(e){
var b = e.target.closest(`button[data-sact]`);
if(!b) return;
var i = +b.dataset.i;
var act = b.dataset.sact;
if(act===`edit`) openSocialModal(i);
if(act===`del`){
var x = STATE.SETTINGS.social[i];
var nm = (ALANG===`ar`) ? x.nameAr : (x.nameEn||x.nameAr);
var ok = await askConfirm(
LF(`delSocialMsg`, nm),
L(`confirmDefault`), `🗑`, L(`btnDelFinal`), true);
if(ok){
STATE.SETTINGS.social.splice(i,1);
renderSocialAdmin();
toast(L(`deletedSocial`), `warn`, L(`dontForget`));
}
}
});
el(`addSocial`).addEventListener(`click`, function(){
openSocialModal(null);
});
function openSocialModal(i){
var list = STATE.SETTINGS.social || [];
if(i===null && list.length>=5){
toast(L(`warnSocialMax`), `warn`); return;
}
var x = (i===null) ? null : list[i];
var usedKeys = list.filter(function(_,j){
return j!==i;
}).map(function(y){ return y.key; });
var opts = Object.keys(SOCIAL_PLATFORMS)
.filter(function(k){ return !usedKeys.includes(k); })
.map(function(k){
var s = (x && x.key===k) ? ` selected` : ``;
var nm = (ALANG===`ar`)
? SOCIAL_PLATFORMS[k].ar
: SOCIAL_PLATFORMS[k].en;
return `<option value="` + k + `"` + s + `>` +
esc(nm) + `</option>`;
}).join(``);
var custSel = (x && x.key===`custom`) ? ` selected` : ``;
opts += `<option value="custom"` + custSel + `>` +
L(`platCustom`) + `</option>`;
openModal(x ? L(`editSocialTitle`) : L(`addSocialTitle`),
`<div class="form-grid">` +
`<label>` + L(`lblSocialPlatform`) +
`<select id="f_skey">` + opts + `</select></label>` +
`<label>` + L(`lblSocialNameAr`) +
`<input id="f_sar" value="` + esc(x?x.nameAr:``) + `"></label>` +
`<label>` + L(`lblSocialNameEn`) +
`<input id="f_sen" class="ltr" value="` + esc(x?x.nameEn:``) + `"></label>` +
`<label id="f_surlLbl">` + L(`lblSocialUrl`) +
`<input id="f_surl" class="ltr" placeholder="https://..." value="` +
esc(x?x.url:``) + `"></label>` +
`</div>`, function(){
var key = mv(`f_skey`);
var nameAr = mv(`f_sar`).trim();
var nameEn = mv(`f_sen`).trim();
var url = mv(`f_surl`).trim();
if(key!==`custom` && !nameAr){
nameAr = SOCIAL_PLATFORMS[key].ar;
nameEn = SOCIAL_PLATFORMS[key].en;
}
if(key===`custom` && !nameAr){
toast(L(`warnSocialName`), `warn`); return false;
}
if(key===`email`){
var em = url.replace(/^mailto:/i, ``);
var okMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
if(!okMail){
toast(L(`warnSocialEmail`), `warn`); return false;
}
url = `mailto:` + em;
}else if(!/^https:\/\/.+/i.test(url)){
toast(L(`warnSocialUrl`), `warn`); return false;
}
var data = {
id: x ? x.id : (`s-` + Date.now()),
key: key, nameAr: nameAr, nameEn: nameEn, url: url
};
if(x) Object.assign(x, data);
else list.push(data);
renderSocialAdmin();
toast(L(`savedSocial`), `success`, L(`dontForget`));
});
el(`f_skey`).addEventListener(`change`, function(){
var k = el(`f_skey`).value;
if(k!==`custom`){
el(`f_sar`).value = SOCIAL_PLATFORMS[k].ar;
el(`f_sen`).value = SOCIAL_PLATFORMS[k].en;
}
var lbl = el(`f_surlLbl`);
lbl.firstChild.textContent =
(k===`email`) ? L(`lblSocialEmail`) : L(`lblSocialUrl`);
});
}
el(`saveDelivery`).addEventListener(`click`,
async function(){
var btn = el(`saveDelivery`);
var label = L(`btnSaveDelivery`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث التوصيل والسوشيال من لوحة التحكم 🛵`);
toast(L(`savedDelivery`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== الإعدادات وصور التطبيق ===== */
const APP_IMGS = [
{key:`logo`, path:`img/logo.png`, label:`imgLogo`},
{key:`bg`, path:`img/bg.png`, label:`imgBg`},
{key:`welcome`, path:`img/welcome.png`, label:`imgWelcome`},
{key:`closed`, path:`img/closed.png`, label:`imgClosed`}
];
const imgPending = {};
let imgRenderStamp = Date.now();
async function publishAvail(btn){
var mode = el(`availMode`).value;
var ids = Array.prototype.slice
.call(document.querySelectorAll(`.availBr:checked`))
.map(function(c){ return c.value; });
if(mode === `selected` && !ids.length){
toast(L(`warnAvail`), `warn`);
return;
}
var label = L(`deliveryAvailPublish`);
btn.disabled = true;
btn.textContent = L(`publishing`);
try{
STATE.SETTINGS.deliveryAvailability = { mode: mode, branchIds: ids };
await publishSettings(`تحديث توفر التوصيل من لوحة التحكم 🛵`);
toast(L(`deliveryAvailSaved`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
}
function renderSettings(){
var s = STATE.SETTINGS;
var stImg = ` style="width:100%;height:100%;` +
`object-fit:contain;padding:6%"`;
var imgs = APP_IMGS.map(function(im){
var pend = imgPending[im.key];
var src = pend ? pend.url :
(im.path + `?v=` + (s.imagesVersion||0) +
`&r=` + imgRenderStamp);
var pendBtns = ``;
if(pend){
pendBtns =
`<button type="button" class="img-btn ok" data-iact="confirm" data-img="` + im.key + `">` + L(`imgConfirm`) + `</button>` +
`<button type="button" class="img-btn del" data-iact="cancel" data-img="` + im.key + `">` + L(`imgCancel`) + `</button>`;
}
return `<div class="img-card">` +
`<div class="img-prev"><img src="` + src +
`" alt=""` + stImg + `></div>` +
`<b>` + L(im.label) + `</b>` +
`<div class="img-ops">` +
`<button type="button" class="img-btn" data-iact="pick" data-img="` + im.key + `">` + L(`imgPick`) + `</button>` +
pendBtns +
`</div>` +
`<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-ifile="` + im.key + `">` +
`</div>`;
}).join(``);
var da = s.deliveryAvailability || { mode:`all`, branchIds: [] };
if(da.mode!==`all` && da.mode!==`none` && da.mode!==`selected`) da.mode = `all`;
if(!Array.isArray(da.branchIds)) da.branchIds = [];
var availBoxes = branches().map(function(b){
var ck = da.branchIds.includes(b.id) ? ` checked` : ``;
return `<label style="display:flex;align-items:center;gap:.4rem;` +
`font-size:.78rem;font-weight:800;color:var(--ink);` +
`margin-bottom:.35rem;cursor:pointer">` +
`<input type="checkbox" class="availBr" value="` + b.id + `"` + ck +
` style="width:auto;margin:0"> ` + esc(brName(b)) + `</label>`;
}).join(``);
var availHint = (da.mode===`none`) ? L(`deliveryAvailHintNone`)
: (da.mode===`selected`) ? L(`deliveryAvailHintSelected`) : ``;
el(`settingsForm`).innerHTML =
`<div class="form-grid">` +
`<label>` + L(`lblBrandAr`) +
`<input id="s_nameAr" value="` + esc(s.brand.nameAr) + `"></label>` +
`<label>` + L(`lblBrandEn`) +
`<input id="s_nameEn" class="ltr" value="` + esc(s.brand.nameEn) + `"></label>` +
`<label>` + L(`lblTagAr`) +
`<input id="s_tagAr" value="` + esc(s.brand.tagAr) + `"></label>` +
`<label>` + L(`lblTagEn`) +
`<input id="s_tagEn" class="ltr" value="` + esc(s.brand.tagEn) + `"></label>` +
`</div>` +
`<fieldset style="margin-top:1rem">` +
`<legend>` + L(`legendImages`) + `</legend>` +
`<div class="note">` + L(`imagesNote`) + `</div>` +
`<div class="imgs-grid">` + imgs + `</div>` +
`</fieldset>` +
`<fieldset style="margin-top:1rem">` +
`<legend>` + L(`deliveryAvailTitle`) + `</legend>` +
`<select id="availMode" style="width:100%;border:1px solid var(--line);` +
`border-radius:10px;padding:.6rem .7rem;font-family:inherit;` +
`font-weight:800;font-size:.88rem;background:var(--panel);` +
`color:var(--ink);outline:none">` +
`<option value="all"` + (da.mode===`all`?` selected`:``) + `>` + L(`deliveryAvailAll`) + `</option>` +
`<option value="none"` + (da.mode===`none`?` selected`:``) + `>` + L(`deliveryAvailNone`) + `</option>` +
`<option value="selected"` + (da.mode===`selected`?` selected`:``) + `>` + L(`deliveryAvailSelected`) + `</option>` +
`</select>` +
`<div id="availBranchWrap" style="display:` +
(da.mode===`selected`?`block`:`none`) + `;margin-top:.6rem">` +
`<small style="display:block;font-size:.72rem;font-weight:900;` +
`color:var(--rust);margin-bottom:.3rem">` +
L(`deliveryAvailSelectBranches`) + `</small>` +
availBoxes +
`</div>` +
`<div id="availHint" class="note" style="margin:.6rem 0 0;` +
(availHint?``:`display:none;`) + `">` + availHint + `</div>` +
`<button type="button" class="primary" data-iact="availPublish" ` +
`style="margin-top:.8rem">` + L(`deliveryAvailPublish`) + `</button>` +
`</fieldset>` +
`<div class="note">` + L(`settingsNote`) + `</div>`;
}
el(`settingsForm`).addEventListener(`click`, function(e){
var b = e.target.closest(`button[data-iact]`);
if(!b) return;
var key = b.dataset.img;
var act = b.dataset.iact;
if(act === `availPublish`){ publishAvail(b); return; }
var meta = APP_IMGS.find(function(x){
return x.key===key;
});
if(act===`pick`){
el(`settingsForm`).querySelector(
`[data-ifile="` + key + `"]`).click();
}
if(act===`cancel`){
if(imgPending[key]){
URL.revokeObjectURL(imgPending[key].url);
delete imgPending[key];
}
renderSettings();
}
if(act===`confirm`){ (async function(){
var pend = imgPending[key];
if(!pend) return;
b.disabled = true;
b.textContent = L(`imgUploadingApp`);
try{
await uploadAppImage(meta.path, pend.file);
URL.revokeObjectURL(pend.url);
delete imgPending[key];
STATE.SETTINGS.imagesVersion = Date.now();
await publishSettings(`تحديث صور التطبيق من لوحة التحكم 🖼️`);
imgRenderStamp = Date.now();
renderSettings();
toast(L(`imgUploadedApp`), `success`, L(`subLive`));
}catch(err){
b.disabled = false;
b.textContent = L(`imgConfirm`);
if(err.http===401||err.http===403){
toast(L(`errPermission`), `error`);
showRenew();
}else{
toast(L(`imgUploadFailApp`)+err.message, `error`);
}
}
})(); }
});
el(`settingsForm`).addEventListener(`change`, function(e){
if(e.target && e.target.id === `availMode`){
var m = e.target.value;
el(`availBranchWrap`).style.display =
(m === `selected`) ? `block` : `none`;
var h = (m === `none`) ? L(`deliveryAvailHintNone`)
: (m === `selected`) ? L(`deliveryAvailHintSelected`) : ``;
var hint = el(`availHint`);
hint.textContent = h;
hint.style.display = h ? `block` : `none`;
return;
}
var inp = e.target.closest(`input[data-ifile]`);
if(!inp) return;
var key = inp.dataset.ifile;
var f = inp.files[0];
inp.value = ``;
if(!f) return;
if(!/image\/(png|jpeg|webp)/.test(f.type)){
toast(L(`imgBadType`), `warn`); return;
}
if(f.size > 4*1024*1024){
toast(L(`imgTooBig`), `warn`); return;
}
if(imgPending[key]){
URL.revokeObjectURL(imgPending[key].url);
}
imgPending[key] = { file:f, url:URL.createObjectURL(f) };
renderSettings();
});
el(`saveSettings`).addEventListener(`click`,
async function(){
var s = STATE.SETTINGS;
s.brand.nameAr = mv(`s_nameAr`).trim() || s.brand.nameAr;
s.brand.nameEn = mv(`s_nameEn`).trim() || s.brand.nameEn;
s.brand.tagAr = mv(`s_tagAr`).trim();
s.brand.tagEn = mv(`s_tagEn`).trim();
var btn = el(`saveSettings`);
var label = L(`btnSaveSettings`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث الإعدادات من لوحة التحكم ⚙️`);
toast(L(`published`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== الإعلان ===== */
function renderAdPreview(){
var a = STATE.SETTINGS.ad;
var ti = (ALANG===`ar`)
? (a.titleAr || a.titleEn)
: (a.titleEn || a.titleAr);
var tx = (ALANG===`ar`)
? (a.textAr || a.textEn)
: (a.textEn || a.textAr);
el(`adPreview`).innerHTML =
`<div class="medal">` + esc(a.icon || `🍝`) + `</div>` +
`<b>` + esc(ti || L(`adPrevTitle`)) + `</b>` +
`<p>` + esc(tx || L(`adPrevText`)) + `</p>`;
}
function renderAd(){
var a = STATE.SETTINGS.ad;
var enChk = a.enabled ? ` checked` : ``;
var onceChk = (a.oncePerDay!==false) ? ` checked` : ``;
el(`adForm`).innerHTML =
`<fieldset>` +
`<label><input type="checkbox" id="a_enabled"` + enChk + `> ` + L(`lblAdEnabled`) + `</label>` +
`<label><input type="checkbox" id="a_once"` + onceChk + `> ` + L(`lblAdOnce`) + `</label>` +
`</fieldset>` +
`<div class="form-grid">` +
`<label>` + L(`lblAdIcon`) +
`<input id="a_icon" value="` + esc(a.icon || `🍝`) + `"></label>` +
`<label>` + L(`lblAdBtnAr`) +
`<input id="a_btnAr" value="` + esc(a.btnAr || `حسناً 🍝`) + `"></label>` +
`<label>` + L(`lblAdTitleAr`) +
`<input id="a_titleAr" value="` + esc(a.titleAr) + `"></label>` +
`<label>` + L(`lblAdBtnEn`) +
`<input id="a_btnEn" class="ltr" value="` + esc(a.btnEn || `Got it 🍝`) + `"></label>` +
`<label>` + L(`lblAdTitleEn`) +
`<input id="a_titleEn" class="ltr" value="` + esc(a.titleEn) + `</label>` +
`</div>` +
`<div class="full"><label>` + L(`lblAdTextAr`) +
`<textarea id="a_textAr" rows="2">` + esc(a.textAr) + `</textarea></label></div>` +
`<div class="full"><label>` + L(`lblAdTextEn`) +
`<textarea id="a_textEn" rows="2">` + esc(a.textEn) + `</textarea></label></div>`;
renderAdPreview();
}
el(`saveAd`).addEventListener(`click`, async function(){
var a = STATE.SETTINGS.ad;
a.enabled = el(`a_enabled`).checked;
a.oncePerDay = el(`a_once`).checked;
a.icon = mv(`a_icon`).trim() || `🍝`;
a.titleAr = mv(`a_titleAr`).trim();
a.titleEn = mv(`a_titleEn`).trim();
a.textAr = mv(`a_textAr`).trim();
a.textEn = mv(`a_textEn`).trim();
a.btnAr = mv(`a_btnAr`).trim() || `حسناً 🍝`;
a.btnEn = mv(`a_btnEn`).trim() || `Got it 🍝`;
var btn = el(`saveAd`);
var label = L(`btnSaveAd`);
btn.textContent = L(`publishing`);
btn.disabled = true;
try{
await publishSettings(`تحديث الإعلان من لوحة التحكم 📢`);
toast(L(`published`), `success`, L(`subLive`));
btn.disabled = false;
btn.textContent = label;
}catch(e){
handlePublishError(e, btn, label);
}
});
/* ===== v9.2: تبويب الموظفون ===== */
function buildUsersTab(){
var sec = el(`tab-cloud-users`);
if(!sec) return;
if(!STATE) return;
var brs = branches();
var brOpts = brs.map(function(b){
return `<option value="` + esc(b.id) + `">` + esc(brName(b)) + `</option>`;
}).join(``);
sec.innerHTML =
`<div class="cl-card">` +
`<h3>` + L(`usersAddTitle`) + `</h3>` +
`<form id="cuForm" class="cl-row">` +
`<div class="cl-f"><label>` + L(`usersName`) + `</label><input id="cuName" required></div>` +
`<div class="cl-f"><label>` + L(`usersPhone`) + `</label><input id="cuPhone" class="ltr" placeholder="9665xxxxxxxx"></div>` +
`<div class="cl-f"><label>` + L(`usersUsername`) + `</label><input id="cuUser" class="ltr" required></div>` +
`<div class="cl-f"><label>` + L(`usersRole`) + `</label><select id="cuRole">` +
`<option value="supervisor">` + L(`usersRoleSup`) + `</option>` +
`<option value="driver">` + L(`usersRoleDrv`) + `</option>` +
`</select></div>` +
`<div class="cl-f"><label>` + L(`usersBranch`) + `</label><select id="cuBranch">` + brOpts + `</select></div>` +
`<div class="cl-f"><label>` + L(`usersTempPass`) + `</label><input id="cuPass" class="ltr" placeholder="` + L(`usersTempGen`) + `"></div>` +
`<button type="submit" class="cl-btn cl-add" style="align-self:flex-end">` + L(`usersCreate`) + `</button>` +
`</form>` +
`<div class="cl-res" id="cuResult"></div>` +
`</div>` +
`<div class="cl-card">` +
`<h3>` + L(`usersListTitle`) + `</h3>` +
`<div style="overflow-x:auto"><table class="cl-tbl" id="cuTable"></table></div>` +
`<div class="cl-res" id="cuAct"></div>` +
`</div>`;
var form = el(`cuForm`);
if(form){
form.addEventListener(`submit`, async function(e){
e.preventDefault();
var name = mv(`cuName`).trim();
var phone = mv(`cuPhone`).trim();
var username = mv(`cuUser`).trim().toLowerCase();
var role = el(`cuRole`).value;
var branch_id = el(`cuBranch`).value;
var password = mv(`cuPass`).trim() || undefined;
if(!name || !username){
toast(L(`usersName`) + ` / ` + L(`usersUsername`), `warn`);
return;
}
var btn = form.querySelector(`button[type="submit"]`);
btn.disabled = true;
btn.textContent = L(`publishing`);
try{
var d = await capi(`/api/admin/users`, {
method:`POST`,
body: JSON.stringify({
name:name, phone:phone, username:username,
password:password, role:role, branch_id:branch_id
})
});
var box = el(`cuResult`);
box.classList.add(`show`);
box.innerHTML = `✅ ` + L(`usersCreated`) + ` — ` +
L(`usersUsername`) + `: <b dir="ltr">` + esc(d.username) + `</b><br>` +
`🔑 ` + L(`usersTempPass`) + `: <span class="pass">` + esc(d.temp_password) + `</span><br>` +
`⚠️ ` + L(`usersGivePass`);
form.reset();
loadUsersTab();
}catch(err){
toast(`⚠️ ` + err.message, `error`);
}
btn.disabled = false;
btn.textContent = L(`usersCreate`);
});
}
var tbl = el(`cuTable`);
if(tbl){
tbl.addEventListener(`click`, async function(e){
var ut = e.target.closest(`[data-ut]`);
var ur = e.target.closest(`[data-ur]`);
var ud = e.target.closest(`[data-ud]`);
try{
if(ut){
var uid = +ut.getAttribute(`data-ut`);
var ua = +ut.getAttribute(`data-ua`);
await capi(`/api/admin/users/` + uid, {
method:`PUT`,
body: JSON.stringify({ is_active: ua })
});
toast(ua ? `✓ ` + L(`usersEnable`) : `⛔ ` + L(`usersDisable`), `success`);
loadUsersTab();
} else if(ur){
var uid2 = +ur.getAttribute(`data-ur`);
var d = await capi(`/api/admin/users/` + uid2 + `/reset-password`, { method:`POST` });
var box = el(`cuAct`);
box.classList.add(`show`);
box.innerHTML = `🔑 <b dir="ltr">` + esc(d.username) + `</b> ← <span class="pass">` + esc(d.temp_password) + `</span>`;
} else if(ud){
var uid3 = +ud.getAttribute(`data-ud`);
var uname = ud.getAttribute(`data-name`) || ``;
var ok = await askConfirm(
(ALANG===`ar`) ?
`سيُحذف الموظف «${uname}» نهائياً. اكتب delete للتأكيد.` :
`Delete ${uname} permanently. Type delete to confirm.`,
L(`btnDelFinal`), `🗑`, L(`btnDelFinal`), true);
if(!ok) return;
await capi(`/api/admin/users/` + uid3, { method:`DELETE` });
toast((ALANG===`ar`)?`تم الحذف`:`Deleted`, `success`);
loadUsersTab();
}
}catch(err){
toast(`⚠️ ` + err.message, `error`);
}
});
}
}
async function loadUsersTab(){
var tbl = el(`cuTable`);
if(!tbl) return;
var ROLE_MAP = {
super_admin: L(`usersRoleOwner`),
supervisor: L(`usersRoleSup`),
driver: L(`usersRoleDrv`)
};
try{
if(!CLOUD_JWT) await cloudBridge();
var d = await capi(`/api/admin/users`);
var rows = (d.users || []).map(function(u){
var isOwner = u.role === `super_admin`;
var actions;
if(isOwner){
actions = `<span class="cl-locked" title="` +
((ALANG===`ar`)?`حساب المالك محمي`:`Owner protected`) +
`">🔒</span>` +
`<button class="cl-btn-sm cl-plain" data-ur="` + u.id + `" title="` +
((ALANG===`ar`)?`إعادة تعيين كلمة المرور`:`Reset password`) + `">🔑</button>`;
} else {
actions =
`<button class="cl-btn-sm ` + (u.is_active ? `cl-err` : `cl-ok`) +
`" data-ut="` + u.id + `" data-ua="` + (u.is_active ? 0 : 1) + `">` +
(u.is_active ? L(`usersDisable`) : L(`usersEnable`)) + `</button>` +
`<button class="cl-btn-sm cl-plain" data-ur="` + u.id + `" title="` +
((ALANG===`ar`)?`إعادة تعيين كلمة المرور`:`Reset password`) + `">🔑</button>` +
`<button class="cl-btn-sm cl-err" data-ud="` + u.id + `" data-name="` +
esc(u.name) + `" title="` +
((ALANG===`ar`)?`حذف نهائي`:`Delete permanently`) + `">🗑</button>`;
}
return `<tr>` +
`<td>` + esc(u.name) + `</td>` +
`<td dir="ltr">` + esc(u.username) + `</td>` +
`<td>` + (ROLE_MAP[u.role] || u.role) + `</td>` +
`<td>` + esc(u.branch_name || `—`) + `</td>` +
`<td>` + (u.is_active ? `<span class="cl-badge-on">` + L(`usersActive`) + `</span>` : `<span class="cl-badge-off">` + L(`usersInactive`) + `</span>`) + `</td>` +
`<td class="cl-actions">` + actions + `</td>` +
`</tr>`;
}).join(``);
tbl.innerHTML = `<tr>` +
`<th>` + L(`usersName`) + `</th>` +
`<th>` + L(`usersUsername`) + `</th>` +
`<th>` + L(`usersRole`) + `</th>` +
`<th>` + L(`usersBranch`) + `</th>` +
`<th>` + L(`ordersStatus`) + `</th>` +
`<th>—</th>` +
`</tr>` +
(rows || `<tr><td colspan="6" class="cl-empty">` + L(`usersEmpty`) + `</td></tr>`);
}catch(err){
tbl.innerHTML = `<tr><td colspan="6" class="cl-empty">⚠️ ` + esc(err.message) + `</td></tr>`;
}
}
/* ===== v9.2: تبويب الطلبات ===== */
function buildOrdersTab(){
var sec = el(`tab-cloud-orders`);
if(!sec) return;
if(!STATE) return;
var brs = branches();
var brOpts = `<option value="">` + L(`ordersAllBranches`) + `</option>` +
brs.map(function(b){
return `<option value="` + esc(b.id) + `">` + esc(brName(b)) + `</option>`;
}).join(``);
var statusOpts = `<option value="">` + L(`ordersAllStatuses`) + `</option>` +
`<option value="pending">` + L(`statusPending`) + `</option>` +
`<option value="accepted">` + L(`statusAccepted`) + `</option>` +
`<option value="preparing">` + L(`statusPreparing`) + `</option>` +
`<option value="ready">` + L(`statusReady`) + `</option>` +
`<option value="driver_assigned">` + L(`statusDrvAssigned`) + `</option>` +
`<option value="out_for_delivery">` + L(`statusOutForDel`) + `</option>` +
`<option value="delivered">` + L(`statusDelivered`) + `</option>` +
`<option value="cancelled">` + L(`statusCancelled`) + `</option>`;
var typeOpts =
`<option value="">` + ((ALANG===`ar`)?`كل الأنواع`:`All types`) + `</option>` +
`<option value="pickup">🏪 ` + ((ALANG===`ar`)?`استلام`:`Pickup`) + `</option>` +
`<option value="delivery">🛵 ` + ((ALANG===`ar`)?`توصيل`:`Delivery`) + `</option>`;
sec.innerHTML =
`<div class="cl-card">` +
`<h3>` + L(`ordersTitle`) + `</h3>` +
`<div class="cl-row">` +
`<div class="cl-f"><label>` + L(`ordersBranch`) + `</label><select id="coBranch">` + brOpts + `</select></div>` +
`<div class="cl-f"><label>` + L(`ordersStatus`) + `</label><select id="coStatus">` + statusOpts + `</select></div>` +
`<div class="cl-f"><label>` + ((ALANG===`ar`)?`النوع`:`Type`) + `</label><select id="coType">` + typeOpts + `</select></div>` +
`<button class="cl-btn cl-add" id="coRefresh" style="align-self:flex-end">` + L(`ordersRefresh`) + `</button>` +
`</div>` +
`<div style="overflow-x:auto"><table class="cl-tbl" id="coTable"></table></div>` +
`</div>`;
var refBtn = el(`coRefresh`);
if(refBtn) refBtn.addEventListener(`click`, loadOrdersTab);
var brSel = el(`coBranch`), stSel = el(`coStatus`), tySel = el(`coType`);
[brSel, stSel, tySel].forEach(function(s){
if(s) s.addEventListener(`change`, loadOrdersTab);
});
}
async function loadOrdersTab(){
var tbl = el(`coTable`);
if(!tbl) return;
var STATUS_MAP = {
pending: L(`statusPending`),
accepted: L(`statusAccepted`),
preparing: L(`statusPreparing`),
ready: L(`statusReady`),
driver_assigned: L(`statusDrvAssigned`),
out_for_delivery: L(`statusOutForDel`),
delivered: L(`statusDelivered`),
cancelled: L(`statusCancelled`),
archived: L(`statusArchived`)
};
var q = `/api/admin/orders?`;
var b = el(`coBranch`) ? el(`coBranch`).value : ``;
var st = el(`coStatus`) ? el(`coStatus`).value : ``;
var ty = el(`coType`) ? el(`coType`).value : ``;
if(b) q += `branch_id=` + encodeURIComponent(b) + `&`;
if(st) q += `status=` + encodeURIComponent(st) + `&`;
if(ty) q += `type=` + encodeURIComponent(ty) + `&`;
try{
if(!CLOUD_JWT) await cloudBridge();
var d = await capi(q);
var rows = (d.orders || []).map(function(o){
var ot = o.order_type || `delivery`;
var typeBadge = ot === `pickup`
? `<span class="cl-badge-pickup">🏪 ` + ((ALANG===`ar`)?`استلام`:`Pickup`) + `</span>` +
`<small style="display:block;font-size:.6rem;color:var(--amber);margin-top:.15rem">💵 ` +
((ALANG===`ar`)?`كاشير`:`Cashier`) + `</small>`
: `<span class="cl-badge-delivery">🛵 ` + ((ALANG===`ar`)?`توصيل`:`Delivery`) + `</span>`;
var statusText = STATUS_MAP[o.status] || o.status;
if(ot === `pickup` && o.status === `ready`) statusText = (ALANG===`ar`)?`جاهز للاستلام`:`Ready for pickup`;
if(ot === `pickup` && o.status === `delivered`) statusText = (ALANG===`ar`)?`تم الاستلام من الفرع ✅`:`Picked up ✅`;
return `<tr>` +
`<td dir="ltr"><b>` + esc(o.number) + `</b></td>` +
`<td>` + typeBadge + `</td>` +
`<td>` + esc(o.branch_name) + `</td>` +
`<td>` + esc(o.customer_name) + `</td>` +
`<td dir="ltr">` + esc(o.customer_phone) + `</td>` +
`<td>` + (o.total || 0) + `</td>` +
`<td>` + statusText + `</td>` +
`<td>` + esc(o.driver_name || L(`ordersNoDriver`)) + `</td>` +
`<td>` + esc(String(o.created_at).slice(0,16)) + `</td>` +
`</tr>`;
}).join(``);
tbl.innerHTML = `<tr>` +
`<th>` + L(`ordersNumber`) + `</th>` +
`<th>` + ((ALANG===`ar`)?`النوع`:`Type`) + `</th>` +
`<th>` + L(`ordersBranch`) + `</th>` +
`<th>` + L(`ordersCustomer`) + `</th>` +
`<th>` + L(`ordersPhone`) + `</th>` +
`<th>` + L(`ordersTotal`) + `</th>` +
`<th>` + L(`ordersStatus`) + `</th>` +
`<th>` + L(`ordersDriver`) + `</th>` +
`<th>` + L(`ordersTime`) + `</th>` +
`</tr>` +
(rows || `<tr><td colspan="9" class="cl-empty">` + L(`ordersEmpty`) + `</td></tr>`);
}catch(err){
tbl.innerHTML = `<tr><td colspan="9" class="cl-empty">⚠️ ` + esc(err.message) + `</td></tr>`;
}
}
/* ===== v9.7: التبويب المحاسبي ===== */
let LAST_ACCT = null;
function money(v){ return Math.round((+v||0)*100)/100; }
function stat(v, label){ return `<div class="cl-stat"><b>` + v + `</b><small>` + label + `</small></div>`; }
function table(title, heads, rows){
return `<h4 style="margin:1rem 0 .5rem;color:var(--brown);font-weight:900">` + title + `</h4>` +
`<table class="cl-tbl"><tr>` + heads.map(h=>`<th>`+h+`</th>`).join(``) + `</tr>` +
rows.map(r=>`<tr>` + r.map(c=>`<td>`+c+`</td>`).join(``) + `</tr>`).join(``) + `</table>`;
}
function brandNameNow(){
var b = STATE && STATE.SETTINGS && STATE.SETTINGS.brand;
if(!b) return `Makaronjy`;
return (ALANG===`ar`) ? (b.nameAr||b.nameEn) : (b.nameEn||b.nameAr);
}
function computeRange(){
const preset = el(`crPreset`).value;
const now = new Date();
const p2 = n => String(n).padStart(2,'0');
const today = now.getFullYear()+`-`+p2(now.getMonth()+1)+`-`+p2(now.getDate());
if(preset===`today`) return {from:today, to:today};
if(preset===`thisMonth`) return {from: today.slice(0,8)+`01`, to: today};
if(preset===`lastMonth`){
const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
const last = new Date(now.getFullYear(), now.getMonth(), 0);
return {from: d.getFullYear()+`-`+p2(d.getMonth()+1)+`-01`,
to:   d.getFullYear()+`-`+p2(d.getMonth()+1)+`-`+p2(last.getDate())};
}
if(preset===`thisYear`) return {from: now.getFullYear()+`-01-01`, to: today};
if(preset===`month`){
const mvv = el(`crMonth`).value || today.slice(0,7);
const y = +mvv.slice(0,4), mo = +mvv.slice(5,7);
const last = new Date(y, mo, 0).getDate();
return {from: mvv+`-01`, to: mvv+`-`+p2(last)};
}
if(preset===`year`){
const y = el(`crYear`).value || now.getFullYear();
return {from: y+`-01-01`, to: y+`-12-31`};
}
return {from: el(`crFrom`).value || (today.slice(0,8)+`01`), to: el(`crTo`).value || today};
}
function syncRangeInputs(){
const v = el(`crPreset`).value;
el(`crMonthWrap`).style.display = (v===`month`) ? `` : `none`;
el(`crYearWrap`).style.display  = (v===`year`)  ? `` : `none`;
el(`crFromWrap`).style.display  = (v===`custom`)? `` : `none`;
el(`crToWrap`).style.display    = (v===`custom`)? `` : `none`;
}
function buildReportsTab(){
var sec = el(`tab-cloud-reports`);
if(!sec) return;
if(!STATE) return;
var brs = branches();
var brOpts = `<option value="">` + L(`ordersAllBranches`) + `</option>` +
brs.map(function(b){ return `<option value="` + esc(b.id) + `">` + esc(brName(b)) + `</option>`; }).join(``);
sec.innerHTML =
`<div class="cl-card">` +
`<h3>` + L(`acctTitle`) + `</h3>` +
`<div class="cl-row">` +
`<div class="cl-f"><label>` + L(`acctPeriod`) + `</label><select id="crPreset">` +
`<option value="thisMonth">` + L(`acctThisMonth`) + `</option>` +
`<option value="lastMonth">` + L(`acctLastMonth`) + `</option>` +
`<option value="thisYear">` + L(`acctThisYear`) + `</option>` +
`<option value="today">` + L(`acctToday`) + `</option>` +
`<option value="month">` + L(`acctMonthPick`) + `</option>` +
`<option value="year">` + L(`acctYearPick`) + `</option>` +
`<option value="custom">` + L(`acctCustom`) + `</option>` +
`</select></div>` +
`<div class="cl-f" id="crMonthWrap" style="display:none"><label>` + L(`acctMonthLbl`) + `</label><input type="month" id="crMonth"></div>` +
`<div class="cl-f" id="crYearWrap" style="display:none"><label>` + L(`acctYearLbl`) + `</label><input type="number" id="crYear" min="2020" max="2040" value="` + new Date().getFullYear() + `"></div>` +
`<div class="cl-f" id="crFromWrap" style="display:none"><label>` + L(`acctFrom`) + `</label><input type="date" id="crFrom"></div>` +
`<div class="cl-f" id="crToWrap" style="display:none"><label>` + L(`acctTo`) + `</label><input type="date" id="crTo"></div>` +
`<div class="cl-f"><label>` + L(`ordersBranch`) + `</label><select id="crBranch2">` + brOpts + `</select></div>` +
`<button class="cl-btn cl-add" id="crGo" style="align-self:flex-end">` + L(`acctShow`) + `</button>` +
`<button class="cl-btn cl-plain" id="crXls" style="align-self:flex-end">` + L(`acctXls`) + `</button>` +
`<button class="cl-btn cl-plain" id="crPrint" style="align-self:flex-end">` + L(`acctPdf`) + `</button>` +
`</div>` +
`<div id="crBox" style="margin-top:.9rem"></div>` +
`</div>`;
el(`crPreset`).addEventListener(`change`, syncRangeInputs);
el(`crGo`).addEventListener(`click`, loadReportsTab);
el(`crXls`).addEventListener(`click`, exportExcel);
el(`crPrint`).addEventListener(`click`, printAcct);
syncRangeInputs();
}
async function loadReportsTab(){
var box = el(`crBox`);
if(!box) return;
const range = computeRange();
let q = `/api/reports/accounting?from=` + range.from + `&to=` + range.to;
const b = el(`crBranch2`) ? el(`crBranch2`).value : ``;
if(b) q += `&branch_id=` + encodeURIComponent(b);
box.innerHTML = `<div class="cl-empty">` + L(`publishing`) + `</div>`;
try{
if(!CLOUD_JWT) await cloudBridge();
const d = await capi(q);
LAST_ACCT = { from: range.from, to: range.to, data: d };
renderAcct(d, box);
}catch(err){
box.innerHTML = `<div class="cl-empty">⚠️ ` + esc(err.message) + `</div>`;
}
}
function renderAcct(d, box){
const t = d.totals || {};
const gross = money(t.gross), fees = money(t.fees);
const net = money(gross / 1.15), vat = money(gross - net);
let html = `<div class="cl-stats">` +
stat(t.orders||0,        L(`acctOrders`)) +
stat(t.delivered||0,     L(`acctDelivered`)) +
stat(t.cancelled||0,     L(`acctCancelled`)) +
stat(t.abandoned||0,     L(`acctAbandoned`)) +
stat(gross,              L(`acctGross`)) +
stat(net,                L(`acctNet`)) +
stat(vat,                L(`acctVat`)) +
stat(fees,               L(`acctFees`)) +
stat(t.avg||0,           L(`acctAvg`)) +
stat((t.cancel_rate||0)+`%`, L(`acctCancelRate`)) +
stat(money(t.pickup_gross),  L(`acctPickupRev`)) +
stat(money(t.delivery_gross),L(`acctDeliveryRev`)) +
`</div>`;
const months = d.months || [];
if(months.length){
const max = Math.max.apply(null, months.map(m=>+m.gross||0).concat([1]));
html += `<h4 style="margin:1rem 0 .5rem;color:var(--brown);font-weight:900">` + L(`acctMonthlyRev`) + `</h4>` +
`<div style="display:flex;gap:.4rem;align-items:flex-end;height:160px;background:#fff;border:1.5px solid var(--line);border-radius:12px;padding:.6rem">` +
months.map(function(m){
const h = Math.max(6, Math.round((+m.gross||0)/max*115));
return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:.2rem">` +
`<small style="font-size:.6rem;font-weight:900;color:var(--brown)">` + money(m.gross) + `</small>` +
`<div style="width:100%;max-width:34px;height:` + h + `px;background:linear-gradient(180deg,var(--gold),var(--gold2));border-radius:6px 6px 0 0"></div>` +
`<small style="font-size:.58rem;font-weight:800;color:var(--muted)">` + m.ym.slice(5) + `/` + m.ym.slice(2,4) + `</small>` +
`</div>`;
}).join(``) + `</div>`;
html += table(L(`acctMonthsTbl`),
[L(`acctColMonth`), L(`acctColOrders`), L(`acctColDelivered`), L(`acctColCancelled`), L(`acctColAbandoned`), L(`acctColGross`), L(`acctColVat`)],
months.map(function(m){
const g = money(m.gross);
return [m.ym, m.orders, m.delivered, m.cancelled, m.abandoned, g, money(g - g/1.15)];
}));
}
if((d.drivers||[]).length){
html += table(L(`acctDriversTbl`),
[L(`acctColDriver`), L(`acctColDeliveries`), L(`acctColEarnings`)],
d.drivers.map(function(x){ return [esc(x.driver_name), x.deliveries, money(x.earnings)]; }));
}
if((d.branches||[]).length){
html += table(L(`acctBranchesTbl`),
[L(`acctColBranch`), L(`acctColOrders`), L(`acctColDelivered`), L(`acctColGross`)],
d.branches.map(function(x){ return [esc(ALANG===`ar` ? x.branch_name : x.branch_name_en), x.orders, x.delivered, money(x.gross)]; }));
}
if((d.top_items||[]).length){
html += table(L(`acctItemsTbl`),
[L(`acctColItem`), L(`acctColQty`), L(`acctColRevenue`)],
d.top_items.map(function(x){ return [esc(ALANG===`ar` ? (x.name_ar||x.name_en) : (x.name_en||x.name_ar)), x.qty, money(x.revenue)]; }));
}
html += `<div style="text-align:center;color:var(--muted);font-size:.68rem;font-weight:800;margin-top:.8rem">` +
L(`acctPeriodLbl`) + `: ` + d.from + ` → ` + d.to + ` • ` + L(`acctNote`) + `</div>`;
box.innerHTML = html;
}
/* ===== v9.8: منشئ Excel احترافي (.xlsx) — هيدر منسق بلا مرجع ===== */
let CRC_TABLE = null;
function crc32(bytes){
if(!CRC_TABLE){
CRC_TABLE = new Int32Array(256);
for(let n=0;n<256;n++){
let c = n;
for(let k=0;k<8;k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
CRC_TABLE[n] = c;
}
}
let crc = -1;
for(let i=0;i<bytes.length;i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
return (crc ^ -1) >>> 0;
}
function zipBuild(files){
const enc = new TextEncoder();
const chunks = [];
const central = [];
let offset = 0;
files.forEach(function(f){
const nameB = enc.encode(f.name);
const crc = crc32(f.data);
const loc = new Uint8Array(30 + nameB.length);
const dv = new DataView(loc.buffer);
dv.setUint32(0, 0x04034b50, true);
dv.setUint16(4, 20, true);
dv.setUint32(14, crc, true);
dv.setUint32(18, f.data.length, true);
dv.setUint32(22, f.data.length, true);
dv.setUint16(26, nameB.length, true);
loc.set(nameB, 30);
chunks.push(loc, f.data);
const cen = new Uint8Array(46 + nameB.length);
const cv = new DataView(cen.buffer);
cv.setUint32(0, 0x02014b50, true);
cv.setUint16(4, 20, true);
cv.setUint16(6, 20, true);
cv.setUint32(16, crc, true);
cv.setUint32(20, f.data.length, true);
cv.setUint32(24, f.data.length, true);
cv.setUint16(28, nameB.length, true);
cv.setUint32(42, offset, true);
cen.set(nameB, 46);
central.push(cen);
offset += loc.length + f.data.length;
});
const cenSize = central.reduce((s,c)=>s+c.length,0);
const end = new Uint8Array(22);
const ev = new DataView(end.buffer);
ev.setUint32(0, 0x06054b50, true);
ev.setUint16(8, files.length, true);
ev.setUint16(10, files.length, true);
ev.setUint32(12, cenSize, true);
ev.setUint32(16, offset, true);
return new Blob(chunks.concat(central, [end]),
{type:`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`});
}
function escXml(s){
return String(s==null?``:s)
.replace(/&/g,`&amp;`).replace(/</g,`&lt;`)
.replace(/>/g,`&gt;`).replace(/"/g,`&quot;`);
}
function colName(i){
let s = ``; i++;
while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); }
return s;
}
const XS = { def:0, title:1, sub:2, sec:3, hdr:4, goldN:5, goldS:6, cell:7, num:8, int:9, zeb:10, zebNum:11, zebInt:12, banT:13, banS:14 };
function xlsxStyles(){
return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
`<numFmts count="2">` +
`<numFmt numFmtId="164" formatCode="#,##0.00"/>` +
`<numFmt numFmtId="165" formatCode="#,##0"/>` +
`</numFmts>` +
`<fonts count="9">` +
`<font><sz val="11"/><name val="Calibri"/></font>` +
`<font><b/><sz val="16"/><color rgb="FF5A1830"/><name val="Calibri"/></font>` +
`<font><sz val="10"/><color rgb="FF8A6F63"/><name val="Calibri"/></font>` +
`<font><b/><sz val="12"/><color rgb="FF8E2A4A"/><name val="Calibri"/></font>` +
`<font><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
`<font><b/><color rgb="FFE0912F"/><name val="Calibri"/></font>` +
`<font><b/><color rgb="FF5A1830"/><name val="Calibri"/></font>` +
`<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
`<font><b/><sz val="10"/><color rgb="FF5A1830"/><name val="Calibri"/></font>` +
`</fonts>` +
`<fills count="7">` +
`<fill><patternFill patternType="none"/></fill>` +
`<fill><patternFill patternType="gray125"/></fill>` +
`<fill><patternFill patternType="solid"><fgColor rgb="FFF3E7D7"/><bgColor indexed="64"/></patternFill></fill>` +
`<fill><patternFill patternType="solid"><fgColor rgb="FF5A1830"/><bgColor indexed="64"/></patternFill></fill>` +
`<fill><patternFill patternType="solid"><fgColor rgb="FFF2B95F"/><bgColor indexed="64"/></patternFill></fill>` +
`<fill><patternFill patternType="solid"><fgColor rgb="FFFFF6E6"/><bgColor indexed="64"/></patternFill></fill>` +
`<fill><patternFill patternType="solid"><fgColor rgb="FFFAF3EA"/><bgColor indexed="64"/></patternFill></fill>` +
`</fills>` +
`<borders count="2">` +
`<border><left/><right/><top/><bottom/><diagonal/></border>` +
`<border><left style="thin"><color rgb="FFD9C9BC"/></left><right style="thin"><color rgb="FFD9C9BC"/></right><top style="thin"><color rgb="FFD9C9BC"/></top><bottom style="thin"><color rgb="FFD9C9BC"/></bottom><diagonal/></border>` +
`</borders>` +
`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
`<cellXfs count="15">` +
`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
`<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
`<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
`<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="164" fontId="6" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>` +
`<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>` +
`<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>` +
`<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="164" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="165" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>` +
`<xf numFmtId="0" fontId="7" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></xf>` +
`<xf numFmtId="0" fontId="8" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></xf>` +
`</cellXfs>` +
`</styleSheet>`;
}
function xlsxSheet(rows, opts){
opts = opts || {};
let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
`<sheetViews><sheetView rightToLeft="1" workbookViewId="0">` +
(opts.freeze ? `<pane ySplit="` + opts.freeze + `" topLeftCell="A` + (opts.freeze+1) + `" activePane="bottomLeft" state="frozen"/>` : ``) +
`</sheetView></sheetViews>` +
(opts.cols ? `<cols>` + opts.cols.map(function(w){
return `<col min="` + w.i + `" max="` + w.i + `" width="` + w.w + `" customWidth="1"/>`;
}).join(``) + `</cols>` : ``) +
`<sheetData>` +
rows.map(function(r, ri){
const ht = r.ht ? ` ht="` + r.ht + `" ss:CustomHeight="1"` : ``;
return `<row r="` + (ri+1) + `"` + ht + `>` + r.map(function(c, ci){
const ref = colName(ci) + (ri+1);
const st = (c.s === undefined) ? 0 : c.s;
if(c.n === true) return `<c r="` + ref + `" s="` + st + `"><v>` + c.v + `</v></c>`;
return `<c r="` + ref + `" s="` + st + `" t="inlineStr"><is><t xml:space="preserve">` + escXml(c.v) + `</t></is></c>`;
}).join(``) + `</row>`;
}).join(``) +
`</sheetData>` +
(opts.filter ? `<autoFilter ref="` + opts.filter + `"/>` : ``) +
(opts.merges && opts.merges.length ? `<mergeCells count="` + opts.merges.length + `">` + opts.merges.map(function(m){ return `<mergeCell ref="` + m + `"/>`; }).join(``) + `</mergeCells>` : ``) +
(opts.cf ? opts.cf.map(function(c){
return `<conditionalFormatting sqref="` + c.sqref + `"><cfRule type="dataBar" priority="1"><dataBar showValue="1"><cfvo type="min"/><cfvo type="max"/><color rgb="FFE0912F"/></dataBar></cfRule></conditionalFormatting>`;
}).join(``) : ``) +
`</worksheet>`;
return xml;
}
function exportExcel(){
if(!LAST_ACCT){ toast(L(`acctShowFirst`), `warn`); return; }
const d = LAST_ACCT.data, t = d.totals || {};
const gross = money(t.gross), net = money(gross/1.15), vat = money(gross-net);
const months = d.months || [], drivers = d.drivers || [],
branchesR = d.branches || [], items = d.top_items || [];
const S = XS;
const N = function(v, s){ return { v: v, s: s, n: true }; };
const T = function(v, s){ return { v: v, s: s }; };
const scope = (el(`crBranch2`) && el(`crBranch2`).value)
? brName(branches().find(b=>b.id===el(`crBranch2`).value)||{})
: L(`ordersAllBranches`);
const pairs = [
[L(`acctOrders`), t.orders||0, 'i'],
[L(`acctDelivered`), t.delivered||0, 'i'],
[L(`acctCancelled`), t.cancelled||0, 'i'],
[L(`acctAbandoned`), t.abandoned||0, 'i'],
[L(`acctGross`), gross, 'g'],
[L(`acctNet`), net, 'n'],
[L(`acctVat`), vat, 'n'],
[L(`acctFees`), money(t.fees), 'n'],
[L(`acctAvg`), t.avg||0, 'n'],
[L(`acctCancelRate`) + ` %`, t.cancel_rate||0, 'i'],
[L(`acctPickupRev`), money(t.pickup_gross), 'n'],
[L(`acctDeliveryRev`), money(t.delivery_gross), 'n']
];
const sumRows = [
Object.assign([T(brandNameNow() + ` — ` + L(`acctDocTitle`), S.banT)], {ht:32}),
Object.assign([T(L(`acctPeriodLbl`) + `: ` + LAST_ACCT.from + `  →  ` + LAST_ACCT.to, S.banS)], {ht:20}),
Object.assign([T(L(`acctIssued`) + `: ` + new Date().toLocaleString(), S.banS)], {ht:20}),
Object.assign([T(L(`acctScope`) + `: ` + scope, S.banS)], {ht:20}),
[],
[T(L(`acctSecSummary`).replace(/^[0-9]+\)\s*/,``), S.sec)],
[T(ALANG===`ar`?`المؤشر`:`Metric`, S.hdr), T(ALANG===`ar`?`القيمة`:`Value`, S.hdr)]
].concat(pairs.map(function(p, i){
if(p[2] === 'g') return [T(p[0], S.goldS), N(p[1], S.goldN)];
const zb = (i % 2 === 1);
return [T(p[0], zb?S.zeb:S.cell), N(p[1], zb ? (p[2]==='i'?S.zebInt:S.zebNum) : (p[2]==='i'?S.int:S.num))];
}));
const monRows = [
[T(L(`acctMonthlyRev`), S.sec)],
[T(L(`acctColMonth`),S.hdr), T(L(`acctColOrders`),S.hdr), T(L(`acctColDelivered`),S.hdr), T(L(`acctColCancelled`),S.hdr), T(L(`acctColAbandoned`),S.hdr), T(L(`acctColGross`),S.hdr), T(L(`acctColVat`),S.hdr), T(L(`acctColFees`),S.hdr)]
].concat(months.map(function(m, i){
const g = money(m.gross);
const zb = (i % 2 === 1);
const c = zb?S.zeb:S.cell, cn = zb?S.zebNum:S.num, ci = zb?S.zebInt:S.int;
return [T(m.ym,c), N(m.orders,ci), N(m.delivered,ci), N(m.cancelled,ci), N(m.abandoned,ci), N(g,cn), N(money(g-g/1.15),cn), N(money(m.fees),cn)];
}));
const monLast = 2 + months.length;
const drvRows = [
[T(L(`acctDriversTbl`), S.sec)],
[T(L(`acctColDriver`),S.hdr), T(L(`acctColDeliveries`),S.hdr), T(L(`acctColEarnings`),S.hdr)]
].concat(drivers.map(function(x, i){
const zb = (i % 2 === 1);
return [T(x.driver_name, zb?S.zeb:S.cell), N(x.deliveries, zb?S.zebInt:S.int), N(money(x.earnings), zb?S.zebNum:S.num)];
}));
const drvLast = 2 + drivers.length;
const brRows = [
[T(L(`acctBranchesTbl`), S.sec)],
[T(L(`acctColBranch`),S.hdr), T(L(`acctColOrders`),S.hdr), T(L(`acctColDelivered`),S.hdr), T(L(`acctColGross`),S.hdr)]
].concat(branchesR.map(function(x, i){
const zb = (i % 2 === 1);
return [T(ALANG===`ar`?x.branch_name:x.branch_name_en, zb?S.zeb:S.cell), N(x.orders, zb?S.zebInt:S.int), N(x.delivered, zb?S.zebInt:S.int), N(money(x.gross), zb?S.zebNum:S.num)];
}));
const brLast = 2 + branchesR.length;
const itRows = [
[T(L(`acctItemsTbl`), S.sec)],
[T(L(`acctColItem`),S.hdr), T(L(`acctColQty`),S.hdr), T(L(`acctColRevenue`),S.hdr)]
].concat(items.map(function(x, i){
const zb = (i % 2 === 1);
const nm = ALANG===`ar` ? (x.name_ar||x.name_en) : (x.name_en||x.name_ar);
return [T(nm, zb?S.zeb:S.cell), N(x.qty, zb?S.zebInt:S.int), N(money(x.revenue), zb?S.zebNum:S.num)];
}));
const itLast = 2 + items.length;
const sheetNames = [
L(`acctSecSummary`).replace(/^[0-9]+\)\s*/,``),
L(`acctMonthlyRev`).replace(/[^\p{L}\p{N} ]/gu,``).trim().slice(0,31),
L(`acctDriversTbl`).replace(/[^\p{L}\p{N} ]/gu,``).trim().slice(0,31),
L(`acctBranchesTbl`).replace(/[^\p{L}\p{N} ]/gu,``).trim().slice(0,31),
L(`acctItemsTbl`).replace(/[^\p{L}\p{N} ]/gu,``).trim().slice(0,31)
];
const sheetsXml = [
xlsxSheet(sumRows, { cols:[{i:1,w:40},{i:2,w:20}], merges:[`A1:B1`,`A2:B2`,`A3:B3`,`A4:B4`,`A6:B6`] }),
xlsxSheet(monRows, { cols:[{i:1,w:14},{i:2,w:10},{i:3,w:10},{i:4,w:10},{i:5,w:10},{i:6,w:14},{i:7,w:12},{i:8,w:12}],
merges:[`A1:H1`], freeze:2, filter:`A2:H` + monLast,
cf: months.length ? [{sqref:`F3:F` + monLast}] : null }),
xlsxSheet(drvRows, { cols:[{i:1,w:26},{i:2,w:14},{i:3,w:16}],
merges:[`A1:C1`], freeze:2, filter:`A2:C` + drvLast,
cf: drivers.length ? [{sqref:`B3:B` + drvLast}] : null }),
xlsxSheet(brRows, { cols:[{i:1,w:28},{i:2,w:12},{i:3,w:12},{i:4,w:16}],
merges:[`A1:D1`], freeze:2, filter:`A2:D` + brLast,
cf: branchesR.length ? [{sqref:`D3:D` + brLast}] : null }),
xlsxSheet(itRows, { cols:[{i:1,w:36},{i:2,w:10},{i:3,w:16}],
merges:[`A1:C1`], freeze:2, filter:`A2:C` + itLast,
cf: items.length ? [{sqref:`C3:C` + itLast}] : null })
];
const enc = new TextEncoder();
const files = [
{ name:`[Content_Types].xml`, data: enc.encode(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
`<Default Extension="xml" ContentType="application/xml"/>` +
`<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
sheetsXml.map(function(_,i){ return `<Override PartName="/xl/worksheets/sheet` + (i+1) + `.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; }).join(``) +
`<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
`</Types>`) },
{ name:`_rels/.rels`, data: enc.encode(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
`</Relationships>`) },
{ name:`xl/workbook.xml`, data: enc.encode(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
`<sheets>` + sheetNames.map(function(nm,i){
return `<sheet name="` + escXml(nm).slice(0,31) + `" sheetId="` + (i+1) + `" r:id="rId` + (i+1) + `"/>`;
}).join(``) + `</sheets></workbook>`) },
{ name:`xl/_rels/workbook.xml.rels`, data: enc.encode(
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
sheetNames.map(function(_,i){ return `<Relationship Id="rId` + (i+1) + `" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet` + (i+1) + `.xml"/>`; }).join(``) +
`<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
`</Relationships>`) },
{ name:`xl/styles.xml`, data: enc.encode(xlsxStyles()) }
];
sheetsXml.forEach(function(x, i){
files.push({ name:`xl/worksheets/sheet` + (i+1) + `.xml`, data: enc.encode(x) });
});
const blob = zipBuild(files);
const a = document.createElement(`a`);
a.href = URL.createObjectURL(blob);
a.download = `Makaronjy-` + LAST_ACCT.from + `_` + LAST_ACCT.to + `.xlsx`;
a.click();
URL.revokeObjectURL(a.href);
toast(L(`acctXlsDone`), `success`);
}
/* ===== v9.8: PDF بلا شعار وبلا مرجع ===== */
function printAcct(){
if(!LAST_ACCT){ toast(L(`acctShowFirst`), `warn`); return; }
const d = LAST_ACCT.data, t = d.totals||{};
const gross = money(t.gross), net = money(gross/1.15), vat = money(gross-net);
const months = d.months||[];
const maxM = Math.max.apply(null, months.map(m=>+m.gross||0).concat([1]));
const scope = (el(`crBranch2`) && el(`crBranch2`).value)
? brName(branches().find(b=>b.id===el(`crBranch2`).value)||{})
: L(`ordersAllBranches`);
const kpi = function(v,l){
return `<div style="border:1.5px solid #EADFD2;border-radius:12px;padding:9px 6px;text-align:center;background:#FFFDF9"><b style="display:block;font-size:15px;color:#8E2A4A">` + v + `</b><small style="color:#8A6F63;font-weight:700;font-size:8.5px">` + l + `</small></div>`;
};
const secTitle = function(txt){
return `<div style="margin:14px 0 6px;padding:4px 10px;border-inline-start:4px solid #E0912F;background:#FAF3EA;border-radius:6px;font-size:12px;font-weight:900;color:#8E2A4A">` + txt + `</div>`;
};
const tbl = function(heads, rows){
return `<table style="width:100%;border-collapse:collapse;margin:6px 0;font-size:10.5px">` +
`<tr>` + heads.map(h=>`<th style="background:#5A1830;color:#fff;padding:6px;border:1px solid #D9C9BC;text-align:right;font-weight:800">`+h+`</th>`).join(``) + `</tr>` +
rows.map(function(r, i){
const bg = (i % 2 === 1) ? `background:#FAF3EA;` : ``;
return `<tr style="` + bg + `">` + r.map(c=>`<td style="padding:5px 6px;border:1px solid #EADFD2;text-align:right;font-weight:600">`+c+`</td>`).join(``) + `</tr>`;
}).join(``) + `</table>`;
};
const bars = months.map(function(m){
const h = Math.max(6, Math.round((+m.gross||0)/maxM*105));
return `<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div style="width:100%;max-width:56px;background:linear-gradient(180deg,#E0912F,#F2B95F);height:` + h + `px;border-radius:6px 6px 0 0"></div><small style="font-size:8px;color:#8A6F63;font-weight:700;margin-top:3px">` + m.ym.slice(5) + `/` + m.ym.slice(2,4) + `</small><small style="font-size:8px;font-weight:800;color:#8E2A4A">` + money(m.gross) + `</small></div>`;
}).join(``);
const html = `<html dir="rtl"><head><meta charset="utf-8"><title>` + brandNameNow() + ` — ` + L(`acctDocTitle`) + `</title><style>
@page{size:A4;margin:11mm}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Cairo,'Segoe UI',Tahoma,sans-serif;color:#2B1A15;margin:0;padding:16px}
</style></head><body>
<div style="background:#5A1830;color:#fff;border-radius:16px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px">
<div>
<b style="font-size:19px">` + brandNameNow() + `</b>
<div style="font-size:11px;color:#F2B95F;font-weight:800">` + L(`acctDocTitle`) + `</div>
</div>
<div style="text-align:left;font-size:9px;line-height:1.8;color:#F5E9DC">
<b style="color:#F2B95F">` + L(`acctPeriodLbl`) + `:</b> ` + LAST_ACCT.from + ` → ` + LAST_ACCT.to + `<br>
<b style="color:#F2B95F">` + L(`acctScope`) + `:</b> ` + escXml(scope) + `<br>
<b style="color:#F2B95F">` + L(`acctIssued`) + `:</b> ` + new Date().toLocaleString() + `
</div>
</div>
` + secTitle(L(`acctSecSummary`)) + `
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px">
` + kpi(gross, L(`acctGross`)) + kpi(net, L(`acctNet`)) + kpi(vat, L(`acctVat`)) + kpi(money(t.fees), L(`acctFees`)) +
kpi(t.orders||0, L(`acctOrders`)) + kpi(t.delivered||0, L(`acctDelivered`)) +
kpi(t.cancelled||0, L(`acctCancelled`)) + kpi((t.cancel_rate||0)+`%`, L(`acctCancelRate`)) + `
</div>` +
(months.length ? secTitle(L(`acctSecMonths`)) +
`<div style="border:1.5px solid #EADFD2;border-radius:14px;padding:10px;background:#fff"><div style="display:flex;gap:5px;align-items:flex-end;height:140px;justify-content:center">` + bars + `</div></div>` +
tbl([L(`acctColMonth`),L(`acctColOrders`),L(`acctColDelivered`),L(`acctColCancelled`),L(`acctColAbandoned`),L(`acctColGross`),L(`acctColVat`)],
months.map(function(m){ const g=money(m.gross); return [m.ym, m.orders, m.delivered, m.cancelled, m.abandoned, g, money(g-g/1.15)]; }))
: ``) +
secTitle(L(`acctSecVat`)) +
`<div style="background:#FFF6E6;border:1.5px dashed #E0912F;border-radius:12px;padding:10px">` +
tbl([L(`acctVatBoxTotal`), L(`acctVatBoxVat`), L(`acctVatBoxNet`)],
[[gross, vat, net]]) +
`<div style="font-size:9px;color:#A06B1C;font-weight:800;margin-top:4px">` + L(`acctVatNote`) + `</div>
</div>` +
((d.drivers||[]).length || (d.branches||[]).length || (d.top_items||[]).length
? secTitle(L(`acctSecTables`)) +
((d.drivers||[]).length ? tbl([L(`acctColDriver`),L(`acctColDeliveries`),L(`acctColEarnings`)], d.drivers.map(function(x){ return [esc(x.driver_name), x.deliveries, money(x.earnings)]; })) : ``) +
((d.branches||[]).length ? tbl([L(`acctColBranch`),L(`acctColOrders`),L(`acctColDelivered`),L(`acctColGross`)], d.branches.map(function(x){ return [esc(ALANG===`ar`?x.branch_name:x.branch_name_en), x.orders, x.delivered, money(x.gross)]; })) : ``) +
((d.top_items||[]).length ? tbl([L(`acctColItem`),L(`acctColQty`),L(`acctColRevenue`)], d.top_items.map(function(x){ return [esc(ALANG===`ar`?(x.name_ar||x.name_en):(x.name_en||x.name_ar)), x.qty, money(x.revenue)]; })) : ``)
: ``) +
`<div style="margin-top:14px;border-top:1.5px solid #EADFD2;padding-top:8px;font-size:8.5px;color:#8A6F63;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
<span>` + L(`acctPreparedBy`) + ` • ` + L(`acctNote`) + `</span>
<span>` + L(`acctSystem`) + `</span>
</div>
</body></html>`;
const w = window.open(``, `_blank`);
if(!w){ toast(L(`acctPopupWarn`), `warn`); return; }
w.document.write(html);
w.document.close();
setTimeout(function(){ w.print(); }, 500);
}
/* ===== v9.5: تبديل اللغة يعيد بناء التقرير ===== */
(function hookLangRefresh(){
var btn = el(`adminLangBtn`);
if(!btn || btn._acctHook) return;
btn._acctHook = true;
btn.addEventListener(`click`, function(){
setTimeout(function(){
if(el(`crPreset`)){
var preset = el(`crPreset`).value;
var branch = el(`crBranch2`) ? el(`crBranch2`).value : ``;
buildReportsTab();
el(`crPreset`).value = preset;
if(el(`crBranch2`) && branch) el(`crBranch2`).value = branch;
syncRangeInputs();
if(LAST_ACCT) renderAcct(LAST_ACCT.data, el(`crBox`));
}
}, 80);
});
})();
/* ===== v9.2: ربط التبويبات ===== */
(function setupCloudTabs(){
var defs = [
{id:`cloud-users`, build:buildUsersTab, load:loadUsersTab},
{id:`cloud-orders`, build:buildOrdersTab, load:loadOrdersTab},
{id:`cloud-reports`, build:buildReportsTab, load:loadReportsTab}
];
var built = {};
function bindAll(){
defs.forEach(function(t){
var btn = document.querySelector(`[data-tab="` + t.id + `"]`);
if(!btn || btn._cloudBound) return;
btn._cloudBound = true;
btn.addEventListener(`click`, function(){
if(typeof STATE === `undefined` || !STATE) return;
if(!built[t.id]){
t.build();
built[t.id] = true;
}
t.load();
});
});
}
if(document.readyState === `loading`){
document.addEventListener(`DOMContentLoaded`, bindAll);
} else {
bindAll();
}
})();
/* ===== التصدير الاحتياطي ===== */
el(`btnExport`).addEventListener(`click`, function(){
var data = {
exportedAt: new Date().toISOString(),
MENU: STATE.MENU,
SETTINGS: STATE.SETTINGS
};
var blob = new Blob([JSON.stringify(data, null, 2)],
{type:`application/json`});
var a = document.createElement(`a`);
a.href = URL.createObjectURL(blob);
a.download = `makaronjy-backup-` + Date.now() + `.json`;
a.click();
URL.revokeObjectURL(a.href);
toast(L(`exported`), `info`);
});
/* ===== تحديث كل التبويبات ===== */
function renderAll(){
renderMenu();
renderDisplay();
renderBranches();
renderBest();
renderDeliveryAdmin();
renderSettings();
renderAd();
}
/* ===== الإقلاع ===== */
(function init(){
applyAdminLang();
var saved = sessionStorage.getItem(`mk_admin`);
if(saved){
try{
CFG = JSON.parse(saved);
loadAll().catch(function(e){
if(e.http === 401 || e.http === 403){
showRenew();
}else{
var cls = classifyGhError(e);
showBanner(`loginErr`, L(`errPublish`),
L(cls.key) +
(cls.detail ? ` — ` + cls.detail : ``));
}
});
return;
}catch(err){}
}
applyAdminLang();
})();
window.__ADMIN_BOOTED = true;
/* ===== END admin-tabs.js (v9.8) ===== */
