// ============================================================================
// StudioDocs - static asset and Web Vitals monitor shell.
// The public root is documentation/monitoring only; the admin gate is opened
// exclusively by the Workspace Sign In button or by the server with directGate.
// ============================================================================

import { VERSION } from '../config/defaults.js';
import { FAVICON_DATA_URI } from './icons.js';
import { PWA_CLIENT_JS, PWA_HEAD_TAGS } from './pwa.js';

const I18N = {
  fa: {
    dir: 'rtl',
    lang: 'فارسی',
    switchLang: 'English',
    loginTitle: 'ورود به مرکز مدیریت',
    setupTitle: 'راه‌اندازی اولیه',
    loginSub: 'درگاه امن مدیر به مرکز کنترل',
    setupSub: 'تعیین رمز عبور مدیر برای اولین اجرا',
    password: 'رمز عبور پنل مدیریت',
    passwordPh: 'رمز عبور خود را وارد کنید...',
    newPassword: 'رمز عبور جدید (حداقل ۴ کاراکتر)',
    confirmPassword: 'تکرار رمز عبور',
    loginBtn: 'ورود به مرکز مدیریت',
    setupBtn: 'ذخیره رمز و راه‌اندازی پنل',
    working: 'در حال بررسی...',
    recovery: 'فراموشی رمز؟ بازیابی با UUID',
    setupDone: 'پنل با موفقیت راه‌اندازی شد',
    setupDoneHint: 'شناسه رندوم مدیریت شما (برای بازیابی رمز نگه دارید) — نیازی به وارد کردن آن نیست:',
    copyId: 'کپی شناسه',
    goPanel: 'ورود به صفحه مدیریت',
    idCopied: 'کپی شد',
    recoveryTitle: 'بازیابی رمز با UUID مدیر',
    recoveryHint: 'مسیر مدیریت (UUID) را وارد کنید؛ مالکیت این مسیر یعنی دسترسی مدیر.',
    uuidLabel: 'UUID / مسیر مدیریت',
    uuidPh: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    recoverBtn: 'بازیابی رمز',
    back: 'بازگشت به ورود',
    themeLight: 'حالت روز',
    themeDark: 'حالت شب',
    errWrong: 'رمز عبور وارد شده اشتباه است.',
    errMismatch: 'رمزهای عبور یکسان نیستند.',
    errShort: 'رمز عبور باید حداقل ۴ کاراکتر باشد.',
    errNetwork: 'خطای شبکه در برقراری ارتباط',
    errUuid: 'UUID/مسیر مدیریت نامعتبر است.',
    errFill: 'همه فیلدها را کامل کنید.'
  },
  en: {
    dir: 'ltr',
    lang: 'English',
    switchLang: 'فارسی',
    loginTitle: 'Admin Login',
    setupTitle: 'First Run Setup',
    loginSub: 'Secure gateway to the control center',
    setupSub: 'Set the admin password for the first run',
    password: 'Admin panel password',
    passwordPh: 'Enter your password...',
    newPassword: 'New password (min 4 characters)',
    confirmPassword: 'Confirm password',
    loginBtn: 'Sign in',
    setupBtn: 'Save password & launch',
    working: 'Checking...',
    recovery: 'Forgot password? Recover with UUID',
    setupDone: 'Panel is ready',
    setupDoneHint: 'Your random admin ID (keep it for password recovery) — you never need to type it:',
    copyId: 'Copy ID',
    goPanel: 'Open admin panel',
    idCopied: 'Copied',
    recoveryTitle: 'Recover password with admin UUID',
    recoveryHint: 'Enter the admin path (UUID). Owning this path proves admin access.',
    uuidLabel: 'UUID / admin path',
    uuidPh: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    recoverBtn: 'Recover password',
    back: 'Back to login',
    themeLight: 'Light mode',
    themeDark: 'Dark mode',
    errWrong: 'Incorrect password.',
    errMismatch: 'Passwords do not match.',
    errShort: 'Password must be at least 4 characters.',
    errNetwork: 'Network error while connecting',
    errUuid: 'Invalid admin UUID/path.',
    errFill: 'Please fill all fields.'
  }
};

function escapeLoginHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function gateMarkup({ initialized, storageWarning, directGate }) {
  return `
  <div class="gate${directGate ? ' is-visible' : ''}" id="gate" aria-hidden="${directGate ? 'false' : 'true'}" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
    <div class="gate-backdrop" data-close-gate="1"></div>
    <div class="card" id="card" dir="rtl">
      <div class="card-head">
        <span class="dots"><i></i><i></i><i></i></span>
        <div class="head-tools">
          <button class="mini-btn" type="button" id="langBtn">English</button>
          <button class="mini-btn" type="button" id="themeBtn">حالت روز</button>
          <button class="mini-btn gate-close" type="button" id="gateCloseBtn" data-close-gate="1" aria-label="بازگشت به مستندات">×</button>
        </div>
      </div>
      <div class="card-body">
        <div class="brand-line">
          <div class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 3v6c0 4.2-2.9 7.8-7 9-4.1-1.2-7-4.8-7-9V5z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <div>
            <div class="brand-name" id="gateTitle">StudioDocs Workspace</div>
            <div class="brand-sub" id="brandSub"></div>
          </div>
        </div>

        ${storageWarning ? `<div class="storage-warn" role="alert"><b>حالت موقت:</b> دیتابیس D1 به ورکر متصل نیست. رمز عبور، کاربران و نشست بعد از هر رفرش پاک می‌شوند و ساب‌لینک‌ها خطا می‌دهند. در Cloudflare → Worker → Settings → Bindings یک D1 database با نام <code>DB</code> متصل کنید.</div>` : ''}

        <div class="err" id="errBox" role="alert"></div>

        <form id="loginForm" class="${initialized ? '' : 'hidden'}" onsubmit="handleLogin(event)">
          <div class="field">
            <label id="lblPassword" for="pwdInput"></label>
            <input type="password" id="pwdInput" dir="ltr" autocomplete="current-password" required>
          </div>
          <button type="submit" class="cta" id="loginBtn"></button>
          <button type="button" class="ghost-link" id="recoverLink" onclick="showRecover()"></button>
        </form>

        <form id="setupForm" class="${initialized ? 'hidden' : ''}" onsubmit="handleSetup(event)">
          <div class="field">
            <label id="lblNewPassword" for="newPwd"></label>
            <input type="password" id="newPwd" dir="ltr" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label id="lblConfirmPassword" for="confirmPwd"></label>
            <input type="password" id="confirmPwd" dir="ltr" autocomplete="new-password" required>
          </div>
          <button type="submit" class="cta" id="setupBtn"></button>
        </form>

        <div id="doneCard" class="hidden">
          <div class="field">
            <label id="lblDone"></label>
            <div class="mono-id" id="doneId" dir="ltr"></div>
          </div>
          <button type="button" class="cta" id="goPanelBtn"></button>
          <button type="button" class="ghost-link" id="copyIdBtn"></button>
        </div>

        <form id="recoverForm" class="hidden" onsubmit="handleRecover(event)">
          <div class="field">
            <label id="lblUuid" for="recoverUuid"></label>
            <input type="text" id="recoverUuid" dir="ltr" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
          </div>
          <div class="field">
            <label id="lblRecoverPassword" for="recoverPwd"></label>
            <input type="password" id="recoverPwd" dir="ltr" autocomplete="new-password">
          </div>
          <button type="submit" class="cta" id="recoverBtn"></button>
          <button type="button" class="ghost-link" id="backLink" onclick="showLogin()"></button>
        </form>

        <div class="hint" id="hintBox"></div>
      </div>
    </div>
  </div>`;
}

