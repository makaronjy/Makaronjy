// ═══════════════════════════════════════════
//  مكرونجي - Cloudflare Worker API (كامل)
//  الإصدار: 2.9
//  v2.9: • إصلاح المنطقة الزمنية: كل التجميعات بتوقيت الرياض (UTC+3)
//          - «طلبات/مبيعات اليوم» لم تعد تُخطئ بعد منتصف الليل
//          - «أرباح السائق اليوم» صحيحة حتى 3 فجراً
//          - حدود الأشهر في التقرير المحاسبي صحيحة
//          - اسم ملف النسخة الاحتياطية بتاريخ الرياض
//        • التخزين يبقى UTC — التحويل عند القراءة فقط (لا ترحيل بيانات)
//  v2.8: احترام deliveryFeeMode + سقف كمية/عدد + حد معدل + عداد محاولات فاشلة
//  v2.7-P0: التحقق من الأسعار من D1، منع حذف الطلبات النشطة، حماية صور التسليم
// ═══════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const RAW_BASE = 'https://raw.githubusercontent.com/makaronjy/Makaronjy/main/';

/* النقل الذاتي مسموح لصور التطبيق الثابتة فقط */
const APP_IMG_FALLBACK = [
  'img/logo.png', 'img/bg.png', 'img/welcome.png', 'img/closed.png',
  'img/icon-192.png', 'img/icon-512.png', 'img/missing.png',
  'img/d-jahez.png', 'img/d-hungerstation.png', 'img/d-keeta.png'
];
const TRASH_DAYS = 30;

/* ===== v2.9: المنطقة الزمنية للتقارير (Asia/Riyadh) =====
   التخزين UTC دائماً — التحويل عند التجميع/القراءة فقط.
   لتغيير المنطقة مستقبلاً: عدّل هذين الثابتين فقط. */
const TZ_OFFSET = '+3 hours';
const TZ_HOURS = 3;
const TZ_LABEL = 'Asia/Riyadh (UTC+3)';

/* تاريخ محلي YYYY-MM-DD */
function localDateStr(d) {
  const base = (d instanceof Date) ? d.getTime() : Date.now();
  return new Date(base + TZ_HOURS * 3600000).toISOString().slice(0, 10);
}
/* شهر محلي YYYY-MM */
function localYearMonth(d) {
  return localDateStr(d).slice(0, 7);
}

/* ===== v2.8: حدود الطلبات (ضد الإرهاق والتلاعب) ===== */
const MAX_QTY_PER_ITEM = 50;
const MAX_ITEMS_PER_ORDER = 60;
const MAX_ORDER_TOTAL = 100000;

/* ===== v2.8: حدود معدل القراءة العامة ===== */
const TRACK_RATE_PER_MIN = 300;      // يكفي ~40 عميل يتتبعون كل 8 ثوانٍ من نفس الشبكة
const TRACK_MISS_LIMIT = 30;         // محاولات فاشلة per 5 دقائق — يوقف التعداد
const TRACK_MISS_WINDOW = 300;
const DATA_RATE_PER_MIN = 240;       // يكفي ~30 عميل يفحصون كل 8 ثوانٍ من نفس الشبكة

const STATUS_TEXT = {
  pending: 'بانتظار القبول',
  accepted: 'تم قبول الطلب',
  preparing: 'جاري التحضير',
  ready: 'جاهز للتسليم',
  ready_pickup: 'جاهز للاستلام من الفرع',
  driver_assigned: 'تم تعيين السائق',
  driver_at_restaurant: 'السائق في المطعم',
  out_for_delivery: 'في الطريق إليك',
  delivered: 'تم التسليم',
  delivered_pickup: 'تم استلام الطلب من الفرع',
  cancelled: 'تم الإلغاء',
  archived: 'مؤرشف',
};

const STATUS_TRANSITIONS = {
  pending:              ['accepted', 'cancelled'],
  accepted:             ['preparing', 'cancelled'],
  preparing:            ['ready', 'cancelled'],
  ready:                [],
  driver_assigned:      ['out_for_delivery', 'ready'],
  driver_at_restaurant: ['out_for_delivery'],
  out_for_delivery:     ['delivered'],
  delivered:            ['archived'],
  cancelled:            [],
  archived:             [],
};

const STATUS_ROLES = {
  accepted:             ['supervisor', 'super_admin'],
  cancelled:            ['supervisor', 'super_admin'],
  preparing:            ['supervisor', 'super_admin'],
  ready:                ['supervisor', 'super_admin'],
  driver_assigned:      ['supervisor', 'driver', 'super_admin'],
  driver_at_restaurant: ['driver', 'super_admin'],
  out_for_delivery:     ['driver', 'super_admin'],
  delivered:            ['driver', 'super_admin'],
  archived:             ['super_admin'],
};

function allowedNext(order) {
  if (order.status === 'ready') {
    if (order.order_type === 'pickup')   return ['delivered'];
    if (order.order_type === 'delivery') return ['driver_assigned'];
    return [];
  }
  return STATUS_TRANSITIONS[order.status] || [];
}
function allowedRolesFor(order, newStatus) {
  if (newStatus === 'delivered' && order.order_type === 'pickup') {
    return ['supervisor', 'super_admin'];
  }
  if (newStatus === 'ready' && order.status === 'driver_assigned') {
    return ['driver', 'supervisor', 'super_admin'];
  }
  return STATUS_ROLES[newStatus] || [];
}
function statusTextFor(order) {
  if (order.order_type === 'pickup') {
    if (order.status === 'ready') return STATUS_TEXT.ready_pickup;
    if (order.status === 'delivered') return STATUS_TEXT.delivered_pickup;
  }
  return STATUS_TEXT[order.status] || order.status;
}

// ═══════════════════════════════════════════
//  دوال مساعدة
// ═══════════════════════════════════════════
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
function error(message, status = 400, details = null) {
  const body = { error: message };
  if (details) body.details = details;
  return json(body, status);
}
function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').replace(/javascript:/gi, '').replace(/on\w+=/gi, '').trim().slice(0, 1000);
}
function normLang(v) { return (v === 'en') ? 'en' : 'ar'; }
function getIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
async function checkRateLimit(env, key, limit = 100, ttl = 60) {
  try {
    const current = parseInt(await env.KV.get(key) || '0');
    if (current >= limit) return { allowed: false, remaining: 0 };
    await env.KV.put(key, String(current + 1), { expirationTtl: ttl });
    return { allowed: true, remaining: limit - current - 1 };
  } catch (e) { return { allowed: true, remaining: -1 }; }
}
/* سرد R2 مع ترقيم الصفحات */
async function r2ListAll(bucket, prefix) {
  const out = [];
  let cursor;
  for (let i = 0; i < 50; i++) {
    const res = await bucket.list({ prefix, cursor, limit: 1000 });
    (res.objects || []).forEach(o => out.push(o));
    if (!res.truncated || !res.cursor) break;
    cursor = res.cursor;
  }
  return out;
}

// ═══════════════════════════════════════════
//  v2.8: قراءة الإعدادات + حساب رسوم التوصيل
// ═══════════════════════════════════════════
async function readAppSettings(env) {
  try {
    const row = await env.DB.prepare('SELECT settings_json FROM app_data WHERE id = 1').first();
    if (!row || !row.settings_json) return {};
    const s = JSON.parse(row.settings_json);
    return (s && typeof s === 'object') ? s : {};
  } catch (e) {
    console.error('read settings error:', e);
    return {};
  }
}

/* يحترم وضع الرسوم المحدد في لوحة التحكم — لا يثق بأي رقم من العميل */
function computeDeliveryFee(settings, branch, orderType) {
  if (orderType !== 'delivery') return 0;

  const mode = settings.deliveryFeeMode;

  if (mode === 'free') return 0;

  if (mode === 'perBranch') {
    let fromSettings = null;
    if (Array.isArray(settings.branches)) {
      const sb = settings.branches.find(b => b && b.id === branch.id);
      if (sb && typeof sb.deliveryFee === 'number' && isFinite(sb.deliveryFee)) {
        fromSettings = sb.deliveryFee;
      }
    }
    if (fromSettings !== null) return Math.max(0, fromSettings);
    const fromDb = parseFloat(branch.delivery_fee);
    return isFinite(fromDb) ? Math.max(0, fromDb) : 0;
  }

  if (mode === 'fixed') {
    const f = parseFloat(settings.deliveryFee);
    return isFinite(f) ? Math.max(0, f) : 0;
  }

  /* لا وضع محدد في الإعدادات → نستخدم رسوم الفرع من قاعدة البيانات */
  const fallback = parseFloat(branch.delivery_fee);
  return isFinite(fallback) ? Math.max(0, fallback) : 0;
}

/* فحص توفر الصنف للفرع (التوفر الدائم + النفد اليومي) */
function itemAllowedForBranch(sec, it, branchId) {
  if (sec && sec.hidden === true) return { ok: false, reason: 'hidden' };
  if (it && it.hidden === true) return { ok: false, reason: 'hidden' };

  const secOnly = (sec && Array.isArray(sec.only)) ? sec.only : [];
  const itOnly = (it && Array.isArray(it.only)) ? it.only : [];
  const secOk = !secOnly.length || secOnly.includes(branchId);
  const itOk = !itOnly.length || itOnly.includes(branchId);
  if (!secOk || !itOk) return { ok: false, reason: 'branch' };

  const so = (it && Array.isArray(it.so)) ? it.so : [];
  if (so.includes(branchId)) return { ok: false, reason: 'sold' };

  return { ok: true };
}

// ═══════════════════════════════════════════
//  الدفتر المحاسبي
// ═══════════════════════════════════════════
async function ledgerInsert(env, order, kind) {
  try {
    await env.DB.prepare(`
      INSERT OR IGNORE INTO order_ledger
        (order_number, branch_id, order_type, kind, gross, fees, driver_id, created_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))
    `).bind(
      order.order_number, order.branch_id, order.order_type || 'delivery', kind,
      order.total || 0, order.delivery_fee || 0, order.driver_id || null,
      order.created_at, (kind === 'delivered' ? order.delivered_at : order.updated_at) || null
    ).run();
  } catch (e) { console.error('ledger error:', e); }
}

// ═══════════════════════════════════════════
//  الحذف الكسول (P0 Fixed: حذف pending فقط > 24 ساعة)
//  ملاحظة: مقارنة نسبية بين طابعين UTC — لا تحتاج تحويل منطقة
// ═══════════════════════════════════════════
async function purgeStaleOrders(env) {
  try {
    const stale = await env.DB.prepare(`
      SELECT * FROM orders
      WHERE status = 'pending'
        AND created_at < datetime('now', '-24 hours')
    `).all();
    if (!stale.results.length) return 0;
    for (const o of stale.results) {
      await ledgerInsert(env, o, 'abandoned');
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(o.id).run();
    }
    return stale.results.length;
  } catch (e) {
    console.error('purge error:', e);
    return 0;
  }
}

