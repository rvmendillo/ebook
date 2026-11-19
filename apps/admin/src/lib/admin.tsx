import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getConnection, type Connection } from './connection';
import { createDataSource, type DataSource } from './data';

interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface AdminState {
  connection: Connection;
  data: DataSource;
  session: Session | null;
  /** null while checking */
  isAdmin: boolean | null;
  authReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reconnect: () => void;
  toasts: Toast[];
  notify: (text: string, kind?: Toast['kind']) => void;
}

const Ctx = createContext<AdminState | null>(null);

export function useAdmin(): AdminState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin outside provider');
  return v;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<Connection>(() => getConnection());
  const data = useMemo(() => createDataSource(connection), [connection]);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authReady, setAuthReady] = useState(connection.mode === 'demo');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((text: string, kind: Toast['kind'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);

  useEffect(() => {
    const client = data.client;
    if (!client) {
      setSession(null);
      setIsAdmin(true);
      setAuthReady(true);
      return;
    }
    setAuthReady(false);
    let alive = true;
    const check = async (s: Session | null) => {
      if (!alive) return;
      setSession(s);
      if (!s) {
        setIsAdmin(null);
        setAuthReady(true);
        return;
      }
      const { data: ok } = await client.rpc('is_admin');
      if (!alive) return;
      setIsAdmin(ok === true);
      setAuthReady(true);
    };
    void client.auth.getSession().then(({ data: d }) => check(d.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      void check(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [data]);

  const value = useMemo<AdminState>(
    () => ({
      connection,
      data,
      session,
      isAdmin,
      authReady,
      async signIn(email, password) {
        if (!data.client) return;
        const { error } = await data.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signOut() {
        await data.client?.auth.signOut();
      },
      reconnect: () => setConnection(getConnection()),
      toasts,
      notify,
    }),
    [connection, data, session, isAdmin, authReady, toasts, notify],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Tiny data hook: loads with `load`, exposes reload. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    load()
      .then((d) => alive && setState({ data: d, error: null, loading: false }))
      .catch(
        (e: unknown) =>
          alive && setState({ data: null, error: e instanceof Error ? e : new Error(String(e)), loading: false }),
      );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}
