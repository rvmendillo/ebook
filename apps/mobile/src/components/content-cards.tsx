import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Category, Content } from '@shared/types';

import { kindLabel, readingTime } from '@/lib/format';
import { useApp } from '@/state/app-state';
import { radius, space, usePalette } from '@/theme';

import { Cover } from './cover';
import { Badge, T } from './ui';

const openContent = (id: string) => router.push({ pathname: '/read/[id]', params: { id } });

function AccessBadge({ content }: { content: Content }) {
  const { premium, unlocked } = useApp();
  if (content.access === 'free') return <Badge label="Free" tone="free" />;
  if (premium) return <Badge label="Premium" tone="premium" icon="crown" />;
  if (unlocked.has(content.id)) return <Badge label="Owned" tone="owned" icon="check" />;
  return <Badge label={content.price_credits ? `${content.price_credits} credits` : 'Premium'} tone="premium" icon="lock" />;
}

/** Large card for the featured carousel. */
export function FeaturedCard({ content, category, width }: { content: Content; category?: Category; width: number }) {
  const p = usePalette();
  return (
      <Pressable
        onPress={() => openContent(content.id)}
        accessibilityRole="button"
        accessibilityLabel={`${content.title}, ${kindLabel(content)}`}
        style={({ pressed }) => [
          styles.featured,
          { width, backgroundColor: p.surface, borderColor: p.border },
          pressed && styles.pressed,
        ]}>
        <Cover content={content} category={category} style={styles.featuredCover} glyphSize={56} showKind />
        <View style={styles.featuredBody}>
          <View style={styles.metaRow}>
            <T variant="overline" color={category?.color ?? p.primary}>
              {category?.name ?? kindLabel(content)}
            </T>
            <AccessBadge content={content} />
          </View>
          <T variant="heading" numberOfLines={2}>
            {content.title}
          </T>
          <T variant="small" muted numberOfLines={2}>
            {content.summary}
          </T>
        </View>
      </Pressable>
  );
}

/** Compact vertical card for horizontal rows. */
export function MiniCard({ content, category }: { content: Content; category?: Category }) {
  const p = usePalette();
  const { progress } = useApp();
  const done = progress[content.id]?.p ?? 0;
  return (
      <Pressable
        onPress={() => openContent(content.id)}
        accessibilityRole="button"
        accessibilityLabel={content.title}
        style={({ pressed }) => [styles.mini, pressed && styles.pressed]}>
        <Cover content={content} category={category} style={styles.miniCover} glyphSize={34} />
        {done > 0.02 ? (
          <View style={[styles.progressTrack, { backgroundColor: p.surfaceAlt }]}>
            <View style={[styles.progressFill, { width: `${Math.round(done * 100)}%`, backgroundColor: p.primary }]} />
          </View>
        ) : null}
        <T variant="small" numberOfLines={2} style={{ fontWeight: '700', marginTop: space.sm }}>
          {content.title}
        </T>
        <T variant="caption" muted numberOfLines={1}>
          {kindLabel(content)} · {readingTime(content.reading_minutes)}
        </T>
      </Pressable>
  );
}

/** Full-width list row. */
export function ContentRow({ content, category }: { content: Content; category?: Category }) {
  const p = usePalette();
  return (
      <Pressable
        onPress={() => openContent(content.id)}
        accessibilityRole="button"
        accessibilityLabel={`${content.title}. ${content.summary}`}
        style={({ pressed }) => [styles.row, { borderBottomColor: p.border }, pressed && { opacity: 0.7 }]}>
        <Cover content={content} category={category} style={styles.rowCover} glyphSize={26} />
        <View style={{ flex: 1, gap: 3 }}>
          <T variant="caption" color={category?.color ?? p.primary}>
            {(category?.name ?? '').toUpperCase()} · {kindLabel(content).toUpperCase()}
          </T>
          <T variant="bodyStrong" numberOfLines={2}>
            {content.title}
          </T>
          <View style={styles.metaRow}>
            <T variant="caption" muted>
              {readingTime(content.reading_minutes)}
            </T>
            <AccessBadge content={content} />
          </View>
        </View>
      </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  featured: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  featuredCover: { height: 168, width: '100%' },
  featuredBody: { padding: space.lg, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  mini: { width: 148 },
  miniCover: { width: 148, height: 104, borderRadius: radius.lg },
  progressTrack: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  row: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  rowCover: { width: 76, height: 76, borderRadius: radius.md },
});