// ═══════════════════════════════════════════
//  توليد رقم طلب عشوائي
//  v2.9: تاريخ الانتهاء بتوقيت الرياض
// ═══════════════════════════════════════════
async function generateOrderNumber(db) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = Math.floor(Math.random() * 90000) + 10000;
    const letter = letters[Math.floor(Math.random() * 26)];
    const orderNumber = `${num}${letter}`;
    const used = await db.prepare('SELECT 1 FROM used_order_numbers WHERE order_number = ?').bind(orderNumber).first();
    if (used) continue;
    const exists = await db.prepare('SELECT 1 FROM orders WHERE order_number = ?').bind(orderNumber).first();
    if (exists) continue;
    await db.prepare(`
      INSERT INTO used_order_numbers (order_number, created_at, expires_at)
      VALUES (?, date('now', '${TZ_OFFSET}'), date('now', '${TZ_OFFSET}', '+1 year'))
    `).bind(orderNumber).run();
    return orderNumber;
  }
  throw new Error('تعذر توليد رقم طلب فريد');
}

// ═══════════════════════════════════════════
//  تشفير + JWT + Auth
// ═══════════════════════════════════════════
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}
async function verifyPassword(password, storedHash, salt) {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}
function base64UrlEncode(str) { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}
async function createJWT(payload, secret) {
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${data}.${encodedSignature}`;
}
async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBuffer = new Uint8Array(base64UrlDecode(signature).split('').map(c => c.charCodeAt(0)));
    const valid = await crypto.subtle.verify('HMAC', key, signatureBuffer, new TextEncoder().encode(`${header}.${payload}`));
    if (!valid) return null;
    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) { return null; }
}
function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}
async function requireAuth(request, env, allowedRoles) {
  const token = extractToken(request);
  if (!token) return { error: error('غير مصرح: لا يوجد توكن', 401) };
  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return { error: error('غير مصرح: التوكن منتهي أو غير صالح', 401) };
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').bind(payload.userId).first();
  if (!user) return { error: error('الحساب معطل أو غير موجود', 403) };
  if (allowedRoles && !allowedRoles.includes(user.role)) return { error: error('صلاحيات غير كافية', 403) };
  return { user };
}

// ═══════════════════════════════════════════
//  0) Bootstrap (مرجع — المسار مُزال)
// ═══════════════════════════════════════════
async function handleBootstrap(env) {
  try {
    const existing = await env.DB.prepare("SELECT id, username FROM users WHERE role = 'super_admin' LIMIT 1").first();
    if (existing) {
      return json({ success: false, error: 'حساب المالك موجود بالفعل', existing_username: existing.username }, 409);
    }
    const username = 'owner';
    const password = '123456';
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await env.DB.prepare(`
      INSERT INTO users (name, phone, username, password_hash, password_salt, role, is_active, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 1, 0)
    `).bind('مالك النظام', '966500000000', username, hash, salt, 'super_admin').run();
    return json({ success: true, message: 'تم إنشاء حساب المالك بنجاح', username, password }, 201);
  } catch (e) {
    console.error('Bootstrap error:', e);
    return json({ success: false, error: e.message }, 500);
  }
}

// ═══════════════════════════════════════════
//  0.5) إصلاح كلمة مرور المالك (مرجع)
// ═══════════════════════════════════════════
async function handleFixOwnerPassword(env) {
  try {
    const user = await env.DB.prepare("SELECT id FROM users WHERE username = 'owner' AND role = 'super_admin'").first();
    if (!user) return json({ success: false, error: 'حساب المالك غير موجود' }, 404);
    const password = '123456';
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    await env.DB.prepare(`
      UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?
    `).bind(hash, salt, user.id).run();
    return json({ success: true, message: 'تم تحديث كلمة المرور بنجاح', username: 'owner', password: '123456' });
  } catch (e) {
    console.error('Fix password error:', e);
    return json({ success: false, error: e.message }, 500);
  }
}

// ═══════════════════════════════════════════
//  0.55) استعادة كلمة مرور المالك (محمية بمتغير سري)
// ═══════════════════════════════════════════
async function handleRecoverOwner(request, env) {
  if (!env.RECOVERY_KEY) return error('الاستعادة غير مفعّلة — أضف متغير RECOVERY_KEY في إعدادات الووركر', 403);
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (key !== env.RECOVERY_KEY) return error('مفتاح غير صحيح', 403);
  const ip = getIP(request);
  const rate = await checkRateLimit(env, `recover:${ip}`, 5, 900);
  if (!rate.allowed) return error('محاولات كثيرة، حاول بعد 15 دقيقة', 429);
  try {
    const user = await env.DB.prepare(
      "SELECT id, username FROM users WHERE role = 'super_admin' ORDER BY id LIMIT 1"
    ).first();
    if (!user) return error('حساب المالك غير موجود في قاعدة البيانات', 404);
    let newPass = url.searchParams.get('new') || '123456';
    const usingCustom = !!url.searchParams.get('new');
    if (usingCustom) {
      if (newPass.length < 8) return error('كلمة المرور 8 أحرف على الأقل', 400);
      if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
        return error('يجب أن تحتوي حرف كبير وصغير ورقم', 400);
      }
    }
    const salt = generateSalt();
    const hash = await hashPassword(newPass, salt);
    await env.DB.prepare(`
      UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0,
      is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(hash, salt, user.id).run();
    return json({ success: true, message: 'تم تعيين كلمة المرور بنجاح', username: user.username, password: newPass });
  } catch (e) {
    console.error('Recover error:', e);
    return error('فشل الاستعادة: ' + e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  0.6) قراءة المنيو من D1
// ═══════════════════════════════════════════
async function handleGetMenu(env) {
  try {
    const data = await env.DB.prepare('SELECT menu_json FROM app_data WHERE id = 1').first();
    if (!data) return json({ menu: [] });
    return json({ menu: JSON.parse(data.menu_json) });
  } catch (e) {
    console.error('Get menu error:', e);
    return json({ menu: [] });
  }
}

// ═══════════════════════════════════════════
//  0.7) حفظ المنيو في D1
// ═══════════════════════════════════════════
async function handleSaveMenu(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    if (!body.menu || !Array.isArray(body.menu)) return error('بيانات المنيو غير صالحة', 400);
    await env.DB.prepare(`
      UPDATE app_data SET menu_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).bind(JSON.stringify(body.menu)).run();
    return json({ success: true, message: 'تم حفظ المنيو بنجاح' });
  } catch (e) {
    console.error('Save menu error:', e);
    return error('فشل حفظ المنيو: ' + e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  0.8) قراءة الإعدادات من D1
// ═══════════════════════════════════════════
async function handleGetSettings(env) {
  try {
    const data = await env.DB.prepare('SELECT settings_json FROM app_data WHERE id = 1').first();
    if (!data) return json({ settings: {} });
    return json({ settings: JSON.parse(data.settings_json) });
  } catch (e) {
    console.error('Get settings error:', e);
    return json({ settings: {} });
  }
}

// ═══════════════════════════════════════════
//  0.9) حفظ الإعدادات في D1
// ═══════════════════════════════════════════
async function handleSaveSettings(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    if (!body.settings || typeof body.settings !== 'object') return error('بيانات الإعدادات غير صالحة', 400);
    await env.DB.prepare(`
      UPDATE app_data SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).bind(JSON.stringify(body.settings)).run();
    return json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
  } catch (e) {
    console.error('Save settings error:', e);
    return error('فشل حفظ الإعدادات: ' + e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  0.10) نقل البيانات من GitHub إلى D1
// ═══════════════════════════════════════════
async function handleMigrateFromGithub(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    if (!body.menu || !body.settings) return error('بيانات النقل غير صالحة', 400);
    await env.DB.prepare(`
      UPDATE app_data SET menu_json = ?, settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).bind(JSON.stringify(body.menu), JSON.stringify(body.settings)).run();
    return json({
      success: true,
      message: 'تم نقل البيانات من GitHub إلى D1 بنجاح',
      menu_items: body.menu.length || 0,
      settings_keys: Object.keys(body.settings).length || 0
    });
  } catch (e) {
    console.error('Migration error:', e);
    return error('فشل نقل البيانات: ' + e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  1) تسجيل الدخول
// ═══════════════════════════════════════════
async function handleLogin(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `login:${ip}`, 5, 900);
  if (!rateCheck.allowed) return error('محاولات كثيرة، حاول بعد 15 دقيقة', 429);
  const body = await request.json().catch(() => null);
  if (!body || !body.username || !body.password) return error('بيانات ناقصة');
  const username = sanitize(body.username);
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').bind(username).first();
  if (!user) return error('بيانات الدخول غير صحيحة', 401);
  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return error('بيانات الدخول غير صحيحة', 401);
  let branchName = null;
  if (user.branch_id) {
    const br = await env.DB.prepare('SELECT name_ar FROM branches WHERE id = ?').bind(user.branch_id).first();
    if (br) branchName = br.name_ar;
  }
  const payload = {
    userId: user.id, username: user.username, role: user.role, branchId: user.branch_id,
    mustChangePassword: user.must_change_password === 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (parseInt(env.JWT_DURATION) || 604800),
  };
  const token = await createJWT(payload, env.JWT_SECRET);
  const sessionToken = generateSalt() + generateSalt();
  await env.DB.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, datetime('now', '+30 days'), ?, ?)
  `).bind(sessionToken, user.id, ip, request.headers.get('User-Agent') || '').run();
  await env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run();
  return json({
    success: true, token, sessionToken,
    user: {
      id: user.id, name: user.name, username: user.username, role: user.role,
      branchId: user.branch_id, branchName, mustChangePassword: user.must_change_password === 1,
    },
  });
}

// ═══════════════════════════════════════════
//  2) جسر المالك (يقبل JWT مباشرة)
// ═══════════════════════════════════════════
async function handleAdminBridge(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `bridge:${ip}`, 60, 900);
  if (!rateCheck.allowed) return error('محاولات كثيرة', 429);
  const body = await request.json().catch(() => null);
  if (!body || !body.github_token) return error('التوكن مطلوب');

  const jwtPayload = await verifyJWT(body.github_token, env.JWT_SECRET);
  if (jwtPayload && jwtPayload.role === 'super_admin') {
    const ownerUser = await env.DB.prepare(
      "SELECT * FROM users WHERE id = ? AND is_active = 1"
    ).bind(jwtPayload.userId).first();
    if (ownerUser) {
      return json({
        success: true,
        token: body.github_token,
        user: { id: ownerUser.id, name: ownerUser.name, username: ownerUser.username, role: 'super_admin' }
      });
    }
  }

  const ghHeaders = {
    'Authorization': `Bearer ${body.github_token}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'makaronjy-cloud-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  let ghUser;
  try {
    const r = await fetch('https://api.github.com/user', { headers: ghHeaders });
    if (!r.ok) { const e = await r.json().catch(() => ({})); return error('توكن GitHub غير صالح', 401, e.message || `HTTP ${r.status}`); }
    ghUser = await r.json();
  } catch (e) { return error('تعذر الاتصال بـ GitHub', 502, e.message); }
  const owner = env.GH_OWNER || 'makaronjy';
  const repo = env.GH_REPO || 'Makaronjy';
  try {
    const r2 = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders });
    if (!r2.ok) { const e = await r2.json().catch(() => ({})); if (r2.status === 404) return error('المستودع غير موجود', 404, `${owner}/${repo}`); return error('لا تملك صلاحية على المستودع', 403, e.message || `HTTP ${r2.status}`); }
    const repoData = await r2.json();
    const perms = repoData.permissions || {};
    if (!(perms.admin || perms.maintain || perms.push)) return error('لا تملك صلاحية الكتابة على المستودع', 403, `الصلاحيات: ${JSON.stringify(perms)}`);
  } catch (e) { return error('تعذر التحقق من المستودع', 502, e.message); }
  const ownerUser = await env.DB.prepare("SELECT * FROM users WHERE role = 'super_admin' AND is_active = 1 LIMIT 1").first();
  if (!ownerUser) return error('حساب المالك غير موجود', 500);
  const payload = {
    userId: ownerUser.id, username: ownerUser.username, role: 'super_admin', branchId: null,
    mustChangePassword: false, via: 'github_bridge', gh_login: ghUser.login,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 43200,
  };
  const token = await createJWT(payload, env.JWT_SECRET);
  return json({ success: true, token, user: { id: ownerUser.id, name: ownerUser.name, username: ownerUser.username, role: 'super_admin' } });
}

// ═══════════════════════════════════════════
//  3) تغيير كلمة المرور
// ═══════════════════════════════════════════
async function handleChangePassword(request, env) {
  const auth = await requireAuth(request, env, null);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || !body.new_password) return error('كلمة المرور الجديدة مطلوبة');
  const newPass = body.new_password;
  if (newPass.length < 8) return error('كلمة المرور 8 أحرف على الأقل');
  if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) return error('يجب أن تحتوي حرف كبير وصغير ورقم');
  const salt = generateSalt();
  const hash = await hashPassword(newPass, salt);
  await env.DB.prepare(`UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(hash, salt, auth.user.id).run();
  return json({ success: true, message: 'تم تغيير كلمة المرور' });
}

// ═══════════════════════════════════════════
//  4) إنشاء طلب
//  v2.8: أسعار من D1 + رسوم حسب وضع الإعدادات + حدود كمية/عدد + فحص التوفر
// ═══════════════════════════════════════════
async function handleCreateOrder(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `create_order:${ip}`, 10, 60);
  if (!rateCheck.allowed) return error('محاولات كثيرة، حاول بعد دقيقة', 429);

  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');

  const customerName = sanitize(body.customer_name);
  const customerPhone = sanitize(body.customer_phone);
  const branchId = sanitize(body.branch_id);
  const items = Array.isArray(body.items) ? body.items : [];
  const notes = sanitize(body.notes || '');
  const orderType = body.order_type === 'pickup' ? 'pickup' : 'delivery';
  const orderLang = normLang(body.lang);

  if (!customerName || customerName.length < 2) return error('الاسم مطلوب (حرفان على الأقل)');
  if (customerName.length > 60) return error('الاسم طويل جداً (الحد 60 حرفاً)');
  if (!customerPhone || !/^\d{9,15}$/.test(customerPhone.replace(/[^0-9]/g, ''))) return error('رقم الجوال غير صحيح');
  if (!branchId) return error('الفرع مطلوب');
  if (items.length === 0) return error('السلة فارغة');
  if (items.length > MAX_ITEMS_PER_ORDER) return error(`عدد الأصناف كبير جداً (الحد ${MAX_ITEMS_PER_ORDER} صنف)`, 400);

  /* جلب الفرع + المنيو + الإعدادات من قاعدة البيانات */
  const branch = await env.DB.prepare('SELECT id, name_ar, phone, delivery_fee FROM branches WHERE id = ? AND is_active = 1').bind(branchId).first();
  if (!branch) return error('الفرع غير موجود أو غير نشط');

  const menuRow = await env.DB.prepare('SELECT menu_json FROM app_data WHERE id = 1').first();
  let menuData = [];
  try { menuData = menuRow ? JSON.parse(menuRow.menu_json) : []; } catch (e) { menuData = []; }
  if (!Array.isArray(menuData) || !menuData.length) return error('المنيو غير متاح حالياً — حاول لاحقاً', 503);

  const settings = await readAppSettings(env);

  /* فحص توفر التوصيل للفرع */
  if (orderType === 'delivery') {
    const da = settings.deliveryAvailability;
    if (da && typeof da === 'object') {
      if (da.mode === 'none') return error('التوصيل غير متاح حالياً — اختر الاستلام من الفرع', 409);
      if (da.mode === 'selected') {
        const list = Array.isArray(da.branchIds) ? da.branchIds : [];
        if (!list.includes(branchId)) return error('هذا الفرع للاستلام فقط — لا يتوفر توصيل', 409);
      }
    }
  }

  /* فهرس الأصناف مع القسم الأب (لفحص التوفر والإخفاء) */
  const menuMap = new Map();
  menuData.forEach(sec => {
    (sec.items || []).forEach(it => {
      if (!it || !it.id) return;
      menuMap.set(it.id, {
        sec: sec,
        item: it,
        price: (Array.isArray(it.prices) && typeof it.prices[0] === 'number') ? it.prices[0] : 0,
        name: it.ar || it.name || '',
        name_ar: it.ar || it.name_ar || '',
        name_en: it.en || it.name_en || it.ar || ''
      });
    });
  });

  let subtotal = 0;
  const cleanItems = [];

  for (const item of items) {
    const id = sanitize(item && item.id ? item.id : '');
    if (!id) return error('صنف بدون معرّف في السلة');

    const dbItem = menuMap.get(id);
    if (!dbItem) return error(`الصنف غير موجود: ${id}`);

    const avail = itemAllowedForBranch(dbItem.sec, dbItem.item, branchId);
    if (!avail.ok) {
      const label = dbItem.name_ar || dbItem.name || id;
      if (avail.reason === 'sold') return error(`الصنف نفد اليوم في هذا الفرع: ${label}`, 409);
      if (avail.reason === 'branch') return error(`الصنف غير متوفر في هذا الفرع: ${label}`, 409);
      return error(`الصنف غير متاح حالياً: ${label}`, 409);
    }

    let qty = parseInt(item.qty, 10);
    if (!isFinite(qty) || qty < 1) qty = 1;
    if (qty > MAX_QTY_PER_ITEM) return error(`الكمية كبيرة جداً لصنف واحد (الحد ${MAX_QTY_PER_ITEM})`, 400);

    const price = dbItem.price;
    subtotal += qty * price;

    cleanItems.push({
      id: id,
      name: sanitize(dbItem.name),
      name_ar: sanitize(dbItem.name_ar),
      name_en: sanitize(dbItem.name_en),
      qty,
      price,
      size: sanitize(item.size || '')
    });
  }

  /* الرسوم من الإعدادات — لا ثقة بأي رقم قادم من العميل */
  const deliveryFee = computeDeliveryFee(settings, branch, orderType);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  if (total <= 0) return error('إجمالي الطلب غير صالح');
  if (total > MAX_ORDER_TOTAL) return error('إجمالي الطلب يتجاوز الحد المسموح', 400);

  const orderNumber = await generateOrderNumber(env.DB);

  /* إحداثيات مُقيّدة بنطاق جغرافي صحيح */
  let customerLat = parseFloat(body.customer_lat);
  let customerLng = parseFloat(body.customer_lng);
  customerLat = (isFinite(customerLat) && customerLat >= -90 && customerLat <= 90) ? customerLat : null;
  customerLng = (isFinite(customerLng) && customerLng >= -180 && customerLng <= 180) ? customerLng : null;

  const customerAddress = orderType === 'delivery' ? sanitize(body.customer_address || '') : '';

  const result = await env.DB.prepare(`
    INSERT INTO orders (
      order_number, branch_id, order_type, lang, customer_name, customer_phone, customer_address,
      customer_lat, customer_lng, items_json, subtotal,
      delivery_fee, total, payment_method, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', ?)
  `).bind(orderNumber, branchId, orderType, orderLang, customerName, customerPhone, customerAddress, customerLat, customerLng, JSON.stringify(cleanItems), subtotal, deliveryFee, total, notes).run();

  const orderId = result.meta.last_row_id;
  await env.DB.prepare(`INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'pending', ?)`).bind(orderId, orderType === 'pickup' ? 'تم استلام الطلب — استلام من الفرع' : 'تم استلام الطلب').run();

  return json({
    success: true, order_number: orderNumber, order_id: orderId, order_type: orderType, lang: orderLang,
    total, delivery_fee: deliveryFee, branch_name: branch.name_ar, branch_phone: branch.phone,
    track_url: `${env.SITE_URL || ''}/track.html?order=${encodeURIComponent(orderNumber)}`,
  }, 201);
}

// ═══════════════════════════════════════════
//  5) تتبع الطلب
//  v2.8: حد معدل + عداد محاولات فاشلة يوقف تعداد الأرقام
// ═══════════════════════════════════════════
async function handleTrackOrder(orderNumber, request, env) {
  const ip = getIP(request);

  const rate = await checkRateLimit(env, `track:${ip}`, TRACK_RATE_PER_MIN, 60);
  if (!rate.allowed) return error('محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة', 429);

  const missKey = `track_miss:${ip}`;
  let misses = 0;
  try { misses = parseInt(await env.KV.get(missKey) || '0', 10) || 0; } catch (e) { misses = 0; }
  if (misses >= TRACK_MISS_LIMIT) {
    return error('تم إيقاف المحاولات مؤقتاً — تحقق من رقم الطلب أو رابط التتبع', 429);
  }

  const num = String(orderNumber || '').trim().slice(0, 40);
  if (!num) return error('الطلب غير موجود', 404);

  const order = await env.DB.prepare(`
    SELECT o.*, b.name_ar as branch_name, b.phone as branch_phone, b.lat as branch_lat, b.lng as branch_lng,
      u.name as driver_name, u.phone as driver_phone
    FROM orders o JOIN branches b ON o.branch_id = b.id
    LEFT JOIN users u ON o.driver_id = u.id
    WHERE o.order_number = ?
  `).bind(num).first();

  if (!order) {
    try { await env.KV.put(missKey, String(misses + 1), { expirationTtl: TRACK_MISS_WINDOW }); } catch (e) {}
    return error('الطلب غير موجود', 404);
  }

  const trackingResult = await env.DB.prepare(`SELECT status, notes, created_at FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC`).bind(order.id).all();
  const isPickup = order.order_type === 'pickup';
  let driverLocation = null;
  if (!isPickup && order.driver_id && order.status !== 'delivered' && order.status !== 'cancelled') {
    driverLocation = await env.DB.prepare(`
      SELECT lat, lng, created_at FROM driver_locations
      WHERE driver_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(order.driver_id).first();
  }
  return json({
    order: {
      number: order.order_number,
      status: order.status,
      status_text: statusTextFor(order),
      order_type: order.order_type || 'delivery',
      lang: order.lang || 'ar',
      customer_name: order.customer_name,
      customer_address: order.customer_address || '',
      customer_lat: order.customer_lat,
      customer_lng: order.customer_lng,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total: order.total,
      payment_method: order.payment_method,
      created_at: order.created_at,
      items: JSON.parse(order.items_json),
      notes: order.notes,
    },
    branch: { name: order.branch_name, phone: order.branch_phone, lat: order.branch_lat, lng: order.branch_lng },
    driver: (!isPickup && order.driver_id) ? {
      name: order.driver_name, phone: order.driver_phone,
      lat: driverLocation?.lat || order.driver_lat,
      lng: driverLocation?.lng || order.driver_lng,
      last_update: driverLocation?.created_at || null,
    } : null,
    tracking: trackingResult.results,
    live_mode: env.LIVE_MODE || 'polling',
  });
}

// ═══════════════════════════════════════════
//  6) طلبات المشرف
// ═══════════════════════════════════════════
async function handleSupervisorOrders(request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;
  await purgeStaleOrders(env);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  let query = `SELECT o.*, u.name as driver_name, u.phone as driver_phone, b.name_ar as branch_name FROM orders o LEFT JOIN users u ON o.driver_id = u.id JOIN branches b ON o.branch_id = b.id WHERE o.branch_id = ?`;
  const params = [auth.user.branch_id];
  if (statusFilter) { query += ' AND o.status = ?'; params.push(statusFilter); }
  query += ' ORDER BY o.created_at DESC LIMIT 100';
  const result = await env.DB.prepare(query).bind(...params).all();
  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, order_type: o.order_type || 'delivery',
    lang: o.lang || 'ar',
    branch_name: o.branch_name,
    customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng, items: JSON.parse(o.items_json),
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, payment_method: o.payment_method,
    status: o.status, status_text: statusTextFor(o),
    driver_id: o.driver_id, driver_name: o.driver_name, driver_phone: o.driver_phone,
    driver_lat: o.driver_lat, driver_lng: o.driver_lng,
    notes: o.notes, created_at: o.created_at,
  }));
  return json({ orders, count: orders.length, supervisor_name: auth.user.name, branch_name: orders[0]?.branch_name || null });
}

// ═══════════════════════════════════════════
//  7) سائقو الفرع
// ═══════════════════════════════════════════
async function handleSupervisorDrivers(request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;
  const result = await env.DB.prepare(`SELECT id, name, phone, username, is_active FROM users WHERE branch_id = ? AND role = 'driver' AND is_active = 1 ORDER BY name`).bind(auth.user.branch_id).all();
  return json({ drivers: result.results });
}

// ═══════════════════════════════════════════
//  8) حوض طلبات الفرع
// ═══════════════════════════════════════════
async function handleBranchPool(request, env) {
  const auth = await requireAuth(request, env, ['driver', 'supervisor', 'super_admin']);
  if (auth.error) return auth.error;
  await purgeStaleOrders(env);
  let branchId = auth.user.branch_id;
  if (auth.user.role === 'super_admin') {
    const q = new URL(request.url).searchParams.get('branch_id');
    if (q) branchId = q;
    if (!branchId) return json({ orders: [], count: 0, driver_location: null });
  }
  if (!branchId) return json({ orders: [], count: 0, driver_location: null });
  const result = await env.DB.prepare(`
    SELECT o.*, b.name_ar as branch_name, b.lat as branch_lat, b.lng as branch_lng
    FROM orders o JOIN branches b ON o.branch_id = b.id
    WHERE o.branch_id = ? AND o.order_type = 'delivery' AND o.status = 'ready' AND o.driver_id IS NULL
    ORDER BY o.created_at ASC LIMIT 50
  `).bind(branchId).all();
  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name, branch_lat: o.branch_lat, branch_lng: o.branch_lng,
    lang: o.lang || 'ar',
    customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng, items: JSON.parse(o.items_json),
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, payment_method: o.payment_method,
    notes: o.notes, created_at: o.created_at,
  }));
  let driverLocation = null;
  if (auth.user.role === 'driver') {
    const loc = await env.DB.prepare(`SELECT lat, lng, created_at FROM driver_locations WHERE driver_id = ? ORDER BY created_at DESC LIMIT 1`).bind(auth.user.id).first();
    if (loc) driverLocation = { lat: loc.lat, lng: loc.lng, at: loc.created_at };
  }
  return json({ orders, count: orders.length, branch_id: branchId, driver_location: driverLocation });
}

// ═══════════════════════════════════════════
//  9) استلام السائق للطلب (claim)
// ═══════════════════════════════════════════
async function handleClaim(orderId, request, env) {
  const auth = await requireAuth(request, env, ['driver']);
  if (auth.error) return auth.error;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  if (order.branch_id !== auth.user.branch_id) return error('الطلب ليس من فرعك', 403);
  if (order.order_type !== 'delivery') return error('طلبات الاستلام لا تحتاج سائقاً', 409);
  if (order.status !== 'ready') return error('الطلب لم يعد جاهزاً للتعيين', 409);
  if (order.driver_id !== null) return error('الطلب مُسند لسائق آخر', 409);
  const result = await env.DB.prepare(`
    UPDATE orders SET status = 'driver_assigned', driver_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'ready' AND driver_id IS NULL AND order_type = 'delivery'
  `).bind(auth.user.id, orderId).run();
  if (result.meta.changes === 0) return error('الطلب لم يعد متاحاً — استلمه سائق آخر', 409);
  await env.DB.prepare(`INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'driver_assigned', ?)`).bind(orderId, `تم تعيين السائق: ${auth.user.name}`).run();
  return json({ success: true, order_id: orderId, order_number: order.order_number, lang: order.lang || 'ar', driver_id: auth.user.id, driver_name: auth.user.name });
}

// ═══════════════════════════════════════════
//  10) توصيلات السائق
//  v2.9: «اليوم» بتوقيت الرياض — أرباح ما بعد منتصف الليل صحيحة
// ═══════════════════════════════════════════
async function handleDriverOrders(request, env) {
  const auth = await requireAuth(request, env, ['driver']);
  if (auth.error) return auth.error;
  await purgeStaleOrders(env);
  const result = await env.DB.prepare(`
    SELECT o.*, b.name_ar as branch_name FROM orders o JOIN branches b ON o.branch_id = b.id
    WHERE o.driver_id = ? AND o.order_type = 'delivery'
      AND o.status IN ('driver_assigned','driver_at_restaurant','out_for_delivery','delivered')
    ORDER BY o.created_at DESC LIMIT 50
  `).bind(auth.user.id).all();
  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name,
    lang: o.lang || 'ar',
    customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng, items: JSON.parse(o.items_json),
    total: o.total, delivery_fee: o.delivery_fee, status: o.status, status_text: statusTextFor(o), created_at: o.created_at,
  }));
  const today = await env.DB.prepare(`
    SELECT COUNT(*) as total_delivered, SUM(delivery_fee) as earnings
    FROM orders
    WHERE driver_id = ? AND status = 'delivered'
      AND date(delivered_at, '${TZ_OFFSET}') = date('now', '${TZ_OFFSET}')
  `).bind(auth.user.id).first();
  return json({ orders, stats: { delivered_today: today?.total_delivered || 0, earnings_today: today?.earnings || 0 } });
}

// ═══════════════════════════════════════════
//  11) تغيير الحالة
// ═══════════════════════════════════════════
async function handleUpdateStatus(orderId, request, env) {
  const auth = await requireAuth(request, env, null);
  if (auth.error) return auth.error;
  const user = auth.user;
  const body = await request.json().catch(() => null);
  if (!body || !body.status) return error('الحالة مطلوبة');
  const newStatus = body.status;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  const allowed = allowedNext(order);
  if (!allowed.includes(newStatus)) return error(`لا يمكن الانتقال من ${order.status} إلى ${newStatus}`, 409);
  const rolesAllowed = allowedRolesFor(order, newStatus);
  if (!rolesAllowed.includes(user.role)) return error('ليس لديك صلاحية لهذا الإجراء', 403);
  if (user.role === 'supervisor' && user.branch_id !== order.branch_id) return error('هذا الطلب ليس من فرعك', 403);
  if (user.role === 'driver' && order.driver_id !== user.id) return error('هذا الطلب ليس مسنداً إليك', 403);
  if (newStatus === 'delivered') {
    await env.DB.prepare(`UPDATE orders SET status = ?, delivered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(newStatus, orderId).run();
    const fresh = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
    await ledgerInsert(env, fresh, 'delivered');
  } else {
    await env.DB.prepare(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(newStatus, orderId).run();
    if (newStatus === 'cancelled') {
      const fresh = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
      await ledgerInsert(env, fresh, 'cancelled');
    }
  }
  await env.DB.prepare(`INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)`).bind(orderId, newStatus, sanitize(body.notes || '')).run();
  return json({ success: true, order_id: orderId, old_status: order.status, new_status: newStatus, lang: order.lang || 'ar' });
}

// ═══════════════════════════════════════════
//  12) تعيين سائق يدوي
// ═══════════════════════════════════════════
async function handleAssignDriver(orderId, request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body || !body.driver_id) return error('معرف السائق مطلوب');
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  if (order.order_type === 'pickup') return error('طلبات الاستلام من الفرع لا تحتاج سائقاً', 409);
  if (auth.user.role === 'supervisor' && auth.user.branch_id !== order.branch_id) return error('هذا الطلب ليس من فرعك', 403);
  if (order.status !== 'ready') return error('الطلب ليس في حالة جاهز', 409);
  const driver = await env.DB.prepare(`SELECT * FROM users WHERE id = ? AND role = 'driver' AND is_active = 1 AND branch_id = ?`).bind(body.driver_id, order.branch_id).first();
  if (!driver) return error('السائق غير موجود في هذا الفرع أو معطل', 404);
  await env.DB.prepare(`UPDATE orders SET status = 'driver_assigned', driver_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(driver.id, orderId).run();
  await env.DB.prepare(`INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'driver_assigned', ?)`).bind(orderId, `تم تعيين السائق: ${driver.name}`).run();
  return json({ success: true, order_id: orderId, lang: order.lang || 'ar', driver_id: driver.id, driver_name: driver.name, driver_phone: driver.phone });
}

// ═══════════════════════════════════════════
//  13) موقع السائق
// ═══════════════════════════════════════════
async function handleDriverLocation(request, env) {
  const auth = await requireAuth(request, env, ['driver']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');
  const orderId = body.order_id ? parseInt(body.order_id) : null;
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  const speed = parseFloat(body.speed) || 0;
  const heading = parseFloat(body.heading) || 0;
  if (!isFinite(lat) || !isFinite(lng)) return error('إحداثيات غير صالحة');
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return error('إحداثيات خارج النطاق', 400);
  if (orderId) {
    const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ? AND driver_id = ? AND order_type = 'delivery' AND status IN ('driver_assigned','driver_at_restaurant','out_for_delivery')`).bind(orderId, auth.user.id).first();
    if (order) {
      await env.DB.prepare(`INSERT INTO driver_locations (order_id, driver_id, lat, lng, speed, heading) VALUES (?, ?, ?, ?, ?, ?)`).bind(orderId, auth.user.id, lat, lng, speed, heading).run();
      await env.DB.prepare('UPDATE orders SET driver_lat = ?, driver_lng = ? WHERE id = ?').bind(lat, lng, orderId).run();
      return json({ success: true, received_at: new Date().toISOString() });
    }
  }
  await env.DB.prepare(`INSERT INTO driver_locations (order_id, driver_id, lat, lng, speed, heading) VALUES (NULL, ?, ?, ?, ?, ?)`).bind(auth.user.id, lat, lng, speed, heading).run();
  return json({ success: true, received_at: new Date().toISOString() });
}

