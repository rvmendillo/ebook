import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ContentRow } from '@/components/content-cards';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Button, Chip, T } from '@/components/ui';
import { useApp, useCatalog } from '@/state/app-state';
import { space, usePalette } from '@/theme';

type Tab = 'saved' | 'reading' | 'owned';

const EMPTY: Record<Tab, { icon: IconName; title: string; body: string }> = {
  saved: { icon: 'bookmark', title: 'Nothing saved yet', body: 'Tap the bookmark while reading to keep things for later.' },
  reading: { icon: 'clock', title: 'No reading history', body: 'Articles you start will show up here so you can pick up where you left off.' },
  owned: {
    icon: 'credits',
    title: 'No owned items',
    body: 'Premium ebooks and tutorials you unlock with credits stay yours — they’ll be listed here.',
  },
};

export default function LibraryScreen() {
  const p = usePalette();
  const { bookmarks, progress, unlocked, premium } = useApp();
  const { byId, categoryById, contents } = useCatalog();
  const [tab, setTab] = useState<Tab>('saved');

  const items =
    tab === 'saved'
      ? bookmarks.map((id) => byId.get(id)).filter((c) => c !== undefined)
      : tab === 'reading'
        ? contents
            .filter((c) => (progress[c.id]?.p ?? 0) > 0.02)
            .sort((a, b) => (progress[b.id]?.at ?? 0) - (progress[a.id]?.at ?? 0))
        : contents.filter((c) => unlocked.has(c.id));

  const empty = EMPTY[tab];

  return (
    <Screen>
      <View style={styles.header}>
        <T variant="display">Library</T>
        {premium ? (
          <T variant="small" muted>
            Premium is active — every item is open to you.
          </T>
        ) : null}
      </View>
      <View style={styles.tabs}>
        <Chip label={`Saved · ${bookmarks.length}`} selected={tab === 'saved'} onPress={() => setTab('saved')} />
        <Chip label="In progress" selected={tab === 'reading'} onPress={() => setTab('reading')} />
        <Chip label={`Owned · ${unlocked.size}`} selected={tab === 'owned'} onPress={() => setTab('owned')} />
      </View>
      <View style={styles.list}>
        {items.map((c) => (
          <View key={c.id}>
            <ContentRow content={c} category={c.category_id ? categoryById.get(c.category_id) : undefined} />
            {tab === 'reading' ? (
              <View style={[styles.track, { backgroundColor: p.surfaceAlt }]}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: p.primary, width: `${Math.round((progress[c.id]?.p ?? 0) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
        ))}
        {!items.length ? (
          <View style={styles.empty}>
            <Icon name={empty.icon} size={36} color={p.textFaint} />
            <T variant="heading">{empty.title}</T>
            <T variant="small" muted style={{ textAlign: 'center', maxWidth: 300 }}>
              {empty.body}
            </T>
            <Button
              title="Browse the library"
              kind="secondary"
              compact
              style={{ marginTop: space.sm }}
              onPress={() => router.push('/explore')}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, gap: 4 },
  tabs: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg, flexWrap: 'wrap' },
  list: { paddingHorizontal: space.lg, marginTop: space.md },
  track: { height: 3, borderRadius: 2, marginTop: -2, overflow: 'hidden' },
  fill: { height: 3 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl },
});
