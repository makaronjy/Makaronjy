-- ═══════════════════════════════════════════
--  مكرونجي — نظام طلبات المطعم السحابي
--  قاعدة البيانات (Cloudflare D1)
--  الإصدار: 2.0
--  تاريخ التحديث: نوفمبر 2026
--  متوافق مع: Worker v1.6 + جميع واجهات v17.7
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
--  1) جدول الفروع (مطاعم/منافذ بيع)
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
--  v1.6: إضافة order_type لتفريق الاستلام عن التوصيل
--  أرقام عشوائية بصيغة 58392K (5 أرقام + حرف)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  branch_id TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK(order_type IN ('delivery', 'pickup')),
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
--  5) جدول مواقع السائقين (محدّث كل 30 ثانية)
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
--  6) جدول الأرقام المستخدمة (لمنع التكرار)
--     الحجز لمدة سنة كاملة قبل إعادة الاستخدام
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS used_order_numbers (
  order_number TEXT PRIMARY KEY,
  created_at DATE DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  order_id INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ───────────────────────────────────────────
--  7) جدول جلسات الدخول (JWT + session tokens)
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

-- ═══════════════════════════════════════════
--  8) الدفتر المحاسبي الدائم (جديد في v1.6)
--  ─────────────────────────────────────────
--  يحفظ أثراً محاسبياً دائماً لكل طلب حتى
--  بعد حذفه من جدول orders.
--
--  kind:
--    'delivered'  → طلب مسلّم (إيراد فعلي)
--    'cancelled'  → طلب ملغى (لا إيرادات)
--    'abandoned'  → طلب مهجور (حذف تلقائي بعد ساعة)
--
--  يُستعمل في:
--    • التقارير المحاسبية (accounting)
--    • إحصائيات الإلغاء
--    • تحليل الأداء السنوي
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL,
  branch_id TEXT,
  order_type TEXT NOT NULL DEFAULT 'delivery'
    CHECK(order_type IN ('delivery', 'pickup')),
  kind TEXT NOT NULL
    CHECK(kind IN ('delivered', 'cancelled', 'abandoned')),
  gross REAL NOT NULL DEFAULT 0,
  fees REAL NOT NULL DEFAULT 0,
  driver_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- فهرس فريد يمنع تسجيل نفس الطلب بنفس الحالة مرتين
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_unique
  ON order_ledger(order_number, kind);

-- ───────────────────────────────────────────
--  فهرسة للسرعة
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_branch
  ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver
  ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_number
  ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created
  ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_delivered
  ON orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_orders_type
  ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_tracking_order
  ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_order
  ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_driver
  ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_locations_created
  ON driver_locations(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_branch
  ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);
CREATE INDEX IF NOT EXISTS idx_used_numbers_expires
  ON used_order_numbers(expires_at);

-- فهارس الدفتر المحاسبي
CREATE INDEX IF NOT EXISTS idx_ledger_closed
  ON order_ledger(closed_at);
CREATE INDEX IF NOT EXISTS idx_ledger_branch
  ON order_ledger(branch_id);
CREATE INDEX IF NOT EXISTS idx_ledger_kind
  ON order_ledger(kind);
CREATE INDEX IF NOT EXISTS idx_ledger_driver
  ON order_ledger(driver_id);
CREATE INDEX IF NOT EXISTS idx_ledger_type
  ON order_ledger(order_type);

-- ═══════════════════════════════════════════
--  بيانات أولية: الفروع الخمسة
-- ═══════════════════════════════════════════
INSERT OR IGNORE INTO branches
  (id, num, name_ar, name_en, addr_ar, addr_en, phone, lat, lng, map_url, delivery_fee)
VALUES
  ('b-badiah', 1, 'فرع البديعة', 'Al Badi''ah Branch',
   'الشيخ عبدالعزيز بن محمد، ظهرة البديعة، الرياض 11461',
   'Al Cheikh Abd Al Aziz, Dhahrat Al Badi''ah, Riyadh 11461',
   '966561296463', 24.591045, 46.647204,
   'https://maps.app.goo.gl/qwS3kpF2JUeHBCrH6', 10),

  ('b-malqa', 2, 'فرع الملقا', 'Al Malqa Branch',
   'الأماسي، الملقا، الرياض 13525',
   'Al Amasi, Al Malqa, Riyadh 13525',
   '966568183145', 24.801454, 46.597488,
   'https://maps.app.goo.gl/VjqWsGHn3xZgWoGu9', 10),

  ('b-yasmeen', 3, 'فرع الياسمين', 'Al Yasmeen Branch',
   'القادسية، الياسمين، الرياض 13322',
   'Al Qadisiyah, Al Yasmeen, Riyadh 13322',
   '966561203593', 24.817399, 46.656308,
   'https://maps.app.goo.gl/59Rpm3zbqfFzstev8', 10),

  ('b-suwaidi', 4, 'فرع السويدي الغربي', 'Al Suwaidi Al Gharabi Branch',
   'الفجر، السويدي الغربي، الرياض 12992',
   'Al Fajar St, As Suwaidi Al Gharabi, Riyadh 12992',
   '966544030086', 24.572362, 46.621672,
   'https://maps.app.goo.gl/tCieuNxohr4kyVrK7', 10),

  ('b-rawabi', 5, 'فرع الروابي', 'Al-Rawabi Branch',
   'الزبير بن العوام , الروابي , الرياض 11461',
   'Al-Zubayr bin Al-Awwam, Al-Rawabi, Riyadh 11461',
   '966567326558', 24.694382, 46.790105,
   'https://maps.app.goo.gl/AxGgzM4JUFSfciyu7', 10);

-- ═══════════════════════════════════════════
--  بيانات أولية: حساب المالك (Super Admin)
--  اسم المستخدم: owner
--  كلمة المرور الافتراضية: admin123
--  ⚠️ يجب تغييرها عند أول دخول
-- ═══════════════════════════════════════════
INSERT OR IGNORE INTO users
  (name, phone, username, password_hash, password_salt, role, must_change_password)
VALUES (
  'مالك النظام',
  '966500000000',
  'owner',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
  'salt_example_12345',
  'super_admin',
  1
);

-- ═══════════════════════════════════════════
--  نهاية schema.sql (v2.0)
-- ═══════════════════════════════════════════