// ═══════════════════════════════════════════
//  14) رفع صورة التسليم
// ═══════════════════════════════════════════
async function handleUploadPhoto(orderId, request, env) {
  const auth = await requireAuth(request, env, ['driver', 'super_admin']);
  if (auth.error) return auth.error;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  if (order.order_type === 'pickup') return error('لا توجد صورة إثبات لطلبات الاستلام', 409);
  if (auth.user.role === 'driver' && order.driver_id !== auth.user.id) return error('هذا الطلب ليس مسنداً إليك', 403);
  const contentType = request.headers.get('Content-Type') || '';
  let photoKey = null;
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('photo');
    if (!file || typeof file === 'string') return error('لا توجد صورة');
    if (file.size > 5 * 1024 * 1024) return error('حجم الصورة كبير جداً (الحد 5MB)', 413);
    photoKey = `deliveries/${order.order_number}/${Date.now()}.jpg`;
    await env.IMAGES.put(photoKey, file.stream(), { httpMetadata: { contentType: 'image/jpeg' } });
  } else {
    const body = await request.json().catch(() => null);
    if (!body || !body.photo_base64) return error('لا توجد صورة');
    const base64 = body.photo_base64.replace(/^data:image\/\w+;base64,/, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length > 5 * 1024 * 1024) return error('حجم الصورة كبير جداً (الحد 5MB)', 413);
    photoKey = `deliveries/${order.order_number}/${Date.now()}.jpg`;
    await env.IMAGES.put(photoKey, bytes, { httpMetadata: { contentType: sniffImageType(bytes) || 'image/jpeg' } });
  }
  await env.DB.prepare('UPDATE orders SET delivery_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(photoKey, orderId).run();
  return json({ success: true, photo_key: photoKey });
}

