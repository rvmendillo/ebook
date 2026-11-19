/**
 * Where the admin app stores content:
 *   1. Supabase project entered on the Settings page (saved in this browser), or
 *   2. Supabase project baked in at build time (VITE_SUPABASE_URL / VITE_SUPABASE_KEY), or
 *   3. Demo mode — everything lives in this browser's local storage.
 */
export interface Connection {
  mode: 'supabase' | 'demo';
  url: string;
  key: string;
  source: 'browser' | 'build' | 'none';
}

const STORAGE_KEY = 'polymath-admin-connection';

export function getConnection(): Connection {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as {
      url?: string;
      key?: string;
      demo?: boolean;
    } | null;
    if (saved?.demo) return { mode: 'demo', url: '', key: '', source: 'browser' };
    if (saved?.url && saved?.key) return { mode: 'supabase', url: saved.url, key: saved.key, source: 'browser' };
  } catch {
    // ignore corrupt storage
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
  if (url && key) return { mode: 'supabase', url, key, source: 'build' };
  return { mode: 'demo', url: '', key: '', source: 'none' };
}

export function saveConnection(value: { url: string; key: string } | { demo: true } | null): void {
  if (value === null) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}
