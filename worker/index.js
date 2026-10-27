// ═══════════════════════════════════════════
//  مكرونجي - Cloudflare Worker API
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
//  دوال مساعدة
// ───────────────────────────────────────────

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
//  Rate Limiting بسيط
// ───────────────────────────────────────────
async function checkRateLimit(env, key, limit = 100, ttl = 60) {
  try {
    const current = parseInt(await env.KV.get(key) || '0');
    if (current >= limit) {
      return { allowed: false, remaining: 0 };
    }
    await env.KV.put(key, String(current + 1), { expirationTtl: ttl });
    return { allowed: true, remaining: limit - current - 1 };
  } catch (e) {
    // لو KV فشل، نسمح (لا نحجب)
    return { allowed: true, remaining: -1 };
  }
}

// ───────────────────────────────────────────
//  نظام توليد رقم الطلب (12345A#)
// ───────────────────────────────────────────
async function generateOrderNumber(db) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // نبدأ بحرف عشوائي لتوزيع الحمل
  const letter = letters[Math.floor(Math.random() * 26)];
  
  // نجلب العداد الحالي
  const counter = await db.prepare(
    'SELECT current_num FROM order_counters WHERE letter = ?'
  ).bind(letter).first();
  
  let nextNum = (counter?.current_num || 0) + 1;
  
  // لو وصلنا 99999 نعيد من 1
  if (nextNum > 99999) {
    nextNum = 1;
  }
  
  // نشكل الرقم
  const orderNumber = `${String(nextNum).padStart(5, '0')}${letter}#`;
  
  // نتحقق أنه لم يُستخدم خلال السنة
  const exists = await db.prepare(
    'SELECT 1 FROM used_order_numbers WHERE order_number = ?'
  ).bind(orderNumber).first();
  
  if (exists) {
    // نحاول بحرف آخر (recursion آمن لأن 26 حرف)
    return generateOrderNumber(db);
  }
  
  // نحدث العداد
  await db.prepare(
    'UPDATE order_counters SET current_num = ?, last_reset = CURRENT_DATE WHERE letter = ?'
  ).bind(nextNum, letter).run();
  
  // نسجل الاستخدام (ينتهي بعد سنة)
  await db.prepare(`
    INSERT INTO used_order_numbers (order_number, created_at, expires_at)
    VALUES (?, CURRENT_DATE, DATE('now', '+1 year'))
  `).bind(orderNumber).run();
  
  return orderNumber;
}

// ───────────────────────────────────────────
//  نظام تشفير كلمات المرور (PBKDF2-SHA256)
// ───────────────────────────────────────────
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  // استيراد المفتاح
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // اشتقاق البتات
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );
  
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, storedHash, salt) {
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// ───────────────────────────────────────────
//  نظام JWT Tokens
// ───────────────────────────────────────────
function base64UrlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  
  const encodedSignature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );
  
  return `${data}.${encodedSignature}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    
    const data = `${header}.${payload}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBuffer = new Uint8Array(
      base64UrlDecode(signature).split('').map(c => c.charCodeAt(0))
    );
    
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(data)
    );
    
    if (!valid) return null;
    
    const decoded = JSON.parse(base64UrlDecode(payload));
    
    // نتحقق من انتهاء الصلاحية
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decoded;
  } catch (e) {
    return null;
  }
}

// ───────────────────────────────────────────
//  استخراج التوكن من Header
// ───────────────────────────────────────────
function extractToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  if (!auth.startsWith('Bearer ')) return null;
  return auth.substring(7);
}

