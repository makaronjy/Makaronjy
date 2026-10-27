// ═══════════════════════════════════════════
//  مكرونجي - Cloudflare Worker API (كامل)
//  نظام تتبع الطلبات الحي
//  الإصدار: 1.0
// ═══════════════════════════════════════════

// ───────────────────────────────────────────
//  CORS Headers
// ───────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ───────────────────────────────────────────
//  نصوص الحالات (عربي)
// ───────────────────────────────────────────
const STATUS_TEXT = {
  pending: 'بانتظار القبول',
  accepted: 'تم قبول الطلب',
  preparing: 'جاري التحضير',
  ready: 'جاهز للتسليم',
  driver_assigned: 'تم تعيين السائق',
  driver_at_restaurant: 'السائق في المطعم',
  out_for_delivery: 'في الطريق إليك',
  delivered: 'تم التسليم',
  cancelled: 'تم الإلغاء',
  archived: 'مؤرشف',
};

// ───────────────────────────────────────────
//  خريطة انتقالات الحالات (قواعد صارمة)
// ───────────────────────────────────────────
const STATUS_TRANSITIONS = {
  pending:              ['accepted', 'cancelled'],
  accepted:             ['preparing', 'cancelled'],
  preparing:            ['ready', 'cancelled'],
  ready:                [],  // التعيين فقط عبر /assign
  driver_assigned:      ['driver_at_restaurant', 'ready'], // ready = اعتذار السائق
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
  driver_assigned:      ['driver', 'super_admin'],  // اعتذار السائق
  driver_at_restaurant: ['driver', 'super_admin'],
  out_for_delivery:     ['driver', 'super_admin'],
  delivered:            ['driver', 'super_admin'],
  archived:             ['super_admin'],
};

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
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 1000);
}

function getIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For') ||
         'unknown';
}

// ───────────────────────────────────────────
//  Rate Limiting
// ───────────────────────────────────────────
async function checkRateLimit(env, key, limit = 100, ttl = 60) {
  try {
    const current = parseInt(await env.KV.get(key) || '0');
    if (current >= limit) return { allowed: false, remaining: 0 };
    await env.KV.put(key, String(current + 1), { expirationTtl: ttl });
    return { allowed: true, remaining: limit - current - 1 };
  } catch (e) {
    return { allowed: true, remaining: -1 };
  }
}

// ═══════════════════════════════════════════
//  توليد رقم الطلب (12345A#)
// ═══════════════════════════════════════════
async function generateOrderNumber(db) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * 26)];

  const counter = await db.prepare(
    'SELECT current_num FROM order_counters WHERE letter = ?'
  ).bind(letter).first();

  let nextNum = (counter?.current_num || 0) + 1;
  if (nextNum > 99999) nextNum = 1;

  const orderNumber = `${String(nextNum).padStart(5, '0')}${letter}#`;

  const exists = await db.prepare(
    'SELECT 1 FROM used_order_numbers WHERE order_number = ?'
  ).bind(orderNumber).first();

  if (exists) return generateOrderNumber(db);

  await db.prepare(
    'UPDATE order_counters SET current_num = ?, last_reset = CURRENT_DATE WHERE letter = ?'
  ).bind(nextNum, letter).run();

  await db.prepare(`
    INSERT INTO used_order_numbers (order_number, created_at, expires_at)
    VALUES (?, CURRENT_DATE, DATE('now', '+1 year'))
  `).bind(orderNumber).run();

  return orderNumber;
}

// ═══════════════════════════════════════════
//  تشفير كلمات المرور (PBKDF2-SHA256)
// ═══════════════════════════════════════════
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, storedHash, salt) {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// ═══════════════════════════════════════════
//  JWT Tokens
// ═══════════════════════════════════════════
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function createJWT(payload, secret) {
  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${data}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const signatureBuffer = new Uint8Array(
      base64UrlDecode(signature).split('').map(c => c.charCodeAt(0))
    );
    const valid = await crypto.subtle.verify(
      'HMAC', key, signatureBuffer,
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;

    const decoded = JSON.parse(base64UrlDecode(payload));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch (e) {
    return null;
  }
}

function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

// ═══════════════════════════════════════════
//  التحقق من التوكن والصلاحيات
// ═══════════════════════════════════════════
async function requireAuth(request, env, allowedRoles) {
  const token = extractToken(request);
  if (!token) return { error: error('غير مصرح: لا يوجد توكن', 401) };

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return { error: error('غير مصرح: التوكن منتهي أو غير صالح', 401) };

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE id = ? AND is_active = 1'
  ).bind(payload.userId).first();

  if (!user) return { error: error('الحساب معطل أو غير موجود', 403) };
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { error: error('صلاحيات غير كافية', 403) };
  }
  return { user };
}

