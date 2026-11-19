import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

import { AD_UNITS, adsReady, requestOptions } from '@/lib/ads';
import { useApp, useCatalog } from '@/state/app-state';
import { space } from '@/theme';

/** Adaptive banner for free readers (hidden for premium and when banners are off in the admin app). */
export function AdBanner() {
  const { premium } = useApp();
  const { config } = useCatalog();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    void adsReady().then((ok) => alive && setReady(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (premium || !config?.ads.banners || !ready || failed) return null;
  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={AD_UNITS.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={requestOptions()}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: space.xl },
});
