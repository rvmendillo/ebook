import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { space, usePalette } from '@/theme';

import { T } from './ui';

export function Section({
  title,
  subtitle,
  href,
  children,
  horizontal,
}: {
  title: string;
  subtitle?: string;
  href?: Href;
  children: ReactNode;
  horizontal?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T variant="title">{title}</T>
          {subtitle ? (
            <T variant="small" muted>
              {subtitle}
            </T>
          ) : null}
        </View>
        {href ? (
          <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push(href)}>
            <T variant="small" color={p.primary} style={{ fontWeight: '700' }}>
              See all
            </T>
          </Pressable>
        ) : null}
      </View>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          style={styles.hScroll}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.vList}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
    gap: space.md,
  },
  hScroll: { flexGrow: 0 },
  hList: { paddingHorizontal: space.lg, gap: space.md },
  vList: { paddingHorizontal: space.lg },
});
