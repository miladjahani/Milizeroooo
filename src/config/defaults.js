// ============================================================================
// miliconfig v3.2 - تنظیمات پیش‌فرض پایه
// مجهز به شادوساکس، فرگمنت، ECH، لیست‌های کشوری، قفل ۳ کاربر و چرخش خودکار آی‌پی
// ============================================================================

import { CF_EDGE_DOMAINS } from './edgeDomains.js';
import {
  CFNEW_API_KEY_SALT,
  CFNEW_API_SECRET,
  CFNEW_API_URL,
  CFNEW_DOMAIN_SOURCES,
  CFNEW_IPV4_SOURCES,
  CFNEW_IPV6_SOURCES,
  CFNEW_ISP_GROUPS,
  CFNEW_PROXYIP_SOURCES,
  COUNTRY_EXTRA_PROXY_SOURCES,
  COUNTRY_META,
  GLOBAL_HTTP_SOURCES,
  GLOBAL_MIXED_SOURCES,
  GLOBAL_SOCKS5_SOURCES,
  HIGH_YIELD_PROXY_SOURCES,
  PROXY_FEED_REGISTRY,
  getFeedKind,
  IP_CANDIDATE_SOURCES,
  IPV6_CANDIDATE_SOURCES,
  PROXY_IP_SOURCES,
  IP_RANGE_SOURCES,
  OPENVPN_CSV_SOURCES,
  OPENVPN_PROFILE_SOURCES,
  OPENVPN_PUBLIC_PASS,
  OPENVPN_PUBLIC_USER,
  OPENVPN_RAW_PROFILE_SOURCES,
  RESIDENTIAL_SOURCES,
  WARP_CLIENT_VERSION,
  WARP_DEFAULT_ADDRESS,
  WARP_DEFAULT_HOST,
  WARP_DEFAULT_PORT,
  WARP_ENDPOINT_IPS,
  WARP_ENDPOINT_PORTS,
  WARP_PEER_PUBLIC_KEY,
  WARP_REGISTRATION_URL
} from './sources.js';

export const BRAND_NAME = 'miliconfig';
export const BRAND_UPPER = 'MILICONFIG';
export const VERSION = 'v3.14.2';
export const DEFAULT_ADMIN_UUID = '351c9981-04b6-4103-aa4b-864aa9c91469';

// سقف سخت تعداد نودهای هر ساب‌لینک؛ حالت خودکار هم بیشتر از این نود نمی‌سازد.
export const MAX_SUB_NODE_COUNT = 350;
// ساب‌لینک اصلی مدیر هم از همان سقف پیروی می‌کند؛ ساب‌های کاربران از تنظیم خودشان.
export const ADMIN_SUB_NODE_COUNT = MAX_SUB_NODE_COUNT;
export const MAX_USERS_LIMIT = 5;
export const TELEGRAM_SUPPORT = '@miliconfig';

// مقادیر پیش‌فرض دقیقاً مطابق cfnew (byJoey): vless روشن، بقیهٔ پروتکل‌ها و
// امکانات اضافه خاموش تا کاربر خودش از فرم ساخت/ویرایش کاربر روشن کند.
export const CONFIG_DEFAULTS = {
  wk: '',
  ev: 'yes',
  et: 'no',
  ex: 'no',
  es: 'no', // شادوساکس (Shadowsocks) — امکانات اضافه پیش‌فرض خاموش
  sspass: '',
  // هسته این ورکر هدر Shadowsocks را به‌صورت متنی (بدون AEAD) می‌خواند، بنابراین تنها متد سازگار «none» است
  ssmethod: 'aes-128-gcm',
  ech: 'no',
  // — تحریم‌شکن: خروجی همهٔ نودها از «آدرس واسط» بیرون از ایران عبور می‌کند
  // تا سرویس‌هایی که آی‌پی ایران را مسدود می‌کنند باز شوند.
  sb: 'yes',
  sbRegion: 'DE', // منطقهٔ آدرس واسط پیشنهادی (DE/NL/US/…)
  // — Placement کلودفلر: auto | multi_placement | manual_placement:<COLO>
  // مقدار ترکیبی برای یک دراپ‌داون نگه داشته می‌شود تا هر سه حالت در یک انتخاب باشد.
  placement: 'auto',
  placementMode: 'auto',
  placementColo: '',
  placementTargets: '',
  // — مسیر تحریم‌شکن: sync_placement | multi_cmliu | manual_proxyip
  proxyMode: 'sync_placement',
  proxyRegion: 'DE',
  proxyMultiRegions: 'DE,NL,UK,FR,FI,PL,TR,IAD,LAX,CA,AE,SG,JP,KR,HK,Oracle,DigitalOcean,Vultr,BPB',
  // — گزینه‌های کلاینت که در کانفیگ‌های تولیدشده اعمال می‌شوند
  doh: 'yes', // DNS over HTTPS در کانفیگ کلاینت
  tcp: 'yes', // TCP fast-open / tcp-concurrent در کانفیگ کلاینت
  udp: 'yes', // عبور UDP از نودها
  awgv: '3', // نسخهٔ AmneziaWG برای نودهای WARP: 1 | 2 | 3
  tp: '',
  customDNS: 'https://223.5.5.5/dns-query',
  customECHDomain: 'cloudflare-ech.com',
  alpn: '',
  d: 'admin', // آدرس ثابت پنل: /admin (قابل تغییر از تنظیمات)
  p: '',
  yx: '',
  yxURL: '',
  s: '',
  homepage: '',
  scu: 'https://url.v1.mk/sub',
  ena: 'yes',
  epd: 'yes',
  epi: 'yes',
  egi: 'yes',
  ae: '',
  rm: '',
  qj: '',
  dkby: 'no',
  yxby: '',
  ipv4: 'yes',
  ipv6: 'yes',
  ispMobile: 'yes',
  ispUnicom: 'yes',
  ispTelecom: 'yes',
  jk: 'no',
  // صفر = خودکار؛ تعداد کانفیگ را کاربر/پنل انتخاب نمی‌کند و موتور خودش
  // همهٔ آدرس‌های منابع را مثل cfnew به نود تبدیل می‌کند (حداکثر ۳۵۰ نود).
  subNodeCount: 0,
  region: 'auto', // منطقهٔ لوکیشن نودها: auto | CF | کد کشور (مثل DE/NL/US)
  brand: BRAND_NAME,
  // تنظیمات ترنسپورت و رفتار کلاینت:
  fp: 'chrome', // فینگرپرینت: chrome, firefox, safari, edge, ios, randomized
  patt: '/?ed=2048', // الگوهای مسیر
  fragmentPreset: 'mci', // پریست‌های فرگمنت
  fragmentLength: '100-200',
  fragmentInterval: '10-20',
  fragmentPackets: 'tlshello',
  ipRotation: 'off', // چرخش آی‌پی: پیش‌فرض خاموش تا آی‌پی نود در کلاینت ثابت بماند
  // — حالت آی‌پی نود در کلاینت: «country» یعنی فقط کشور/منطقه ثابت است و
  // آدرس‌ها بین رفرش‌ها عوض می‌شوند؛ «fixed» یعنی همهٔ نودها یک آی‌پی ثابت
  // دارند و با پینگ/بروزرسانی ساب هم عوض نمی‌شود.
  ipMode: 'country',
  ipPinned: '', // آدرس دلخواه برای حالت ثابت: host یا host:port (خالی = انتخاب خودکار پایدار)
  locationNodeCount: 8, // تعداد نود چندلوکیشن که در ساب‌لینک کشوری ساخته می‌شود
  frag: 'yes', // کلید روشن/خاموش فرگمنت (شادوساکس فرگمنت ندارد)
  ports: '443,2053,2083', // پورت‌های TLS نودهای ساب‌لینک (حداقل ۳ پورت)
  // پورت‌های بدون TLS که به‌عنوان «حالت دوم» هر نود ساخته می‌شوند (حداقل ۳ پورت)
  httpPorts: '80,8080,8880',
  adminPasswordHash: '', // هش رمز عبور مدیر
  supportChannel: TELEGRAM_SUPPORT,
  // — نود دامنهٔ پنل: آدرس و SNI دقیقاً دامنهٔ همین ورکر/پیجز (بدون https://)
  pd: 'no',
  pdCount: 2,
  // دامنه‌های اضافی SNI/Host (کاما) — هر دامنه باید به همین ورکر وصل باشد
  sniHosts: '',
  // — WARP / WARP PRO / WARP چندلوکیشن
  warp: 'no',
  warpPro: 'no',
  warpMl: 'no',
  warpCount: 8,
  // — WARP MASQUE (HTTP/3): فقط Mihomo/Clash.Meta و Hiddify آن را می‌خوانند
  warpMasque: 'no',
  warpMasqueCount: 3,
  warpLicense: '', // لایسنس WARP+ برای نود WARP PRO
  warpEndpoint: '', // لیست سفارشی نقاط پایانی: ip:port#برچسب,ip2:port2#برچسب (خالی = نقاط پایانی رسمی کلادفلر)
  // — پروفایل پیش‌فرض نودهای WARP (قابل انتخاب برای هر کاربر)
  warpMtu: 'auto', // auto | 1240 | 1280 | 1320 | 1380
  warpDns: 'auto', // auto | cloudflare | cloudflare-alt | both | google
  warpObf: 'all', // all | off | lite | balanced | aggressive | stealth
  warpFamily: 'auto', // auto | v4 | v6 | domain — خانوادهٔ اندپوینت چندلوکیشن
  // — OpenVPN (پروفایل‌های عمومی زنده از VPNGate)
  ovpn: 'no',
  ovpnCount: 8,
  ovpnCountries: '',
  ovpnSource: '', // آدرس‌های سفارشی ‎.ovpn‎ (کاما) — خالی = منابع پیش‌فرض
  ovpnProto: 'auto', // auto | udp | tcp — فیلتر پروتکل پروفایل‌های OpenVPN
  ovpnTuning: 'all', // all | balanced | mtu-safe | mobile — پروفایل تنظیم MTU/DNS در خروجی .ovpn
  // — بروزرسانی نسخه: امکان استقرار نسخهٔ تازه از داخل پنل
  autoUpdate: 'no', // yes = کرون در صورت وجود توکن، نسخهٔ گیت‌هاب را خودکار مستقر می‌کند
  cfAccountId: '', // Account ID کلادفلر (غیرمحرمانه)
  cfScriptName: '' // نام اسکریپت Workers که باید به‌روز شود (غیرمحرمانه)
};

