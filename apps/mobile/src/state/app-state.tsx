/**
 * App-wide state: catalogue, account, premium status, credits, owned items,
 * ad passes, bookmarks, reading progress and reader settings.
 *
 * Live mode (Supabase + RevenueCat configured): ownership lives on the server and every
 * purchase is verified there. Demo mode: purchases are simulated and kept on the device.
 */
import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { adPassValid } from '@shared/access';
import type { Content } from '@shared/types';

import { prepareAds } from '@/lib/ads';
import { hasBackend, hasStore } from '@/lib/env';
import {
  configurePurchases,
  identify,
  onPremiumChange,
  purchasePack,
  purchasePlan,
  restorePurchases,
  storePremium,
  type PackOffer,
  type Plan,
  type PurchaseOutcome,
} from '@/lib/purchases';
import * as repo from '@/lib/repo';
import { load, save } from '@/lib/storage';

export type ReaderTheme = 'auto' | 'light' | 'sepia' | 'dark';

export interface Settings {
  readerTheme: ReaderTheme;
  fontScale: number;
}

interface LocalState {
  bookmarks: string[];
  progress: Record<string, { p: number; at: number }>;
  adPasses: Record<string, number>;
  settings: Settings;
  /** Simulated purchases for demo builds. */
  demo: { premium: boolean; credits: number; unlocked: string[] };
}

const DEFAULT_LOCAL: LocalState = {
  bookmarks: [],
  progress: {},
  adPasses: {},
  settings: { readerTheme: 'auto', fontScale: 1 },
  demo: { premium: false, credits: 0, unlocked: [] },
};

const LOCAL_KEY = 'local-v1';

