// ============================================================================
// miliconfig - پروکسی تلگرام WEB (MTProto over WebSocket)
// پیاده‌سازی منطبق بر پروتکل رسمی WEB proxy تلگرام (tproxy-server):
//   • صفحهٔ پل:      GET  /?bridge=<capability>
//   • شروع نشست:     POST /api/v1/session
//   • حمل فریم‌ها:   WebSocket /api/v1/ws   (Sec-WebSocket-Protocol: tproxy-v1.<token>)
//   • صفحهٔ عمومی:   GET  /?server=<host>&secret=<secret>
// تمام ترافیک MTProto از داخل همین ورکر و با سوکت خروجی کلادفلر به دیتاسنترهای
// تلگرام وصل می‌شود؛ هیچ سرور واسطی لازم نیست. تنظیمات و آمار در جدول
// telegram_proxy دیتابیس D1 (و در نبود D1، در حافظهٔ ایزوله) نگه‌داری می‌شود.
// ============================================================================

const TGP_TEXT_ENCODER = new TextEncoder();
const TGP_TEXT_DECODER = new TextDecoder();
const TGP_FRAME = Object.freeze({
  OPEN: 0x01,
  DATA: 0x02,
  CLOSE: 0x03,
  WINDOW: 0x04,
  PING: 0x05,
  PONG: 0x06,
  HELLO: 0x10,
  WELCOME: 0x11,
  BYE: 0x1f
});
const TGP_HEADER_SIZE = 8;
const TGP_MAX_PAYLOAD = 1024 * 1024;
const TGP_MAX_BATCH_FRAMES = 4096;
const TGP_INITIAL_WINDOW = 4 * 1024 * 1024;
const TGP_DATA_CHUNK = 64 * 1024;
const TGP_MAX_WS_MESSAGE = 2 * 1024 * 1024;
const TGP_DCS = Object.freeze({
  1: '149.154.175.50',
  2: '149.154.167.51',
  3: '149.154.175.100',
  4: '149.154.167.91',
  5: '149.154.171.5'
});
const TGP_TAGS = new Set([0xefefefef, 0xeeeeeeee, 0xdddddddd]);
const TGP_LIMITS = Object.freeze({
  itemCost: 256,
  ingressBytes: 8 * 1024 * 1024,
  ingressItems: 128,
  uplinkBytes: 8 * 1024 * 1024,
  uplinkItems: 8192,
  streamBytes: TGP_INITIAL_WINDOW + 1024 * 1024,
  streamItems: 4096,
  downlinkBytes: 8 * 1024 * 1024,
  downlinkItems: 8192,
  handshakeTimeout: 15000,
  connectTimeout: 10000,
  writeTimeout: 30000
});

// ---------------------------------------------------------------------------
// کدگذاری فریم‌ها
// ---------------------------------------------------------------------------
function tgpEncodeFrame(type, streamId, payload = new Uint8Array()) {
  if (streamId < 0 || streamId > 0xffffff || payload.length > TGP_MAX_PAYLOAD) throw new Error('invalid frame');
  const out = new Uint8Array(TGP_HEADER_SIZE + payload.length);
  out[0] = type;
  out[1] = streamId >>> 16;
  out[2] = streamId >>> 8;
  out[3] = streamId;
  new DataView(out.buffer).setUint32(4, payload.length);
  out.set(payload, TGP_HEADER_SIZE);
  return out;
}

function tgpParseFrames(input) {
  const frames = [];
  let offset = 0;
  while (offset < input.length) {
    if (frames.length >= TGP_MAX_BATCH_FRAMES || input.length - offset < TGP_HEADER_SIZE) throw new Error('bad batch');
    const view = new DataView(input.buffer, input.byteOffset + offset, TGP_HEADER_SIZE);
    const length = view.getUint32(4);
    if (length > TGP_MAX_PAYLOAD || offset + TGP_HEADER_SIZE + length > input.length) throw new Error('bad payload');
    frames.push({
      type: input[offset],
      streamId: (input[offset + 1] << 16) | (input[offset + 2] << 8) | input[offset + 3],
      payload: input.subarray(offset + TGP_HEADER_SIZE, offset + TGP_HEADER_SIZE + length)
    });
    offset += TGP_HEADER_SIZE + length;
  }
  if (!frames.length) throw new Error('empty batch');
  return frames;
}

function tgpU32(value) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value);
  return out;
}

function tgpClampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function tgpHexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function tgpBytesToHex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function tgpRandomHex(byteLength) {
  const value = new Uint8Array(byteLength);
  crypto.getRandomValues(value);
  return tgpBytesToHex(value);
}

function tgpBase64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function tgpBase64urlDecode(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function tgpConstantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function tgpHmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

function tgpSigningKey(secret) {
  return TGP_TEXT_ENCODER.encode('twp-cf/session-signing/v1\n' + String(secret || ''));
}

function tgpRandomToken(bytes) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return tgpBase64url(value);
}

function tgpReverse(bytes) {
  return Uint8Array.from(bytes).reverse();
}

function tgpConcat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

async function tgpSha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

class TgpAesCtrStream {
  constructor(keyBytes, ivBytes) {
    if (keyBytes.length !== 32 || ivBytes.length !== 16) throw new Error('bad AES material');
    this.keyPromise = crypto.subtle.importKey('raw', keyBytes, 'AES-CTR', false, ['encrypt']);
    this.counter = new Uint8Array(ivBytes);
    this.spare = new Uint8Array();
  }
  async crypt(input) {
    const src = input instanceof Uint8Array ? input : new Uint8Array(input);
    const out = new Uint8Array(src.length);
    let pos = 0;
    if (this.spare.length) {
      const n = Math.min(this.spare.length, src.length);
      for (let i = 0; i < n; i++) out[i] = src[i] ^ this.spare[i];
      this.spare = this.spare.subarray(n);
      pos = n;
    }
    if (pos < src.length) {
      const need = src.length - pos;
      const blocks = Math.ceil(need / 16);
      const zeros = new Uint8Array(blocks * 16);
      const key = await this.keyPromise;
      const ks = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CTR', counter: this.counter, length: 128 }, key, zeros));
      tgpAddBlocks(this.counter, blocks);
      for (let i = 0; i < need; i++) out[pos + i] = src[pos + i] ^ ks[i];
      if (need < ks.length) this.spare = ks.subarray(need);
    }
    return out;
  }
}

function tgpAddBlocks(counter, blocks) {
  let carry = blocks;
  for (let i = 15; i >= 0 && carry; i--) {
    const sum = counter[i] + (carry & 255);
    counter[i] = sum & 255;
    carry = Math.floor(carry / 256) + (sum >>> 8);
  }
}

function tgpSecretBytes(value) {
  const s = String(value || '').trim().toLowerCase();
  if (/^[0-9a-f]{32}$/.test(s)) return { bridge: tgpHexToBytes(s), inner: tgpHexToBytes(s), mode: 'plain' };
  if (/^dd[0-9a-f]{32}$/.test(s)) return { bridge: tgpHexToBytes(s), inner: tgpHexToBytes(s.slice(2)), mode: 'dd' };
  if (/^ee/.test(s)) throw new Error('Fake-TLS secrets are not supported in WEB mode');
  throw new Error('secret must be 32 hex characters, optionally prefixed with dd');
}

