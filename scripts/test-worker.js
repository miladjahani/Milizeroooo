// ============================================================================
// miliconfig v3.9 - اسکریپت تست جامع و خودکار
// تست باندل مبهم‌شده، عدم وجود کلیدواژه‌های حساس کلادفلر، عدم وقوع Error 1101،
// امنیت (تزریق XSS، مسدودسازی SSRF، محدودیت Brute-Force، احراز هویت ادمین)،
// دور زدن فیلترینگ دامنهٔ Pages.dev در ایران، دیتابیس D1 و سقف ۳ کاربر
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import nodeCrypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CF_PORT_CHOICES, VERSION } from '../src/config/defaults.js';

if (!globalThis.crypto && nodeCrypto.webcrypto) {
  globalThis.crypto = nodeCrypto.webcrypto;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const bundlePath = path.join(projectRoot, 'dist', '_worker.js');

function createMockD1Database() {
  const store = new Map();
  store.set('users', []);
  store.set('system_config', []);
  store.set('telegram_proxy', []);

  function getTableRows(table) {
    if (!store.has(table)) store.set(table, []);
    return store.get(table);
  }

  return {
    // D1 واقعی batch دارد؛ این mock هم باید داشته باشد تا ذخیرهٔ تنظیمات
    // (saveGlobalConfig) در تست‌ها واقعاً نوشته شود.
    async batch(statements) {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      return results;
    },
    prepare(sql) {
      const trimmed = sql.trim();
      return {
        _sql: trimmed,
        _binds: [],
        bind(...args) {
          this._binds = args;
          return this;
        },
        async run() {
          const s = this._sql;
          if (s.startsWith('CREATE TABLE') || s.startsWith('ALTER TABLE')) {
            return { success: true };
          }
          if (s.includes('INSERT') && s.includes('users')) {
            const rows = getTableRows('users');
            const [id, username, uuid, subNodeCount, status, enabled, dataLimitGb, usedBytes, lifetimeBytes, requestCount, expireDays, expireAt, startOnFirstUse, ipLimit, nodeScope, preset, configJson] = this._binds;
            const existingIdx = rows.findIndex(r => r.id === id);
            const rowObj = {
              id, username, uuid,
              sub_node_count: subNodeCount,
              status: status || 'active',
              enabled: enabled ? 1 : 0,
              data_limit_gb: dataLimitGb || 0,
              used_bytes: usedBytes || 0,
              lifetime_bytes: lifetimeBytes || 0,
              request_count: requestCount || 0,
              expire_days: expireDays || 0,
              expire_at: expireAt || 0,
              start_on_first_use: startOnFirstUse ? 1 : 0,
              ip_limit: ipLimit || 50,
              node_scope: nodeScope || 'all',
              preset: preset || 'custom',
              config_json: configJson || '{}',
              created_at: Date.now(),
              updated_at: Date.now()
            };
            if (existingIdx >= 0) rows[existingIdx] = rowObj;
            else rows.push(rowObj);
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('system_config') && (s.includes('INSERT') || s.includes('REPLACE'))) {
            const rows = getTableRows('system_config');
            // بعضی INSERTها کلید را به‌صورت literal داخل SQL دارند (مثل
            // admin_password_hash) و بعضی آن را با bind می‌فرستند.
            let k, v;
            if (s.includes("'admin_password_hash'")) {
              k = 'admin_password_hash';
              v = this._binds[0];
            } else {
              [k, v] = this._binds;
            }
            const existing = rows.find(r => r.key === k);
            if (existing) existing.value = v;
            else rows.push({ key: k, value: v, updated_at: Date.now() });
            return { success: true, meta: { changes: 1 } };
          }
          if (s.startsWith('UPDATE users SET used_bytes')) {
            const rows = getTableRows('users');
            const [b1, b2, r1, f1, f2, ts, id] = this._binds;
            const hit = rows.find(r => r.id === id);
            if (hit) {
              hit.used_bytes = (Number(hit.used_bytes) || 0) + (Number(b1) || 0);
              hit.lifetime_bytes = (Number(hit.lifetime_bytes) || 0) + (Number(b2) || 0);
              hit.request_count = (Number(hit.request_count) || 0) + (Number(r1) || 0);
              if (!hit.first_connected_at && f1) hit.first_connected_at = f1;
              hit.updated_at = ts;
            }
            return { success: true, meta: { changes: hit ? 1 : 0 } };
          }
          if (s.includes('DELETE FROM users')) {
            const rows = getTableRows('users');
            const id = this._binds[0];
            const filtered = rows.filter(r => r.id !== id);
            store.set('users', filtered);
            return { success: true, meta: { changes: 1 } };
          }
          if (s.includes('telegram_proxy')) {
            const rows = getTableRows('telegram_proxy');
            if (s.startsWith('DELETE')) {
              store.set('telegram_proxy', []);
              return { success: true, meta: { changes: 1 } };
            }
            if (s.startsWith('INSERT')) {
              const [name, secret, status, enabled, lastSeen, traffic, reqTotal, reqToday, reqDate, createdAt, updatedAt] = this._binds;
              rows[0] = {
                id: 1, name, secret, status, enabled, last_seen: lastSeen,
                traffic_total: traffic, req_total: reqTotal, req_today: reqToday, req_date: reqDate,
                created_at: createdAt, updated_at: updatedAt
              };
              return { success: true, meta: { changes: 1 } };
            }
            if (s.startsWith('UPDATE')) {
              const row = rows[0] || {
                id: 1, name: '', secret: '', status: 'not_created', enabled: 0, last_seen: 0,
                traffic_total: 0, req_total: 0, req_today: 0, req_date: ''
              };
              if (s.includes('traffic_total = 0')) {
                row.traffic_total = 0;
                row.req_total = 0;
                row.req_today = 0;
                row.req_date = '';
              } else if (s.includes('traffic_total = traffic_total + ?')) {
                const [bytes, reqs, today, reqsToday, reqsTodayAlt, date] = this._binds;
                row.traffic_total = (Number(row.traffic_total) || 0) + bytes;
                row.req_total = (Number(row.req_total) || 0) + reqs;
                row.req_today = row.req_date === today ? (Number(row.req_today) || 0) + reqsToday : reqsTodayAlt;
                row.req_date = date;
              } else if (s.includes('last_seen = ?')) {
                row.last_seen = this._binds[0];
              }
              rows[0] = row;
              return { success: true, meta: { changes: 1 } };
            }
          }
          return { success: true, meta: { changes: 0 } };
        },
        async first(col) {
          const s = this._sql;
          if (s.includes('system_config WHERE key =')) {
            // SELECTهایی که کلید را literal دارند (admin_password_hash) bind ندارند.
            let k = this._binds[0];
            if (!k) {
              const literal = s.match(/key\s*=\s*'([^']+)'/i);
              k = literal ? literal[1] : '';
            }
            const rows = getTableRows('system_config');
            const hit = rows.find(r => r.key === k);
            if (!hit) return null;
            return col ? hit[col] : hit;
          }
          if (s.includes('FROM users WHERE id =') || s.includes('FROM users WHERE uuid =')) {
            const val = this._binds[0];
            const rows = getTableRows('users');
            const hit = rows.find(r => r.id === val || r.uuid === val);
            if (!hit) return null;
            return col ? hit[col] : hit;
          }
          if (s.includes('FROM telegram_proxy')) {
            const rows = getTableRows('telegram_proxy');
            const hit = rows[0] || null;
            if (!hit) return null;
            return col ? hit[col] : hit;
          }
          return null;
        },
        async all() {
          const s = this._sql;
          if (s.includes('FROM users')) {
            const rows = getTableRows('users');
            return { success: true, results: [...rows] };
          }
          if (s.includes('FROM system_config')) {
            const rows = getTableRows('system_config');
            return { success: true, results: [...rows] };
          }
          return { success: true, results: [] };
        }
      };
    }
  };
}

