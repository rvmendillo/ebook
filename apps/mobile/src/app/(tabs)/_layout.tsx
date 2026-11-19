import { NativeTabs } from 'expo-router/native-tabs';

import { TAB_ICONS } from '@/components/icon';
import { usePalette } from '@/theme';

export default function TabLayout() {
  const p = usePalette();
  return (
    <NativeTabs tintColor={p.primary} backgroundColor={p.surface} indicatorColor={p.surfaceAlt}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={TAB_ICONS.home.sf} md={TAB_ICONS.home.md} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={TAB_ICONS.explore.sf} md={TAB_ICONS.explore.md} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={TAB_ICONS.library.sf} md={TAB_ICONS.library.md} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={TAB_ICONS.account.sf} md={TAB_ICONS.account.md} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
