import { Platform } from 'react-native';

/**
 * Build-time configuration. Values are inlined by Expo from EXPO_PUBLIC_* variables
 * (.env locally, repository secrets in GitHub Actions). Each must be accessed as a
 * literal `process.env.EXPO_PUBLIC_…` expression for inlining to work.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  entitlement: process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT || 'premium',
  admob: {
    iosRewarded: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED ?? '',
    androidRewarded: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED ?? '',
    iosInterstitial: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL ?? '',
    androidInterstitial: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL ?? '',
    iosBanner: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER ?? '',
    androidBanner: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER ?? '',
  },
};

/** Content comes from Supabase when configured, otherwise from the bundled demo library. */
export const hasBackend = Boolean(env.supabaseUrl && env.supabaseKey);

export const revenueCatKey =
  Platform.select({ ios: env.revenueCatIosKey, android: env.revenueCatAndroidKey, default: '' }) ?? '';

/**
 * Real store purchases need both RevenueCat (the store) and Supabase (to verify
 * purchases server-side and gate premium text). Otherwise purchases are simulated
 * so the whole flow can be tried in a demo build.
 */
export const hasStore = Boolean(revenueCatKey) && hasBackend && Platform.OS !== 'web';

/** Demo build: bundled sample library and/or simulated purchases. */
export const isDemo = !hasBackend || !hasStore;
