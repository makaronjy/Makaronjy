-- ═══════════════════════════════════════════
--  مكرونجي - نظام تتبع الطلبات الحي
--  قاعدة البيانات (Cloudflare D1)
--  الإصدار: 1.0
-- ═══════════════════════════════════════════

-- ───────────────────────────────────────────
--  جدول الفروع (5 فروع)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  num INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  addr_ar TEXT,
  addr_en TEXT,
  phone TEXT,
  lat REAL,
  lng REAL,
  map_url TEXT,
  delivery_fee REAL DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ───────────────────────────────────────────
--  جدول المستخدمين (مالك + مشرفون + سائقون)
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
--  جدول الطلبات (مع رقم 12345A#)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,  -- مثال: 12345A#
  branch_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  customer_lat REAL,
  customer_lng REAL,
  items_json TEXT NOT NULL,  -- JSON array of items
  subtotal REAL NOT NULL,
  delivery_fee REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT DEFAULT 'cod' CHECK(payment_method IN ('cod', 'card')),
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'pending' CHECK(status IN (
    'pending',              -- 1. بانتظار القبول
    'accepted',             -- 2. تم القبول
    'preparing',            -- 3. قيد التحضير
    'ready',                -- 4. جاهز للتسليم
    'driver_assigned',      -- 5. تم تعيين سائق
    'driver_at_restaurant', -- 6. السائق في المطعم
    'out_for_delivery',     -- 7. في الطريق
    'delivered',            -- 8. تم التسليم
    'cancelled',            -- 9. ملغي
    'archived'              -- 10. مؤرشف
  )),
  driver_id INTEGER,
  driver_lat REAL,
  driver_lng REAL,
  delivery_photo TEXT,  -- URL في R2
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  delivered_at DATETIME,
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (driver_id) REFERENCES users(id)
);

-- ───────────────────────────────────────────
--  جدول تتبع الطلب (سجل كل تغيير حالة)
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
--  جدول مواقع السائقين (ملخص - ليس كل ثانية)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
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
--  جدول عدادات أرقام الطلبات (26 حرف A-Z)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_counters (
  letter CHAR(1) PRIMARY KEY,
  current_num INTEGER DEFAULT 0,
  last_reset DATE
);

-- تهيئة العدادات الـ 26
INSERT OR IGNORE INTO order_counters (letter, current_num) VALUES
  ('A', 0), ('B', 0), ('C', 0), ('D', 0), ('E', 0),
  ('F', 0), ('G', 0), ('H', 0), ('I', 0), ('J', 0),
  ('K', 0), ('L', 0), ('M', 0), ('N', 0), ('O', 0),
  ('P', 0), ('Q', 0), ('R', 0), ('S', 0), ('T', 0),
  ('U', 0), ('V', 0), ('W', 0), ('X', 0), ('Y', 0),
  ('Z', 0);

-- ───────────────────────────────────────────
--  جدول الأرقام المستخدمة (لمنع التكرار)
-- ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS used_order_numbers (
  order_number TEXT PRIMARY KEY,
  created_at DATE DEFAULT CURRENT_DATE,
  expires_at DATE NOT NULL,
  order_id INTEGER,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ───────────────────────────────────────────
--  جدول جلسات الدخول
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
--  فهرسة للسرعة
-- ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_order ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_order ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_locations_created ON driver_locations(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_used_numbers_expires ON used_order_numbers(expires_at);

-- ───────────────────────────────────────────
--  بيانات أولية: الفروع الخمسة
-- ───────────────────────────────────────────
INSERT OR IGNORE INTO branches (id, num, name_ar, name_en, addr_ar, addr_en, phone, lat, lng, map_url, delivery_fee) VALUES
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

-- ───────────────────────────────────────────
--  بيانات أولية: حساب المالك (Super Admin)
--  كلمة المرور: admin123 (يجب تغييرها عند أول دخول)
--  Hash: PBKDF2-SHA256 مع salt عشوائي
-- ───────────────────────────────────────────
INSERT OR IGNORE INTO users (name, phone, username, password_hash, password_salt, role, must_change_password)
VALUES (
  'مالك النظام',
  '966500000000',
  'owner',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',  -- hash لـ admin123
  'salt_example_12345',
  'super_admin',
  1
);

-- ═══════════════════════════════════════════
--  نهاية schema.sql
-- ═══════════════════════════════════════════