export const BOOLEAN_CONFIG_KEYS = [
  'ev', 'et', 'ex', 'es', 'ech', 'ena', 'epd', 'epi', 'egi',
  'ipv4', 'ipv6', 'ispMobile', 'ispUnicom', 'ispTelecom', 'jk', 'frag',
  'pd', 'warp', 'warpPro', 'warpMl', 'warpMasque', 'ovpn', 'autoUpdate',
  'sb', 'doh', 'tcp', 'udp'
];

export const ENV_KEY_MAPPING = {
  wk: ['wk', 'WK'],
  ev: ['ev', 'EV'],
  et: ['et', 'ET'],
  ex: ['ex', 'EX'],
  es: ['es', 'ES', 'SS', 'ss'],
  sspass: ['sspass', 'SSPASS', 'SS_PASSWORD'],
  ssmethod: ['ssmethod', 'SSMETHOD', 'SS_METHOD'],
  ech: ['ech', 'ECH'],
  sb: ['sb', 'SB', 'SANCTIONS_BYPASS'],
  sbRegion: ['sbRegion', 'SBREGION', 'SB_REGION'],
  doh: ['doh', 'DOH'],
  tcp: ['tcp', 'TCP'],
  udp: ['udp', 'UDP'],
  awgv: ['awgv', 'AWGV', 'AMNEZIA_VERSION'],
  tp: ['tp', 'TP'],
  customDNS: ['customDNS', 'CUSTOMDNS', 'CUSTOM_DNS'],
  customECHDomain: ['customECHDomain', 'CUSTOMECHDOMAIN', 'CUSTOM_ECH_DOMAIN'],
  alpn: ['alpn', 'ALPN'],
  d: ['d', 'D'],
  p: ['p', 'P'],
  yx: ['yx', 'YX'],
  yxURL: ['yxURL', 'YXURL', 'YX_URL'],
  s: ['s', 'S'],
  homepage: ['homepage', 'HOMEPAGE'],
  scu: ['scu', 'SCU'],
  ena: ['ena', 'ENA'],
  epd: ['epd', 'EPD'],
  epi: ['epi', 'EPI'],
  egi: ['egi', 'EGI'],
  ae: ['ae', 'AE'],
  rm: ['rm', 'RM'],
  qj: ['qj', 'QJ'],
  dkby: ['dkby', 'DKBY'],
  yxby: ['yxby', 'YXBY'],
  ipv4: ['ipv4', 'IPV4'],
  ipv6: ['ipv6', 'IPV6'],
  ispMobile: ['ispMobile', 'ISPMOBILE', 'ISP_MOBILE'],
  ispUnicom: ['ispUnicom', 'ISPUNICOM', 'ISP_UNICOM'],
  ispTelecom: ['ispTelecom', 'ISPTELECOM', 'ISP_TELECOM'],
  jk: ['jk', 'JK'],
  subNodeCount: ['subNodeCount', 'SUB_NODE_COUNT', 'nodeCount', 'NODE_COUNT'],
  region: ['region', 'REGION', 'LOCATION_REGION'],
  fp: ['fp', 'FP', 'FINGERPRINT'],
  patt: ['patt', 'PATT', 'PATH_PATTERN'],
  fragmentPreset: ['fragmentPreset', 'FRAGMENT_PRESET'],
  frag: ['frag', 'FRAG', 'FRAGMENT_ENABLED'],
  ports: ['ports', 'PORTS', 'NODE_PORTS'],
  httpPorts: ['httpPorts', 'HTTPPORTS', 'HTTP_PORTS', 'NODE_HTTP_PORTS'],
  ipRotation: ['ipRotation', 'IP_ROTATION', 'ROTATION_MINUTES'],
  locationNodeCount: ['locationNodeCount', 'LOCATION_NODE_COUNT'],
  pd: ['pd', 'PD', 'PANEL_DOMAIN_NODES'],
  pdCount: ['pdCount', 'PDCOUNT', 'PANEL_DOMAIN_NODE_COUNT'],
  sniHosts: ['sniHosts', 'SNIHOSTS', 'SNI_HOSTS', 'CUSTOM_DOMAINS', 'FRONT_DOMAINS'],
  warp: ['warp', 'WARP'],
  warpPro: ['warpPro', 'WARPPRO', 'WARP_PRO'],
  warpMl: ['warpMl', 'WARPML', 'WARP_MULTI_LOCATION'],
  warpCount: ['warpCount', 'WARPCOUNT', 'WARP_NODE_COUNT'],
  warpMasque: ['warpMasque', 'WARPMASQUE', 'WARP_MASQUE'],
  warpMasqueCount: ['warpMasqueCount', 'WARPMASQUECOUNT', 'WARP_MASQUE_COUNT'],
  warpLicense: ['warpLicense', 'WARPLICENSE', 'WARP_LICENSE'],
  warpEndpoint: ['warpEndpoint', 'WARPENDPOINT', 'WARP_ENDPOINT'],
  ovpn: ['ovpn', 'OVPN', 'OPENVPN'],
  ovpnCount: ['ovpnCount', 'OVPNCOUNT', 'OPENVPN_NODE_COUNT'],
  ovpnCountries: ['ovpnCountries', 'OVPNCOUNTRIES', 'OPENVPN_COUNTRIES'],
  ovpnSource: ['ovpnSource', 'OVPNSOURCE', 'OPENVPN_SOURCE'],
  ipMode: ['ipMode', 'IPMODE', 'IP_MODE'],
  ipPinned: ['ipPinned', 'IPPINNED', 'IP_PINNED', 'FIXED_IP'],
  warpMtu: ['warpMtu', 'WARPMTU', 'WARP_MTU'],
  warpDns: ['warpDns', 'WARPDNS', 'WARP_DNS'],
  warpObf: ['warpObf', 'WARPOBF', 'WARP_OBF'],
  warpFamily: ['warpFamily', 'WARPFAMILY', 'WARP_FAMILY'],
  ovpnProto: ['ovpnProto', 'OVPNPROTO', 'OPENVPN_PROTO'],
  ovpnTuning: ['ovpnTuning', 'OVPNTUNING', 'OPENVPN_TUNING'],
  autoUpdate: ['autoUpdate', 'AUTOUPDATE', 'AUTO_UPDATE'],
  cfAccountId: ['cfAccountId', 'CFACCOUNTID', 'CF_ACCOUNT_ID'],
  cfScriptName: ['cfScriptName', 'CFSCRIPTNAME', 'CF_SCRIPT_NAME']
};

