// Web preview build: JavaScript tabs (native tabs are iOS/Android only).
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { usePalette } from '@/theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} size={22} color={String(color)} />,
});

export default function TabLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textMuted,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.border },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="explore" options={tab('Explore', 'search')} />
      <Tabs.Screen name="library" options={tab('Library', 'library')} />
      <Tabs.Screen name="account" options={tab('Account', 'account')} />
    </Tabs>
  );
}
