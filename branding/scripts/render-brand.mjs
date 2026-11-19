#!/usr/bin/env node
/**
 * Renders every PNG brand asset (app icons, adaptive icon layers, splash, favicons,
 * README banner) from the SVG sources in branding/src using headless Chromium.
 *
 *   node branding/scripts/render-brand.mjs
 *
 * Requires Playwright with a Chromium build (`npm i -g playwright && npx playwright install chromium`).
 */
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const src = (f) => readFileSync(join(root, 'branding', 'src', f), 'utf8');
const out = join(root, 'branding', 'png');
mkdirSync(out, { recursive: true });

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
const MARK = inner(src('mark.svg'));
const MONO = inner(src('mark-mono.svg'));
const BG = inner(src('background.svg'));

/** Compose a square 1024-unit artboard rendered at `size` px. */
function artboard({ size = 1024, background = false, mark = MARK, scale = 1, dy = 0, radius = 0 }) {
  const clip = radius
    ? `<clipPath id="pm-clip"><rect width="1024" height="1024" rx="${radius}"/></clipPath>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
    <defs>${clip}</defs>
    <g ${radius ? 'clip-path="url(#pm-clip)"' : ''}>
      ${background ? BG : ''}
      <g transform="translate(512 ${512 + dy}) scale(${scale}) translate(-512 -512)">${mark}</g>
    </g>
  </svg>`;
}

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">';

const page = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}
<style>html,body{margin:0;padding:0;background:transparent}#c{width:${w}px;height:${h}px;overflow:hidden}
*{font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif}</style></head><body><div id="c">${body}</div></body></html>`;

const ICON_ROUNDED = (size) => artboard({ size, background: true, scale: 0.84, radius: 230 });

const banner = (w, h) => `
<div style="width:${w}px;height:${h}px;position:relative;display:flex;align-items:center;gap:48px;padding:0 80px;box-sizing:border-box;
  background:linear-gradient(135deg,#312E81 0%,#4338CA 45%,#7C3AED 100%);color:#fff;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 78% 18%,rgba(253,230,138,.25),transparent 45%),radial-gradient(circle at 10% 90%,rgba(255,255,255,.12),transparent 40%)"></div>
  <div style="position:relative;filter:drop-shadow(0 24px 48px rgba(15,10,60,.45))">${ICON_ROUNDED(260)}</div>
  <div style="position:relative">
    <div style="font-size:112px;font-weight:800;letter-spacing:-3px;line-height:1">Polymath</div>
    <div style="font-size:38px;font-weight:500;opacity:.92;margin-top:18px">Learn anything, one page at a time.</div>
    <div style="display:flex;gap:12px;margin-top:34px;flex-wrap:nowrap;white-space:nowrap">
      ${['∑ Math', '♪ Music', '</> Programming', '⚛ Science', '✦ & more']
        .map((t) => `<span style="font-size:22px;font-weight:700;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28)">${t
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</span>`)
        .join('')}
    </div>
  </div>
</div>`;

const lockup = (dark) => `
<div style="display:flex;align-items:center;gap:28px;padding:24px 36px;width:fit-content">
  ${ICON_ROUNDED(160)}
  <div>
    <div style="font-size:88px;font-weight:800;letter-spacing:-2.5px;line-height:1;color:${dark ? '#FFFFFF' : '#1E1B4B'}">Polymath</div>
    <div style="font-size:26px;font-weight:600;margin-top:10px;color:${dark ? '#C7D2FE' : '#6366F1'}">Learn anything, one page at a time.</div>
  </div>
</div>`;

const jobs = [
  // iOS / universal store icon — must be opaque, square, 1024x1024 (iOS rounds the corners itself).
  { file: 'icon.png', size: 1024, svg: artboard({ background: true, scale: 0.9 }), opaque: true },
  // Android adaptive icon layers (foreground content kept inside the 66% safe zone).
  { file: 'android-icon-foreground.png', size: 1024, svg: artboard({ scale: 0.6 }) },
  { file: 'android-icon-background.png', size: 1024, svg: artboard({ background: true, mark: '' }), opaque: true },
  { file: 'android-icon-monochrome.png', size: 1024, svg: artboard({ mark: MONO, scale: 0.6 }) },
  // Splash screen image (transparent; shown on the brand background colour).
  { file: 'splash-icon.png', size: 1024, svg: artboard({ scale: 1 }) },
  // Web / admin favicons.
  { file: 'favicon-512.png', size: 512, svg: ICON_ROUNDED(512) },
  { file: 'favicon-192.png', size: 192, svg: ICON_ROUNDED(192) },
  { file: 'favicon-48.png', size: 48, svg: ICON_ROUNDED(48) },
  { file: 'apple-touch-icon.png', size: 180, svg: artboard({ size: 180, background: true, scale: 0.84 }), opaque: true },
];

const pw = loadPlaywright();
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const tab = await ctx.newPage();

async function shoot(html, w, h, file, { opaque = false } = {}) {
  await tab.setViewportSize({ width: w, height: h });
  await tab.setContent(page(html, w, h), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  const el = await tab.$('#c');
  await el.screenshot({ path: join(out, file), omitBackground: !opaque });
  console.log('✓', file);
}

for (const j of jobs) {
  await shoot(j.svg, j.size, j.size, j.file, { opaque: j.opaque });
}
await shoot(banner(1280, 640), 1280, 640, 'banner.png', { opaque: true });

// Lockups need their natural width.
for (const [file, dark] of [['logo-lockup.png', false], ['logo-lockup-dark.png', true]]) {
  await tab.setViewportSize({ width: 1200, height: 260 });
  await tab.setContent(page(lockup(dark), 1200, 260), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  const el = await tab.$('#c > div');
  await el.screenshot({ path: join(out, file), omitBackground: true });
  console.log('✓', file);
}
await browser.close();

// Stand-alone SVGs for the web admin (favicon + logo mark).
writeFileSync(join(out, 'icon-rounded.svg'), ICON_ROUNDED(512));
writeFileSync(join(out, 'icon-square.svg'), artboard({ background: true, scale: 0.84 }));

// Distribute to the apps.
const copies = {
  'apps/mobile/assets/images': ['icon.png', 'android-icon-foreground.png', 'android-icon-background.png', 'android-icon-monochrome.png', 'splash-icon.png'],
  'apps/admin/public': ['favicon-48.png', 'favicon-192.png', 'favicon-512.png', 'apple-touch-icon.png', 'icon-rounded.svg'],
};
for (const [dir, files] of Object.entries(copies)) {
  const target = join(root, dir);
  mkdirSync(target, { recursive: true });
  for (const f of files) copyFileSync(join(out, f), join(target, f));
}
copyFileSync(join(out, 'favicon-48.png'), join(root, 'apps/mobile/assets/images/favicon.png'));
console.log('Brand assets rendered to branding/png and copied into apps/.');