// ───────────────────────────────────────────
//  نقطة النهاية: تسجيل الدخول
//  POST /api/auth/login
// ───────────────────────────────────────────
async function handleLogin(request, env) {
  const ip = getIP(request);
  
  // Rate Limiting: 5 محاولات كل 15 دقيقة
  const rateKey = `login:${ip}`;
  const rateCheck = await checkRateLimit(env, rateKey, 5, 900);
  if (!rateCheck.allowed) {
    return error('محاولات كثيرة، حاول بعد 15 دقيقة', 429);
  }
  
  const body = await request.json().catch(() => null);
  if (!body || !body.username || !body.password) {
    return error('بيانات ناقصة');
  }
  
  const username = sanitize(body.username);
  const password = body.password;
  
  // البحث عن المستخدم
  const user = await env.DB.prepare(`
    SELECT * FROM users 
    WHERE username = ? AND is_active = 1
  `).bind(username).first();
  
  if (!user) {
    return error('بيانات الدخول غير صحيحة', 401);
  }
  
  // التحقق من كلمة المرور
  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) {
    return error('بيانات الدخول غير صحيحة', 401);
  }
  
  // إنشاء JWT
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    branchId: user.branch_id,
    mustChangePassword: user.must_change_password === 1,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (env.JWT_DURATION || 604800),
  };
  
  const token = await createJWT(payload, env.JWT_SECRET);
  
  // حفظ الجلسة في قاعدة البيانات
  const sessionToken = generateSalt() + generateSalt(); // 64 char
  await env.DB.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, datetime('now', '+30 days'), ?, ?)
  `).bind(sessionToken, user.id, ip, request.headers.get('User-Agent') || '').run();
  
  // تحديث آخر دخول
  await env.DB.prepare(`
    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(user.id).run();
  
  return json({
    success: true,
    token,
    sessionToken,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      branchId: user.branch_id,
      mustChangePassword: user.must_change_password === 1,
    },
  });
}

// ───────────────────────────────────────────
//  نقطة النهاية: إنشاء طلب جديد
//  POST /api/orders
// ───────────────────────────────────────────
async function handleCreateOrder(request, env) {
  const ip = getIP(request);
  
  // Rate Limiting: 10 طلبات كل دقيقة من نفس IP
  const rateKey = `create_order:${ip}`;
  const rateCheck = await checkRateLimit(env, rateKey, 10, 60);
  if (!rateCheck.allowed) {
    return error('محاولات كثيرة، حاول بعد دقيقة', 429);
  }
  
  const body = await request.json().catch(() => null);
  if (!body) return error('بيانات ناقصة');
  
  // التحقق من البيانات الإجبارية
  const customerName = sanitize(body.customer_name);
  const customerPhone = sanitize(body.customer_phone);
  const branchId = sanitize(body.branch_id);
  const items = Array.isArray(body.items) ? body.items : [];
  const notes = sanitize(body.notes || '');
  
  if (!customerName || customerName.length < 2) {
    return error('الاسم مطلوب (حرفان على الأقل)');
  }
  if (!customerPhone || !/^\d{9,15}$/.test(customerPhone.replace(/[^0-9]/g, ''))) {
    return error('رقم الجوال غير صحيح');
  }
  if (!branchId) {
    return error('الفرع مطلوب');
  }
  if (items.length === 0) {
    return error('السلة فارغة');
  }
  
  // التحقق من وجود الفرع
  const branch = await env.DB.prepare(
    'SELECT * FROM branches WHERE id = ? AND is_active = 1'
  ).bind(branchId).first();
  
  if (!branch) {
    return error('الفرع غير موجود');
  }
  
  // حساب الإجمالي
  let subtotal = 0;
  const cleanItems = items.map(item => {
    const qty = Math.max(1, parseInt(item.qty) || 1);
    const price = Math.max(0, parseFloat(item.price) || 0);
    subtotal += qty * price;
    return {
      id: sanitize(item.id || ''),
      name: sanitize(item.name || ''),
      qty,
      price,
      size: sanitize(item.size || ''),
    };
  });
  
  // حساب رسوم التوصيل
  let deliveryFee = 0;
  const feeMode = body.delivery_fee_mode || 'free';
  
  if (feeMode === 'fixed') {
    deliveryFee = parseFloat(body.delivery_fee) || 5;
  } else if (feeMode === 'per_branch') {
    deliveryFee = branch.delivery_fee || 10;
  }
  // 'free' = 0
  
  const total = subtotal + deliveryFee;
  
  // توليد رقم الطلب الفريد
  const orderNumber = await generateOrderNumber(env.DB);
  
  // إحداثيات العميل (اختيارية - من GPS)
  const customerLat = parseFloat(body.customer_lat) || null;
  const customerLng = parseFloat(body.customer_lng) || null;
  
  // حفظ الطلب
  const result = await env.DB.prepare(`
    INSERT INTO orders (
      order_number, branch_id, customer_name, customer_phone,
      customer_lat, customer_lng, items_json, subtotal,
      delivery_fee, total, payment_method, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', ?)
  `).bind(
    orderNumber, branchId, customerName, customerPhone,
    customerLat, customerLng, JSON.stringify(cleanItems),
    subtotal, deliveryFee, total, notes
  ).run();
  
  const orderId = result.meta.last_row_id;
  
  // تسجيل في جدول التتبع (الحالة الأولى)
  await env.DB.prepare(`
    INSERT INTO order_tracking (order_id, status, notes)
    VALUES (?, 'pending', 'تم استلام الطلب')
  `).bind(orderId).run();
  
  return json({
    success: true,
    order_number: orderNumber,
    order_id: orderId,
    total,
    delivery_fee: deliveryFee,
    branch_name: branch.name_ar,
    branch_phone: branch.phone,
    track_url: `${env.SITE_URL || ''}/track.html?order=${orderNumber}`,
  }, 201);
}