export const FRAGMENT_PRESETS = {
  'off': { name: 'غیرفعال', length: '', interval: '', packets: '' },
  'mci': { name: 'همراه اول (MCI)', length: '100-200', interval: '10-20', packets: 'tlshello' },
  'irancell': { name: 'ایرانسل (MTN Irancell)', length: '50-100', interval: '5-10', packets: 'tlshello' },
  'rightel': { name: 'مخابرات و رایتل (Rightel / TCI)', length: '1-3', interval: '1-5', packets: '1-1' },
  'anti-dpi': { name: 'ضد فیلترینگ شدید (Anti-DPI)', length: '10-30', interval: '20-40', packets: 'tlshello' },
  'custom': { name: 'سفارشی (Custom)', length: '100-200', interval: '10-20', packets: 'tlshello' }
};

export const FINGERPRINT_PRESETS = [
  { id: 'chrome', name: 'Chrome (پیشنهادی)' },
  { id: 'firefox', name: 'Firefox' },
  { id: 'safari', name: 'Safari (iOS/macOS)' },
  { id: 'edge', name: 'Microsoft Edge' },
  { id: 'ios', name: 'iOS Device' },
  { id: 'randomized', name: 'Randomized (تصادفی)' }
];

export const ECH_DOMAINS = [
  'cloudflare-ech.com',
  'crypto.cloudflare.com',
  'cloudflare-dns.com',
  'cloudflare.com',
  'deflect.ca',
  'one.one.one.one',
  'mozilla.cloudflare-dns.com',
  'cloudflare-ech.net'
];

// لیست آماده DNS (DoH) برای انتخاب در پنل — مقدار نهایی در پارامتر dns نودها می‌نشیند
export const DNS_PRESETS = [
  { id: 'cloudflare', name: 'Cloudflare (1.1.1.1)', value: 'https://1.1.1.1/dns-query' },
  { id: 'cloudflare-alt', name: 'Cloudflare (223.5.5.5)', value: 'https://223.5.5.5/dns-query' },
  { id: 'google', name: 'Google (8.8.8.8)', value: 'https://8.8.8.8/dns-query' },
  { id: 'quad9', name: 'Quad9 (9.9.9.9)', value: 'https://9.9.9.9/dns-query' },
  { id: 'opendns', name: 'OpenDNS (208.67.222.222)', value: 'https://208.67.222.222/dns-query' },
  { id: 'shecan', name: 'شکن (178.22.122.100)', value: 'https://178.22.122.100/dns-query' },
  { id: 'radar', name: 'رادار (10.202.10.10)', value: 'https://10.202.10.10/dns-query' },
  { id: 'begzar', name: 'بگذر (185.55.226.26)', value: 'https://185.55.226.26/dns-query' },
  { id: 'adguard', name: 'AdGuard (94.140.14.14)', value: 'https://94.140.14.14/dns-query' },
  { id: 'nextdns', name: 'NextDNS (45.90.28.0)', value: 'https://45.90.28.0/dns-query' },
  { id: 'iranserver', name: 'ایران‌سرور (172.29.2.100)', value: 'https://172.29.2.100/dns-query' },
  { id: 'electrotm', name: 'الکترو (78.157.42.101)', value: 'https://78.157.42.101/dns-query' }
];

export const PATH_PATTERNS = [
  { id: '/?ed=2048', name: 'استاندارد (/?ed=2048)' },
  { id: '/?ed=2560', name: 'حجم بزرگ (/?ed=2560)' },
  { id: '/mili/{random}?ed=2048', name: 'مسیر رندوم (/mili/{random}?ed=2048)' },
  { id: '/api/v1/stream', name: 'استتار API (/api/v1/stream)' },
  { id: '/grpc', name: 'gRPC مسیر (/grpc)' },
  { id: '/ws', name: 'وب‌سوکت ساده (/ws)' },
  { id: '/video/stream', name: 'استتار ویدیو (/video/stream)' },
  { id: '/download/file?ed=2048', name: 'استتار دانلود (/download/file)' }
];