export function renderLoginPage(host = '', options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const initialized = opts.initialized !== false;
  const recover = opts.recover === true;
  const directGate = opts.directGate === true;
  const storageWarning = opts.storageWarning === true;
  const hostLabel = escapeLoginHtml(String(host || 'studio-docs-app').trim() || 'studio-docs-app');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="theme-color" content="#080c0b">
<title>StudioDocs — Static Asset & Web Vitals Monitor</title>
<link rel="icon" href="${FAVICON_DATA_URI}">
${PWA_HEAD_TAGS}
<style>
  :root {
    --ink: #080c0b;
    --panel: #0d1412;
    --panel-2: #111b18;
    --line: rgba(184, 255, 106, 0.14);
    --line-strong: rgba(184, 255, 106, 0.32);
    --text: #e8f2e2;
    --muted: #92a596;
    --accent: #b8ff6a;
    --cyan: #64e3d1;
    --danger: #ff9b9b;
    --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 12% -8%, rgba(100, 227, 209, 0.11), transparent 34rem),
      radial-gradient(circle at 92% 8%, rgba(184, 255, 106, 0.09), transparent 30rem),
      var(--ink);
    color: var(--text);
    font-family: Inter, "Segoe UI", Tahoma, Arial, sans-serif;
    line-height: 1.65;
    overflow-x: hidden;
  }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; }
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid var(--line);
    background: rgba(8, 12, 11, 0.82);
    backdrop-filter: blur(18px);
  }
  .topbar-inner {
    width: min(1160px, calc(100% - 40px));
    margin: auto;
    min-height: 70px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .brand-lockup { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .brand-glyph {
    width: 36px; height: 36px; border-radius: 10px; flex: none;
    display: grid; place-items: center;
    border: 1px solid var(--line-strong);
    background: linear-gradient(145deg, rgba(184, 255, 106, 0.13), rgba(100, 227, 209, 0.06));
    color: var(--accent);
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 800;
  }
  .brand-name { font-weight: 800; letter-spacing: -0.02em; }
  .brand-sub { color: var(--muted); font-size: 0.72rem; margin-top: -2px; }
  .top-nav { display: flex; align-items: center; gap: 22px; font-size: 0.82rem; color: var(--muted); }
  .top-nav a:hover { color: var(--accent); }
  .signin {
    border: 1px solid var(--line-strong);
    background: rgba(184, 255, 106, 0.08);
    color: var(--accent);
    border-radius: 9px;
    padding: 8px 13px;
    cursor: pointer;
    font-weight: 700;
    transition: background 0.18s ease, transform 0.18s ease;
  }
  .signin:hover { background: rgba(184, 255, 106, 0.15); transform: translateY(-1px); }
  .layout { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }
  .hero { padding: 76px 0 42px; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr); gap: 48px; align-items: end; }
  .eyebrow { margin: 0 0 13px; color: var(--cyan); font: 700 0.7rem/1.4 var(--mono); letter-spacing: 0.16em; text-transform: uppercase; }
  h1 { margin: 0; font-size: clamp(2.3rem, 6vw, 4.7rem); line-height: 1.04; letter-spacing: -0.055em; max-width: 780px; }
  h1 span { color: var(--accent); }
  .hero-copy { color: var(--muted); max-width: 580px; margin: 22px 0 0; font-size: 1rem; }
  .hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
  .hero-actions .signin, .primary-link {
    padding: 10px 16px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.85rem;
  }
  .primary-link { background: var(--accent); color: #0b1408; border: 1px solid var(--accent); }
  .primary-link:hover { filter: brightness(1.06); }
  .hero-aside {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: linear-gradient(160deg, rgba(17, 27, 24, 0.94), rgba(10, 16, 14, 0.8));
    padding: 18px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.26);
  }
  .aside-label { display: flex; justify-content: space-between; color: var(--muted); font: 0.68rem var(--mono); margin-bottom: 13px; }
  .live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 14px var(--accent); margin-right: 6px; }
  .vitals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .vital { padding: 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(4, 8, 7, 0.36); }
  .vital b { display: block; font: 800 1.25rem/1.2 var(--mono); color: var(--accent); }
  .vital small { color: var(--muted); font-size: 0.65rem; }
  .vital.good b { color: var(--cyan); }
  .section { padding: 42px 0; border-top: 1px solid var(--line); }
  .section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; margin-bottom: 20px; }
  .section h2 { margin: 0; font-size: 1.05rem; letter-spacing: -0.02em; }
  .section-kicker { color: var(--muted); font: 0.66rem var(--mono); letter-spacing: 0.09em; text-transform: uppercase; }
  .monitor-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(260px, 0.75fr); gap: 16px; }
  .panel { border: 1px solid var(--line); border-radius: 13px; background: var(--panel); overflow: hidden; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 15px; border-bottom: 1px solid var(--line); color: var(--muted); font: 0.7rem var(--mono); }
  .chart { padding: 16px 15px 11px; }
  .chart-bars { height: 138px; display: flex; align-items: end; gap: 7px; border-bottom: 1px solid var(--line); padding: 0 2px 0; }
  .chart-bars i { flex: 1; min-width: 4px; display: block; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, var(--cyan), rgba(100, 227, 209, 0.16)); opacity: 0.8; }
  .chart-bars i:nth-child(3n) { background: linear-gradient(180deg, var(--accent), rgba(184, 255, 106, 0.12)); opacity: 0.9; }
  .chart-axis { display: flex; justify-content: space-between; color: var(--muted); font: 0.62rem var(--mono); padding-top: 7px; }
  .asset-list { list-style: none; margin: 0; padding: 11px 14px 13px; }
  .asset-list li { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed rgba(184, 255, 106, 0.1); color: var(--muted); font-size: 0.78rem; }
  .asset-list li:last-child { border-bottom: 0; }
  .asset-list b { color: var(--text); font-weight: 600; }
  .asset-list code { color: var(--accent); font: 0.72rem var(--mono); }
  .feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .feature { padding: 17px; border: 1px solid var(--line); border-radius: 12px; background: rgba(13, 20, 18, 0.72); }
  .feature-index { color: var(--cyan); font: 0.68rem var(--mono); }
  .feature h3 { margin: 10px 0 5px; font-size: 0.9rem; }
  .feature p { color: var(--muted); margin: 0; font-size: 0.78rem; }
  .docs-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.6fr); gap: 16px; }
  .quickstart { margin: 0; padding: 17px; border-radius: 12px; border: 1px solid var(--line); background: #060a09; color: #b8d7bd; font: 0.73rem/1.85 var(--mono); overflow-x: auto; }
  .quickstart .comment { color: #6e8b76; }
  .quickstart .cmd { color: var(--accent); }
  .quickstart .string { color: var(--cyan); }
  .docs-copy { color: var(--muted); font-size: 0.82rem; }
  .docs-copy h3 { color: var(--text); margin: 0 0 6px; font-size: 0.9rem; }
  .docs-copy p { margin: 0 0 12px; }
  .docs-copy a { color: var(--accent); border-bottom: 1px solid rgba(184, 255, 106, 0.28); }
  .footer { display: flex; justify-content: space-between; gap: 20px; padding: 22px 0 34px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.7rem; }
  .footer code { color: var(--cyan); font-family: var(--mono); }

  /* ---------- login overlay ---------- */
  .gate {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 22px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.28s ease, visibility 0s linear 0.28s;
  }
  .gate.is-visible { opacity: 1; visibility: visible; transition: opacity 0.28s ease, visibility 0s; }
  .gate-backdrop { position: absolute; inset: 0; background: rgba(3, 6, 5, 0.78); backdrop-filter: blur(14px); }
  .gate .card {
    position: relative;
    width: min(430px, 100%);
    max-height: calc(100vh - 44px);
    overflow: auto;
    border-radius: 18px;
    border: 1px solid var(--line-strong);
    background: rgba(10, 16, 13, 0.97);
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.65);
    color: var(--text);
    transform: translateY(12px) scale(0.98);
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gate.is-visible .card { transform: none; }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 15px; border-bottom: 1px solid var(--line); background: linear-gradient(90deg, rgba(184, 255, 106, 0.07), transparent 60%); }
  .dots { display: inline-flex; gap: 6px; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; display: block; }
  .dots i:nth-child(1) { background: #ff7777; }
  .dots i:nth-child(2) { background: #ffd166; }
  .dots i:nth-child(3) { background: var(--accent); }
  .head-tools { display: inline-flex; gap: 6px; align-items: center; }
  .mini-btn { border: 1px solid var(--line-strong); background: rgba(255, 255, 255, 0.03); color: #cfe3bf; border-radius: 999px; padding: 4px 10px; font-size: 0.7rem; cursor: pointer; }
  .mini-btn:hover { color: var(--accent); border-color: var(--accent); }
  .gate-close { font-size: 1rem; line-height: 1; padding: 3px 8px; }
  .card-body { padding: 23px 22px 21px; }
  .brand-line { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .brand-mark { width: 42px; height: 42px; border-radius: 12px; border: 1px solid var(--line-strong); background: rgba(184, 255, 106, 0.08); display: grid; place-items: center; color: var(--accent); flex: none; }
  .brand-mark svg { width: 24px; height: 24px; }
  .gate .brand-name { font-size: 1rem; font-weight: 800; }
  .gate .brand-sub { font-size: 0.72rem; color: var(--muted); margin-top: 3px; }
  .field { margin-bottom: 13px; }
  .field label { display: block; font-size: 0.75rem; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
  .field input { width: 100%; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--line-strong); background: rgba(4, 8, 6, 0.85); color: #eaf6e0; font-size: 0.9rem; font-family: inherit; outline: none; transition: 0.18s; }
  .field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(184, 255, 106, 0.11); }
  .field input[dir="ltr"] { text-align: left; }
  .cta { width: 100%; margin-top: 5px; padding: 11px 15px; border: 0; border-radius: 10px; background: linear-gradient(180deg, #caff7d, #9ce23f); color: #0b1408; font-weight: 800; font-size: 0.88rem; font-family: inherit; cursor: pointer; transition: 0.18s; }
  .cta:hover { filter: brightness(1.05); transform: translateY(-1px); }
  .cta:disabled { opacity: 0.6; cursor: not-allowed; }
  .ghost-link { display: inline-block; margin-top: 13px; color: #79d9c9; font-size: 0.73rem; cursor: pointer; text-decoration: none; background: none; border: 0; font-family: inherit; padding: 0; }
  .ghost-link:hover { text-decoration: underline; }
  .storage-warn { margin: 0 0 12px; padding: 10px 11px; border: 1px solid rgba(255, 98, 98, 0.42); border-radius: 10px; background: rgba(255, 98, 98, 0.09); color: #ffd9d9; font-size: 0.7rem; line-height: 1.75; }
  .storage-warn b { color: #ff9e9e; }
  .storage-warn code { font-family: var(--mono); color: var(--accent); background: rgba(184, 255, 106, 0.1); padding: 1px 5px; border-radius: 5px; }
  .err { display: none; margin: 0 0 11px; padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(255, 98, 98, 0.5); background: rgba(255, 98, 98, 0.1); color: #ffb3b3; font-size: 0.75rem; text-align: center; }
  .hint { margin-top: 13px; font-size: 0.7rem; line-height: 1.8; color: #7d9074; border-top: 1px dashed var(--line); padding-top: 11px; }
  .hidden { display: none !important; }
  .mono-id { font-family: var(--mono); font-size: 0.78rem; padding: 10px 11px; border-radius: 9px; border: 1px dashed var(--line-strong); background: rgba(184, 255, 106, 0.06); color: #d8ffb0; word-break: break-all; }
  body.gate-open { overflow: hidden; }
  body.light-mode { --ink: #f3f6f2; --panel: #ffffff; --panel-2: #f7faf5; --line: rgba(20, 70, 40, 0.13); --line-strong: rgba(20, 110, 55, 0.3); --text: #102318; --muted: #5e7364; --accent: #2e7d32; --cyan: #087f72; }
  body.light-mode { background: radial-gradient(circle at 12% -8%, rgba(8, 127, 114, 0.08), transparent 34rem), radial-gradient(circle at 92% 8%, rgba(46, 125, 50, 0.08), transparent 30rem), var(--ink); }
  body.light-mode .topbar { background: rgba(243, 246, 242, 0.85); }
  body.light-mode .signin { background: rgba(46, 125, 50, 0.08); }
  body.light-mode .quickstart { background: #eef4ec; color: #285236; }
  body.light-mode .gate .card { background: #fff; }
  body.light-mode .field input { background: #f8faf7; color: #102318; }
  body.light-mode .mini-btn { color: #52675a; }
  body.light-mode .cta { color: #0b1408; }
  @media (max-width: 860px) {
    .top-nav a { display: none; }
    .hero { grid-template-columns: 1fr; gap: 26px; padding-top: 55px; }
    .monitor-grid, .docs-grid { grid-template-columns: 1fr; }
    .feature-grid { grid-template-columns: 1fr; }
    .hero-aside { max-width: 430px; }
  }
  @media (max-width: 560px) {
    .topbar-inner, .layout { width: min(100% - 28px, 1160px); }
    .brand-sub { max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hero { padding-top: 42px; }
    .hero-actions { flex-direction: column; align-items: stretch; }
    .footer { flex-direction: column; gap: 6px; }
    .section-head { align-items: flex-start; flex-direction: column; }
  }
</style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand-lockup" href="/" aria-label="StudioDocs home">
        <span class="brand-glyph" aria-hidden="true">SD</span>
        <span>
          <span class="brand-name">StudioDocs</span>
          <span class="brand-sub">Static Asset &amp; Web Vitals Monitor</span>
        </span>
      </a>
      <nav class="top-nav" aria-label="Documentation">
        <a href="#monitor">Monitor</a>
        <a href="#features">Features</a>
        <a href="#docs">Docs</a>
        <button class="signin" type="button" data-open-gate="1">Workspace Sign In</button>
      </nav>
    </div>
  </header>

  <main class="layout">
    <section class="hero">
      <div>
        <p class="eyebrow"><span class="live-dot"></span>StudioDocs / Edge Observability</p>
        <h1>Static assets,<br><span>measured at the edge.</span></h1>
        <p class="hero-copy">A documentation and monitoring surface for static delivery, Core Web Vitals, and edge health. Read the metrics, verify the route, then enter your workspace when you need to.</p>
        <div class="hero-actions">
          <a class="primary-link" href="#monitor">Explore monitor</a>
          <button class="signin" type="button" data-open-gate="1">Workspace Sign In</button>
        </div>
      </div>
      <aside class="hero-aside" aria-label="Latest Web Vitals">
        <div class="aside-label"><span>LATEST FIELD SAMPLE</span><span>edge / ${hostLabel}</span></div>
        <div class="vitals">
          <div class="vital"><b>1.18s</b><small>LCP · good</small></div>
          <div class="vital good"><b>0.01</b><small>CLS · good</small></div>
          <div class="vital good"><b>84ms</b><small>INP · good</small></div>
          <div class="vital"><b>182ms</b><small>TTFB · good</small></div>
        </div>
      </aside>
    </section>

    <section class="section" id="monitor">
      <div class="section-head">
        <h2>Static asset &amp; Web Vitals monitor</h2>
        <span class="section-kicker">last 24 hours · synthetic + field</span>
      </div>
      <div class="monitor-grid">
        <div class="panel">
          <div class="panel-head"><span>delivery latency / ms</span><span><span class="live-dot"></span>healthy</span></div>
          <div class="chart">
            <div class="chart-bars" aria-label="Delivery latency chart">
              <i style="height:42%"></i><i style="height:58%"></i><i style="height:49%"></i><i style="height:71%"></i><i style="height:62%"></i><i style="height:81%"></i><i style="height:55%"></i><i style="height:67%"></i><i style="height:47%"></i><i style="height:76%"></i><i style="height:64%"></i><i style="height:53%"></i><i style="height:69%"></i><i style="height:44%"></i><i style="height:59%"></i><i style="height:73%"></i><i style="height:51%"></i><i style="height:63%"></i><i style="height:46%"></i><i style="height:57%"></i><i style="height:39%"></i><i style="height:66%"></i><i style="height:48%"></i><i style="height:60%"></i>
            </div>
            <div class="chart-axis"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>now</span></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><span>asset checks</span><span>6 / 6</span></div>
          <ul class="asset-list">
            <li><b>HTML shell</b><code>200 · 8ms</code></li>
            <li><b>CSS bundle</b><code>200 · cache hit</code></li>
            <li><b>JS bundle</b><code>200 · cache hit</code></li>
            <li><b>Font preload</b><code>200 · 12ms</code></li>
            <li><b>Icon sprite</b><code>200 · 4ms</code></li>
            <li><b>Edge redirect</b><code>clean</code></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section" id="features">
      <div class="section-head">
        <h2>Built for quiet operations</h2>
        <span class="section-kicker">studio-grade defaults</span>
      </div>
      <div class="feature-grid">
        <article class="feature"><span class="feature-index">01</span><h3>Static first</h3><p>Every public surface is a low-cost static document. No secrets, no admin routes, no noisy bootstrap.</p></article>
        <article class="feature"><span class="feature-index">02</span><h3>Field metrics</h3><p>LCP, CLS, INP and TTFB are presented as a compact operational snapshot for faster decisions.</p></article>
        <article class="feature"><span class="feature-index">03</span><h3>Explicit entry</h3><p>The workspace gate opens only when you ask for it, or when you arrive on a protected admin path.</p></article>
      </div>
    </section>

    <section class="section" id="docs">
      <div class="section-head">
        <h2>Quickstart</h2>
        <span class="section-kicker">deploy · verify · monitor</span>
      </div>
      <div class="docs-grid">
        <pre class="quickstart"><code><span class="comment"># static shell + edge monitor</span>
<span class="cmd">GET</span>  /              <span class="string">documentation / monitoring</span>
<span class="cmd">GET</span>  /login        <span class="string">workspace gate (direct)</span>
<span class="cmd">GET</span>  /&lt;admin-path&gt; <span class="string">authenticated workspace</span>

<span class="comment"># protected asset pool</span>
<span class="cmd">GET</span>  /ips?token=&lt;admin-path&gt;</code></pre>
        <div class="docs-copy">
          <h3>Read the edge, then act.</h3>
          <p>Use the monitor as the public surface for static delivery checks. Administrative routes remain session-gated and are never advertised in the page source.</p>
          <p>Need the asset pool? Sign in first or use the admin token. Anonymous requests return a plain 404.</p>
          <button class="ghost-link" type="button" data-open-gate="1" style="color:var(--accent)">Open workspace sign in →</button>
        </div>
      </div>
    </section>

    <footer class="footer">
      <span>StudioDocs · static surface <code>${hostLabel}</code></span>
      <span>noindex · nofollow · noarchive · v${VERSION}</span>
    </footer>
  </main>

  ${gateMarkup({ initialized, storageWarning, directGate })}

<script>
  var I18N = ${JSON.stringify(I18N).replace(/</g, '\\u003c')};
  var INITIALIZED = ${initialized ? 'true' : 'false'};
  var DIRECT_GATE = ${directGate ? 'true' : 'false'};
  var RECOVER_ON_OPEN = ${recover ? 'true' : 'false'};
  var DOCS_TITLE = 'StudioDocs — Static Asset & Web Vitals Monitor';
  var BRAND_TITLE = 'StudioDocs Workspace';
  var state = { lang: localStorage.getItem('mili_lang') === 'en' ? 'en' : 'fa', theme: localStorage.getItem('mili_theme') === 'light' ? 'light' : 'dark' };

  function t(key) { return (I18N[state.lang] || I18N.fa)[key] || key; }

  function gateIsOpen() {
    return document.getElementById('gate').classList.contains('is-visible');
  }

  function applyLang() {
    var dict = I18N[state.lang] || I18N.fa;
    var html = document.documentElement;
    html.lang = state.lang;
    html.dir = dict.dir;
    document.getElementById('card').dir = dict.dir;
    document.getElementById('langBtn').textContent = dict.switchLang;
    document.getElementById('themeBtn').textContent = state.theme === 'light' ? dict.themeDark : dict.themeLight;
    document.getElementById('brandSub').textContent = INITIALIZED ? dict.loginSub : dict.setupSub;
    document.getElementById('lblPassword').textContent = dict.password;
    document.getElementById('pwdInput').placeholder = dict.passwordPh;
    document.getElementById('loginBtn').textContent = dict.loginBtn;
    document.getElementById('recoverLink').textContent = dict.recovery;
    document.getElementById('lblNewPassword').textContent = dict.newPassword;
    document.getElementById('lblConfirmPassword').textContent = dict.confirmPassword;
    document.getElementById('setupBtn').textContent = dict.setupBtn;
    document.getElementById('lblUuid').textContent = dict.uuidLabel;
    document.getElementById('lblRecoverPassword').textContent = dict.newPassword;
    document.getElementById('recoverPwd').placeholder = dict.uuidPh;
    document.getElementById('recoverUuid').placeholder = dict.uuidPh;
    document.getElementById('recoverBtn').textContent = dict.recoverBtn;
    document.getElementById('backLink').textContent = dict.back;
    document.getElementById('lblDone').textContent = dict.setupDone + ' — ' + dict.setupDoneHint;
    document.getElementById('goPanelBtn').textContent = dict.goPanel;
    document.getElementById('copyIdBtn').textContent = dict.copyId;
    document.getElementById('hintBox').textContent = INITIALIZED
      ? (state.lang === 'en' ? 'Session is valid for 30 days. Password recovery is available with the admin UUID.' : 'نشست شما ۳۰ روز معتبر است. بازیابی رمز فقط با UUID مدیر امکان‌پذیر است.')
      : (state.lang === 'en' ? 'First run: set an admin password to start the control center.' : 'اولین اجرا: برای شروع مرکز کنترل یک رمز عبور مدیر تعیین کنید.');
    document.title = gateIsOpen() ? BRAND_TITLE : DOCS_TITLE;
  }

  function applyTheme() {
    document.body.classList.toggle('light-mode', state.theme === 'light');
  }

  function openGate() {
    document.body.classList.add('gate-open');
    document.getElementById('gate').classList.add('is-visible');
    document.getElementById('gate').setAttribute('aria-hidden', 'false');
    document.title = BRAND_TITLE;
    if (RECOVER_ON_OPEN) showRecover();
    else {
      var input = INITIALIZED ? document.getElementById('pwdInput') : document.getElementById('newPwd');
      if (input) input.focus();
    }
  }

  function closeGate() {
    document.body.classList.remove('gate-open');
    document.getElementById('gate').classList.remove('is-visible');
    document.getElementById('gate').setAttribute('aria-hidden', 'true');
    document.title = DOCS_TITLE;
    RECOVER_ON_OPEN = false;
    var btn = document.querySelector('[data-open-gate]');
    if (btn) btn.focus();
  }

  function showErr(msg) {
    var box = document.getElementById('errBox');
    box.textContent = msg;
    box.style.display = 'block';
  }
  function clearErr() {
    var box = document.getElementById('errBox');
    box.style.display = 'none';
  }

  function showRecover() {
    clearErr();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('setupForm').classList.add('hidden');
    document.getElementById('recoverForm').classList.remove('hidden');
  }
  function showLogin() {
    clearErr();
    document.getElementById('recoverForm').classList.add('hidden');
    if (INITIALIZED) document.getElementById('loginForm').classList.remove('hidden');
    else document.getElementById('setupForm').classList.remove('hidden');
  }

  async function postJson(url, payload) {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var data = await res.json().catch(function() { return { success: false }; });
    return { ok: res.ok, data: data };
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearErr();
    var pwd = document.getElementById('pwdInput').value.trim();
    if (!pwd) { showErr(t('errFill')); return; }
    var btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = t('working');
    try {
      var result = await postJson('/api/admin/login', { password: pwd });
      if (result.data && result.data.success) {
        window.location.href = result.data.redirect || '/';
        return;
      }
      showErr((result.data && result.data.message) || t('errWrong'));
    } catch (err) {
      showErr(t('errNetwork'));
    }
    btn.disabled = false;
    btn.textContent = t('loginBtn');
  }

  async function handleSetup(event) {
    event.preventDefault();
    clearErr();
    var p1 = document.getElementById('newPwd').value.trim();
    var p2 = document.getElementById('confirmPwd').value.trim();
    if (p1.length < 4) { showErr(t('errShort')); return; }
    if (p1 !== p2) { showErr(t('errMismatch')); return; }
    var btn = document.getElementById('setupBtn');
    btn.disabled = true;
    btn.textContent = t('working');
    try {
      var result = await postJson('/api/admin/setup-password', { password: p1 });
      if (result.data && result.data.success) {
        INITIALIZED = true;
        document.getElementById('setupForm').classList.add('hidden');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('recoverForm').classList.add('hidden');
        document.getElementById('doneId').textContent = result.data.adminId || '';
        var done = document.getElementById('doneCard');
        done.classList.remove('hidden');
        done.setAttribute('data-redirect', result.data.redirect || '/');
        btn.disabled = false;
        btn.textContent = t('setupBtn');
        return;
      }
      showErr((result.data && result.data.message) || t('errNetwork'));
    } catch (err) {
      showErr(t('errNetwork'));
    }
    btn.disabled = false;
    btn.textContent = t('setupBtn');
  }

  document.getElementById('goPanelBtn').addEventListener('click', function() {
    var done = document.getElementById('doneCard');
    window.location.href = done.getAttribute('data-redirect') || '/';
  });
  document.getElementById('copyIdBtn').addEventListener('click', function() {
    var text = document.getElementById('doneId').textContent || '';
    if (!text) return;
    var btn = this;
    var done = function() { btn.textContent = t('idCopied'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      done();
    }
  });

  async function handleRecover(event) {
    event.preventDefault();
    clearErr();
    var uuid = document.getElementById('recoverUuid').value.trim();
    var pwd = document.getElementById('recoverPwd').value.trim();
    if (!uuid || pwd.length < 4) { showErr(t('errFill')); return; }
    var btn = document.getElementById('recoverBtn');
    btn.disabled = true;
    btn.textContent = t('working');
    try {
      var result = await postJson('/api/admin/reset-password', { uuid: uuid, password: pwd });
      if (result.data && result.data.success) {
        window.location.href = result.data.redirect || '/';
        return;
      }
      showErr((result.data && result.data.message) || t('errUuid'));
    } catch (err) {
      showErr(t('errNetwork'));
    }
    btn.disabled = false;
    btn.textContent = t('recoverBtn');
  }

  document.addEventListener('click', function(event) {
    var opener = event.target && event.target.closest ? event.target.closest('[data-open-gate]') : null;
    if (opener) {
      event.preventDefault();
      openGate();
      return;
    }
    if (event.target && event.target.closest && event.target.closest('[data-close-gate]')) {
      event.preventDefault();
      closeGate();
    }
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && gateIsOpen()) closeGate();
  });

  document.getElementById('langBtn').addEventListener('click', function() {
    state.lang = state.lang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('mili_lang', state.lang);
    applyLang();
  });
  document.getElementById('themeBtn').addEventListener('click', function() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mili_theme', state.theme);
    applyTheme();
    applyLang();
  });

  applyTheme();
  applyLang();

  // Public StudioDocs page: no automatic gate. Only a direct /login or admin
  // request is allowed to open it immediately.
  if (DIRECT_GATE) openGate();

  ${PWA_CLIENT_JS}
</script>
</body>
</html>`;
}

// Backward-compatible wrapper for callers that still use the old name.
export function renderLoginGatewayHtml(options = {}) {
  return renderLoginPage('', options);
}
