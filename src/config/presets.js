// ============================================================================
// miliconfig v3.2 - پریست‌های ساخت سریع کاربر
// هر پریست تنظیمات موتور مخصوص خودش را دارد (پروتکل، فرگمنت، خروجی، WARP و...)
// و کشورهای استخر آی‌پی خودش را برای دکمه‌های گرد ساخت سریع اعلام می‌کند.
// ============================================================================

import {
  CONFIG_DEFAULTS,
  DIRECT_DOMAINS,
  normalizeEffectiveConfig,
  OFFICIAL_DIRECT_IPV6
} from './defaults.js';
import { EDGE_PROXY_IPS, GLOBAL_HTTP_SOURCES, GLOBAL_SOCKS5_SOURCES } from './sources.js';
import { IP_POOL, poolCountryName } from './ipPool.js';

// استخر آدرس هر کاربر: IPv4 از مخزن ۶۹۶تایی، IPv6، دامنه، ProxyIP و فیدهای
// SOCKS/HTTP. آدرس‌های تکراری کاربران قبلی کنار گذاشته می‌شوند تا هر کاربر
// مجموعهٔ اختصاصی خودش را بگیرد و آی‌پی بین کاربران اشباع نشود.
export function collectUserAddressUsage(users = []) {
  const hosts = new Set();
  const urls = new Set();
  const addHost = (value) => {
    let text = String(value || '').trim();
    if (!text) return;
    text = text.split('#')[0].trim();
    if (/^[a-z0-9+.-]+:\/\//i.test(text)) text = text.replace(/^[a-z0-9+.-]+:\/\//i, '');
    if (text.includes('@')) text = text.split('@').pop();
    if (text.startsWith('[')) {
      const close = text.indexOf(']');
      text = close > -1 ? text.slice(1, close) : text;
    } else if ((text.match(/:/g) || []).length === 1) {
      text = text.split(':')[0];
    }
    text = text.trim().toLowerCase();
    if (text) hosts.add(text);
  };
  for (const user of (Array.isArray(users) ? users : [])) {
    const cfg = user?.config || {};
    String(cfg.yx || '').split(',').map(s => s.trim()).filter(Boolean).forEach(addHost);
    addHost(cfg.p);
    addHost(cfg.s);
    String(cfg.yxURL || '').split(',').map(s => s.trim()).filter(Boolean).forEach(url => urls.add(url));
  }
  return { hosts, urls };
}

function mixShuffle(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildRandomUserAddressMix(options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const used = collectUserAddressUsage(options.existingUsers || []);
  const manualYx = String(options.extraYx || '').split(',').map(s => s.trim()).filter(Boolean);
  const manualUrls = String(options.extraYxURL || '').split(',').map(s => s.trim()).filter(Boolean);
  manualYx.forEach(line => {
    let host = line.split('#')[0].trim().replace(/^[a-z0-9+.-]+:\/\//i, '').split('@').pop();
    if (host.startsWith('[')) host = host.slice(1, host.indexOf(']'));
    else if ((host.match(/:/g) || []).length === 1) host = host.split(':')[0];
    if (host) used.hosts.add(host.toLowerCase());
  });
  manualUrls.forEach(url => used.urls.add(url));

  const wantedCountries = String(options.poolCountries || '')
    .toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
  const ipv4Source = wantedCountries.length
    ? IP_POOL.filter(item => wantedCountries.includes(String(item.cc || '').toUpperCase()))
    : IP_POOL;
  const ipv4 = [];
  for (const item of mixShuffle(ipv4Source.length ? ipv4Source : IP_POOL, random)) {
    if (ipv4.length >= (options.ipv4Count ?? 45)) break;
    const host = String(item.ip || '').toLowerCase();
    if (!host || used.hosts.has(host)) continue;
    used.hosts.add(host);
    ipv4.push({ host, label: poolCountryName(item.cc), cc: item.cc });
  }

  const ipv6 = [];
  for (const host of mixShuffle(OFFICIAL_DIRECT_IPV6, random)) {
    if (ipv6.length >= (options.ipv6Count ?? 1)) break;
    const key = String(host || '').toLowerCase();
    if (!key || used.hosts.has(key)) continue;
    used.hosts.add(key);
    ipv6.push(key);
  }

  const domains = [];
  for (const item of mixShuffle(DIRECT_DOMAINS, random)) {
    if (domains.length >= (options.domainCount ?? 4)) break;
    const host = String(item.domain || '').toLowerCase();
    if (!host || used.hosts.has(host)) continue;
    used.hosts.add(host);
    domains.push({ host, label: item.name || host });
  }

  const proxyIps = [];
  for (const item of mixShuffle(EDGE_PROXY_IPS, random)) {
    if (proxyIps.length >= (options.proxyIpCount ?? 6)) break;
    const host = String(item.domain || '').toLowerCase();
    if (!host || used.hosts.has(host)) continue;
    used.hosts.add(host);
    proxyIps.push({ host, label: item.region || 'ProxyIP' });
  }

  const socksFeeds = [];
  for (const url of mixShuffle(GLOBAL_SOCKS5_SOURCES, random)) {
    if (socksFeeds.length >= (options.socksFeedCount ?? 2)) break;
    if (!url || used.urls.has(url)) continue;
    used.urls.add(url);
    socksFeeds.push(url);
  }
  const httpFeeds = [];
  for (const url of mixShuffle(GLOBAL_HTTP_SOURCES, random)) {
    if (httpFeeds.length >= (options.httpFeedCount ?? 2)) break;
    if (!url || used.urls.has(url)) continue;
    used.urls.add(url);
    httpFeeds.push(url);
  }

  const autoYx = [
    ...ipv4.map(item => `${item.host}#${item.label}`),
    ...ipv6.map(host => `[${host}]#IPv6`),
    ...domains.map(item => `${item.host}#${item.label}`),
    // دامنه‌های ProxyIP به‌عنوان آدرس نود (نه پروکسی HTTP) وارد می‌شوند؛
    // این دامنه‌ها روی لبهٔ کلادفلر resolve می‌شوند و مسیر p= را خراب نمی‌کنند.
    ...proxyIps.map(item => `${item.host}#ProxyIP-${item.label}`)
  ];
  const seenYx = new Set();
  const yx = [...manualYx, ...autoYx].filter(line => {
    const key = line.split('#')[0].trim().toLowerCase();
    if (!key || seenYx.has(key)) return false;
    seenYx.add(key);
    return true;
  }).join(',');
  const yxURL = [...new Set([...manualUrls, ...socksFeeds, ...httpFeeds])].join(',');
  return {
    yx,
    yxURL,
    counts: {
      ipv4: ipv4.length,
      ipv6: ipv6.length,
      domain: domains.length,
      proxyIp: proxyIps.length,
      socks: socksFeeds.length,
      http: httpFeeds.length
    }
  };
}

export const USER_PRESETS = {
  'iran-fast': {
    id: 'iran-fast',
    title: 'ایران — پرسرعت و ضد فیلتر (پیشنهادی)',
    subtitle: 'همراه اول · ایرانسل · مخابرات · دور زدن فیلتر Pages.dev',
    badges: ['فرگمنت 10-30/100-200', 'SNI ضد DPI', 'آی‌پی تمیز از مخزن آلمان'],
    recommended: true,
    nodeScope: 'all',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 3,
    startOnFirstUse: true,
    poolCountries: 'DE',
    poolCount: 8,
    configOverrides: {
      ev: 'yes',
      et: 'no',
      ex: 'no',
      es: 'no', // شادوساکس پیش‌فرض خاموش (امکانات اضافهٔ کانال)
      fp: 'chrome',
      frag: 'yes',
      fragmentPreset: 'mci',
      fragmentLength: '100-200',
      fragmentInterval: '10-20',
      fragmentPackets: 'tlshello',
      ech: 'no',
      dkby: 'no',
      epd: 'yes',
      epi: 'yes',
      egi: 'yes',
      ena: 'yes',
      ipv4: 'yes',
      ipv6: 'yes',
      sb: 'yes',
      sbRegion: 'DE',
      ipRotation: 'off',
      tcp: 'yes',
      udp: 'yes'
    }
  },
  'pages-iran': {
    id: 'pages-iran',
    title: 'ایران — ضد فیلتر قوی (ویژه Pages.dev فیلترشده)',
    subtitle: 'عبور از فیلترینگ SNI و مسدودی دامنهٔ pages.dev و workers.dev',
    badges: ['xHTTP + VLESS', 'ECH + DoH', 'پورت‌های متنوع TLS/HTTP'],
    recommended: false,
    nodeScope: 'all',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 2,
    startOnFirstUse: true,
    poolCountries: 'DE,NL',
    poolCount: 8,
    configOverrides: {
      ev: 'yes',
      et: 'no',
      ex: 'yes',
      es: 'no',
      fp: 'chrome',
      alpn: 'h2,http/1.1',
      frag: 'no',
      fragmentPreset: 'off',
      fragmentLength: '10-30',
      fragmentInterval: '20-40',
      fragmentPackets: 'tlshello',
      ech: 'yes',
      dkby: 'no',
      epd: 'yes',
      epi: 'yes',
      egi: 'yes',
      ena: 'yes',
      ipv4: 'yes',
      ipv6: 'yes',
      sb: 'yes',
      sbRegion: 'NL',
      ipRotation: 'off',
      tcp: 'yes',
      udp: 'yes'
    }
  },
  'iran-heavy': {
    id: 'iran-heavy',
    title: 'ایران — مصرف سنگین (نامحدود)',
    subtitle: 'استریم · بازی · دانلود',
    badges: ['VLESS + Trojan', 'بدون فرگمنت', 'خروجی ترکیه'],
    recommended: false,
    nodeScope: 'all',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 5,
    startOnFirstUse: true,
    poolCountries: 'TR,DE',
    poolCount: 8,
    configOverrides: {
      ev: 'yes',
      et: 'yes',
      ex: 'no',
      es: 'no',
      fp: 'chrome',
      frag: 'no',
      fragmentPreset: 'off',
      fragmentLength: '50-100',
      fragmentInterval: '5-10',
      fragmentPackets: 'tlshello',
      ech: 'no',
      dkby: 'no',
      epd: 'yes',
      epi: 'yes',
      egi: 'yes',
      ena: 'yes',
      ipv4: 'yes',
      ipv6: 'yes',
      sb: 'yes',
      sbRegion: 'TR',
      ipRotation: 'off',
      tcp: 'yes',
      udp: 'yes'
    }
  },
  'international': {
    id: 'international',
    title: 'بین‌المللی — بدون فرگمنت',
    subtitle: 'اینترنت بدون محدودیت · سرعت حداکثری',
    badges: ['بدون فرگمنت', 'WARP MASQUE', 'خروجی مستقیم'],
    recommended: false,
    nodeScope: 'all',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 6,
    startOnFirstUse: true,
    poolCountries: 'US,DE,GB,NL',
    poolCount: 8,
    configOverrides: {
      ev: 'yes',
      et: 'yes',
      ex: 'no',
      es: 'no',
      fp: 'safari',
      alpn: 'h2,http/1.1',
      frag: 'no',
      fragmentPreset: 'off',
      ech: 'no',
      dkby: 'no',
      epd: 'yes',
      epi: 'no',
      egi: 'yes',
      ena: 'yes',
      ipv4: 'yes',
      ipv6: 'yes',
      sb: 'no',
      sbRegion: 'US',
      ipRotation: 'off',
      warpMasque: 'yes',
      warpMasqueCount: '2',
      tcp: 'yes',
      udp: 'yes'
    }
  },
  'multi-location': {
    id: 'multi-location',
    title: 'چند لوکیشن — فقط نودهای لبه و VIP',
    subtitle: 'لوکیشن‌های تفکیک‌شده آلمان، هلند، آمریکا و...',
    badges: ['۶ کشور از مخزن', 'VLESS + Trojan + SS', 'WARP چندلوکیشن'],
    recommended: false,
    nodeScope: 'all',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 4,
    startOnFirstUse: true,
    poolCountries: 'DE,NL,US,TR,FR,GB',
    poolCount: 12,
    configOverrides: {
      ev: 'yes',
      et: 'yes',
      ex: 'no',
      es: 'yes',
      fp: 'firefox',
      frag: 'no',
      fragmentPreset: 'off',
      fragmentLength: '20-50',
      fragmentInterval: '10-20',
      fragmentPackets: 'tlshello',
      ech: 'no',
      dkby: 'no',
      epd: 'yes',
      epi: 'yes',
      egi: 'yes',
      ena: 'yes',
      ipv4: 'yes',
      ipv6: 'yes',
      sb: 'yes',
      sbRegion: 'DE',
      ipRotation: '15m',
      warp: 'yes',
      warpMl: 'yes',
      warpCount: '6',
      tcp: 'yes',
      udp: 'yes'
    }
  },
  'direct-only': {
    id: 'direct-only',
    title: 'فقط سرور اصلی (بدون CDN)',
    subtitle: 'وقتی مسیر CDN مشکل دارد یا تست خود سرور',
    badges: ['فقط نود سرور اصلی', 'بدون لوکیشن', 'بدون فرگمنت'],
    recommended: false,
    nodeScope: 'origin',
    subNodeCount: 100,
    dataLimitGb: 0,
    expireDays: 0,
    ipLimit: 50,
    startOnFirstUse: true,
    configOverrides: {
      ev: 'yes',
      ena: 'yes',
      epd: 'no',
      epi: 'no',
      egi: 'no',
      ech: 'no',
      frag: 'no',
      fragmentPreset: 'off',
      yxby: 'yes'
    }
  }
};

export function buildUserDefaultConfig(basePanelConfig = {}, presetId = 'iran-fast', customOverrides = {}) {
  const preset = USER_PRESETS[presetId] || USER_PRESETS['iran-fast'];
  return normalizeEffectiveConfig({
    ...CONFIG_DEFAULTS,
    ...(basePanelConfig || {}),
    ...(preset.configOverrides || {}),
    subNodeCount: 100, // تعداد کانفیگ دستی نیست؛ موتور cfnew خودش همهٔ آدرس‌ها را می‌سازد
    ...(customOverrides || {})
  });
}