// پورت‌های مجاز کلادفلر برای انتخاب در پنل
export const CF_PORT_CHOICES = [
  { port: 443, tls: true, label: '443 (HTTPS اصلی)' },
  { port: 2053, tls: true, label: '2053 (HTTPS)' },
  { port: 2083, tls: true, label: '2083 (HTTPS)' },
  { port: 2087, tls: true, label: '2087 (HTTPS)' },
  { port: 2096, tls: true, label: '2096 (HTTPS)' },
  { port: 8443, tls: true, label: '8443 (HTTPS)' },
  { port: 80, tls: false, label: '80 (HTTP)' },
  { port: 8080, tls: false, label: '8080 (HTTP)' },
  { port: 8880, tls: false, label: '8880 (HTTP)' },
  { port: 2052, tls: false, label: '2052 (HTTP)' },
  { port: 2082, tls: false, label: '2082 (HTTP)' },
  { port: 2086, tls: false, label: '2086 (HTTP)' },
  { port: 2095, tls: false, label: '2095 (HTTP)' }
];

export function parseNodePorts(value = '') {
  const source = String(value || '').trim() || CONFIG_DEFAULTS.ports;
  const seen = new Set();
  const list = [];
  for (const chunk of source.split(/[,\s]+/)) {
    const port = parseInt(chunk, 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535 || seen.has(port)) continue;
    seen.add(port);
    list.push(port);
  }
  return list.length ? list : [443];
}