async function runTests() {
  console.log('🧪 [miliconfig] شروع تست جامع خودکار باندل مبهم‌شده، ضد بن کلادفلر، امنیت و دور زدن فیلتر Pages...');

  assert.ok(fs.existsSync(bundlePath), 'فایل dist/_worker.js باید وجود داشته باشد');
  const rawBundle = fs.readFileSync(bundlePath, 'utf8');

  // تست ۰-ب: منبع بروزرسانی و مانیفست باید همین مخزن و هم‌نسخه با کد باشند
  const updateManifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'version.json'), 'utf8'));
  assert.strictEqual(
    updateManifest.repo,
    'https://github.com/miladjahani/Milizeroooo',
    'version.json باید به همین مخزن اشاره کند'
  );
  assert.ok(
    String(updateManifest.bundle || '').includes('raw.githubusercontent.com/miladjahani/Milizeroooo/main/_worker.js'),
    'باندل بروزرسانی باید از همین مخزن خوانده شود'
  );
  assert.strictEqual(
    updateManifest.version,
    String(VERSION).replace(/^v/i, ''),
    'نسخهٔ version.json باید با VERSION کد یکی باشد'
  );
  console.log('  ✓ تست ۰-ب (منبع واحد بروزرسانی: مخزن Milizeroooo + هم‌نسخه بودن version.json): موفق');

  // تست ۰: بررسی صفر بودن امضاهای متنی حساس پروکسی در باندل نهایی برای جلوگیری ۱۰۰٪ از بن کلادفلر
  const forbiddenSignatures = ['vless://', 'trojan://', 'wireguard://', 'shadowsocks', 'CMLiussss', 'v2ray-plugin', 'chacha20-ietf-poly1305'];
  for (const sig of forbiddenSignatures) {
    assert.strictEqual(
      rawBundle.toLowerCase().includes(sig.toLowerCase()),
      false,
      `امضای متنی حساس "${sig}" نباید به‌صورت آشکار در باندل _worker.js وجود داشته باشد!`
    );
  }
  console.log('  ✓ تست ۰ (حذف ۱۰۰٪ امضاهای متنی پروکسی از باندل _worker.js برای جلوگیری از بن کلادفلر): موفق');

  const tmpTestFile = path.join(projectRoot, 'dist', '_worker_test_stub.mjs');
  const stubCode = rawBundle.replace(
    /import\s*\{([^}]+)\}\s*from\s*['"]cloudflare:sockets['"]\s*;?/g,
    (_m, imports) => {
      const bindings = imports
        .split(',')
        .map(part => {
          const asMatch = part.trim().match(/^(?:\w+\s+as\s+)?(\w+)$/);
          return asMatch ? `const ${asMatch[1]} = () => ({});` : '';
        })
        .join(' ');
      return bindings || 'const cfConnect = () => ({});';
    }
  );

  fs.writeFileSync(tmpTestFile, stubCode, 'utf8');

  try {
    const mod = await import(tmpTestFile);
    const worker = mod.default;
    assert.ok(worker && typeof worker.fetch === 'function', 'باندل مبهم‌شده باید دارای متد fetch معتبر باشد');
    assert.ok(typeof worker.scheduled === 'function', 'باندل مبهم‌شده باید دارای متد scheduled معتبر باشد');

    const adminUuid = '351c9981-04b6-4103-aa4b-864aa9c91469';

    // تست ۱: استقرار دستی بدون اتصال دیتابیس D1 (نباید هیچ خطایی یا Error 1101 رخ دهد)
    const emptyEnv = { u: adminUuid };
    const rootResp = await worker.fetch(new Request('https://mili.example.com/'), emptyEnv, {});
    assert.strictEqual(rootResp.status, 200, 'صفحه اصلی بدون D1 باید با کد 200 باز شود');
    const rootHtml = await rootResp.text();
    assert.ok(rootHtml.includes('MILICONFIG'), 'برند MILICONFIG باید در صفحه ورود وجود داشته باشد');
    assert.ok(rootHtml.includes('حالت موقت'), 'صفحهٔ ورود بدون D1 باید هشدار حالت موقت را نشان دهد');
    const noD1Create = await worker.fetch(new Request(`https://mili.example.com/${adminUuid}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'no-d1-user', preset: 'iran-fast' })
    }), emptyEnv, {});
    const noD1CreateBody = await noD1Create.json();
    assert.strictEqual(noD1Create.status, 500, 'ساخت کاربر بدون D1 باید رد شود');
    assert.ok(String(noD1CreateBody.message || '').includes('D1'), 'پیام خطای بدون D1 باید به اتصال D1 اشاره کند');
    console.log('  ✓ تست ۱ (استقرار دستی بدون D1، هشدار ذخیره‌سازی و جلوگیری از ساخت کاربر موقت): موفق');

    // تست ۲: اتصال دیتابیس D1 و ساخت خودکار جداول + پنل مدیریت
    const mockD1 = createMockD1Database();
    const d1Env = { u: adminUuid, DB: mockD1 };

    const adminResp = await worker.fetch(new Request(`https://mili.example.com/${adminUuid}`), d1Env, {});
    assert.strictEqual(adminResp.status, 200, 'پنل مدیریت با D1 باید با کد 200 باز شود');
    const adminHtml = await adminResp.text();
    assert.ok(adminHtml.includes('MILICONFIG'), 'پنل مدیریت باید شامل برند باشد');
    console.log('  ✓ تست ۲ (پنل مدیریت OS و ساخت خودکار جداول D1): موفق');

    // تست ۳: سیستم رمز عبور مدیر، محافظت از مسیرهای ادمین و جلوگیری از حملات Brute-Force
    const setupPwdResp = await worker.fetch(
      new Request('https://mili.example.com/api/admin/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'mili-secret-123' })
      }),
      d1Env,
      {}
    );
    assert.strictEqual(setupPwdResp.status, 200, 'تعیین رمز عبور باید 200 برگرداند');

    // بررسی رد شدن دسترسی بدون کوکی/مسیر ادمین به /api/scanner/apply
    const unauthApplyResp = await worker.fetch(
      new Request('https://mili.example.com/api/scanner/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'yx', items: [{ ip: '104.16.0.1', port: 443 }] })
      }),
      d1Env,
      {}
    );
    assert.strictEqual(unauthApplyResp.status, 403, 'درخواست غیرمجاز به /api/scanner/apply باید با کد 403 مسدود شود');

    const loginResp = await worker.fetch(
      new Request('https://mili.example.com/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'mili-secret-123' })
      }),
      d1Env,
      {}
    );
    assert.strictEqual(loginResp.status, 200, 'ورود با رمز عبور باید موفق باشد');
    let sessionCookie = (loginResp.headers.get('Set-Cookie') || '').split(';')[0];
    assert.ok(sessionCookie.startsWith('mili_auth='), 'کوکی نشست امن باید صادر شود');

    // نشست باید در ایزولهٔ تازه (ماژول تازه با همان D1) هم معتبر بماند؛
    // وگرنه بعد از هر رفرش کاربر به صفحهٔ لاگین برمی‌گردد.
    const freshMod = await import(tmpTestFile + '?isolate=2');
    const freshWorker = freshMod.default;
    const freshAdminResp = await freshWorker.fetch(
      new Request(`https://mili.example.com/${adminUuid}`, { headers: { Cookie: sessionCookie } }),
      d1Env,
      {}
    );
    assert.strictEqual(freshAdminResp.status, 200, 'صفحهٔ مدیریت در ایزولهٔ تازه باید باز شود');
    const freshAdminHtml = await freshAdminResp.text();
    assert.ok(freshAdminHtml.includes('data-skin='), 'نشست مدیریتی باید بعد از ایزولهٔ تازه معتبر بماند');
    const rootRedirect = await freshWorker.fetch(
      new Request('https://mili.example.com/', { headers: { Cookie: sessionCookie } }),
      d1Env,
      {}
    );
    assert.strictEqual(rootRedirect.status, 302, 'ریشه با نشست معتبر باید به پنل ریدایرکت شود');
    assert.strictEqual(rootRedirect.headers.get('Location'), '/admin', 'ریدایرکت ریشه باید به مسیر مدیریت باشد');
    console.log('  ✓ تست ۳-ب (ماندگاری نشست در ایزولهٔ تازه + ریدایرکت ریشه به پنل): موفق');

    const chgPwdResp = await worker.fetch(
      new Request('https://mili.example.com/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ oldPassword: 'mili-secret-123', newPassword: 'mili-new-pass-456' })
      }),
      d1Env,
      {}
    );
    assert.strictEqual(chgPwdResp.status, 200, 'تغییر رمز عبور مدیر باید موفق باشد');
    sessionCookie = (chgPwdResp.headers.get('Set-Cookie') || '').split(';')[0];
    console.log('  ✓ تست ۳ (سیستم رمز عبور مدیر، نشست امن و مسدودسازی دسترسی غیرمجاز به APIها): موفق');

    // تست ۴: ایجاد کاربر اول و بررسی ساب‌لینک روی دامنهٔ فیلترشدهٔ *.pages.dev در ایران
    const createResp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          username: 'reza-vip',
          preset: 'pages-iran',
          ev: 'yes',
          es: 'yes',
          et: 'yes'
        })
      }),
      d1Env,
      {}
    );
    assert.strictEqual(createResp.status, 200, 'ایجاد کاربر در D1 باید 200 برگرداند');
    const createdData = await createResp.json();
    assert.strictEqual(createdData.success, true);
    assert.strictEqual(createdData.user.username, 'reza-vip');

    const newUserUuid = createdData.user.uuid;
    const subRawResp = await worker.fetch(
      new Request(`https://mili.pages.dev/sub/${newUserUuid}?target=raw`),
      d1Env,
      {}
    );
    assert.strictEqual(subRawResp.status, 200);
    const rawLinksText = await subRawResp.text();
    const rawLines = rawLinksText.trim().split('\n').filter(Boolean);
    assert.ok(rawLines.length >= 5, `تعداد نودهای تولیدشده باید حداقل ۵ نود باشد ولی ${rawLines.length} بود`);

    // هیچ نودی نباید مستقیماً به آدرس مسدودشدهٔ mili.pages.dev وصل شود؛ همه باید از آی‌پی/دامنه تمیز کلادفلر عبور کنند
    const vlessLines = rawLines.filter(l => l.startsWith('vless://'));
    assert.ok(vlessLines.length > 0, 'نودهای VLESS باید تولید شوند');
    for (const vl of vlessLines) {
      const parsed = new URL(vl);
      assert.notStrictEqual(
        parsed.hostname.toLowerCase(),
        'mili.pages.dev',
        'هاست اتصال نود در دامنهٔ فیلترشدهٔ pages.dev نباید خود pages.dev باشد بلکه باید آی‌پی/دامنه تمیز Anycast باشد'
      );
      if (parsed.searchParams.get('security') === 'tls') {
        const sni = parsed.searchParams.get('sni') || '';
        const frag = parsed.searchParams.get('fragment') || '';
        assert.strictEqual(sni.toLowerCase(), 'mili.pages.dev', 'SNI باید به دامنهٔ ورکر اشاره کند');
        assert.notStrictEqual(sni, 'mili.pages.dev', 'SNI روی دامنهٔ pages.dev باید Mixed-Case ضد فیلترینگ باشد');
        assert.ok(frag.length > 0, 'فرگمنت TLS باید روی دامنهٔ pages.dev فعال باشد');
      }
    }
    console.log('  ✓ تست ۴ (تولید نودهای ضد فیلتر قوی روی دامنهٔ مسدود *.pages.dev با آی‌پی تمیز، Mixed-Case SNI و TLS Fragment): موفق');

    // تست ۵: تست کلاینت‌های Clash و Sing-box همراه با فرگمنت و Early Data
    const clashResp = await worker.fetch(
      new Request(`https://mili.pages.dev/sub/${newUserUuid}?target=clash`),
      d1Env,
      {}
    );
    const clashYaml = await clashResp.text();
    assert.ok(clashYaml.includes('proxies:') && clashYaml.includes('max-early-data: 2048'), 'کانفیگ Clash باید شامل تنظیمات Early Data باشد');

    const sbResp = await worker.fetch(
      new Request(`https://mili.pages.dev/sub/${newUserUuid}?target=singbox`),
      d1Env,
      {}
    );
    const sbJson = JSON.parse(await sbResp.text());
    assert.ok(
      sbJson.outbounds.some(o => o.type === 'vless' && o.tls && o.tls.fragment === true),
      'کانفیگ Sing-box باید شامل نود VLESS با tls.fragment فعال باشد'
    );
    console.log('  ✓ تست ۵ (تبدیل اشتراک Clash و Sing-box با پشتیبانی کامل از TLS Fragment و 0-RTT Early Data): موفق');

    // تست ۶: قفل سخت‌گیرانه سقف ۳ کاربر (Hard Limit of Max 3 Users) و محافظت XSS در صفحه وضعیت
    await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ username: '<script>alert(1)</script>' })
      }),
      d1Env, {}
    );
    const usersListResp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/users`, {
        headers: { Cookie: sessionCookie }
      }),
      d1Env, {}
    );
    const usersListData = await usersListResp.json();
    const xssUser = usersListData.users.find(u => u.username.includes('script'));
    const statusPageResp = await worker.fetch(
      new Request(`https://mili.pages.dev/status/${xssUser.uuid}`),
      d1Env, {}
    );
    const statusHtml = await statusPageResp.text();
    assert.strictEqual(statusHtml.includes('<script>alert(1)</script>'), false, 'تگ اسکریپت در نام کاربری باید Escape شود تا XSS رخ ندهد');

    for (const uname of ['user-4', 'user-5']) {
      const uResp = await worker.fetch(
        new Request(`https://mili.pages.dev/${adminUuid}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
          body: JSON.stringify({ username: uname })
        }),
        d1Env, {}
      );
      assert.strictEqual(uResp.status, 200, `ایجاد ${uname} تا سقف ۵ کاربر باید موفق باشد`);
    }
    const check5Resp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/users`, { headers: { Cookie: sessionCookie } }),
      d1Env, {}
    );
    const check5Data = await check5Resp.json();
    assert.strictEqual(check5Data.users.length, 5, 'تعداد کل کاربران باید دقیقاً ۵ کاربر باشد');
    const rezaUser = check5Data.users.find(u => u.username === 'reza-vip');
    assert.ok(rezaUser && Number(rezaUser.requestCount) >= 3, 'شمارندهٔ ریکوئست ساب‌لینک کاربر اصلی باید دقیق محاسبه و ثبت شود');

    const user6Resp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ username: 'user-6-overflow' })
      }),
      d1Env, {}
    );
    assert.strictEqual(user6Resp.status, 400, 'ایجاد بیش از ۵ کاربر باید با خطای 400 رد شود');
    console.log('  ✓ تست ۶ (قفل سخت‌گیرانه سقف ۵ کاربر و محافظت کامل در برابر تزریق XSS): موفق');

    // تست ۷: مسدودسازی SSRF روی آی‌پی‌های خصوصی و اجرای امن Cron بدون Error 1101
    const ssrfProbeResp = await worker.fetch(
      new Request('https://mili.pages.dev/api/scanner/probe?host=127.0.0.1&port=80'),
      d1Env, {}
    );
    assert.strictEqual(ssrfProbeResp.status, 400, 'پروب آی‌پی لوکال/خصوصی (SSRF) باید با خطای 400 مسدود شود');

    await worker.scheduled({ cron: '*/30 * * * *' }, d1Env, { waitUntil: p => p });
    console.log('  ✓ تست ۷ (مسدودسازی SSRF به شبکه داخلی و اجرای بهینهٔ Cron بدون خطای 1101): موفق');

    // تست ۸: پروکسی تلگرام WEB — مسیرهای قدیمی حذف شده‌اند و API مدیریت روی مسیر ادمین پاسخ می‌دهد
    const legacyTgApiResp = await worker.fetch(
      new Request('https://mili.pages.dev/api/telegram/build?country=DE&sni=www.google.com'),
      d1Env, {}
    );
    assert.notStrictEqual(legacyTgApiResp.status, 200, 'مسیر قدیمی /api/telegram/build باید حذف شده باشد');

    const legacyWebProxyResp = await worker.fetch(
      new Request('https://mili.pages.dev/webproxy'),
      d1Env, {}
    );
    assert.notStrictEqual(legacyWebProxyResp.status, 200, 'مسیر قدیمی /webproxy باید حذف شده باشد');

    const tgStatusResp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/telegram-proxy/status`, { headers: { Cookie: sessionCookie } }),
      d1Env, {}
    );
    assert.strictEqual(tgStatusResp.status, 200, 'API وضعیت پروکسی تلگرام باید کد 200 برگرداند');
    const tgStatus = await tgStatusResp.json();
    assert.strictEqual(tgStatus.success, true);
    assert.strictEqual(tgStatus.configured, false, 'تا زمانی که پروکسی ساخته نشده، configured باید false باشد');
    assert.strictEqual(tgStatus.port, 443, 'پورت پروکسی تلگرام WEB همیشه 443 است');

    const tgSecret = '0123456789abcdef0123456789abcdef';
    const adminApiBase = `https://mili.pages.dev/${adminUuid}/api/telegram-proxy`;
    const tgSaveResp = await worker.fetch(new Request(`${adminApiBase}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ name: 'Telegram-Proxy', secret: tgSecret })
    }), d1Env, {});
    assert.strictEqual(tgSaveResp.status, 200, 'ساخت پروکسی تلگرام باید 200 برگرداند');
    const tgSave = await tgSaveResp.json();
    assert.strictEqual(tgSave.success, true);
    assert.strictEqual(tgSave.secret, tgSecret);
    assert.strictEqual(
      tgSave.telegramUrl,
      `https://t.me/webproxy?server=mili.pages.dev&secret=${tgSecret}`,
      'لینک اتصال باید قالب رسمی t.me/webproxy را داشته باشد'
    );

    const tgEnabled = await (await worker.fetch(
      new Request(`${adminApiBase}/status`, { headers: { Cookie: sessionCookie } }),
      d1Env, {}
    )).json();
    assert.strictEqual(tgEnabled.configured, true);
    assert.strictEqual(tgEnabled.active, true, 'پروکسی پس از ساخت باید فعال باشد');

    // صفحهٔ عمومی پروکسی روی ریشه با همان لینک رسمی تلگرام
    const tgPublicResp = await worker.fetch(
      new Request(`https://mili.pages.dev/?server=mili.pages.dev&secret=${tgSecret}`),
      d1Env, {}
    );
    assert.strictEqual(tgPublicResp.status, 200, 'صفحهٔ عمومی پروکسی تلگرام باید رندر شود');
    const tgPublicHtml = await tgPublicResp.text();
    assert.ok(tgPublicHtml.includes('t.me/webproxy'), 'صفحهٔ عمومی باید لینک وب‌پروکسی تلگرام را نشان دهد');

    // صفحهٔ پل فقط با capability معتبر باز می‌شود؛ در غیر این صورت استتار 404
    const tgBadBridge = await worker.fetch(
      new Request(`https://mili.pages.dev/?bridge=${'b'.repeat(43)}`),
      d1Env, {}
    );
    assert.strictEqual(tgBadBridge.status, 404, 'صفحهٔ پل با capability نامعتبر نباید لو برود');

    // capability معتبر طبق قرارداد ثابت پروتکل تلگرام باید صفحهٔ پل را باز کند
    const tgBridgeToken = nodeCrypto
      .createHmac('sha256', Buffer.from(tgSecret, 'hex'))
      .update('tdesktop-web-proxy-bridge-v1\n' + 'mili.pages.dev')
      .digest('base64url');
    const tgBridgeResp = await worker.fetch(
      new Request(`https://mili.pages.dev/?bridge=${tgBridgeToken}`),
      d1Env, {}
    );
    assert.strictEqual(tgBridgeResp.status, 200, 'صفحهٔ پل با capability معتبر باید رندر شود');
    const tgBridgeHtml = await tgBridgeResp.text();
    assert.ok(tgBridgeHtml.includes('tproxy-android-init'), 'صفحهٔ پل باید اسکریپت پل تلگرام را داشته باشد');

    // نشست بدون توکن یک‌بارمصرف معتبر باید استتار شود
    const tgBadSessionResp = await worker.fetch(new Request('https://mili.pages.dev/api/v1/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', Authorization: 'Bearer invalid.token' },
      body: new Uint8Array([0x10, 0, 0, 0, 0, 0, 0, 1, 1])
    }), d1Env, {});
    assert.strictEqual(tgBadSessionResp.status, 404, 'نشست با توکن نامعتبر باید رد شود');

    const tgHealthResp = await worker.fetch(new Request('https://mili.pages.dev/healthz'), d1Env, {});
    assert.strictEqual(tgHealthResp.status, 200, 'بررسی سلامت پروکسی فعال باید 200 برگرداند');

    const tgStopped = await (await worker.fetch(new Request(`${adminApiBase}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
      body: JSON.stringify({ enabled: false })
    }), d1Env, {})).json();
    assert.strictEqual(tgStopped.success, true);
    assert.strictEqual(tgStopped.enabled, false, 'توقف موقت باید پروکسی را غیرفعال کند');

    const tgDeleted = await (await worker.fetch(new Request(`${adminApiBase}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: sessionCookie }
    }), d1Env, {})).json();
    assert.strictEqual(tgDeleted.success, true);

    const authedAdminResp = await worker.fetch(new Request(`https://mili.pages.dev/${adminUuid}`, { headers: { Cookie: sessionCookie } }), d1Env, {});
    const authedAdminHtml = await authedAdminResp.text();
    assert.ok(
      authedAdminHtml.includes('data-skin="zedsecure"') &&
      authedAdminHtml.includes('data-skin="aurora"') &&
      authedAdminHtml.includes('data-skin="moss"') &&
      authedAdminHtml.includes('fxToggleSwitch') &&
      authedAdminHtml.includes('miliCursorFollower'),
      'پنل مدیریت باید شامل قالب‌های آمادهٔ اندرویدی، سوییچ تک‌حالته افکت پس‌زمینه و نشانگر موس اختصاصی باشد'
    );
    assert.ok(
      authedAdminHtml.includes('id="tgProxyModal"') &&
      authedAdminHtml.includes('data-act="open-tg-proxy"') &&
      authedAdminHtml.includes('data-act="quick-preset-user"') &&
      authedAdminHtml.includes('mili-select-wrap'),
      'تب کاربران باید دکمهٔ پروکسی تلگرام، دکمه‌های گرد نورانی ساخت سریع کاربر و لیست‌های کشویی درون‌برنامه‌ای را داشته باشد'
    );
    assert.ok(
      authedAdminHtml.includes('id="updateAlert"') &&
      authedAdminHtml.includes('data-act="dismiss-update"') &&
      authedAdminHtml.includes('id="updateAlertVersion"'),
      'پنل باید بنر اعلان نسخهٔ جدید و دکمهٔ بستن آن را داشته باشد'
    );
    assert.ok(
      authedAdminHtml.includes('data-port-pick') &&
      authedAdminHtml.includes("type: 'portChips'") &&
      authedAdminHtml.includes('portChoices') &&
      CF_PORT_CHOICES.every(p => authedAdminHtml.includes('"port":' + p.port)),
      'فرم کاربر باید همهٔ پورت‌های کلادفلر را به‌صورت قابل انتخاب (نه ورودی متنی) نشان دهد'
    );
    assert.ok(
      authedAdminHtml.includes('data-backup-tab="download"') &&
      authedAdminHtml.includes('data-backup-tab="restore"') &&
      authedAdminHtml.includes('data-backup-tab="users"') &&
      authedAdminHtml.includes('data-backup-pane="download"') &&
      authedAdminHtml.includes('data-backup-pane="restore"') &&
      authedAdminHtml.includes('data-backup-pane="users"'),
      'پنجرهٔ بکاپ باید سه تب دانلود، بازیابی و بکاپ کاربران داشته باشد'
    );
    assert.ok(
      authedAdminHtml.includes('function downloadFile') &&
      authedAdminHtml.includes('function downloadAdminBackup') &&
      authedAdminHtml.includes('function downloadUserBackup') &&
      authedAdminHtml.includes('a[download][href]'),
      'همهٔ دانلودها باید از مسیر fetch/blob با بررسی خطا و لینک‌های download پشتیبانی کنند'
    );
    const usersPanelStart = authedAdminHtml.indexOf('<section class="panel" data-panel="users">');
    const usersPanelEnd = authedAdminHtml.indexOf('<section class="panel" data-panel="scanner">');
    const usersPanelHtml = usersPanelStart >= 0 && usersPanelEnd > usersPanelStart
      ? authedAdminHtml.slice(usersPanelStart, usersPanelEnd)
      : '';
    assert.ok(
      usersPanelHtml.includes('preset-orb-btn orb-tg-proxy') &&
      usersPanelHtml.includes('data-preset="multi-location"') &&
      !usersPanelHtml.includes('data-act="open-backup"'),
      'تب کاربران باید پروکسی تلگرام را به‌صورت دکمهٔ گرد کنار پریست‌ها داشته باشد و دکمهٔ بکاپ از آن حذف شده باشد'
    );
    assert.ok(
      authedAdminHtml.includes('#backupModal .modal-card') &&
      authedAdminHtml.includes('#helpModal .help-card') &&
      authedAdminHtml.includes('#createModal .form-tabs') &&
      authedAdminHtml.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'),
      'پنجره‌های بکاپ/راهنما باید استایل فشردهٔ موبایل و تب‌های هم‌اندازهٔ فریز داشته باشند'
    );
    console.log('  ✓ تست ۸ (حذف مسیرهای قدیمی پروکسی تلگرام و پاسخ API مدیریت پروکسی WEB): موفق');
    // تست ۹: بررسی دکمه بکاپ در هدرهای پنل ادمین و صفحه وضعیت کاربر + تست Export/Import بکاپ
    assert.ok(
      authedAdminHtml.includes('data-act="open-backup"') && authedAdminHtml.includes('id="backupModal"'),
      'هدر پنل مدیریت باید دارای دکمه بکاپ و پنجره بکاپ/بازیابی باشد'
    );
    assert.ok(
      statusHtml.includes('downloadUserBackup()') && statusHtml.includes('بکاپ اطلاعات من'),
      'هدر صفحه وضعیت کاربر باید دارای دکمه بکاپ اطلاعات من باشد'
    );

    const userBackupResp = await worker.fetch(
      new Request(`https://mili.pages.dev/api/status/${newUserUuid}/backup?backup=1`),
      d1Env, {}
    );
    assert.strictEqual(userBackupResp.status, 200, 'دانلود بکاپ کاربر باید کد 200 برگرداند');
    assert.match(
      userBackupResp.headers.get('content-disposition') || '',
      /attachment;\s*filename=/i,
      'پاسخ بکاپ کاربر باید به‌صورت فایل پیوست دانلود شود'
    );
    const userBackupJson = await userBackupResp.json();
    assert.strictEqual(userBackupJson.app, 'miliconfig-user-backup');
    assert.strictEqual(userBackupJson.user.username, 'reza-vip');
    assert.ok(Array.isArray(userBackupJson.nodes) && userBackupJson.nodes.length >= 5, 'بکاپ کاربر باید شامل لیست نودها باشد');

    const adminBackupResp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/backup`, { headers: { Cookie: sessionCookie } }),
      d1Env, {}
    );
    assert.strictEqual(adminBackupResp.status, 200, 'دانلود بکاپ کامل ادمین باید کد 200 برگرداند');
    assert.match(
      adminBackupResp.headers.get('content-disposition') || '',
      /attachment;\s*filename=/i,
      'پاسخ بکاپ کامل ادمین باید به‌صورت فایل پیوست دانلود شود'
    );
    const adminBackupJson = await adminBackupResp.json();
    assert.strictEqual(adminBackupJson.app, 'miliconfig-os');
    assert.strictEqual(adminBackupJson.users.length, 5, 'بکاپ کامل ادمین باید شامل هر ۵ کاربر باشد');

    const restoreResp = await worker.fetch(
      new Request(`https://mili.pages.dev/${adminUuid}/api/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ ...adminBackupJson, mode: 'merge' })
      }),
      d1Env, {}
    );
    assert.strictEqual(restoreResp.status, 200, 'بازیابی بکاپ ادمین باید کد 200 برگرداند');
    const restoreData = await restoreResp.json();
    assert.strictEqual(restoreData.success, true);
    assert.strictEqual(restoreData.usersRestored, 5, 'بازیابی بکاپ ادمین باید هر ۵ کاربر را بازیابی کند');
    console.log('  ✓ تست ۹ (سیستم جامع بکاپ و بازیابی ادمین و کاربر با دکمه در هدرها): موفق');


    console.log('\n🎉 تمام تست‌های عملکردی، ضد بن کلادفلر، ضد فیلتر Pages.dev، امنیت، دیتابیس D1 و رابط کاربری ۱۰۰٪ پاس شدند!');
  } finally {
    if (fs.existsSync(tmpTestFile)) fs.unlinkSync(tmpTestFile);
  }
}

runTests().catch(err => {
  console.error('❌ تست ناموفق بود:', err);
  process.exit(1);
});
