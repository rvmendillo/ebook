/**
 * Google AdMob for free readers:
 *   - rewarded (or interstitial) ad before opening free content
 *   - adaptive banners in lists
 * Consent: Google UMP (GDPR) + Apple App Tracking Transparency, gathered before the SDK starts.
 * Development builds always use Google's test ads.
 */
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

import { env } from './env';

const pick = (ios: string, android: string, test: string) => {
  if (__DEV__) return test;
  return (Platform.OS === 'ios' ? ios : android) || test;
};

export const AD_UNITS = {
  rewarded: pick(env.admob.iosRewarded, env.admob.androidRewarded, TestIds.REWARDED),
  interstitial: pick(env.admob.iosInterstitial, env.admob.androidInterstitial, TestIds.INTERSTITIAL),
  banner: pick(env.admob.iosBanner, env.admob.androidBanner, TestIds.ADAPTIVE_BANNER),
};

export const usingTestAds = Object.values(AD_UNITS).some((id) => Object.values(TestIds).includes(id));

let starting: Promise<boolean> | null = null;
let personalized = false;

/** Gather consent and start the Mobile Ads SDK once. Resolves to whether ads may be requested. */
export function prepareAds(): Promise<boolean> {
  starting ??= (async () => {
    try {
      await AdsConsent.gatherConsent().catch(() => null);
      const info = await AdsConsent.getConsentInfo();
      if (!info.canRequestAds) return false;
      if (Platform.OS === 'ios') {
        const { status } = await getTrackingPermissionsAsync();
        if (status === PermissionStatus.UNDETERMINED) await requestTrackingPermissionsAsync();
      }
      const choices = await AdsConsent.getUserChoices().catch(() => null);
      personalized = choices ? choices.selectPersonalisedAds : true;
      await mobileAds().initialize();
      return true;
    } catch (error) {
      console.warn('Ads unavailable', error);
      return false;
    }
  })();
  return starting;
}

export const adsReady = () => starting ?? Promise.resolve(false);
export const requestOptions = () => ({ requestNonPersonalizedAdsOnly: !personalized });

/**
 * - `earned`: the reader watched the ad (or saw the interstitial) — open the content
 * - `closed-early`: a rewarded ad was skipped before the reward
 * - `unavailable`: no consent / no fill / error — we let the reader in rather than block them
 */
export type GateOutcome = 'earned' | 'closed-early' | 'unavailable';

const LOAD_TIMEOUT_MS = 12_000;

export async function showGateAd(kind: 'rewarded' | 'interstitial', userId?: string | null): Promise<GateOutcome> {
  if (!(await prepareAds())) return 'unavailable';

  return new Promise<GateOutcome>((resolve) => {
    let settled = false;
    let earned = false;
    const unsubscribers: (() => void)[] = [];
    const finish = (outcome: GateOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribers.forEach((u) => u());
      resolve(outcome);
    };
    const timer = setTimeout(() => finish('unavailable'), LOAD_TIMEOUT_MS);

    if (kind === 'rewarded') {
      const ad = RewardedAd.createForAdRequest(AD_UNITS.rewarded, {
        ...requestOptions(),
        ...(userId ? { serverSideVerificationOptions: { userId } } : {}),
      });
      unsubscribers.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
          clearTimeout(timer);
          ad.show().catch(() => finish('unavailable'));
        }),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          earned = true;
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'closed-early')),
        ad.addAdEventListener(AdEventType.ERROR, () => finish(earned ? 'earned' : 'unavailable')),
      );
      ad.load();
    } else {
      const ad = InterstitialAd.createForAdRequest(AD_UNITS.interstitial, requestOptions());
      unsubscribers.push(
        ad.addAdEventListener(AdEventType.LOADED, () => {
          clearTimeout(timer);
          ad.show().catch(() => finish('unavailable'));
        }),
        ad.addAdEventListener(AdEventType.CLOSED, () => finish('earned')),
        ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')),
      );
      ad.load();
    }
  });
}

/** Whether to show a "Privacy choices" entry (required for EEA/UK users). */
export async function privacyOptionsRequired(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export async function showPrivacyOptions(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}