// حداقل ۳ پورت TLS و ۳ پورت HTTP برای هر اشتراک؛ در ساخت کاربر، پورت‌ها
// تصادفی از فهرست رسمی کلادفلر انتخاب می‌شوند تا هر کاربر ترکیب متفاوتی بگیرد.
export function ensureSubscriptionPortVariety(config = {}, options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const shuffle = (list) => {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pick = (value, allowed, minimum, randomize) => {
    const selected = [...new Set(parseNodePorts(value).filter(port => allowed.includes(port)))];
    if (randomize && selected.length <= minimum) {
      return shuffle(allowed).slice(0, Math.max(minimum, selected.length));
    }
    while (selected.length < minimum) {
      const candidates = allowed.filter(port => !selected.includes(port));
      if (!candidates.length) break;
      selected.push(candidates[Math.floor(random() * candidates.length)]);
    }
    return selected;
  };
  return {
    ...config,
    ports: pick(config.ports, CF_HTTPS_PORTS, 3, options.randomize !== false).join(','),
    httpPorts: pick(config.httpPorts, CF_HTTP_PORTS, 3, options.randomizeHttp !== false).join(',')
  };
}

// نقاط پایانی اضافهٔ WARP که از طرف مدیر ارسال شده‌اند؛ همگی روی پورت ۲۴۰۸
// (به‌جز دو نقطهٔ IPv6 با پورت ۴۱۷۷) و برای عبور از شبکه‌های سخت‌گیرانه.
export const WARP_EXTRA_ENDPOINTS = [
  { host: '188.114.97.240', port: 2408 },
  { host: '162.159.195.165', port: 2408 },
  { host: '8.39.125.158', port: 2408 },
  { host: '162.159.192.78', port: 2408 },
  { host: '8.34.146.185', port: 2408 },
  { host: '188.114.98.224', port: 2408 },
  { host: '8.39.125.200', port: 2408 },
  { host: '188.114.97.39', port: 2408 },
  { host: '8.35.211.206', port: 2408 },
  { host: '8.39.125.211', port: 2408 },
  { host: '188.114.98.107', port: 2408 },
  { host: '8.34.70.62', port: 2408 },
  { host: '162.159.195.0', port: 2408 },
  { host: '8.6.112.212', port: 2408 },
  { host: '8.6.112.197', port: 2408 },
  { host: '162.159.195.76', port: 2408 },
  { host: '8.6.112.168', port: 2408 },
  { host: '8.39.125.46', port: 2408 },
  { host: '8.39.214.176', port: 2408 },
  { host: '8.39.214.18', port: 2408 },
  { host: '162.159.195.163', port: 2408 },
  { host: '8.39.125.185', port: 2408 },
  { host: '8.39.214.184', port: 2408 },
  { host: '188.114.98.104', port: 2408 },
  { host: '8.34.146.186', port: 2408 },
  { host: '8.47.69.202', port: 2408 },
  { host: '8.6.112.53', port: 2408 },
  { host: '188.114.98.4', port: 2408 },
  { host: '8.47.69.78', port: 2408 },
  { host: '8.34.70.149', port: 2408 },
  { host: '8.39.125.201', port: 2408 },
  { host: '8.34.70.252', port: 2408 },
  { host: '188.114.99.190', port: 2408 },
  { host: '8.6.112.232', port: 2408 },
  { host: '188.114.96.93', port: 2408 },
  { host: '8.47.69.160', port: 2408 },
  { host: '8.47.69.185', port: 2408 },
  { host: '2606:4700:d0:0:f268:a395:fe1b:3895', port: 4177 },
  { host: '2606:4700:d1:0:9c3d:744e:2fea:8721', port: 2408 }
];

// منابع کشوری از رجیستری زندهٔ اسکنر (src/config/sources.js) ساخته می‌شوند؛
// آدرس‌های ۴۰۴ (dimzon، بخشی از فایل‌های proxy_vip و …) از این استخر حذف شده‌اند.

// ============================================================================
// ادغام منابع زنده اسکنر (آینهٔ لبه + trio666 + proxifly + ProxyScrape + ClearProxy)
// ============================================================================
export const COUNTRY_PROXY_SOURCES = (() => {
  const codes = new Set([
    ...Object.keys(COUNTRY_EXTRA_PROXY_SOURCES),
    ...Object.keys(COUNTRY_META)
  ]);
  const merged = {};
  for (const code of codes) {
    const meta = COUNTRY_META[code] || {};
    const urls = [...new Set(COUNTRY_EXTRA_PROXY_SOURCES[code] || [])];
    merged[code] = {
      name: meta.name || code,
      flag: meta.flag || '',
      urls
    };
  }
  return merged;
})();

export const GLOBAL_PROXY_SOURCES = {
  socks5: GLOBAL_SOCKS5_SOURCES,
  http: GLOBAL_HTTP_SOURCES,
  mixed: GLOBAL_MIXED_SOURCES,
  residential: RESIDENTIAL_SOURCES
};

export {
  CF_EDGE_DOMAINS,
  CFNEW_API_KEY_SALT,
  CFNEW_API_SECRET,
  CFNEW_API_URL,
  CFNEW_DOMAIN_SOURCES,
  CFNEW_IPV4_SOURCES,
  CFNEW_IPV6_SOURCES,
  CFNEW_ISP_GROUPS,
  CFNEW_PROXYIP_SOURCES,
  IP_CANDIDATE_SOURCES,
  IPV6_CANDIDATE_SOURCES,
  PROXY_IP_SOURCES,
  IP_RANGE_SOURCES,
  HIGH_YIELD_PROXY_SOURCES,
  PROXY_FEED_REGISTRY,
  getFeedKind,
  OPENVPN_CSV_SOURCES,
  OPENVPN_PROFILE_SOURCES,
  OPENVPN_PUBLIC_PASS,
  OPENVPN_PUBLIC_USER,
  OPENVPN_RAW_PROFILE_SOURCES,
  WARP_CLIENT_VERSION,
  WARP_DEFAULT_ADDRESS,
  WARP_DEFAULT_HOST,
  WARP_DEFAULT_PORT,
  WARP_ENDPOINT_IPS,
  WARP_ENDPOINT_PORTS,
  WARP_PEER_PUBLIC_KEY,
  WARP_REGISTRATION_URL
};

// ----------------------------------------------------------------------------
// Placement کلودفلر و مقاصد ProxyIP خانوادهٔ CMLiussss
// ----------------------------------------------------------------------------
// هر منطقهٔ Placement، کد Colo، کشور نمایشی و شناسه‌های استاندارد ابری را دارد.
// این فهرست هم برای دراپ‌داون مودال و هم برای نام‌گذاری/مسیر نودها استفاده می‌شود.
export const PLACEMENT_REGIONS = [
  { colo: 'FRA', country: 'DE', flag: '🇩🇪', name: 'آلمان - فرانکفورت', targets: ['aws:eu-central-1', 'azure:germanywestcentral', 'gcp:europe-west3'] },
  { colo: 'AMS', country: 'NL', flag: '🇳🇱', name: 'هلند - آمستردام', targets: ['azure:westeurope', 'gcp:europe-west4'] },
  { colo: 'LHR', country: 'GB', flag: '🇬🇧', name: 'انگلیس - لندن', targets: ['aws:eu-west-2', 'azure:uksouth'] },
  { colo: 'CDG', country: 'FR', flag: '🇫🇷', name: 'فرانسه - پاریس', targets: ['aws:eu-west-3', 'azure:francecentral'] },
  { colo: 'HEL', country: 'FI', flag: '🇫🇮', name: 'فنلاند - هلسینکی', targets: ['gcp:europe-north1'] },
  { colo: 'ARN', country: 'SE', flag: '🇸🇪', name: 'سوئد - استکهلم', targets: ['aws:eu-north-1', 'azure:swedencentral'] },
  { colo: 'WAW', country: 'PL', flag: '🇵🇱', name: 'لهستان - ورشو', targets: ['azure:polandcentral', 'gcp:europe-central2'] },
  { colo: 'ZRH', country: 'CH', flag: '🇨🇭', name: 'سوئیس - زوریخ', targets: ['aws:eu-central-2', 'azure:switzerlandnorth'] },
  { colo: 'DXB', country: 'AE', flag: '🇦🇪', name: 'امارات - دبی', targets: ['aws:me-central-1', 'azure:uaenorth'] },
  { colo: 'IAD', country: 'US', flag: '🇺🇸', name: 'آمریکا شرق - ویرجینیا', targets: ['aws:us-east-1', 'azure:eastus', 'gcp:us-east4'] },
  { colo: 'SJC', country: 'US', flag: '🇺🇸', name: 'آمریکا غرب - کالیفرنیا', targets: ['aws:us-west-1', 'azure:westus'] },
  { colo: 'SIN', country: 'SG', flag: '🇸🇬', name: 'سنگاپور', targets: ['aws:ap-southeast-1', 'azure:southeastasia'] },
  { colo: 'NRT', country: 'JP', flag: '🇯🇵', name: 'ژاپن - توکیو', targets: ['aws:ap-northeast-1', 'azure:japaneast'] },
  { colo: 'ICN', country: 'KR', flag: '🇰🇷', name: 'کره جنوبی - سئول', targets: ['aws:ap-northeast-2', 'azure:koreacentral'] }
];

export const MULTI_PLACEMENT_COLOS = PLACEMENT_REGIONS.map(item => item.colo);

export const PROXYIP_REGIONS = [
  { code: 'DE', country: 'DE', flag: '🇩🇪', name: 'آلمان', host: 'ProxyIP.DE.CMLiussss.net' },
  { code: 'NL', country: 'NL', flag: '🇳🇱', name: 'هلند', host: 'ProxyIP.NL.CMLiussss.net' },
  { code: 'UK', country: 'GB', flag: '🇬🇧', name: 'بریتانیا', host: 'ProxyIP.GB.CMLiussss.net' },
  { code: 'FR', country: 'FR', flag: '🇫🇷', name: 'فرانسه', host: 'ProxyIP.FR.CMLiussss.net' },
  { code: 'FI', country: 'FI', flag: '🇫🇮', name: 'فنلاند', host: 'ProxyIP.FI.CMLiussss.net' },
  { code: 'PL', country: 'PL', flag: '🇵🇱', name: 'لهستان', host: 'ProxyIP.PL.CMLiussss.net' },
  { code: 'TR', country: 'TR', flag: '🇹🇷', name: 'ترکیه', host: 'ProxyIP.DE.CMLiussss.net' },
  { code: 'IAD', country: 'US', flag: '🇺🇸', name: 'ایالات متحده شرق', host: 'ProxyIP.US.CMLiussss.net' },
  { code: 'LAX', country: 'US', flag: '🇺🇸', name: 'ایالات متحده غرب', host: 'ProxyIP.US.CMLiussss.net' },
  { code: 'SE', country: 'SE', flag: '🇸🇪', name: 'سوئد', host: 'ProxyIP.SE.CMLiussss.net' },
  { code: 'CH', country: 'CH', flag: '🇨🇭', name: 'سوئیس', host: 'ProxyIP.CH.CMLiussss.net' },
  { code: 'CA', country: 'CA', flag: '🇨🇦', name: 'کانادا', host: 'ProxyIP.CA.CMLiussss.net' },
  { code: 'AE', country: 'AE', flag: '🇦🇪', name: 'امارات', host: 'ProxyIP.DE.CMLiussss.net' },
  { code: 'SG', country: 'SG', flag: '🇸🇬', name: 'سنگاپور', host: 'ProxyIP.SG.CMLiussss.net' },
  { code: 'JP', country: 'JP', flag: '🇯🇵', name: 'ژاپن', host: 'ProxyIP.JP.CMLiussss.net' },
  { code: 'KR', country: 'KR', flag: '🇰🇷', name: 'کره جنوبی', host: 'ProxyIP.KR.CMLiussss.net' },
  { code: 'HK', country: 'HK', flag: '🇭🇰', name: 'هنگ‌کنگ', host: 'ProxyIP.HK.CMLiussss.net' },
  { code: 'Oracle', country: '', flag: '☁️', name: 'دیتاسنتر اوراکل', host: 'ProxyIP.Oracle.CMLiussss.net' },
  { code: 'DigitalOcean', country: '', flag: '🌊', name: 'دیجیتال‌اوشن', host: 'ProxyIP.DigitalOcean.CMLiussss.net' },
  { code: 'Vultr', country: '', flag: '🦅', name: 'ولتر کلود', host: 'ProxyIP.Vultr.CMLiussss.net' },
  { code: 'BPB', country: '', flag: '🛡️', name: 'سرور پرسرعت BPB', host: 'bpb.yousef.isegaro.com' }
];

export const DEFAULT_PROXYIP_REGION = 'DE';
const PROXYIP_BY_COUNTRY = new Map();
for (const item of PROXYIP_REGIONS) {
  if (item.country && !PROXYIP_BY_COUNTRY.has(item.country)) {
    PROXYIP_BY_COUNTRY.set(item.country, item);
  }
}

// Coloها کد فرودگاه هستند (FRA/AMS/...) ولی ProxyIPهای CMLiussss با کد
// کشور/منطقه سرو می‌شوند (DE/NL/...). این نگاشت جلوی ساخت دامنه‌های
// ناموجودی مثل ProxyIP.FRA.CMLiussss.net را می‌گیرد.
export function proxyIpCodeForPlacement(colo = '') {
  const placement = getPlacementRegion(colo);
  if (!placement) return DEFAULT_PROXYIP_REGION;
  if (placement.country === 'US') {
    return placement.colo === 'SJC' ? 'LAX' : 'IAD';
  }
  const region = PROXYIP_BY_COUNTRY.get(placement.country);
  return region ? region.code : DEFAULT_PROXYIP_REGION;
}

export const PROXYIP_FALLBACKS = [
  'ProxyIP.Oracle.CMLiussss.net:443',
  'bpb.yousef.isegaro.com:443'
];

const PLACEMENT_BY_COLO = new Map(PLACEMENT_REGIONS.map(item => [item.colo, item]));
const PROXYIP_BY_CODE = new Map(PROXYIP_REGIONS.map(item => [item.code.toLowerCase(), item]));
const PLACEMENT_BY_COUNTRY = new Map(PLACEMENT_REGIONS.map(item => [item.country, item]));

export function getPlacementRegion(value = '') {
  return PLACEMENT_BY_COLO.get(String(value || '').trim().toUpperCase()) || null;
}

export function getProxyIpRegion(value = '') {
  return PROXYIP_BY_CODE.get(String(value || '').trim().toLowerCase()) || null;
}

export function placementForCountry(country = '') {
  return PLACEMENT_BY_COUNTRY.get(String(country || '').trim().toUpperCase()) || null;
}

// مقدار یکتای دراپ‌داون اول را به mode/colo/targets تجزیه می‌کند.
// ورودی‌های قدیمی مثل «DE» یا «FRA» هم به حالت دستی نگاشت می‌شوند.
export function normalizePlacementValue(value = '', fallbackColo = '') {
  const raw = String(value || '').trim();
  if (!raw || /^auto$/i.test(raw) || /^cf$/i.test(raw)) {
    return { mode: 'auto', colo: '', region: null, value: 'auto' };
  }
  if (/^(multi|multi_placement|multiple)$/i.test(raw)) {
    return { mode: 'multi_placement', colo: '', region: null, value: 'multi_placement' };
  }
  let candidate = raw;
  const manual = raw.match(/^manual_placement(?::(.+))?$/i);
  if (manual) candidate = manual[1] || fallbackColo || '';
  const byCountry = placementForCountry(candidate);
  const region = getPlacementRegion(candidate) || byCountry;
  if (region) {
    return {
      mode: 'manual_placement',
      colo: region.colo,
      region,
      value: `manual_placement:${region.colo}`
    };
  }
  return { mode: 'auto', colo: '', region: null, value: 'auto' };
}

export function normalizeProxyMode(value = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'multi' || raw === 'multi_cmliu' || raw === 'multi_proxyip') return 'multi_cmliu';
  if (raw === 'manual' || raw === 'manual_proxyip' || raw === 'single') return 'manual_proxyip';
  return 'sync_placement';
}

