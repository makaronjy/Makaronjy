/* =====================================================
مكرونجي — الطبقة السحابية (cloud.js)
v17.7: قفل الطلب المكرر + سلة Minimal + نافذة بيانات
       لكل ما عدا ذلك مطابق لـ v17.6
===================================================== */

const CLOUD_API = 'https://makaronjy-api.makaronjy.workers.dev';

/* ===== أدوات ===== */
function sanitize(str){
  if(!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g,'')
            .replace(/javascript:/gi,'')
            .replace(/on\w+=/gi,'')
            .trim()
            .slice(0,1000);
}
function getCustomerInfo(){
  try{ return JSON.parse(localStorage.getItem('mk_customer')) || {name:'',phone:''}; }
  catch(e){ return {name:'',phone:''}; }
}
function saveCustomerInfo(name, phone){
  try{ localStorage.setItem('mk_customer', JSON.stringify({name:name, phone:phone})); }catch(e){}
}
function isAr(){ return (typeof currentLang !== 'undefined' && currentLang === 'ar'); }

/* ===== توفر خدمة التوصيل ===== */
function deliveryAvailability(){
  try{
    const da = (typeof S === 'function' && S() && S().deliveryAvailability) ? S().deliveryAvailability : null;
    if(!da || typeof da !== 'object') return { mode:'all', branchIds: [] };
    if(da.mode !== 'all' && da.mode !== 'none' && da.mode !== 'selected') da.mode = 'all';
    if(!Array.isArray(da.branchIds)) da.branchIds = [];
    return da;
  }catch(e){ return { mode:'all', branchIds: [] }; }
}
function branchHasDelivery(br){
  if(!br) return true;
  const da = deliveryAvailability();
  if(da.mode === 'none') return false;
  if(da.mode === 'selected') return da.branchIds.includes(br.id);
  return true;
}
function enforceDeliveryUI(){
  try{
    const br = (typeof currentBranch === 'function') ? currentBranch() : null;
    const ok = branchHasDelivery(br);
    const md = el('modeDelivery');
    if(md){
      md.disabled = !ok;
      md.style.opacity = ok ? '' : '.4';
      md.style.pointerEvents = ok ? '' : 'none';
    }
    let note = el('mkDelivNote');
    if(!note && md && md.parentElement){
      note = document.createElement('div');
      note.id = 'mkDelivNote';
      note.style.cssText = 'margin-top:.5rem;padding:.45rem .7rem;background:#fff6e6;border:1px dashed #e0912f;border-radius:10px;font-size:.72rem;font-weight:800;color:#a06b1c;display:none';
      md.parentElement.appendChild(note);
    }
    if(note){
      note.textContent = isAr()
        ? '🏪 هذا الفرع للاستلام فقط — لا تتوفر خدمة توصيل هنا'
        : '🏪 This branch is pickup only — no delivery here';
      note.style.display = ok ? 'none' : 'block';
    }
    if(!ok && typeof getOrderMode === 'function' && getOrderMode() === 'delivery' && typeof setOrderMode === 'function'){
      setOrderMode('pickup');
    }
  }catch(e){}
}

/* ===== زر إتمام نظيف ===== */
function cleanCheckoutBtn(){
  try{
    document.querySelectorAll('button').forEach(function(b){
      const t = b.textContent || '';
      if(/إتمام الطلب|Complete Order|Checkout/i.test(t) && b.querySelector('svg')){
        b.innerHTML = isAr() ? '✅ إتمام الطلب' : '✅ Complete Order';
      }
    });
  }catch(e){}
}
function findCheckoutBtn(){
  const list = document.querySelectorAll('button');
  for(let i=0;i<list.length;i++){
    const t = list[i].textContent || '';
    if(/إتمام الطلب|Complete Order/i.test(t)) return list[i];
  }
  return null;
}

/* ═══════════════════════════════════════════
   v17.7: السلة Minimal
   ═══════════════════════════════════════════ */