// ═══════════════════════════════════════════
//  1) تسجيل الدخول
//  POST /api/auth/login
// ═══════════════════════════════════════════
async function handleLogin(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `login:${ip}`, 5, 900);
  if (!rateCheck.allowed) return error('محاولات كثيرة، حاول بعد 15 دقيقة', 429);

  const body = await request.json().catch(() => null);
  if (!body || !body.username || !body.password) return error('بيانات ناقصة');

  const username = sanitize(body.username);
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND is_active = 1'
  ).bind(username).first();

  if (!user) return error('بيانات الدخول غير صحيحة', 401);

  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return error('بيانات الدخول غير صحيحة', 401);

  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branch_id,
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

  await env.DB.prepare(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(user.id).run();

  return json({
    success: true,
    token,
    sessionToken,
    user: {
      id: user.id, name: user.name, username: user.username,
      role: user.role, branchId: user.branch_id,
      mustChangePassword: user.must_change_password === 1,
    },
  });
}

// ═══════════════════════════════════════════
//  2) جسر المالك (توكن GitHub → JWT داخلي)
//  POST /api/auth/admin-bridge
// ═══════════════════════════════════════════
async function handleAdminBridge(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `bridge:${ip}`, 5, 900);
  if (!rateCheck.allowed) return error('محاولات كثيرة', 429);

  const body = await request.json().catch(() => null);
  if (!body || !body.github_token) return error('التوكن مطلوب');

  // التحقق من التوكن لدى GitHub
  let ghUser;
  try {
    const r = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${body.github_token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!r.ok) return error('توكن GitHub غير صالح', 401);
    ghUser = await r.json();
  } catch (e) {
    return error('تعذر الاتصال بـ GitHub', 502);
  }

  // التحقق أن لديه صلاحية push على المستودع
  const owner = env.GH_OWNER || 'makaronjy';
  const repo = env.GH_REPO || 'Makaronjy';
  try {
    const r2 = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${body.github_token}`,
        'Accept': 'application/vnd.github+json',
      },
    });
    if (!r2.ok) return error('لا تملك صلاحية على المستودع', 403);
    const repoData = await r2.json();
    if (!repoData.permissions || !repoData.permissions.push) {
      return error('لا تملك صلاحية الكتابة على المستودع', 403);
    }
  } catch (e) {
    return error('تعذر التحقق من المستودع', 502);
  }

  // إيجاد حساب المالك في قاعدة البيانات
  const ownerUser = await env.DB.prepare(
    "SELECT * FROM users WHERE role = 'super_admin' AND is_active = 1 LIMIT 1"
  ).first();

  if (!ownerUser) return error('حساب المالك غير موجود في قاعدة البيانات', 500);

  const payload = {
    userId: ownerUser.id,
    username: ownerUser.username,
    role: 'super_admin',
    branchId: null,
    mustChangePassword: false,
    via: 'github_bridge',
    gh_login: ghUser.login,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 43200, // 12 ساعة
  };
  const token = await createJWT(payload, env.JWT_SECRET);

  return json({ success: true, token, user: {
    id: ownerUser.id, name: ownerUser.name,
    username: ownerUser.username, role: 'super_admin',
  }});
}

// ═══════════════════════════════════════════
//  3) تغيير كلمة المرور
//  POST /api/auth/change-password
// ═══════════════════════════════════════════
async function handleChangePassword(request, env) {
  const auth = await requireAuth(request, env, null);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || !body.new_password) return error('كلمة المرور الجديدة مطلوبة');
  const newPass = body.new_password;

  if (newPass.length < 8) return error('كلمة المرور 8 أحرف على الأقل');
  if (!/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
    return error('يجب أن تحتوي حرف كبير وصغير ورقم');
  }

  const salt = generateSalt();
  const hash = await hashPassword(newPass, salt);
  await env.DB.prepare(`
    UPDATE users SET password_hash = ?, password_salt = ?,
      must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(hash, salt, auth.user.id).run();

  return json({ success: true, message: 'تم تغيير كلمة المرور' });
}