export function normalizeProxyRegion(value = '') {
  return getProxyIpRegion(value)?.code || DEFAULT_PROXYIP_REGION;
}

export function normalizeProxyMultiRegions(value = '') {
  const list = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const part of list) {
    const item = getProxyIpRegion(part);
    if (!item || seen.has(item.code)) continue;
    seen.add(item.code);
    out.push(item.code);
  }
  return out.length ? out.join(',') : CONFIG_DEFAULTS.proxyMultiRegions;
}

export function proxyIpHostForCode(code = '') {
  const item = getProxyIpRegion(code);
  return item ? `${item.host}:443` : '';
}

// پاسخ به proxyip=auto: Colo همان درخواست را می‌گیرد؛ اگر در محیط تست
// request.cf نبود، FRA به‌عنوان پیش‌فرض امن استفاده می‌شود.
export function resolveProxyIpValue(value = '', colo = '') {
  const raw = String(value || '').trim();
  const first = raw.split(',')[0].trim();
  if (!first || /^auto$/i.test(first)) {
    const cleanColo = String(colo || '').trim().toUpperCase();
    return proxyIpHostForCode(proxyIpCodeForPlacement(cleanColo));
  }
  // لینک‌های قدیمی که با Colo ساخته شده‌اند (ProxyIP.FRA/AMS/...) را هم
  // به دامنهٔ واقعی ProxyIP همان کشور نگاشت می‌کنیم.
  const legacyColo = first.match(/^ProxyIP\.([A-Za-z]{3})\.CMLiussss\.net(?::(\d+))?$/i);
  if (legacyColo && !getProxyIpRegion(legacyColo[1]) && getPlacementRegion(legacyColo[1])) {
    const port = legacyColo[2] || '443';
    return `ProxyIP.${proxyIpCodeForPlacement(legacyColo[1])}.CMLiussss.net:${port}`;
  }
  return first;
}

export const REGION_MAP = {
  CF: ['🌐 مستقیم رسمی CF', 'CF', 'Cloudflare Direct'],
  HK: ['🇭🇰 هنگ‌کنگ', 'HK', 'Hong Kong'],
  US: ['🇺🇸 آمریکا', 'US', 'United States'],
  SG: ['🇸🇬 سنگاپور', 'SG', 'Singapore'],
  JP: ['🇯🇵 ژاپن', 'JP', 'Japan'],
  KR: ['🇰🇷 کره‌جنوبی', 'KR', 'South Korea'],
  DE: ['🇩🇪 آلمان', 'DE', 'Germany'],
  SE: ['🇸🇪 سوئد', 'SE', 'Sweden'],
  NL: ['🇳🇱 هلند', 'NL', 'Netherlands'],
  FI: ['🇫🇮 فنلاند', 'FI', 'Finland'],
  GB: ['🇬🇧 بریتانیا', 'GB', 'United Kingdom'],
  CA: ['🇨🇦 کانادا', 'CA', 'Canada'],
  TR: ['🇹🇷 ترکیه', 'TR', 'Turkey'],
  FR: ['🇫🇷 فرانسه', 'FR', 'France'],
  AE: ['🇦🇪 امارات', 'AE', 'United Arab Emirates'],
  Oracle: ['☁️ Oracle', 'Oracle'],
  DigitalOcean: ['🌊 DigitalOcean', 'DigitalOcean'],
  Vultr: ['⚡ Vultr', 'Vultr'],
  Multacom: ['🏢 Multacom', 'Multacom']
};

