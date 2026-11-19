# Monetization

Polymath combines three revenue streams. All the rules live in one small function, [`shared/access.ts`](../shared/access.ts), which is unit-tested and also enforced by the database.

| Reader | Free item | Premium item |
|---|---|---|
| **Free tier** | Opens after a short ad (rewarded or interstitial); stays open for *N* hours | Paywall: subscribe, or own it with credits |
| **Owns the item** (spent credits) | — | Opens, forever, on every device signed in to the account |
| **Premium subscriber** | Opens, no ads | Opens |

## 1. Ads for the free tier (Google AdMob)

* **Before free content:** a *rewarded* ad ("Watch ad & read free") — the best-paying format, and the reader chooses to watch it — or an *interstitial*. Set it in **Admin → Monetization → Ad before free content**, or turn it off.
* **Unlock window:** one ad keeps that item open for `unlock_hours` (default 24).
* **Banners:** adaptive banners at the bottom of the Home, Explore and category screens, for free readers only. Toggle in the admin.
* **Never blocks readers:** if there's no ad to show (no fill, no consent, offline) the item opens anyway — users shouldn't be punished for an empty ad auction.
* **Privacy:** Google UMP consent form for the EEA/UK/Switzerland and Apple's App Tracking Transparency prompt are shown before the Ads SDK starts; non-personalised ads are requested when the reader declines. *Account → Privacy choices* lets readers change their mind.
* Debug builds always use Google's test ads.

The ad settings are remote config (`app_config` table), so you can change them without shipping an update.

## 2. Premium subscription

* Monthly and yearly plans (any packages in RevenueCat's current offering appear — weekly and lifetime work too). The paywall computes the yearly saving from the store prices.
* Unlocks every premium item and removes all ads.
* **Server-verified:** after a purchase the app calls `sync-purchases`; the edge function asks RevenueCat what the user owns and stores it in `subscriptions`. Premium text (`content_bodies`) is only returned by the database while that subscription is active — a modified app can't read it.
* Renewals, cancellations, billing issues and refunds arrive through the RevenueCat webhook.
* *Restore purchases* (paywall and Account) and *Manage subscription* (opens the App Store / Play subscription page) are included, as the stores require.

## 3. Pay on demand — credits

Readers who don't want a subscription can **own** individual premium ebooks and tutorials:

1. They buy a **credit pack** (consumable in-app purchase), e.g. 10 / 30 / 70 credits.
2. `sync-purchases` verifies each store transaction with RevenueCat and adds it to `credit_ledger` — each transaction can be credited only once.
3. Spending calls the `unlock_with_credits` database function: it checks the price, takes an advisory lock so two taps can't spend the same balance, writes a `spend` row and an `unlocks` row in one transaction.
4. Owned items stay readable forever, are listed under **Library → Owned**, and follow the reader to new devices once they add their email (*Account → Sync your library*).

**Why credits instead of one store product per article?** Apple and Google need every in-app product to be created in their consoles, so a product per article doesn't scale for content you publish every week. Consumables that unlock a specific item are also not restorable through the store, which can get an app rejected. Credits are the standard pattern (comics, audiobooks, fiction apps): products never change, you price each item in credits from the admin studio, and ownership is restorable from your server.

**Pricing:** set the credit price per item in its editor (empty = subscribers only) and the packs in **Admin → Monetization → Credit packs**. A common setup is 1 credit ≈ $0.15–0.20, with bigger packs giving better value — e.g. $1.99 / 10, $4.99 / 30, $9.99 / 70, and items at 5 (article) to 15 (ebook) credits.

Refunds reported by the store add a negative `refund` row; admins can gift credits from **Readers & sales**.

## 4. Store review checklist

* Paywall shows price, period, auto-renewal terms, *Restore purchases*, and links to Terms and Privacy ✓
* Credits are consumable, never expire and are only spent on digital content ✓
* Free content is reachable without paying ✓
* ATT prompt has a usage description (`app.config.ts`) ✓
* Replace the placeholder Terms/Privacy links in **Admin → Monetization** before submitting.
* Declare advertising data use (AdMob) in App Store privacy details and the Play Data safety form.

## 5. Testing purchases

* **iOS:** a sandbox tester (App Store Connect → Users and Access → Sandbox) or a StoreKit configuration file in Xcode; TestFlight builds use the sandbox automatically.
* **Android:** add licence testers in Play Console and install from the internal testing track.
* RevenueCat's dashboard shows every sandbox transaction; Supabase's `subscriptions` and `credit_ledger` tables (and **Admin → Readers & sales**) show what the server recorded.
* In demo builds everything is simulated; *Account → Reset demo purchases* starts over.