(function injectCartCss(){
  if(el('mkCartCss')) return;
  const st = document.createElement('style');
  st.id = 'mkCartCss';
  st.textContent =
    /* إخفاء عناصر الزحمة (مهما حاول app.js إظهارها) */
    '#saveFavBtn, #subRow, #feeRow { display:none !important; }' +
    /* زر الملاحظة */
    '#mkNoteBtn{display:block;width:100%;border:1.5px dashed var(--line, #eadfd2);background:#fffdf9;' +
    'border-radius:12px;padding:.6rem .8rem;font-family:inherit;font-weight:800;font-size:.8rem;' +
    'color:#8a6f63;cursor:pointer;margin:.6rem 0 .2rem;text-align:start}' +
    '#mkNoteBtn.on{border-color:#e0912f;color:#a06b1c;background:#fff6e6}' +
    /* نافذة البيانات */
    '#mkInfoModal{position:fixed;inset:0;z-index:5150;background:rgba(40,12,24,.72);display:none;' +
    'align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}' +
    '#mkInfoModal.show{display:flex}' +
    '#mkInfoModal .card{background:#fffdf9;border:2px solid #e0912f;border-radius:22px;padding:1.4rem 1.2rem;' +
    'max-width:380px;width:100%;font-family:Cairo,sans-serif}' +
    '#mkInfoModal h3{color:#8e2a4a;font-size:1.05rem;font-weight:900;margin-bottom:.2rem;text-align:center}' +
    '#mkInfoModal small{display:block;color:#8a6f63;font-size:.72rem;font-weight:700;text-align:center;margin-bottom:1rem}' +
    '#mkInfoModal label{display:block;font-size:.8rem;font-weight:900;color:#a4385c;margin-bottom:.3rem}' +
    '#mkInfoModal input{width:100%;padding:.8rem .9rem;border:1.5px solid #eadfd2;border-radius:12px;' +
    'font-family:inherit;font-size:1rem;font-weight:700;background:#fff;color:#2b1a15;outline:none;margin-bottom:.9rem}' +
    '#mkInfoModal input:focus{border-color:#e0912f;box-shadow:0 0 0 3px #e0912f33}' +
    '#mkInfoModal .err{display:none;background:#fee2e2;color:#b91c1c;border-radius:10px;padding:.5rem .7rem;' +
    'font-size:.78rem;font-weight:800;margin-bottom:.7rem}' +
    '#mkInfoModal .err.show{display:block}' +
    '#mkInfoModal .row{display:flex;gap:.5rem}' +
    '#mkInfoModal .row button{flex:1;border:none;border-radius:12px;padding:.85rem;font-family:inherit;font-weight:900;cursor:pointer;font-size:.9rem}' +
    '#mkInfoGo{background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830}' +
    '#mkInfoCancel{background:#f3e7d7;color:#8e2a4a}';
  document.head.appendChild(st);
})();

/* إخفاء غلاف حقل (label أو .field) حول عنصر */
function hideFieldWrap(id){
  const inp = el(id);
  if(!inp) return;
  let n = inp;
  for(let d=0; d<4; d++){
    n = n.parentElement;
    if(!n) break;
    const cls = n.className || '';
    if(n.tagName === 'LABEL' || /\bfield\b/.test(cls) || /\brow\b/.test(cls)){
      n.style.display = 'none';
      n.dataset.mkHidden = '1';
      return;
    }
  }
  inp.style.display = 'none';
  const prev = inp.previousElementSibling;
  if(prev && prev.tagName === 'LABEL') prev.style.display = 'none';
}