function tgpIsValidSecret(value) {
  return /^(?:[0-9a-f]{32}|dd[0-9a-f]{32})$/.test(String(value || '').trim().toLowerCase());
}

async function tgpAcceptClientHandshake(packet, secret) {
  if (packet.length !== 64) throw new Error('bad handshake length');
  const material = packet.subarray(8, 56);
  const rev = tgpReverse(material);
  const decKey = await tgpSha256(tgpConcat(material.subarray(0, 32), secret));
  const dec = new TgpAesCtrStream(decKey, material.subarray(32, 48));
  const encKey = await tgpSha256(tgpConcat(rev.subarray(0, 32), secret));
  const enc = new TgpAesCtrStream(encKey, rev.subarray(32, 48));
  const plain = await dec.crypt(packet);
  const view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
  const tag = view.getUint32(56, true);
  const dcId = view.getInt16(60, true);
  if (!TGP_TAGS.has(tag) || !TGP_DCS[Math.abs(dcId)]) throw new Error('invalid MTProxy handshake');
  return { tag, dcId, clientDecrypt: dec, clientEncrypt: enc };
}

async function tgpCreateTelegramHandshake(tag, dcId) {
  let nonce;
  do {
    nonce = new Uint8Array(64);
    crypto.getRandomValues(nonce);
  } while (tgpReserved(nonce));
  const v = new DataView(nonce.buffer);
  v.setUint32(56, tag, true);
  v.setInt16(60, dcId, true);
  nonce[62] = nonce[63] = 0;
  const material = nonce.subarray(8, 56);
  const rev = tgpReverse(material);
  const encrypt = new TgpAesCtrStream(material.subarray(0, 32), material.subarray(32, 48));
  const decrypt = new TgpAesCtrStream(rev.subarray(0, 32), rev.subarray(32, 48));
  const encrypted = await encrypt.crypt(nonce);
  const wire = new Uint8Array(nonce);
  wire.set(encrypted.subarray(56), 56);
  return { wire, encrypt, decrypt };
}

function tgpReserved(n) {
  const v = new DataView(n.buffer, n.byteOffset, n.byteLength);
  const x = v.getUint32(0, true);
  return n[0] === 0xef || x === 0x44414548 || x === 0x54534f50 || x === 0x20544547 || x === 0xeeeeeeee ||
    x === 0xdddddddd || v.getUint32(4, true) === 0;
}

async function tgpCapabilityMatches(candidate, host, hexSecret) {
  if (!tgpIsValidSecret(hexSecret)) return false;
  const secret = tgpHexToBytes(String(hexSecret).trim().toLowerCase());
  const context = TGP_TEXT_ENCODER.encode('tdesktop-web-proxy-bridge-v1\n' + host);
  const expected = tgpBase64url(await tgpHmac(secret, context));
  return tgpConstantTimeEqual(candidate, expected);
}

async function tgpCreateBootstrap(env, secret) {
  const ttl = tgpClampInt(env.SESSION_TTL_SECONDS, 30, 600, 300);
  const payload = tgpBase64url(TGP_TEXT_ENCODER.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttl, n: tgpRandomToken(16) })));
  const signature = tgpBase64url(await tgpHmac(tgpSigningKey(secret), TGP_TEXT_ENCODER.encode(payload)));
  return `${payload}.${signature}`;
}

async function tgpVerifyBootstrap(env, token, secret) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) return false;
  const expected = tgpBase64url(await tgpHmac(tgpSigningKey(secret), TGP_TEXT_ENCODER.encode(payload)));
  if (!tgpConstantTimeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(TGP_TEXT_DECODER.decode(tgpBase64urlDecode(payload)));
    return Number.isInteger(data.exp) && data.exp >= Math.floor(Date.now() / 1000);
  } catch (_e) {
    return false;
  }
}

function tgpSessionMac(env, host, nonce, secret) {
  const context = TGP_TEXT_ENCODER.encode('twp-cf/session-token/v1\n' + host + '\n');
  const bytes = new Uint8Array(context.length + nonce.length);
  bytes.set(context);
  bytes.set(nonce, context.length);
  return tgpHmac(tgpSigningKey(secret), bytes);
}

async function tgpCreateSessionToken(env, host, secret) {
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const mac = await tgpSessionMac(env, host, nonce, secret);
  const bytes = new Uint8Array(32);
  bytes.set(nonce);
  bytes.set(mac.subarray(0, 16), 16);
  return tgpBase64url(bytes);
}

async function tgpVerifySessionToken(env, host, token, secret) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) return false;
  const bytes = tgpBase64urlDecode(token);
  if (tgpBase64url(bytes) !== token) return false;
  const mac = await tgpSessionMac(env, host, bytes.subarray(0, 16), secret);
  return tgpConstantTimeEqual(tgpBase64url(bytes.subarray(16)), tgpBase64url(mac.subarray(0, 16)));
}

async function tgpReadHello(request) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const bytes = new Uint8Array(9);
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return bytes.subarray(0, length);
      if (length + value.length > bytes.length) { await reader.cancel(); return new Uint8Array(); }
      bytes.set(value, length);
      length += value.length;
    }
  } finally {
    try { reader.releaseLock(); } catch (_e) {}
  }
}

function tgpIsHello(bytes) {
  try {
    const frames = tgpParseFrames(bytes);
    return frames.length === 1 && frames[0].type === TGP_FRAME.HELLO && frames[0].streamId === 0 &&
      frames[0].payload.length === 1 && frames[0].payload[0] === 1;
  } catch (_e) {
    return false;
  }
}

