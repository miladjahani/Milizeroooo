// ============================================================================
// Public camouflage sites
// Each deployment gets one stable, realistic site at "/" so the empty panel
// address never exposes an admin/login surface. Admin routes look like a normal
// login gate and are never linked from these pages.
// ============================================================================

import { escapeHtml } from '../core/utils.js';

export const CAMOUFLAGE_SITE_IDS = ['bazaar', 'pulse', 'techline', 'weather', 'kitchen'];

const SITE_META = {
  bazaar: { title: 'بازارینو', tagline: 'خرید و فروش آسان در شهر شما', color: '#0f766e', theme: 'light' },
  pulse: { title: 'پالس', tagline: 'صدای امروز جامعه', color: '#e11d48', theme: 'dark' },
  techline: { title: 'تک‌لاین', tagline: 'فناوری، ساده و دقیق', color: '#1d4ed8', theme: 'light' },
  weather: { title: 'آسمان', tagline: 'هوای امروز، فردا و سفر بعدی', color: '#0284c7', theme: 'light' },
  kitchen: { title: 'آشپزخانه', tagline: 'طعم خانه، هر روز تازه', color: '#b45309', theme: 'light' }
};

const COMMON_CSS = `
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font-family:Tahoma,"Segoe UI",system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}button,input{font:inherit}
.wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
.nav{position:sticky;top:0;z-index:20;background:var(--nav);border-bottom:1px solid var(--line);backdrop-filter:blur(16px)}
.nav-in{display:flex;align-items:center;gap:18px;min-height:64px}
.brand{display:flex;align-items:center;gap:9px;font-weight:900;font-size:1.06rem;white-space:nowrap}
.mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--brand);color:#fff;font-weight:900;font-size:.8rem}
.nav-links{display:flex;gap:16px;align-items:center;font-size:.78rem;color:var(--muted);flex:1}
.nav-links a:hover{color:var(--brand)}
.nav-action{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:9px 14px;font-weight:800;font-size:.75rem;cursor:pointer}
.search{display:flex;align-items:center;gap:8px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:10px 12px;flex:1;max-width:360px}
.search input{border:0;background:transparent;outline:0;width:100%;color:var(--ink);font-size:.8rem}
.chips{display:flex;gap:8px;overflow:auto;padding:14px 0 2px;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{border:1px solid var(--line);background:var(--card);color:var(--muted);padding:8px 13px;border-radius:999px;font-size:.72rem;white-space:nowrap;cursor:pointer;transition:.18s}
.chip.on,.chip:hover{border-color:var(--brand);color:var(--brand);background:var(--brand-soft)}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.04)}
.footer{border-top:1px solid var(--line);margin-top:52px;padding:28px 0 38px;color:var(--muted);font-size:.72rem}
.footer-in{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
.thumb{position:relative;overflow:hidden;background:linear-gradient(140deg,var(--t1),var(--t2));border-radius:13px;display:grid;place-items:center;color:rgba(255,255,255,.9);font-size:1.6rem;font-weight:900}
.badge{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:var(--brand-soft);color:var(--brand);font-size:.66rem;font-weight:800}
.empty{display:none;padding:34px;text-align:center;color:var(--muted);font-size:.8rem}
@media(max-width:760px){.nav-links{display:none}.nav-in{gap:10px}.search{max-width:none}.hero{grid-template-columns:1fr!important}.grid{grid-template-columns:1fr 1fr!important}.footer-in{flex-direction:column}}
@media(max-width:480px){.grid{grid-template-columns:1fr!important}.wrap{width:min(100% - 22px,1120px)}}
`;

