import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Polymath app configuration.
 *
 * Everything that differs between your local machine, CI and the stores comes from
 * environment variables (see .env.example). Defaults make a fully working demo build:
 * bundled sample content, Google's AdMob *test* ads and simulated purchases.
 */
const env = process.env;

// Google's public sample AdMob app ids — replace with your own via ADMOB_*_APP_ID.
const ADMOB_IOS_APP_ID = env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const ADMOB_ANDROID_APP_ID = env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';

const APP_NAME = env.APP_NAME || 'Polymath';
const BUNDLE_ID = env.APP_BUNDLE_ID || 'com.rvmendillo.polymath';
const VERSION = env.APP_VERSION || '1.0.0';
const BUILD_NUMBER = env.APP_BUILD_NUMBER || '1';

const BRAND_INDIGO = '#4338CA';

// Google's recommended SKAdNetwork identifiers (https://developers.google.com/admob/ios/3p-skadnetworks).
const SK_AD_NETWORK_ITEMS = [
  'cstr6suwn9.skadnetwork', '4fzdc2evr5.skadnetwork', '2fnua5tdw4.skadnetwork', 'ydx93a7ass.skadnetwork',
  'p78axxw29g.skadnetwork', 'v72qych5uu.skadnetwork', 'ludvb6z3bs.skadnetwork', 'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork', 'c6k4g5qg8m.skadnetwork', 's39g8k73mm.skadnetwork', 'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork', 'f38h382jlk.skadnetwork', 'hs6bdukanm.skadnetwork', 'mlmmfzh3r3.skadnetwork',
  'v4nxqhlyqp.skadnetwork', 'wzmmz9fp6w.skadnetwork', 'su67r6k2v3.skadnetwork', 'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork', '7ug5zh24hu.skadnetwork', 'gta9lk7p23.skadnetwork', 'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork', 'v9wttpbfk9.skadnetwork', 'n38lu8286q.skadnetwork', '47vhws6wlr.skadnetwork',
  'kbd757ywx3.skadnetwork', '9t245vhmpl.skadnetwork', 'a2p9lx4jpn.skadnetwork', '22mmun2rn5.skadnetwork',
  '44jx6755aq.skadnetwork', 'k674qkevps.skadnetwork', '4468km3ulz.skadnetwork', '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork', 'klf5c3l5u5.skadnetwork', 'ppxm28t8ap.skadnetwork', 'kbmxgpxpgc.skadnetwork',
  'uw77j35x4d.skadnetwork', '578prtvx9j.skadnetwork', '4dzt52r2t5.skadnetwork', 'tl55sbb4fm.skadnetwork',
  'c3frkrj4fj.skadnetwork', 'e5fvkxwrpn.skadnetwork', '8c4e2ghe7u.skadnetwork', '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork', '3qcr597p9d.skadnetwork',
];

const TRACKING_REASON =
  'Your choice lets us show ads that are more relevant to you. Free articles stay free either way.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'polymath',
  scheme: 'polymath',
  version: VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#FFFFFF',
  platforms: ['ios', 'android', 'web'],
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: BUILD_NUMBER,
    supportsTablet: true,
    icon: './assets/images/icon.png',
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleDisplayName: APP_NAME,
    },
  },
  android: {
    package: BUNDLE_ID,
    versionCode: Number.parseInt(BUILD_NUMBER, 10) || 1,
    adaptiveIcon: {
      backgroundColor: BRAND_INDIGO,
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: BRAND_INDIGO,
        image: './assets/images/splash-icon.png',
        imageWidth: 180,
        dark: { backgroundColor: '#1E1B4B', image: './assets/images/splash-icon.png' },
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
        androidAppId: ADMOB_ANDROID_APP_ID,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: TRACKING_REASON,
        skAdNetworkItems: SK_AD_NETWORK_ITEMS,
      },
    ],
    ['expo-tracking-transparency', { userTrackingPermission: TRACKING_REASON }],
    [
      'expo-build-properties',
      {
        android: {
          extraProguardRules: '-keep class com.google.android.gms.internal.consent_sdk.** { *; }',
        },
      },
    ],
    './plugins/with-android-release-signing',
  ],
  experiments: {
    reactCompiler: true,
  },
  extra: {
    brand: { name: APP_NAME, tagline: 'Learn anything, one page at a time.' },
  },
});