/* زر الملاحظة + إخفاء الحقول عند فتح السلة */
function ensureCartMinimal(){
  try{
    hideFieldWrap('cName');
    hideFieldWrap('cPhone');
    hideFieldWrap('cnotes');
    const notesWrap = (function(){
      const t = el('cnotes');
      if(!t) return null;
      let n = t;
      for(let d=0; d<4; d++){
        n = n.parentElement;
        if(!n) break;
        if(n.dataset && n.dataset.mkHidden === '1') return n;
      }
      return t;
    })();
    const items = el('dItems');
    if(items && !el('mkNoteBtn')){
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'mkNoteBtn';
      b.textContent = isAr() ? '📝 إضافة توصية / ملاحظة للطبخ' : '📝 Add a note / instruction';
      b.addEventListener('click', function(){
        if(!notesWrap) return;
        const shown = notesWrap.style.display !== 'none';
        notesWrap.style.display = shown ? 'none' : '';
        b.classList.toggle('on', !shown);
        if(!shown){ try{ el('cnotes').focus(); }catch(e){} }
      });
      items.parentNode.insertBefore(b, items.nextSibling);
    }
  }catch(e){}
}

/* ═══════════════════════════════════════════
   v17.7: نافذة بيانات العميل عند الإتمام
   ═══════════════════════════════════════════ */
function openInfoModal(){
  return new Promise(function(resolve){
    let box = el('mkInfoModal');
    if(!box){
      box = document.createElement('div');
      box.id = 'mkInfoModal';
      box.innerHTML =
        '<div class="card">' +
          '<h3 id="mkInfoTitle"></h3>' +
          '<small id="mkInfoSub"></small>' +
          '<div class="err" id="mkInfoErr"></div>' +
          '<label id="mkInfoNameLbl"></label>' +
          '<input id="mkInfoName" autocomplete="name">' +
          '<label id="mkInfoPhoneLbl"></label>' +
          '<input id="mkInfoPhone" class="ltr" inputmode="numeric" autocomplete="tel" style="direction:ltr;text-align:left">' +
          '<div class="row">' +
            '<button id="mkInfoGo"></button>' +
            '<button id="mkInfoCancel"></button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(box);
    }
    const ar = isAr();
    const saved = getCustomerInfo();
    el('mkInfoTitle').textContent = ar ? '👤 بيانات الطلب' : '👤 Your details';
    el('mkInfoSub').textContent = saved.name
      ? (ar ? 'بياناتك المحفوظة — يمكنك تعديلها قبل المتابعة' : 'Saved details — edit anytime before continuing')
      : (ar ? 'نحتاج اسمك ورقم جوالك لتجهيز طلبك' : 'We need your name & phone to prepare your order');
    el('mkInfoNameLbl').textContent = ar ? '👤 الاسم *' : '👤 Name *';
    el('mkInfoPhoneLbl').textContent = ar ? '📱 رقم الجوال *' : '📱 Phone *';
    el('mkInfoGo').textContent = ar ? 'متابعة ➜' : 'Continue ➜';
    el('mkInfoCancel').textContent = ar ? 'إلغاء' : 'Cancel';
    el('mkInfoErr').classList.remove('show');
    el('mkInfoName').value = saved.name || '';
    el('mkInfoPhone').value = saved.phone || '';
    box.classList.add('show');
    setTimeout(function(){ try{ el('mkInfoName').focus(); }catch(e){} }, 120);

    function done(val){
      box.classList.remove('show');
      el('mkInfoGo').onclick = null;
      el('mkInfoCancel').onclick = null;
      resolve(val);
    }
    el('mkInfoCancel').onclick = function(){ done(null); };
    box.onclick = function(e){ if(e.target === box) done(null); };
    el('mkInfoGo').onclick = function(){
      const name = sanitize(el('mkInfoName').value);
      const phone = sanitize(el('mkInfoPhone').value);
      const err = el('mkInfoErr');
      if(name.length < 2){
        err.textContent = ar ? '⚠️ يرجى كتابة الاسم (حرفان على الأقل)' : '⚠️ Please enter your name';
        err.classList.add('show'); return;
      }
      if(phone.replace(/\D/g,'').length < 9){
        err.textContent = ar ? '⚠️ يرجى كتابة رقم جوال صحيح' : '⚠️ Please enter a valid phone';
        err.classList.add('show'); return;
      }
      done({ name: name, phone: phone });
    };
  });
}

