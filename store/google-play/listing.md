# Google Play store listing — copy & paste

Paste these into **Play Console → Grow users → Store presence → Main store listing**. Limits are Google's.

## App name (≤ 30)

```
Polymath: Learn Math & Music
```

## Short description (≤ 80)

```
Math, music & coding lessons. Free with one ad, or go Premium for no ads.
```

## Full description (≤ 4000)

```
Polymath is a pocket library for curious minds — bite-size tips, step-by-step tutorials, in-depth articles and complete ebooks on mathematics, music, programming, science, languages and productivity.

READ IT YOUR WAY
• Free articles and tips open after one short ad
• Polymath Premium unlocks every ebook and tutorial — and removes all ads
• Or pay as you go: use credits to own a single ebook forever

MADE FOR LEARNING
• Real math: equations are typeset beautifully, at any text size
• Real code: syntax-highlighted examples in Python, JavaScript, Java, C++, Swift and more
• Real music: sheet music right inside the lesson
• Table of contents for long ebooks, reading progress, bookmarks
• Light, sepia and dark reading themes and adjustable text size
• Read offline once an item is opened

SUBJECTS
∑ Mathematics — from mental math tricks to calculus
♪ Music — reading notation, theory, smarter practice
</> Programming — Python, algorithms, APIs, Git
⚛ Science, Aa Languages, ⚡ Productivity — and more every week

PREMIUM
Polymath Premium is an auto-renewing subscription (monthly or yearly). Cancel anytime in Google Play → Payments & subscriptions. Credits are consumable in-app purchases used to own individual premium items.

Questions or ideas? Contact us from the app (Account → Contact support).
```

## Categorisation

| Field | Value |
|---|---|
| App category | **Education** |
| Tags | Education, Reference, Books |
| Contact email | your support email (must be monitored) |
| Website | optional |
| Privacy policy | required — the same URL you set in *Admin → Monetization* |

## Graphics (in this folder)

| Asset | File | Google's spec |
|---|---|---|
| App icon | `icon-512.png` | 512 × 512 PNG, ≤ 1 MB |
| Feature graphic | `feature-graphic.jpg` | 1024 × 500 JPEG/PNG |
| Phone screenshots | `screenshots/*.jpg` | 2–8 images, 9:16, ≥ 1080 px for promotion eligibility |

Regenerate with `node branding/scripts/render-store.mjs <web-preview-url>` (see the script header).

## Release notes

`whatsnew/whatsnew-en-US` (≤ 500 characters) is sent with every upload from the Android workflow. Add `whatsnew-<locale>` files for other languages.
