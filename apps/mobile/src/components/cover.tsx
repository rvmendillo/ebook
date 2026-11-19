import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Category, Content } from '@shared/types';

import { shade } from '@/theme';

/**
 * Cover art. Uses the uploaded cover image when there is one, otherwise a
 * generated cover in the category's colour with its glyph — so every item looks
 * designed even before you upload artwork.
 */
export function Cover({
  content,
  category,
  style,
  glyphSize = 44,
  showKind = false,
}: {
  content: Pick<Content, 'cover_url' | 'kind' | 'title'>;
  category?: Pick<Category, 'color' | 'icon'>;
  style?: StyleProp<ViewStyle>;
  glyphSize?: number;
  showKind?: boolean;
}) {
  const color = category?.color ?? '#4F46E5';
  if (content.cover_url) {
    return (
      <View style={[styles.base, style]}>
        <Image
          source={{ uri: content.cover_url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={[shade(color, 0.12), shade(color, -0.35)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, style]}>
      <View style={[styles.ring, { width: glyphSize * 2.6, height: glyphSize * 2.6, borderRadius: glyphSize * 1.3 }]} />
      <Text
        style={[styles.glyph, { fontSize: glyphSize, lineHeight: glyphSize * 1.2 }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityElementsHidden
        importantForAccessibility="no">
        {category?.icon ?? '✦'}
      </Text>
      {showKind ? <Text style={styles.kind}>{content.kind.toUpperCase()}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#312E81',
  },
  ring: {
    position: 'absolute',
    top: -20,
    right: -30,
    borderWidth: 18,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glyph: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowRadius: 8,
  },
  kind: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