// ═══════════════════════════════════════════
//  15) عرض صورة التسليم
// ═══════════════════════════════════════════
async function handleGetPhoto(orderId, request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin', 'driver']);
  if (auth.error) return auth.error;
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  if (auth.user.role === 'driver' && order.driver_id !== auth.user.id) return error('هذا الطلب ليس مسنداً إليك', 403);
  if (auth.user.role === 'supervisor' && auth.user.branch_id !== order.branch_id) return error('هذا الطلب ليس من فرعك', 403);
  if (!order.delivery_photo) return error('لا توجد صورة لهذا الطلب', 404);
  const obj = await env.IMAGES.get(order.delivery_photo);
  if (!obj) return error('الصورة غير موجودة في التخزين', 404);
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'private, max-age=3600', ...CORS_HEADERS },
  });
}

// ═══════════════════════════════════════════
//  16) كل الطلبات (المالك)
//  v2.9: فلترة التاريخ بتوقيت الرياض
// ═══════════════════════════════════════════
async function handleAdminOrders(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  await purgeStaleOrders(env);
  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch_id');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  const dateFrom = url.searchParams.get('from');
  const dateTo = url.searchParams.get('to');
  let query = `SELECT o.*, b.name_ar as branch_name, u.name as driver_name FROM orders o JOIN branches b ON o.branch_id = b.id LEFT JOIN users u ON o.driver_id = u.id WHERE 1=1`;
  const params = [];
  if (branchId) { query += ' AND o.branch_id = ?'; params.push(branchId); }
  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (type) { query += ' AND o.order_type = ?'; params.push(type); }
  if (search) { query += ' AND (o.order_number LIKE ? OR o.customer_phone LIKE ? OR o.customer_name LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
  if (dateFrom) { query += ` AND date(o.created_at, '${TZ_OFFSET}') >= ?`; params.push(dateFrom); }
  if (dateTo) { query += ` AND date(o.created_at, '${TZ_OFFSET}') <= ?`; params.push(dateTo); }
  query += ' ORDER BY o.created_at DESC LIMIT 200';
  const result = await env.DB.prepare(query).bind(...params).all();
  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name, order_type: o.order_type || 'delivery',
    lang: o.lang || 'ar',
    customer_name: o.customer_name, customer_phone: o.customer_phone, total: o.total, delivery_fee: o.delivery_fee,
    payment_method: o.payment_method, payment_status: o.payment_status, status: o.status, status_text: statusTextFor(o),
    driver_name: o.driver_name, created_at: o.created_at, has_photo: !!o.delivery_photo,
  }));
  return json({ orders, count: orders.length });
}

