import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { ContentRow } from '@/components/content-cards';
import { T } from '@/components/ui';
import { useCatalog } from '@/state/app-state';
import { radius, shade, space, usePalette } from '@/theme';

export default function CategoryScreen() {
  const p = usePalette();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { categories, contents } = useCatalog();
  const category = categories.find((c) => c.slug === slug);
  const items = contents.filter((c) => c.category_id === category?.id);
  const color = category?.color ?? p.primary;

  return (
    <ScrollView style={{ backgroundColor: p.bg }} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: category?.name ?? '' }} />
      <LinearGradient colors={[shade(color, 0.05), shade(color, -0.4)]} style={styles.hero}>
        <View style={styles.glyph}>
          <T variant="title" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit>
            {category?.icon}
          </T>
        </View>
        <T variant="display" color="#FFFFFF">
          {category?.name ?? 'Subject'}
        </T>
        <T variant="body" color="rgba(255,255,255,0.85)">
          {category?.description}
        </T>
        <T variant="caption" color="rgba(255,255,255,0.75)">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </T>
      </LinearGradient>
      <View style={styles.list}>
        {items.map((c) => (
          <ContentRow key={c.id} content={c} category={category} />
        ))}
        {!items.length ? (
          <T variant="body" muted style={{ textAlign: 'center', marginTop: space.xl }}>
            New lessons are on the way.
          </T>
        ) : null}
      </View>
      <AdBanner />
      <View style={{ height: space.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { margin: space.lg, borderRadius: radius.xl, padding: space.xl, gap: space.sm },
  glyph: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  list: { paddingHorizontal: space.lg },
});
