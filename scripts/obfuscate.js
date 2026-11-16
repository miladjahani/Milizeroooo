// ============================================================================
// StudioDocs - موتور مبهم‌سازی چندریختی با دیکودر داخلی و کش O(1)
// طراحی‌شده اختصاصی برای Cloudflare Workers & Pages:
//   ۱) تمام رشته‌ها، الگوها و کلیدواژه‌های حساس پروکسی با دیکودر داخلی کدگذاری
//      می‌شوند تا در زمان راه‌اندازی ایزوله (Global Startup) هیچ بار اضافی روی
//      سقف 10ms CPU کلادفلر نیفتد و خطای Error 1101 هرگز رخ ندهد.
//   ۲) تابع رمزگشا دارای جدول کش O(1) (Object.create(null)) و یک نمونهٔ واحد از
//      TextDecoder است تا هر رشته حداکثر یک‌بار در طول عمر ایزوله رمزگشایی شود.
//   ۳) در هر بیلد و هر استقرار، یک کلید چندریختی یکتا (k1, k2) و پسوند منحصربه‌فرد
//      تولید می‌شود تا امضای بایت‌ها، جدول رشته‌ها و هش SHA-256 کاملاً یکتا باشد.
// ============================================================================

import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadTerser() {
  const candidates = [
    'terser',
    '/usr/share/nodejs/terser/dist/bundle.min.cjs',
    '/usr/share/nodejs/terser'
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (_e) {}
  }
  return null;
}

function loadAcorn() {
  const candidates = ['acorn', '/usr/share/nodejs/acorn'];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (_e) {}
  }
  return null;
}

function encodeBase64Utf8(str) {
  return Buffer.from(String(str), 'utf8').toString('base64');
}

function xorReencodeBase64(origB64, k1, k2) {
  const utf8Bytes = Buffer.from(origB64, 'base64');
  const out = Buffer.allocUnsafe(utf8Bytes.length);
  for (let i = 0; i < utf8Bytes.length; i++) {
    out[i] = utf8Bytes[i] ^ ((k1 + i * k2) & 0xff);
  }
  return out.toString('base64');
}

// الگوی کلیدواژه‌های حساس که اسکنرهای کلادفلر برای شناسایی اسکریپت‌های پروکسی بررسی می‌کنند.
// هر کاراکتر چینی هم پوشش داده می‌شود تا هیچ امضای چینی در باندل نهایی باقی نماند.
const SENSITIVE_KEYWORDS_RE =
  /vless|vmess|trojan|shadowsocks|wireguard|hysteria|tuic|socks5|proxyip|cmliu|edgetunnel|cfnew|byjoey|090227|clash|sing-?box|v2ray|xray|nekobox|shadowrocket|quantumult|hiddify|mihomo|amnezia|masque|epeius|miliconfig|nginx|cloudflareclient|xhttp|chacha20|aes-128-gcm|aes-256-gcm|ss:\/\/|[\u4e00-\u9fff]+/gi;

const DECODE_MARKER = '__MILI_DECODE_STR__';

function hasSensitiveKeyword(text = '') {
  SENSITIVE_KEYWORDS_RE.lastIndex = 0;
  return SENSITIVE_KEYWORDS_RE.test(String(text || ''));
}

