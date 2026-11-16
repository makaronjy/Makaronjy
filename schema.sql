-- ═══════════════════════════════════════════
--  مكرونجي — نظام الطلبات السحابي
--  قاعدة البيانات (Cloudflare D1)
--  الإصدار: 2.2
--  v2.2: • إضافة جدول app_data (المنيو + الإعدادات) — كان مفقوداً كلياً
--          بدونه أي تثبيت جديد ينهار: المنيو فارغ والطلبات تُرفض
--        • إصلاح بذرة المالك: الهاش القديم SHA-256 لا يعمل مع PBKDF2
--          والملح الثابت مكشوف في المستودع → استُبدل بقفل صريح
--        • ملء عمود wa للفروع (كان فارغاً)
--        • فهارس مركّبة لتسريع التقارير بعد إصلاح المنطقة الزمنية
--        • قسم ترحيل اختياري لتصحيح معرّف فرع الروابي في D1 القائمة
--  v2.1: عمود lang في orders (لغة العميل عند الطلب)
--        ← مرجع ثابت لترجمة الرسائل طوال دورة الطلب
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
--  1) جدول الفروع
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  num INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  addr_ar TEXT,
  addr_en TEXT,
  phone TEXT,
  wa TEXT,
  lat REAL,
  lng REAL,
  map_url TEXT,
  delivery_fee REAL DEFAULT 10,
  hours_json TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────
--  2) جدول المستخدمين (مالك + مشرفون + سائقون)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'supervisor', 'driver')),
  is_active INTEGER DEFAULT 1,
  must_change_password INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- ───────────────────────────────────────────
--  3) جدول الطلبات
--  v2.1: lang = لغة العميل لحظة إنشاء الطلب ('ar' أو 'en')
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK(order_type IN ('delivery', 'pickup')),
  lang TEXT NOT NULL DEFAULT 'ar'
    CHECK(lang IN ('ar', 'en')),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  customer_lat REAL,
  customer_lng REAL,
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL,
  delivery_fee REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT DEFAULT 'cod'
    CHECK(payment_method IN ('cod', 'card')),
  payment_status TEXT DEFAULT 'pending'
    CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending',
    'accepted',
    'preparing',
    'ready',
    'driver_assigned',
    'driver_at_restaurant',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'archived'
  )),
  driver_id INTEGER,
  driver_lat REAL,
  driver_lng REAL,
  delivery_photo TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- ───────────────────────────────────────────
--  4) جدول تتبع الطلب (سجل كل تغيير حالة)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  driver_lat REAL,
  driver_lng REAL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ───────────────────────────────────────────
--  5) جدول مواقع السائقين
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  driver_id INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- ───────────────────────────────────────────
--  6) جدول الأرقام المستخدمة (منع التكرار)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS used_order_numbers (
  order_number TEXT PRIMARY KEY,
  created_at DATE DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  order_id INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ───────────────────────────────────────────
--  7) جدول جلسات الدخول
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ───────────────────────────────────────────
--  8) الدفتر المحاسبي الدائم
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  branch_id TEXT,
  order_type TEXT NOT NULL DEFAULT 'delivery',
  kind TEXT NOT NULL
    CHECK(kind IN ('delivered', 'cancelled', 'abandoned')),
  gross REAL NOT NULL DEFAULT 0,
  fees REAL NOT NULL DEFAULT 0,
  driver_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_unique
  ON order_ledger(order_number, kind);