/* ===== ربطات واحدة ===== */
(function patchOnce(){
  if(window._mkCloudPatched) return;
  window._mkCloudPatched = true;

  if(typeof window.openCart === 'function' && !window.openCart._mkFill){
    const _orig = window.openCart;
    window.openCart = function(){
      _orig.apply(this, arguments);
      setTimeout(ensureCartMinimal, 60);
    };
    window.openCart._mkFill = true;
  }
  ['openOrderType','applyBranchSelect','setOrderMode','confirmOrderType'].forEach(function(fn){
    if(typeof window[fn] === 'function' && !window[fn]._mkAvail){
      const _f = window[fn];
      window[fn] = function(){
        const r = _f.apply(this, arguments);
        setTimeout(enforceDeliveryUI, 60);
        return r;
      };
      window[fn]._mkAvail = true;
    }
  });
  if(typeof window.applyLang === 'function' && !window.applyLang._mkClean){
    const _a = window.applyLang;
    window.applyLang = function(){
      const r = _a.apply(this, arguments);
      setTimeout(function(){ cleanCheckoutBtn(); ensureCartMinimal(); }, 80);
      return r;
    };
    window.applyLang._mkClean = true;
  }
  if(typeof window.updateCart === 'function' && !window.updateCart._mkMin){
    const _u = window.updateCart;
    window.updateCart = function(){
      const r = _u.apply(this, arguments);
      setTimeout(ensureCartMinimal, 30);
      return r;
    };
    window.updateCart._mkMin = true;
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      cleanCheckoutBtn(); enforceDeliveryUI();
    });
  } else {
    setTimeout(function(){ cleanCheckoutBtn(); enforceDeliveryUI(); }, 300);
  }
})();

