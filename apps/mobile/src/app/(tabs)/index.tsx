import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AdBanner } from '@/components/ad-banner';
import { BrandHeader, PremiumBanner } from '@/components/brand';
import { ContentRow, FeaturedCard, MiniCard } from '@/components/content-cards';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { T } from '@/components/ui';
import { useApp, useCatalog } from '@/state/app-state';
import { radius, shade, space, usePalette } from '@/theme';

export default function HomeScreen() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const { refreshCatalog, progress, catalogError } = useApp();
  const { categories, contents, categoryById, source } = useCatalog();
  const [refreshing, setRefreshing] = useState(false);

  const featured = contents.filter((c) => c.is_featured);
  const reading = contents
    .filter((c) => (progress[c.id]?.p ?? 0) > 0.02 && (progress[c.id]?.p ?? 0) < 0.97)
    .sort((a, b) => (progress[b.id]?.at ?? 0) - (progress[a.id]?.at ?? 0));
  const tips = contents.filter((c) => c.kind === 'tip');
  const latest = contents.slice(0, 6);
  const cardWidth = Math.min(340, width * 0.82);
  const tileWidth = (Math.min(width, 700) - space.lg * 2 - space.md * 2) / 3;

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshCatalog();
    setRefreshing(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <BrandHeader />

      {source === 'demo' ? (
        <View style={[styles.notice, { backgroundColor: p.surfaceAlt }]}>
          <T variant="caption" muted>
            Sample library · connect Supabase to publish your own articles from the admin app.
          </T>
        </View>
      ) : null}
      {source === 'cache' ? (
        <View style={[styles.notice, { backgroundColor: p.surfaceAlt }]}>
          <T variant="caption" muted>
            You’re offline — showing your saved library.
          </T>
        </View>
      ) : null}
      {!contents.length && catalogError ? (
        <View style={[styles.notice, { backgroundColor: p.surfaceAlt }]}>
          <T variant="small">Couldn’t load the library. Pull down to try again.</T>
        </View>
      ) : null}

      {featured.length ? (
        <Section title="Featured" horizontal>
          {featured.map((c) => (
            <FeaturedCard
              key={c.id}
              content={c}
              category={c.category_id ? categoryById.get(c.category_id) : undefined}
              width={cardWidth}
            />
          ))}
        </Section>
      ) : null}

      {categories.length ? (
        <Section title="Subjects">
          <View style={styles.grid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => router.push({ pathname: '/category/[slug]', params: { slug: cat.slug } })}
                accessibilityRole="button"
                accessibilityLabel={cat.name}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileWidth, backgroundColor: shade(cat.color, p.scheme === 'dark' ? -0.45 : 0.86) },
                  pressed && { opacity: 0.8 },
                ]}>
                <View style={[styles.tileGlyph, { backgroundColor: cat.color }]}>
                  <T variant="bodyStrong" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit>
                    {cat.icon}
                  </T>
                </View>
                <T variant="small" style={{ fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                  {cat.name}
                </T>
              </Pressable>
            ))}
          </View>
        </Section>
      ) : null}

      {reading.length ? (
        <Section title="Continue reading" horizontal>
          {reading.map((c) => (
            <MiniCard key={c.id} content={c} category={c.category_id ? categoryById.get(c.category_id) : undefined} />
          ))}
        </Section>
      ) : null}

      <PremiumBanner />

      {tips.length ? (
        <Section title="Quick tips" subtitle="Small lessons, big wins" horizontal>
          {tips.map((c) => (
            <MiniCard key={c.id} content={c} category={c.category_id ? categoryById.get(c.category_id) : undefined} />
          ))}
        </Section>
      ) : null}

      {latest.length ? (
        <Section title="New this week" href="/explore">
          {latest.map((c) => (
            <ContentRow key={c.id} content={c} category={c.category_id ? categoryById.get(c.category_id) : undefined} />
          ))}
        </Section>
      ) : null}

      <AdBanner />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    minHeight: 92,
    justifyContent: 'space-between',
  },
  tileGlyph: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