// آی‌پی‌های ثابت (anycast) خود کلادفلر؛ این‌ها برخلاف دامنه‌های CNAME همیشه پاسخ می‌دهند
// و به‌عنوان «آی‌پی ثابت» در ابتدای نودهای ساب‌لینک قرار می‌گیرند.
export const OFFICIAL_DIRECT_IPS = [
  '172.71.218.190',
  '162.158.228.87',
  '162.158.189.134',
  '162.158.26.63',
  '162.158.25.86',
  '162.158.29.216',
  '162.158.218.160',
  '162.158.227.214',
  '172.69.118.198',
  '172.69.119.150',
  '104.16.131.1',
  '104.17.0.1',
  '104.18.0.1',
  '104.19.0.1',
  '104.20.0.1',
  '104.21.0.1',
  '104.22.0.1',
  '104.24.0.1',
  '104.25.0.1',
  '104.26.0.1',
  '104.27.0.1',
  '172.64.0.1',
  '172.65.0.1',
  '172.66.0.1',
  '172.67.0.1',
  '162.159.0.1',
  '188.114.96.1',
  '188.114.97.1'
];

// آی‌پی‌های ثابت IPv6 کلادفلر (فقط وقتی IPv6 فعال باشد)
export const OFFICIAL_DIRECT_IPV6 = [
  '2606:4700::6810:1',
  '2606:4700::6811:1',
  '2606:4700::6812:1',
  '2606:4700::6813:1',
  '2606:4700:10::6810:1',
  '2803:f800:50::6ca2:c001'
];

export const FALLBACK_PROXY_IPS = [
  { domain: 'ProxyIP.HK.CMLiussss.net', region: 'HK', regionCode: 'HK', port: 443 },
  { domain: 'ProxyIP.US.CMLiussss.net', region: 'US', regionCode: 'US', port: 443 },
  { domain: 'ProxyIP.SG.CMLiussss.net', region: 'SG', regionCode: 'SG', port: 443 },
  { domain: 'ProxyIP.JP.CMLiussss.net', region: 'JP', regionCode: 'JP', port: 443 },
  { domain: 'ProxyIP.KR.CMLiussss.net', region: 'KR', regionCode: 'KR', port: 443 },
  { domain: 'ProxyIP.DE.CMLiussss.net', region: 'DE', regionCode: 'DE', port: 443 },
  { domain: 'ProxyIP.SE.CMLiussss.net', region: 'SE', regionCode: 'SE', port: 443 },
  { domain: 'ProxyIP.NL.CMLiussss.net', region: 'NL', regionCode: 'NL', port: 443 },
  { domain: 'ProxyIP.FI.CMLiussss.net', region: 'FI', regionCode: 'FI', port: 443 },
  { domain: 'ProxyIP.GB.CMLiussss.net', region: 'GB', regionCode: 'GB', port: 443 },
  { domain: 'ProxyIP.Oracle.cmliussss.net', region: 'Oracle', regionCode: 'Oracle', port: 443 },
  { domain: 'ProxyIP.DigitalOcean.CMLiussss.net', region: 'DigitalOcean', regionCode: 'DigitalOcean', port: 443 },
  { domain: 'ProxyIP.Vultr.CMLiussss.net', region: 'Vultr', regionCode: 'Vultr', port: 443 },
  { domain: 'ProxyIP.Multacom.CMLiussss.net', region: 'Multacom', regionCode: 'Multacom', port: 443 }
];

export const DIRECT_DOMAINS = [
  { name: 'cloudflare.182682.xyz', domain: 'cloudflare.182682.xyz' },
  { name: 'speed.marisalnc.com', domain: 'speed.marisalnc.com' },
  { domain: 'freeyx.cloudflare88.eu.org' },
  { domain: 'bestcf.top' },
  { domain: 'cdn.2020111.xyz' },
  { domain: 'cfip.cfcdn.vip' },
  { domain: 'cf.0sm.com' },
  { domain: 'cf.090227.xyz' },
  { domain: 'cf.zhetengsha.eu.org' },
  { domain: 'cloudflare.9jy.cc' },
  { domain: 'cf.zerone-cdn.pp.ua' },
  { domain: 'cfip.1323123.xyz' },
  { domain: 'cnamefuckxxs.yuchen.icu' },
  { domain: 'cloudflare-ip.mofashi.ltd' },
  { domain: '115155.xyz' },
  { domain: 'cname.xirancdn.us' },
  { domain: 'f3058171cad.002404.xyz' },
  { domain: '8.889288.xyz' },
  { domain: 'cdn.tzpro.xyz' },
  { domain: 'cf.877771.xyz' },
  { domain: 'xn--b6gac.eu.org' }
];

export const CF_HTTP_PORTS = [80, 8080, 8880, 2052, 2082, 2086, 2095];
export const CF_HTTPS_PORTS = [443, 2053, 2083, 2087, 2096, 8443];
export const ALLOWED_ALPN = ['', 'h3', 'h2', 'http/1.1', 'h3,h2', 'h2,http/1.1', 'h3,h2,http/1.1'];
export const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/byJoey/test/refs/heads/main/tist.ini';

export function isEnabledValue(val, defaultEnabled = false) {
  if (val === undefined || val === null || val === '') return defaultEnabled;
  if (val === true || val === false) return val;
  const text = String(val).trim().toLowerCase();
  if (text === 'yes' || text === 'true' || text === '1' || text === 'on') return true;
  if (text === 'no' || text === 'false' || text === '0' || text === 'off') return false;
  return defaultEnabled;
}

export function normalizeSwitch(val, defaultEnabled = false) {
  return isEnabledValue(val, defaultEnabled) ? 'yes' : 'no';
}

export function normalizeAlpn(val) {
  const s = String(val || '').trim();
  return ALLOWED_ALPN.includes(s) ? s : '';
}

