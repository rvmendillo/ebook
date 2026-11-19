/**
 * Signs Android release builds with your upload key when one is provided, and
 * falls back to the debug key otherwise (so CI can always produce an installable APK).
 *
 * Provide the key as Gradle properties (CI writes them to ~/.gradle/gradle.properties):
 *   POLYMATH_UPLOAD_STORE_FILE      absolute path to the .jks / .keystore
 *   POLYMATH_UPLOAD_STORE_PASSWORD
 *   POLYMATH_UPLOAD_KEY_ALIAS
 *   POLYMATH_UPLOAD_KEY_PASSWORD
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// polymath-release-signing';

const SIGNING_CONFIG = `
        release { ${MARKER}
            if (project.hasProperty('POLYMATH_UPLOAD_STORE_FILE')) {
                storeFile file(POLYMATH_UPLOAD_STORE_FILE)
                storePassword POLYMATH_UPLOAD_STORE_PASSWORD
                keyAlias POLYMATH_UPLOAD_KEY_ALIAS
                keyPassword POLYMATH_UPLOAD_KEY_PASSWORD
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }`;

function addSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // 1. Add a `release` signing config next to the template's `debug` one.
  const signingConfigs = /signingConfigs\s*\{/;
  if (!signingConfigs.test(gradle)) {
    throw new Error('[with-android-release-signing] Could not find signingConfigs in app/build.gradle');
  }
  gradle = gradle.replace(signingConfigs, (m) => `${m}${SIGNING_CONFIG}`);

  // 2. Point the release build type at it.
  const releaseBuildType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
  if (releaseBuildType.test(gradle)) {
    return gradle.replace(releaseBuildType, '$1signingConfig signingConfigs.release');
  }
  const releaseOpen = /(buildTypes\s*\{[\s\S]*?release\s*\{)/;
  if (!releaseOpen.test(gradle)) {
    throw new Error('[with-android-release-signing] Could not find the release build type in app/build.gradle');
  }
  return gradle.replace(releaseOpen, '$1\n            signingConfig signingConfigs.release');
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('[with-android-release-signing] Only Groovy build.gradle files are supported');
    }
    cfg.modResults.contents = addSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.addSigning = addSigning;
