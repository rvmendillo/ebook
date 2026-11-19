import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Packages the admin studio as a native iOS app ("Polymath Admin").
 * The web build in dist/ is bundled inside the app, so it works offline in demo mode.
 * CI overrides the bundle id/version at build time (see .github/workflows/admin-ios.yml).
 */
const config: CapacitorConfig = {
  appId: 'com.rvmendillo.polymath.admin',
  appName: 'Polymath Admin',
  webDir: 'dist',
  backgroundColor: '#1E1B4B',
  ios: {
    contentInset: 'never',
    backgroundColor: '#1E1B4B',
    preferredContentMode: 'mobile',
  },
};

export default config;
