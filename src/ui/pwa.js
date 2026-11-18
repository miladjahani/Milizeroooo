// ============================================================================
// miliconfig v3.5.2 - لایهٔ نصب اپ (PWA)
// سه چیز را فراهم می‌کند: manifest، سرویس‌ورکر و آیکون مستقل.
// با همین‌ها پنل هم روی دسکتاپ (Chrome/Edge) و هم روی گوشی نصب‌شدنی می‌شود و
// در حالت standalone (بدون نوار آدرس) اجرا می‌شود.
// ============================================================================

import { BRAND_NAME, VERSION } from '../config/defaults.js';
import { PWA_ICON_192_BASE64, PWA_ICON_512_BASE64 } from './pwaIconsData.js';

const THEME_BG = '#05080a';
const ICON_192_PATH = '/icons/pwa-192-v3.png';
const ICON_512_PATH = '/icons/pwa-512-v3.png';

// آیکون ایستای اپ: سپر نئون با حرف M، هم‌خوان با لوگوی پنل و صفحهٔ وضعیت
export const PWA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="512" height="512">
  <rect width="128" height="128" fill="${THEME_BG}"/>
  <circle cx="64" cy="64" r="55" fill="#030a05" stroke="#1f6b38" stroke-width="2"/>
  <circle cx="64" cy="64" r="46" fill="none" stroke="#39ff88" stroke-opacity="0.16" stroke-width="3"/>
  <path d="M64 20 101 33V61C101 83.5 86.5 99.3 64 108.5 41.5 99.3 27 83.5 27 61V33L64 20Z" fill="#0a351b" fill-opacity="0.55" stroke="#2ff27f" stroke-opacity="0.2" stroke-width="11" stroke-linejoin="round"/>
  <path d="M64 20 101 33V61C101 83.5 86.5 99.3 64 108.5 41.5 99.3 27 83.5 27 61V33L64 20Z" stroke="#4bff92" stroke-width="5" stroke-linejoin="round"/>
  <path d="M44 78V52L64 67 84 52V78" stroke="#2ff27f" stroke-opacity="0.22" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M44 78V52L64 67 84 52V78" stroke="#63ff9b" stroke-width="9.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const MANIFEST = {
  name: `${BRAND_NAME}OS`,
  short_name: BRAND_NAME,
  description: 'مرکز کنترل اتصال و کانفیگ',
  lang: 'fa',
  dir: 'rtl',
  // اپ نصب‌شده باید مستقیم به درگاه ورود/پنل برود؛ ریشهٔ عمومی برای استتار می‌ماند.
  // id را روی / نگه می‌داریم تا نصب‌های قبلی همان اپ شناخته شوند.
  id: '/',
  start_url: '/login',
  scope: '/',
  display: 'standalone',
  display_override: ['standalone', 'minimal-ui'],
  orientation: 'portrait-primary',
  background_color: THEME_BG,
  theme_color: THEME_BG,
  version: String(VERSION).replace(/^v/i, ''),
  // آیکون‌های PNG واقعی با URL تازه: iOS برای صفحهٔ اصلی SVG را نمی‌پذیرد و
  // مرورگر/سیستم آیکون قبلی را با همان URL قدیمی کش می‌کند.
  icons: [
    { src: ICON_192_PATH, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: ICON_512_PATH, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: ICON_512_PATH, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};

// سرویس‌ورکر عمداً هیچ صفحه‌ای را کش نمی‌کند: پنل پویاست و کش کهنه باعث
// نمایش نسخهٔ قدیمی می‌شود. فقط شرط نصب‌پذیری و کنترل پنجره را فراهم می‌کند.
export const PWA_SW_JS = `/* ${BRAND_NAME}OS service worker */
self.addEventListener('install', function (event) { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil((self.clients && self.clients.claim) ? self.clients.claim() : Promise.resolve());
});
self.addEventListener('fetch', function () {});
`;

// تکه‌های head برای صفحات پنل/ورود/وضعیت
export const PWA_HEAD_TAGS = `<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="${THEME_BG}">
<meta name="application-name" content="${BRAND_NAME}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${BRAND_NAME}">
<link rel="apple-touch-icon" href="${ICON_192_PATH}">
<link rel="icon" type="image/png" sizes="192x192" href="${ICON_192_PATH}">`;

// اسکریپت سمت کلاینت (بدون بک‌اسلش تا از لایهٔ unescape سالم بیرون بیاید)
export const PWA_CLIENT_JS = `(function () {
  try {
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    }
  } catch (e) {}
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.miliInstallPrompt = e;
    var btn = document.getElementById('installBtn');
    if (btn) { btn.classList.add('is-ready'); btn.removeAttribute('hidden'); }
  });
  window.addEventListener('appinstalled', function () {
    window.miliInstallPrompt = null;
    var btn = document.getElementById('installBtn');
    if (btn) btn.classList.remove('is-ready');
  });
})();`;

export function pwaManifestResponse() {
  return new Response(JSON.stringify(MANIFEST), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      // مانیفست کوچک است و باید آیکون‌های تازه را بدون کش کهنه نشان دهد.
      'Cache-Control': 'no-cache'
    }
  });
}

export function pwaServiceWorkerResponse() {
  return new Response(PWA_SW_JS, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    }
  });
}

function pwaIconBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const PWA_ICON_FILES = {
  [ICON_192_PATH]: PWA_ICON_192_BASE64,
  [ICON_512_PATH]: PWA_ICON_512_BASE64
};

export function pwaIconResponse(pathname = '/pwa-icon.svg') {
  const png = PWA_ICON_FILES[pathname];
  if (png) {
    return new Response(pwaIconBytes(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        // نام فایل نسخه‌دار است؛ می‌تواند برای همیشه در کش بماند.
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  }
  if (pathname !== '/pwa-icon.svg') return null;
  return new Response(PWA_ICON_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // نصب‌های قدیمی ممکن است هنوز همین مسیر را بخواهند؛ کش نکنید تا سبز تازه بیاید.
      'Cache-Control': 'no-cache'
    }
  });
}
