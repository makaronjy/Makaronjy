/* =====================================================
مكرونجي — الطبقة السحابية (cloud.js)
v17.2: إصلاح توقف زر الإتمام بعد الطلب الأول
يُحمّل بعد app.js — يستبدل دالة checkout() بنسخة سحابية
مع fallback واتساب كامل عند فشل السحابة
===================================================== */

/* ===== إعدادات الربط ===== */
const CLOUD_API = 'https://makaronjy-api.makaronjy.workers.dev';

/* ===== أدوات التنظيف والأمان ===== */
function sanitize(str){
  if(!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g,'')
            .replace(/javascript:/gi,'')
            .replace(/on\w+=/gi,'')
            .trim()
            .slice(0,1000);
}

/* ===== حفظ بيانات العميل محلياً ===== */
function getCustomerInfo(){
  try{ return JSON.parse(localStorage.getItem('mk_customer')) || {name:'',phone:''}; }
  catch(e){ return {name:'',phone:''}; }
}
function saveCustomerInfo(name, phone){
  try{ localStorage.setItem('mk_customer', JSON.stringify({name:name, phone:phone})); }catch(e){}
}

/* ===== حساب المسافة بين نقطتين (صيغة Haversine) بالكم ===== */
function calcDistanceKm(lat1, lng1, lat2, lng2){
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/* ===== إيجاد أقرب فرع (ما عدا الفرع المختار) ===== */
function findNearestOtherBranch(lat, lng, excludeId){
  const brs = STATE && STATE.SETTINGS && Array.isArray(STATE.SETTINGS.branches)
    ? STATE.SETTINGS.branches : [];
  let best = null, bestDist = Infinity;
  brs.forEach(function(b){
    if(b.id === excludeId) return;
    if(b.is_active && b.is_active === false) return;
    if(typeof b.lat !== 'number' || typeof b.lng !== 'number') return;
    const d = calcDistanceKm(lat, lng, b.lat, b.lng);
    if(d < bestDist){ bestDist = d; best = b; }
  });
  return best ? { branch: best, distance: bestDist } : null;
}

/* ===== التقاط الموقع (للعميل — مرة واحدة) ===== */
function captureClientLocation(){
  return new Promise(function(resolve){
    if(!navigator.geolocation){ resolve(null); return; }
    let done = false;
    function finish(v){ if(!done){ done = true; resolve(v); } }
    const watchdog = setTimeout(function(){ finish(null); }, 8000);
    navigator.geolocation.getCurrentPosition(
      function(pos){
        clearTimeout(watchdog);
        finish({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      function(){ clearTimeout(watchdog); finish(null); },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 }
    );
  });
}

/* ===== نافذة عنوان نصي احتياطية ===== */
function askAddressText(){
  return new Promise(function(resolve){
    let box = el('addrModal');
    if(!box){
      box = document.createElement('div');
      box.id = 'addrModal';
      box.style.cssText = 'position:fixed;inset:0;z-index:5000;background:rgba(40,12,24,.6);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
      box.innerHTML =
        '<div style="background:#faf3ea;border:2px solid #e0912f;border-radius:18px;padding:1.2rem;max-width:360px;width:100%;font-family:Cairo,sans-serif">' +
          '<b style="display:block;margin-bottom:.6rem;color:#8e2a4a;font-size:.95rem">📍 اكتب عنوان التوصيل</b>' +
          '<textarea id="addrModalTxt" rows="3" style="width:100%;border:1.5px solid #eadfd2;border-radius:10px;padding:.5rem;font-family:inherit;font-size:.9rem" placeholder="الحي، الشارع، أقرب معلم..."></textarea>' +
          '<div style="display:flex;gap:.5rem;margin-top:.8rem">' +
            '<button id="addrModalOk" style="flex:1;border:none;border-radius:10px;padding:.7rem;background:#1e5b4f;color:#fff;font-family:inherit;font-weight:900;cursor:pointer">تأكيد</button>' +
            '<button id="addrModalSkip" style="flex:1;border:none;border-radius:10px;padding:.7rem;background:#f3e7d7;color:#8e2a4a;font-family:inherit;font-weight:900;cursor:pointer">تخطي</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(box);
    }
    box.style.display = 'flex';
    const ta = el('addrModalTxt');
    ta.value = '';
    el('addrModalOk').onclick = function(){ box.style.display = 'none'; resolve(sanitize(ta.value)); };
    el('addrModalSkip').onclick = function(){ box.style.display = 'none'; resolve(''); };
  });
}

/* ===== قراءة نوع الطلب الحالي ===== */
function getCurrentOrderType(){
  const radios = document.querySelectorAll('input[name="mk_order_type"]');
  for(let i = 0; i < radios.length; i++){
    if(radios[i].checked) return radios[i].value;
  }
  return 'pickup';
}

/* ===== تنبيه الفرع الأقرب ===== */
async function checkAndAlertNearestBranch(selectedBranch, clientLoc){
  if(!clientLoc || !selectedBranch) return null;
  if(typeof selectedBranch.lat !== 'number' || typeof selectedBranch.lng !== 'number') return null;
  const selectedDist = calcDistanceKm(clientLoc.lat, clientLoc.lng, selectedBranch.lat, selectedBranch.lng);
  const nearest = findNearestOtherBranch(clientLoc.lat, clientLoc.lng, selectedBranch.id);
  if(!nearest) return null;
  const diff = selectedDist - nearest.distance;
  if(diff < 3) return null;

  const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
  const selectedName = selectedBranch.nameAr || selectedBranch.nameEn || '';
  const nearestName = nearest.branch.nameAr || nearest.branch.nameEn || '';

  return new Promise(function(resolve){
    let box = el('nearestBranchModal');
    if(!box){
      box = document.createElement('div');
      box.id = 'nearestBranchModal';
      box.style.cssText = 'position:fixed;inset:0;z-index:5050;background:rgba(40,12,24,.6);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
      document.body.appendChild(box);
    }
    box.innerHTML =
      '<div style="background:#fffdf9;border:2px solid #e0912f;border-radius:18px;padding:1.3rem;max-width:380px;width:100%;font-family:Cairo,sans-serif">' +
        '<div style="text-align:center;font-size:2rem">📍</div>' +
        '<b style="display:block;text-align:center;color:#8e2a4a;font-size:1rem;margin:.3rem 0">' +
          (isAr ? 'يوجد فرع أقرب لك' : 'There is a closer branch') +
        '</b>' +
        '<div style="background:#f3e7d7;border-radius:10px;padding:.7rem;margin:.6rem 0;font-size:.85rem;line-height:1.8">' +
          '<div style="display:flex;justify-content:space-between">' +
            '<span>' + (isAr ? 'الأقرب:' : 'Nearest:') + '</span>' +
            '<b style="color:#1e5b4f">' + nearestName + '</b>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:#8a6f63">' +
            '<span>' + (isAr ? 'المسافة:' : 'Distance:') + '</span>' +
            '<span>' + nearest.distance.toFixed(1) + ' ' + (isAr ? 'كم' : 'km') + '</span>' +
          '</div>' +
          '<div style="height:1px;background:#eadfd2;margin:.5rem 0"></div>' +
          '<div style="display:flex;justify-content:space-between">' +
            '<span>' + (isAr ? 'المختار:' : 'Selected:') + '</span>' +
            '<b>' + selectedName + '</b>' +
          '</div>' +
          '<div style="display:flex;justify-content:space-between;font-size:.78rem;color:#8a6f63">' +
            '<span>' + (isAr ? 'المسافة:' : 'Distance:') + '</span>' +
            '<span>' + selectedDist.toFixed(1) + ' ' + (isAr ? 'كم' : 'km') + '</span>' +
          '</div>' +
        '</div>' +
        '<p style="color:#8a6f63;font-size:.75rem;text-align:center;margin:.3rem 0">' +
          (isAr ? 'هل تريد التبديل للفرع الأقرب؟' : 'Switch to the nearest branch?') +
        '</p>' +
        '<div style="display:flex;gap:.5rem;margin-top:.8rem">' +
          '<button id="nbSwitch" style="flex:1;border:none;border-radius:10px;padding:.7rem;background:#1e5b4f;color:#fff;font-family:inherit;font-weight:900;cursor:pointer">' +
            '🔄 ' + (isAr ? 'بدّل للأقرب' : 'Switch') +
          '</button>' +
          '<button id="nbKeep" style="flex:1;border:none;border-radius:10px;padding:.7rem;background:#f3e7d7;color:#8e2a4a;font-family:inherit;font-weight:900;cursor:pointer">' +
            (isAr ? 'تجاهل' : 'Keep') +
          '</button>' +
        '</div>' +
      '</div>';
    box.style.display = 'flex';
    el('nbSwitch').onclick = function(){ box.style.display = 'none'; resolve(nearest.branch); };
    el('nbKeep').onclick = function(){ box.style.display = 'none'; resolve(null); };
  });
}

/* ===== إضافة أزرار الاختيار في شاشة السلة (محمي من الحقن المتكرر) ===== */
function injectOrderTypeUI(){
  try {
    const cartEl = el('cart');
    if(!cartEl) return;
    if(el('mkOrderTypeBox')) return;

    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');

    const box = document.createElement('div');
    box.id = 'mkOrderTypeBox';
    box.style.cssText = 'background:#faf3ea;border:1.5px solid #eadfd2;border-radius:12px;padding:.7rem;margin:.6rem 0';
    box.innerHTML =
      '<div style="font-size:.78rem;font-weight:900;color:#8e2a4a;margin-bottom:.45rem">' +
        (isAr ? '📦 كيف تستلم طلبك؟' : '📦 How do you want your order?') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">' +
        '<label style="display:flex;align-items:center;gap:.35rem;padding:.55rem;background:#fff;border:1.5px solid #1e5b4f;border-radius:10px;cursor:pointer;transition:.2s">' +
          '<input type="radio" name="mk_order_type" value="pickup" checked style="margin:0">' +
          '<span style="font-weight:900;font-size:.82rem;color:#1e5b4f">🏪 ' +
            (isAr ? 'استلام من الفرع' : 'Pickup') +
          '</span>' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:.35rem;padding:.55rem;background:#fff;border:1.5px solid #eadfd2;border-radius:10px;cursor:pointer;transition:.2s">' +
          '<input type="radio" name="mk_order_type" value="delivery" style="margin:0">' +
          '<span style="font-weight:900;font-size:.82rem;color:#8e2a4a">🛵 ' +
            (isAr ? 'توصيل للمنزل' : 'Delivery') +
          '</span>' +
        '</label>' +
      '</div>' +
      '<div id="mkTypeHint" style="margin-top:.4rem;padding:.4rem .5rem;background:#dcf5e8;border-radius:8px;font-size:.72rem;font-weight:800;color:#1e5b4f;line-height:1.7">' +
        '💵 ' + (isAr ? 'ادفع نقداً عند الكاشير عند الاستلام' : 'Pay cash at the cashier upon pickup') +
      '</div>';

    cartEl.insertBefore(box, cartEl.firstChild);

    const hintEl = el('mkTypeHint');
    const radios = box.querySelectorAll('input[name="mk_order_type"]');
    radios.forEach(function(r){
      r.addEventListener('change', function(){
        const v = r.value;
        if(v === 'pickup'){
          hintEl.style.background = '#dcf5e8';
          hintEl.style.color = '#1e5b4f';
          hintEl.innerHTML = '💵 ' +
            (isAr ? 'ادفع نقداً عند الكاشير عند الاستلام' : 'Pay cash at the cashier upon pickup');
          const addrBox = el('dAddressLine') || el('dAddress');
          if(addrBox){
            const wrap = addrBox.closest('.field, .row, label, div');
            if(wrap) wrap.style.display = 'none';
          }
          const feeRow = document.querySelector('[data-role="delivery-fee"], .delivery-fee, .fee-row');
          if(feeRow) feeRow.style.display = 'none';
        } else {
          hintEl.style.background = '#fff6e6';
          hintEl.style.color = '#b45309';
          hintEl.innerHTML = '💵 ' +
            (isAr ? 'ادفع نقداً للسائق عند التسليم' : 'Pay cash to the driver upon delivery');
          const addrBox = el('dAddressLine') || el('dAddress');
          if(addrBox){
            const wrap = addrBox.closest('.field, .row, label, div');
            if(wrap) wrap.style.display = '';
          }
          const feeRow = document.querySelector('[data-role="delivery-fee"], .delivery-fee, .fee-row');
          if(feeRow) feeRow.style.display = '';
        }
      });
    });
  } catch(e){
    console.error('injectOrderTypeUI error:', e);
  }
}

/* ===== ربط openCart (بدون Observer — مرة واحدة فقط) ===== */
(function patchOpenCart(){
  if(window._mkOpenCartPatched) return;
  window._mkOpenCartPatched = true;
  if(typeof window.openCart !== 'function') return;
  const _orig = window.openCart;
  window.openCart = function(){
    try { _orig.apply(this, arguments); } catch(e){ console.error('openCart:', e); }
    try {
      const info = getCustomerInfo();
      const n = el('cName'), p = el('cPhone');
      if(n && !n.value && info.name) n.value = info.name;
      if(p && !p.value && info.phone) p.value = info.phone;
    } catch(e){}
    setTimeout(function(){
      try { injectOrderTypeUI(); } catch(e){ console.error('injectUI:', e); }
    }, 150);
  };
})();

/* ===== إرسال الطلب للـ Worker ===== */
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

/* ===== شاشة النجاح (نصوص مختلفة حسب النوع) ===== */
function showOrderSuccess(res, waMsg, br, orderType){
  try {
    let box = el('orderSuccess');
    if(!box){
      box = document.createElement('div');
      box.id = 'orderSuccess';
      box.style.cssText = 'position:fixed;inset:0;z-index:5100;background:rgba(40,12,24,.72);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';
      document.body.appendChild(box);
    }
    const waNum = String(br.wa||'').replace(/\D/g,'');
    const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
    const isPickup = orderType === 'pickup';

    const title = isAr ? 'تم استلام طلبك بنجاح' : 'Order received successfully';
    const subtitle = isPickup
      ? (isAr ? 'سيكون جاهزاً عند وصولك للفرع 🏪' : 'Will be ready upon arrival 🏪')
      : (isAr ? 'السائق سيأتي إليك قريباً 🛵' : 'Driver will arrive soon 🛵');
    const hint = isPickup
      ? (isAr ? '💵 ادفع نقداً عند الكاشير' : '💵 Pay cash at the cashier')
      : (isAr ? '💵 ادفع نقداً للسائق عند التسليم' : '💵 Pay cash to the driver upon delivery');
    const trackLabel = isAr ? '🗺️ تتبع طلبك مباشرة' : '🗺️ Track your order';
    const waLabel = isAr ? '📲 أكد طلبك عبر واتساب' : '📲 Confirm via WhatsApp';
    const closeLabel = isAr ? 'إغلاق' : 'Close';
    const saveNote = isAr ? 'احتفظ برقم الطلب لمتابعة حالته في أي وقت' : 'Keep this number to track your order anytime';

    box.innerHTML =
      '<div style="background:#fffdf9;border:2px solid #e0912f;border-radius:22px;padding:1.6rem 1.3rem;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif">' +
        '<div style="font-size:3rem">✅</div>' +
        '<b style="display:block;font-size:1.15rem;color:#8e2a4a;margin:.4rem 0">' + title + '</b>' +
        '<div style="display:inline-block;background:#5a1830;color:#f2b95f;border-radius:50px;padding:.3rem 1.2rem;font-weight:900;font-size:1.2rem;direction:ltr;margin:.4rem 0">' + res.order_number + '</div>' +
        '<p style="color:#8a6f63;font-size:.78rem;font-weight:700;margin:.4rem 0">' + saveNote + '</p>' +
        '<div style="background:' + (isPickup ? '#dcf5e8' : '#fff6e6') + ';border-radius:10px;padding:.55rem;margin:.4rem 0;font-size:.82rem;font-weight:900;color:' + (isPickup ? '#1e5b4f' : '#b45309') + '">' + subtitle + '</div>' +
        '<div style="background:#f3e7d7;border-radius:10px;padding:.55rem;margin:.4rem 0 1rem;font-size:.78rem;font-weight:800;color:#8e2a4a">' + hint + '</div>' +
        '<a id="osTrack" href="' + (res.track_url || ('track.html?order=' + encodeURIComponent(res.order_number))) + '" style="display:block;border:none;border-radius:12px;padding:.85rem;background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830;font-family:inherit;font-weight:900;text-decoration:none;margin-bottom:.5rem">' + trackLabel + '</a>' +
        '<button id="osWa" style="display:block;width:100%;border:none;border-radius:12px;padding:.85rem;background:#128c5e;color:#fff;font-family:inherit;font-weight:900;cursor:pointer;margin-bottom:.5rem">' + waLabel + '</button>' +
        '<button id="osClose" style="display:block;width:100%;border:none;border-radius:12px;padding:.7rem;background:transparent;color:#8a6f63;font-family:inherit;font-weight:800;cursor:pointer">' + closeLabel + '</button>' +
      '</div>';
    box.style.display = 'flex';
    el('osWa').onclick = function(){
      const url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(waMsg);
      const w = window.open(url, '_blank');
      if(!w) location.href = url;
    };
    el('osClose').onclick = function(){ box.style.display = 'none'; };
  } catch(e){
    console.error('showOrderSuccess error:', e);
  }
}

/* =====================================================
   v17.2: checkout() الكامل — محمي بـ try-catch شامل
   ===================================================== */
async function checkout(){
  try {
    if(typeof orderLocked === 'function' && orderLocked()) return;
    const TT = typeof T === 'function' ? T() : {};
    const br = typeof currentBranch === 'function' ? currentBranch() : null;
    if(!br){ if(typeof openGate === 'function') openGate('switch'); return; }
    if(!cart.size){ if(typeof toast === 'function') toast(TT.emptyMsg || 'السلة فارغة'); return; }

    const nameEl = el('cName'), phoneEl = el('cPhone');
    let cname = '', cphone = '';
    if(nameEl && phoneEl){
      cname = sanitize(nameEl.value);
      cphone = sanitize(phoneEl.value);
      if(cname.length < 2){
        if(typeof toast === 'function') toast('⚠️ يرجى كتابة الاسم');
        if(typeof openCart === 'function') openCart();
        setTimeout(function(){ nameEl.focus(); }, 250);
        return;
      }
      if(cphone.replace(/\D/g,'').length < 9){
        if(typeof toast === 'function') toast('⚠️ يرجى كتابة رقم جوال صحيح');
        if(typeof openCart === 'function') openCart();
        setTimeout(function(){ phoneEl.focus(); }, 250);
        return;
      }
      saveCustomerInfo(cname, cphone);
    } else {
      const saved = getCustomerInfo();
      cname = saved.name || '';
      cphone = saved.phone || '';
    }

    const orderType = getCurrentOrderType();
    const isPickup = orderType === 'pickup';

    let loc = null, addrText = '';
    try { loc = await captureClientLocation(); } catch(e){ loc = null; }

    if(isPickup){
      if(loc){
        const closer = await checkAndAlertNearestBranch(br, loc);
        if(closer){
          if(typeof setBranch === 'function'){ setBranch(closer.id); }
          else if(typeof STATE !== 'undefined' && STATE.currentBranchId !== undefined){
            STATE.currentBranchId = closer.id;
          }
          return checkout();
        }
      }
    } else {
      if(!loc){
        const lineEl = el('dAddressLine') || el('dAddress');
        if(lineEl && lineEl.value && lineEl.value.trim()){
          addrText = sanitize(lineEl.value.trim());
        } else {
          addrText = await askAddressText();
        }
      }
    }

    const fee = isPickup ? 0 : (typeof deliveryFee === 'function' ? deliveryFee() : 0);

    const invoiceID = typeof generateInvoiceID === 'function'
      ? generateInvoiceID(typeof branchCode === 'function' ? branchCode(br) : '')
      : ('INV-' + Date.now());
    const d = new Date();
    const p2 = function(n){ return String(n).padStart(2,'0'); };
    const dateStr = p2(d.getDate()) + '/' + p2(d.getMonth()+1) + '/' + d.getFullYear();
    let hh = d.getHours();
    const ampm = hh >= 12 ? (currentLang==='ar' ? 'م' : 'PM') : (currentLang==='ar' ? 'ص' : 'AM');
    hh = hh % 12 || 12;
    const timeStr = hh + ':' + p2(d.getMinutes()) + ' ' + ampm;

    let total = 0;
    const cloudItems = [];
    const lines = [];
    cart.forEach(function(i){
      const it = typeof findMenuItem === 'function' ? findMenuItem(i.id) : null;
      if(!it) return;
      const unit = typeof itemPrice === 'function' ? itemPrice(it, i.sizeIdx) : (it.prices[i.sizeIdx] || it.prices[0] || 0);
      total += i.qty * unit;
      const size = i.sizeIdx >= 0 ? ' (' + (TT.sizes ? TT.sizes[i.sizeIdx] : '') + ')' : '';
      cloudItems.push({
        id: it.id,
        name: typeof itemName === 'function' ? itemName(it) : (it.ar || it.en || ''),
        qty: i.qty,
        price: unit,
        size: (i.sizeIdx >= 0 && TT.sizes ? TT.sizes[i.sizeIdx] : '')
      });
      lines.push('▪️ ' + i.qty + ' × ' + (typeof itemName === 'function' ? itemName(it) : it.ar) + size + ' = ' + (i.qty * unit) + ' ' + (TT.currency || 'ر.س'));
    });

    const notes = sanitize(el('cnotes') ? el('cnotes').value.trim() : '');

    const typeLine = isPickup
      ? '🏪 ' + (typeof tt === 'function' ? tt('orderPickup','استلام من الفرع','Branch pickup') : 'استلام من الفرع') + ' — ' + (typeof tt === 'function' ? tt('cashierPay','💵 ادفع عند الكاشير','💵 Pay at cashier') : '💵 ادفع عند الكاشير')
      : '🛵 ' + (typeof tt === 'function' ? tt('restaurantDelivery','توصيل المطعم','Restaurant delivery') : 'توصيل المطعم') + ' — ' + (typeof tt === 'function' ? tt('driverPay','💵 ادفع للسائق','💵 Pay to driver') : '💵 ادفع للسائق');
    const feeLine = isPickup ? '' : ('🛵 ' + (typeof tt === 'function' ? tt('deliveryFee','رسوم التوصيل','Delivery fee') : 'رسوم التوصيل') + ': ' + (typeof feeLabel === 'function' ? feeLabel(fee) : fee) + '\n');
    const grand = total + fee;

    const pickupNote = isPickup
      ? ('⏳ ' + (typeof tt === 'function' ? tt('pickupReady','سيكون طلبك جاهزاً عند وصولك للفرع','Your order will be ready upon arrival') : 'سيكون طلبك جاهزاً عند وصولك للفرع') + '\n')
      : '';
    const msg =
      (typeof brandize === 'function' ? brandize(TT.waGreeting || '') : '') + '\n' +
      '🧾 ' + (TT.waOrderTitle || 'الطلب') + ' | *' + invoiceID + '*\n' +
      '📅 ' + dateStr + ' • ⏰ ' + timeStr + '\n' +
      '📦 ' + (typeof tt === 'function' ? tt('waOrderType','نوع الطلب','Order type') : 'نوع الطلب') + ': *' + typeLine + '*\n' +
      (cname ? ('👤 ' + (typeof tt === 'function' ? tt('waCustomerName','الاسم','Name') : 'الاسم') + ': ' + cname + '\n') : '') +
      (cphone ? ('📱 ' + (typeof tt === 'function' ? tt('waCustomerPhone','الجوال','Phone') : 'الجوال') + ': ' + cphone + '\n') : '') +
      pickupNote +
      '🍝 ' + (typeof tt === 'function' ? tt('waBranch','الفرع','Branch') : 'الفرع') + ': ' + (typeof branchName === 'function' ? branchName(br) : br.nameAr) + '\n' +
      '━━━━━━━━━━━━\n' +
      lines.join('\n') + '\n' +
      '━━━━━━━━━━━━\n' +
      feeLine +
      '*' + (TT.total || 'المجموع') + ': ' + grand + ' ' + (TT.currency || 'ر.س') + '* ' + (TT.taxInc || '') + '\n' +
      (notes ? ('📝 ' + (TT.waNote || 'ملاحظات') + ': ' + notes + '\n') : '') +
      '━━━━━━━━━━━━\n' +
      (typeof brandize === 'function' ? brandize(TT.waThanks || '') : '');

    const cloud = await createCloudOrder({
      customer_name: cname,
      customer_phone: cphone,
      branch_id: br.id,
      items: cloudItems,
      subtotal: total,
      delivery_fee: fee,
      delivery_fee_mode: typeof deliveryFeeMode === 'function' ? deliveryFeeMode() : 'free',
      customer_lat: loc ? loc.lat : null,
      customer_lng: loc ? loc.lng : null,
      customer_address: isPickup ? '' : addrText,
      notes: notes,
      order_type: orderType
    });

    cart.clear();
    if(el('cnotes')) el('cnotes').value = '';
    if(typeof updateCart === 'function') updateCart();
    if(typeof closeCart === 'function') closeCart();

    if(cloud){
      showOrderSuccess(cloud, msg, br, orderType);
    } else {
      const waUrl = 'https://wa.me/' + br.wa + '?text=' + encodeURIComponent(msg);
      const w = window.open(waUrl, '_blank');
      if(!w){ location.href = waUrl; }
      if(typeof toast === 'function') toast(TT.orderSent || 'تم إرسال الطلب');
    }
  } catch(e){
    console.error('checkout error:', e);
    if(typeof toast === 'function') toast('⚠️ حدث خطأ — حاول مرة أخرى');
  }
}
/* ===== END cloud.js (v17.2) ===== */
