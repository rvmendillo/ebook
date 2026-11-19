import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { KIND_LABELS, type ContentKind } from '@shared/types';

import { AdBanner } from '@/components/ad-banner';
import { ContentRow } from '@/components/content-cards';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Chip, T } from '@/components/ui';
import { useCatalog } from '@/state/app-state';
import { radius, space, usePalette } from '@/theme';

type AccessFilter = 'all' | 'free' | 'premium';

export default function ExploreScreen() {
  const p = usePalette();
  const params = useLocalSearchParams<{ category?: string }>();
  const { categories, contents, categoryById } = useCatalog();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(params.category ?? null);
  const [kind, setKind] = useState<ContentKind | 'all'>('all');
  const [access, setAccess] = useState<AccessFilter>('all');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contents.filter((c) => {
      if (category && categoryById.get(c.category_id ?? '')?.slug !== category) return false;
      if (kind !== 'all' && c.kind !== kind) return false;
      if (access !== 'all' && c.access !== access) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [contents, categoryById, query, category, kind, access]);

  return (
    <Screen>
      <View style={styles.header}>
        <T variant="display">Explore</T>
        <View style={[styles.search, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Icon name="search" size={18} color={p.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search articles, tips, tutorials…"
            placeholderTextColor={p.textFaint}
            style={[styles.input, { color: p.text }]}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search"
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All subjects" selected={!category} onPress={() => setCategory(null)} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={`${c.icon}  ${c.name}`}
            color={c.color}
            selected={category === c.slug}
            onPress={() => setCategory(category === c.slug ? null : c.slug)}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Everything" selected={kind === 'all'} onPress={() => setKind('all')} />
        {(Object.keys(KIND_LABELS) as ContentKind[]).map((k) => (
          <Chip
            key={k}
            label={`${KIND_LABELS[k]}s`}
            selected={kind === k}
            onPress={() => setKind(kind === k ? 'all' : k)}
          />
        ))}
        <View style={[styles.sep, { backgroundColor: p.border }]} />
        <Chip label="Free" selected={access === 'free'} onPress={() => setAccess(access === 'free' ? 'all' : 'free')} />
        <Chip
          label="Premium"
          selected={access === 'premium'}
          onPress={() => setAccess(access === 'premium' ? 'all' : 'premium')}
        />
      </ScrollView>

      <View style={styles.list}>
        <T variant="caption" muted style={{ marginBottom: space.xs }}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </T>
        {results.map((c) => (
          <ContentRow key={c.id} content={c} category={c.category_id ? categoryById.get(c.category_id) : undefined} />
        ))}
        {!results.length ? (
          <View style={styles.empty}>
            <Icon name="search" size={34} color={p.textFaint} />
            <T variant="bodyStrong">Nothing found</T>
            <T variant="small" muted style={{ textAlign: 'center' }}>
              Try another word or clear the filters.
            </T>
          </View>
        ) : null}
      </View>
      <AdBanner />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, gap: space.md },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    height: 46,
  },
  input: { flex: 1, fontSize: 16, height: 46 },
  chips: { paddingHorizontal: space.lg, gap: space.sm, paddingTop: space.md, alignItems: 'center' },
  sep: { width: 1, height: 22, marginHorizontal: space.xs },
  list: { paddingHorizontal: space.lg, marginTop: space.lg },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl },
});
