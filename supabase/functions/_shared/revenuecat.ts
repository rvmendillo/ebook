import { env } from './http.ts';
import { adminClient } from './supabase.ts';

/** Subset of the RevenueCat v1 subscriber payload that we rely on. */
export interface RcSubscriber {
  entitlements?: Record<string, { expires_date: string | null; product_identifier: string; purchase_date: string }>;
  subscriptions?: Record<
    string,
    {
      store?: string;
      period_type?: string;
      expires_date?: string | null;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
      refunded_at?: string | null;
    }
  >;
  non_subscriptions?: Record<
    string,
    Array<{
      id: string;
      store_transaction_id?: string;
      purchase_date: string;
      store?: string;
      is_sandbox?: boolean;
      refunded_at?: string | null;
    }>
  >;
}

const RC_API = 'https://api.revenuecat.com/v1';

export async function fetchSubscriber(appUserId: string): Promise<RcSubscriber> {
  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${env('REVENUECAT_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`RevenueCat responded ${res.status}: ${await res.text()}`);
  }
  const payload = (await res.json()) as { subscriber: RcSubscriber };
  return payload.subscriber ?? {};
}

export interface PremiumState {
  is_active: boolean;
  expires_at: string | null;
  product_id: string | null;
  store: string | null;
  period_type: string | null;
  will_renew: boolean;
}

const entitlementId = () => Deno.env.get('REVENUECAT_ENTITLEMENT_ID') || 'premium';

export function premiumState(subscriber: RcSubscriber, now = new Date()): PremiumState {
  const ent = subscriber.entitlements?.[entitlementId()];
  if (!ent) {
    return { is_active: false, expires_at: null, product_id: null, store: null, period_type: null, will_renew: false };
  }
  const expires = ent.expires_date ? new Date(ent.expires_date) : null;
  const sub = subscriber.subscriptions?.[ent.product_identifier];
  const refunded = Boolean(sub?.refunded_at);
  return {
    is_active: !refunded && (expires === null || expires > now),
    expires_at: ent.expires_date,
    product_id: ent.product_identifier,
    store: sub?.store ?? null,
    period_type: sub?.period_type ?? null,
    will_renew: Boolean(sub && !sub.unsubscribe_detected_at && !sub.billing_issues_detected_at && !refunded),
  };
}

export interface CreditPack {
  id: string;
  credits: number;
}

const DEFAULT_PACKS: CreditPack[] = [
  { id: 'credits_10', credits: 10 },
  { id: 'credits_30', credits: 30 },
  { id: 'credits_70', credits: 70 },
];

/** Credit packs (store product id → credits) as configured in the admin app. */
export async function creditPacks(): Promise<CreditPack[]> {
  const { data } = await adminClient().from('app_config').select('value').eq('key', 'pricing').maybeSingle();
  const packs = ((data?.value as { credit_packs?: CreditPack[] } | null)?.credit_packs ?? []).filter(
    (p) => typeof p?.id === 'string' && Number.isInteger(p?.credits) && p.credits > 0,
  );
  return packs.length ? packs : DEFAULT_PACKS;
}

interface LedgerRow {
  user_id: string;
  delta: number;
  kind: 'purchase' | 'refund';
  product_id: string;
  transaction_id: string;
}

/** Ledger rows for every credit-pack purchase RevenueCat knows about (idempotent by transaction id). */
export function creditRows(userId: string, subscriber: RcSubscriber, packs: CreditPack[]): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const pack of packs) {
    for (const purchase of subscriber.non_subscriptions?.[pack.id] ?? []) {
      const tx = purchase.store_transaction_id || purchase.id;
      rows.push({ user_id: userId, delta: pack.credits, kind: 'purchase', product_id: pack.id, transaction_id: tx });
      if (purchase.refunded_at) {
        rows.push({
          user_id: userId,
          delta: -pack.credits,
          kind: 'refund',
          product_id: pack.id,
          transaction_id: `refund:${tx}`,
        });
      }
    }
  }
  return rows;
}

export interface SyncResult {
  premium: PremiumState;
  credits: number;
}

/**
 * Pulls the customer from RevenueCat and mirrors it into Supabase:
 *   - premium entitlement → public.subscriptions
 *   - consumable credit packs → public.credit_ledger
 */
export async function syncUser(userId: string): Promise<SyncResult> {
  const db = adminClient();
  const subscriber = await fetchSubscriber(userId);
  const premium = premiumState(subscriber);

  const { error } = await db
    .from('subscriptions')
    .upsert({ user_id: userId, entitlement: entitlementId(), ...premium });
  if (error?.code === '23503') {
    // No such Supabase user (deleted, or an id from another project) — nothing to store.
    console.warn(`Skipping sync for unknown user ${userId}`);
    return { premium, credits: 0 };
  }
  if (error) throw new Error(`Could not store subscription for ${userId}: ${error.message}`);

  const rows = creditRows(userId, subscriber, await creditPacks());
  if (rows.length) {
    const { error: ledgerError } = await db
      .from('credit_ledger')
      .upsert(rows, { onConflict: 'transaction_id', ignoreDuplicates: true });
    if (ledgerError) throw new Error(`Could not store credits for ${userId}: ${ledgerError.message}`);
  }

  const { data: ledger, error: balanceError } = await db.from('credit_ledger').select('delta').eq('user_id', userId);
  if (balanceError) throw new Error(`Could not read balance for ${userId}: ${balanceError.message}`);
  const credits = (ledger ?? []).reduce((sum: number, row: { delta: number }) => sum + row.delta, 0);
  return { premium, credits };
}
