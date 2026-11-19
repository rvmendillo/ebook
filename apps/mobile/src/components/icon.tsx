import { SymbolView, type SymbolViewProps } from 'expo-symbols';

/** Semantic icon names → SF Symbols (iOS) and Material Symbols (Android/web). */
const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  search: { ios: 'magnifyingglass', android: 'search' },
  library: { ios: 'books.vertical.fill', android: 'library_books' },
  account: { ios: 'person.crop.circle.fill', android: 'account_circle' },
  bookmark: { ios: 'bookmark', android: 'bookmark' },
  bookmarked: { ios: 'bookmark.fill', android: 'bookmark_added' },
  lock: { ios: 'lock.fill', android: 'lock' },
  play: { ios: 'play.rectangle.fill', android: 'smart_display' },
  crown: { ios: 'crown.fill', android: 'workspace_premium' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  credits: { ios: 'diamond.fill', android: 'diamond' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  toc: { ios: 'list.bullet', android: 'toc' },
  textSize: { ios: 'textformat.size', android: 'format_size' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  restore: { ios: 'arrow.clockwise', android: 'refresh' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  privacy: { ios: 'hand.raised.fill', android: 'privacy_tip' },
  doc: { ios: 'doc.text.fill', android: 'description' },
  info: { ios: 'info.circle.fill', android: 'info' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  clock: { ios: 'clock', android: 'schedule' },
  sun: { ios: 'sun.max.fill', android: 'light_mode' },
  moon: { ios: 'moon.fill', android: 'dark_mode' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  gift: { ios: 'gift.fill', android: 'redeem' },
  cloud: { ios: 'icloud.fill', android: 'cloud_done' },
  wand: { ios: 'wand.and.stars', android: 'magic_button' },
} as const satisfies Record<string, { ios: string; android: string }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: SymbolViewProps['style'];
}) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={{ ios: icon.ios, android: icon.android, web: icon.android } as SymbolViewProps['name']}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
      resizeMode="scaleAspectFit"
    />
  );
}

export const TAB_ICONS = {
  home: { sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  explore: { sf: { default: 'magnifyingglass', selected: 'magnifyingglass' }, md: 'search' },
  library: { sf: { default: 'books.vertical', selected: 'books.vertical.fill' }, md: 'library_books' },
  account: { sf: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' }, md: 'account_circle' },
} as const;
