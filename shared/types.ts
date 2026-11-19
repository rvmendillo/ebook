/**
 * Data contracts shared by the mobile app, the admin app and the generator scripts.
 * They mirror the tables in supabase/migrations.
 */

export type ContentKind = 'article' | 'tip' | 'tutorial' | 'ebook';
export type ContentAccess = 'free' | 'premium';
export type ContentStatus = 'draft' | 'published' | 'archived';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Catalogue entry — everything except the (gated) body. */
export interface Content {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: ContentKind;
  category_id: string | null;
  cover_url: string | null;
  author: string;
  tags: string[];
  access: ContentAccess;
  /** Pay on demand: price in credits to own this item; null = subscription only. */
  price_credits: number | null;
  reading_minutes: number;
  is_featured: boolean;
  status: ContentStatus;
  published_at: string | null;
  preview_html: string;
  headings: Heading[];
  created_at: string;
  updated_at: string;
}

export interface ContentBody {
  content_id: string;
  body_md: string;
  body_html: string;
}

export type AdGate = 'rewarded' | 'interstitial' | 'off';

export interface AdsConfig {
  /** What free users see before opening free content. */
  gate: AdGate;
  /** How long one watched ad keeps an item open. */
  unlock_hours: number;
  /** Show banner ads in lists for free users. */
  banners: boolean;
}

export interface PaywallConfig {
  headline: string;
  subheadline: string;
  benefits: string[];
}

export interface CreditPack {
  /** Store / RevenueCat product id of a consumable. */
  id: string;
  /** Credits granted per purchase. */
  credits: number;
  /** Shown when store prices cannot be loaded (demo mode, offline). */
  fallback_price: string;
  /** Optional ribbon, e.g. "Best value". */
  badge?: string;
}

export interface LinksConfig {
  privacy: string;
  terms: string;
  support: string;
}

export interface AppConfig {
  ads: AdsConfig;
  paywall: PaywallConfig;
  pricing: { credit_packs: CreditPack[] };
  links: LinksConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  ads: { gate: 'rewarded', unlock_hours: 24, banners: true },
  paywall: {
    headline: 'Unlock the whole library',
    subheadline: 'Every ebook, tutorial and tip — no ads, new lessons every week.',
    benefits: [
      'All premium ebooks and tutorials',
      'No ads, ever',
      'Offline reading',
      'New math, music & programming lessons weekly',
    ],
  },
  pricing: {
    credit_packs: [
      { id: 'credits_10', credits: 10, fallback_price: '$1.99' },
      { id: 'credits_30', credits: 30, fallback_price: '$4.99', badge: 'Popular' },
      { id: 'credits_70', credits: 70, fallback_price: '$9.99', badge: 'Best value' },
    ],
  },
  links: {
    privacy: 'https://example.com/privacy',
    terms: 'https://example.com/terms',
    support: 'mailto:support@example.com',
  },
};

/** Merge a partial remote config over the defaults (remote values win). */
export function mergeConfig(remote: Partial<Record<keyof AppConfig, unknown>> | null | undefined): AppConfig {
  const r = (remote ?? {}) as Partial<AppConfig>;
  return {
    ads: { ...DEFAULT_CONFIG.ads, ...(r.ads ?? {}) },
    paywall: { ...DEFAULT_CONFIG.paywall, ...(r.paywall ?? {}) },
    pricing: {
      credit_packs: r.pricing?.credit_packs?.length ? r.pricing.credit_packs : DEFAULT_CONFIG.pricing.credit_packs,
    },
    links: { ...DEFAULT_CONFIG.links, ...(r.links ?? {}) },
  };
}

export const KIND_LABELS: Record<ContentKind, string> = {
  article: 'Article',
  tip: 'Tip',
  tutorial: 'Tutorial',
  ebook: 'Ebook',
};

/** A demo/sample library bundle (what the generator produces). */
export interface LibraryBundle {
  generated_at: string;
  categories: Category[];
  contents: (Content & { body_html: string; body_md?: string })[];
  config: AppConfig;
}
