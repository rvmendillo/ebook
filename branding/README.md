# Polymath brand guide

<img src="png/logo-lockup.png" alt="Polymath logo" height="96">

**Name:** Polymath — *someone who knows a lot about many subjects.*
**Tagline:** *Learn anything, one page at a time.*
**Voice:** friendly, clear, encouraging. Short sentences, no jargon without an explanation.

## The mark

An **open book** with a **spark of insight** above it: reading leads to the "aha!" moment. It works at every size from the App Store's 1024 px down to a 16 px favicon, and in a single colour for Android's themed icons.

| Asset | File |
|---|---|
| Mark (transparent) | [`src/mark.svg`](src/mark.svg) |
| Single-colour mark | [`src/mark-mono.svg`](src/mark-mono.svg) |
| Icon background | [`src/background.svg`](src/background.svg) |
| App icon (iOS / store, opaque 1024²) | `png/icon.png` |
| Android adaptive icon (foreground / background / monochrome) | `png/android-icon-*.png` |
| Splash image | `png/splash-icon.png` |
| Favicons, Apple touch icon, rounded SVG icon | `png/favicon-*.png`, `png/apple-touch-icon.png`, `png/icon-rounded.svg` |
| Logo lockups (light / dark backgrounds) | `png/logo-lockup.png`, `png/logo-lockup-dark.png` |
| Social / README banner (1280×640) | `png/banner.png` |

Keep clear space around the mark of at least ¼ of its height. Don't recolour the spark, stretch the mark or put it on busy photos.

## Colours

| Name | Hex | Use |
|---|---|---|
| Indigo | `#4F46E5` | Primary actions, links |
| Deep indigo | `#4338CA` | Icon/splash background, gradients |
| Violet | `#7C3AED` | Gradient end, accents |
| Night | `#1E1B4B` | Dark surfaces, text on amber |
| Amber | `#F59E0B` | Premium, the spark |
| Amber soft | `#FDE68A` | Highlights on dark |

Signature gradient: `linear-gradient(135deg, #1E1B4B, #4338CA, #7C3AED)`.

Subject colours: Mathematics `#2563EB` · Music `#DB2777` · Programming `#059669` · Science `#0891B2` · Languages `#EA580C` · Productivity `#7C3AED`.

## Typography

* **Brand / admin:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) 800 for headings, 500–700 for text.
* **Mobile app:** the system font (SF Pro on iOS, Roboto on Android) with heavy weights for headings — native and highly legible for long reading.
* **Code:** JetBrains Mono (admin) / the system monospace font (app).

## Regenerating the assets

Edit the SVGs in `src/`, then:

```bash
node branding/scripts/render-brand.mjs
```

The script renders every PNG with headless Chromium (Playwright) and copies them into `apps/mobile/assets/images` and `apps/admin/public`. Rebuild the apps to pick up a new icon.

**Renaming the app?** Change the `APP_NAME` repository variable (and `APP_BUNDLE_ID` before your first store release), then update the wordmark text in `scripts/render-brand.mjs` and the brand strings in `apps/mobile/src/components/brand.tsx` and `apps/admin`.