export function normalizeEffectiveConfig(rawConfig = {}) {
  const snap = {
    ...CONFIG_DEFAULTS,
    ...(rawConfig || {})
  };
  for (const key of BOOLEAN_CONFIG_KEYS) {
    snap[key] = normalizeSwitch(snap[key], isEnabledValue(CONFIG_DEFAULTS[key]));
  }
  if (snap.ev === 'no' && snap.et === 'no' && snap.ex === 'no' && snap.es === 'no') {
    snap.ev = 'yes';
  }
  // ECH فقط رمزنگاری TLS را فعال می‌کند و نباید پورت‌های HTTP را حذف کند؛
  // حذف HTTP فقط با سوییچ صریح dkby انجام می‌شود.
  snap.alpn = normalizeAlpn(snap.alpn);
  const parsedCount = parseInt(snap.subNodeCount, 10);
  // ۰ = خودکار (موتور خودش تعداد نودها را تا سقف ۳۵۰ تعیین می‌کند)
  snap.subNodeCount = Number.isFinite(parsedCount) && parsedCount >= 0
    ? Math.min(parsedCount, MAX_SUB_NODE_COUNT)
    : 0;
  const rawRegion = String(rawConfig?.region || '').trim().toUpperCase();
  const hadExplicitPlacement = rawConfig?.placement !== undefined && String(rawConfig.placement || '').trim() !== '';
  const legacyPlacement = !hadExplicitPlacement && /^[A-Z]{2}$/.test(rawRegion) && rawRegion !== 'AUTO' && rawRegion !== 'CF'
    ? placementForCountry(rawRegion)?.colo || ''
    : '';
  const placementInfo = normalizePlacementValue(
    hadExplicitPlacement ? rawConfig.placement : legacyPlacement,
    rawConfig?.placementColo || ''
  );
  snap.placement = placementInfo.value;
  snap.placementMode = placementInfo.mode;
  snap.placementColo = placementInfo.colo;
  snap.placementTargets = placementInfo.mode === 'manual_placement'
    ? placementInfo.region.targets.join(',')
    : placementInfo.mode === 'multi_placement'
      ? MULTI_PLACEMENT_COLOS.join(',')
      : '';
  snap.region = String(snap.region || 'auto').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(snap.region)) snap.region = 'auto';
  // چرخش آی‌پی: «off» یا ۰ یعنی خاموش (پیش‌فرض)؛ عدد = دقیقه
  const rotationRaw = String(snap.ipRotation == null ? '' : snap.ipRotation).trim().toLowerCase();
  if (!rotationRaw || rotationRaw === 'off' || rotationRaw === '0' || rotationRaw === 'false') {
    snap.ipRotation = 'off';
  } else {
    const rotNum = parseInt(rotationRaw, 10);
    snap.ipRotation = Number.isFinite(rotNum) && rotNum > 0 ? String(rotNum) + 'm' : 'off';
  }
  // متدهای Shadowsocks پشتیبانی‌شده: aes-128-gcm (پیش‌فرض) و aes-256-gcm
  snap.ssmethod = String(snap.ssmethod || '').toLowerCase() === 'aes-256-gcm' ? 'aes-256-gcm' : 'aes-128-gcm';
  // اگر پریست فرگمنت روی حالت سفارشی باشد و مقادیر خالی بمانند، از مقادیر پیش‌فرض ضد-DPI استفاده می‌شود
  if (!snap.fragmentLength) snap.fragmentLength = '100-200';
  if (!snap.fragmentInterval) snap.fragmentInterval = '10-20';
  if (!snap.fragmentPackets) snap.fragmentPackets = 'tlshello';
  snap.sbRegion = String(snap.sbRegion || 'DE').trim().toUpperCase();
  if (!snap.sbRegion) snap.sbRegion = 'DE';
  // مهاجرت نرم: تنظیمات قدیمی که فقط region/sbRegion داشتند، همان کشور خروجی
  // را به‌عنوان حالت دستی تحریم‌شکن نگه می‌دارند.
  const hadExplicitProxyMode = rawConfig?.proxyMode !== undefined && String(rawConfig.proxyMode || '').trim() !== '';
  // مهاجرت نرم: اگر نسخهٔ قدیمی p دستی داشت، همان مقدار نباید با حالت خودکار نادیده گرفته شود.
  const legacyProxyMode = !hadExplicitProxyMode && (
    String(rawConfig?.p || '').trim() || (rawRegion && rawRegion !== 'AUTO' && rawRegion !== 'CF')
  ) ? 'manual_proxyip' : 'sync_placement';
  snap.proxyMode = normalizeProxyMode(hadExplicitProxyMode ? rawConfig.proxyMode : legacyProxyMode);
  snap.proxyRegion = normalizeProxyRegion(rawConfig?.proxyRegion || (legacyProxyMode === 'manual_proxyip' ? rawRegion : snap.sbRegion));
  snap.proxyMultiRegions = normalizeProxyMultiRegions(rawConfig?.proxyMultiRegions || CONFIG_DEFAULTS.proxyMultiRegions);
  snap.ipMode = String(snap.ipMode || '').toLowerCase() === 'fixed' ? 'fixed' : 'country';
  snap.ipPinned = String(snap.ipPinned || '').trim();
  if (snap.ipMode === 'fixed') snap.ipRotation = 'off';
  // نسخهٔ AmneziaWG برای نودهای WARP؛ هر مقدار ناشناخته به نسخهٔ ۳ (امنزیا 3.x) می‌رود
  snap.awgv = ['1', '2', '3'].includes(String(snap.awgv || '').trim()) ? String(snap.awgv).trim() : '3';
  snap.fp = snap.fp || 'chrome';
  snap.patt = snap.patt || '/?ed=2048';
  snap.ports = parseNodePorts(snap.ports).join(',');
  // پورت‌های HTTP اختیاری‌اند؛ مقدار خالی یعنی فقط نودهای TLS ساخته شوند
  snap.httpPorts = String(snap.httpPorts == null ? CONFIG_DEFAULTS.httpPorts : snap.httpPorts).trim()
    ? parseNodePorts(snap.httpPorts).filter(port => CF_HTTP_PORTS.includes(port)).join(',')
    : '';
  const clampInt = (val, min, max, dflt) => {
    const n = parseInt(val, 10);
    if (!Number.isFinite(n)) return dflt;
    return Math.min(max, Math.max(min, n));
  };
  snap.pdCount = clampInt(snap.pdCount, 0, 20, 2);
  snap.warpCount = clampInt(snap.warpCount, 1, 30, 8);
  snap.warpMasqueCount = clampInt(snap.warpMasqueCount, 1, 6, 3);
  snap.ovpnCount = clampInt(snap.ovpnCount, 0, 24, 8);
  snap.warpLicense = String(snap.warpLicense || '').trim();
  snap.warpEndpoint = String(snap.warpEndpoint || '').trim();
  snap.ovpnCountries = String(snap.ovpnCountries || '').trim().toUpperCase();
  snap.ovpnSource = String(snap.ovpnSource || '').trim();
  snap.autoUpdate = normalizeSwitch(snap.autoUpdate, false);
  snap.cfAccountId = String(snap.cfAccountId || '').trim();
  snap.cfScriptName = String(snap.cfScriptName || '').trim();
  snap.supportChannel = TELEGRAM_SUPPORT;
  snap.brand = BRAND_NAME;
  return snap;
}

export function readEnvConfigValue(env, ...names) {
  if (!env) return undefined;
  for (const name of names) {
    if (env[name] !== undefined && env[name] !== null && env[name] !== '' && typeof env[name] !== 'object') {
      return env[name];
    }
  }
  return undefined;
}

export function getEnvConfigSnapshot(env = {}) {
  const snap = {};
  for (const [key, names] of Object.entries(ENV_KEY_MAPPING)) {
    const val = readEnvConfigValue(env, ...names);
    if (val !== undefined) snap[key] = val;
  }
  return snap;
}
