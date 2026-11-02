/* =====================================================
مكرونجي — الطبقة السحابية (cloud.js)
v17.4: رسالة واتساب برقم السحابة (57437A) + نوع مختصر
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

/* ===== موقع التوصيل فقط ===== */
function captureDeliveryLocation(){
  return new Promise(function(resolve){
    let m = 'delivery';
    try{ m = (typeof getOrderMode === 'function') ? getOrderMode() : 'delivery'; }catch(e){}
    if(m !== 'delivery'){ resolve(null); return; }
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

/* ===== عنوان نصي احتياطي ===== */
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
  const isAr = (typeof currentLang !== 'undefined' && currentLang === 'ar');
  const isPickup = orderType === 'pickup';
  const subtitle = isPickup
    ? (isAr ? 'سيكون جاهزاً عند وصولك للفرع 🏪' : 'Will be ready upon arrival 🏪')
    : (isAr ? 'السائق سيأتي إليك قريباً 🛵' : 'Driver will arrive soon 🛵');
  const hint = isPickup
    ? (isAr ? '💵 ادفع نقداً عند الكاشير' : '💵 Pay cash at the cashier')
    : (isAr ? '💵 ادفع نقداً للسائق عند التسليم' : '💵 Pay cash to the driver upon delivery');
  box.innerHTML =
    '<div style="background:#fffdf9;border:2px solid #e0912f;border-radius:22px;padding:1.6rem 1.3rem;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif">' +
      '<div style="font-size:3rem">✅</div>' +
      '<b style="display:block;font-size:1.15rem;color:#8e2a4a;margin:.4rem 0">' + (isAr ? 'تم استلام طلبك بنجاح' : 'Order received successfully') + '</b>' +
      '<div style="display:inline-block;background:#5a1830;color:#f2b95f;border-radius:50px;padding:.3rem 1.2rem;font-weight:900;font-size:1.2rem;direction:ltr;margin:.4rem 0">' + res.order_number + '</div>' +
      '<p style="color:#8a6f63;font-size:.78rem;font-weight:700;margin:.4rem 0">' + (isAr ? 'احتفظ برقم الطلب لمتابعة حالته في أي وقت' : 'Keep this number to track your order') + '</p>' +
      '<div style="background:' + (isPickup ? '#dcf5e8' : '#fff6e6') + ';border-radius:10px;padding:.55rem;margin:.4rem 0;font-size:.82rem;font-weight:900;color:' + (isPickup ? '#1e5b4f' : '#b45309') + '">' + subtitle + '</div>' +
      '<div style="background:#f3e7d7;border-radius:10px;padding:.55rem;margin:.4rem 0 1rem;font-size:.78rem;font-weight:800;color:#8e2a4a">' + hint + '</div>' +
      '<a id="osTrack" href="' + (res.track_url || ('track.html?order=' + encodeURIComponent(res.order_number))) + '" style="display:block;border-radius:12px;padding:.85rem;background:linear-gradient(135deg,#e0912f,#f2b95f);color:#5a1830;font-weight:900;text-decoration:none;margin-bottom:.5rem">' + (isAr ? '🗺️ تتبع طلبك مباشرة' : '🗺️ Track your order') + '</a>' +
      '<button id="osWa" style="display:block;width:100%;border:none;border-radius:12px;padding:.85rem;background:#128c5e;color:#fff;font-weight:900;cursor:pointer;margin-bottom:.5rem">' + (isAr ? '📲 أكد طلبك عبر واتساب' : '📲 Confirm via WhatsApp') + '</button>' +
      '<button id="osClose" style="display:block;width:100%;border:none;border-radius:12px;padding:.7rem;background:transparent;color:#8a6f63;font-weight:800;cursor:pointer">' + (isAr ? 'إغلاق' : 'Close') + '</button>' +
    '</div>';
  box.style.display = 'flex';
  el('osWa').onclick = function(){
    const url = 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(waMsg);
    const w = window.open(url, '_blank');
    if(!w) location.href = url;
  };
  el('osClose').onclick = function(){ box.style.display = 'none'; };
}

/* ===== تعبئة بيانات العميل + نص الزر (مرة واحدة) ===== */
(function patchOnce(){
  if(window._mkCloudPatched) return;
  window._mkCloudPatched = true;
  if(typeof window.openCart === 'function'){
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
  }
  setTimeout(function(){
    try{
      document.querySelectorAll('button').forEach(function(b){
        if(/إتمام الطلب عبر واتساب/.test(b.textContent || '')){
          b.innerHTML = b.innerHTML.replace('إتمام الطلب عبر واتساب', '✅ إتمام الطلب');
        }
      });
    }catch(e){}
  }, 800);
})();

/* =====================================================
   checkout() السحابي v17.4
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

    const m = getOrderMode();
    const isPickup = (m !== 'delivery');

    let loc = null, addrText = '';
    if(!isPickup){
      loc = await captureDeliveryLocation();
      if(!loc){
        const lineEl = el('dAddressLine') || el('dAddress');
        if(lineEl && lineEl.value && lineEl.value.trim()){
          addrText = sanitize(lineEl.value.trim());
        } else {
          addrText = await askAddressText();
        }
      }
    }

    const fee = isPickup ? 0 : deliveryFee();

    const invoiceID = generateInvoiceID(branchCode(br));
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
      const it = findMenuItem(i.id);
      if(!it) return;
      const unit = itemPrice(it, i.sizeIdx);
      total += i.qty * unit;
      const size = i.sizeIdx >= 0 ? ' (' + TT.sizes[i.sizeIdx] + ')' : '';
      cloudItems.push({ id: it.id, name: itemName(it), qty: i.qty, price: unit, size: (i.sizeIdx >= 0 ? TT.sizes[i.sizeIdx] : '') });
      lines.push('▪️ ' + i.qty + ' × ' + itemName(it) + size + ' = ' + (i.qty * unit) + ' ' + TT.currency);
    });

    const notes = sanitize(el('cnotes') ? el('cnotes').value.trim() : '');

    /* v17.4: نوع مختصر + سطر دفع منفصل + مكان محجوز للرقم */
    const typeShort = isPickup
      ? tt('typePickupShort','استلام','Pickup')
      : tt('typeDeliveryShort','توصيل','Delivery');
    const payLine = isPickup
      ? ('💵 ' + tt('payCashier','الدفع: عند الكاشير','Payment: at cashier'))
      : ('💵 ' + tt('payDriver','الدفع: للسائق عند التسليم','Payment: to driver on delivery'));
    const feeLine = isPickup ? '' : ('🛵 ' + tt('deliveryFee','رسوم التوصيل','Delivery fee') + ': ' + feeLabel(fee) + '\n');
    const grand = total + fee;
    const pickupNote = isPickup ? ('⏳ ' + tt('pickupNote','طلبك يكون جاهزاً عند وصولك للفرع','Your order will be ready upon arrival') + '\n') : '';

    /* الرقم يُستبدل لاحقاً: رقم السحابة إن نجح، وإلا رقم الفاتورة */
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

    /* v17.4: الرقم النهائي في الرسالة = رقم السحابة بدون # */
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
/* ===== END cloud.js (v17.4) ===== */
