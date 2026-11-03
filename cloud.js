/* =====================================================
مكرونجي — الطبقة السحابية (cloud.js)
v17.5: قواعد توفر التوصيل + موقع إجباري للتوصيل
       + شاشة إرشاد ذكية حسب الجهاز + زر إتمام نظيف
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

/* ===== v17.5: توفر خدمة التوصيل من settings.js ===== */
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

/* ===== v17.5: فرض القاعدة على واجهة نوع الطلب ===== */
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
    /* ملاحظة صغيرة تحت أزرار النوع */
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
    /* تحويل الوضع الحالي لو صار ممنوعاً */
    if(!ok && typeof getOrderMode === 'function' && getOrderMode() === 'delivery' && typeof setOrderMode === 'function'){
      setOrderMode('pickup');
    }
  }catch(e){}
}

/* ===== v17.5: زر إتمام نظيف (بدون أيقونة واتساب) ===== */
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

/* ===== ربطات واحدة (patches) ===== */
(function patchOnce(){
  if(window._mkCloudPatched) return;
  window._mkCloudPatched = true;

  /* تعبئة بيانات العميل عند فتح السلة */
  if(typeof window.openCart === 'function' && !window.openCart._mkFill){
    const _orig = window.openCart;
    window.openCart = function(){
      _orig.apply(this, arguments);
      try{
        const info = getCustomerInfo();
        const n = el('cName'), p = el('cPhone');
        if(n && !n.value && info.name) n.value = info.name;
        if(p && !p.value && info.phone) p.value = info.phone;
      }catch(e){}
    };
    window.openCart._mkFill = true;
  }
  /* فرض قاعدة التوصيل عند فتح صفحة النوع وتغيير الفرع والوضع */
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
  /* إبقاء الزر نظيفاً بعد تبديل اللغة */
  if(typeof window.applyLang === 'function' && !window.applyLang._mkClean){
    const _a = window.applyLang;
    window.applyLang = function(){
      const r = _a.apply(this, arguments);
      setTimeout(cleanCheckoutBtn, 80);
      return r;
    };
    window.applyLang._mkClean = true;
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      cleanCheckoutBtn(); enforceDeliveryUI();
    });
  } else {
    setTimeout(function(){ cleanCheckoutBtn(); enforceDeliveryUI(); }, 300);
  }
})();

/* ===== موقع التوصيل (خام) ===== */
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
      return st.state; /* granted | denied | prompt */
    }
  }catch(e){}
  return 'unknown';
}

/* ===== v17.5: شاشة الإرشاد الذكية حسب الجهاز ===== */
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

/* ===== v17.5: ضمان موقع التوصيل (حلقة حتى النجاح أو التحويل) ===== */
async function ensureDeliveryLocation(){
  for(;;){
    const st = await getPermState();
    if(st === 'denied'){
      const choice = await showLocationGuide();
      if(choice === 'convert') return { convert: true };
      continue; /* حاول مرة أخرى */
    }
    const loc = await captureGeoRaw();
    if(loc) return { loc: loc };
    const st2 = await getPermState();
    if(st2 === 'denied'){
      const choice = await showLocationGuide();
      if(choice === 'convert') return { convert: true };
      continue;
    }
    /* فشل مؤقت أو إلغاء طلب الإذن */
    const choice = await showLocationGuide();
    if(choice === 'convert') return { convert: true };
    /* retry: نكمل الحلقة */
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
   checkout() السحابي v17.5
   ===================================================== */
async function checkout(){
  try{
    if(orderLocked()) return;
    const TT = T();
    const br = currentBranch();
    if(!br){ openGate('switch'); return; }
    if(!cart.size){ toast(TT.emptyMsg); return; }

    const nameEl = el('cName'), phoneEl = el('cPhone');
    let cname = '', cphone = '';
    if(nameEl && phoneEl){
      cname = sanitize(nameEl.value);
      cphone = sanitize(phoneEl.value);
      if(cname.length < 2){
        toast(tt('nameRequired','⚠️ يرجى كتابة الاسم','⚠️ Please enter your name'));
        openCart();
        setTimeout(function(){ nameEl.focus(); }, 250);
        return;
      }
      if(cphone.replace(/\D/g,'').length < 9){
        toast(tt('phoneRequired','⚠️ يرجى كتابة رقم جوال صحيح','⚠️ Please enter a valid phone number'));
        openCart();
        setTimeout(function(){ phoneEl.focus(); }, 250);
        return;
      }
      saveCustomerInfo(cname, cphone);
    } else {
      const saved = getCustomerInfo();
      cname = saved.name || '';
      cphone = saved.phone || '';
    }

    /* v17.5: فرض قاعدة توفر التوصيل */
    let m = getOrderMode();
    if(m === 'delivery' && !branchHasDelivery(br)){
      if(typeof setOrderMode === 'function') setOrderMode('pickup');
      m = 'pickup';
      toast(isAr() ? '🏪 تم التحويل للاستلام — لا يتوفر توصيل لهذا الفرع' : '🏪 Switched to pickup — no delivery for this branch');
    }
    let isPickup = (m !== 'delivery');

    /* v17.5: الموقع إجباري للتوصيل */
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
      cloudItems.push({ id: it.id, name: itemName(it), qty: i.qty, price: unit, size: (i.sizeIdx >= 0 ? TT.sizes[i.sizeIdx] : '') });
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
      (cname ? ('👤 ' + tt('waCustomerName','الاسم','Name') + ': ' + cname + '\n') : '') +
      (cphone ? ('📱 ' + tt('waCustomerPhone','الجوال','Phone') + ': ' + cphone + '\n') : '') +
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
  }catch(e){
    console.error('checkout error:', e);
    toast('⚠️ ' + (e && e.message ? e.message : 'حدث خطأ — حاول مرة أخرى'));
  }
}
/* ===== END cloud.js (v17.5) ===== */
