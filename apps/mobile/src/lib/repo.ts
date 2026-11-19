/**
 * Data access. Uses Supabase when configured, otherwise the sample library bundled
 * with the app (src/demo/library.json, generated from /content).
 */
import library from '@/demo/library.json';
import { mergeConfig, type AppConfig, type Category, type Content, type LibraryBundle } from '@shared/types';

import { load, save } from './storage';
import { supabase } from './supabase';

const demo = library as unknown as LibraryBundle;
const demoBodies = new Map(demo.contents.map((c) => [c.id, c.body_html]));

export interface Catalog {
  categories: Category[];
  contents: Content[];
  config: AppConfig;
  source: 'live' | 'demo' | 'cache';
}

const COLUMNS =
  'id,slug,title,summary,kind,category_id,cover_url,author,tags,access,price_credits,reading_minutes,' +
  'is_featured,status,published_at,preview_html,headings,created_at,updated_at';

function demoCatalog(): Catalog {
  return {
    categories: demo.categories,
    contents: demo.contents.map(({ body_html: _body, ...rest }) => rest),
    config: mergeConfig(demo.config),
    source: 'demo',
  };
}

export async function fetchCatalog(): Promise<Catalog> {
  if (!supabase) return demoCatalog();
  try {
    const [cats, items, cfg] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase
        .from('contents')
        .select(COLUMNS)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1000),
      supabase.from('app_config').select('key,value'),
    ]);
    if (cats.error) throw cats.error;
    if (items.error) throw items.error;
    if (cfg.error) throw cfg.error;
    const config = mergeConfig(Object.fromEntries((cfg.data ?? []).map((r) => [r.key, r.value])));
    const catalog: Catalog = {
      categories: (cats.data ?? []) as Category[],
      contents: (items.data ?? []) as unknown as Content[],
      config,
      source: 'live',
    };
    void save('catalog', catalog);
    return catalog;
  } catch (error) {
    const cached = await load<Catalog | null>('catalog', null);
    if (cached) return { ...cached, source: 'cache' };
    throw error;
  }
}

/** The full text, or null when the server says this reader has no access. */
export async function fetchBody(id: string): Promise<string | null> {
  if (!supabase) return demoBodies.get(id) ?? null;
  try {
    const { data, error } = await supabase
      .from('content_bodies')
      .select('body_html')
      .eq('content_id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    void save(`body:${id}`, data.body_html);
    return data.body_html as string;
  } catch (error) {
    // Offline: fall back to the copy saved the last time it was opened.
    const cached = await load<string | null>(`body:${id}`, null);
    if (cached) return cached;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Account & ownership (live mode only)
// ---------------------------------------------------------------------------
export interface Ownership {
  premium: boolean;
  credits: number;
  unlocked: string[];
}

export async function fetchOwnership(userId: string): Promise<Ownership> {
  if (!supabase) return { premium: false, credits: 0, unlocked: [] };
  const [unlocks, balance, premium] = await Promise.all([
    supabase.from('unlocks').select('content_id').eq('user_id', userId),
    supabase.rpc('credit_balance'),
    supabase.rpc('has_premium'),
  ]);
  return {
    unlocked: (unlocks.data ?? []).map((u: { content_id: string }) => u.content_id),
    credits: typeof balance.data === 'number' ? balance.data : 0,
    premium: premium.data === true,
  };
}

/** Ask the server to verify store purchases with RevenueCat (subscription + credit packs). */
export async function syncPurchases(): Promise<{ premium: boolean; credits: number } | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('sync-purchases', { body: {} });
  if (error) throw error;
  return data as { premium: boolean; credits: number };
}

export type UnlockResult =
  | { ok: true; balance: number; already_owned?: boolean }
  | {
      ok: false;
      reason: 'insufficient_credits' | 'not_purchasable' | 'not_signed_in';
      balance?: number;
      price?: number;
    };

export async function unlockWithCredits(contentId: string): Promise<UnlockResult> {
  if (!supabase) throw new Error('No backend configured');
  const { data, error } = await supabase.rpc('unlock_with_credits', { cid: contentId });
  if (error) throw error;
  return data as UnlockResult;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface Session {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
}

const NO_SESSION: Session = { userId: null, email: null, isAnonymous: true };

function toSession(user: { id: string; email?: string | null; is_anonymous?: boolean } | null | undefined): Session {
  if (!user) return NO_SESSION;
  return { userId: user.id, email: user.email ?? null, isAnonymous: Boolean(user.is_anonymous) || !user.email };
}

/** Every install gets a (silent) anonymous account so purchases have an owner. */
export async function ensureSession(): Promise<Session> {
  if (!supabase) return NO_SESSION;
  const { data } = await supabase.auth.getSession();
  if (data.session) return toSession(data.session.user);
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn(
      'Anonymous sign-in failed. Enable it in Supabase → Authentication → Sign In / Providers.',
      error.message,
    );
    return NO_SESSION;
  }
  return toSession(anon.user);
}

export type EmailFlow = 'link' | 'signin';

/**
 * Sends a 6-digit code. Guests first try to *attach* the email to their current
 * account (keeps credits and unlocks); if the email already has an account we sign in to it instead.
 */
export async function sendEmailCode(email: string, current: Session): Promise<EmailFlow> {
  if (!supabase) throw new Error('No backend configured');
  if (current.userId && current.isAnonymous) {
    const { error } = await supabase.auth.updateUser({ email });
    if (!error) return 'link';
    if (!/already|exists|registered/i.test(error.message)) throw error;
  }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  return 'signin';
}

export async function verifyEmailCode(email: string, token: string, flow: EmailFlow): Promise<Session> {
  if (!supabase) throw new Error('No backend configured');
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: flow === 'link' ? 'email_change' : 'email',
  });
  if (error) throw error;
  return toSession(data.user);
}

export async function signOut(): Promise<Session> {
  if (!supabase) return NO_SESSION;
  await supabase.auth.signOut();
  return ensureSession();
}