// ═══════════════════════════════════════════
//  17) إدارة المستخدمين
// ═══════════════════════════════════════════
async function handleAdminUsersList(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const result = await env.DB.prepare(`
    SELECT u.id, u.name, u.phone, u.username, u.role, u.branch_id, u.is_active, u.must_change_password, u.last_login, u.created_at, b.name_ar as branch_name
    FROM users u LEFT JOIN branches b ON u.branch_id = b.id ORDER BY u.role, u.name
  `).all();
  return json({ users: result.results });
}
async function handleAdminUsersCreate(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');
  const name = sanitize(body.name);
  const phone = sanitize(body.phone || '');
  const username = sanitize(body.username).toLowerCase();
  const password = body.password || null;
  const role = body.role;
  const branchId = sanitize(body.branch_id || '');
  if (!name || !username) return error('الاسم واسم المستخدم مطلوبان');
  if (!['supervisor', 'driver'].includes(role)) return error('دور غير صالح');
  if (!branchId) return error('يجب تحديد الفرع');
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first();
  if (exists) return error('اسم المستخدم مستخدم بالفعل', 409);
  const tempPass = password || ('Mk@' + generateSalt().slice(0, 8));
  const salt = generateSalt();
  const hash = await hashPassword(tempPass, salt);
  const result = await env.DB.prepare(`INSERT INTO users (name, phone, username, password_hash, password_salt, role, branch_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`).bind(name, phone, username, hash, salt, role, branchId).run();
  return json({ success: true, user_id: result.meta.last_row_id, username, temp_password: tempPass, note: 'سلّم كلمة المرور للموظف الآن – لن تظهر مرة أخرى' }, 201);
}
async function handleAdminUsersUpdate(userId, request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return error('المستخدم غير موجود', 404);
  if (user.role === 'super_admin' && body.is_active === 0) return error('لا يمكن تعطيل حساب المالك', 403);
  if (user.id === auth.user.id && body.is_active === 0) return error('لا يمكنك تعطيل حسابك الحالي', 403);
  const name = body.name !== undefined ? sanitize(body.name) : user.name;
  const phone = body.phone !== undefined ? sanitize(body.phone) : user.phone;
  const branchId = body.branch_id !== undefined ? sanitize(body.branch_id) : user.branch_id;
  const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : user.is_active;
  await env.DB.prepare(`UPDATE users SET name = ?, phone = ?, branch_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(name, phone, branchId, isActive, userId).run();
  return json({ success: true });
}
async function handleAdminUsersDelete(userId, request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return error('المستخدم غير موجود', 404);
  if (user.role === 'super_admin') return error('لا يمكن حذف حساب المالك', 403);
  if (user.id === auth.user.id) return error('لا يمكنك حذف حسابك الحالي', 403);
  const hasOrders = await env.DB.prepare('SELECT 1 FROM orders WHERE driver_id = ? LIMIT 1').bind(userId).first();
  if (hasOrders) return error('لا يمكن حذف موظف له طلبات — استخدم التعطيل', 409);
  await env.DB.prepare('DELETE FROM driver_locations WHERE driver_id = ?').bind(userId).run();
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return json({ success: true });
}
async function handleAdminUsersReset(userId, request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return error('المستخدم غير موجود', 404);
  const tempPass = 'Mk@' + generateSalt().slice(0, 8);
  const salt = generateSalt();
  const hash = await hashPassword(tempPass, salt);
  await env.DB.prepare(`UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(hash, salt, userId).run();
  return json({ success: true, username: user.username, temp_password: tempPass, note: 'سلّم كلمة المرور للموظف الآن – لن تظهر مرة أخرى' });
}

// ═══════════════════════════════════════════
//  18) التقرير التشغيلي
//  v2.9: كل التجميعات بتوقيت الرياض
// ═══════════════════════════════════════════
async function handleReportsSummary(request, env) {
  const auth = await requireAuth(request, env, ['super_admin', 'supervisor']);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  let branchId = url.searchParams.get('branch_id');
  const period = url.searchParams.get('period') || 'today';
  if (auth.user.role === 'supervisor') branchId = auth.user.branch_id;
  const dateCondition = {
    today: `date(o.created_at, '${TZ_OFFSET}') = date('now', '${TZ_OFFSET}')`,
    week: `date(o.created_at, '${TZ_OFFSET}') >= date('now', '${TZ_OFFSET}', '-7 days')`,
    month: `date(o.created_at, '${TZ_OFFSET}') >= date('now', '${TZ_OFFSET}', '-30 days')`,
  }[period] || `date(o.created_at, '${TZ_OFFSET}') = date('now', '${TZ_OFFSET}')`;
  let where = dateCondition;
  const params = [];
  if (branchId) { where += ' AND o.branch_id = ?'; params.push(branchId); }
  const totals = await env.DB.prepare(`
    SELECT COUNT(*) as total_orders,
      SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN o.status = 'delivered' AND o.order_type = 'pickup' THEN 1 ELSE 0 END) as pickup_delivered,
      SUM(CASE WHEN o.status = 'delivered' AND o.order_type = 'delivery' THEN 1 ELSE 0 END) as delivery_delivered,
      SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END) as revenue,
      AVG(CASE WHEN o.status = 'delivered' THEN o.total ELSE NULL END) as avg_order
    FROM orders o WHERE ${where}
  `).bind(...params).first();
  let perBranch = [];
  if (auth.user.role === 'super_admin') {
    const pb = await env.DB.prepare(`
      SELECT b.name_ar as branch_name, COUNT(*) as orders_count,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END) as revenue
      FROM orders o JOIN branches b ON o.branch_id = b.id
      WHERE ${dateCondition} GROUP BY o.branch_id ORDER BY revenue DESC
    `).all();
    perBranch = pb.results;
  }
  const driversParams = branchId ? [branchId] : [];
  const drivers = await env.DB.prepare(`
    SELECT u.name as driver_name, COUNT(*) as deliveries, SUM(o.delivery_fee) as earnings
    FROM orders o JOIN users u ON o.driver_id = u.id
    WHERE o.status = 'delivered' AND ${where.replace(/o\.created_at/g, 'o.delivered_at')}
      ${branchId ? 'AND o.branch_id = ?' : ''}
    GROUP BY o.driver_id ORDER BY deliveries DESC
  `).bind(...driversParams).all();
  let topItems = [];
  try {
    const ti = await env.DB.prepare(`
      SELECT json_extract(j.value, '$.name') as name, SUM(CAST(json_extract(j.value, '$.qty') AS INTEGER)) as qty
      FROM orders o, json_each(o.items_json) j
      WHERE o.status = 'delivered' AND ${where} ${branchId ? 'AND o.branch_id = ?' : ''}
      GROUP BY name ORDER BY qty DESC LIMIT 5
    `).bind(...(branchId ? [branchId] : [])).all();
    topItems = ti.results;
  } catch (e) { topItems = []; }
  return json({
    period,
    timezone: TZ_LABEL,
    local_date: localDateStr(),
    totals: {
      total_orders: totals?.total_orders || 0, delivered: totals?.delivered || 0, cancelled: totals?.cancelled || 0,
      pickup_delivered: totals?.pickup_delivered || 0, delivery_delivered: totals?.delivery_delivered || 0,
      revenue: totals?.revenue || 0, avg_order: Math.round(totals?.avg_order || 0),
    },
    per_branch: perBranch, drivers: drivers.results, top_items: topItems,
  });
}

// ═══════════════════════════════════════════
//  19) التقرير المحاسبي
//  v2.9: حدود الأشهر والأيام بتوقيت الرياض
// ═══════════════════════════════════════════
async function handleReportsAccounting(request, env) {
  const auth = await requireAuth(request, env, ['super_admin', 'supervisor']);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  let branchId = url.searchParams.get('branch_id') || '';
  if (auth.user.role === 'supervisor') branchId = auth.user.branch_id || '';
  const ym = localYearMonth();
  const from = url.searchParams.get('from') || (ym + '-01');
  const to = url.searchParams.get('to') || localDateStr();
  const rows = await env.DB.prepare(`
    SELECT strftime('%Y-%m', closed_at, '${TZ_OFFSET}') AS ym, kind, order_type, branch_id, driver_id,
           COUNT(*) AS n, SUM(gross) AS gross, SUM(fees) AS fees
    FROM order_ledger
    WHERE date(closed_at, '${TZ_OFFSET}') BETWEEN ? AND ?
      AND (? = '' OR branch_id = ?)
    GROUP BY ym, kind, order_type, branch_id, driver_id
    ORDER BY ym
  `).bind(from, to, branchId, branchId).all();
  const totals = { orders: 0, delivered: 0, cancelled: 0, abandoned: 0, gross: 0, fees: 0, pickup_gross: 0, delivery_gross: 0 };
  const monthsMap = {};
  const branchesMap = {};
  const driversMap = {};
  for (const r of rows.results) {
    const g = r.gross || 0;
    const f = r.fees || 0;
    const m = monthsMap[r.ym] || (monthsMap[r.ym] = { ym: r.ym, orders: 0, delivered: 0, cancelled: 0, abandoned: 0, gross: 0, fees: 0 });
    m.orders += r.n; totals.orders += r.n;
    if (r.kind === 'cancelled')  { m.cancelled  += r.n; totals.cancelled  += r.n; }
    if (r.kind === 'abandoned')  { m.abandoned  += r.n; totals.abandoned  += r.n; }
    if (r.kind === 'delivered') {
      m.delivered += r.n; totals.delivered += r.n;
      m.gross += g;       totals.gross += g;
      m.fees  += f;       totals.fees  += f;
      if (r.order_type === 'pickup') totals.pickup_gross += g;
      else                           totals.delivery_gross += g;
      if (r.driver_id) {
        const d = driversMap[r.driver_id] || (driversMap[r.driver_id] = { driver_id: r.driver_id, deliveries: 0, earnings: 0 });
        d.deliveries += r.n;
        d.earnings += f;
      }
    }
    if (r.branch_id) {
      const b = branchesMap[r.branch_id] || (branchesMap[r.branch_id] = { branch_id: r.branch_id, orders: 0, delivered: 0, gross: 0 });
      b.orders += r.n;
      if (r.kind === 'delivered') { b.delivered += r.n; b.gross += g; }
    }
  }
  const months = Object.values(monthsMap).sort((a, b) => a.ym.localeCompare(b.ym));
  totals.gross = Math.round(totals.gross * 100) / 100;
  totals.fees = Math.round(totals.fees * 100) / 100;
  totals.pickup_gross = Math.round(totals.pickup_gross * 100) / 100;
  totals.delivery_gross = Math.round(totals.delivery_gross * 100) / 100;
  totals.avg = totals.delivered ? Math.round(totals.gross / totals.delivered) : 0;
  totals.cancel_rate = totals.orders ? Math.round(((totals.cancelled + totals.abandoned) / totals.orders) * 100) : 0;
  const branches = [];
  if (Object.keys(branchesMap).length) {
    const brs = await env.DB.prepare('SELECT id, name_ar, name_en FROM branches').all();
    const nameById = {};
    brs.results.forEach(b => { nameById[b.id] = b; });
    for (const id in branchesMap) {
      const b = branchesMap[id];
      branches.push({ ...b, gross: Math.round(b.gross * 100) / 100, branch_name: nameById[id]?.name_ar || id, branch_name_en: nameById[id]?.name_en || id });
    }
    branches.sort((a, b) => b.gross - a.gross);
  }
  const drivers = [];
  if (Object.keys(driversMap).length) {
    const usrs = await env.DB.prepare('SELECT id, name FROM users WHERE role = ?').bind('driver').all();
    const nameById = {};
    usrs.results.forEach(u => { nameById[u.id] = u.name; });
    for (const id in driversMap) {
      const d = driversMap[id];
      drivers.push({ ...d, earnings: Math.round(d.earnings * 100) / 100, driver_name: nameById[id] || ('#' + id) });
    }
    drivers.sort((a, b) => b.deliveries - a.deliveries);
  }
  let topItems = [];
  try {
    const ti = await env.DB.prepare(`
      SELECT COALESCE(json_extract(j.value,'$.name_ar'), json_extract(j.value,'$.name')) AS name_ar,
             json_extract(j.value,'$.name_en') AS name_en,
             SUM(CAST(json_extract(j.value,'$.qty') AS INTEGER)) AS qty,
             SUM(CAST(json_extract(j.value,'$.qty') AS INTEGER) * CAST(json_extract(j.value,'$.price') AS REAL)) AS revenue
      FROM orders o, json_each(o.items_json) j
      WHERE o.status = 'delivered' AND date(o.delivered_at, '${TZ_OFFSET}') BETWEEN ? AND ?
        AND (? = '' OR o.branch_id = ?)
      GROUP BY name_ar ORDER BY qty DESC LIMIT 10
    `).bind(from, to, branchId, branchId).all();
    topItems = ti.results;
  } catch (e) { topItems = []; }
  return json({ from, to, timezone: TZ_LABEL, totals, months, branches, drivers, top_items: topItems });
}

// ═══════════════════════════════════════════
//  20) صور R2 + سلة المهملات
// ═══════════════════════════════════════════
function imgCt(key) {
  if (/\.png$/i.test(key)) return 'image/png';
  if (/\.(jpg|jpeg)$/i.test(key)) return 'image/jpeg';
  if (/\.webp$/i.test(key)) return 'image/webp';
  if (/\.svg$/i.test(key)) return 'image/svg+xml';
  if (/\.gif$/i.test(key)) return 'image/gif';
  if (/\.ico$/i.test(key)) return 'image/x-icon';
  return 'application/octet-stream';
}
/* كشف النوع الحقيقي — يسمح بتخزين WebP مضغوط داخل مفتاح .png */
function sniffImageType(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return null;
}
function validImgKey(key) {
  return !!key && key.indexOf('..') < 0 && key.indexOf('trash/') !== 0 && key.length < 300;
}

async function handleImgServe(key, env) {
  if (!validImgKey(key)) return error('مفتاح صورة غير صالح', 400);
  /* حماية صور التسليم من الوصول العام */
  if (!key.startsWith('img/')) return error('غير مصرح بالوصول', 403);

  try {
    const obj = await env.IMAGES.get(key);
    if (obj) {
      return new Response(obj.body, {
        headers: {
          'Content-Type': obj.httpMetadata?.contentType || imgCt(key),
          'Cache-Control': 'public, max-age=31536000, immutable',
          ...CORS_HEADERS
        }
      });
    }
  } catch (e) {}

  /* النقل الذاتي لصور التطبيق الثابتة فقط */
  if (APP_IMG_FALLBACK.indexOf(key) >= 0) {
    try {
      const safeUrl = RAW_BASE + key.split('/').map(encodeURIComponent).join('/');
      const r = await fetch(safeUrl, { headers: { 'User-Agent': 'makaronjy-worker' } });
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (buf && buf.byteLength > 0) {
          const bytes = new Uint8Array(buf);
          const ct = sniffImageType(bytes) || imgCt(key);
          try { await env.IMAGES.put(key, buf, { httpMetadata: { contentType: ct } }); } catch (e) {}
          return new Response(buf, {
            headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400', ...CORS_HEADERS }
          });
        }
      }
    } catch (e) {}
  }
  return error('الصورة غير موجودة', 404);
}