/* ===== موقع التوصيل ===== */
function captureGeoRaw(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){ resolve(null); return; }
    let done = false;
    function finish(v){ if(!done){ done = true; resolve(v); } }
    const watchdog = setTimeout(function(){ finish(null); }, 8000);
    navigator.geolocation.getCurrentPosition(
      function(pos){ clearTimeout(watchdog); finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      function(){ clearTimeout(watchdog); finish(null); },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
    );
  });
}
async function getPermState(){
  try{
    if(navigator.permissions && navigator.permissions.query){
      const st = await navigator.permissions.query({ name: 'geolocation' });
      return st.state;
    }
  }catch(e){}
  return 'unknown';
}
function deviceKind(){
  const ua = navigator.userAgent || '';
  if(/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if(/android/i.test(ua)) return 'android';
  return 'desktop';
}
function guideContent(){
  const ar = isAr();
  const kind = deviceKind();
  if(kind === 'ios'){
    return {
      icon: '📱',
      name: ar ? 'آيفون / آيباد (Safari)' : 'iPhone / iPad (Safari)',
      steps: ar ? [
        'من الصفحة: اضغط زر «aA» أعلى الشاشة ← «إعدادات الموقع» ← الموقع ← سماح',
        'أو: إعدادات الجهاز ← Safari ← الموقع ← اسأل أو سماح',
        'عد لهذه الصفحة واضغط «حاول مرة أخرى»'
      ] : [
        'On this page: tap the "aA" button ← Website Settings ← Location ← Allow',
        'Or: Settings app ← Safari ← Location ← Ask or Allow',
        'Return here and tap "Try again"'
      ]
    };
  }
  if(kind === 'android'){
    return {
      icon: '🤖',
      name: ar ? 'أندرويد (Chrome)' : 'Android (Chrome)',
      steps: ar ? [
        'من الصفحة: اضغط ⋮ أعلى المتصفح ← «إعدادات الموقع» ← الموقع ← سماح',
        'أو: إعدادات Chrome ← الخصوصية والأمان ← أذونات الموقع ← الموقع',
        'عد لهذه الصفحة واضغط «حاول مرة أخرى»'
      ] : [
        'On this page: tap ⋮ ← Site settings ← Location ← Allow',
        'Or: Chrome Settings ← Privacy ← Site settings ← Location',
        'Return here and tap "Try again"'
      ]
    };
  }
  return {
    icon: '💻',
    name: ar ? 'كمبيوتر (متصفح)' : 'Desktop browser',
    steps: ar ? [
      'اضغط أيقونة 🔒 (أو ⚙️) بجانب شريط العنوان أعلى الصفحة',
      'اختر «الموقع / Location» ← سماح / Allow',
      'اضغط «حاول مرة أخرى» مباشرة'
    ] : [
      'Click the 🔒 (or ⚙️) icon next to the address bar',
      'Choose "Location" ← Allow',
      'Then tap "Try again"'
    ]
  };
}
function showLocationGuide(){
  return new Promise(function(resolve){
    let box = el('mkLocGuide');
    if(!box){
      box = document.createElement('div');
      box.id = 'mkLocGuide';
      box.style.cssText = 'position:fixed;inset:0;z-index:5200;background:rgba(40,12,24,.72);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';
      document.body.appendChild(box);
    }
    const c = guideContent();
    const ar = isAr();
    box.innerHTML =
      '<div style="background:#fffdf9;border:2px solid #e0912f;border-radius:22px;padding:1.4rem 1.2rem;max-width:400px;width:100%;font-family:Cairo,sans-serif;max-height:88vh;overflow-y:auto">' +
        '<div style="text-align:center;font-size:2.6rem">📍</div>' +
        '<b style="display:block;text-align:center;color:#8e2a4a;font-size:1.05rem;font-weight:900;margin:.3rem 0">' +
          (ar ? 'نحتاج موقعك لتوصيل أدق وأسرع' : 'We need your location for accurate delivery') +
        '</b>' +
        '<p style="text-align:center;color:#8a6f63;font-size:.72rem;font-weight:700;margin:.2rem 0 .8rem">' +
          (ar ? 'موقعك يبقى سرياً — يُستخدم لحساب مسار السائق فقط' : 'Your location stays private — used only for the driver route') +
        '</p>' +
        '<div style="background:#faf3ea;border:1.5px solid #eadfd2;border-radius:14px;padding:.8rem .9rem">' +
          '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">' +
            '<span style="font-size:1.4rem">' + c.icon + '</span>' +
            '<b style="color:#8e2a4a;font-size:.85rem;font-weight:900">' + c.name + '</b>' +
          '</div>' +
          c.steps.map(function(s, i){
            return '<div style="display:flex;gap:.5rem;align-items:flex-start;margin-bottom:.45rem">' +
              '<span style="flex:0 0 22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830;font-size:.7rem;font-weight:900;display:flex;align-items:center;justify-content:center">' + (i+1) + '</span>' +
              '<span style="font-size:.78rem;font-weight:700;color:#2b1a15;line-height:1.7">' + s + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:.5rem;margin-top:1rem">' +
          '<button id="mkLocRetry" style="flex:1;border:none;border-radius:12px;padding:.8rem;background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830;font-family:inherit;font-weight:900;cursor:pointer">' +
            (ar ? '🔄 حاول مرة أخرى' : '🔄 Try again') +
          '</button>' +
          '<button id="mkLocConvert" style="flex:1;border:none;border-radius:12px;padding:.8rem;background:#1e5b4f;color:#fff;font-family:inherit;font-weight:900;cursor:pointer">' +
            (ar ? '🏪 تحويل لاستلام من الفرع' : '🏪 Switch to pickup') +
          '</button>' +
        '</div>' +
      '</div>';
    box.style.display = 'flex';
    el('mkLocRetry').onclick = function(){ box.style.display = 'none'; resolve('retry'); };
    el('mkLocConvert').onclick = function(){ box.style.display = 'none'; resolve('convert'); };
  });
}
async function ensureDeliveryLocation(){
  for(;;){
    const st = await getPermState();
    if(st === 'denied'){
      const choice = await showLocationGuide();
      if(choice === 'convert') return { convert: true };
      continue;
    }
    const loc = await captureGeoRaw();
    if(loc) return { loc: loc };
    const st2 = await getPermState();
    if(st2 === 'denied'){
      const choice = await showLocationGuide();
      if(choice === 'convert') return { convert: true };
      continue;
    }
    const choice = await showLocationGuide();
    if(choice === 'convert') return { convert: true };
  }
}

/* ===== إرسال للـ Worker ===== */
async function createCloudOrder(payload){
  try{
    const r = await fetch(CLOUD_API + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if(r.ok && j.success) return j;
    return null;
  }catch(e){ return null; }
}

/* ===== شاشة النجاح ===== */
function showOrderSuccess(res, waMsg, br, orderType){
  let box = el('orderSuccess');
  if(!box){
    box = document.createElement('div');
    box.id = 'orderSuccess';
    box.style.cssText = 'position:fixed;inset:0;z-index:5100;background:rgba(40,12,24,.72);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';
    document.body.appendChild(box);
  }
  const waNum = String(br.wa||'').replace(/\D/g,'');
  const ar = isAr();
  const isPickup = orderType === 'pickup';
  const subtitle = isPickup
    ? (ar ? 'سيكون جاهزاً عند وصولك للفرع 🏪' : 'Will be ready upon arrival 🏪')
    : (ar ? 'السائق سيأتي إليك قريباً 🛵' : 'Driver will arrive soon 🛵');
  const hint = isPickup
    ? (ar ? '💵 ادفع نقداً عند الكاشير' : '💵 Pay cash at the cashier')
    : (ar ? '💵 ادفع نقداً للسائق عند التسليم' : '💵 Pay cash to the driver upon delivery');
  box.innerHTML =
    '<div style="background:#fffdf9;border:2px solid #e0912f;border-radius:22px;padding:1.6rem 1.3rem;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif">' +
      '<div style="font-size:3rem">✅</div>' +
      '<b style="display:block;font-size:1.15rem;color:#8e2a4a;margin:.4rem 0">' + (ar ? 'تم استلام طلبك بنجاح' : 'Order received successfully') + '</b>' +
      '<div style="display:inline-block;background:#5a1830;color:#f2b95f;border-radius:50px;padding:.3rem 1.2rem;font-weight:900;font-size:1.2rem;direction:ltr;margin:.4rem 0">' + res.order_number + '</div>' +
      '<p style="color:#8a6f63;font-size:.78rem;font-weight:700;margin:.4rem 0">' + (ar ? 'احتفظ برقم الطلب لمتابعة حالته في أي وقت' : 'Keep this number to track your order') + '</p>' +
      '<div style="background:' + (isPickup ? '#dcf5e8' : '#fff6e6') + ';border-radius:10px;padding:.55rem;margin:.4rem 0;font-size:.82rem;font-weight:900;color:' + (isPickup ? '#1e5b4f' : '#b45309') + '">' + subtitle + '</div>' +
      '<div style="background:#f3e7d7;border-radius:10px;padding:.55rem;margin:.4rem 0 1rem;font-size:.78rem;font-weight:800;color:#8e2a4a">' + hint + '</div>' +
      '<a id="osTrack" href="' + (res.track_url || ('track.html?order=' + encodeURIComponent(res.order_number))) + '" style="display:block;border-radius:12px;padding:.85rem;background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830;font-weight:900;text-decoration:none;margin-bottom:.5rem">' + (ar ? '🗺️ تتبع طلبك مباشرة' : '🗺️ Track your order') + '</a>' +
      '<button id="osWa" style="display:block;width:100%;border:none;border-radius:12px;padding:.85rem;background:#128c5e;color:#fff;font-weight:900;cursor:pointer;margin-bottom:.5rem">' + (ar ? '📲 أكد طلبك عبر واتساب' : '📲 Confirm via WhatsApp') + '</button>' +
      '<button id="osClose" style="display:block;width:100%;border:none;border-radius:12px;padding:.7rem;background:transparent;color:#8a6f63;font-weight:800;cursor:pointer">' + (ar ? 'إغلاق' : 'Close') + '</button>' +
    '</div>';
  box.style.display = 'flex';
  el('osWa').onclick = function(){
    const url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(waMsg);
    const w = window.open(url, '_blank');
    if(!w) location.href = url;
  };
  el('osClose').onclick = function(){ box.style.display = 'none'; };
}

/* =====================================================
   checkout() السحابي v17.7
   ===================================================== */
let CHECKOUT_BUSY = false;

async function checkout(){
  /* v17.7: قفل الطلب المكرر */
  if(CHECKOUT_BUSY) return;
  try{
    if(orderLocked()) return;
    const TT = T();
    const br = currentBranch();
    if(!br){ openGate('switch'); return; }
    if(!cart.size){ toast(TT.emptyMsg); return; }

    CHECKOUT_BUSY = true;
    const btn = findCheckoutBtn();
    const btnLabel = btn ? btn.innerHTML : '';
    if(btn){
      btn.disabled = true;
      btn.innerHTML = isAr() ? '⏳ جارٍ الإرسال...' : '⏳ Sending...';
    }

    try{
      await doCheckoutFlow(TT, br, btn, btnLabel);
    } finally {
      CHECKOUT_BUSY = false;
      if(btn){
        btn.disabled = false;
        btn.innerHTML = btnLabel;
        cleanCheckoutBtn();
      }
    }
  }catch(e){
    CHECKOUT_BUSY = false;
    console.error('checkout error:', e);
    toast('⚠️ ' + (e && e.message ? e.message : 'حدث خطأ — حاول مرة أخرى'));
  }
}

async function doCheckoutFlow(TT, br, btn, btnLabel){
  /* v17.7: نافذة البيانات أولاً */
  const info = await openInfoModal();
  if(!info){
    return; /* إلغاء — لا طلب */
  }
  saveCustomerInfo(info.name, info.phone);
  const cname = info.name, cphone = info.phone;

  /* فرض قاعدة توفر التوصيل */
  let m = getOrderMode();
  if(m === 'delivery' && !branchHasDelivery(br)){
    if(typeof setOrderMode === 'function') setOrderMode('pickup');
    m = 'pickup';
    toast(isAr() ? '🏪 تم التحويل للاستلام — لا يتوفر توصيل لهذا الفرع' : '🏪 Switched to pickup — no delivery for this branch');
  }
  let isPickup = (m !== 'delivery');

  /* الموقع إجباري للتوصيل */
  let loc = null, addrText = '';
  if(!isPickup){
    const res = await ensureDeliveryLocation();
    if(res.convert){
      if(typeof setOrderMode === 'function') setOrderMode('pickup');
      isPickup = true;
      toast(isAr() ? '🏪 حوّلنا طلبك لاستلام من الفرع' : '🏪 Order switched to branch pickup');
    } else {
      loc = res.loc;
      const lineEl = el('dAddressLine') || el('dAddress');
      if(lineEl && lineEl.value && lineEl.value.trim()){
        addrText = sanitize(lineEl.value.trim());
      }
    }
  }

  const fee = isPickup ? 0 : deliveryFee();

  const invoiceID = generateInvoiceID(branchCode(br));
  const d = new Date();
  const p2 = function(n){ return String(n).padStart(2,'0'); };
  const dateStr = p2(d.getDate()) + '/' + p2(d.getMonth()+1) + '/' + d.getFullYear();
  let hh = d.getHours();
  const ampm = hh >= 12 ? (isAr() ? 'م' : 'PM') : (isAr() ? 'ص' : 'AM');
  hh = hh % 12 || 12;
  const timeStr = hh + ':' + p2(d.getMinutes()) + ' ' + ampm;

  let total = 0;
  const cloudItems = [];
  const lines = [];
  cart.forEach(function(i){
    const it = findMenuItem(i.id);
    if(!it) return;
    const unit = itemPrice(it, i.sizeIdx);
    total += i.qty * unit;
    const size = i.sizeIdx >= 0 ? ' (' + TT.sizes[i.sizeIdx] + ')' : '';
    cloudItems.push({
      id: it.id,
      name: itemName(it),
      name_ar: it.ar || itemName(it),
      name_en: it.en || it.ar || itemName(it),
      qty: i.qty,
      price: unit,
      size: (i.sizeIdx >= 0 ? TT.sizes[i.sizeIdx] : '')
    });
    lines.push('▪️ ' + i.qty + ' × ' + itemName(it) + size + ' = ' + (i.qty * unit) + ' ' + TT.currency);
  });

  const notes = sanitize(el('cnotes') ? el('cnotes').value.trim() : '');

  const typeShort = isPickup
    ? tt('typePickupShort','استلام','Pickup')
    : tt('typeDeliveryShort','توصيل','Delivery');
  const payLine = isPickup
    ? ('💵 ' + tt('payCashier','الدفع: عند الكاشير','Payment: at cashier'))
    : ('💵 ' + tt('payDriver','الدفع: للسائق عند التسليم','Payment: to driver on delivery'));
  const feeLine = isPickup ? '' : ('🛵 ' + tt('deliveryFee','رسوم التوصيل','Delivery fee') + ': ' + feeLabel(fee) + '\n');
  const grand = total + fee;
  const pickupNote = isPickup ? ('⏳ ' + tt('pickupNote','طلبك يكون جاهزاً عند وصولك للفرع','Your order will be ready upon arrival') + '\n') : '';

  const msg =
    brandize(TT.waGreeting) + '\n' +
    '🧾 ' + TT.waOrderTitle + ' | *@@NUM@@*\n' +
    '📅 ' + dateStr + ' • ⏰ ' + timeStr + '\n' +
    '📦 ' + tt('waOrderType','نوع الطلب','Order type') + ': *' + typeShort + '* ' + (isPickup ? '🏪' : '🛵') + '\n' +
    '👤 ' + tt('waCustomerName','الاسم','Name') + ': ' + cname + '\n' +
    '📱 ' + tt('waCustomerPhone','الجوال','Phone') + ': ' + cphone + '\n' +
    pickupNote +
    payLine + '\n' +
    '🍝 ' + tt('waBranch','الفرع','Branch') + ': ' + branchName(br) + '\n' +
    '━━━━━━━━━━━━\n' +
    lines.join('\n') + '\n' +
    '━━━━━━━━━━━━\n' +
    feeLine +
    '*' + TT.total + ': ' + grand + ' ' + TT.currency + '* ' + TT.taxInc + '\n' +
    (notes ? ('📝 ' + TT.waNote + ': ' + notes + '\n') : '') +
    '━━━━━━━━━━━━\n' +
    brandize(TT.waThanks);

  const cloud = await createCloudOrder({
    customer_name: cname,
    customer_phone: cphone,
    branch_id: br.id,
    items: cloudItems,
    subtotal: total,
    delivery_fee: fee,
    delivery_fee_mode: deliveryFeeMode(),
    customer_lat: loc ? loc.lat : null,
    customer_lng: loc ? loc.lng : null,
    customer_address: isPickup ? '' : addrText,
    notes: notes,
    order_type: isPickup ? 'pickup' : 'delivery'
  });

  const finalNum = cloud ? cloud.order_number : invoiceID;
  const finalMsg = msg.split('@@NUM@@').join(finalNum);

  cart.clear();
  if(el('cnotes')) el('cnotes').value = '';
  updateCart();
  closeCart();

  if(cloud){
    showOrderSuccess(cloud, finalMsg, br, isPickup ? 'pickup' : 'delivery');
  } else {
    const waUrl = 'https://wa.me/' + br.wa + '?text=' + encodeURIComponent(finalMsg);
    const w = window.open(waUrl, '_blank');
    if(!w){ location.href = waUrl; }
    toast(TT.orderSent);
  }
}
/* ===== END cloud.js (v17.7) ===== */
