import type { ReactNode } from 'react';
import { Platform, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, usePalette } from '@/theme';

/**
 * Tab screen container. iOS native tabs inset the first ScrollView automatically;
 * Android only handles the bottom inset, so we add the status bar inset ourselves.
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'ios' ? 0 : insets.top;
  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: top + space.sm, paddingBottom: space.xxxl }}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={p.primary} />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </View>
  );
}
