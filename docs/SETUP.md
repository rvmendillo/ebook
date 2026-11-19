# Setup guide

This takes Polymath from **demo build** (sample library, test ads, simulated purchases) to a **live app** that sells subscriptions and credits and pulls the articles you publish from the admin studio.

You can do the steps in any order — every piece falls back to demo behaviour until it's configured.

| You'll need | Cost | Used for |
|---|---|---|
| [Supabase](https://supabase.com) project | free tier is fine | Content database, accounts, purchase records, image storage |
| [RevenueCat](https://www.revenuecat.com) project | free up to a revenue threshold | Subscriptions + credit packs on both stores |
| [Apple Developer Program](https://developer.apple.com/programs/) | $99 / year | App Store, TestFlight, in-app purchases, signed IPA |
| [Google Play Console](https://play.google.com/console) | $25 once | Play Store, in-app purchases |
| [Google AdMob](https://admob.google.com) | free | Ads for the free tier |

All keys go into **GitHub → Settings → Secrets and variables → Actions**. The full list is in [section 8](#8-github-secrets-and-variables-reference).

---

## 1. Supabase (content + accounts)

1. **Create a project** at supabase.com. Note the *project ref* (the `abcdefgh` in `https://abcdefgh.supabase.co`) and the database password.
2. **Create the tables.** Either
   - open *SQL Editor*, paste [`supabase/migrations/20261119000000_polymath_init.sql`](../supabase/migrations/20261119000000_polymath_init.sql), run it, then optionally run [`supabase/seed.sql`](../supabase/seed.sql) for the 13-item starter library; **or**
   - add the secrets `SUPABASE_ACCESS_TOKEN` (Account → Access tokens), `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD`, then run **Actions → Deploy Supabase backend** (tick *load the starter library* if you want it).
3. **Authentication → Sign In / Providers:** turn on **Allow anonymous sign-ins**. Every install gets a silent guest account that owns its purchases.
4. **Authentication → Email Templates:** readers sync their library with a 6-digit code. Add `{{ .Token }}` to the **Magic Link** and **Change Email Address** templates, e.g. `Your Polymath code is {{ .Token }}`.
5. **Make yourself an admin:** *Authentication → Users → Add user* (email + password, auto-confirm), then in the SQL editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
6. **Project Settings → API:** copy the **Project URL** and the **publishable (anon) key**. Add them as GitHub **variables** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (they're public by design — row-level security protects the data). Never put the service-role / secret key in the apps.

The schema's row-level security means anyone can read the catalogue and free text, but **premium text is only returned to subscribers, buyers and admins** — the database tests in `supabase/tests` prove each rule.

## 2. Admin studio

* **Hosted on GitHub Pages:** *Settings → Pages → Source: GitHub Actions*. The *Admin web app* workflow deploys on every push to `main`. If you set the `SUPABASE_*` variables it's pre-connected; otherwise open **Settings** in the admin and paste the URL + publishable key (saved in your browser).
* **Locally:** `cd apps/admin && npm install && npm run dev`.
* Sign in with the admin user from step 1.5. Load the starter library from *Settings* if you skipped the seed.

## 3. Payments: store products + RevenueCat

Polymath sells two things:

| What | Store product type | Suggested ids | RevenueCat |
|---|---|---|---|
| Premium membership | Auto-renewable subscription (one group) | `premium_monthly`, `premium_yearly` | Entitlement **`premium`**; offering **`default`** with *Monthly* and *Annual* packages |
| Credit packs | Consumable | `credits_10`, `credits_30`, `credits_70` | Products only (no entitlement) |

Credit pack ids and their credit amounts are edited in **Admin → Monetization** — keep them identical to the store ids. Each premium item's credit price is set in its editor.

### 3a. App Store Connect
1. *Agreements, Tax and Banking* — accept the Paid Apps agreement (purchases won't load without it).
2. Create the app with your bundle id (default `com.rvmendillo.polymath`, see `APP_BUNDLE_ID`).
3. *Monetization → Subscriptions:* create a group "Premium" with the two plans. *In-App Purchases:* create the consumables.
4. *Users and Access → Integrations → In-App Purchase* — create a key and upload it to RevenueCat (needed for StoreKit 2).

### 3b. Google Play Console
1. Create the app with the same package name. Play only lets you add products after an app bundle has been uploaded — upload the `.aab` from the Android workflow to an **internal testing** track first.
2. *Monetize → Subscriptions:* `premium_monthly`, `premium_yearly` (one base plan each). *In-app products:* the credit packs.
3. Give RevenueCat access with a Google Cloud service account ([RevenueCat guide](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)).

### 3c. RevenueCat
1. Create a project, add an **App Store** app and a **Play Store** app, and import the products.
2. *Entitlements:* create `premium` and attach both subscription products.
3. *Offerings:* make `default` current, with a **Monthly** and an **Annual** package.
4. *API keys:* copy the **public** app-specific keys → GitHub secrets `REVENUECAT_IOS_KEY` (`appl_…`) and `REVENUECAT_ANDROID_KEY` (`goog_…`).
5. Copy a **secret** API key (v1) → GitHub secret `REVENUECAT_SECRET_KEY`.
6. Pick a long random string (e.g. `openssl rand -hex 32`) → GitHub secret `REVENUECAT_WEBHOOK_AUTH`.
7. Run **Actions → Deploy Supabase backend** — it stores both secrets for the edge functions and deploys them.
8. *Integrations → Webhooks:* URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, **Authorization header value** = the same `REVENUECAT_WEBHOOK_AUTH` string. Send a test event — it should return 200.

How it fits together: the app buys through RevenueCat, then calls the `sync-purchases` edge function, which asks RevenueCat's API what the user really owns and writes the subscription and credits to Supabase. The webhook repeats the same sync for renewals, cancellations and refunds. Credits are spent with the `unlock_with_credits` database function, which is atomic and can't double-spend.

> Purchases are live only when **both** RevenueCat keys and Supabase are configured — otherwise the app simulates them (and says so on the paywall).

## 4. AdMob (free tier)

1. Create two AdMob apps (iOS and Android). Their **app ids** (`ca-app-pub-…~…`) → secrets `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID`.
2. For each app create a **Rewarded**, an **Interstitial** and a **Banner** ad unit → secrets `ADMOB_IOS_REWARDED`, `ADMOB_IOS_INTERSTITIAL`, `ADMOB_IOS_BANNER`, `ADMOB_ANDROID_REWARDED`, `ADMOB_ANDROID_INTERSTITIAL`, `ADMOB_ANDROID_BANNER`.
3. *Privacy & messaging:* publish a **GDPR** message (and an **IDFA explainer** for iOS). The app shows them automatically through Google's UMP SDK and offers *Privacy choices* in Account when required.
4. Host an `app-ads.txt` on the website listed in your store listings.

Until these are set — and in every debug build — the app uses Google's official **test ads**, so you can't get your account flagged while developing. Ad behaviour (rewarded vs interstitial vs off, how long an item stays open, banners) is controlled from **Admin → Monetization** without a new build.

## 5. Android signing and Google Play

Without a key the release build is signed with the debug key (installable, but Play won't accept it). Create an **upload key** once:

```bash
keytool -genkeypair -v -keystore polymath-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 polymath-upload.jks   # macOS: base64 -i polymath-upload.jks
```

Secrets: `ANDROID_KEYSTORE_BASE64` (the base64 output), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD` (if different). Keep the `.jks` file safe — you need the same key for every update. Upload the `.aab` artifact in Play Console (enable *Play App Signing*).

## 6. iOS signing, TestFlight and the App Store

The iOS workflow **always** produces an IPA:

* **Unsigned** (no secrets): install with [AltStore](https://altstore.io) or [Sideloadly](https://sideloadly.io) using your Apple ID (free accounts: 7-day apps), or re-sign it.
* **Signed for the App Store** when these secrets exist:

| Secret | How to get it |
|---|---|
| `IOS_TEAM_ID` | developer.apple.com → Membership details |
| `IOS_DIST_CERT_P12_BASE64` | Create an **Apple Distribution** certificate, export it from Keychain Access as `.p12`, then `base64 -i cert.p12 \| pbcopy` |
| `IOS_DIST_CERT_PASSWORD` | The password you set when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Certificates, IDs & Profiles → Profiles → **App Store** profile for your bundle id → download → `base64 -i profile.mobileprovision \| pbcopy` |
| `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_P8` | App Store Connect → Users and Access → Integrations → **App Store Connect API** → generate a key (App Manager); paste the full `.p8` text into the last secret |

Then run **Actions → iOS build (IPA) → Run workflow** with *Upload to TestFlight* ticked, or push a `v*` tag. Build numbers come from the workflow run number, so every upload is unique.

Before submitting for review: fill in the privacy nutrition label (AdMob collects device identifiers for advertising; RevenueCat processes purchase history), add a privacy policy URL, and set real Terms/Privacy links in **Admin → Monetization** (Apple requires them on the paywall, which already shows them).

## 7. Versions and releases

* `APP_VERSION` (repository variable, default `1.0.0`) is the marketing version; the build number is the GitHub run number.
* `git tag v1.0.0 && git push origin v1.0.0` builds both apps and attaches the IPA, APK and AAB to a GitHub Release.

## 8. GitHub secrets and variables reference

**Variables** (*Settings → Secrets and variables → Actions → Variables*) — not secret:

| Name | Example | Used by |
|---|---|---|
| `APP_NAME` | `Polymath` | App display name |
| `APP_BUNDLE_ID` | `com.rvmendillo.polymath` | iOS bundle id / Android package — **can't change after release** |
| `APP_VERSION` | `1.0.0` | Marketing version |
| `SUPABASE_URL` | `https://abcd.supabase.co` | Apps + admin |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Apps + admin |

**Secrets:**

| Name | Needed for |
|---|---|
| `REVENUECAT_IOS_KEY`, `REVENUECAT_ANDROID_KEY` | Real purchases in the app |
| `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH` | Purchase verification (edge functions) |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | *Deploy Supabase backend* workflow |
| `ADMOB_IOS_APP_ID`, `ADMOB_ANDROID_APP_ID` | Live ads |
| `ADMOB_{IOS,ANDROID}_{REWARDED,INTERSTITIAL,BANNER}` | Live ad units |
| `IOS_TEAM_ID`, `IOS_DIST_CERT_P12_BASE64`, `IOS_DIST_CERT_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64` | Signed IPA |
| `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_P8` | TestFlight upload |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Play-ready signing |

For local builds put the same values in `apps/mobile/.env` (copy [`.env.example`](../apps/mobile/.env.example)).

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| App shows "Sample library" | `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` weren't set when the app was built — set them and rebuild. |
| Paywall says "Demo build — purchases are simulated" | RevenueCat keys (and Supabase) missing from the build. |
| Plans don't load on a device | Paid Apps agreement not signed, products not "Ready to Submit", or the offering has no packages. Test with a sandbox / licence-tester account. |
| "We couldn't confirm your access" after buying | The `sync-purchases` function isn't deployed or `REVENUECAT_SECRET_KEY` is wrong — check *Edge Functions → Logs* in Supabase. |
| Admin says "Permission denied" when saving | Your user isn't in `public.admins` (step 1.5). |
| Guests can't buy credits | Anonymous sign-ins are disabled (step 1.3). |
| No ads in a release build | New AdMob units take up to an hour to serve; check consent was given; use the test ids while developing. |
