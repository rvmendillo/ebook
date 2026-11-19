#!/usr/bin/env node
/**
 * Renders Google Play store-listing graphics into store/google-play/:
 *   icon-512.png            hi-res icon (512×512)
 *   feature-graphic.jpg     1024×500
 *   screenshots/*.jpg       1080×1920 captioned phone screenshots
 *
 * Screenshots are taken from the web preview of the mobile app:
 *   cd apps/mobile && npx expo export --platform web --output-dir /tmp/polymath-web
 *   npx serve -s /tmp/polymath-web -l 8081          (any static server with SPA fallback)
 *   node branding/scripts/render-store.mjs http://localhost:8081
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'store', 'google-play');
const shotsDir = join(out, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
const appUrl = process.argv[2] ?? 'http://localhost:8081';

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(join(globalRoot, 'noop.js'))('playwright');
  }
}

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const MARK = inner(readFileSync(join(root, 'branding/src/mark.svg'), 'utf8'));
const BG = inner(readFileSync(join(root, 'branding/src/background.svg'), 'utf8'));
const icon = (
  size,
  radius = 0,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs><clipPath id="r"><rect width="1024" height="1024" rx="${radius}"/></clipPath></defs>
  <g clip-path="url(#r)">${BG}<g transform="translate(512 512) scale(0.9) translate(-512 -512)">${MARK}</g></g></svg>`;

const FONT =
  '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">';
const page = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>
html,body{margin:0}#c{width:${w}px;height:${h}px;overflow:hidden;position:relative;font-family:'Plus Jakarta Sans',sans-serif}
</style></head><body><div id="c">${body}</div></body></html>`;

const feature = `
<div style="position:absolute;inset:0;background:linear-gradient(135deg,#1E1B4B 0%,#4338CA 50%,#7C3AED 100%)"></div>
<div style="position:absolute;inset:0;background:radial-gradient(circle at 85% 15%,rgba(253,230,138,.25),transparent 45%)"></div>
<div style="position:absolute;left:70px;top:0;bottom:0;display:flex;align-items:center;gap:40px;color:#fff">
  <div style="filter:drop-shadow(0 18px 36px rgba(8,6,40,.5))">${icon(230, 230)}</div>
  <div>
    <div style="font-size:84px;font-weight:800;letter-spacing:-2.5px;line-height:1">Polymath</div>
    <div style="font-size:30px;font-weight:600;opacity:.92;margin-top:14px">Learn anything, one page at a time.</div>
    <div style="display:flex;gap:10px;margin-top:26px">
      ${['∑ Math', '♪ Music', '&lt;/&gt; Code', '⚛ Science']
        .map(
          (t) =>
            `<span style="font-size:21px;font-weight:700;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3)">${t}</span>`,
        )
        .join('')}
    </div>
  </div>
</div>`;

const SCREENS = [
  { file: '1-home', path: '/', caption: 'Learn math, music<br>&amp; code', scheme: 'light' },
  {
    file: '2-reader',
    path: '/read/{music}',
    caption: 'Real math, code<br>&amp; sheet music',
    scheme: 'light',
    watchAd: true,
  },
  { file: '3-free-with-ad', path: '/read/{free}', caption: 'Free articles —<br>one short ad', scheme: 'light' },
  { file: '4-premium', path: '/paywall', caption: 'Go Premium or<br>pay per ebook', scheme: 'light' },
  { file: '5-dark', path: '/explore', caption: 'Find anything,<br>day or night', scheme: 'dark' },
];

const framed = (img, caption) => `
<div style="position:absolute;inset:0;background:linear-gradient(160deg,#1E1B4B 0%,#4338CA 55%,#7C3AED 100%)"></div>
<div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 8%,rgba(253,230,138,.22),transparent 40%)"></div>
<div style="position:absolute;top:110px;left:0;right:0;text-align:center;color:#fff;font-size:88px;font-weight:800;letter-spacing:-2px;line-height:1.08">${caption}</div>
<div style="position:absolute;left:120px;top:420px;width:840px;height:1640px;border-radius:84px;background:#0B0D1C;padding:18px;box-sizing:border-box;box-shadow:0 40px 80px rgba(8,6,40,.55)">
  <img src="${img}" style="width:100%;height:100%;border-radius:68px;display:block;object-fit:cover;object-position:top">
</div>`;

const pw = loadPlaywright();
const browser = await pw.chromium.launch();

// Static graphics
const tab = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await tab.setContent(page(feature, 1024, 500), { waitUntil: 'networkidle' });
await tab.evaluate(() => document.fonts.ready);
await tab.locator('#c').screenshot({ path: join(out, 'feature-graphic.jpg'), type: 'jpeg', quality: 92 });
await tab.setViewportSize({ width: 512, height: 512 });
await tab.setContent(page(icon(512), 512, 512), { waitUntil: 'networkidle' });
await tab.locator('#c').screenshot({ path: join(out, 'icon-512.png') });
console.log('✓ feature-graphic.jpg, icon-512.png');

// Screenshots from the running web preview
const lib = JSON.parse(readFileSync(join(root, 'apps/mobile/src/demo/library.json'), 'utf8'));
const ids = {
  free: lib.contents.find((c) => c.slug === 'pythagorean-theorem-visually').id,
  music: lib.contents.find((c) => c.slug === 'read-sheet-music-in-10-minutes').id,
};
for (const s of SCREENS) {
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 784 },
    deviceScaleFactor: 2,
    colorScheme: s.scheme,
  });
  const p = await ctx.newPage();
  await p.goto(appUrl + s.path.replace(/\{(\w+)\}/, (_, k) => ids[k]), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  if (s.watchAd) {
    await p.getByText('Watch ad & read free').click();
    await p.waitForTimeout(3500);
    const reader = p.frames().find((f) => f !== p.mainFrame());
    await reader?.evaluate(() => {
      const el = document.querySelector('.pm-music');
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 220);
    });
    await p.waitForTimeout(800);
  }
  // Store screenshots shouldn't show the demo-build notices.
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('div')) {
      const t = el.textContent ?? '';
      if (el.children.length === 0 && (t.startsWith('Sample library') || t.startsWith('Demo build'))) {
        el.parentElement?.style.setProperty('display', 'none');
      }
    }
  });
  await p.waitForTimeout(300);
  const png = await p.screenshot();
  await ctx.close();
  const comp = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await comp.setContent(page(framed(`data:image/png;base64,${png.toString('base64')}`, s.caption), 1080, 1920), {
    waitUntil: 'networkidle',
  });
  await comp.evaluate(() => document.fonts.ready);
  await comp.locator('#c').screenshot({ path: join(shotsDir, `${s.file}.jpg`), type: 'jpeg', quality: 90 });
  await comp.close();
  console.log(`✓ screenshots/${s.file}.jpg`);
}
await browser.close();