// ───────────────────────────────────────────
//  نقطة النهاية: تتبع الطلب (للعميل)
//  GET /api/track/:number
// ───────────────────────────────────────────
async function handleTrackOrder(orderNumber, env) {
  // جلب الطلب مع بيانات الفرع
  const order = await env.DB.prepare(`
    SELECT 
      o.*,
      b.name_ar as branch_name_ar,
      b.name_en as branch_name_en,
      b.phone as branch_phone,
      b.lat as branch_lat,
      b.lng as branch_lng,
      u.name as driver_name,
      u.phone as driver_phone
    FROM orders o
    JOIN branches b ON o.branch_id = b.id
    LEFT JOIN users u ON o.driver_id = u.id
    WHERE o.order_number = ?
  `).bind(orderNumber).first();
  
  if (!order) {
    return error('الطلب غير موجود', 404);
  }
  
  // جلب سجل التتبع
  const trackingResult = await env.DB.prepare(`
    SELECT status, notes, created_at 
    FROM order_tracking 
    WHERE order_id = ? 
    ORDER BY created_at ASC
  `).bind(order.id).all();
  
  // جلب آخر موقع للسائق (من آخر 5 دقائق فقط)
  let driverLocation = null;
  if (order.driver_id && order.status !== 'delivered') {
    driverLocation = await env.DB.prepare(`
      SELECT lat, lng, created_at 
      FROM driver_locations 
      WHERE order_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).bind(order.id).first();
  }
  
  // نصوص الحالات بالعربية
  const statusText = {
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
  
  return json({
    order: {
      number: order.order_number,
      status: order.status,
      status_text: statusText[order.status] || order.status,
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
      name: order.branch_name_ar,
      phone: order.branch_phone,
      lat: order.branch_lat,
      lng: order.branch_lng,
    },
    driver: order.driver_id ? {
      name: order.driver_name,
      phone: order.driver_phone,
      lat: driverLocation?.lat || order.driver_lat,
      lng: driverLocation?.lng || order.driver_lng,
      last_update: driverLocation?.created_at,
    } : null,
    tracking: trackingResult.results,
  });
}

// ───────────────────────────────────────────
//  المعالج الرئيسي (Router)
// ───────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    // CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    try {
      // ─── تسجيل الدخول ───
      if (path === '/api/auth/login' && request.method === 'POST') {
        return await handleLogin(request, env);
      }
      
      // ─── إنشاء طلب جديد ───
      if (path === '/api/orders' && request.method === 'POST') {
        return await handleCreateOrder(request, env);
      }
      
      // ─── تتبع طلب (للعميل - بدون توكن) ───
      if (path.startsWith('/api/track/') && request.method === 'GET') {
        const orderNumber = path.split('/').pop();
        return await handleTrackOrder(orderNumber, env);
      }
      
      // ─── Health Check ───
      if (path === '/api/health' && request.method === 'GET') {
        return json({
          status: 'ok',
          version: '1.0',
          timestamp: new Date().toISOString(),
          live_mode: env.LIVE_MODE || 'polling',
        });
      }
      
      // ─── نقاط النهاية الأخرى ستُضاف في الجزء 2 و 3 ───
      
      return error('Not found', 404);
      
    } catch (e) {
      console.error('Worker error:', e);
      return error('Internal server error: ' + e.message, 500);
    }
  }
};
