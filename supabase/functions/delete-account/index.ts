// Deletes the calling reader's account (required by Google Play and the App Store for apps
// that let people create accounts). Credits, owned items and the mirrored subscription are
// removed by the database's ON DELETE CASCADE. Store subscriptions are NOT cancelled by
// deleting the account — the app tells readers to cancel them in the store.
import { json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  // Also forget the customer in RevenueCat when it is configured (GDPR deletion).
  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (rcKey) {
    const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${rcKey}` },
    });
    if (!res.ok && res.status !== 404) console.warn(`RevenueCat delete failed: ${res.status}`);
  }

  const { error } = await adminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error(error);
    return json({ error: 'delete_failed', message: error.message }, 500);
  }
  return json({ ok: true });
});
