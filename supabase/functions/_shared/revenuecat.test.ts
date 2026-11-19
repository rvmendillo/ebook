import { assertEquals } from 'jsr:@std/assert@1';

import { creditRows, premiumState, type RcSubscriber } from './revenuecat.ts';

const NOW = new Date('2026-11-19T12:00:00Z');

Deno.test('premiumState: active monthly subscription', () => {
  const sub: RcSubscriber = {
    entitlements: {
      premium: {
        expires_date: '2026-12-01T00:00:00Z',
        product_identifier: 'premium_monthly',
        purchase_date: '2026-11-01T00:00:00Z',
      },
    },
    subscriptions: {
      premium_monthly: {
        store: 'app_store',
        period_type: 'normal',
        unsubscribe_detected_at: null,
        billing_issues_detected_at: null,
      },
    },
  };
  assertEquals(premiumState(sub, NOW), {
    is_active: true,
    expires_at: '2026-12-01T00:00:00Z',
    product_id: 'premium_monthly',
    store: 'app_store',
    period_type: 'normal',
    will_renew: true,
  });
});

Deno.test('premiumState: expired, cancelled, refunded and lifetime', () => {
  const expired = premiumState(
    { entitlements: { premium: { expires_date: '2026-11-01T00:00:00Z', product_identifier: 'p', purchase_date: '' } } },
    NOW,
  );
  assertEquals(expired.is_active, false);

  const cancelled = premiumState(
    {
      entitlements: { premium: { expires_date: '2026-12-01T00:00:00Z', product_identifier: 'p', purchase_date: '' } },
      subscriptions: { p: { unsubscribe_detected_at: '2026-11-10T00:00:00Z' } },
    },
    NOW,
  );
  assertEquals([cancelled.is_active, cancelled.will_renew], [true, false]);

  const refunded = premiumState(
    {
      entitlements: { premium: { expires_date: '2026-12-01T00:00:00Z', product_identifier: 'p', purchase_date: '' } },
      subscriptions: { p: { refunded_at: '2026-11-15T00:00:00Z' } },
    },
    NOW,
  );
  assertEquals(refunded.is_active, false);

  const lifetime = premiumState(
    { entitlements: { premium: { expires_date: null, product_identifier: 'lifetime', purchase_date: '' } } },
    NOW,
  );
  assertEquals(lifetime.is_active, true);

  assertEquals(premiumState({}, NOW).is_active, false);
});

Deno.test('creditRows: one ledger row per store transaction, refunds reverse', () => {
  const rows = creditRows(
    'user-1',
    {
      non_subscriptions: {
        credits_30: [
          { id: 'rc1', store_transaction_id: 'tx-1', purchase_date: '2026-11-01T00:00:00Z' },
          {
            id: 'rc2',
            store_transaction_id: 'tx-2',
            purchase_date: '2026-11-02T00:00:00Z',
            refunded_at: '2026-11-03T00:00:00Z',
          },
        ],
        some_other_product: [{ id: 'x', purchase_date: '2026-11-01T00:00:00Z' }],
      },
    },
    [
      { id: 'credits_10', credits: 10 },
      { id: 'credits_30', credits: 30 },
    ],
  );
  assertEquals(rows, [
    { user_id: 'user-1', delta: 30, kind: 'purchase', product_id: 'credits_30', transaction_id: 'tx-1' },
    { user_id: 'user-1', delta: 30, kind: 'purchase', product_id: 'credits_30', transaction_id: 'tx-2' },
    { user_id: 'user-1', delta: -30, kind: 'refund', product_id: 'credits_30', transaction_id: 'refund:tx-2' },
  ]);
});
