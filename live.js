/* ===== live.js — تحديث حي من D1 بدون إعادة تحميل (v1.0) =====
   يستبدل مصدر فحص app.js (الملفات الثابتة) بقراءة D1،
   ويعيد استخدام applyLive الأصلية لإعادة الرسم في_place. */
(function(){
  'use strict';
  var API = 'https://makaronjy-api.makaronjy.workers.dev';
  var POLL_MS = 20000; /* كل 20 ثانية — عدّلها إن أردت */
  var lastMenu = null, lastSettings = null;
  var installed = false, busy = false;

  function jget(path){
    var ctrl = new AbortController();
    var to = setTimeout(function(){ ctrl.abort(); }, 9000);
    return fetch(API + path, { cache:'no-store', signal: ctrl.signal })
      .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .finally(function(){ clearTimeout(to); });
  }
  function snap(v){ try{ return JSON.stringify(v); }catch(e){ return ''; } }

  function check(){
    if(busy || !installed) return;
    if(document.hidden || !navigator.onLine) return;
    busy = true;
    Promise.all([ jget('/api/data/menu'), jget('/api/data/settings') ])
      .then(function(res){
        var menu = res[0].menu, settings = res[1].settings;
        if(!Array.isArray(menu) || !settings || typeof settings !== 'object') return;
        var ms = snap(menu), ss = snap(settings);
        if(lastMenu === null){ lastMenu = ms; lastSettings = ss; return; }
        var menuChanged = (ms !== lastMenu);
        var setChanged  = (ss !== lastSettings);
        if(!menuChanged && !setChanged) return;

        var prevSettings = window.APP_SETTINGS;
        window.MENU = menu;
        window.APP_SETTINGS = settings;

        /* تغيير صور فقط؟ (نفس منطق app.js الأصلي) */
        var imgsOnly = false;
        if(!menuChanged && setChanged && prevSettings){
          try{
            var a = JSON.parse(JSON.stringify(prevSettings)); delete a.imagesVersion;
            var b = JSON.parse(JSON.stringify(settings));      delete b.imagesVersion;
            imgsOnly = (JSON.stringify(a) === JSON.stringify(b));
          }catch(e){}
        }
        lastMenu = ms; lastSettings = ss;

        /* إعادة الرسم بمحرك التطبيق نفسه — بدون reload وبدون فقدان السلة */
        if(typeof window.applyLive === 'function'){
          window.applyLive(imgsOnly);
        }else if(typeof window.applyLang === 'function'){
          window.applyLang(document.documentElement.lang || 'ar');
        }
        /* تحديث قائمة الفروع إن كانت مفتوحة */
        try{
          var otp = document.getElementById('orderTypePage');
          if(otp && otp.getAttribute('aria-hidden') === 'false' && typeof window.renderOtpList === 'function'){
            window.renderOtpList();
          }
        }catch(e){}
      })
      .catch(function(){})
      .then(function(){ busy = false; });
  }

  function install(){
    if(installed) return;
    installed = true;
    lastMenu = snap(window.MENU);
    lastSettings = snap(window.APP_SETTINGS);
    window.liveCheck = check;           /* نستبدل فاحص الملفات الثابتة */
    setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) check(); });
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    check();
  }

  /* ننتظر إقلاع app.js (وظائفه العامة تصبح على window) */
  var tries = 0;
  var wait = setInterval(function(){
    tries++;
    if(typeof window.applyLive === 'function' || typeof window.buildMenu === 'function'){
      clearInterval(wait); install();
    }else if(tries > 60){ clearInterval(wait); }
  }, 400);
})();