function shell({ skin, body, style, script = '', extraHead = '' }) {
  const meta = SITE_META[skin] || SITE_META.bazaar;
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="${meta.color}">
<title>${meta.title} — ${meta.tagline}</title>
<meta name="description" content="${meta.tagline}">
${extraHead}
<style>
${COMMON_CSS}
body{--brand:${meta.color};--nav:rgba(255,255,255,.9);--bg:#f6f8f7;--card:#fff;--soft:#f1f5f4;--ink:#12211d;--muted:#64756f;--line:rgba(15,23,42,.10);--brand-soft:color-mix(in srgb,var(--brand) 10%,transparent);--t1:#99f6e4;--t2:#0f766e}
${style}
</style>
</head>
<body>
${body}
<div class="footer"><div class="wrap footer-in"><span>${meta.title} — ${meta.tagline}</span><span>© ${new Date().getFullYear()} · همهٔ حقوق محفوظ است</span></div></div>
<script>
(function(){
  var chips=document.querySelectorAll('[data-chip]');
  var items=document.querySelectorAll('[data-cat]');
  chips.forEach(function(chip){chip.addEventListener('click',function(){
    chips.forEach(function(c){c.classList.remove('on')});chip.classList.add('on');
    var cat=chip.getAttribute('data-chip');var shown=0;
    items.forEach(function(item){var ok=cat==='all'||item.getAttribute('data-cat')===cat;item.style.display=ok?'':'none';if(ok)shown++;});
    var empty=document.querySelector('.empty');if(empty)empty.style.display=shown?'none':'block';
  })});
  var search=document.querySelector('[data-search]');
  if(search){search.addEventListener('input',function(){var q=search.value.trim();items.forEach(function(item){item.style.display=!q||item.textContent.indexOf(q)>-1?'':'none';});});}
  document.querySelectorAll('[data-like]').forEach(function(btn){btn.addEventListener('click',function(){var on=btn.getAttribute('data-on')==='1';btn.setAttribute('data-on',on?'0':'1');btn.textContent=(on?'♡':'♥')+' '+btn.getAttribute('data-count');});});
  ${script}
})();
</script>
</body>
</html>`;
}

function bazaar() {
  const listings = [
    ['آپارتمان ۸۵ متری، نورگیر', '۲ میلیارد و ۴۵۰ میلیون', 'مسکونی', 'تهران، سعادت‌آباد', '🏢', '#99f6e4', '#0f766e'],
    ['پژو ۲۰۷ اتوماتیک، کارکرد کم', '۸۹۰ میلیون', 'خودرو', 'کرج، عظیمیه', '🚗', '#bfdbfe', '#1d4ed8'],
    ['لپ‌تاپ ایسوس، مناسب طراحی', '۳۲ میلیون', 'دیجیتال', 'اصفهان، مرکز', '💻', '#ddd6fe', '#6d28d9'],
    ['مبل راحتی هفت‌نفره', '۱۸ میلیون', 'خانه', 'شیراز، قصردشت', '🛋️', '#fde68a', '#b45309'],
    ['دوچرخه کوهستان سایز ۲۷', '۹ میلیون', 'ورزش', 'مشهد، وکیل‌آباد', '🚲', '#bbf7d0', '#15803d'],
    ['دوربین فوجی‌فیلم X-T30', '۴۷ میلیون', 'دیجیتال', 'تبریز، ولیعصر', '📷', '#fecdd3', '#be123c'],
    ['اجاره سوئیت مبله ماهانه', '۲۵ میلیون', 'مسکونی', 'رشت، گلسار', '🏡', '#cffafe', '#0e7490'],
    ['پرینتر لیزری اچ‌پی', '۴ میلیون و ۲۰۰', 'خانه', 'قم، صفاشهر', '🖨️', '#e2e8f0', '#475569']
  ];
  const cards = listings.map(([title, price, cat, city, emoji, t1, t2]) => `
    <article class="card item" data-cat="${cat === 'دیجیتال' ? 'digital' : cat === 'خانه' ? 'home' : cat === 'خودرو' ? 'car' : cat === 'مسکونی' ? 'property' : cat === 'ورزش' ? 'sport' : 'other'}">
      <div class="thumb" style="--t1:${t1};--t2:${t2};height:150px">${emoji}</div>
      <div class="body"><h3>${title}</h3><div class="price">${price} تومان</div><div class="meta"><span>${city}</span><span class="badge">${cat}</span></div></div>
    </article>`).join('');
  return shell({
    skin: 'bazaar',
    style: `
    .hero{display:grid;grid-template-columns:1.4fr .8fr;gap:18px;padding:30px 0 12px;align-items:stretch}
    .hero-main{background:linear-gradient(135deg,#0f766e,#115e59);border-radius:22px;padding:32px;color:#fff;position:relative;overflow:hidden}
    .hero-main:after{content:"";position:absolute;width:240px;height:240px;border-radius:50%;border:38px solid rgba(255,255,255,.08);left:-70px;bottom:-90px}
    .hero-main h1{font-size:1.7rem;margin:0 0 10px;line-height:1.4}.hero-main p{margin:0 0 20px;color:#ccfbf1;font-size:.85rem;line-height:1.9;max-width:440px}
    .hero-main .search{background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.2);max-width:none;color:#fff}.hero-main .search input{color:#fff}.hero-main .search input::placeholder{color:#ccfbf1}
    .hero-side{display:flex;flex-direction:column;gap:12px}.hero-stat{flex:1;padding:16px;display:flex;align-items:center;gap:12px;font-size:.78rem;color:var(--muted)}.hero-stat b{color:var(--ink);font-size:1.1rem;display:block}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin:26px 0 12px}.section-head h2{font-size:1.05rem;margin:0}.section-head span{color:var(--muted);font-size:.7rem}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.item{overflow:hidden;transition:.2s}.item:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(15,23,42,.10)}.item .body{padding:12px 13px 14px}.item h3{font-size:.79rem;line-height:1.7;margin:0 0 8px;min-height:2.7em}.price{font-size:.83rem;font-weight:900;color:var(--brand)}.meta{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:9px;color:var(--muted);font-size:.65rem}
    .citybar{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 0}.citybar span{font-size:.66rem;border:1px solid var(--line);border-radius:999px;padding:5px 9px;color:var(--muted);background:var(--card)}
    `,
    body: `
    <header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><span class="mark">ب</span>بازارینو</a><nav class="nav-links"><a href="#">همهٔ آگهی‌ها</a><a href="#">دسته‌بندی‌ها</a><a href="#">فروشگاه‌ها</a><a href="#">راهنما</a></nav><div class="search"><span>⌕</span><input placeholder="جستجو در آگهی‌ها..." data-search aria-label="جستجو"></div><button class="nav-action">ثبت آگهی</button></div></header>
    <main class="wrap">
      <section class="hero"><div class="hero-main"><span class="badge" style="background:rgba(255,255,255,.15);color:#ecfdf5">امروز در بازارینو</span><h1>هر چیزی که می‌خواهی،<br>در شهر خودت پیدا کن.</h1><p>خرید و فروش امن، بدون واسطه و با آگهی‌های تازه از محله‌های اطراف شما. جستجو کن و مستقیم با فروشنده صحبت کن.</p><div class="search"><span>⌕</span><input placeholder="مثلاً آپارتمان ۸۰ متری در سعادت‌آباد" aria-label="جستجوی اصلی"></div></div>
      <aside class="hero-side"><div class="card hero-stat"><span style="font-size:1.5rem">📣</span><div><b>۴۸٬۲۱۰</b>آگهی فعال</div></div><div class="card hero-stat"><span style="font-size:1.5rem">🏙️</span><div><b>۳۱۲</b>شهر و محله</div></div><div class="card hero-stat"><span style="font-size:1.5rem">⚡</span><div><b>۲ دقیقه</b>میانگین زمان پاسخ</div></div></aside></section>
      <div class="chips"><button class="chip on" data-chip="all">همه</button><button class="chip" data-chip="property">مسکونی</button><button class="chip" data-chip="car">خودرو</button><button class="chip" data-chip="digital">دیجیتال</button><button class="chip" data-chip="home">خانه</button><button class="chip" data-chip="sport">ورزش</button></div>
      <div class="citybar"><span>تهران</span><span>کرج</span><span>اصفهان</span><span>شیراز</span><span>مشهد</span><span>تبریز</span><span>رشت</span></div>
      <div class="section-head"><h2>آگهی‌های تازه</h2><span>مرتب‌شده بر اساس زمان انتشار</span></div>
      <div class="grid">${cards}</div><div class="empty">آگهی‌ای با این فیلتر پیدا نشد.</div>
    </main>`
  });
}

function pulse() {
  const posts = [
    ['سارا محمدی', '@sara_m', '۲ دقیقه', 'امروز فهمیدم که یک پیاده‌روی بیست دقیقه‌ای بعد از ناهار، کل بعدازظهر را عوض می‌کند. ساده، رایگان، مؤثر.', '۲۴', '۱۸', '۳'],
    ['برنامه‌نویس خسته', '@dev_iran', '۱۸ دقیقه', 'بعد از سه ساعت دیباگ فهمیدم مشکل از یک نقطه‌ویرگول بود. هنوز نمی‌دانم بخندم یا گریه کنم.', '۸۹', '۴۲', '۹'],
    ['هواشناسی تهران', '@tehran_weather', '۳۱ دقیقه', 'امروز بعدازظهر وزش باد و احتمال رگبار پراکنده در ارتفاعات. دمای هوا ۴ درجه خنک‌تر می‌شود.', '۱۲', '۵', '۲'],
    ['کتاب‌باز', '@ketabbaz', '۱ ساعت', 'کتابی که این هفته تمام کردم: «عادت‌های اتمی». شاید کلیشه باشد، ولی بخش محیط‌سازی واقعاً کار می‌کند.', '۳۱', '۲۲', '۴']
  ];
  const html = posts.map(([name, handle, time, text, likes, retweets, replies]) => `
    <article class="card post"><div class="avatar" style="--a:${name.length % 2 ? '#fecdd3' : '#bfdbfe'}">${escapeHtml(name.slice(0, 1))}</div><div class="pbody"><div class="phead"><b>${escapeHtml(name)}</b><span>${handle} · ${time}</span></div><p>${escapeHtml(text)}</p><div class="pacts"><span>◇ ${replies}</span><span>↻ ${retweets}</span><button data-like data-on="0" data-count="${likes}">♡ ${likes}</button><span>↗</span></div></div></article>`).join('');
  return shell({
    skin: 'pulse',
    style: `
    body{--nav:rgba(9,12,18,.92);--bg:#080b11;--card:#0f141c;--soft:#151c26;--ink:#e6edf5;--muted:#8b9aab;--line:rgba(255,255,255,.08);--brand-soft:rgba(225,29,72,.13)}
    .layout{display:grid;grid-template-columns:210px 1fr 250px;gap:20px;padding-top:18px;align-items:start}
    .rail{position:sticky;top:82px;display:flex;flex-direction:column;gap:4px}.rail a{padding:11px 13px;border-radius:12px;color:var(--muted);font-size:.84rem;display:flex;gap:10px;align-items:center}.rail a.on,.rail a:hover{background:var(--soft);color:var(--ink)}
    .compose{padding:15px;display:flex;gap:11px;margin-bottom:14px}.compose textarea{width:100%;background:transparent;border:0;outline:0;resize:none;color:var(--ink);min-height:48px;font-size:.85rem;line-height:1.8}.compose .send{background:var(--brand);border:0;color:#fff;border-radius:9px;padding:8px 14px;font-size:.72rem;font-weight:800;cursor:pointer}
    .post{display:flex;gap:11px;padding:15px;margin-bottom:10px;transition:.18s}.post:hover{border-color:rgba(255,255,255,.16)}.avatar{width:38px;height:38px;border-radius:50%;background:var(--a,#bfdbfe);display:grid;place-items:center;flex:0 0 auto;font-weight:900;color:#0f172a;font-size:.8rem}.pbody{min-width:0;flex:1}.phead{display:flex;gap:5px;align-items:center;flex-wrap:wrap;font-size:.78rem}.phead span{color:var(--muted);font-size:.68rem}.pbody p{margin:7px 0 10px;font-size:.82rem;line-height:2;color:#d7e0ea}.pacts{display:flex;gap:22px;color:var(--muted);font-size:.68rem}.pacts button{border:0;background:transparent;color:inherit;cursor:pointer;padding:0}
    .side .card{padding:15px;margin-bottom:12px}.side h2{font-size:.84rem;margin:0 0 12px}.trend{padding:9px 0;border-top:1px solid var(--line);font-size:.72rem;line-height:1.7}.trend:first-of-type{border-top:0}.trend b{display:block;color:var(--ink)}.trend span{color:var(--muted);font-size:.65rem}
    .who{display:flex;align-items:center;gap:9px;padding:7px 0;font-size:.72rem}.who .avatar{width:30px;height:30px;font-size:.7rem}.follow{margin-right:auto;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:99px;padding:4px 9px;font-size:.62rem;cursor:pointer}
    @media(max-width:980px){.layout{grid-template-columns:1fr 230px}.rail{display:none}}@media(max-width:720px){.layout{grid-template-columns:1fr}.side{display:none}}
    `,
    body: `
    <header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><span class="mark" style="background:var(--brand)">پ</span>پالس</a><nav class="nav-links"><a href="#">خانه</a><a href="#">کاوش</a><a href="#">اعلان‌ها</a></nav><div class="search"><span>⌕</span><input placeholder="جستجو در پالس" data-search aria-label="جستجو"></div><a class="nav-action" href="#">نوشتن</a></div></header>
    <main class="wrap layout">
      <aside class="rail"><a class="on" href="#">⌂ خانه</a><a href="#"># کاوش</a><a href="#">◉ اعلان‌ها</a><a href="#">✉ پیام‌ها</a><a href="#">▤ نشان‌شده‌ها</a><a href="#">◌ پروفایل</a></aside>
      <section>
        <div class="card compose"><div class="avatar">ش</div><div style="flex:1"><textarea rows="2" placeholder="چه خبر؟"></textarea><div style="display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:.75rem"><span>🖼 ☺ #</span><button class="send">انتشار</button></div></div></div>
        ${html}
      </section>
      <aside class="side">
        <div class="card"><h2>موضوع‌های داغ</h2><div class="trend"><b>#برنامه‌نویسی</b><span>۱۲٬۴۰۰ پست</span></div><div class="trend"><b>#هوای_تهران</b><span>۸٬۲۱۰ پست</span></div><div class="trend"><b>#کتاب_خوب</b><span>۴٬۹۸۰ پست</span></div><div class="trend"><b>#فوتبال</b><span>۳٬۲۱۰ پست</span></div></div>
        <div class="card"><h2>پیشنهاد برای دنبال کردن</h2><div class="who"><div class="avatar" style="--a:#fde68a">ن</div><div>نبض فناوری<br><span style="color:var(--muted);font-size:.62rem">@tech_pulse</span></div><button class="follow">دنبال کردن</button></div><div class="who"><div class="avatar" style="--a:#bbf7d0">د</div><div>دنیای دیجیتال<br><span style="color:var(--muted);font-size:.62rem">@digital_world</span></div><button class="follow">دنبال کردن</button></div><div class="who"><div class="avatar" style="--a:#ddd6fe">ر</div><div>راهنمای شهر<br><span style="color:var(--muted);font-size:.62rem">@city_guide</span></div><button class="follow">دنبال کردن</button></div></div>
      </aside>
    </main>`
  });
}

function techline() {
  const articles = [
    ['هوش مصنوعی', 'مدل‌های کوچک‌تر، کاربردهای واقعی‌تر', 'سال ۲۰۲۶ سال مدل‌های سبک است؛ مدل‌هایی که روی گوشی اجرا می‌شوند و بدون اینترنت هم کار می‌کنند.', '۰۶ آبان', '🤖', '#dbeafe', '#1d4ed8'],
    ['امنیت', 'رمز عبور خوب را چطور بسازیم؟', 'سه قاعدهٔ ساده که بیشتر حملات حساب‌های شخصی را بی‌اثر می‌کند؛ بدون نیاز به ابزار پیچیده.', '۰۵ آبان', '🛡️', '#dcfce7', '#15803d'],
    ['موبایل', 'باتری گوشی در پاییز چرا سریع خالی می‌شود؟', 'سرمای هوا، بهینه‌سازی نادرست و اپ‌های پس‌زمینه؛ سه دلیل اصلی و راه‌حل‌های عملی.', '۰۴ آبان', '📱', '#fef3c7', '#b45309'],
    ['اینترنت', 'نسل بعدی شبکه‌های خانگی', 'Wi-Fi 7 در ایران چه زمانی فراگیر می‌شود و آیا ارزش ارتقا دارد؟', '۰۳ آبان', '📶', '#e0f2fe', '#0369a1'],
    ['نرم‌افزار', 'ابزارهای متن‌باز این ماه', 'پنج پروژهٔ تازه که در گیت‌هاب توجه زیادی جلب کرده‌اند؛ از مدیریت سرور تا ویرایش تصویر.', '۰۲ آبان', '⌨️', '#ede9fe', '#6d28d9'],
    ['کسب‌وکار', 'فروش آنلاین بدون وب‌سایت؟', 'کسب‌وکارهای کوچک چطور با شبکه‌های اجتماعی فروش پایدار می‌سازند.', '۰۱ آبان', '📈', '#fce7f3', '#be185d']
  ];
  const cards = articles.map(([cat, title, desc, date, emoji, t1, t2]) => `
    <article class="card art" data-cat="${cat}"><div class="thumb" style="--t1:${t1};--t2:${t2};height:135px;font-size:2rem">${emoji}</div><div class="abody"><span class="badge">${cat}</span><h3>${title}</h3><p>${desc}</p><span class="date">${date} · ۴ دقیقه مطالعه</span></div></article>`).join('');
  return shell({
    skin: 'techline',
    style: `
    .ticker{background:#0f172a;color:#cbd5e1;font-size:.7rem;padding:8px 0}.ticker .wrap{display:flex;gap:12px;align-items:center}.ticker b{color:#fbbf24;white-space:nowrap}
    .hero{display:grid;grid-template-columns:1.45fr .8fr;gap:16px;padding:22px 0 8px}.lead{overflow:hidden;border-radius:18px;background:linear-gradient(145deg,#1e3a8a,#1d4ed8);color:#fff;padding:28px;min-height:300px;display:flex;flex-direction:column;justify-content:flex-end}.lead .thumb{height:120px;background:rgba(255,255,255,.12);margin-bottom:18px;font-size:2.5rem}.lead h1{font-size:1.28rem;line-height:1.7;margin:0 0 8px}.lead p{color:#dbeafe;font-size:.78rem;line-height:1.9;margin:0 0 18px}.lead a{display:inline-flex;width:max-content;background:#fff;color:#1e40af;padding:8px 13px;border-radius:8px;font-size:.7rem;font-weight:900}
    .side-list{display:flex;flex-direction:column;gap:10px}.mini{display:flex;gap:10px;padding:11px;align-items:center}.mini .thumb{width:56px;height:56px;flex:0 0 auto;font-size:1.2rem}.mini b{display:block;font-size:.72rem;line-height:1.7}.mini span{font-size:.63rem;color:var(--muted)}
    .section-head{display:flex;justify-content:space-between;align-items:end;margin:28px 0 12px}.section-head h2{margin:0;font-size:1.05rem}.section-head span{font-size:.68rem;color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.art{overflow:hidden;transition:.2s}.art:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(15,23,42,.09)}.abody{padding:13px 14px 16px}.abody h3{font-size:.84rem;line-height:1.8;margin:9px 0 6px}.abody p{font-size:.72rem;line-height:1.9;color:var(--muted);margin:0 0 10px}.date{font-size:.62rem;color:var(--muted)}.badge{font-size:.62rem}
    `,
    body: `
    <div class="ticker"><div class="wrap"><b>فوری</b><span>نسخهٔ تازهٔ مرورگرها منتشر شد · قیمت تراشه‌های حافظه کاهش یافت · نمایشگاه فناوری هفتهٔ آینده آغاز می‌شود</span></div></div>
    <header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><span class="mark">ت</span>تک‌لاین</a><nav class="nav-links"><a href="#">فناوری</a><a href="#">موبایل</a><a href="#">امنیت</a><a href="#">کسب‌وکار</a><a href="#">آموزش</a></nav><div class="search"><span>⌕</span><input placeholder="جستجو در تک‌لاین" data-search aria-label="جستجو"></div></div></header>
    <main class="wrap">
      <section class="hero"><article class="lead"><div class="thumb">💡</div><span class="badge" style="background:rgba(255,255,255,.16);color:#dbeafe">پروندهٔ ویژه</span><h1>فناوری که آرام وارد زندگی می‌شود؛<br>از خانهٔ هوشمند تا شهر هوشمند</h1><p>نگاهی به تغییرهای کوچکی که در پنج سال آینده، تجربهٔ روزمرهٔ ما را بازتعریف می‌کنند.</p><a href="#">خواندن پرونده</a></article>
      <div class="side-list">${articles.slice(0, 4).map(([cat, title, , date, emoji, t1, t2]) => `<article class="card mini"><div class="thumb" style="--t1:${t1};--t2:${t2}">${emoji}</div><div><b>${title}</b><span>${cat} · ${date}</span></div></article>`).join('')}</div></section>
      <div class="chips"><button class="chip on" data-chip="all">همه</button><button class="chip" data-chip="هوش مصنوعی">هوش مصنوعی</button><button class="chip" data-chip="امنیت">امنیت</button><button class="chip" data-chip="موبایل">موبایل</button><button class="chip" data-chip="اینترنت">اینترنت</button><button class="chip" data-chip="نرم‌افزار">نرم‌افزار</button></div>
      <div class="section-head"><h2>تازه‌ترین مطالب</h2><span>به‌روزرسانی روزانه</span></div>
      <div class="grid">${cards}</div><div class="empty">مطلبی در این دسته پیدا نشد.</div>
    </main>`
  });
}

function weather() {
  const days = [
    ['امروز', '۲۴°', '۱۴°', '☀️', 'آفتابی'],
    ['شنبه', '۲۲°', '۱۳°', '⛅', 'نیمه‌ابری'],
    ['یکشنبه', '۱۹°', '۱۱°', '🌧️', 'رگبار'],
    ['دوشنبه', '۲۱°', '۱۲°', '🌤️', 'کمی ابری'],
    ['سه‌شنبه', '۲۵°', '۱۵°', '☀️', 'آفتابی'],
    ['چهارشنبه', '۲۳°', '۱۴°', '⛅', 'نیمه‌ابری']
  ];
  const cities = [
    ['تهران', '۲۴°', '☀️', 'آفتابی', '#fef3c7', '#f59e0b'],
    ['شیراز', '۲۸°', '☀️', 'آفتابی', '#fde68a', '#d97706'],
    ['تبریز', '۱۶°', '⛅', 'نیمه‌ابری', '#dbeafe', '#2563eb'],
    ['رشت', '۱۸°', '🌧️', 'رگبار', '#cffafe', '#0891b2'],
    ['مشهد', '۲۶°', '☀️', 'آفتابی', '#fef9c3', '#ca8a04'],
    ['اهواز', '۳۳°', '🌤️', 'گرم', '#fee2e2', '#dc2626']
  ];
  return shell({
    skin: 'weather',
    style: `
    body{--bg:#eef6fb;--card:#fff;--soft:#e2f0f7;--brand:#0284c7;--brand-soft:rgba(2,132,199,.11)}
    .hero{display:grid;grid-template-columns:1.25fr .9fr;gap:16px;padding:26px 0 10px}.current{background:linear-gradient(145deg,#0ea5e9,#0369a1);border-radius:22px;padding:26px;color:#fff;position:relative;overflow:hidden}.current:after{content:"☀";position:absolute;left:20px;bottom:-30px;font-size:9rem;opacity:.15}.current .top{display:flex;justify-content:space-between;align-items:start}.current h1{margin:0;font-size:1.15rem}.current .sub{font-size:.72rem;color:#e0f2fe;margin-top:4px}.current .temp{font-size:4rem;font-weight:200;line-height:1;margin:22px 0 6px}.current .cond{font-size:.85rem;color:#e0f2fe}.current .facts{display:flex;gap:16px;margin-top:22px;flex-wrap:wrap;font-size:.68rem;color:#e0f2fe}.current .facts b{color:#fff;display:block;font-size:.85rem;margin-top:3px}
    .forecast{padding:18px}.forecast h2{font-size:.9rem;margin:0 0 12px}.days{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.day{border:1px solid var(--line);border-radius:12px;padding:11px 8px;text-align:center;font-size:.67rem;color:var(--muted)}.day b{display:block;color:var(--ink);font-size:1.05rem;margin:5px 0}.day .ico{font-size:1.15rem}.day span{font-size:.6rem}
    .section-head{display:flex;justify-content:space-between;align-items:end;margin:26px 0 12px}.section-head h2{margin:0;font-size:1.02rem}.section-head span{font-size:.68rem;color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.city{padding:15px;display:flex;gap:12px;align-items:center}.city .ico{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:1.4rem;background:linear-gradient(140deg,var(--t1),var(--t2))}.city b{display:block;font-size:.82rem}.city small{display:block;font-size:.66rem;color:var(--muted);margin-top:3px}.city .deg{margin-right:auto;font-size:1.35rem;font-weight:700}
    .tips{padding:18px;margin-top:14px}.tips h3{font-size:.85rem;margin:0 0 10px}.tips p{font-size:.74rem;line-height:2;color:var(--muted);margin:0}
    @media(max-width:760px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.grid{grid-template-columns:1fr}}
    `,
    body: `
    <header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><span class="mark" style="background:var(--brand)">آ</span>آسمان</a><nav class="nav-links"><a href="#">هوای امروز</a><a href="#">پیش‌بینی هفتگی</a><a href="#">سفر</a><a href="#">کیفیت هوا</a></nav><div class="search"><span>⌕</span><input placeholder="جستجوی شهر..." data-search aria-label="جستجوی شهر"></div></div></header>
    <main class="wrap">
      <section class="hero"><div class="current"><div class="top"><div><h1>تهران</h1><div class="sub">شنبه ۱۷ آبان · به‌روزرسانی ۱۰ دقیقه پیش</div></div><div style="font-size:2.5rem">☀️</div></div><div class="temp">۲۴°</div><div class="cond">آفتابی · احساس می‌شود مثل ۲۳°</div><div class="facts"><div>رطوبت<b>۳۸٪</b></div><div>باد<b>۱۲ km/h</b></div><div>طلوع<b>۰۶:۲۴</b></div><div>غروب<b>۱۷:۰۲</b></div></div></div>
      <div class="card forecast"><h2>پیش‌بینی شش روز آینده</h2><div class="days">${days.map(([name, hi, lo, ico, label]) => `<div class="day">${name}<div class="ico">${ico}</div><b>${hi}</b>${lo}<span>${label}</span></div>`).join('')}</div><div class="tips"><h3>توصیهٔ امروز</h3><p>برای پیاده‌روی بعدازظهر وقت مناسبی است. عصر احتمال افزایش ابر وجود دارد؛ اگر به ارتفاعات می‌روید یک لایهٔ گرم‌تر همراه داشته باشید.</p></div></div></section>
      <div class="section-head"><h2>هوای شهرهای دیگر</h2><span>دمای فعلی</span></div>
      <div class="grid">${cities.map(([name, deg, ico, label, t1, t2]) => `<article class="card city" data-cat="city"><div class="ico" style="--t1:${t1};--t2:${t2}">${ico}</div><div><b>${name}</b><small>${label}</small></div><div class="deg">${deg}</div></article>`).join('')}</div>
    </main>`
  });
}

function kitchen() {
  const recipes = [
    ['غذای اصلی', 'خورش قیمه بادمجان', '۴ نفر · ۷۵ دقیقه', '🍛', '#fde68a', '#b45309'],
    ['صبحانه', 'املت اسفناج و پنیر', '۲ نفر · ۱۵ دقیقه', '🍳', '#d9f99d', '#4d7c0f'],
    ['دسر', 'کیک شکلاتی مرطوب', '۸ برش · ۵۰ دقیقه', '🍰', '#fecdd3', '#be123c'],
    ['نوشیدنی', 'لیموناد خانگی با نعنا', '۴ لیوان · ۱۰ دقیقه', '🍋', '#fef08a', '#a16207'],
    ['غذای اصلی', 'پاستا با سس گوجهٔ تازه', '۳ نفر · ۳۰ دقیقه', '🍝', '#fecaca', '#b91c1c'],
    ['سالاد', 'سالاد فصل با سس کنجد', '۴ نفر · ۲۰ دقیقه', '🥗', '#bbf7d0', '#15803d']
  ];
  return shell({
    skin: 'kitchen',
    style: `
    body{--bg:#fbf7f1;--card:#fffdf9;--soft:#f5ede2;--brand:#b45309;--brand-soft:rgba(180,83,9,.10)}
    .hero{display:grid;grid-template-columns:1.1fr .9fr;gap:18px;padding:28px 0 12px;align-items:stretch}.intro{padding:28px;background:linear-gradient(145deg,#fffbeb,#fef3c7);border-radius:22px;border:1px solid #fde68a}.intro h1{font-size:1.6rem;line-height:1.5;margin:8px 0 10px;color:#78350f}.intro p{font-size:.8rem;line-height:2;color:#92400e;margin:0 0 18px;max-width:420px}.intro .search{background:#fff;border-color:#fcd34d;max-width:none}
    .feature{padding:22px;display:flex;flex-direction:column;justify-content:end;background:linear-gradient(145deg,#7c2d12,#b45309);color:#fff;border-radius:22px;min-height:270px}.feature .thumb{height:120px;background:rgba(255,255,255,.12);font-size:2.6rem;margin-bottom:16px}.feature h2{font-size:1.12rem;margin:0 0 6px}.feature p{font-size:.72rem;color:#fde68a;line-height:1.9;margin:0}
    .section-head{display:flex;justify-content:space-between;align-items:end;margin:26px 0 12px}.section-head h2{font-size:1.02rem;margin:0}.section-head span{font-size:.68rem;color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.recipe{overflow:hidden;transition:.2s}.recipe:hover{transform:translateY(-3px);box-shadow:0 16px 30px rgba(120,53,15,.10)}.recipe .thumb{height:145px;font-size:2.3rem}.recipe .body{padding:12px 14px 15px}.recipe h3{font-size:.82rem;margin:8px 0 5px}.recipe p{font-size:.66rem;color:var(--muted);margin:0}
    .stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}.stats div{background:rgba(255,255,255,.55);border:1px solid #fde68a;border-radius:11px;padding:9px 12px;font-size:.65rem;color:#92400e}.stats b{display:block;font-size:.95rem;color:#78350f}
    @media(max-width:760px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr 1fr}}@media(max-width:480px){.grid{grid-template-columns:1fr}}
    `,
    body: `
    <header class="nav"><div class="wrap nav-in"><a class="brand" href="/"><span class="mark" style="background:var(--brand)">آ</span>آشپزخانه</a><nav class="nav-links"><a href="#">دستور غذا</a><a href="#">صبحانه</a><a href="#">شیرینی</a><a href="#">نوشیدنی</a><a href="#">راهنمای آشپز</a></nav><div class="search"><span>⌕</span><input placeholder="دنبال چه دستوری هستید؟" data-search aria-label="جستجوی دستور"></div></div></header>
    <main class="wrap">
      <section class="hero"><div class="intro"><span class="badge">پیشنهاد امروز</span><h1>با مواد ساده،<br>یک وعدهٔ به‌یادماندنی بساز.</h1><p>دستورهای آزموده، قدم‌به‌قدم و بدون اصطلاحات پیچیده؛ مناسب آشپزهای تازه‌کار و حرفه‌ای.</p><div class="search"><span>⌕</span><input placeholder="مثلاً خورش قیمه" aria-label="جستجوی دستور اصلی"></div><div class="stats"><div><b>۲۴۰+</b>دستور خانگی</div><div><b>۱۵</b>دسته‌بندی</div><div><b>۷</b>راهنمای خرید</div></div></div>
      <article class="feature"><div class="thumb">🍲</div><span class="badge" style="background:rgba(255,255,255,.16);color:#fef3c7">آشپزخانهٔ فصل</span><h2>آبگوشت بادمجان،<br>با عطر نعنا و لیمو</h2><p>یک غذای گرم و سیرکننده برای شب‌های پاییزی؛ با نکته‌های دقیق برای جاافتادن درست.</p></article></section>
      <div class="chips"><button class="chip on" data-chip="all">همه</button><button class="chip" data-chip="غذای اصلی">غذای اصلی</button><button class="chip" data-chip="صبحانه">صبحانه</button><button class="chip" data-chip="دسر">دسر</button><button class="chip" data-chip="نوشیدنی">نوشیدنی</button><button class="chip" data-chip="سالاد">سالاد</button></div>
      <div class="section-head"><h2>دستورهای تازه</h2><span>آزموده در آشپزخانهٔ ما</span></div>
      <div class="grid">${recipes.map(([cat, title, meta, emoji, t1, t2]) => `<article class="card recipe" data-cat="${cat}"><div class="thumb" style="--t1:${t1};--t2:${t2}">${emoji}</div><div class="body"><span class="badge">${cat}</span><h3>${title}</h3><p>${meta}</p></div></article>`).join('')}</div><div class="empty">دستوری در این دسته پیدا نشد.</div>
    </main>`
  });
}

const RENDERERS = { bazaar, pulse, techline, weather, kitchen };

export function renderCamouflageSite(host = '', skin = '') {
  const id = RENDERERS[skin] ? skin : CAMOUFLAGE_SITE_IDS[0];
  const html = RENDERERS[id]();
  // Host is only used for a subtle local reference in metadata; keep escaped.
  // نصب‌های قبلی هنوز start_url=/ دارند؛ وقتی سایت در حالت اپ مستقل باز شود
  // مستقیم به درگاه ورود می‌رویم تا کاربر به‌جای سایت استتار، پنل را ببیند.
  // مسیر ورود به‌صورت کدگذاری‌شده ساخته می‌شود تا در سورس ریشه لو نرود.
  const standaloneBridge = `<script>(function(){try{var s=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;if(s&&location.pathname==='/')location.replace(String.fromCharCode(47,108,111,103,105,110));}catch(e){}})();</script>`;
  return html.replace('</head>', `${standaloneBridge}<meta name="generator" content="site-${escapeHtml(id)}"><link rel="canonical" href="https://${escapeHtml(String(host || '').replace(/^https?:\/\//, ''))}/"></head>`);
}
