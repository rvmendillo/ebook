// RevenueCat → Supabase webhook (subscriptions and credit-pack purchases). Configure in RevenueCat:
//   Project settings → Integrations → Webhooks
//   URL:  https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//   Authorization header value: the same string you store in REVENUECAT_WEBHOOK_AUTH
// For every event we re-read the subscriber from the RevenueCat API, so ordering
// and retries are harmless.
import { env, isUuid, json, safeEqual } from '../_shared/http.ts';
import { syncUser } from '../_shared/revenuecat.ts';

interface RcEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const expected = env('REVENUECAT_WEBHOOK_AUTH');
  const received = req.headers.get('Authorization') ?? '';
  if (!safeEqual(received, expected) && !safeEqual(received, `Bearer ${expected}`)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let event: RcEvent;
  try {
    event = ((await req.json()) as { event?: RcEvent }).event ?? {};
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (event.type === 'TEST') return json({ ok: true, test: true });

  // Supabase user ids are UUIDs; anonymous RevenueCat ids ($RCAnonymousID:…) are skipped.
  const ids = new Set(
    [
      event.app_user_id,
      event.original_app_user_id,
      ...(event.aliases ?? []),
      ...(event.transferred_from ?? []),
      ...(event.transferred_to ?? []),
    ].filter(isUuid),
  );

  const results: Record<string, string> = {};
  for (const id of ids) {
    try {
      const { premium, credits } = await syncUser(id);
      results[id] = `${premium.is_active ? 'premium' : 'free'}, ${credits} credits`;
    } catch (err) {
      console.error(`sync failed for ${id}`, err);
      results[id] = 'error';
    }
  }
  // Returning 5xx makes RevenueCat retry later.
  const failed = Object.values(results).includes('error');
  return json({ ok: !failed, type: event.type, results }, failed ? 500 : 200);
});
