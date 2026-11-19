import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { brand, radius, space, text, usePalette } from '@/theme';

import { Icon, type IconName } from './icon';

type Variant = keyof typeof text;

export function T({
  variant = 'body',
  color,
  muted,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string; muted?: boolean }) {
  const p = usePalette();
  return (
    <Text {...rest} style={[text[variant] as TextStyle, { color: color ?? (muted ? p.textMuted : p.text) }, style]} />
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'premium';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  compact,
  accessibilityHint,
}: {
  title: string;
  onPress?: PressableProps['onPress'];
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accessibilityHint?: string;
}) {
  const p = usePalette();
  const fg =
    kind === 'primary' ? '#FFFFFF' : kind === 'premium' ? brand.night : kind === 'secondary' ? p.text : p.primary;
  const inner = (
    <View style={[styles.buttonInner, compact && styles.buttonCompact]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={compact ? 16 : 18} color={fg} /> : null}
          <Text style={[text.bodyStrong as TextStyle, { color: fg }, compact && { fontSize: 14 }]}>{title}</Text>
        </>
      )}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'secondary' && { backgroundColor: p.surfaceAlt },
        kind === 'ghost' && { backgroundColor: 'transparent' },
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}>
      {kind === 'primary' || kind === 'premium' ? (
        <LinearGradient
          colors={kind === 'primary' ? [brand.indigoDeep, brand.violet] : ['#FDE68A', brand.amber]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'premium' | 'free' | 'owned' | 'brand';
  icon?: IconName;
}) {
  const p = usePalette();
  const tones = {
    neutral: { bg: p.surfaceAlt, fg: p.textMuted },
    premium: { bg: p.scheme === 'dark' ? '#3B2A07' : '#FEF3C7', fg: p.scheme === 'dark' ? brand.amberSoft : '#92400E' },
    free: { bg: p.scheme === 'dark' ? '#0B3B2E' : '#D1FAE5', fg: p.scheme === 'dark' ? '#6EE7B7' : '#065F46' },
    owned: { bg: p.scheme === 'dark' ? '#1E2A5A' : '#E0E7FF', fg: p.scheme === 'dark' ? '#C7D2FE' : '#3730A3' },
    brand: { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: tones.bg }]}>
      {icon ? <Icon name={icon} size={11} color={tones.fg} /> : null}
      <Text style={[text.caption as TextStyle, { color: tones.fg, fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, style]}>{children}</View>;
}

export function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const p = usePalette();
  const active = color ?? p.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? active : p.surface, borderColor: selected ? active : p.border },
        pressed && { opacity: 0.8 },
      ]}>
      <Text style={[text.small as TextStyle, { color: selected ? '#FFFFFF' : p.text, fontWeight: '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Row({
  icon,
  title,
  subtitle,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: p.surfaceAlt }]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: p.surfaceAlt }]}>
          <Icon name={icon} size={17} color={danger ? p.danger : p.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" color={danger ? p.danger : undefined}>
          {title}
        </T>
        {subtitle ? (
          <T variant="small" muted>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={14} color={p.textFaint} /> : null)}
    </Pressable>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginLeft: 56 }} />;
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonGradient: { borderRadius: radius.lg },
  buttonInner: {
    minHeight: 50,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonCompact: { minHeight: 38, paddingHorizontal: space.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 56,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
