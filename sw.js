/* ═══════════════════════════════════════════
   مكرونجي — Service Worker (v18)
   v17: • إصلاح حرج: كل صفحة تُخزَّن باسمها لا باسم index.html
          (كانت زيارة admin.html تستبدل كاش تطبيق الزبون)
        • إصلاح سلسلة الاحتياط: caches.match() تُرجع Promise
          فالسطر (a || b) كان لا يعمل أبداً — الآن then() صحيح
        • لا نُخزِّن استجابة فاشلة (كانت 404/500 تُخزَّن فوق الصفحة السليمة)
        • طلبات no-store لا ترجع HTML عند الفشل (كان يُفسد JSON)
        • إضافة i18n-staff.js و manifest.json للتخزين المسبق
        • تمييز ملفات اللوحة: لا تُخزَّن على جهاز كل زبون
        • SKIP_WAITING لتحديث فوري عند الطلب
   v16: نظام كاش ذكي + تحديث حي + دعم الصفحات الجديدة
   ═══════════════════════════════════════════ */

const CACHE = 'mk-v17';

/* ═══ الملفات الأساسية التي تُخزن فور التثبيت ═══
   ملاحظة v17: هذه تُنزَّل على جهاز كل زبون — لذا لا نضع
   ملفات لوحة المالك فيها. صفحات الموظفين تبقى لأن الزبون
   قد يفتح track.html ويحتاج i18n-staff.js.
═══ */
const CORE = [
  /* الصفحات */
  'index.html',
  'login.html',
  'supervisor.html',
  'driver.html',
  'track.html',

  /* السكربتات */
  'app.js',
  'cloud.js',
  'menu.js',
  'settings.js',
  'i18n.js',
  'i18n-staff.js',        /* v17: كان ناقصاً — track/login/supervisor/driver تحتاجه */
  'style.css',
  'manifest.json',        /* v17: كان ناقصاً */

  /* السكربتات الخارجية */
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&family=Aref+Ruqaa:wght@700&display=swap',

  /* الصور الأساسية (نسخة المستودع — احتياطي عند تعطل الووركر) */
  'img/logo.png',
  'img/bg.png',
  'img/welcome.png',
  'img/closed.png',
  'img/icon-192.png',
];

/* ═══ v17: ملفات لوحة المالك — تُخزَّن عند أول زيارة فقط ═══
   لا تُنزَّل على جهاز الزبون. القاعدة 5 (شبكة أولاً) تخزّنها
   تلقائياً عند فتح admin.html، فتعمل بدون شبكة بعد ذلك.
═══ */
const ADMIN_ASSETS = [
  'admin.html',
  'admin-core.js',
  'admin-tabs.js',
  'admin-i18n.js',
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
   v17: أدوات مساعدة
   ═══════════════════════════════════════════ */

/* مفتاح الكاش الصحيح لكل صفحة — لا نخلط الصفحات أبداً */
function navKey(pathname){
  if (pathname === '/' || pathname === '' || /\/index\.html$/i.test(pathname)) {
    return 'index.html';
  }
  /* نجرّد الشرطة المائلة الأولى ليطابق مفاتيح CORE النسبية */
  return pathname.replace(/^\/+/, '');
}

/* هل الاستجابة صفحة HTML صالحة للتخزين؟ */
function isHtmlResponse(res){
  if (!res || !res.ok) return false;
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  return ct.indexOf('text/html') >= 0;
}

/* تخزين آمن — لا نُخزِّن إلا الناجح */
function putSafe(key, res){
  if (!res || !res.ok) return;
  const copy = res.clone();
  caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
}

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
    /* v17: صور/بيانات الووركر (workers.dev) تمرّ للشبكة مباشرة
       بلا تدخل — الووركر يضبط Cache-Control بنفسه */
    return;
  }

  /* ─── 1) طلبات التحديث الحي: شبكة فقط دائماً (لا كاش أبداً) ─── */
  if (url.search.includes('live=') || req.cache === 'no-store') {
    /* v17: لا نُرجع index.html عند الفشل — كان يُفسد r.json()
       لدى المتصل. نترك الخطأ يصل للمتصل ليتعامل معه. */
    e.respondWith(fetch(req));
    return;
  }

  /* ─── 2) صفحات السحابة (track.html): شبكة أولاً دائماً ─── */
  /*    لأنها تعرض بيانات حية من الـ Worker                   */
  if (url.pathname === '/track.html') {
    e.respondWith(
      fetch(req).then(res => {
        /* v17: لا نخزّن استجابة فاشلة */
        if (isHtmlResponse(res)) putSafe('track.html', res);
        return res;
      }).catch(() =>
        /* v17: سلسلة احتياط صحيحة — Promise لا قيمة فورية */
        caches.match('track.html').then(hit => hit || caches.match('index.html'))
      )
    );
    return;
  }

  /* ─── 3) صفحات الموظفين (login/supervisor/driver): شبكة أولاً ─── */
  if (url.pathname === '/login.html' ||
      url.pathname === '/supervisor.html' ||
      url.pathname === '/driver.html') {
    e.respondWith(
      fetch(req).then(res => {
        if (isHtmlResponse(res)) putSafe(req, res);
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  /* ─── 3.5) v17: لوحة المالك — شبكة أولاً + تخزين عند الزيارة ─── */
  if (url.pathname === '/admin.html') {
    e.respondWith(
      fetch(req).then(res => {
        if (isHtmlResponse(res)) putSafe('admin.html', res);
        return res;
      }).catch(() => caches.match('admin.html'))
    );
    return;
  }

  /* ─── 4) تنقل الصفحات: شبكة أولاً ثم الكاش (يعمل بدون إنترنت) ─── */
  if (req.mode === 'navigate') {
    /* v17: المفتاح باسم الصفحة الحقيقية — لا index.html للجميع */
    const key = navKey(url.pathname);
    e.respondWith(
      fetch(req).then(res => {
        if (isHtmlResponse(res)) putSafe(key, res);
        return res;
      }).catch(() =>
        caches.match(key).then(hit => {
          if (hit) return hit;
          /* احتياطي أخير: صفحة التطبيق الرئيسية */
          return caches.match('index.html');
        })
      )
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
   رسائل من التطبيق
   ═══════════════════════════════════════════ */
self.addEventListener('message', e => {
  if (!e.data) return;

  /* تنظيف كاش الصور عند تغيير imagesVersion */
  if (e.data.type === 'CLEAR_IMG_CACHE') {
    caches.open(CACHE).then(c => {
      c.keys().then(keys => {
        keys.forEach(k => {
          if (k.url.includes('img/items/') || k.url.includes('img/banners/')) {
            c.delete(k);
          }
        });
      });
    });
    return;
  }

  /* v17: تفعيل فوري لنسخة جديدة عند طلب التطبيق */
  if (e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
});

/* ═══════════════════════════════════════════
   END sw.js (v17)
   ═══════════════════════════════════════════ */
