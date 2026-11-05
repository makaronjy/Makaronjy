// ═══════════════════════════════════════════
//  مكرونجي - Cloudflare Worker API (كامل)
//  الإصدار: 1.7
//  v1.7: حذف كسول فوري للطلبات المتوقفة ساعة
//        (يعمل عند فتح أي صفحة — لا ينتظر Cron)
//  يحتوي كل ميزات v1.6:
//  • دفتر محاسبي دائم order_ledger
//  • قاعدة الساعة + GET صورة الإثبات + accounting
//  • حوض الطلبات + claim + login بالأسماء
//  • أرقام عشوائية بدون # + مساران استلام/توصيل
// ═══════════════════════════════════════════

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

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
  delivered_pickup: 'تم استلام الطلب من الفرع ✅',
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
function getIP(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
}
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
//  v1.7: الحذف الكسول — أي طلب غير مسلّم توقف ساعة
//  يُقيَّد في الدفتر (إن لم يُقيَّد بعد) ثم يُحذف نهائياً
// ═══════════════════════════════════════════
async function purgeStaleOrders(env) {
  try {
    const stale = await env.DB.prepare(`
      SELECT * FROM orders
      WHERE status NOT IN ('delivered','archived')
        AND updated_at < datetime('now', '-1 hour')
    `).all();
    if (!stale.results.length) return 0;
    for (const o of stale.results) {
      const already = await env.DB.prepare(
        'SELECT 1 FROM order_ledger WHERE order_number = ?'
      ).bind(o.order_number).first();
      if (!already) await ledgerInsert(env, o, 'abandoned');
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(o.id).run();
    }
    await env.DB.prepare('DELETE FROM order_tracking WHERE order_id NOT IN (SELECT id FROM orders)').run();
    await env.DB.prepare('DELETE FROM driver_locations WHERE order_id NOT IN (SELECT id FROM orders)').run();
    return stale.results.length;
  } catch (e) {
    console.error('purge error:', e);
    return 0;
  }
}

// ═══════════════════════════════════════════
//  توليد رقم طلب عشوائي (بدون #)
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
      VALUES (?, CURRENT_DATE, DATE('now', '+1 year'))
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
//  2) جسر المالك
// ═══════════════════════════════════════════
async function handleAdminBridge(request, env) {
  const ip = getIP(request);
  const rateCheck = await checkRateLimit(env, `bridge:${ip}`, 5, 900);
  if (!rateCheck.allowed) return error('محاولات كثيرة', 429);
  const body = await request.json().catch(() => null);
  if (!body || !body.github_token) return error('التوكن مطلوب');
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
  if (!customerName || customerName.length < 2) return error('الاسم مطلوب (حرفان على الأقل)');
  if (!customerPhone || !/^\d{9,15}$/.test(customerPhone.replace(/[^0-9]/g, ''))) return error('رقم الجوال غير صحيح');
  if (!branchId) return error('الفرع مطلوب');
  if (items.length === 0) return error('السلة فارغة');
  const branch = await env.DB.prepare('SELECT * FROM branches WHERE id = ? AND is_active = 1').bind(branchId).first();
  if (!branch) return error('الفرع غير موجود');
  let subtotal = 0;
  const cleanItems = items.map(item => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const price = Math.max(0, parseFloat(item.price) || 0);
    subtotal += qty * price;
    return { id: sanitize(item.id || ''), name: sanitize(item.name || ''), name_ar: sanitize(item.name_ar || item.name || ''), name_en: sanitize(item.name_en || item.name || ''), qty, price, size: sanitize(item.size || '') };
  });
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    const feeMode = body.delivery_fee_mode || 'free';
    if (feeMode === 'fixed') deliveryFee = parseFloat(body.delivery_fee) || 5;
    else if (feeMode === 'per_branch') deliveryFee = branch.delivery_fee || 10;
  }
  const total = subtotal + deliveryFee;
  const orderNumber = await generateOrderNumber(env.DB);
  const customerLat = parseFloat(body.customer_lat) || null;
  const customerLng = parseFloat(body.customer_lng) || null;
  const customerAddress = orderType === 'delivery' ? sanitize(body.customer_address || '') : '';
  const result = await env.DB.prepare(`
    INSERT INTO orders (
      order_number, branch_id, order_type, customer_name, customer_phone, customer_address,
      customer_lat, customer_lng, items_json, subtotal,
      delivery_fee, total, payment_method, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', ?)
  `).bind(orderNumber, branchId, orderType, customerName, customerPhone, customerAddress, customerLat, customerLng, JSON.stringify(cleanItems), subtotal, deliveryFee, total, notes).run();
  const orderId = result.meta.last_row_id;
  await env.DB.prepare(`INSERT INTO order_tracking (order_id, status, notes) VALUES (?, 'pending', ?)`).bind(orderId, orderType === 'pickup' ? 'تم استلام الطلب — استلام من الفرع 🏪' : 'تم استلام الطلب 🛵').run();
  return json({
    success: true, order_number: orderNumber, order_id: orderId, order_type: orderType,
    total, delivery_fee: deliveryFee, branch_name: branch.name_ar, branch_phone: branch.phone,
    track_url: `${env.SITE_URL || ''}/track.html?order=${encodeURIComponent(orderNumber)}`,
  }, 201);
}