function tgpBearer(request) {
  const value = request.headers.get('Authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

function tgpIsBinary(value) {
  return /^application\/octet-stream(?:\s*;.*)?$/i.test(value || '');
}

function tgpNoStore() {
  return { 'Cache-Control': 'no-store' };
}

function tgpCanonicalHost(value) {
  return String(value || '').trim().toLowerCase().replace(/\.$/, '');
}

function tgpExactTelegramQuery(url, host, secret) {
  if (url.searchParams.size !== 2 || !url.searchParams.has('server') || !url.searchParams.has('secret')) return false;
  return tgpCanonicalHost(url.searchParams.get('server')) === tgpCanonicalHost(host) &&
    url.searchParams.get('secret') === String(secret || '');
}

function tgpExactBridgeQuery(url) {
  if (url.searchParams.size !== 1 || !url.searchParams.has('bridge')) return null;
  const value = url.searchParams.get('bridge');
  return /^[A-Za-z0-9_-]{43}$/.test(value || '') && url.search === `?bridge=${value}` ? value : null;
}

function tgpWaitFor(promise, signal, timeout, reason) {
  return new Promise((resolve, reject) => {
    let timer;
    let settled = false;
    const finish = (settle, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', aborted);
      settle(value);
    };
    const aborted = () => finish(reject, new Error('stream closed'));
    Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
    if (signal.aborted) return aborted();
    signal.addEventListener('abort', aborted, { once: true });
    timer = setTimeout(() => finish(reject, new Error(reason)), timeout);
  });
}

function tgpIgnoreFailure(fn) {
  try { Promise.resolve(fn()).catch(() => {}); } catch (_e) {}
}

function tgpCamouflage() {
  return new Response('<!doctype html><meta charset=utf-8><title>Not found</title><h1>Not found</h1>', {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function tgpJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// ---------------------------------------------------------------------------
// ذخیره‌سازی: جدول telegram_proxy در D1 (تک‌ردیفی) با پشتیبان حافظهٔ ایزوله
// ---------------------------------------------------------------------------
const TGP_MEM = {
  row: null,
  lastFetch: 0,
  activeSessions: 0,
  lastActivity: 0,
  lastDbPing: 0,
  pendingBytes: 0,
  pendingReqs: 0,
  lastTrafficWrite: 0,
  trafficLock: false,
  lastStatsFetch: 0,
  dbStats: { traffic: 0, reqTotal: 0, reqToday: 0, date: '' }
};

function tgpDefaultRow() {
  return {
    name: '',
    secret: '',
    status: 'not_created',
    enabled: 0,
    last_seen: 0,
    traffic_total: 0,
    req_total: 0,
    req_today: 0,
    req_date: ''
  };
}

function tgpDb(env) {
  try {
    const detected = detectD1Binding(env);
    return detected && detected.db ? detected.db : null;
  } catch (_e) {
    return null;
  }
}

function tgpInvalidate() {
  TGP_MEM.row = null;
  TGP_MEM.lastFetch = 0;
  TGP_MEM.lastStatsFetch = 0;
}

async function tgpLoadRow(env, force = false) {
  const now = Date.now();
  if (!force && TGP_MEM.row && now - TGP_MEM.lastFetch < 20000) return TGP_MEM.row;
  let row = TGP_MEM.row ? { ...TGP_MEM.row } : tgpDefaultRow();
  const db = tgpDb(env);
  if (db) {
    try {
      const res = await db.prepare(
        'SELECT name, secret, status, enabled, last_seen, traffic_total, req_total, req_today, req_date FROM telegram_proxy WHERE id = 1'
      ).first();
      if (res) row = { ...tgpDefaultRow(), ...res };
    } catch (_e) {}
  }
  const envSecret = String(env?.PROXY_SECRET || '').trim().toLowerCase();
  if (!tgpIsValidSecret(row.secret) && tgpIsValidSecret(envSecret)) {
    row.secret = envSecret;
    row.status = 'active';
    row.enabled = 1;
    if (!row.name) row.name = 'Telegram-Proxy';
  }
  TGP_MEM.row = row;
  TGP_MEM.lastFetch = now;
  return row;
}

async function tgpGetConfig(env, force = false) {
  const row = await tgpLoadRow(env, force);
  const secret = tgpIsValidSecret(row.secret) ? String(row.secret).trim().toLowerCase() : '';
  const enabled = String(row.enabled) === '1' || row.enabled === 1 || row.enabled === true;
  const status = row.status || (secret ? 'active' : 'not_created');
  return {
    row,
    secret,
    name: row.name || 'Telegram-Proxy',
    status,
    enabled,
    active: Boolean(secret && enabled && status === 'active')
  };
}

async function tgpSaveRow(env, patch) {
  const base = await tgpLoadRow(env, true);
  const row = { ...base, ...patch };
  const now = Date.now();
  TGP_MEM.row = { ...row };
  TGP_MEM.lastFetch = now;
  TGP_MEM.lastStatsFetch = 0;
  const db = tgpDb(env);
  if (!db) return true;
  try {
    await db.prepare(
      `INSERT INTO telegram_proxy (id, name, secret, status, enabled, last_seen, traffic_total, req_total, req_today, req_date, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         secret = excluded.secret,
         status = excluded.status,
         enabled = excluded.enabled,
         last_seen = excluded.last_seen,
         updated_at = excluded.updated_at`
    ).bind(
      String(row.name || ''),
      String(row.secret || ''),
      String(row.status || 'not_created'),
      (String(row.enabled) === '1' || row.enabled === 1 || row.enabled === true) ? 1 : 0,
      Number(row.last_seen) || 0,
      Number(row.traffic_total) || 0,
      Number(row.req_total) || 0,
      Number(row.req_today) || 0,
      String(row.req_date || ''),
      now,
      now
    ).run();
    return true;
  } catch (_err) {
    return false;
  }
}

function tgpTrackTraffic(env, ctx, bytes = 0, isReq = false) {
  if (bytes > 0) TGP_MEM.pendingBytes += bytes;
  if (isReq) TGP_MEM.pendingReqs += 1;
  const now = Date.now();
  const shouldFlush = (TGP_MEM.pendingBytes >= 2 * 1024 * 1024) || (TGP_MEM.pendingReqs >= 10) ||
    (now - TGP_MEM.lastTrafficWrite > 60000);
  if (!shouldFlush || TGP_MEM.trafficLock || !env) return;
  if (TGP_MEM.pendingBytes <= 0 && TGP_MEM.pendingReqs <= 0) return;
  const db = tgpDb(env);
  if (!db) return;
  TGP_MEM.trafficLock = true;
  const commitBytes = TGP_MEM.pendingBytes;
  const commitReqs = TGP_MEM.pendingReqs;
  TGP_MEM.pendingBytes = 0;
  TGP_MEM.pendingReqs = 0;
  TGP_MEM.lastTrafficWrite = now;
  const task = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await db.prepare(
        `UPDATE telegram_proxy SET
           traffic_total = traffic_total + ?,
           req_total = req_total + ?,
           req_today = CASE WHEN req_date = ? THEN req_today + ? ELSE ? END,
           req_date = ?,
           updated_at = ?
         WHERE id = 1`
      ).bind(commitBytes, commitReqs, today, commitReqs, commitReqs, today, Date.now()).run();
      TGP_MEM.lastStatsFetch = 0;
    } catch (_e) {
      TGP_MEM.pendingBytes += commitBytes;
      TGP_MEM.pendingReqs += commitReqs;
    } finally {
      TGP_MEM.trafficLock = false;
    }
  };
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(task());
  else task();
}

function tgpMarkActive(env, ctx) {
  const now = Date.now();
  TGP_MEM.lastActivity = now;
  const db = tgpDb(env);
  if (db && (now - TGP_MEM.lastDbPing > 15000)) {
    TGP_MEM.lastDbPing = now;
    const task = db.prepare('UPDATE telegram_proxy SET last_seen = ? WHERE id = 1').bind(now).run().catch(() => {});
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(task);
  }
}

async function tgpReadStats(env, force = false) {
  const now = Date.now();
  const row = TGP_MEM.row || {};
  if (!force && now - TGP_MEM.lastStatsFetch < 4000) return TGP_MEM.dbStats;
  const db = tgpDb(env);
  if (db) {
    try {
      const res = await db.prepare(
        'SELECT traffic_total, req_total, req_today, req_date, last_seen FROM telegram_proxy WHERE id = 1'
      ).first();
      if (res) {
        TGP_MEM.dbStats = {
          traffic: Number(res.traffic_total) || 0,
          reqTotal: Number(res.req_total) || 0,
          reqToday: Number(res.req_today) || 0,
          date: String(res.req_date || ''),
          lastSeen: Number(res.last_seen) || 0
        };
        TGP_MEM.lastStatsFetch = now;
        return TGP_MEM.dbStats;
      }
    } catch (_e) {}
  }
  TGP_MEM.dbStats = {
    traffic: Number(row.traffic_total) || 0,
    reqTotal: Number(row.req_total) || 0,
    reqToday: Number(row.req_today) || 0,
    date: String(row.req_date || ''),
    lastSeen: Number(row.last_seen) || 0
  };
  TGP_MEM.lastStatsFetch = now;
  return TGP_MEM.dbStats;
}

async function tgpStatusPayload(env, url) {
  const config = await tgpGetConfig(env, true);
  const stats = await tgpReadStats(env, true);
  const host = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);
  const today = new Date().toISOString().split('T')[0];
  const lastSeen = Math.max(TGP_MEM.lastActivity, Number(stats.lastSeen) || 0);
  const online = config.active && (TGP_MEM.activeSessions > 0 || (Date.now() - lastSeen < 45000));
  const trafficBytes = stats.traffic + TGP_MEM.pendingBytes;
  const requestsTotal = stats.reqTotal + TGP_MEM.pendingReqs;
  const requestsToday = (stats.date === today ? stats.reqToday : 0) + TGP_MEM.pendingReqs;
  return {
    success: true,
    configured: Boolean(config.secret),
    enabled: config.enabled,
    active: config.active,
    status: config.status,
    name: config.name,
    secret: config.secret,
    host,
    port: 443,
    telegramUrl: config.secret
      ? `https://t.me/webproxy?server=${encodeURIComponent(host)}&secret=${encodeURIComponent(config.secret)}`
      : '',
    onlineCount: online ? Math.max(1, TGP_MEM.activeSessions) : 0,
    trafficBytes,
    requestsToday,
    requestsTotal
  };
}

// ---------------------------------------------------------------------------
// نشست رله: هر اتصال تلگرام ↔ یک سوکت MTProto به دیتاسنتر تلگرام
// ---------------------------------------------------------------------------
class TgpRelaySession {
  constructor(ctx, env, ws, secret) {
    this.ctx = ctx;
    this.env = env;
    this.ws = ws;
    this.secret = tgpSecretBytes(secret).inner;
    this.closed = false;
    this.countedActive = Boolean(ws);
    if (this.countedActive) {
      TGP_MEM.activeSessions++;
      tgpMarkActive(env, ctx);
    }
    this.streams = new Map();
    this.closedIds = new Set();
    this.maxStreams = tgpClampInt(env.MAX_STREAMS, 1, 128, 64);
    this.messageChain = Promise.resolve();
    this.ingressBytes = 0;
    this.ingressItems = 0;
    this.uplinkBytes = 0;
    this.uplinkItems = 0;
    this.downlinkBytes = 0;
    this.downlinkItems = 0;
    this.downlinkWaiters = new Set();
  }

  enqueueMessage(data) {
    if (this.closed) return;
    tgpMarkActive(this.env, this.ctx);
    const length = data instanceof Blob ? data.size : data instanceof ArrayBuffer ? data.byteLength : 0;
    if (!length || length > TGP_MAX_WS_MESSAGE) return this.protocolError('invalid_websocket_message');
    const cost = length + TGP_LIMITS.itemCost;
    if (this.ingressBytes + cost > TGP_LIMITS.ingressBytes || this.ingressItems >= TGP_LIMITS.ingressItems) {
      return this.protocolError('ingress_queue_limit');
    }
    this.ingressBytes += cost;
    this.ingressItems++;
    this.messageChain = this.messageChain
      .then(() => this.onMessage(data))
      .catch(() => this.protocolError('message_handler_failed'))
      .finally(() => {
        this.ingressBytes -= cost;
        this.ingressItems--;
      });
    if (this.ctx && this.ctx.waitUntil) this.ctx.waitUntil(this.messageChain);
    return this.messageChain;
  }

  async onMessage(data) {
    if (this.closed) return;
    if (data instanceof Blob) data = await data.arrayBuffer();
    if (this.closed) return;
    if (!(data instanceof ArrayBuffer) || !data.byteLength || data.byteLength > TGP_MAX_WS_MESSAGE) {
      return this.protocolError('invalid_websocket_message');
    }
    let frames;
    try {
      frames = tgpParseFrames(new Uint8Array(data));
    } catch (_e) {
      return this.protocolError('frame_parse_failed');
    }
    for (const frame of frames) {
      if (frame.streamId === 0) {
        if (frame.type !== TGP_FRAME.PONG || frame.payload.length > 64) return this.protocolError('invalid_control_frame');
      } else if (frame.type === TGP_FRAME.OPEN) this.openStream(frame);
      else if (frame.type === TGP_FRAME.DATA) this.queueWrite(frame);
      else if (frame.type === TGP_FRAME.WINDOW) this.addWindow(frame);
      else if (frame.type === TGP_FRAME.CLOSE) {
        if (frame.payload.length) return this.protocolError('invalid_close');
        if (!this.streams.has(frame.streamId) && !this.closedIds.has(frame.streamId)) return this.protocolError('unknown_stream');
        this.closeStream(frame.streamId, false);
      } else return this.protocolError('unknown_frame_type');
      if (this.closed) return;
    }
  }

  openStream(frame) {
    const id = frame.streamId;
    if (!id || frame.payload.length || this.streams.has(id) || this.closedIds.has(id)) return this.protocolError('invalid_open');
    if (this.streams.size >= this.maxStreams) {
      this.rememberClosed(id);
      return this.sendFrame(TGP_FRAME.CLOSE, id);
    }
    const stream = {
      id,
      socket: null,
      writer: null,
      handshake: new Uint8Array(),
      handshakeBytes: 0,
      receiveWindow: TGP_INITIAL_WINDOW,
      sendCredit: TGP_INITIAL_WINDOW,
      closed: false,
      queue: [],
      queueHead: 0,
      pendingBytes: 0,
      pendingItems: 0,
      draining: false,
      abort: new AbortController(),
      sent: [],
      sentHead: 0,
      downlinkBytes: 0,
      downlinkItems: 0
    };
    stream.handshakeTimer = setTimeout(() => {
      this.closeStream(id, true);
    }, TGP_LIMITS.handshakeTimeout);
    this.streams.set(id, stream);
  }

  queueWrite(frame) {
    const stream = this.streams.get(frame.streamId);
    if (!stream) {
      if (this.closedIds.has(frame.streamId) && frame.payload.length) return;
      return this.protocolError('unknown_stream');
    }
    const length = frame.payload.length;
    if (!length || length > stream.receiveWindow) return this.protocolError('invalid_data_window');
    tgpTrackTraffic(this.env, this.ctx, length, false);
    const cost = length + TGP_HEADER_SIZE + TGP_LIMITS.itemCost;
    if (
      stream.pendingBytes + cost > TGP_LIMITS.streamBytes ||
      stream.pendingItems >= TGP_LIMITS.streamItems ||
      this.uplinkBytes + cost > TGP_LIMITS.uplinkBytes ||
      this.uplinkItems >= TGP_LIMITS.uplinkItems
    ) {
      return this.closeStream(stream.id, true);
    }
    stream.receiveWindow -= length;
    stream.pendingBytes += cost;
    stream.pendingItems++;
    this.uplinkBytes += cost;
    this.uplinkItems++;
    stream.queue.push({ payload: new Uint8Array(frame.payload), cost });
    if (!stream.draining) {
      stream.draining = true;
      const drainPromise = this.drainStream(stream);
      if (this.ctx && this.ctx.waitUntil) this.ctx.waitUntil(drainPromise);
    }
  }

  releaseWrite(stream, item) {
    stream.pendingBytes -= item.cost;
    stream.pendingItems--;
    this.uplinkBytes -= item.cost;
    this.uplinkItems--;
  }

  async drainStream(stream) {
    try {
      while (!stream.closed && !this.closed && stream.queueHead < stream.queue.length) {
        const item = stream.queue[stream.queueHead];
        stream.queue[stream.queueHead++] = null;
        try {
          await this.writeStream(stream, item.payload);
        } finally {
          this.releaseWrite(stream, item);
        }
        if (stream.queueHead === stream.queue.length) {
          stream.queue = [];
          stream.queueHead = 0;
        } else if (stream.queueHead >= 64) {
          stream.queue = stream.queue.slice(stream.queueHead);
          stream.queueHead = 0;
        }
      }
    } catch (_error) {
      this.closeStream(stream.id, true);
    } finally {
      stream.draining = false;
    }
  }

  active(stream) {
    if (stream.closed || this.closed) throw new Error('stream closed');
  }

  async writeStream(stream, payload) {
    this.active(stream);
    let grant = payload.length;
    if (!stream.writer) {
      const take = Math.min(64 - stream.handshake.length, payload.length);
      const joined = new Uint8Array(stream.handshake.length + take);
      joined.set(stream.handshake);
      joined.set(payload.subarray(0, take), stream.handshake.length);
      stream.handshake = joined;
      stream.handshakeBytes += take;
      if (joined.length < 64) return;
      const client = await tgpAcceptClientHandshake(joined, this.secret);
      this.active(stream);
      const tg = await tgpCreateTelegramHandshake(client.tag, client.dcId);
      this.active(stream);
      clearTimeout(stream.handshakeTimer);
      stream.handshakeTimer = null;
      const socket = cfConnect({ hostname: TGP_DCS[Math.abs(client.dcId)], port: 443 }, { allowHalfOpen: false });
      stream.socket = socket;
      Promise.resolve(socket.closed).catch(() => {});
      await tgpWaitFor(socket.opened, stream.abort.signal, TGP_LIMITS.connectTimeout, 'connect timeout');
      this.active(stream);
      stream.writer = socket.writable.getWriter();
      stream.clientDecrypt = client.clientDecrypt;
      stream.clientEncrypt = client.clientEncrypt;
      stream.tgEncrypt = tg.encrypt;
      stream.tgDecrypt = tg.decrypt;
      stream.handshake = new Uint8Array();
      await tgpWaitFor(stream.writer.write(tg.wire), stream.abort.signal, TGP_LIMITS.writeTimeout, 'write timeout');
      this.active(stream);
      if (this.ctx && this.ctx.waitUntil) this.ctx.waitUntil(this.readStream(stream));
      else this.readStream(stream);
      grant = stream.handshakeBytes + payload.length - take;
      stream.handshakeBytes = 0;
      payload = payload.subarray(take);
    }
    for (let offset = 0; offset < payload.length; offset += TGP_DATA_CHUNK) {
      const plain = await stream.clientDecrypt.crypt(payload.subarray(offset, offset + TGP_DATA_CHUNK));
      this.active(stream);
      const encrypted = await stream.tgEncrypt.crypt(plain);
      this.active(stream);
      await tgpWaitFor(stream.writer.write(encrypted), stream.abort.signal, TGP_LIMITS.writeTimeout, 'write timeout');
      this.active(stream);
    }
    this.grantWindow(stream, grant);
  }

  grantWindow(stream, length) {
    if (stream.closed || this.closed || !length) return;
    stream.receiveWindow += length;
    this.sendFrame(TGP_FRAME.WINDOW, stream.id, tgpU32(length));
  }

  addWindow(frame) {
    if (frame.payload.length !== 4) return this.protocolError('invalid_window');
    const amount = new DataView(frame.payload.buffer, frame.payload.byteOffset, 4).getUint32(0);
    if (!amount) return this.protocolError('invalid_window');
    const stream = this.streams.get(frame.streamId);
    if (!stream) {
      if (this.closedIds.has(frame.streamId)) return;
      return this.protocolError('unknown_stream');
    }
    if (amount > TGP_INITIAL_WINDOW - stream.sendCredit) return this.protocolError('window_overflow');
    stream.sendCredit += amount;
    let remaining = amount;
    while (remaining) {
      const item = stream.sent[stream.sentHead];
      if (!item) break;
      const used = Math.min(remaining, item.remaining);
      item.remaining -= used;
      remaining -= used;
      stream.downlinkBytes -= used;
      this.downlinkBytes -= used;
      if (!item.remaining) {
        const overhead = TGP_HEADER_SIZE + TGP_LIMITS.itemCost;
        stream.downlinkBytes -= overhead;
        this.downlinkBytes -= overhead;
        stream.downlinkItems--;
        this.downlinkItems--;
        stream.sent[stream.sentHead++] = null;
      }
    }
    if (stream.sentHead === stream.sent.length) {
      stream.sent = [];
      stream.sentHead = 0;
    } else if (stream.sentHead >= 64) {
      stream.sent = stream.sent.slice(stream.sentHead);
      stream.sentHead = 0;
    }
    this.wakeDownlink();
  }

  downlinkRoom(stream) {
    if (this.downlinkItems >= TGP_LIMITS.downlinkItems) return 0;
    return Math.max(0, Math.min(
      TGP_DATA_CHUNK,
      stream.sendCredit,
      TGP_LIMITS.downlinkBytes - this.downlinkBytes - TGP_HEADER_SIZE - TGP_LIMITS.itemCost
    ));
  }

  async waitDownlink(stream) {
    while (!stream.closed && !this.closed && !this.downlinkRoom(stream)) {
      await new Promise((resolve) => this.downlinkWaiters.add(resolve));
    }
    return !stream.closed && !this.closed;
  }

  wakeDownlink() {
    const waiters = [...this.downlinkWaiters];
    this.downlinkWaiters.clear();
    for (const resolve of waiters) resolve();
  }

  async readStream(stream) {
    const reader = stream.socket.readable.getReader();
    try {
      while (await this.waitDownlink(stream)) {
        const { value, done } = await reader.read();
        if (done || stream.closed || this.closed) break;
        const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
        tgpTrackTraffic(this.env, this.ctx, bytes.length, false);
        let offset = 0;
        while (offset < bytes.length && await this.waitDownlink(stream)) {
          const size = Math.min(bytes.length - offset, this.downlinkRoom(stream));
          if (!size) continue;
          const cost = size + TGP_HEADER_SIZE + TGP_LIMITS.itemCost;
          stream.sendCredit -= size;
          stream.sent.push({ remaining: size });
          stream.downlinkBytes += cost;
          stream.downlinkItems++;
          this.downlinkBytes += cost;
          this.downlinkItems++;
          const plain = await stream.tgDecrypt.crypt(bytes.subarray(offset, offset + size));
          this.active(stream);
          const encrypted = await stream.clientEncrypt.crypt(plain);
          this.active(stream);
          this.sendFrame(TGP_FRAME.DATA, stream.id, encrypted);
          offset += size;
        }
      }
    } catch (_error) {
    } finally {
      tgpIgnoreFailure(() => reader.cancel());
      try { reader.releaseLock(); } catch (_e) {}
      this.closeStream(stream.id, true);
    }
  }

  closeStream(id, notify) {
    const stream = this.streams.get(id);
    if (!stream) return;
    this.streams.delete(id);
    this.rememberClosed(id);
    stream.closed = true;
    clearTimeout(stream.handshakeTimer);
    stream.handshakeTimer = null;
    stream.abort.abort();
    for (let i = stream.queueHead; i < stream.queue.length; i++) this.releaseWrite(stream, stream.queue[i]);
    stream.queue = [];
    stream.queueHead = 0;
    stream.handshake = new Uint8Array();
    this.downlinkBytes -= stream.downlinkBytes;
    this.downlinkItems -= stream.downlinkItems;
    stream.downlinkBytes = 0;
    stream.downlinkItems = 0;
    stream.sent = [];
    stream.sentHead = 0;
    this.wakeDownlink();
    tgpIgnoreFailure(() => stream.writer?.abort());
    tgpIgnoreFailure(() => stream.socket?.close());
    if (notify && !this.closed) this.sendFrame(TGP_FRAME.CLOSE, id);
  }

  rememberClosed(id) {
    this.closedIds.add(id);
    if (this.closedIds.size > 4096) this.closedIds.delete(this.closedIds.values().next().value);
  }

  sendFrame(type, streamId, payload = new Uint8Array()) {
    if (this.closed || !this.ws || this.ws.readyState !== 1) return;
    try {
      this.ws.send(tgpEncodeFrame(type, streamId, payload));
    } catch (_e) {
      this.shutdown('websocket_send_failed');
    }
  }

  protocolError(reason = 'protocol_error') {
    this.sendFrame(TGP_FRAME.BYE, 0);
    this.shutdown(reason);
  }

  shutdown() {
    if (this.closed) return;
    this.closed = true;
    if (this.countedActive) {
      this.countedActive = false;
      TGP_MEM.activeSessions = Math.max(0, TGP_MEM.activeSessions - 1);
    }
    for (const id of [...this.streams.keys()]) this.closeStream(id, false);
    this.wakeDownlink();
    try { this.ws?.close(1000, 'session closed'); } catch (_e) {}
    this.ws = null;
  }
}

// ---------------------------------------------------------------------------
// صفحهٔ پل (bridge) که کلاینت تلگرام در WebView باز می‌کند
// ---------------------------------------------------------------------------
function tgpBridgePage(host, bootstrap) {
  const scriptNonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))));
  const config = JSON.stringify({
    origin: `https://${host}`,
    bootstrap,
    batchLimit: TGP_MAX_WS_MESSAGE,
    maxPendingItems: 1024,
    connectTimeout: 15000
  });
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Web Proxy</title></head>
<body><main><h1>Connection bridge</h1><p>This page is opened by a compatible Telegram client.</p></main>
<script nonce="${scriptNonce}">
(()=>{
'use strict';
const cfg=${config};
let port=null, sessionToken='', socket=null, creating=false, closed=false;
const pending=[]; let pendingBytes=0;
const bootstrapAbort=new AbortController(); let connectTimer=null;
const fragment=new URLSearchParams(location.hash.slice(1));
const nonce=fragment.get('android')||'';
history.replaceState(null,'','/');
function status(state){try{port&&port.postMessage({t:'status',state})}catch(e){}}
function splitFrames(buffer){
 const input=new Uint8Array(buffer); let off=0,count=0,out=[];
 while(off<input.length){
  if(++count>4096||input.length-off<8)throw Error('bad frame');
  const view=new DataView(input.buffer,input.byteOffset+off,8); const len=view.getUint32(4);
  if(len>1048576||off+8+len>input.length)throw Error('bad frame');
  out.push(buffer.slice(off,off+8+len)); off+=8+len;
 }
 if(!out.length)throw Error('empty'); return out;
}
function sendToApp(buffer){for(const frame of splitFrames(buffer))port.postMessage(frame,[frame]);}
function fail(){if(closed)return;status('failed');close(false)}
async function createSession(hello){
 try{
  const response=await fetch(cfg.origin+'/api/v1/session',{method:'POST',headers:{Authorization:'Bearer '+cfg.bootstrap,'Content-Type':'application/octet-stream','X-Carrier-Mode':'websocket'},body:hello,mode:'same-origin',redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:bootstrapAbort.signal});
  if(!response.ok||response.headers.get('X-Carrier-Mode')!=='websocket')throw Error('session');
  sessionToken=response.headers.get('X-Session-Token')||'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(sessionToken))throw Error('token');
  const welcome=await response.arrayBuffer();
  if(closed)return;
  if(welcome.byteLength!==8||new Uint8Array(welcome)[0]!==0x11||new Uint8Array(welcome).slice(1).some(v=>v!==0))throw Error('welcome');
  sendToApp(welcome);
  if(!closed)openSocket();
 }catch(e){fail()}
}
function openSocket(){
 const target=cfg.origin.replace(/^https:/,'wss:')+'/api/v1/ws';
 socket=new WebSocket(target,'tproxy-v1.'+sessionToken); socket.binaryType='arraybuffer';
 socket.onopen=()=>{
  if(closed)return; clearTimeout(connectTimer);connectTimer=null;status('connected');
  try{for(const data of pending){if(socket.bufferedAmount+data.byteLength>cfg.batchLimit)return fail();socket.send(data)}}catch(e){return fail()}
  pending.length=0;pendingBytes=0;
 };
 socket.onmessage=e=>{if(closed)return;if(!(e.data instanceof ArrayBuffer)||!e.data.byteLength||e.data.byteLength>cfg.batchLimit)return fail();try{sendToApp(e.data)}catch(err){return fail()}};
 socket.onerror=()=>{}; socket.onclose=()=>{if(!closed)fail()};
}
function fromApp(data){
 if(closed)return;
 if(data instanceof ArrayBuffer){
  if(!data.byteLength||data.byteLength>cfg.batchLimit)return fail();
  try{splitFrames(data)}catch(err){return fail()}
  if(!creating){creating=true;connectTimer=setTimeout(fail,cfg.connectTimeout);createSession(data);return}
  if(!sessionToken||!socket||socket.readyState!==WebSocket.OPEN){if(pending.length>=cfg.maxPendingItems||pendingBytes+data.byteLength>cfg.batchLimit)return fail();pending.push(data);pendingBytes+=data.byteLength;return}
  if(socket.bufferedAmount+data.byteLength>cfg.batchLimit)return fail();
  try{socket.send(data)}catch(err){fail()}
 }else if(data&&data.t==='close')close(true);
}
function activate(next){port=next;port.onmessage=e=>fromApp(e.data);port.start&&port.start();status('connecting')}
const native=globalThis.TelegramWebProxy;
if(/^[A-Za-z0-9_-]{43}$/.test(nonce)&&native&&typeof native.postMessage==='function'){
 const adapter={onmessage:null,start(){},close(){native.onmessage=null},postMessage(value){
  if(value instanceof ArrayBuffer){for(const frame of splitFrames(value))native.postMessage(frame)}
  else native.postMessage(JSON.stringify(value));
 }};
 native.onmessage=e=>{let d=e.data;if(typeof d==='string'){try{d=JSON.parse(d)}catch(err){return}}adapter.onmessage&&adapter.onmessage({data:d})};
 activate(adapter);native.postMessage(JSON.stringify({t:'tproxy-android-init',v:1,nonce}));
}
addEventListener('message',e=>{
 if(closed||port||e.source!==parent||!e.data||e.data.t!=='tproxy-init'||e.data.v!==1||e.ports.length!==1)return;
 try{const u=new URL(e.origin);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port)return}catch(err){return}
 activate(e.ports[0]);
});
function close(notify){if(closed)return;closed=true;clearTimeout(connectTimer);connectTimer=null;bootstrapAbort.abort();pending.length=0;pendingBytes=0;try{socket&&socket.close()}catch(e){}if(notify&&sessionToken)fetch(cfg.origin+'/api/v1/session',{method:'DELETE',headers:{Authorization:'Bearer '+sessionToken},keepalive:true,mode:'same-origin',redirect:'error',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'}).catch(()=>{});try{port&&port.close()}catch(e){}}
addEventListener('pagehide',()=>close(true),{once:true});
})();
</script></body></html>`;
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${scriptNonce}'; connect-src https://${host} wss://${host}; style-src 'none'; img-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors http://127.0.0.1:*; sandbox allow-same-origin allow-scripts`,
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  });
}