// ═══════════════════════════════════════════
//  4) إنشاء طلب جديد
//  POST /api/orders
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

  if (!customerName || customerName.length < 2) return error('الاسم مطلوب (حرفان على الأقل)');
  if (!customerPhone || !/^\d{9,15}$/.test(customerPhone.replace(/[^0-9]/g, ''))) {
    return error('رقم الجوال غير صحيح');
  }
  if (!branchId) return error('الفرع مطلوب');
  if (items.length === 0) return error('السلة فارغة');

  const branch = await env.DB.prepare(
    'SELECT * FROM branches WHERE id = ? AND is_active = 1'
  ).bind(branchId).first();
  if (!branch) return error('الفرع غير موجود');

  let subtotal = 0;
  const cleanItems = items.map(item => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const price = Math.max(0, parseFloat(item.price) || 0);
    subtotal += qty * price;
    return {
      id: sanitize(item.id || ''),
      name: sanitize(item.name || ''),
      qty, price,
      size: sanitize(item.size || ''),
    };
  });

  // رسوم التوصيل حسب الوضع
  let deliveryFee = 0;
  const feeMode = body.delivery_fee_mode || 'free';
  if (feeMode === 'fixed') deliveryFee = parseFloat(body.delivery_fee) || 5;
  else if (feeMode === 'per_branch') deliveryFee = branch.delivery_fee || 10;

  const total = subtotal + deliveryFee;
  const orderNumber = await generateOrderNumber(env.DB);

  const customerLat = parseFloat(body.customer_lat) || null;
  const customerLng = parseFloat(body.customer_lng) || null;
  const customerAddress = sanitize(body.customer_address || '');

  const result = await env.DB.prepare(`
    INSERT INTO orders (
      order_number, branch_id, customer_name, customer_phone, customer_address,
      customer_lat, customer_lng, items_json, subtotal,
      delivery_fee, total, payment_method, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', ?)
  `).bind(
    orderNumber, branchId, customerName, customerPhone, customerAddress,
    customerLat, customerLng, JSON.stringify(cleanItems),
    subtotal, deliveryFee, total, notes
  ).run();

  const orderId = result.meta.last_row_id;

  await env.DB.prepare(`
    INSERT INTO order_tracking (order_id, status, notes)
    VALUES (?, 'pending', 'تم استلام الطلب')
  `).bind(orderId).run();

  return json({
    success: true,
    order_number: orderNumber,
    order_id: orderId,
    total, delivery_fee: deliveryFee,
    branch_name: branch.name_ar,
    branch_phone: branch.phone,
    track_url: `${env.SITE_URL || ''}/track.html?order=${encodeURIComponent(orderNumber)}`,
  }, 201);
}

