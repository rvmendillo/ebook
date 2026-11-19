// Called by the app after a purchase or restore (and on launch). Verifies the
// signed-in user's purchases with RevenueCat and returns their premium status
// and credit balance. The RevenueCat webhook runs the same sync in the background.
import { json, preflight } from '../_shared/http.ts';
import { syncUser } from '../_shared/revenuecat.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  try {
    const { premium, credits } = await syncUser(user.id);
    return json({ premium: premium.is_active, expires_at: premium.expires_at, product_id: premium.product_id, credits });
  } catch (err) {
    console.error(err);
    return json({ error: 'sync_failed', message: String(err) }, 502);
  }
});