// ---------------------------------------------------------------------------
// صفحهٔ عمومی پروکسی (لینک قابل اشتراک)
// ---------------------------------------------------------------------------
function tgpEscapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function tgpPublicPage(host, secret, name) {
  const safeHost = tgpEscapeHtml(tgpCanonicalHost(host));
  const safeSecret = String(secret || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
  const safeName = tgpEscapeHtml(name || BRAND_NAME || 'Telegram-Proxy');
  const telegramUrl = `https://t.me/webproxy?server=${encodeURIComponent(tgpCanonicalHost(host))}&secret=${encodeURIComponent(safeSecret)}`;
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${safeName} · پروکسی تلگرام</title><style>
:root{color-scheme:dark;--bg:#080b10;--panel:#111721;--field:#080c12;--line:#26303c;--line2:#3a4757;--text:#e7edf4;--muted:#8793a2;--blue:#0284c7;--blue2:#38bdf8;--green:#46d98b}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-height:100vh;background:linear-gradient(180deg,#070a0f,#0c1117 50%,#070a0f);color:var(--text);font:14px/1.7 Vazirmatn,Tahoma,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{width:min(640px,calc(100% - 24px));margin:0 auto;padding:26px 0 38px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:16px;padding:12px 14px;background:#0f141b;border:1px solid var(--line);border-radius:14px}
.brand{display:flex;gap:12px;align-items:center}.mark{width:38px;height:38px;display:grid;place-items:center;border:1px solid #334152;border-radius:11px;background:#080c12;color:var(--blue2)}.mark svg{width:22px;height:22px}
.brand h1{font-size:15px;margin:0;font-weight:800}.brand p{font-size:11px;color:var(--muted);margin:2px 0 0}
.state{display:flex;align-items:center;gap:6px;color:#94a0af;font-size:11px}.state i{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 8px rgba(70,217,139,.55)}
h2{font-size:17px;margin:16px 0 3px;font-weight:800}.intro{color:var(--muted);font-size:12px;margin:0 0 14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card{position:relative;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
.card:before{content:"";position:absolute;right:-1px;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--blue);opacity:.85}
.wide{grid-column:1/-1}.label{font-size:11px;color:#a9b4c1;font-weight:700;margin-bottom:6px}
.value{font-size:12px;word-break:break-all;direction:ltr;text-align:left}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.row{display:flex;gap:8px;align-items:center}.row .value{flex:1;min-width:0}
.btn{height:34px;border:1px solid var(--line2);background:#0a0f15;color:#dce4ed;border-radius:9px;padding:0 12px;font:700 11px system-ui;cursor:pointer;text-decoration:none;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.btn:hover{background:#121a24;border-color:#536275}.btn.primary{background:var(--blue);border-color:var(--blue);color:#fff}
.btn.primary:hover{background:#0369a1}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.footer{text-align:center;color:#5f6b79;font-size:10px;margin-top:20px}
</style></head><body><main class="wrap">
<header class="top"><div class="brand"><div class="mark"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.94-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/></svg></div><div><h1>${safeName}</h1><p>پروکسی پرسرعت تلگرام</p></div></div><div class="state"><i></i>آنلاین</div></header>
<h2>مشخصات پروکسی</h2><p class="intro">پروکسی تلگرام شما آماده اتصال است. برای استفاده، دکمه اتصال به پروکسی را بزنید.</p>
<section class="grid">
<div class="card"><div class="label">سرور (Host)</div><div class="value mono">${safeHost}</div></div>
<div class="card"><div class="label">پورت (Port)</div><div class="value mono">443</div></div>
<div class="card wide"><div class="label">سکرت (Secret)</div><div class="row"><div class="value mono" id="secret">${safeSecret}</div><button class="btn" onclick="copyText('${safeSecret}',this)">کپی</button></div></div>
<div class="card wide"><div class="label">لینک وب پروکسی تلگرام</div><div class="row"><div class="value mono">${telegramUrl}</div><button class="btn" onclick="copyText('${telegramUrl}',this)">کپی لینک</button></div>
<div class="actions"><button class="btn primary" id="openProxy">اتصال مستقیم به تلگرام</button><a class="btn" href="/healthz">بررسی وضعیت</a></div></div>
</section>
<div class="footer">${safeName} · Powered by ${tgpEscapeHtml(BRAND_NAME || 'miliconfig')}</div></main>
<script>const telegram=${JSON.stringify(telegramUrl)};document.getElementById("openProxy").onclick=function(){location.href=telegram};function copyText(value,button){if(!value)return;var done=function(){var old=button.textContent;button.textContent="کپی شد!";setTimeout(function(){button.textContent=old},1200)};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(done).catch(function(){})}else{var area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();try{document.execCommand("copy");done()}catch(e){}area.remove()}}</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

// ---------------------------------------------------------------------------
// هندلرهای عمومی (بدون احراز هویت، مثل خود پروتکل تلگرام)
// ---------------------------------------------------------------------------
async function handleTelegramProxyGenericRequest(request, env, url) {
  const path = url.pathname;
  if (path !== '/' && path !== '/healthz') return null;
  const config = await tgpGetConfig(env);
  if (!config.active) return null;
  const expectedHost = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);

  if (path === '/healthz') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return null;
    return tgpJson({ ok: true, carrier: 'websocket', relay: 'direct-telegram-dc', name: config.name }, 200);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;

  const capability = tgpExactBridgeQuery(url);
  if (capability) {
    if (!(await tgpCapabilityMatches(capability, expectedHost, config.secret))) return tgpCamouflage();
    const bootstrap = await tgpCreateBootstrap(env, config.secret);
    return tgpBridgePage(expectedHost, bootstrap);
  }
  if (tgpExactTelegramQuery(url, expectedHost, config.secret)) {
    return tgpPublicPage(expectedHost, config.secret, config.name);
  }
  return null;
}

async function handleTelegramProxyWs(request, env, ctx, url) {
  const config = await tgpGetConfig(env);
  if (!config.active) return tgpCamouflage();
  tgpTrackTraffic(env, ctx, 0, true);
  const expectedHost = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);
  const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(v => v.trim());
  const protocol = protocols.find(v => v.startsWith('tproxy-v1.'));
  const token = protocol ? protocol.slice('tproxy-v1.'.length) : '';
  if (!token || !(await tgpVerifySessionToken(env, expectedHost, token, config.secret))) return tgpCamouflage();

  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();
  const session = new TgpRelaySession(ctx, env, server, config.secret);
  server.addEventListener('message', (event) => session.enqueueMessage(event.data));
  server.addEventListener('close', () => session.shutdown());
  server.addEventListener('error', () => session.shutdown());
  return new Response(null, {
    status: 101,
    webSocket: client,
    headers: protocol ? { 'Sec-WebSocket-Protocol': protocol } : {}
  });
}

async function handleTelegramProxySessionRequest(request, env, ctx, url) {
  const config = await tgpGetConfig(env);
  if (!config.active) return tgpCamouflage();
  const expectedHost = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);

  if (request.method === 'DELETE') {
    const token = tgpBearer(request);
    if (!(await tgpVerifySessionToken(env, expectedHost, token, config.secret))) return tgpCamouflage();
    return new Response(null, { status: 204, headers: tgpNoStore() });
  }
  if (request.method !== 'POST' || !tgpIsBinary(request.headers.get('Content-Type'))) return tgpCamouflage();
  if (request.headers.has('Cookie')) return tgpCamouflage();
  const bootstrap = tgpBearer(request);
  if (!bootstrap || !(await tgpVerifyBootstrap(env, bootstrap, config.secret))) return tgpCamouflage();
  const hello = await tgpReadHello(request);
  if (!tgpIsHello(hello)) return tgpCamouflage();

  const sessionToken = await tgpCreateSessionToken(env, expectedHost, config.secret);
  tgpMarkActive(env, ctx);
  tgpTrackTraffic(env, ctx, 0, true);
  const welcome = tgpEncodeFrame(TGP_FRAME.WELCOME, 0);
  return new Response(welcome, {
    status: 200,
    headers: {
      ...tgpNoStore(),
      'Content-Type': 'application/octet-stream',
      'X-Session-Token': sessionToken,
      'X-Carrier-Mode': 'websocket',
      'X-Down-Cursor': '0'
    }
  });
}

// ---------------------------------------------------------------------------
// API مدیریت پروکسی (فقط با نشست معتبر مدیر از مسیر /api/...)
// ---------------------------------------------------------------------------
async function handleTelegramProxyAdminApi(request, env, ctx, url, subPath) {
  const action = String(subPath || '').slice('telegram-proxy/'.length).replace(/\/+$/, '');
  if (action === 'status' && request.method === 'GET') {
    return tgpJson(await tgpStatusPayload(env, url));
  }

  if (action === 'save' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim().slice(0, 60) || 'Telegram-Proxy';
    let secret = String(body.secret || '').trim().toLowerCase();
    if (!secret) secret = tgpRandomHex(16);
    if (!tgpIsValidSecret(secret)) {
      return tgpJson({ success: false, message: 'سکرت پروکسی باید ۳۲ کاراکتر هگزا باشد (یا با پیشوند dd)' }, 400);
    }
    const ok = await tgpSaveRow(env, { name, secret, status: 'active', enabled: 1 });
    if (!ok) return tgpJson({ success: false, message: 'ذخیرهٔ تنظیمات پروکسی در دیتابیس انجام نشد' }, 500);
    const host = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);
    return tgpJson({
      success: true,
      name,
      secret,
      host,
      port: 443,
      telegramUrl: `https://t.me/webproxy?server=${encodeURIComponent(host)}&secret=${encodeURIComponent(secret)}`
    });
  }

  if (action === 'update-secret' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const secret = String(body.secret || '').trim().toLowerCase();
    if (!tgpIsValidSecret(secret)) {
      return tgpJson({ success: false, message: 'سکرت پروکسی باید ۳۲ کاراکتر هگزا باشد (یا با پیشوند dd)' }, 400);
    }
    const ok = await tgpSaveRow(env, { secret });
    if (!ok) return tgpJson({ success: false, message: 'ذخیرهٔ سکرت در دیتابیس انجام نشد' }, 500);
    const host = tgpCanonicalHost(env.PUBLIC_HOSTNAME || url.hostname);
    return tgpJson({
      success: true,
      secret,
      telegramUrl: `https://t.me/webproxy?server=${encodeURIComponent(host)}&secret=${encodeURIComponent(secret)}`
    });
  }

  if (action === 'toggle' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const willEnable = Boolean(body.enabled);
    const ok = await tgpSaveRow(env, { enabled: willEnable ? 1 : 0, status: willEnable ? 'active' : 'stopped' });
    if (!ok) return tgpJson({ success: false, message: 'تغییر وضعیت پروکسی در دیتابیس انجام نشد' }, 500);
    return tgpJson({ success: true, enabled: willEnable, status: willEnable ? 'active' : 'stopped' });
  }

  if (action === 'reset-stats' && request.method === 'POST') {
    TGP_MEM.pendingBytes = 0;
    TGP_MEM.pendingReqs = 0;
    TGP_MEM.lastStatsFetch = 0;
    TGP_MEM.dbStats = { traffic: 0, reqTotal: 0, reqToday: 0, date: '', lastSeen: TGP_MEM.lastActivity };
    if (TGP_MEM.row) {
      TGP_MEM.row.traffic_total = 0;
      TGP_MEM.row.req_total = 0;
      TGP_MEM.row.req_today = 0;
      TGP_MEM.row.req_date = '';
    }
    const db = tgpDb(env);
    if (db) {
      try {
        await db.prepare(
          `UPDATE telegram_proxy SET traffic_total = 0, req_total = 0, req_today = 0, req_date = '', updated_at = ? WHERE id = 1`
        ).bind(Date.now()).run();
      } catch (err) {
        return tgpJson({ success: false, message: 'صفر کردن آمار ناموفق بود: ' + (err?.message || err) }, 500);
      }
    }
    return tgpJson({ success: true });
  }

  if (action === 'delete' && request.method === 'POST') {
    const db = tgpDb(env);
    if (db) {
      try {
        await db.prepare('DELETE FROM telegram_proxy WHERE id = 1').run();
      } catch (err) {
        return tgpJson({ success: false, message: 'حذف پروکسی ناموفق بود: ' + (err?.message || err) }, 500);
      }
    }
    tgpInvalidate();
    TGP_MEM.activeSessions = 0;
    TGP_MEM.lastActivity = 0;
    TGP_MEM.lastDbPing = 0;
    TGP_MEM.pendingBytes = 0;
    TGP_MEM.pendingReqs = 0;
    TGP_MEM.dbStats = { traffic: 0, reqTotal: 0, reqToday: 0, date: '', lastSeen: 0 };
    return tgpJson({ success: true });
  }

  return tgpJson({ success: false, message: 'مسیر پروکسی تلگرام یافت نشد' }, 404);
}
