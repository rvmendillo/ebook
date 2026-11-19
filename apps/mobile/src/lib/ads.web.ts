// Web build (previews only): ads are simulated.
export const AD_UNITS = { rewarded: 'web', interstitial: 'web', banner: 'web' };
export const usingTestAds = true;
export type GateOutcome = 'earned' | 'closed-early' | 'unavailable';
export const prepareAds = async () => true;
export const adsReady = async () => true;
export const requestOptions = () => ({ requestNonPersonalizedAdsOnly: true });
export const showGateAd = (_kind: 'rewarded' | 'interstitial', _userId?: string | null): Promise<GateOutcome> =>
  new Promise((resolve) => setTimeout(() => resolve('earned'), 1200));
export const privacyOptionsRequired = async () => false;
export const showPrivacyOptions = async () => {};