async function handleImgPut(request, env, key) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  if (!validImgKey(key)) return error('مفتاح صورة غير صالح', 400);
  const body = await request.json().catch(() => null);
  if (!body || !body.data) return error('لا توجد بيانات صورة', 400);
  let bytes;
  try {
    const b64 = String(body.data).replace(/^data:[^;]+;base64,/, '');
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch (e) { return error('بيانات الصورة غير صالحة', 400); }
  if (bytes.length > 6 * 1024 * 1024) return error('الصورة أكبر من 6MB — قلّل الجودة من إعدادات الضغط', 413);
  const ct = sniffImageType(bytes) || imgCt(key);
  await env.IMAGES.put(key, bytes, { httpMetadata: { contentType: ct } });
  return json({ success: true, key, url: '/api/img/' + key, bytes: bytes.length, contentType: ct });
}

/* الحذف ينقل إلى سلة المهملات أولاً */
async function handleImgDelete(request, env, key) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  if (!validImgKey(key)) return error('مفتاح صورة غير صالح', 400);
  let trashed = false, trashKey = null;
  try {
    const obj = await env.IMAGES.get(key);
    if (obj) {
      const buf = await obj.arrayBuffer();
      trashKey = 'trash/' + Date.now() + '/' + key;
      await env.IMAGES.put(trashKey, buf, {
        httpMetadata: { contentType: obj.httpMetadata?.contentType || imgCt(key) },
        customMetadata: { originalKey: key, deletedAt: new Date().toISOString() }
      });
      trashed = true;
    }
  } catch (e) { console.error('trash copy failed:', e); }
  await env.IMAGES.delete(key);
  return json({ success: true, deleted: key, trashed, trashKey, retentionDays: TRASH_DAYS });
}

