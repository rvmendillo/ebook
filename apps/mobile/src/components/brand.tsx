import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApp } from '@/state/app-state';
import { brand, radius, space, usePalette } from '@/theme';

import { Icon } from './icon';
import { T } from './ui';

const LOGO = require('@/assets/images/icon.png');

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size, borderRadius: size * 0.26 }}
      accessibilityLabel="Polymath logo"
    />
  );
}

/** Top bar of the Home tab: logo, greeting and membership pill. */
export function BrandHeader() {
  const p = usePalette();
  const { premium, credits } = useApp();
  return (
    <View style={styles.header}>
      <Logo />
      <View style={{ flex: 1 }}>
        <T variant="heading" style={{ fontWeight: '800', letterSpacing: -0.4 }}>
          Polymath
        </T>
        <T variant="caption" muted>
          Learn anything, one page at a time.
        </T>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={premium ? 'Premium membership' : `${credits} credits. Get Premium`}
        onPress={() => router.push(premium ? '/account' : '/paywall')}
        style={[styles.pill, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Icon name={premium ? 'crown' : 'credits'} size={14} color={premium ? brand.amber : p.primary} />
          <T variant="caption" style={{ fontWeight: '800' }}>
            {premium ? 'Premium' : `${credits}`}
          </T>
      </Pressable>
    </View>
  );
}

/** Upsell card shown to free readers. */
export function PremiumBanner() {
  const { premium } = useApp();
  if (premium) return null;
  return (
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/paywall')}
        style={({ pressed }) => [styles.bannerWrap, pressed && { opacity: 0.9 }]}>
        <LinearGradient
          colors={[brand.night, brand.indigoDeep, brand.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.bannerTitleRow}>
              <Icon name="sparkles" size={16} color={brand.amberSoft} />
              <T variant="overline" color={brand.amberSoft}>
                Polymath Premium
              </T>
            </View>
            <T variant="heading" color="#FFFFFF">
              Every ebook. No ads.
            </T>
            <T variant="small" color="rgba(255,255,255,0.8)">
              Unlock the whole library and read offline.
            </T>
          </View>
          <View style={styles.bannerCta}>
            <T variant="small" color={brand.night} style={{ fontWeight: '800' }}>
              Try it
            </T>
          </View>
        </LinearGradient>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerWrap: { marginHorizontal: space.lg, marginTop: space.xl, borderRadius: radius.xl, overflow: 'hidden' },
  banner: { flexDirection: 'row', alignItems: 'center', padding: space.lg, gap: space.md },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bannerCta: {
    backgroundColor: brand.amberSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
});