-- ───────────────────────────────────────────
--  9) v2.2: بيانات التطبيق (المنيو + الإعدادات)
--  ⚠️ هذا الجدول كان مفقوداً — الووركر يقرأ منه في:
--     /api/data/menu   /api/data/settings
--     handleCreateOrder (التحقق من الأسعار والتوفر)
--     scanItemOrphans  buildAndStoreBackup
--  صف واحد فقط (id=1) — القيد CHECK يمنع تعدد الصفوف
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_data (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  menu_json TEXT NOT NULL DEFAULT '[]',
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════
--  فهرسة للسرعة
-- ═══════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_lang ON orders(lang);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_order ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_locations_created ON driver_locations(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_used_numbers_expires ON used_order_numbers(expires_at);
CREATE INDEX IF NOT EXISTS idx_ledger_closed ON order_ledger(closed_at);
CREATE INDEX IF NOT EXISTS idx_ledger_branch ON order_ledger(branch_id);
CREATE INDEX IF NOT EXISTS idx_ledger_kind ON order_ledger(kind);
CREATE INDEX IF NOT EXISTS idx_ledger_driver ON order_ledger(driver_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON order_ledger(order_type);

-- ───────────────────────────────────────────
--  v2.2: فهارس مركّبة لتسريع الاستعلامات الفعلية
--  (كل استعلامات التقارير تصفّي بـ status ثم تجمع بتاريخ)
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status_delivered
  ON orders(status, delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created
  ON orders(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status_delivered
  ON orders(driver_id, status, delivered_at);
CREATE INDEX IF NOT EXISTS idx_ledger_closed_kind
  ON order_ledger(closed_at, kind);
CREATE INDEX IF NOT EXISTS idx_ledger_branch_closed
  ON order_ledger(branch_id, closed_at);

-- ═══════════════════════════════════════════
--  بيانات أولية: الفروع الخمسة
--  v2.2: أُضيف عمود wa (كان فارغاً) — نفس أرقام الهاتف
--  المعرّفات مطابقة تماماً لـ settings.js
-- ═══════════════════════════════════════════
INSERT OR IGNORE INTO branches
  (id, num, name_ar, name_en, addr_ar, addr_en, phone, wa, lat, lng, map_url, delivery_fee)
VALUES
  ('b-badiah', 1, 'فرع البديعة', 'Al Badi''ah Branch',
   'الشيخ عبدالعزيز بن محمد، ظهرة البديعة، الرياض 11461',
   'Al Cheikh Abd Al Aziz, Dhahrat Al Badi''ah, Riyadh 11461',
   '966561296463', '966561296463', 24.591045, 46.647204,
   'https://maps.app.goo.gl/qwS3kpF2JUeHBCrH6', 10),
  ('b-malqa', 2, 'فرع الملقا', 'Al Malqa Branch',
   'الأماسي، الملقا، الرياض 13525',
   'Al Amasi, Al Malqa, Riyadh 13525',
   '966568183145', '966568183145', 24.801454, 46.597488,
   'https://maps.app.goo.gl/VjqWsGHn3xZgWoGu9', 10),
  ('b-yasmeen', 3, 'فرع الياسمين', 'Al Yasmeen Branch',
   'القادسية، الياسمين، الرياض 13322',
   'Al Qadisiyah, Al Yasmeen, Riyadh 13322',
   '966561203593', '966561203593', 24.817399, 46.656308,
   'https://maps.app.goo.gl/59Rpm3zbqfFzstev8', 10),
  ('b-suwaidi', 4, 'فرع السويدي الغربي', 'Al Suwaidi Al Gharabi Branch',
   'الفجر، السويدي الغربي، الرياض 12992',
   'Al Fajar St, As Suwaidi Al Gharabi, Riyadh 12992',
   '966544030086', '966544030086', 24.572362, 46.621672,
   'https://maps.app.goo.gl/tCieuNxohr4kyVrK7', 10),
  ('b-rawabi', 5, 'فرع الروابي', 'Al-Rawabi Branch',
   'الزبير بن العوام , الروابي , الرياض 11461',
   'Al-Zubayr bin Al-Awwam, Al-Rawabi, Riyadh 11461',
   '966567326558', '966567326558', 24.694382, 46.790105,
   'https://maps.app.goo.gl/AxGgzM4JUFSfciyu7', 10);

-- ═══════════════════════════════════════════
--  v2.2: الصف الابتدائي لبيانات التطبيق
--  منيو وإعدادات فارغة — يملؤها المالك من اللوحة عبر
--  «حفظ ونشر المنيو» و«حفظ ونشر الإعدادات»
--  ⚠️ حتى ينشر المالك، الطلبات تُرفض بـ «المنيو غير متاح حالياً»
--     وهذا سلوك صحيح ومقصود (لاطلبات على منيو فارغ)
-- ═══════════════════════════════════════════
INSERT OR IGNORE INTO app_data (id, menu_json, settings_json)
VALUES (1, '[]', '{}');

-- ═══════════════════════════════════════════
--  v2.2: حساب المالك — مقفول عمداً
--
--  ❌ البذرة القديمة كانت خاطئة من ثلاث جهات:
--     1) الهاش 8d969eef... هو SHA-256 لـ "123456"
--        بينما التحقق يستخدم PBKDF2-SHA256 بـ 100000 دورة
--        → الحساب لا يستطيع تسجيل الدخول أبداً
--     2) الملح 'salt_example_12345' ثابت ومكشوف في مستودع عام
--     3) التعليق قال admin123 والهاش لـ 123456 — تناقض
--
--  ✅ الآن: صف موجود لكن بقفل صريح لا يطابق أي كلمة مرور.
--     لتفعيله: اضبط RECOVERY_KEY في Worker Secrets ثم افتح
--     /api/recover-owner?key=<سرك>&new=<كلمة قوية>
--     فتُستبدل القيم بـ PBKDF2 حقيقي + ملح عشوائي.
--
--  🔒 لا تضع أبداً هاش كلمة مرور حقيقية في هذا الملف.
-- ═══════════════════════════════════════════
INSERT OR IGNORE INTO users
  (name, phone, username, password_hash, password_salt, role, is_active, must_change_password)
VALUES (
  'مالك النظام',
  '966500000000',
  'owner',
  'LOCKED_NO_LOGIN__SET_VIA_RECOVERY_ENDPOINT',
  'LOCKED_NO_SALT__SET_VIA_RECOVERY_ENDPOINT',
  'super_admin',
  1,
  1
);

-- ═══════════════════════════════════════════
--  قسم ترحيل اختياري — لقاعدة بيانات قائمة
--  ⚠️ لا تُنفّذ هذا القسم على تثبيت جديد (لا حاجة له)
--  ⚠️ نفّذه فقط إن كانت D1 عندك تحتوي معرّف الروابي القديم
--
--  الخطوات:
--  1) شغّل استعلام الفحص أولاً (السطر التالي بعد إلغاء التعليق)
--  2) إن أرجع صفوفاً → ألغِ تعليقstatements الترحيل بالترتيب
--  3) أعد الفحص — يجب أن يرجع صفر صفوف
-- ═══════════════════════════════════════════

