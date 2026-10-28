/* ═══════════════════════════════════════════
   مكرونجي — Service Worker (v16)
   نظام كاش ذكي + تحديث حي + دعم الصفحات الجديدة
   ═══════════════════════════════════════════ */

const CACHE = 'mk-v16';

/* ═══ الملفات الأساسية التي تُخزن فور التثبيت ═══ */
const CORE = [
  /* الصفحات */
  'index.html',
  'login.html',          /* v16: صفحة دخول الموظفين */
  'supervisor.html',     /* v16: لوحة المشرف */
  'driver.html',         /* v16: تطبيق السائق */
  'track.html',          /* v16: صفحة تتبع العميل */
  'admin.html',

  /* السكربتات */
  'app.js',
  'cloud.js',            /* v16: الطبقة السحابية */
  'menu.js',
  'settings.js',
  'i18n.js',
  'style.css',

  /* السكربتات الخارجية */
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&family=Aref+Ruqaa:wght@700&display=swap',

  /* الصور الأساسية */
  'img/logo.png',
  'img/bg.png',
  'img/welcome.png',
  'img/closed.png',
  'img/icon-192.png',
];

/* ═══════════════════════════════════════════
   التثبيت: تخزين مسبق آمن (ملف ملف)
   ═══════════════════════════════════════════ */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(CORE.map(u => c.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

/* ═══════════════════════════════════════════
   التنشيط: حذف الكاشات القديمة
   ═══════════════════════════════════════════ */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ═══════════════════════════════════════════
   اعتراض الطلبات
   ═══════════════════════════════════════════ */
self.addEventListener('fetch', e => {
  const req = e.request;

  /* نتجاهل POST و PUT و DELETE (API calls) */
  if (req.method !== 'GET') return;

  /* نتجاهل الطلبات من أصل مختلف */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    /* نسمح بطلبات الخطوط والخرائط الخارجية بالكاش */
    if (url.hostname === 'unpkg.com' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'tile.openstreetmap.org') {
      e.respondWith(
        caches.match(req).then(hit => {
          if (hit) return hit;
          return fetch(req).then(res => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
          }).catch(() => caches.match(req));
        })
      );
    }
    return;
  }

  /* ─── 1) طلبات التحديث الحي: شبكة فقط دائماً (لا كاش أبداً) ─── */
  if (url.search.includes('live=') || req.cache === 'no-store') {
    e.respondWith(
      fetch(req).catch(() => caches.match('index.html'))
    );
    return;
  }

  /* ─── 2) صفحات السحابة (track.html): شبكة أولاً دائماً ─── */
  /*    لأنها تعرض بيانات حية من الـ Worker                   */
  if (url.pathname === '/track.html') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('track.html', copy));
        return res;
      }).catch(() => caches.match('track.html') || caches.match('index.html'))
    );
    return;
  }

  /* ─── 3) صفحات الموظفين (login/supervisor/driver): شبكة أولاً ─── */
  if (url.pathname === '/login.html' ||
      url.pathname === '/supervisor.html' ||
      url.pathname === '/driver.html') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  /* ─── 4) تنقل الصفحات: شبكة أولاً ثم الكاش (يعمل بدون إنترنت) ─── */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return res;
      }).catch(() => caches.match('index.html'))
    );
    return;
  }

  /* ─── 5) ملفات الكود والبيانات (js/css/json): شبكة أولاً ─── */
  if (/\.(js|css|json)(\?|$)/i.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  /* ─── 6) الصور والخطوط: كاش أولاً ثم شبكة (يحترم ?v= تلقائياً) ─── */
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      });
    })
  );
});

/* ═══════════════════════════════════════════
   رسالة من التطبيق: تنظيف الكاش عند تغيير imagesVersion
   ═══════════════════════════════════════════ */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CLEAR_IMG_CACHE') {
    caches.open(CACHE).then(c => {
      c.keys().then(keys => {
        keys.forEach(k => {
          if (k.url.includes('img/items/') || k.url.includes('img/banners/')) {
            c.delete(k);
          }
        });
      });
    });
  }
});

/* ═══════════════════════════════════════════
   END sw.js (v16)
   ═══════════════════════════════════════════ */