async function handleImgList(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const prefix = new URL(request.url).searchParams.get('prefix') || '';
  const objects = await r2ListAll(env.IMAGES, prefix);
  return json({
    files: objects.filter(o => o.key.indexOf('trash/') !== 0)
      .map(o => ({ name: o.key.split('/').pop(), path: o.key, size: o.size, sha: null }))
  });
}

/* ===== سلة المهملات ===== */
function parseTrashKey(k) {
  const rest = k.slice('trash/'.length);
  const i = rest.indexOf('/');
  if (i < 0) return null;
  const ts = parseInt(rest.slice(0, i), 10);
  const originalKey = rest.slice(i + 1);
  if (!isFinite(ts) || !originalKey) return null;
  return { ts, originalKey };
}
async function handleTrashList(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const objects = await r2ListAll(env.IMAGES, 'trash/');
  const items = [];
  for (const o of objects) {
    const p = parseTrashKey(o.key);
    if (!p) continue;
    items.push({
      trashKey: o.key, originalKey: p.originalKey,
      name: p.originalKey.split('/').pop(),
      deletedAt: new Date(p.ts).toISOString(),
      size: o.size,
      daysLeft: Math.max(0, TRASH_DAYS - Math.floor((Date.now() - p.ts) / 86400000))
    });
  }
  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return json({ items, count: items.length, retentionDays: TRASH_DAYS });
}
async function handleTrashRestore(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const trashKey = body && body.trashKey;
  if (!trashKey || trashKey.indexOf('trash/') !== 0) return error('مفتاح سلة مهملات غير صالح', 400);
  const p = parseTrashKey(trashKey);
  if (!p) return error('مفتاح سلة مهملات غير صالح', 400);
  const obj = await env.IMAGES.get(trashKey);
  if (!obj) return error('العنصر غير موجود في سلة المهملات', 404);
  const buf = await obj.arrayBuffer();
  const bytes = new Uint8Array(buf);
  await env.IMAGES.put(p.originalKey, buf, {
    httpMetadata: { contentType: obj.httpMetadata?.contentType || sniffImageType(bytes) || imgCt(p.originalKey) }
  });
  await env.IMAGES.delete(trashKey);
  return json({ success: true, restored: p.originalKey });
}
async function handleTrashPurgeOne(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => null);
  const trashKey = body && body.trashKey;
  if (!trashKey || trashKey.indexOf('trash/') !== 0) return error('مفتاح سلة مهملات غير صالح', 400);
  await env.IMAGES.delete(trashKey);
  return json({ success: true, purged: trashKey });
}
async function purgeOldTrash(env, days) {
  const cutoff = Date.now() - (days || TRASH_DAYS) * 86400000;
  const objects = await r2ListAll(env.IMAGES, 'trash/');
  let removed = 0;
  for (const o of objects) {
    const p = parseTrashKey(o.key);
    if (p && p.ts < cutoff) {
      try { await env.IMAGES.delete(o.key); removed++; } catch (e) {}
    }
  }
  return removed;
}

// ═══════════════════════════════════════════
//  21) النسخ الاحتياطي (يشمل المنيو والإعدادات)
//  v2.9: اسم الملف بتاريخ الرياض
// ═══════════════════════════════════════════
async function buildAndStoreBackup(env) {
  const [orders, users, branches, tracking, ledger, appRow] = await Promise.all([
    env.DB.prepare('SELECT * FROM orders').all(),
    env.DB.prepare('SELECT id, name, phone, username, role, branch_id, is_active FROM users').all(),
    env.DB.prepare('SELECT * FROM branches').all(),
    env.DB.prepare("SELECT * FROM order_tracking WHERE created_at >= datetime('now', '-30 days')").all(),
    env.DB.prepare('SELECT * FROM order_ledger').all(),
    env.DB.prepare('SELECT * FROM app_data WHERE id = 1').first(),
  ]);

  let appData = null;
  if (appRow) {
    let menu = null, settings = null;
    try { menu = JSON.parse(appRow.menu_json); } catch (e) {}
    try { settings = JSON.parse(appRow.settings_json); } catch (e) {}
    appData = { menu, settings, updated_at: appRow.updated_at || null };
  }

  let imageKeys = [];
  try {
    const objs = await r2ListAll(env.IMAGES, 'img/');
    imageKeys = objs.map(o => ({ key: o.key, size: o.size }));
  } catch (e) {}

  const backup = {
    exported_at: new Date().toISOString(),
    local_date: localDateStr(),
    timezone: TZ_LABEL,
    version: '2.9',
    app_data: appData,
    images_inventory: imageKeys,
    branches: branches.results,
    users: users.results,
    orders: orders.results,
    order_tracking: tracking.results,
    order_ledger: ledger.results,
  };

  const key = `backups/backup-${localDateStr()}.json`;
  await env.BACKUPS.put(key, JSON.stringify(backup), {
    httpMetadata: { contentType: 'application/json' }
  });

  const list = await env.BACKUPS.list({ prefix: 'backups/' });
  if (list.objects.length > 30) {
    const sorted = list.objects.sort((a, b) => a.key.localeCompare(b.key));
    await env.BACKUPS.delete(sorted.slice(0, list.objects.length - 30).map(o => o.key));
  }

  let sections = 0, items = 0;
  if (appData && Array.isArray(appData.menu)) {
    sections = appData.menu.length;
    appData.menu.forEach(s => { items += (s.items || []).length; });
  }
  return {
    key,
    has_app_data: !!appData,
    menu_sections: sections,
    menu_items: items,
    settings_keys: appData && appData.settings ? Object.keys(appData.settings).length : 0,
    images_count: imageKeys.length,
    orders: orders.results.length,
    users: users.results.length
  };
}
async function handleBackupNow(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const info = await buildAndStoreBackup(env);
    return json({ success: true, message: 'تم إنشاء النسخة الاحتياطية (تشمل المنيو والإعدادات)', ...info });
  } catch (e) {
    console.error('Backup now error:', e);
    return error('فشل النسخ الاحتياطي: ' + e.message, 500);
  }
}
async function handleBackupList(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  const list = await env.BACKUPS.list({ prefix: 'backups/' });
  const items = list.objects
    .map(o => ({ key: o.key, name: o.key.split('/').pop(), size: o.size, uploaded: o.uploaded }))
    .sort((a, b) => b.key.localeCompare(a.key));
  return json({ items, count: items.length });
}

// ═══════════════════════════════════════════
//  22) صور الأصناف اليتيمة
// ═══════════════════════════════════════════
async function scanItemOrphans(env) {
  const row = await env.DB.prepare('SELECT menu_json FROM app_data WHERE id = 1').first();
  let menu = [];
  try { menu = row ? JSON.parse(row.menu_json) : []; } catch (e) { menu = []; }
  const used = {};
  let itemCount = 0;
  (Array.isArray(menu) ? menu : []).forEach(s => {
    (s.items || []).forEach(it => {
      if (it && it.id) { used['img/items/' + it.id + '.png'] = true; itemCount++; }
    });
  });
  const objects = await r2ListAll(env.IMAGES, 'img/items/');
  const orphans = objects.filter(o => !used[o.key]).map(o => ({
    key: o.key, name: o.key.split('/').pop(), size: o.size
  }));
  const totalBytes = orphans.reduce((a, b) => a + (b.size || 0), 0);
  return {
    ok: itemCount > 0,
    menu_items: itemCount,
    images_total: objects.length,
    orphans,
    orphan_count: orphans.length,
    orphan_bytes: totalBytes,
    ratio: objects.length ? orphans.length / objects.length : 0
  };
}
async function handleItemOrphans(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const s = await scanItemOrphans(env);
    if (!s.ok) return json({
      success: false,
      error: 'المنيو فارغ أو غير قابل للقراءة — أُلغي الفحص حمايةً للصور',
      menu_items: 0, images_total: s.images_total, orphans: [], orphan_count: 0
    });
    return json({
      success: true,
      menu_items: s.menu_items,
      images_total: s.images_total,
      orphan_count: s.orphan_count,
      orphan_bytes: s.orphan_bytes,
      high_risk: s.ratio > 0.8,
      orphans: s.orphans
    });
  } catch (e) { return error('فشل الفحص: ' + e.message, 500); }
}
async function handleItemOrphansClean(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;
  try {
    const s = await scanItemOrphans(env);
    if (!s.ok) return error('المنيو فارغ — أُلغي التنظيف حمايةً للصور', 409);
    if (!s.orphans.length) return json({ success: true, moved: 0, failed: 0, message: 'لا توجد صور يتيمة' });
    let moved = 0, failed = 0;
    for (const o of s.orphans) {
      try {
        const obj = await env.IMAGES.get(o.key);
        if (obj) {
          const buf = await obj.arrayBuffer();
          await env.IMAGES.put('trash/' + Date.now() + '/' + o.key, buf, {
            httpMetadata: { contentType: obj.httpMetadata?.contentType || imgCt(o.key) },
            customMetadata: { originalKey: o.key, deletedAt: new Date().toISOString(), reason: 'item-orphan' }
          });
        }
        await env.IMAGES.delete(o.key);
        moved++;
      } catch (e) { failed++; }
    }
    return json({ success: true, moved, failed, retentionDays: TRASH_DAYS });
  } catch (e) { return error('فشل التنظيف: ' + e.message, 500); }
}