export interface AppState {
  ready: boolean;
  catalog: repo.Catalog | undefined;
  catalogError: unknown;
  refreshCatalog: () => Promise<unknown>;
  session: repo.Session;
  /** True when purchases are simulated (no RevenueCat/Supabase). */
  simulatedStore: boolean;
  premium: boolean;
  credits: number;
  unlocked: Set<string>;
  bookmarks: string[];
  progress: LocalState['progress'];
  settings: Settings;
  hasAdPass: (contentId: string) => boolean;
  grantAdPass: (contentId: string) => void;
  toggleBookmark: (contentId: string) => void;
  setProgress: (contentId: string, p: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  buyPlan: (plan: Plan) => Promise<PurchaseOutcome>;
  buyPack: (offer: PackOffer) => Promise<PurchaseOutcome>;
  unlock: (content: Content) => Promise<repo.UnlockResult>;
  restore: () => Promise<boolean>;
  refreshOwnership: () => Promise<void>;
  setSession: (session: repo.Session) => Promise<void>;
  signOut: () => Promise<void>;
  /** Deletes the account (server data when live) and everything stored on this device. */
  deleteAccount: () => Promise<void>;
  resetDemoPurchases: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<LocalState>(DEFAULT_LOCAL);
  const [localLoaded, setLocalLoaded] = useState(false);
  const [session, setSessionState] = useState<repo.Session>({ userId: null, email: null, isAnonymous: true });
  const [accountReady, setAccountReady] = useState(false);
  const [server, setServer] = useState<repo.Ownership>({ premium: false, credits: 0, unlocked: [] });
  const [storeIsPremium, setStoreIsPremium] = useState(false);

  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: repo.fetchCatalog,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // ---- local persistence -------------------------------------------------
  useEffect(() => {
    let alive = true;
    void load<LocalState>(LOCAL_KEY, DEFAULT_LOCAL).then((stored) => {
      if (!alive) return;
      setLocal({ ...DEFAULT_LOCAL, ...stored, settings: { ...DEFAULT_LOCAL.settings, ...stored.settings } });
      setLocalLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!localLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(LOCAL_KEY, local), 600);
  }, [local, localLoaded]);

  // ---- account + purchases -----------------------------------------------
  const refreshOwnership = useCallback(async () => {
    if (!hasBackend || !session.userId) return;
    try {
      setServer(await repo.fetchOwnership(session.userId));
    } catch (error) {
      console.warn('Could not load ownership', error);
    }
  }, [session.userId]);

  const syncWithStore = useCallback(async () => {
    if (!hasStore) return;
    try {
      const result = await repo.syncPurchases();
      if (result) setServer((s) => ({ ...s, premium: result.premium, credits: result.credits }));
    } catch (error) {
      console.warn('Purchase sync failed', error);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await repo.ensureSession();
      if (!alive) return;
      setSessionState(s);
      configurePurchases(s.userId);
      if (s.userId) await identify(s.userId).catch(() => undefined);
      if (hasStore) setStoreIsPremium(await storePremium().catch(() => false));
      if (s.userId && hasBackend) {
        const owned = await repo.fetchOwnership(s.userId).catch(() => null);
        if (alive && owned) setServer(owned);
      }
      if (alive) setAccountReady(true);
      void syncWithStore();
    })();
    return () => {
      alive = false;
    };
  }, [syncWithStore]);

  useEffect(() => onPremiumChange(setStoreIsPremium), [accountReady]);

  const simulatedStore = !hasStore;
  const premium = server.premium || storeIsPremium || (simulatedStore && local.demo.premium);
  const credits = simulatedStore ? local.demo.credits : server.credits;
  const unlocked = useMemo(
    () => new Set([...server.unlocked, ...(simulatedStore ? local.demo.unlocked : [])]),
    [server.unlocked, simulatedStore, local.demo.unlocked],
  );

  // Free readers: gather ad consent shortly after launch (GDPR form / iOS tracking prompt).
  useEffect(() => {
    if (!accountReady || premium) return;
    const t = setTimeout(() => void prepareAds(), 1500);
    return () => clearTimeout(t);
  }, [accountReady, premium]);

  // ---- actions -------------------------------------------------------------
  // A ref mirror of `local` so back-to-back actions (buy credits → unlock) see the latest values.
  const localRef = useRef(local);
  useEffect(() => {
    localRef.current = local;
  }, [local]);
  const patchLocal = useCallback((fn: (s: LocalState) => LocalState) => {
    const next = fn(localRef.current);
    localRef.current = next;
    setLocal(next);
  }, []);

  const buyPlan = useCallback(
    async (plan: Plan): Promise<PurchaseOutcome> => {
      if (simulatedStore) {
        patchLocal((s) => ({ ...s, demo: { ...s.demo, premium: true } }));
        return 'purchased';
      }
      const outcome = await purchasePlan(plan);
      if (outcome === 'purchased') {
        setStoreIsPremium(true);
        await syncWithStore();
      }
      return outcome;
    },
    [simulatedStore, patchLocal, syncWithStore],
  );

  const buyPack = useCallback(
    async (offer: PackOffer): Promise<PurchaseOutcome> => {
      if (simulatedStore) {
        patchLocal((s) => ({ ...s, demo: { ...s.demo, credits: s.demo.credits + offer.credits } }));
        return 'purchased';
      }
      const outcome = await purchasePack(offer);
      if (outcome === 'purchased') await syncWithStore();
      return outcome;
    },
    [simulatedStore, patchLocal, syncWithStore],
  );

  const unlock = useCallback(
    async (content: Content): Promise<repo.UnlockResult> => {
      const price = content.price_credits;
      if (!price) return { ok: false, reason: 'not_purchasable' };
      if (simulatedStore) {
        const wallet = localRef.current.demo;
        if (wallet.unlocked.includes(content.id)) return { ok: true, balance: wallet.credits, already_owned: true };
        if (wallet.credits < price) {
          return { ok: false, reason: 'insufficient_credits', balance: wallet.credits, price };
        }
        patchLocal((s) => ({
          ...s,
          demo: { ...s.demo, credits: s.demo.credits - price, unlocked: [...s.demo.unlocked, content.id] },
        }));
        return { ok: true, balance: wallet.credits - price };
      }
      const result = await repo.unlockWithCredits(content.id);
      if (result.ok) {
        setServer((s) => ({
          ...s,
          credits: result.balance,
          unlocked: s.unlocked.includes(content.id) ? s.unlocked : [...s.unlocked, content.id],
        }));
      }
      return result;
    },
    [simulatedStore, patchLocal],
  );

  const restore = useCallback(async () => {
    if (simulatedStore) return localRef.current.demo.premium;
    const isPremium = await restorePurchases();
    setStoreIsPremium(isPremium);
    await syncWithStore();
    await refreshOwnership();
    return isPremium;
  }, [simulatedStore, syncWithStore, refreshOwnership]);

  const setSession = useCallback(
    async (next: repo.Session) => {
      setSessionState(next);
      if (next.userId) {
        await identify(next.userId).catch(() => undefined);
        if (hasStore) setStoreIsPremium(await storePremium().catch(() => false));
        const owned = await repo.fetchOwnership(next.userId).catch(() => null);
        if (owned) setServer(owned);
        void syncWithStore();
      }
    },
    [syncWithStore],
  );

  const signOut = useCallback(async () => {
    const next = await repo.signOut();
    setServer({ premium: false, credits: 0, unlocked: [] });
    await setSession(next);
  }, [setSession]);

  const deleteAccount = useCallback(async () => {
    const next = await repo.deleteAccount();
    setServer({ premium: false, credits: 0, unlocked: [] });
    patchLocal((s) => ({ ...DEFAULT_LOCAL, settings: s.settings }));
    await setSession(next);
  }, [patchLocal, setSession]);

  const value = useMemo<AppState>(
    () => ({
      ready: localLoaded && accountReady && (catalogQuery.isSuccess || catalogQuery.isError),
      catalog: catalogQuery.data,
      catalogError: catalogQuery.error,
      refreshCatalog: () => catalogQuery.refetch(),
      session,
      simulatedStore,
      premium,
      credits,
      unlocked,
      bookmarks: local.bookmarks,
      progress: local.progress,
      settings: local.settings,
      hasAdPass: (id) => adPassValid(local.adPasses[id], catalogQuery.data?.config.ads.unlock_hours ?? 24),
      grantAdPass: (id) => patchLocal((s) => ({ ...s, adPasses: { ...s.adPasses, [id]: Date.now() } })),
      toggleBookmark: (id) =>
        patchLocal((s) => ({
          ...s,
          bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [id, ...s.bookmarks],
        })),
      setProgress: (id, p) =>
        patchLocal((s) => {
          const prev = s.progress[id];
          if (prev && Math.abs(prev.p - p) < 0.01) return s;
          return { ...s, progress: { ...s.progress, [id]: { p, at: Date.now() } } };
        }),
      updateSettings: (patch) => patchLocal((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      buyPlan,
      buyPack,
      unlock,
      restore,
      refreshOwnership,
      setSession,
      signOut,
      deleteAccount,
      resetDemoPurchases: () => patchLocal((s) => ({ ...s, demo: DEFAULT_LOCAL.demo, adPasses: {} })),
    }),
    [
      localLoaded,
      accountReady,
      catalogQuery,
      session,
      simulatedStore,
      premium,
      credits,
      unlocked,
      local,
      patchLocal,
      buyPlan,
      buyPack,
      unlock,
      restore,
      refreshOwnership,
      setSession,
      signOut,
      deleteAccount,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Convenience selectors. */
export function useCatalog() {
  const { catalog } = useApp();
  return useMemo(() => {
    const categories = catalog?.categories ?? [];
    const contents = catalog?.contents ?? [];
    const byId = new Map(contents.map((c) => [c.id, c]));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    return { categories, contents, byId, categoryById, config: catalog?.config, source: catalog?.source };
  }, [catalog]);
}