-- استعلام الفحص (اقرأ فقط — آمن):
-- SELECT 'orders' AS tbl, COUNT(*) AS n FROM orders WHERE branch_id = 'b-1791819751585'
-- UNION ALL SELECT 'users', COUNT(*) FROM users WHERE branch_id = 'b-1791819751585'
-- UNION ALL SELECT 'ledger', COUNT(*) FROM order_ledger WHERE branch_id = 'b-1791819751585'
-- UNION ALL SELECT 'branches', COUNT(*) FROM branches WHERE id = 'b-1791819751585';

-- الترحيل (بالترتيب — الفرع الجديد b-rawabi موجود من البذرة أعلاه):
-- UPDATE orders       SET branch_id = 'b-rawabi' WHERE branch_id = 'b-1791819751585';
-- UPDATE users        SET branch_id = 'b-rawabi' WHERE branch_id = 'b-1791819751585';
-- UPDATE order_ledger SET branch_id = 'b-rawabi' WHERE branch_id = 'b-1791819751585';
-- DELETE FROM branches WHERE id = 'b-1791819751585';

-- ═══════════════════════════════════════════
--  استعلامات تحقق بعد التثبيت (اقرأ فقط — آمنة)
-- ═══════════════════════════════════════════
-- SELECT COUNT(*) AS branches_count FROM branches;          -- المتوقع: 5
-- SELECT COUNT(*) AS app_data_rows  FROM app_data;          -- المتوقع: 1
-- SELECT id, length(menu_json) AS menu_len,
--        length(settings_json) AS settings_len FROM app_data;
-- SELECT username, role, is_active,
--        CASE WHEN password_hash LIKE 'LOCKED%'
--             THEN 'مقفول — استخدم /api/recover-owner'
--             ELSE 'مفعّل' END AS status
-- FROM users WHERE role = 'super_admin';
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
--   المتوقع: app_data, branches, driver_locations, order_ledger,
--            order_tracking, orders, sessions, used_order_numbers, users

-- ═══════════════════════════════════════════
--  ملاحظات تشغيلية
--  • التخزين UTC دائماً — التحويل للرياض (+3) يحدث في الووركر
--    عند التجميع فقط (v2.9). لا تخزّن توقيتاً محلياً هنا.
--  • hours_json يبقى NULL: ساعات العمل تُقرأ من settings_json
--    في app_data (مصدر واحد للحقيقة).
--  • used_order_numbers.order_id لا يُملأ حالياً — عمود محفوظ
--    للتوافق، لا يؤثر على منع التكرار.
--  • الجلسات (sessions) تُكتب ولا تُقرأ للتحقق حالياً؛
--    التحقق يتم بـ JWT فقط. إبطال الجلسات تحسين مستقبلي.
-- ═══════════════════════════════════════════

-- ═══════════════════════════════════════════
--  نهاية schema.sql (v2.2)
-- ═══════════════════════════════════════════