// ═══════════════════════════════════════════
//  Router
// ═══════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/health' && request.method === 'GET') return json({
        status: 'ok',
        version: '2.9',
        features: ['r2-images','image-trash','trash-restore','backup-appdata','item-orphans','read-through-app-only','server-pricing','fee-mode-honored','order-caps','public-rate-limit','track-anti-enum','riyadh-time-reports'],
        live_mode: env.LIVE_MODE || 'polling',
        timezone: TZ_LABEL,
        local_date: localDateStr(),
        trash_days: TRASH_DAYS,
        limits: { max_qty_per_item: MAX_QTY_PER_ITEM, max_items_per_order: MAX_ITEMS_PER_ORDER }
      });
      if (path === '/api/recover-owner' && request.method === 'GET') return await handleRecoverOwner(request, env);

      /* ===== قراءة عامة بحد معدل (v2.8) ===== */
      if (path === '/api/data/menu' && request.method === 'GET') {
        const r = await checkRateLimit(env, `data:${getIP(request)}`, DATA_RATE_PER_MIN, 60);
        if (!r.allowed) return error('محاولات كثيرة — انتظر قليلاً', 429);
        return await handleGetMenu(env);
      }
      if (path === '/api/data/menu' && request.method === 'PUT') return await handleSaveMenu(request, env);
      if (path === '/api/data/settings' && request.method === 'GET') {
        const r = await checkRateLimit(env, `data:${getIP(request)}`, DATA_RATE_PER_MIN, 60);
        if (!r.allowed) return error('محاولات كثيرة — انتظر قليلاً', 429);
        return await handleGetSettings(env);
      }
      if (path === '/api/data/settings' && request.method === 'PUT') return await handleSaveSettings(request, env);
      if (path === '/api/migrate/github' && request.method === 'POST') return await handleMigrateFromGithub(request, env);
      if (path === '/api/auth/login' && request.method === 'POST') return await handleLogin(request, env);
      if (path === '/api/auth/admin-bridge' && request.method === 'POST') return await handleAdminBridge(request, env);
      if (path === '/api/auth/change-password' && request.method === 'POST') return await handleChangePassword(request, env);
      if (path === '/api/orders' && request.method === 'POST') return await handleCreateOrder(request, env);
      if (path.startsWith('/api/track/') && request.method === 'GET') return await handleTrackOrder(decodeURIComponent(path.split('/').pop()), request, env);
      if (path === '/api/branch/pool' && request.method === 'GET') return await handleBranchPool(request, env);
      if (path === '/api/supervisor/orders' && request.method === 'GET') return await handleSupervisorOrders(request, env);
      if (path === '/api/supervisor/drivers' && request.method === 'GET') return await handleSupervisorDrivers(request, env);
      if (path === '/api/driver/orders' && request.method === 'GET') return await handleDriverOrders(request, env);
      if (path === '/api/driver/location' && request.method === 'POST') return await handleDriverLocation(request, env);
      let m = path.match(/^\/api\/orders\/(\d+)\/status$/);
      if (m && request.method === 'PUT') return await handleUpdateStatus(parseInt(m[1]), request, env);
      m = path.match(/^\/api\/orders\/(\d+)\/assign$/);
      if (m && request.method === 'PUT') return await handleAssignDriver(parseInt(m[1]), request, env);
      m = path.match(/^\/api\/orders\/(\d+)\/claim$/);
      if (m && request.method === 'POST') return await handleClaim(parseInt(m[1]), request, env);
      m = path.match(/^\/api\/orders\/(\d+)\/photo$/);
      if (m && request.method === 'POST') return await handleUploadPhoto(parseInt(m[1]), request, env);
      if (m && request.method === 'GET') return await handleGetPhoto(parseInt(m[1]), request, env);
      if (path === '/api/admin/orders' && request.method === 'GET') return await handleAdminOrders(request, env);
      if (path === '/api/admin/users' && request.method === 'GET') return await handleAdminUsersList(request, env);
      if (path === '/api/admin/users' && request.method === 'POST') return await handleAdminUsersCreate(request, env);
      m = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (m && request.method === 'POST') return await handleAdminUsersReset(parseInt(m[1]), request, env);
      m = path.match(/^\/api\/admin\/users\/(\d+)$/);
      if (m && request.method === 'DELETE') return await handleAdminUsersDelete(parseInt(m[1]), request, env);
      if (m && request.method === 'PUT') return await handleAdminUsersUpdate(parseInt(m[1]), request, env);
      if (path === '/api/reports/summary' && request.method === 'GET') return await handleReportsSummary(request, env);
      if (path === '/api/reports/accounting' && request.method === 'GET') return await handleReportsAccounting(request, env);

      /* ===== النسخ الاحتياطي ===== */
      if (path === '/api/admin/backup-now' && request.method === 'POST') return await handleBackupNow(request, env);
      if (path === '/api/admin/backups' && request.method === 'GET') return await handleBackupList(request, env);

      /* ===== صور الأصناف اليتيمة ===== */
      if (path === '/api/admin/item-orphans' && request.method === 'GET') return await handleItemOrphans(request, env);
      if (path === '/api/admin/item-orphans-clean' && request.method === 'POST') return await handleItemOrphansClean(request, env);

      /* ===== سلة مهملات الصور ===== */
      if (path === '/api/img/trash' && request.method === 'GET') return await handleTrashList(request, env);
      if (path === '/api/img/restore' && request.method === 'POST') return await handleTrashRestore(request, env);
      if (path === '/api/img/purge' && request.method === 'POST') return await handleTrashPurgeOne(request, env);

      if (path === '/api/img' && request.method === 'GET') return await handleImgList(request, env);
      if (path.startsWith('/api/img/')) {
        const key = decodeURIComponent(path.slice('/api/img/'.length));
        if (!key) return error('مفتاح الصورة مطلوب', 400);
        if (request.method === 'GET') return await handleImgServe(key, env);
        if (request.method === 'PUT') return await handleImgPut(request, env, key);
        if (request.method === 'DELETE') return await handleImgDelete(request, env, key);
      }
      return error('Not found', 404);
    } catch (e) {
      console.error('Worker error:', e);
      return error('Internal server error: ' + e.message, 500);
    }
  },

  // ═════════════════════════════════════════
  //  المهام المجدولة
  //  ملاحظة: المقارنات النسبية (-7 days / -90 days) تبقى UTC — صحيحة
  //  لأنها الفرق بين طابعين UTC، لا تعتمد على بداية اليوم
  // ═════════════════════════════════════════
  async scheduled(event, env, ctx) {
    try {
      if (event.cron === '0 3 * * *') {
        await env.DB.prepare(`DELETE FROM used_order_numbers WHERE expires_at < date('now', '${TZ_OFFSET}')`).run();
        await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
        await env.DB.prepare("DELETE FROM driver_locations WHERE created_at < datetime('now', '-7 days')").run();
        await env.DB.prepare(`DELETE FROM order_tracking WHERE order_id IN (SELECT id FROM orders WHERE status = 'archived' AND updated_at < datetime('now', '-90 days'))`).run();

        /* حذف الطلبات المعلقة فقط الأقدم من 24 ساعة */
        const old = await env.DB.prepare(`SELECT * FROM orders WHERE status = 'pending' AND created_at < datetime('now', '-24 hours')`).all();
        for (const o of old.results) {
          await ledgerInsert(env, o, 'abandoned');
          await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(o.id).run();
        }

        await env.DB.prepare('DELETE FROM order_tracking WHERE order_id NOT IN (SELECT id FROM orders)').run();
        await env.DB.prepare('DELETE FROM driver_locations WHERE order_id NOT IN (SELECT id FROM orders)').run();
        await env.DB.prepare(`
          INSERT OR IGNORE INTO order_ledger
            (order_number, branch_id, order_type, kind, gross, fees, driver_id, created_at, closed_at)
          SELECT o.order_number, o.branch_id, o.order_type, 'delivered', o.total, o.delivery_fee, o.driver_id, o.created_at, COALESCE(o.delivered_at, o.updated_at)
          FROM orders o WHERE o.status = 'delivered'
            AND NOT EXISTS (SELECT 1 FROM order_ledger l WHERE l.order_number = o.order_number AND l.kind = 'delivered')
        `).run();
        await env.DB.prepare(`
          INSERT OR IGNORE INTO order_ledger
            (order_number, branch_id, order_type, kind, gross, fees, driver_id, created_at, closed_at)
          SELECT o.order_number, o.branch_id, o.order_type, 'cancelled', o.total, o.delivery_fee, o.driver_id, o.created_at, o.updated_at
          FROM orders o WHERE o.status = 'cancelled'
            AND NOT EXISTS (SELECT 1 FROM order_ledger l WHERE l.order_number = o.order_number AND l.kind = 'cancelled')
        `).run();

        /* نسخة احتياطية تشمل المنيو والإعدادات + جرد الصور */
        try {
          const info = await buildAndStoreBackup(env);
          console.log('backup ok:', JSON.stringify(info));
        } catch (e) { console.error('backup error:', e); }

        /* تفريغ سلة المهملات الأقدم من 30 يوماً */
        try {
          const removed = await purgeOldTrash(env, TRASH_DAYS);
          console.log('trash purged:', removed);
        } catch (e) { console.error('trash purge error:', e); }
      } else {
        await purgeStaleOrders(env);
      }
    } catch (e) { console.error('Cron error:', e); }
  },
};

// ═══════════════════════════════════════════
//  نهاية worker/index.js (v2.9)
// ═══════════════════════════════════════════
