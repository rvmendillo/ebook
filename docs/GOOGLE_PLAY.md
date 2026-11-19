# Publishing on Google Play as an individual

**Short answer:** use your **own personal developer account**. It needs the fewest documents (an ID, your address, a phone number, an email and a card), you keep full ownership of the app and its income, and this repository already automates the uploads. The one real hurdle for new personal accounts is a **14-day closed test with at least 12 testers** before you can publish to everyone — plan for about 3–4 weeks from sign-up to "live".

*(Rules checked against Google's help pages in November 2026 — links at the bottom. Google changes these often, so double-check anything that looks different in your console.)*

---

## 1. Personal or organization account?

| | **Personal** (recommended) | Organization |
|---|---|---|
| Registration fee | $25 one-time | $25 one-time |
| Documents | Government photo ID + proof of address (identity verification), phone + email verified by code, a Google payments profile in your legal name | **D-U-N-S number** (free, up to ~30 days to get), registered business, organization website, business documents |
| Before going public | **Closed test: ≥ 12 testers opted in for 14 days in a row**, then "Apply for production" (review usually ≤ 7 days) | No closed-test requirement |
| Shown publicly on your listing | Legal name, country, developer email — and **your full address if you monetize** (sell subscriptions/credits). Phone only if you're a "trader" in the EU/UK | Organization name, address, D-U-N-S, email, phone |
| Required for | — | Finance, health, VPN and government apps (not this app) |

**Fewest documents → personal account.** Only choose organization if you already have a registered business (and want your business address shown instead of your home address).

> 🏠 **Privacy tip:** because Polymath sells subscriptions and credits, Google shows your legal address on the store listing. If you don't want your home address public, use a business address you're legally entitled to (some countries allow a registered/virtual office), or publish as an organization.

## 2. Checklist — what to have ready

- [ ] A Google account just for publishing (recommended), with 2-step verification
- [ ] Government photo ID + a proof-of-address document (bank statement, utility bill…)
- [ ] A phone number and a contact email you'll keep (they must stay working)
- [ ] A credit/debit card for the $25 fee (prepaid cards aren't accepted)
- [ ] For payouts: a bank account (verification can take up to 5 days)
- [ ] A **privacy policy URL** (required for apps with ads/purchases) and a support email
- [ ] The account-deletion page URL: `https://<you>.github.io/<repo>/delete-account.html` (ships with the admin site; edit the email in `apps/admin/public/delete-account.html`)

## 3. Step by step

### Week 0 — account (1–3 days)
1. Go to [play.google.com/console](https://play.google.com/console), choose **Yourself** (personal account), pay the $25 and complete identity verification.
2. **Setup → Payments profile:** set up your merchant account and bank account so you can sell subscriptions and credits.

### Week 0 — create the app (1 day)
3. **Create app:** name *Polymath*, default language, **App**, **Free** (in-app purchases are still allowed), accept the declarations.
4. **Upload the first build manually** (Google requires the first upload in the browser): run *Actions → Android build (APK + AAB)* with your upload key configured (see [SETUP §5](SETUP.md#5-android-signing-and-google-play)), download the `.aab` artifact, then **Testing → Internal testing → Create release** → upload → roll out. Accept **Play App Signing** when asked.
5. **Store listing:** paste the texts from [`store/google-play/listing.md`](../store/google-play/listing.md) and upload the icon, feature graphic and screenshots from [`store/google-play/`](../store/google-play).
6. **App content** (Policy → App content) — suggested answers:

| Section | Answer for Polymath |
|---|---|
| Privacy policy | Your policy URL |
| App access | All functionality is available without special access (readers get a guest account automatically) |
| Ads | **Yes**, the app contains ads |
| Content rating | Fill in the IARC questionnaire (Education/Reference, no violence etc.) — typically *Everyone / PEGI 3* |
| Target audience | **13+** (choosing children's ages brings the Families policy and child-safe ad settings) |
| Data safety | See the table below |
| Advertising ID | **Yes** — used by AdMob for advertising and analytics |
| Account deletion | In-app: *Account → Delete account*; web: your `delete-account.html` URL |
| Government / financial / health / news | No |

**Data safety form** (what the app and its SDKs collect):

| Data type | Collected by | Purpose | Optional? |
|---|---|---|---|
| Device or other IDs (advertising ID) | AdMob | Advertising, analytics, fraud prevention | Required for ads; users control personalisation |
| App interactions, diagnostics | AdMob | Advertising, analytics | — |
| Purchase history | Google Play Billing / RevenueCat | App functionality | — |
| User IDs | Supabase, RevenueCat | App functionality, account management | — |
| Email address | Supabase (only if the reader adds it to sync) | Account management | Optional |

Data is encrypted in transit (HTTPS) ✓ · Users can request deletion ✓ (in-app and web).

7. **Monetize → Products:** create the subscriptions `premium_monthly`, `premium_yearly` and the in-app products `credits_10`, `credits_30`, `credits_70` (the AAB you uploaded already contains Google Play Billing). Then connect RevenueCat ([SETUP §3](SETUP.md#3-payments-store-products--revenuecat)).
8. **Setup → License testing:** add your testers' Gmail addresses so they can make test purchases for free.

### Weeks 1–2 — the closed test (14 days)
9. **Testing → Closed testing → Create track** (the default "Alpha" track is fine) → add the AAB → **Testers:** create a Google Group (easiest) and add its email → copy the **opt-in link**.
10. Get **at least 12 people** (aim for 15–20 to be safe) to open the opt-in link with the Google account they use on their phone, install the app **from Google Play**, and stay opted in. The 14 days must be consecutive — anyone who leaves early doesn't count.
11. Ask testers to really use it (read a few articles, try the paywall with a test card) and send feedback — the production application asks how engaged your testers were and what you changed.
12. Ship an update or two during the test (`git tag v1.0.1 && git push --tags`, or run the workflow with track `alpha`) — it shows you're acting on feedback.

### Week 3 — go live
13. **Dashboard → Apply for production**, answer the questions about your test, app and readiness. Review usually takes **7 days or less**.
14. When approved: **Production → Create release** (or run the workflow with track `production`). Consider a staged rollout.

## 4. Automating uploads from GitHub

After the first manual upload (step 4):

1. In Google Cloud (any project): enable the **Google Play Android Developer API**, create a **service account**, create a **JSON key**.
2. Play Console → **Users and permissions → Invite new user** → the service account's email → app permissions: *Release apps to testing tracks* and *Release to production…*.
3. GitHub secret **`PLAY_SERVICE_ACCOUNT_JSON`** = the whole JSON file. (The `ANDROID_KEYSTORE_*` secrets must be set too — Play only accepts AABs signed with your upload key.)
4. Now:
   - **Actions → Android build (APK + AAB) → Run workflow → play_track:** `internal`, `alpha` (closed testing), `beta` (open testing) or `production`.
   - **Push a `v*` tag** → uploads to the track in the `PLAY_TRACK` repository variable (default `internal`).
   - Release notes come from [`store/google-play/whatsnew/`](../store/google-play/whatsnew).
   - Version codes come from the GitHub run number, so every upload is higher than the last.

If an upload fails with *"Only releases with status draft may be created on draft app"*, the app hasn't been rolled out anywhere yet — choose `play_status: draft` (or finish step 4 manually first).

## 5. Should I use a third party instead?

| Option | Verdict |
|---|---|
| **Your own personal account + this repo's workflow** | ✅ **Recommended.** You own the app, the reviews and the revenue; the fewest documents; fully automated after the first upload. |
| **Organization account** | 👍 Only if you already have a registered business: skips the 12-tester test but needs a D-U-N-S number and business paperwork. |
| **Release tools** (fastlane, Expo's `eas submit`, GitHub Actions like here) | ✅ Fine — they publish to *your* account; they don't remove any requirement. |
| **Tester services / tester-exchange communities** for the 12 testers | ⚠️ Allowed in principle, but Google checks engagement and can reject low-quality tests. Friends, family, classmates or your audience are better; use these only to top up. |
| **"We publish it on our account" services / agencies** | ❌ Avoid. The app, listing, reviews and money legally belong to *their* account; they can change or remove it, and if their account is banned your app goes with it. Getting it back needs an app transfer they must approve. |
| **Buying or renting an "aged" developer account** | ❌ Never. Accounts are tied to a verified identity; this breaks Google's terms and gets accounts — and linked accounts — terminated. |
| **Skipping Google Play** (APK on GitHub, other stores) | ⚠️ Possible for testing, but **Google Play Billing won't work** outside Play (no subscriptions/credits), and Android's developer verification blocks apps from unverified developers on certified devices in some countries from Sept 30 2026 (more countries in 2027) — so you'd verify your identity anyway. |

## 6. Timeline at a glance

| Day | Milestone |
|---|---|
| 0–3 | Account created and verified; payments profile set up |
| 1–3 | App created, first AAB on internal testing, store listing + app content done |
| 3 | Closed test starts with 12+ testers |
| 17 | 14 days complete → apply for production |
| ~24 | Approved → publish to production |

---

**Sources (Google):** [App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465) · [Required information to create a Play Console developer account](https://support.google.com/googleplay/android-developer/answer/13628312) · [Choose a developer account type](https://support.google.com/googleplay/android-developer/answer/13634885) · [Android developer verification](https://developer.android.com/developer-verification)