// ═══════════════════════════════════════════
//  5) تتبع الطلب (v1.7: + purge)
// ═══════════════════════════════════════════
async function handleTrackOrder(orderNumber, env) {
  await purgeStaleOrders(env);
  const order = await env.DB.prepare(`
    SELECT o.*, b.name_ar as branch_name, b.phone as branch_phone, b.lat as branch_lat, b.lng as branch_lng,
      u.name as driver_name, u.phone as driver_phone
    FROM orders o JOIN branches b ON o.branch_id = b.id
    LEFT JOIN users u ON o.driver_id = u.id
    WHERE o.order_number = ?
  `).bind(orderNumber).first();
  if (!order) return error('الطلب غير موجود', 404);
  const trackingResult = await env.DB.prepare(`SELECT status, notes, created_at FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC`).bind(order.id).all();
  const isPickup = order.order_type === 'pickup';
  let driverLocation = null;
  if (!isPickup && order.driver_id && order.status !== 'delivered' && order.status !== 'cancelled') {
    driverLocation = await env.DB.prepare(`SELECT lat, lng, created_at FROM driver_locations WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`).bind(order.id).first();
  }
  return json({
    order: {
      number: order.order_number, status: order.status, status_text: statusTextFor(order),
      order_type: order.order_type || 'delivery', customer_name: order.customer_name,
      subtotal: order.subtotal, delivery_fee: order.delivery_fee, total: order.total,
      payment_method: order.payment_method, created_at: order.created_at,
      items: JSON.parse(order.items_json), notes: order.notes,
    },
    branch: { name: order.branch_name, phone: order.branch_phone, lat: order.branch_lat, lng: order.branch_lng },
    driver: (!isPickup && order.driver_id) ? {
      name: order.driver_name, phone: order.driver_phone,
      lat: driverLocation?.lat || order.driver_lat, lng: driverLocation?.lng || order.driver_lng,
      last_update: driverLocation?.created_at || null,
    } : null,
    tracking: trackingResult.results,
    live_mode: env.LIVE_MODE || 'polling',
  });
}

// ═══════════════════════════════════════════
//  6) طلبات المشرف (v1.7: + purge فوري)
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
    id: o.id, number: o.order_number, order_type: o.order_type || 'delivery', branch_name: o.branch_name,
    customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng, items: JSON.parse(o.items_json),
    subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, payment_method: o.payment_method,
    status: o.status, status_text: statusTextFor(o),
    driver_id: o.driver_id, driver_name: o.driver_name, driver_phone: o.driver_phone,
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
//  8) حوض طلبات الفرع (v1.7: + purge)
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
  return json({ success: true, order_id: orderId, order_number: order.order_number, driver_id: auth.user.id, driver_name: auth.user.name });
}

// ═══════════════════════════════════════════
//  10) توصيلات السائق (v1.7: + purge)
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
    customer_name: o.customer_name, customer_phone: o.customer_phone, customer_address: o.customer_address,
    customer_lat: o.customer_lat, customer_lng: o.customer_lng, items: JSON.parse(o.items_json),
    total: o.total, delivery_fee: o.delivery_fee, status: o.status, status_text: statusTextFor(o), created_at: o.created_at,
  }));
  const today = await env.DB.prepare(`SELECT COUNT(*) as total_delivered, SUM(delivery_fee) as earnings FROM orders WHERE driver_id = ? AND status = 'delivered' AND date(delivered_at) = date('now')`).bind(auth.user.id).first();
  return json({ orders, stats: { delivered_today: today?.total_delivered || 0, earnings_today: today?.earnings || 0 } });
}