// پیمایش AST برای تبدیل هدفمند رشته‌ها، کلیدها و TemplateLiteralهای حاوی کلیدواژه‌های حساس
function astEncryptStringsEdgetunnel(code) {
  const acorn = loadAcorn();
  if (!acorn) return { code, count: 0 };

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (_e) {
    return { code, count: 0 };
  }

  let count = 0;
  const replacements = [];

  function makeDecodeCall(str) {
    count++;
    return `${DECODE_MARKER}('${encodeBase64Utf8(str)}')`;
  }

  function walk(node, parent) {
    if (!node || typeof node !== 'object') return;

    // پراپرتی‌های shorthand مثل { proxyIps } کلید حساس را بدون والدِ Literal
    // نگه می‌دارند؛ باید به { [_d_tag('...')]: proxyIps } تبدیل شوند. این کار
    // فقط روی ObjectExpression انجام می‌شود، نه ObjectPattern مربوط به destructuring.
    if (
      node.type === 'Property' &&
      parent &&
      parent.type === 'ObjectExpression' &&
      !node.computed &&
      node.key &&
      node.key.type === 'Identifier' &&
      hasSensitiveKeyword(node.key.name)
    ) {
      if (node.shorthand === true) {
        replacements.push({
          start: node.start,
          end: node.end,
          replacement: `[${makeDecodeCall(node.key.name)}]: ${node.key.name}`
        });
      } else {
        // کلیدهای غیر-shorthand مثل { socks5: value } هم باید به کلید محاسبه‌شده
        // تبدیل شوند تا نام آن در خروجی نهایی دیده نشود.
        replacements.push({
          start: node.key.start,
          end: node.key.end,
          replacement: `[${makeDecodeCall(node.key.name)}]`
        });
      }
    }

    // دسترسی‌های نقطه‌ای مثل env.MILICONFIG_DB یا cfg.warpMasque هم به
    // دسترسی محاسبه‌شده تبدیل می‌شوند؛ معنای runtime کاملاً حفظ می‌شود.
    if (
      node.type === 'MemberExpression' &&
      !node.computed &&
      node.property &&
      node.property.type === 'Identifier' &&
      hasSensitiveKeyword(node.property.name)
    ) {
      replacements.push({
        start: node.object.end,
        end: node.end,
        replacement: `${node.optional ? '?.' : ''}[${makeDecodeCall(node.property.name)}]`
      });
    }

    if (
      node.type === 'Literal' &&
      typeof node.value === 'string' &&
      node.value.length >= 2 &&
      node.value.length <= 25000
    ) {
      const isPropKey =
        parent &&
        (parent.type === 'Property' || parent.type === 'MethodDefinition') &&
        parent.key === node &&
        !parent.computed;
      const isImportOrExport =
        parent &&
        (parent.type === 'ImportDeclaration' ||
          parent.type === 'ExportNamedDeclaration' ||
          parent.type === 'ExportAllDeclaration');

      if (!isImportOrExport) {
        const hasSensitive = hasSensitiveKeyword(node.value);
        if (hasSensitive) {
          if (!isPropKey) {
            replacements.push({
              start: node.start,
              end: node.end,
              replacement: makeDecodeCall(node.value)
            });
          } else if (parent.type === 'Property' && parent.kind === 'init') {
            replacements.push({
              start: node.start,
              end: node.end,
              replacement: `[${makeDecodeCall(node.value)}]`
            });
          }
        }
      }
    } else if (
      node.type === 'Literal' &&
      node.regex &&
      typeof node.regex.pattern === 'string'
    ) {
      if (hasSensitiveKeyword(node.regex.pattern)) {
        const pCall = makeDecodeCall(node.regex.pattern);
        const fCall = makeDecodeCall(node.regex.flags || '');
        replacements.push({
          start: node.start,
          end: node.end,
          replacement: `new RegExp(${pCall}, ${fCall})`
        });
      }
    } else if (
      node.type === 'TemplateElement' &&
      parent &&
      parent.type === 'TemplateLiteral' &&
      typeof node.value?.raw === 'string'
    ) {
      const rawText = node.value.raw;
      if (hasSensitiveKeyword(rawText)) {
        SENSITIVE_KEYWORDS_RE.lastIndex = 0;
        const replacedRaw = rawText.replace(SENSITIVE_KEYWORDS_RE, match => {
          return `\${${makeDecodeCall(match)}}`;
        });
        if (replacedRaw !== rawText) {
          replacements.push({
            start: node.start,
            end: node.end,
            replacement: replacedRaw
          });
        }
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === 'string') walk(item, node);
        }
      } else if (child && typeof child.type === 'string') {
        walk(child, node);
      }
    }
  }

  walk(ast, null);

  if (replacements.length === 0) {
    return { code, count: 0 };
  }

  replacements.sort((a, b) => b.start - a.start);
  let outCode = code;
  for (const r of replacements) {
    outCode = outCode.slice(0, r.start) + r.replacement + outCode.slice(r.end);
  }

  return { code: outCode, count };
}

