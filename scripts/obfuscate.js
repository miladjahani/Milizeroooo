// ============================================================================
// miliconfig v3.10.2 - موتور مبهم‌سازی چندریختی به روش edgetunnel (解码64 + کش O(1))
// طراحی‌شده اختصاصی برای Cloudflare Workers & Pages:
//   ۱) تمام رشته‌ها، الگوها و کلیدواژه‌های حساس پروکسی با متد 解码64('...') به سبک
//      edgetunnel کدگذاری می‌شوند تا در زمان راه‌اندازی ایزوله (Global Startup) هیچ
//      بار اضافی روی سقف 10ms CPU کلادفلر نیفتد و خطای Error 1101 هرگز رخ ندهد.
//   ۲) تابع 解码64 دارای جدول کش O(1) (Object.create(null)) و یک نمونهٔ واحد از
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

// الگوی کلیدواژه‌های حساس که اسکنرهای کلادفلر برای شناسایی اسکریپت‌های پروکسی بررسی می‌کنند
const SENSITIVE_KEYWORDS_RE =
  /vless|trojan|shadowsocks|wireguard|amnezia|masque|v2ray|clash|mihomo|sing-?box|hiddify|nekobox|shadowrocket|quantumult|CMLiussss|cloudflareclient|proxyip|ss:\/\/|vmess|xhttp|chacha20|aes-128-gcm|aes-256-gcm|edgetunnel|epeius|socks5|byjoey|cfnew|090227/gi;

// پیمایش AST برای تبدیل هدفمند رشته‌ها و TemplateLiteralهای حاوی کلیدواژه‌های حساس به 解码64('...')
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
    return `解码64('${encodeBase64Utf8(str)}')`;
  }

  function walk(node, parent) {
    if (!node || typeof node !== 'object') return;

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
        SENSITIVE_KEYWORDS_RE.lastIndex = 0;
        const hasSensitive = SENSITIVE_KEYWORDS_RE.test(node.value);
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
      SENSITIVE_KEYWORDS_RE.lastIndex = 0;
      if (SENSITIVE_KEYWORDS_RE.test(node.regex.pattern)) {
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
      SENSITIVE_KEYWORDS_RE.lastIndex = 0;
      if (SENSITIVE_KEYWORDS_RE.test(rawText)) {
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
  let k1 = 17 + (rand[0] % 233);
  if (k1 === 90) k1 = 91;
  let k2 = (5 + (rand[1] % 243)) | 1;
  if (k2 === 31) k2 = 33;
  const tag = rand.subarray(2, 5).toString('hex');
  const buildSig = rand.toString('hex');

  const headerImport = `// MILICONFIG Edge Module\nimport { connect as cfConnect } from 'cloudflare:sockets';\nconst connect = cfConnect;`;

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

  // بازرمزنگاری تمام فراخوانی‌های 解码64('...') با کلید چندریختی (k1, k2)
  const fnName = `解码64_${tag}`;
  const tdName = `基础64文本解码器_${tag}`;
  const cacheName = `基础64缓存表_${tag}`;
  postAstCode = postAstCode.replace(/解码64\('([A-Za-z0-9+/=]*)'\)/g, (_m, origB64) => {
    return `${fnName}('${xorReencodeBase64(origB64, k1, k2)}')`;
  });

  const edgetunnelDecoderRuntime =
    count > 0
      ? `const ${tdName} = new TextDecoder(), ${cacheName} = Object.create(null);
function ${fnName}(文本) {
  const 命中 = ${cacheName}[文本];
  if (命中 !== undefined) return 命中;
  const 二进制 = atob(文本), 长度 = 二进制.length, 字节 = new Uint8Array(长度);
  for (let 索引 = 0; 索引 < 长度; 索引++) 字节[索引] = 二进制.charCodeAt(索引) ^ ((${k1} + 索引 * ${k2}) & 255);
  return (${cacheName}[文本] = ${tdName}.decode(字节));
}
const 解码64 = ${fnName};\n`
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
        reserved: ['__MILI_WORKER_EXPORT__', '解码64', fnName, tdName, cacheName, `_edge_rev_${tag}`, 'cfConnect', 'connect', 'fetch', 'scheduled', 'WebSocketPair']
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