// ═══════════════════════════════════════════
//  11) تغيير الحالة (+ دفتر)
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
  return json({ success: true, order_id: orderId, old_status: order.status, new_status: newStatus });
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
  return json({ success: true, order_id: orderId, driver_id: driver.id, driver_name: driver.name, driver_phone: driver.phone });
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
    await env.IMAGES.put(photoKey, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
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
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', ...CORS_HEADERS },
  });
}

// ═══════════════════════════════════════════
//  16) كل الطلبات (المالك) (v1.7: + purge)
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
  if (dateFrom) { query += ' AND date(o.created_at) >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND date(o.created_at) <= ?'; params.push(dateTo); }
  query += ' ORDER BY o.created_at DESC LIMIT 200';
  const result = await env.DB.prepare(query).bind(...params).all();
  const orders = result.results.map(o => ({
    id: o.id, number: o.order_number, branch_name: o.branch_name, order_type: o.order_type || 'delivery',
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
// ═══════════════════════════════════════════
async function handleReportsSummary(request, env) {
  const auth = await requireAuth(request, env, ['super_admin', 'supervisor']);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  let branchId = url.searchParams.get('branch_id');
  const period = url.searchParams.get('period') || 'today';
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
// ═══════════════════════════════════════════
async function handleReportsAccounting(request, env) {
  const auth = await requireAuth(request, env, ['super_admin', 'supervisor']);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  let branchId = url.searchParams.get('branch_id') || '';
  if (auth.user.role === 'supervisor') branchId = auth.user.branch_id || '';
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const from = url.searchParams.get('from') || (ym + '-01');
  const to = url.searchParams.get('to') || now.toISOString().slice(0, 10);
  const rows = await env.DB.prepare(`
    SELECT substr(closed_at,1,7) AS ym, kind, order_type, branch_id, driver_id,
           COUNT(*) AS n, SUM(gross) AS gross, SUM(fees) AS fees
    FROM order_ledger
    WHERE date(closed_at) BETWEEN ? AND ?
      AND (? = '' OR branch_id = ?)
    GROUP BY ym, kind, order_type, branch_id, driver_id
    ORDER BY ym
  `).bind(from, to, branchId, branchId).all();
  const totals = { orders: 0, delivered: 0, cancelled: 0, abandoned: 0, gross: 0, fees: 0, pickup_gross: 0, delivery_gross: 0 };
  const monthsMap = {};
  const branchesMap = {};
  const driversMap = {};
  for (const r of rows.results) {
    const m = monthsMap[r.ym] || (monthsMap[r.ym] = { ym: r.ym, orders: 0, delivered: 0, cancelled: 0, abandoned: 0, gross: 0, fees: 0 });
    m.orders += r.n; totals.orders += r.n;
    m.gross += r.gross || 0; totals.gross += r.gross || 0;
    m.fees += r.fees || 0; totals.fees += r.fees || 0;
    if (r.kind === 'delivered') {
      m.delivered += r.n; totals.delivered += r.n;
      if (r.order_type === 'pickup') totals.pickup_gross += r.gross || 0;
      else totals.delivery_gross += r.gross || 0;
    }
    if (r.kind === 'cancelled') { m.cancelled += r.n; totals.cancelled += r.n; }
    if (r.kind === 'abandoned') { m.abandoned += r.n; totals.abandoned += r.n; }
    if (r.branch_id) {
      const b = branchesMap[r.branch_id] || (branchesMap[r.branch_id] = { branch_id: r.branch_id, orders: 0, delivered: 0, gross: 0 });
      b.orders += r.n; b.gross += r.gross || 0;
      if (r.kind === 'delivered') b.delivered += r.n;
    }
    if (r.kind === 'delivered' && r.driver_id) {
      const d = driversMap[r.driver_id] || (driversMap[r.driver_id] = { driver_id: r.driver_id, deliveries: 0, earnings: 0 });
      d.deliveries += r.n; d.earnings += r.fees || 0;
    }
  }
  const months = Object.values(monthsMap).sort((a, b) => a.ym.localeCompare(b.ym));
  totals.gross = Math.round(totals.gross * 100) / 100;
  totals.fees = Math.round(totals.fees * 100) / 100;
  totals.avg = totals.delivered ? Math.round(totals.gross / totals.delivered) : 0;
  totals.cancel_rate = totals.orders ? Math.round(((totals.cancelled + totals.abandoned) / totals.orders) * 100) : 0;
  const branches = [];
  if (Object.keys(branchesMap).length) {
    const brs = await env.DB.prepare('SELECT id, name_ar, name_en FROM branches').all();
    const nameById = {};
    brs.results.forEach(b => { nameById[b.id] = b; });
    for (const id in branchesMap) {
      const b = branchesMap[id];
      branches.push({ ...b, branch_name: nameById[id]?.name_ar || id, branch_name_en: nameById[id]?.name_en || id });
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
      drivers.push({ ...d, driver_name: nameById[id] || ('#' + id) });
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
      WHERE o.status = 'delivered' AND date(o.delivered_at) BETWEEN ? AND ?
        AND (? = '' OR o.branch_id = ?)
      GROUP BY name_ar ORDER BY qty DESC LIMIT 10
    `).bind(from, to, branchId, branchId).all();
    topItems = ti.results;
  } catch (e) { topItems = []; }
  return json({ from, to, totals, months, branches, drivers, top_items: topItems });
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
      if (path === '/api/health' && request.method === 'GET') return json({ status: 'ok', version: '1.7', live_mode: env.LIVE_MODE || 'polling' });
      if (path === '/api/auth/login' && request.method === 'POST') return await handleLogin(request, env);
      if (path === '/api/auth/admin-bridge' && request.method === 'POST') return await handleAdminBridge(request, env);
      if (path === '/api/auth/change-password' && request.method === 'POST') return await handleChangePassword(request, env);
      if (path === '/api/orders' && request.method === 'POST') return await handleCreateOrder(request, env);
      if (path.startsWith('/api/track/') && request.method === 'GET') return await handleTrackOrder(decodeURIComponent(path.split('/').pop()), env);
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
      return error('Not found', 404);
    } catch (e) {
      console.error('Worker error:', e);
      return error('Internal server error: ' + e.message, 500);
    }
  },

  // ═════════════════════════════════════════
  //  المهام المجدولة (v1.7: أي cron غير الـ3 فجراً = purge)
  // ═════════════════════════════════════════
  async scheduled(event, env, ctx) {
    try {
      if (event.cron === '0 3 * * *') {
        await env.DB.prepare("DELETE FROM used_order_numbers WHERE expires_at < date('now')").run();
        await env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
        await env.DB.prepare("DELETE FROM driver_locations WHERE created_at < datetime('now', '-7 days')").run();
        await env.DB.prepare(`DELETE FROM order_tracking WHERE order_id IN (SELECT id FROM orders WHERE status = 'archived' AND updated_at < datetime('now', '-90 days'))`).run();
        const old = await env.DB.prepare(`SELECT * FROM orders WHERE status NOT IN ('delivered','archived') AND created_at < datetime('now', '-30 days')`).all();
        for (const o of old.results) {
          const already = await env.DB.prepare('SELECT 1 FROM order_ledger WHERE order_number = ?').bind(o.order_number).first();
          if (!already) await ledgerInsert(env, o, 'abandoned');
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
        const [orders, users, branches, tracking, ledger] = await Promise.all([
          env.DB.prepare('SELECT * FROM orders').all(),
          env.DB.prepare('SELECT id, name, phone, username, role, branch_id, is_active FROM users').all(),
          env.DB.prepare('SELECT * FROM branches').all(),
          env.DB.prepare("SELECT * FROM order_tracking WHERE created_at >= datetime('now', '-30 days')").all(),
          env.DB.prepare('SELECT * FROM order_ledger').all(),
        ]);
        const backup = {
          exported_at: new Date().toISOString(),
          branches: branches.results, users: users.results,
          orders: orders.results, order_tracking: tracking.results,
          order_ledger: ledger.results,
        };
        const key = `backups/backup-${new Date().toISOString().slice(0, 10)}.json`;
        await env.BACKUPS.put(key, JSON.stringify(backup));
        const list = await env.BACKUPS.list({ prefix: 'backups/' });
        if (list.objects.length > 30) {
          const sorted = list.objects.sort((a, b) => a.key.localeCompare(b.key));
          await env.BACKUPS.delete(sorted.slice(0, list.objects.length - 30).map(o => o.key));
        }
      } else {
        // أي cron آخر (مثلاً كل 10 دقائق) = purge فوري
        await purgeStaleOrders(env);
      }
    } catch (e) { console.error('Cron error:', e); }
  },
};

// ═══════════════════════════════════════════
//  نهاية worker/index.js (v1.7)
// ═══════════════════════════════════════════