export async function obfuscateWorkerBundle(rawEsmCode) {
  const lines = rawEsmCode.split('\n');
  const bodyLines = [];

  for (const line of lines) {
    if (/^\s*import\s+.*from\s+['"]cloudflare:sockets['"]\s*;?\s*$/.test(line)) {
      continue;
    }
    bodyLines.push(line);
  }

  // کلید چندریختی منحصربه‌فرد برای هر بار بیلد/استقرار
  const rand = crypto.randomBytes(8);
  const tag = rand.subarray(2, 5).toString('hex');
  const buildSig = rand.toString('hex');

  const headerImport = `// Edge runtime bootstrap\nimport { connect as cfConnect } from 'cloudflare:sockets';\nconst connect = cfConnect;`;

  let bodyCode = bodyLines.join('\n');
  bodyCode = bodyCode.replace(/export\s+default\s+\{/, 'const __MILI_WORKER_EXPORT__ = {');

  // بازنویسی نام پراپرتی‌های حساس روی آبجکت‌های داخلی تا پس از Minify هیچ کلید حساسی باقی نماند
  const SENSITIVE_PROP_RENAMES = [
    [/\bshadowsocks\b/g, '_mili_ss_p'],
    [/\bwireguard\b/g, '_mili_wg_p'],
    [/\bvless\b/g, '_mili_vl_p'],
    [/\btrojan\b/g, '_mili_tr_p']
  ];

  const { code: astEncryptedCode, count } = astEncryptStringsEdgetunnel(bodyCode);

  let postAstCode = astEncryptedCode;
  for (const [re, rep] of SENSITIVE_PROP_RENAMES) {
    postAstCode = postAstCode.replace(re, rep);
  }

  const fnName = `_d_${tag}`;
  const tdName = `_t_${tag}`;
  const cacheName = `_c_${tag}`;

  const decodeCallRe = new RegExp(`${DECODE_MARKER}\\('([A-Za-z0-9+/=]*)'\\)`, 'g');
  const decodePayloads = [];
  let decodeCallMatch;
  while ((decodeCallMatch = decodeCallRe.exec(postAstCode))) {
    decodePayloads.push(decodeCallMatch[1]);
  }

  function pairIsSafe(a, b) {
    return decodePayloads.every(origB64 => !hasSensitiveKeyword(xorReencodeBase64(origB64, a, b)));
  }

  function randomKeyPair() {
    const pairRand = crypto.randomBytes(2);
    let nextK1 = 17 + (pairRand[0] % 233);
    if (nextK1 === 90) nextK1 = 91;
    let nextK2 = (5 + (pairRand[1] % 243)) | 1;
    if (nextK2 === 31) nextK2 = 33;
    return [nextK1, nextK2];
  }

  let k1, k2;
  for (let attempt = 0; attempt < 2048; attempt++) {
    [k1, k2] = randomKeyPair();
    if (pairIsSafe(k1, k2)) break;
  }
  if (!pairIsSafe(k1, k2)) {
    // اگر شانس تصادفی کافی نبود، فضای کلید را قطعی جستجو می‌کنیم تا هیچ
    // Base64 خروجی‌ای (نه فقط رشتهٔ اصلی) کلیدواژهٔ حساس نداشته باشد.
    outer: for (let nextK1 = 17; nextK1 < 250; nextK1++) {
      if (nextK1 === 90) continue;
      for (let nextK2 = 5; nextK2 < 250; nextK2 += 2) {
        if (nextK2 === 31) continue;
        if (pairIsSafe(nextK1, nextK2)) {
          k1 = nextK1;
          k2 = nextK2;
          break outer;
        }
      }
    }
  }
  if (!Number.isFinite(k1) || !Number.isFinite(k2) || !pairIsSafe(k1, k2)) {
    throw new Error('No safe polymorphic key pair found for sensitive Base64 payloads');
  }

  postAstCode = postAstCode.replace(decodeCallRe, (_m, origB64) => {
    return `${fnName}('${xorReencodeBase64(origB64, k1, k2)}')`;
  });

  const edgetunnelDecoderRuntime =
    count > 0
      ? `const ${tdName} = new TextDecoder(), ${cacheName} = Object.create(null);
function ${fnName}(_raw) {
  const _hit = ${cacheName}[_raw];
  if (_hit !== undefined) return _hit;
  const _bin = atob(_raw), _len = _bin.length, _bytes = new Uint8Array(_len);
  for (let _i = 0; _i < _len; _i++) _bytes[_i] = _bin.charCodeAt(_i) ^ ((${k1} + _i * ${k2}) & 255);
  return (${cacheName}[_raw] = ${tdName}.decode(_bytes));
}\n`
      : '';

  const combined = `${edgetunnelDecoderRuntime}${postAstCode}\nconst _edge_rev_${tag} = "${buildSig}";\nexport default __MILI_WORKER_EXPORT__;\n`;
  const terser = loadTerser();

  if (terser && typeof terser.minify === 'function') {
    const minified = await terser.minify(combined, {
      ecma: 2022,
      module: true,
      compress: {
        passes: 2,
        dead_code: true,
        drop_debugger: true,
        conditionals: true,
        evaluate: false,
        booleans: true,
        loops: true,
        unused: true
      },
      mangle: {
        toplevel: true,
        reserved: ['__MILI_WORKER_EXPORT__', fnName, tdName, cacheName, `_edge_rev_${tag}`, 'cfConnect', 'connect', 'fetch', 'scheduled', 'WebSocketPair']
      },
      format: {
        comments: false,
        ascii_only: false
      }
    });
    if (minified && minified.code) {
      return `${headerImport}\n${minified.code}\n`;
    }
  }

  return `${headerImport}\n${combined}`;
}
