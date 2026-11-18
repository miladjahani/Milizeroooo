// ============================================================================
// miliconfig v3.6 - صفحهٔ وضعیت ساده و سریع
// فقط چهار لینک اشتراک اصلی + خلاصهٔ مصرف؛ بدون تب، لیست کلاینت و افکت سه‌بعدی
// ============================================================================

import { BRAND_NAME, BRAND_UPPER } from '../config/defaults.js';
import { FAVICON_DATA_URI, SHIELD_LOGO_SVG, icon, stripEmoji } from './icons.js';
import { formatBytes, escapeHtml } from '../core/utils.js';

export function renderUserStatusPageHtml(user, nodes = [], originUrl = '') {
  const urlObj = new URL(originUrl || 'https://miliconfig.workers.dev');
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
  const subToken = user.subKey || user.username || user.id || '';
  const baseSubUrl = `${baseUrl}/sub/${encodeURIComponent(subToken)}`;
  const usageApiUrl = `${baseUrl}/api/status/${encodeURIComponent(subToken)}`;
  const statusUrl = `${baseUrl}/status/${encodeURIComponent(subToken)}`;
  const totalNodes = nodes.length;

  const usedBytes = Number(user.usedBytes || 0);
  const limitGb = Number(user.dataLimitGb || 0);
  const limitBytes = limitGb > 0 ? limitGb * 1073741824 : 0;
  const usagePercent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const usageMeta = limitGb > 0
    ? `${formatBytes(usedBytes)} از ${limitGb} GB`
    : `${formatBytes(usedBytes)} مصرف‌شده`;

  let expireLabel = 'بدون انقضا';
  if (user.expireAt > 0) {
    const diffDays = Math.ceil((user.expireAt - Date.now()) / 86400000);
    expireLabel = diffDays > 0 ? `${diffDays} روز باقی‌مانده` : 'منقضی شده';
  } else if (user.startOnFirstUse && user.expireDays > 0) {
    expireLabel = `${user.expireDays} روز (از اولین اتصال)`;
  }

  // دقیقاً چهار لینک؛ هر لینک یک خروجی مستقل و قابل استفاده در کلاینت‌های رایج است.
  const shareLinks = [
    {
      title: 'ساب‌لینک معمولی',
      badge: 'BASE64',
      icon: 'link',
      desc: 'برای v2rayNG، NekoBox، Shadowrocket و بیشتر کلاینت‌ها',
      url: baseSubUrl
    },
    {
      title: 'Clash / Mihomo',
      badge: 'YAML',
      icon: 'layers',
      desc: 'پروفایل کامل Clash Meta، Mihomo و Stash',
      url: `${baseSubUrl}?target=clash`
    },
    {
      title: 'Sing-box (JSON)',
      badge: 'JSON',
      icon: 'api',
      desc: 'خروجی JSON سبک برای کلاینت‌های سازگار sing-box و NekoBox',
      url: `${baseSubUrl}?target=singbox`
    },
    {
      title: 'لینک‌های خام',
      badge: 'RAW',
      icon: 'terminal',
      desc: 'متن سادهٔ کانفیگ‌ها برای واردکردن دستی یا ابزارهای دلخواه',
      url: `${baseSubUrl}?target=raw`
    }
  ];

  const safeUsername = escapeHtml(user.username || 'کاربر');
  const statusLabel = user.enabled
    ? (user.startOnFirstUse && !user.firstConnectedAt ? 'شروع با اولین اتصال' : 'فعال و آنلاین')
    : 'غیرفعال';

  return stripEmoji(`<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="neon">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark light">
  <title>وضعیت اشتراک ${safeUsername} — ${BRAND_UPPER}</title>
  <link rel="icon" href="${FAVICON_DATA_URI}">
  <script>
    // پوستهٔ ذخیره‌شدهٔ پنل بدون درخواست اضافه اعمال می‌شود.
    (function () {
      try {
        var skins = ['zedsecure', 'aurora', 'neon', 'tokyo', 'solar', 'ember', 'moss', 'clay', 'emerald', 'cyan', 'violet', 'amber', 'rose'];
        var skin = localStorage.getItem('mili_skin') || 'neon';
        var light = localStorage.getItem('mili_theme') === 'light';
        if (skins.indexOf(skin) < 0) skin = 'neon';
        document.documentElement.setAttribute('data-theme', light ? 'light' : skin);
        if (light) document.documentElement.classList.add('light-mode');
      } catch (e) {}
    })();
  </script>
  <style>
    :root {
      --bg: #05080a;
      --panel: #09100d;
      --panel-2: #0c1511;
      --line: rgba(181, 255, 77, 0.14);
      --line-strong: rgba(181, 255, 77, 0.4);
      --neon: #b5ff4d;
      --neon-rgb: 181, 255, 77;
      --info: #63e6d4;
      --danger: #ff6262;
      --text: #e9f3e2;
      --muted: #8b9a86;
      --muted-2: #61705d;
      --radius: 18px;
      --font: "Vazirmatn", "Segoe UI", Tahoma, system-ui, sans-serif;
      --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
      color-scheme: dark;
    }
    html[data-theme="zedsecure"] {
      --bg: #0c0914; --panel: #181326; --panel-2: #1f1931;
      --line: rgba(208, 188, 255, 0.16); --line-strong: rgba(208, 188, 255, 0.44);
      --neon: #d0bcff; --neon-rgb: 208, 188, 255; --info: #f48fb1;
      --text: #f4effa; --muted: #a99eb8; --muted-2: #766b85; --radius: 24px;
    }
    html[data-theme="aurora"] {
      --bg: #000000; --panel: #07110f; --panel-2: #0a1815;
      --line: rgba(45, 212, 191, 0.18); --line-strong: rgba(45, 212, 191, 0.46);
      --neon: #2dd4bf; --neon-rgb: 45, 212, 191; --info: #818cf8;
      --text: #ecfdf5; --muted: #82a89e; --muted-2: #52736a; --radius: 22px;
    }
    html[data-theme="tokyo"] {
      --bg: #070913; --panel: #0e1326; --panel-2: #131a33;
      --line: rgba(122, 162, 247, 0.18); --line-strong: rgba(122, 162, 247, 0.46);
      --neon: #7aa2f7; --neon-rgb: 122, 162, 247; --info: #bb9af7;
      --text: #e6eefc; --muted: #8b9bb8; --muted-2: #5d6c89; --radius: 12px;
    }
    html[data-theme="solar"] {
      --bg: #0c0902; --panel: #1a1406; --panel-2: #241b08;
      --line: rgba(250, 204, 21, 0.18); --line-strong: rgba(250, 204, 21, 0.45);
      --neon: #facc15; --neon-rgb: 250, 204, 21; --info: #fb923c;
      --text: #fef9c3; --muted: #b8a978; --muted-2: #85774a; --radius: 24px;
    }
    html[data-theme="ember"] {
      --bg: #0d0603; --panel: #1b0d07; --panel-2: #25120a;
      --line: rgba(251, 146, 60, 0.18); --line-strong: rgba(251, 146, 60, 0.45);
      --neon: #fb923c; --neon-rgb: 251, 146, 60; --info: #f43f5e;
      --text: #ffedd5; --muted: #b58d76; --muted-2: #825e4a; --radius: 10px;
    }
    html[data-theme="moss"] {
      --bg: #040c08; --panel: #0a1a12; --panel-2: #0e2218;
      --line: rgba(52, 211, 153, 0.18); --line-strong: rgba(52, 211, 153, 0.44);
      --neon: #34d399; --neon-rgb: 52, 211, 153; --info: #a3e635;
      --text: #ecfdf5; --muted: #84a999; --muted-2: #56786a; --radius: 22px;
    }
    html[data-theme="clay"] {
      --bg: #0f0907; --panel: #1d1310; --panel-2: #261914;
      --line: rgba(224, 142, 109, 0.18); --line-strong: rgba(224, 142, 109, 0.44);
      --neon: #e08e6d; --neon-rgb: 224, 142, 109; --info: #f4a261;
      --text: #fbebe4; --muted: #b3978c; --muted-2: #7d645b; --radius: 24px;
    }
    html[data-theme="emerald"] {
      --bg: #010a06; --panel: #04180f; --panel-2: #061f14;
      --line: rgba(43, 255, 158, 0.15); --line-strong: rgba(43, 255, 158, 0.42);
      --neon: #2bff9e; --neon-rgb: 43, 255, 158; --info: #5cffd6;
      --text: #e4fff4; --muted: #83ab9a; --muted-2: #5a7a6a; --radius: 24px;
    }
    html[data-theme="cyan"] {
      --bg: #040b10; --panel: #061219; --panel-2: #081820;
      --line: rgba(57, 230, 255, 0.15); --line-strong: rgba(57, 230, 255, 0.4);
      --neon: #39e6ff; --neon-rgb: 57, 230, 255; --info: #8b7bff;
      --text: #e2f6fc; --muted: #7b98a5; --muted-2: #55707c; --radius: 22px;
    }
    html[data-theme="violet"] {
      --bg: #080611; --panel: #100c1b; --panel-2: #161024;
      --line: rgba(179, 136, 255, 0.17); --line-strong: rgba(179, 136, 255, 0.44);
      --neon: #b388ff; --neon-rgb: 179, 136, 255; --info: #58d8ff;
      --text: #efe9ff; --muted: #9489ad; --muted-2: #6c6185; --radius: 10px;
    }
    html[data-theme="amber"] {
      --bg: #0b0803; --panel: #181208; --panel-2: #20180a;
      --line: rgba(255, 176, 32, 0.17); --line-strong: rgba(255, 176, 32, 0.44);
      --neon: #ffb020; --neon-rgb: 255, 176, 32; --info: #ff7a59;
      --text: #fdf1dc; --muted: #b09a7a; --muted-2: #836f55; --radius: 8px;
    }
    html[data-theme="rose"] {
      --bg: #0c0508; --panel: #1a0a11; --panel-2: #230d16;
      --line: rgba(255, 84, 112, 0.17); --line-strong: rgba(255, 84, 112, 0.44);
      --neon: #ff5470; --neon-rgb: 255, 84, 112; --info: #ff9f6e;
      --text: #ffe8ee; --muted: #b1899a; --muted-2: #855f70; --radius: 24px;
    }
    html.light-mode {
      --bg: #eef3f0; --panel: #ffffff; --panel-2: #f5faf7;
      --line: rgba(6, 118, 71, 0.16); --line-strong: rgba(6, 118, 71, 0.38);
      --neon: #0b8a4b; --neon-rgb: 11, 138, 75; --info: #0284c7;
      --text: #0c1a12; --muted: #5a6d60; --muted-2: #7a8b7f; --radius: 16px;
      color-scheme: light;
    }
    * { box-sizing: border-box; }
    .mi { width: 16px; height: 16px; display: inline-block; vertical-align: -3px; flex: none; }
    html, body { margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      padding: clamp(12px, 2.5vw, 26px) 14px 36px;
      color: var(--text);
      font-family: var(--font);
      background:
        radial-gradient(760px 420px at 84% -10%, rgba(var(--neon-rgb), 0.13), transparent 66%),
        linear-gradient(180deg, var(--panel-2), var(--bg) 38%);
      -webkit-font-smoothing: antialiased;
    }
    .shell { width: min(860px, 100%); margin: 0 auto; display: grid; gap: 13px; }
    .card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--panel);
    }
    .head-card { padding: clamp(16px, 3vw, 24px); }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .brand-block { display: flex; align-items: center; gap: 11px; min-width: 0; }
    .brand-block .mili-shield-svg { width: 48px; height: 48px; flex: none; }
    .brand-name { color: var(--neon); font-family: var(--mono); font-size: 0.66rem; font-weight: 800; letter-spacing: 0.15em; direction: ltr; }
    .brand-sub { margin-top: 2px; color: var(--muted); font-size: 0.7rem; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 7px 11px; border: 1px solid rgba(var(--neon-rgb), 0.32);
      border-radius: 999px; background: rgba(var(--neon-rgb), 0.08);
      color: var(--neon); font-size: 0.71rem; font-weight: 700;
    }
    .status-pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .status-pill.is-off { border-color: rgba(255, 98, 98, 0.36); background: rgba(255, 98, 98, 0.08); color: var(--danger); }
    .user-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
    .eyebrow { color: var(--muted); font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.13em; }
    h1 { margin: 4px 0 0; font-size: clamp(1.55rem, 5.2vw, 2.3rem); line-height: 1.15; letter-spacing: -0.04em; }
    .hint { max-width: 52ch; margin: 6px 0 0; color: var(--muted); font-size: 0.76rem; line-height: 1.8; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
    .summary-item { min-width: 0; padding: 10px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--panel-2); }
    .summary-item span { display: block; color: var(--muted); font-size: 0.64rem; }
    .summary-item b { display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; }
    .usage { margin-top: 13px; }
    .usage-head, .usage-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; color: var(--muted); font-size: 0.66rem; }
    .usage-head b { color: var(--text); font-size: 0.72rem; }
    .track { height: 7px; margin: 7px 0 6px; overflow: hidden; border-radius: 99px; background: rgba(var(--neon-rgb), 0.1); }
    .track i { display: block; height: 100%; min-width: 2px; border-radius: inherit; background: var(--neon); }
    .section-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 3px 0; }
    .section-title h2 { display: inline-flex; align-items: center; gap: 7px; margin: 0; font-size: 0.94rem; }
    .section-title h2 .mi { color: var(--neon); width: 17px; height: 17px; }
    .section-title small { color: var(--muted); font-size: 0.67rem; }
    .link-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .link-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 14px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); }
    .link-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .link-icon { display: inline-flex; align-items: center; justify-content: center; width: 31px; height: 31px; border-radius: 9px; background: rgba(var(--neon-rgb), 0.1); color: var(--neon); }
    .link-icon .mi { width: 16px; height: 16px; }
    .badge { padding: 4px 7px; border: 1px solid var(--line); border-radius: 7px; color: var(--muted); font-family: var(--mono); font-size: 0.57rem; font-weight: 700; direction: ltr; }
    .link-card h3 { margin: 0; font-size: 0.86rem; }
    .link-card p { min-height: 2.7em; margin: 0; color: var(--muted); font-size: 0.68rem; line-height: 1.7; }
    .link-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      min-height: 36px; padding: 7px 11px;
      border: 1px solid var(--line); border-radius: 10px;
      background: transparent; color: var(--text);
      font-family: inherit; font-size: 0.7rem; font-weight: 700;
      text-decoration: none; cursor: pointer; white-space: nowrap;
    }
    .btn:hover { border-color: var(--line-strong); background: rgba(var(--neon-rgb), 0.07); }
    .btn.primary { border-color: rgba(var(--neon-rgb), 0.34); background: rgba(var(--neon-rgb), 0.1); color: var(--neon); }
    .btn .mi { width: 13px; height: 13px; }
    .foot-card { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding: 11px 13px; }
    .foot-actions { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .foot-note { color: var(--muted-2); font-size: 0.64rem; }
    .toast {
      position: fixed; z-index: 20; top: 14px; left: 50%;
      display: none; transform: translateX(-50%);
      padding: 8px 15px; border: 1px solid var(--line-strong);
      border-radius: 999px; background: var(--panel); color: var(--neon);
      font-size: 0.74rem; font-weight: 700;
    }
    .toast.show { display: block; }
    @media (max-width: 620px) {
      .summary { grid-template-columns: 1fr 1fr; }
      .summary-item:last-child { grid-column: 1 / -1; }
      .link-grid { grid-template-columns: 1fr; }
      .status-pill { font-size: 0.67rem; }
      .link-actions .btn { flex: 1 1 auto; }
    }
  </style>
</head>
<body>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <main class="shell">
    <header class="card head-card">
      <div class="topbar">
        <div class="brand-block">
          <span>${SHIELD_LOGO_SVG}</span>
          <div>
            <div class="brand-name">${BRAND_UPPER} / ACCESS</div>
            <div class="brand-sub">${BRAND_NAME} · وضعیت اختصاصی شما</div>
          </div>
        </div>
        <span class="status-pill ${user.enabled ? '' : 'is-off'}" id="statusPill"><span id="statusText">${statusLabel}</span></span>
      </div>

      <div class="user-row">
        <div>
          <span class="eyebrow">SUBSCRIPTION STATUS</span>
          <h1>${safeUsername}</h1>
          <p class="hint">چهار لینک آماده برای اتصال؛ فقط لینک مناسب کلاینت خود را کپی کنید.</p>
        </div>
      </div>

      <div class="summary">
        <div class="summary-item"><span>مصرف فعلی</span><b class="mono" id="statUsed">${formatBytes(usedBytes)}</b></div>
        <div class="summary-item"><span>وضعیت انقضا</span><b id="statExpire">${expireLabel}</b></div>
        <div class="summary-item"><span>نودهای اشتراک</span><b id="statNodes">${totalNodes} نود</b></div>
      </div>

      <div class="usage">
        <div class="usage-head"><b>پهنای باند</b><span id="usageUpdated">در حال همگام‌سازی…</span></div>
        <div class="track" aria-hidden="true"><i id="usageBar" style="width:${usagePercent}%"></i></div>
        <div class="usage-meta"><span id="usageMeta">${usageMeta}</span><span id="statLimit">${limitGb > 0 ? `${limitGb} GB (${usagePercent}%)` : '∞ نامحدود'}</span></div>
      </div>
    </header>

    <div class="section-title">
      <h2>${icon('link')} لینک‌های اشتراک</h2>
      <small>۴ لینک اصلی</small>
    </div>

    <section class="link-grid" aria-label="لینک‌های اشتراک">
      ${shareLinks.map(link => `
      <article class="card link-card">
        <div class="link-top">
          <span class="link-icon">${icon(link.icon)}</span>
          <span class="badge">${link.badge}</span>
        </div>
        <h3>${link.title}</h3>
        <p>${link.desc}</p>
        <div class="link-actions">
          <button class="btn primary" type="button" onclick="copyText('${link.url}', 'لینک ${link.title} کپی شد')">${icon('copy')} کپی لینک</button>
          <a class="btn" href="${link.url}" target="_blank" rel="noopener">${icon('external')} باز کردن</a>
        </div>
      </article>`).join('')}
    </section>

    <footer class="card foot-card">
      <div class="foot-actions">
        <button class="btn" type="button" onclick="downloadUserBackup()">${icon('download')} بکاپ اطلاعات من</button>
        <button class="btn" type="button" onclick="copyText('${statusUrl}', 'لینک صفحهٔ وضعیت کپی شد')">${icon('link')} کپی لینک وضعیت</button>
        <button class="btn" type="button" onclick="window.location.reload()">${icon('refresh')} بروزرسانی</button>
      </div>
      <span class="foot-note">${icon('shield')} اتصال امن · ${BRAND_NAME}</span>
    </footer>
  </main>

  <script>
    function showToast(msg) {
      var t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(window._toastTimer);
      window._toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2400);
    }

    function copyText(text, msg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { showToast(msg || 'کپی شد'); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(msg || 'کپی شد');
      }
    }

    // دانلود مستقیم با بررسی وضعیت پاسخ؛ فایل خراب در صورت خطا ذخیره نمی‌شود.
    function downloadFileUrl(url, fallbackName) {
      var fileName = String(fallbackName || 'download');
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var abortTimer = controller ? setTimeout(function() { controller.abort(); }, 120000) : null;
      fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      })
        .then(function(res) {
          if (!res.ok) {
            return res.text().then(function(text) {
              var msg = String(text || '').trim();
              try {
                var parsed = JSON.parse(msg);
                msg = parsed.message || parsed.error || msg;
              } catch (_e) {}
              throw new Error(msg || ('HTTP ' + res.status));
            });
          }
          var disposition = res.headers.get('Content-Disposition') || '';
          var matched = /filename="?([^";]+)"?/i.exec(disposition);
          if (matched && matched[1]) fileName = matched[1];
          return res.blob().then(function(blob) {
            var blobUrl = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            a.style.display = 'none';
            a.rel = 'noopener';
            a.setAttribute('data-direct-download', '1');
            document.body.appendChild(a);
            a.click();
            setTimeout(function() { if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
            setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 120000);
            showToast('دانلود شروع شد');
          });
        })
        .catch(function(err) {
          var reason = err && err.name === 'AbortError'
            ? 'زمان دانلود تمام شد؛ دوباره تلاش کنید'
            : (err && err.message ? err.message : 'خطای شبکه');
          showToast('دانلود ناموفق بود: ' + reason);
        })
        .finally(function() { if (abortTimer) clearTimeout(abortTimer); });
    }

    function downloadUserBackup() {
      downloadFileUrl('${usageApiUrl}/backup?backup=1&t=' + Date.now(), 'miliconfig-user-backup.json');
    }

    document.addEventListener('click', function(event) {
      var downloadLink = event.target.closest ? event.target.closest('a[download][href]') : null;
      if (!downloadLink) return;
      if (downloadLink.hasAttribute('data-direct-download')) return;
      if (downloadLink.origin !== window.location.origin) return;
      event.preventDefault();
      downloadFileUrl(downloadLink.href, downloadLink.getAttribute('download') || '');
    });

    function fmtBytesClient(bytes) {
      var n = Number(bytes || 0);
      if (n <= 0) return '0 B';
      var units = ['B', 'KB', 'MB', 'GB', 'TB'];
      var i = Math.floor(Math.log(n) / Math.log(1024));
      if (i < 0) i = 0;
      if (i > units.length - 1) i = units.length - 1;
      return (n / Math.pow(1024, i)).toFixed(i >= 3 ? 2 : 1) + ' ' + units[i];
    }

    function refreshUsage() {
      fetch('${usageApiUrl}?t=' + Date.now(), { cache: 'no-store' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (!data || !data.success || !data.user) return;
          var u = data.user;
          var used = Number(u.usedBytes || 0);
          var limitGb = Number(u.dataLimitGb || 0);
          var limitBytes = limitGb > 0 ? limitGb * 1073741824 : 0;
          var pct = limitBytes > 0 ? Math.min(100, Math.round((used / limitBytes) * 100)) : 0;
          var usedEl = document.getElementById('statUsed');
          if (usedEl) usedEl.textContent = fmtBytesClient(used);
          var limitEl = document.getElementById('statLimit');
          if (limitEl) limitEl.textContent = limitGb > 0 ? (limitGb + ' GB (' + pct + '%)') : '∞ نامحدود';
          var nodesEl = document.getElementById('statNodes');
          if (nodesEl) nodesEl.textContent = (data.nodeCount || 0) + ' نود';
          var bar = document.getElementById('usageBar');
          if (bar) bar.style.width = Math.max(pct, used > 0 ? 2 : 0) + '%';
          var reqs = Number(u.requestCount || 0);
          var meta = document.getElementById('usageMeta');
          if (meta) meta.textContent = (limitGb > 0 ? (fmtBytesClient(used) + ' از ' + limitGb + ' GB') : (fmtBytesClient(used) + ' مصرف‌شده')) + ' · ' + reqs.toLocaleString('fa-IR') + ' درخواست';
          var expEl = document.getElementById('statExpire');
          if (expEl) {
            if (u.expireAt > 0) {
              var days = Math.ceil((u.expireAt - Date.now()) / 86400000);
              expEl.textContent = days > 0 ? (days + ' روز باقی‌مانده') : 'منقضی شده';
            } else {
              expEl.textContent = 'بدون انقضا';
            }
          }
          var pill = document.getElementById('statusPill');
          var pillText = document.getElementById('statusText');
          if (pill) pill.classList.toggle('is-off', !u.enabled);
          if (pillText) {
            pillText.textContent = u.enabled
              ? ((u.startOnFirstUse && !u.firstConnectedAt) ? 'شروع با اولین اتصال' : 'فعال و آنلاین')
              : 'غیرفعال';
          }
          var upd = document.getElementById('usageUpdated');
          if (upd) upd.textContent = 'آخرین بروزرسانی: ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        })
        .catch(function() {});
    }

    refreshUsage();
    setInterval(refreshUsage, 15000);
  </script>
</body>
</html>`);
}
