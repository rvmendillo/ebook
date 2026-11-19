import { StyleSheet, View } from 'react-native';

import { useApp, useCatalog } from '@/state/app-state';
import { radius, space, usePalette } from '@/theme';

import { T } from './ui';

/** Web preview: a placeholder where the AdMob banner appears on phones. */
export function AdBanner() {
  const { premium } = useApp();
  const { config } = useCatalog();
  const p = usePalette();
  if (premium || !config?.ads.banners) return null;
  return (
    <View style={[styles.box, { borderColor: p.border, backgroundColor: p.surface }]}>
      <T variant="caption" muted>
        AD · Banner placement (AdMob on iOS & Android)
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: space.xl,
    marginHorizontal: space.lg,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
