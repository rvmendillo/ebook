import { useColorScheme } from 'react-native';

/** Polymath brand colours — keep in sync with branding/README.md. */
export const brand = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  violet: '#7C3AED',
  night: '#1E1B4B',
  amber: '#F59E0B',
  amberSoft: '#FDE68A',
  white: '#FFFFFF',
} as const;

export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  primary: string;
  primaryText: string;
  premium: string;
  premiumText: string;
  success: string;
  danger: string;
  overlay: string;
}

export const palettes: Record<'light' | 'dark', Palette> = {
  light: {
    scheme: 'light',
    bg: '#F7F7FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEEF7',
    text: '#151733',
    textMuted: '#5D6280',
    textFaint: '#9A9EB8',
    border: '#E4E5F0',
    primary: brand.indigo,
    primaryText: '#FFFFFF',
    premium: '#B45309',
    premiumText: '#FFFFFF',
    success: '#059669',
    danger: '#DC2626',
    overlay: 'rgba(15, 18, 40, 0.55)',
  },
  dark: {
    scheme: 'dark',
    bg: '#0B0D1C',
    surface: '#151833',
    surfaceAlt: '#1D2142',
    text: '#EEF0FF',
    textMuted: '#A7ACC9',
    textFaint: '#6D7294',
    border: '#272C52',
    primary: '#818CF8',
    primaryText: '#0B0D1C',
    premium: brand.amber,
    premiumText: '#1E1B4B',
    success: '#34D399',
    danger: '#F87171',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export function usePalette(): Palette {
  return palettes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const text = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
} as const;

/** Darken (amount < 0) or lighten (amount > 0) a #RRGGBB colour. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}
