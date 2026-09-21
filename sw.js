/* =====================================================
   Service Worker — مكرونجي (sw.js)
   الإصدار v7 — بعد تقسيم index.html إلى style.css و app.js
===================================================== */

const CACHE = 'makaronjy-v9';

/* ===== الملفات الأساسية للتخزين المسبق ===== */
const CORE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'i18n.js',
  'menu.js',
  'settings.js',
  'manifest.json',
  'img/logo.png',
  'img/bg.png',
  'img/welcome.png',
  'img/closed.png',
  'img/icon-192.png'
];

/* ===== التثبيت: تخزين مسبق آمن (ملف ملف) ===== */
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>
      Promise.all(CORE.map(u=> c.add(u).catch(()=>{})))
    )
  );
  self.skipWaiting();
});

/* ===== التفعيل: حذف كل الكاشات القديمة ===== */
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=> k !== CACHE).map(k=> caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

/* ===== اعتراض الطلبات ===== */
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  /* 1) طلبات التحديث الحي: شبكة فقط دائماً (لا كاش أبداً) */
  if(url.search.includes('live=') || req.cache === 'no-store'){
    e.respondWith(
      fetch(req).catch(()=> caches.match('index.html'))
    );
    return;
  }

  /* 2) تنقل الصفحات: شبكة أولاً ثم الكاش (يعمل بدون إنترنت) */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=> c.put('index.html', copy));
        return res;
      }).catch(()=> caches.match('index.html'))
    );
    return;
  }

  /* 3) ملفات الكود والبيانات (js/css/json): شبكة أولاً لضمان التحديث */
  if(/\.(js|css|json)(\?|$)/i.test(url.pathname)){
    e.respondWith(
      fetch(req).then(res=>{
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c=> c.put(req, copy));
        }
        return res;
      }).catch(()=> caches.match(req))
    );
    return;
  }

  /* 4) الصور والخطوط: كاش أولاً ثم شبكة (يحترم ?v= تلقائياً) */
  e.respondWith(
    caches.match(req).then(hit=>{
      if(hit) return hit;
      return fetch(req).then(res=>{
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c=> c.put(req, copy));
        }
        return res;
      });
    })
  );
});