// ═══════════════════════════════════════════
//  5) تتبع الطلب (للعميل - بدون توكن)
//  GET /api/track/:number
// ═══════════════════════════════════════════
async function handleTrackOrder(orderNumber, env) {
  const order = await env.DB.prepare(`
    SELECT o.*,
      b.name_ar as branch_name, b.phone as branch_phone,
      b.lat as branch_lat, b.lng as branch_lng,
      u.name as driver_name, u.phone as driver_phone
    FROM orders o
    JOIN branches b ON o.branch_id = b.id
    LEFT JOIN users u ON o.driver_id = u.id
    WHERE o.order_number = ?
  `).bind(orderNumber).first();

  if (!order) return error('الطلب غير موجود', 404);

  const trackingResult = await env.DB.prepare(`
    SELECT status, notes, created_at FROM order_tracking
    WHERE order_id = ? ORDER BY created_at ASC
  `).bind(order.id).all();

  let driverLocation = null;
  if (order.driver_id && order.status !== 'delivered' && order.status !== 'cancelled') {
    driverLocation = await env.DB.prepare(`
      SELECT lat, lng, created_at FROM driver_locations
      WHERE order_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(order.id).first();
  }

  return json({
    order: {
      number: order.order_number,
      status: order.status,
      status_text: STATUS_TEXT[order.status] || order.status,
      customer_name: order.customer_name,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total: order.total,
      payment_method: order.payment_method,
      created_at: order.created_at,
      items: JSON.parse(order.items_json),
      notes: order.notes,
    },
    branch: {
      name: order.branch_name,
      phone: order.branch_phone,
      lat: order.branch_lat, lng: order.branch_lng,
    },
    driver: order.driver_id ? {
      name: order.driver_name,
      phone: order.driver_phone,
      lat: driverLocation?.lat || order.driver_lat,
      lng: driverLocation?.lng || order.driver_lng,
      last_update: driverLocation?.created_at || null,
    } : null,
    tracking: trackingResult.results,
    live_mode: env.LIVE_MODE || 'polling',
  });
}

// ═══════════════════════════════════════════
//  6) طلبات الفرع (المشرف)
//  GET /api/supervisor/orders?status=
// ═══════════════════════════════════════════
async function handleSupervisorOrders(request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  let query = `
    SELECT o.*, u.name as driver_name, u.phone as driver_phone
    FROM orders o LEFT JOIN users u ON o.driver_id = u.id
    WHERE o.branch_id = ?
  `;
  const params = [auth.user.branch_id];
  if (statusFilter) { query += ' AND o.status = ?'; params.push(statusFilter); }
  query += ' ORDER BY o.created_at DESC LIMIT 100';

  const result = await env.DB.prepare(query).bind(...params).all();

  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number,
    customer_name: o.customer_name, customer_phone: o.customer_phone,
    customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng,
    items: JSON.parse(o.items_json),
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total,
    payment_method: o.payment_method,
    status: o.status, status_text: STATUS_TEXT[o.status] || o.status,
    driver_id: o.driver_id, driver_name: o.driver_name, driver_phone: o.driver_phone,
    notes: o.notes, created_at: o.created_at,
  }));

  return json({ orders, count: orders.length });
}

// ═══════════════════════════════════════════
//  7) سائقو الفرع (لقائمة التعيين)
//  GET /api/supervisor/drivers
// ═══════════════════════════════════════════
async function handleSupervisorDrivers(request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;

  const result = await env.DB.prepare(`
    SELECT id, name, phone, username, is_active FROM users
    WHERE branch_id = ? AND role = 'driver' AND is_active = 1
    ORDER BY name
  `).bind(auth.user.branch_id).all();

  return json({ drivers: result.results });
}

// ═══════════════════════════════════════════
//  8) توصيلات السائق + إحصائياته
//  GET /api/driver/orders
// ═══════════════════════════════════════════
async function handleDriverOrders(request, env) {
  const auth = await requireAuth(request, env, ['driver']);
  if (auth.error) return auth.error;

  const result = await env.DB.prepare(`
    SELECT o.*, b.name_ar as branch_name
    FROM orders o JOIN branches b ON o.branch_id = b.id
    WHERE o.driver_id = ?
      AND o.status IN ('driver_assigned','driver_at_restaurant','out_for_delivery','delivered')
    ORDER BY o.created_at DESC LIMIT 50
  `).bind(auth.user.id).all();

  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name,
    customer_name: o.customer_name, customer_phone: o.customer_phone,
    customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng,
    total: o.total, delivery_fee: o.delivery_fee,
    status: o.status, status_text: STATUS_TEXT[o.status] || o.status,
    created_at: o.created_at,
  }));

  const today = await env.DB.prepare(`
    SELECT COUNT(*) as total_delivered, SUM(delivery_fee) as earnings
    FROM orders
    WHERE driver_id = ? AND status = 'delivered' AND date(delivered_at) = date('now')
  `).bind(auth.user.id).first();

  return json({
    orders,
    stats: {
      delivered_today: today?.total_delivered || 0,
      earnings_today: today?.earnings || 0,
    },
  });
}

// ═══════════════════════════════════════════
//  9) تغيير حالة الطلب
//  PUT /api/orders/:id/status
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

  const allowed = STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return error(`لا يمكن الانتقال من ${order.status} إلى ${newStatus}`, 409);
  }

  const rolesAllowed = STATUS_ROLES[newStatus] || [];
  if (!rolesAllowed.includes(user.role)) return error('ليس لديك صلاحية لهذا الإجراء', 403);

  if (user.role === 'supervisor' && user.branch_id !== order.branch_id) {
    return error('هذا الطلب ليس من فرعك', 403);
  }
  if (user.role === 'driver' && order.driver_id !== user.id) {
    return error('هذا الطلب ليس مسنداً إليك', 403);
  }

  if (newStatus === 'delivered') {
    await env.DB.prepare(`
      UPDATE orders SET status = ?, delivered_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newStatus, orderId).run();
  } else {
    await env.DB.prepare(`
      UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newStatus, orderId).run();
  }

  await env.DB.prepare(`
    INSERT INTO order_tracking (order_id, status, notes) VALUES (?, ?, ?)
  `).bind(orderId, newStatus, sanitize(body.notes || '')).run();

  return json({
    success: true, order_id: orderId,
    old_status: order.status, new_status: newStatus,
  });
}

// ═══════════════════════════════════════════
//  10) تعيين سائق
//  PUT /api/orders/:id/assign
// ═══════════════════════════════════════════
async function handleAssignDriver(orderId, request, env) {
  const auth = await requireAuth(request, env, ['supervisor', 'super_admin']);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || !body.driver_id) return error('معرف السائق مطلوب');

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);

  if (auth.user.role === 'supervisor' && auth.user.branch_id !== order.branch_id) {
    return error('هذا الطلب ليس من فرعك', 403);
  }
  if (order.status !== 'ready') return error('الطلب ليس في حالة "جاهز للتسليم"', 409);

  const driver = await env.DB.prepare(`
    SELECT * FROM users WHERE id = ? AND role = 'driver' AND is_active = 1 AND branch_id = ?
  `).bind(body.driver_id, order.branch_id).first();
  if (!driver) return error('السائق غير موجود في هذا الفرع أو معطل', 404);

  await env.DB.prepare(`
    UPDATE orders SET status = 'driver_assigned', driver_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(driver.id, orderId).run();

  await env.DB.prepare(`
    INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'driver_assigned', ?)
  `).bind(orderId, `تم تعيين السائق: ${driver.name}`).run();

  return json({
    success: true, order_id: orderId,
    driver_id: driver.id, driver_name: driver.name, driver_phone: driver.phone,
  });
}

// ═══════════════════════════════════════════
//  11) موقع السائق
//  POST /api/driver/location
// ═══════════════════════════════════════════
async function handleDriverLocation(request, env) {
  const auth = await requireAuth(request, env, ['driver']);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');

  const orderId = parseInt(body.order_id);
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  const speed = parseFloat(body.speed) || 0;
  const heading = parseFloat(body.heading) || 0;

  if (!orderId || !isFinite(lat) || !isFinite(lng)) return error('إحداثيات غير صالحة');

  const order = await env.DB.prepare(`
    SELECT * FROM orders WHERE id = ? AND driver_id = ?
      AND status IN ('driver_assigned','driver_at_restaurant','out_for_delivery')
  `).bind(orderId, auth.user.id).first();
  if (!order) return error('لا يوجد توصيل نشط بهذا الرقم', 404);

  await env.DB.prepare(`
    INSERT INTO driver_locations (order_id, driver_id, lat, lng, speed, heading)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(orderId, auth.user.id, lat, lng, speed, heading).run();

  await env.DB.prepare(
    'UPDATE orders SET driver_lat = ?, driver_lng = ? WHERE id = ?'
  ).bind(lat, lng, orderId).run();

  return json({ success: true, received_at: new Date().toISOString() });
}

// ═══════════════════════════════════════════
//  12) صورة التسليم
//  POST /api/orders/:id/photo
// ═══════════════════════════════════════════
async function handleUploadPhoto(orderId, request, env) {
  const auth = await requireAuth(request, env, ['driver', 'super_admin']);
  if (auth.error) return auth.error;

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('الطلب غير موجود', 404);
  if (auth.user.role === 'driver' && order.driver_id !== auth.user.id) {
    return error('هذا الطلب ليس مسنداً إليك', 403);
  }

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
    await env.IMAGES.put(photoKey, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
  }

  await env.DB.prepare(
    'UPDATE orders SET delivery_photo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(photoKey, orderId).run();

  return json({ success: true, photo_key: photoKey });
}

// ═══════════════════════════════════════════
//  13) كل الطلبات (المالك) + فلاتر
//  GET /api/admin/orders
// ═══════════════════════════════════════════
async function handleAdminOrders(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const branchId = url.searchParams.get('branch_id');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  const dateFrom = url.searchParams.get('from');
  const dateTo = url.searchParams.get('to');

  let query = `
    SELECT o.*, b.name_ar as branch_name, u.name as driver_name
    FROM orders o
    JOIN branches b ON o.branch_id = b.id
    LEFT JOIN users u ON o.driver_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (branchId) { query += ' AND o.branch_id = ?'; params.push(branchId); }
  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (search) {
    query += ' AND (o.order_number LIKE ? OR o.customer_phone LIKE ? OR o.customer_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (dateFrom) { query += ' AND date(o.created_at) >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND date(o.created_at) <= ?'; params.push(dateTo); }

  query += ' ORDER BY o.created_at DESC LIMIT 200';

  const result = await env.DB.prepare(query).bind(...params).all();

  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name,
    customer_name: o.customer_name, customer_phone: o.customer_phone,
    total: o.total, delivery_fee: o.delivery_fee,
    payment_method: o.payment_method, payment_status: o.payment_status,
    status: o.status, status_text: STATUS_TEXT[o.status] || o.status,
    driver_name: o.driver_name, created_at: o.created_at,
  }));

  return json({ orders, count: orders.length });
}

// ═══════════════════════════════════════════
//  14) إدارة المستخدمين (المالك)
//  GET/POST /api/admin/users
//  PUT /api/admin/users/:id
//  POST /api/admin/users/:id/reset-password
// ═══════════════════════════════════════════
async function handleAdminUsersList(request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;

  const result = await env.DB.prepare(`
    SELECT u.id, u.name, u.phone, u.username, u.role, u.branch_id,
           u.is_active, u.must_change_password, u.last_login, u.created_at,
           b.name_ar as branch_name
    FROM users u LEFT JOIN branches b ON u.branch_id = b.id
    ORDER BY u.role, u.name
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
  if (role === 'supervisor' && !branchId) return error('المشرف يحتاج فرعاً');
  if (role === 'driver' && !branchId) return error('السائق يحتاج فرعاً');

  const exists = await env.DB.prepare(
    'SELECT 1 FROM users WHERE username = ?'
  ).bind(username).first();
  if (exists) return error('اسم المستخدم مستخدم بالفعل', 409);

  const tempPass = password || ('Mk@' + generateSalt().slice(0, 8));
  const salt = generateSalt();
  const hash = await hashPassword(tempPass, salt);

  const result = await env.DB.prepare(`
    INSERT INTO users (name, phone, username, password_hash, password_salt, role, branch_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).bind(name, phone, username, hash, salt, role, branchId).run();

  return json({
    success: true,
    user_id: result.meta.last_row_id,
    username,
    temp_password: tempPass,  // يُعرض مرة واحدة فقط
    note: 'سلّم كلمة المرور للموظف الآن – لن تظهر مرة أخرى',
  }, 201);
}

async function handleAdminUsersUpdate(userId, request, env) {
  const auth = await requireAuth(request, env, ['super_admin']);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return error('المستخدم غير موجود', 404);

  const name = body.name !== undefined ? sanitize(body.name) : user.name;
  const phone = body.phone !== undefined ? sanitize(body.phone) : user.phone;
  const branchId = body.branch_id !== undefined ? sanitize(body.branch_id) : user.branch_id;
  const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : user.is_active;

  await env.DB.prepare(`
    UPDATE users SET name = ?, phone = ?, branch_id = ?, is_active = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(name, phone, branchId, isActive, userId).run();

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

  await env.DB.prepare(`
    UPDATE users SET password_hash = ?, password_salt = ?,
      must_change_password = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(hash, salt, userId).run();

  return json({
    success: true, username: user.username,
    temp_password: tempPass,
    note: 'سلّم كلمة المرور للموظف الآن – لن تظهر مرة أخرى',
  });
}

// ═══════════════════════════════════════════
//  15) التقارير والإحصائيات
//  GET /api/reports/summary?branch_id=&period=today|week|month
// ═══════════════════════════════════════════
async function handleReportsSummary(request, env) {
  const auth = await requireAuth(request, env, ['super_admin', 'supervisor']);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  let branchId = url.searchParams.get('branch_id');
  const period = url.searchParams.get('period') || 'today';

  // المشرف يرى فرعه فقط
  if (auth.user.role === 'supervisor') branchId = auth.user.branch_id;

  const dateCondition = {
    today: "date(o.created_at) = date('now')",
    week: "date(o.created_at) >= date('now', '-7 days')",
    month: "date(o.created_at) >= date('now', '-30 days')",
  }[period] || "date(o.created_at) = date('now')";

  let where = dateCondition;
  const params = [];
  if (branchId) { where += ' AND o.branch_id = ?'; params.push(branchId); }

  const totals = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END) as revenue,
      AVG(CASE WHEN o.status = 'delivered' THEN o.total ELSE NULL END) as avg_order
    FROM orders o WHERE ${where}
  `).bind(...params).first();

  // أداء الفروع (للمالك فقط)
  let perBranch = [];
  if (auth.user.role === 'super_admin') {
    const pb = await env.DB.prepare(`
      SELECT b.name_ar as branch_name,
        COUNT(*) as orders_count,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END) as revenue
      FROM orders o JOIN branches b ON o.branch_id = b.id
      WHERE ${dateCondition}
      GROUP BY o.branch_id ORDER BY revenue DESC
    `).all();
    perBranch = pb.results;
  }

  // أداء السائقين
  const driversParams = branchId ? [branchId] : [];
  const drivers = await env.DB.prepare(`
    SELECT u.name as driver_name,
      COUNT(*) as deliveries,
      SUM(o.delivery_fee) as earnings
    FROM orders o JOIN users u ON o.driver_id = u.id
    WHERE o.status = 'delivered' AND ${where.replace(/o\.created_at/g, 'o.delivered_at')}
      ${branchId ? 'AND o.branch_id = ?' : ''}
    GROUP BY o.driver_id ORDER BY deliveries DESC
  `).bind(...driversParams).all();

  // الأكثر مبيعاً
  let topItems = [];
  try {
    const ti = await env.DB.prepare(`
      SELECT json_extract(j.value, '$.name') as name,
        SUM(CAST(json_extract(j.value, '$.qty') AS INTEGER)) as qty
      FROM orders o, json_each(o.items_json) j
      WHERE o.status = 'delivered' AND ${where}
        ${branchId ? 'AND o.branch_id = ?' : ''}
      GROUP BY name ORDER BY qty DESC LIMIT 5
    `).bind(...(branchId ? [branchId] : [])).all();
    topItems = ti.results;
  } catch (e) { topItems = []; }

  return json({
    period,
    totals: {
      total_orders: totals?.total_orders || 0,
      delivered: totals?.delivered || 0,
      cancelled: totals?.cancelled || 0,
      revenue: totals?.revenue || 0,
      avg_order: Math.round(totals?.avg_order || 0),
    },
    per_branch: perBranch,
    drivers: drivers.results,
    top_items: topItems,
  });
}

// ═══════════════════════════════════════════
//  المعالج الرئيسي (Router)
// ═══════════════════════════════════════════
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ─── الصحة ───
      if (path === '/api/health' && request.method === 'GET') {
        return json({ status: 'ok', version: '1.0', live_mode: env.LIVE_MODE || 'polling' });
      }

      // ─── المصادقة ───
      if (path === '/api/auth/login' && request.method === 'POST') return await handleLogin(request, env);
      if (path === '/api/auth/admin-bridge' && request.method === 'POST') return await handleAdminBridge(request, env);
      if (path === '/api/auth/change-password' && request.method === 'POST') return await handleChangePassword(request, env);

      // ─── العميل (بدون توكن) ───
      if (path === '/api/orders' && request.method === 'POST') return await handleCreateOrder(request, env);
      if (path.startsWith('/api/track/') && request.method === 'GET') {
        return await handleTrackOrder(decodeURIComponent(path.split('/').pop()), env);
      }

      // ─── المشرف ───
      if (path === '/api/supervisor/orders' && request.method === 'GET') return await handleSupervisorOrders(request, env);
      if (path === '/api/supervisor/drivers' && request.method === 'GET') return await handleSupervisorDrivers(request, env);

      // ─── السائق ───
      if (path === '/api/driver/orders' && request.method === 'GET') return await handleDriverOrders(request, env);
      if (path === '/api/driver/location' && request.method === 'POST') return await handleDriverLocation(request, env);

      // ─── الطلبات: حالات/تعيين/صورة ───
      let m = path.match(/^\/api\/orders\/(\d+)\/status$/);
      if (m && request.method === 'PUT') return await handleUpdateStatus(parseInt(m[1]), request, env);

      m = path.match(/^\/api\/orders\/(\d+)\/assign$/);
      if (m && request.method === 'PUT') return await handleAssignDriver(parseInt(m[1]), request, env);

      m = path.match(/^\/api\/orders\/(\d+)\/photo$/);
      if (m && request.method === 'POST') return await handleUploadPhoto(parseInt(m[1]), request, env);

      // ─── المالك ───
      if (path === '/api/admin/orders' && request.method === 'GET') return await handleAdminOrders(request, env);
      if (path === '/api/admin/users' && request.method === 'GET') return await handleAdminUsersList(request, env);
      if (path === '/api/admin/users' && request.method === 'POST') return await handleAdminUsersCreate(request, env);

      m = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
      if (m && request.method === 'POST') return await handleAdminUsersReset(parseInt(m[1]), request, env);

      m = path.match(/^\/api\/admin\/users\/(\d+)$/);
      if (m && request.method === 'PUT') return await handleAdminUsersUpdate(parseInt(m[1]), request, env);

      // ─── التقارير ───
      if (path === '/api/reports/summary' && request.method === 'GET') return await handleReportsSummary(request, env);

      return error('Not found', 404);

    } catch (e) {
      console.error('Worker error:', e);
      return error('Internal server error: ' + e.message, 500);
    }
  },

  // ═════════════════════════════════════════
  //  المهام المجدولة (Cron)
  //  "0 3 * * *"  = يومياً 3 فجراً: تنظيف + نسخ احتياطي
  //  "0 *\/6 * * *" = كل 6 ساعات: تنظيف الجلسات
  // ═════════════════════════════════════════
  async scheduled(event, env, ctx) {
    try {
      // تنظيف الأرقام المنتهية (إعادة التدوير الآمنة)
      await env.DB.prepare(
        "DELETE FROM used_order_numbers WHERE expires_at < date('now')"
      ).run();

      // تنظيف الجلسات المنتهية
      await env.DB.prepare(
        "DELETE FROM sessions WHERE expires_at < datetime('now')"
      ).run();

      // تنظيف مواقع السائقين الأقدم من 7 أيام
      await env.DB.prepare(
        "DELETE FROM driver_locations WHERE created_at < datetime('now', '-7 days')"
      ).run();

      // تنظيف سجلات التتبع للطلبات المؤرشفة الأقدم من 90 يوماً
      await env.DB.prepare(`
        DELETE FROM order_tracking WHERE order_id IN (
          SELECT id FROM orders
          WHERE status = 'archived' AND updated_at < datetime('now', '-90 days')
        )
      `).run();

      // نسخ احتياطي يومي (3 فجراً فقط)
      if (event.cron === '0 3 * * *') {
        const [orders, users, branches, tracking] = await Promise.all([
          env.DB.prepare('SELECT * FROM orders').all(),
          env.DB.prepare('SELECT id, name, phone, username, role, branch_id, is_active FROM users').all(),
          env.DB.prepare('SELECT * FROM branches').all(),
          env.DB.prepare(`
            SELECT * FROM order_tracking WHERE created_at >= datetime('now', '-30 days')
          `).all(),
        ]);

        const backup = {
          exported_at: new Date().toISOString(),
          branches: branches.results,
          users: users.results,
          orders: orders.results,
          order_tracking: tracking.results,
        };

        const key = `backups/backup-${new Date().toISOString().slice(0, 10)}.json`;
        await env.BACKUPS.put(key, JSON.stringify(backup));

        // الاحتفاظ بآخر 30 نسخة فقط
        const list = await env.BACKUPS.list({ prefix: 'backups/' });
        if (list.objects.length > 30) {
          const sorted = list.objects.sort((a, b) => a.key.localeCompare(b.key));
          const toDelete = sorted.slice(0, list.objects.length - 30);
          await env.BACKUPS.delete(toDelete.map(o => o.key));
        }
      }
    } catch (e) {
      console.error('Cron error:', e);
    }
  },
};

// ═══════════════════════════════════════════
//  نهاية worker/index.js
// ═══════════════════════════════════════════
