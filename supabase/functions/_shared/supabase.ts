import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';
import { env } from './http.ts';

let admin: SupabaseClient | null = null;

/** Service-role client: bypasses RLS. Never expose its key to clients. */
export function adminClient(): SupabaseClient {
  admin ??= createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Resolves the signed-in user from the request's bearer token (anonymous users included). */
export async function requireUser(req: Request): Promise<User | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
