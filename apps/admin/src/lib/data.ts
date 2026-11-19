/**
 * Data access for the admin app with two interchangeable back ends:
 * Supabase (production) and a local-storage demo database.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import sample from '../demo/library.json';
import { mergeConfig, type AppConfig, type Category, type Content, type LibraryBundle } from '../../../../shared/types';
import type { Connection } from './connection';

export type ContentInput = Omit<Content, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export interface Stats {
  published: number;
  drafts: number;
  premium: number;
  categories: number;
  users?: number;
  anonymous_users?: number;
  active_subscribers?: number;
  unlocks?: number;
  unlocks_30d?: number;
  credits_sold?: number;
  credits_spent?: number;
}

export interface Activity {
  unlocks: { id: string; user_id: string; content_id: string; credits_spent: number; created_at: string }[];
  ledger: {
    id: string;
    user_id: string;
    delta: number;
    kind: string;
    product_id: string | null;
    note: string | null;
    created_at: string;
  }[];
  subscriptions: {
    user_id: string;
    is_active: boolean;
    product_id: string | null;
    store: string | null;
    expires_at: string | null;
    will_renew: boolean;
  }[];
}

export interface DataSource {
  mode: 'supabase' | 'demo';
  client: SupabaseClient | null;
  listCategories(): Promise<Category[]>;
  saveCategory(input: Omit<Category, 'id'> & { id?: string }): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  listContents(): Promise<Content[]>;
  getBody(id: string): Promise<string>;
  saveContent(input: ContentInput, body: { md: string; html: string }): Promise<Content>;
  deleteContent(id: string): Promise<void>;
  getConfig(): Promise<AppConfig>;
  saveConfig(config: AppConfig): Promise<void>;
  stats(): Promise<Stats>;
  activity(): Promise<Activity | null>;
  grantCredits(userId: string, amount: number, note: string): Promise<void>;
  uploadImage(file: File): Promise<string>;
  importLibrary(bundle: LibraryBundle): Promise<{ categories: number; contents: number }>;
  exportLibrary(): Promise<LibraryBundle>;
}

const sampleBundle = sample as unknown as LibraryBundle;
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

function countStats(contents: Content[], categories: Category[]): Stats {
  return {
    published: contents.filter((c) => c.status === 'published').length,
    drafts: contents.filter((c) => c.status === 'draft').length,
    premium: contents.filter((c) => c.access === 'premium').length,
    categories: categories.length,
  };
}

// ---------------------------------------------------------------------------
// Demo (local storage)
// ---------------------------------------------------------------------------
interface LocalDb {
  categories: Category[];
  contents: Content[];
  bodies: Record<string, { md: string; html: string }>;
  config: AppConfig;
}

const LOCAL_KEY = 'polymath-admin-demo-db';

function seedLocal(): LocalDb {
  return {
    categories: sampleBundle.categories,
    contents: sampleBundle.contents.map(({ body_html: _h, body_md: _m, ...c }) => c),
    bodies: Object.fromEntries(sampleBundle.contents.map((c) => [c.id, { md: c.body_md ?? '', html: c.body_html }])),
    config: mergeConfig(sampleBundle.config),
  };
}

function createLocalSource(): DataSource {
  const read = (): LocalDb => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw) as LocalDb;
    } catch {
      // fall through to a fresh seed
    }
    const db = seedLocal();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
    return db;
  };
  const write = (db: LocalDb) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
    } catch {
      throw new Error('Browser storage is full. Remove large images or connect Supabase.');
    }
  };
  const ensureUniqueSlug = (list: { id: string; slug: string }[], slug: string, id?: string) => {
    if (list.some((x) => x.slug === slug && x.id !== id)) throw new Error(`The slug “${slug}” is already used.`);
  };

  return {
    mode: 'demo',
    client: null,
    async listCategories() {
      return [...read().categories].sort((a, b) => a.sort_order - b.sort_order);
    },
    async saveCategory(input) {
      const db = read();
      ensureUniqueSlug(db.categories, input.slug, input.id);
      const cat: Category = { ...input, id: input.id ?? uuid() };
      db.categories = input.id ? db.categories.map((c) => (c.id === input.id ? cat : c)) : [...db.categories, cat];
      write(db);
      return cat;
    },
    async deleteCategory(id) {
      const db = read();
      db.categories = db.categories.filter((c) => c.id !== id);
      db.contents = db.contents.map((c) => (c.category_id === id ? { ...c, category_id: null } : c));
      write(db);
    },
    async listContents() {
      return [...read().contents].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async getBody(id) {
      return read().bodies[id]?.md ?? '';
    },
    async saveContent(input, body) {
      const db = read();
      ensureUniqueSlug(db.contents, input.slug, input.id);
      const existing = input.id ? db.contents.find((c) => c.id === input.id) : undefined;
      const content: Content = {
        ...input,
        id: input.id ?? uuid(),
        created_at: existing?.created_at ?? now(),
        updated_at: now(),
      };
      db.contents = existing ? db.contents.map((c) => (c.id === content.id ? content : c)) : [content, ...db.contents];
      db.bodies[content.id] = body;
      write(db);
      return content;
    },
    async deleteContent(id) {
      const db = read();
      db.contents = db.contents.filter((c) => c.id !== id);
      delete db.bodies[id];
      write(db);
    },
    async getConfig() {
      return mergeConfig(read().config);
    },
    async saveConfig(config) {
      const db = read();
      db.config = config;
      write(db);
    },
    async stats() {
      const db = read();
      return countStats(db.contents, db.categories);
    },
    async activity() {
      return null;
    },
    async grantCredits() {
      throw new Error('Connect Supabase to manage readers and credits.');
    },
    async uploadImage(file) {
      if (file.size > 600_000)
        throw new Error('In demo mode images must be under 600 KB. Connect Supabase for real uploads.');
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
        reader.readAsDataURL(file);
      });
    },
    async importLibrary(bundle) {
      const db = read();
      const catBySlug = new Map(db.categories.map((c) => [c.slug, c]));
      const idMap = new Map<string, string>();
      for (const c of bundle.categories) {
        const existing = catBySlug.get(c.slug);
        if (existing) idMap.set(c.id, existing.id);
        else {
          db.categories.push(c);
          idMap.set(c.id, c.id);
        }
      }
      let added = 0;
      for (const item of bundle.contents) {
        if (db.contents.some((c) => c.slug === item.slug)) continue;
        const { body_html, body_md, ...content } = item;
        db.contents.push({
          ...content,
          category_id: content.category_id ? (idMap.get(content.category_id) ?? null) : null,
        });
        db.bodies[content.id] = { md: body_md ?? '', html: body_html };
        added++;
      }
      write(db);
      return { categories: bundle.categories.length, contents: added };
    },
    async exportLibrary() {
      const db = read();
      return {
        generated_at: now(),
        categories: db.categories,
        contents: db.contents.map((c) => ({
          ...c,
          body_md: db.bodies[c.id]?.md ?? '',
          body_html: db.bodies[c.id]?.html ?? '',
        })),
        config: db.config,
      };
    },
  };
}

export function resetDemoDatabase(): void {
  localStorage.removeItem(LOCAL_KEY);
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const CONTENT_COLUMNS =
  'id,slug,title,summary,kind,category_id,cover_url,author,tags,access,price_credits,reading_minutes,' +
  'is_featured,status,published_at,preview_html,headings,created_at,updated_at';

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return;
  if (error.code === '23505') throw new Error('That slug is already used — pick another one.');
  if (error.code === '42501' || /row-level security/i.test(error.message)) {
    throw new Error('Permission denied. Is your account listed in the admins table? (Settings → Setup)');
  }
  throw new Error(error.message);
}

function createSupabaseSource(conn: Connection): DataSource {
  const db = createClient(conn.url, conn.key, {
    auth: { persistSession: true, storageKey: 'polymath-admin-auth', autoRefreshToken: true },
  });

  const source: DataSource = {
    mode: 'supabase',
    client: db,
    async listCategories() {
      const { data, error } = await db.from('categories').select('*').order('sort_order');
      fail(error);
      return (data ?? []) as Category[];
    },
    async saveCategory(input) {
      const { data, error } = await db.from('categories').upsert(input).select().single();
      fail(error);
      return data as Category;
    },
    async deleteCategory(id) {
      const { error } = await db.from('categories').delete().eq('id', id);
      fail(error);
    },
    async listContents() {
      const { data, error } = await db
        .from('contents')
        .select(CONTENT_COLUMNS)
        .order('updated_at', { ascending: false });
      fail(error);
      return (data ?? []) as unknown as Content[];
    },
    async getBody(id) {
      const { data, error } = await db.from('content_bodies').select('body_md').eq('content_id', id).maybeSingle();
      fail(error);
      return (data?.body_md as string | undefined) ?? '';
    },
    async saveContent(input, body) {
      const { data, error } = await db.from('contents').upsert(input).select(CONTENT_COLUMNS).single();
      fail(error);
      const content = data as unknown as Content;
      const { error: bodyError } = await db
        .from('content_bodies')
        .upsert({ content_id: content.id, body_md: body.md, body_html: body.html });
      fail(bodyError);
      return content;
    },
    async deleteContent(id) {
      const { error } = await db.from('contents').delete().eq('id', id);
      fail(error);
    },
    async getConfig() {
      const { data, error } = await db.from('app_config').select('key,value');
      fail(error);
      return mergeConfig(Object.fromEntries((data ?? []).map((r) => [r.key, r.value])));
    },
    async saveConfig(config) {
      const rows = (Object.keys(config) as (keyof AppConfig)[]).map((key) => ({ key, value: config[key] }));
      const { error } = await db.from('app_config').upsert(rows);
      fail(error);
    },
    async stats() {
      const { data, error } = await db.rpc('admin_stats');
      fail(error);
      return data as Stats;
    },
    async activity() {
      const [unlocks, ledger, subscriptions] = await Promise.all([
        db.from('unlocks').select('*').order('created_at', { ascending: false }).limit(50),
        db.from('credit_ledger').select('*').order('created_at', { ascending: false }).limit(50),
        db.from('subscriptions').select('*').order('updated_at', { ascending: false }).limit(50),
      ]);
      fail(unlocks.error);
      fail(ledger.error);
      fail(subscriptions.error);
      return {
        unlocks: (unlocks.data ?? []) as Activity['unlocks'],
        ledger: (ledger.data ?? []) as Activity['ledger'],
        subscriptions: (subscriptions.data ?? []) as Activity['subscriptions'],
      };
    },
    async grantCredits(userId, amount, note) {
      const { error } = await db.from('credit_ledger').insert({ user_id: userId, delta: amount, kind: 'grant', note });
      fail(error);
    },
    async uploadImage(file) {
      const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `uploads/${new Date().toISOString().slice(0, 10)}/${uuid()}.${ext}`;
      const { error } = await db.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
      fail(error);
      return db.storage.from('media').getPublicUrl(path).data.publicUrl;
    },
    async importLibrary(bundle) {
      const existingCats = await source.listCategories();
      const catBySlug = new Map(existingCats.map((c) => [c.slug, c]));
      const idMap = new Map<string, string>();
      for (const c of bundle.categories) {
        const found = catBySlug.get(c.slug);
        if (found) {
          idMap.set(c.id, found.id);
          continue;
        }
        const { id: _drop, ...rest } = c;
        const saved = await source.saveCategory(rest);
        idMap.set(c.id, saved.id);
      }
      const existing = new Set((await source.listContents()).map((c) => c.slug));
      let added = 0;
      for (const item of bundle.contents) {
        if (existing.has(item.slug)) continue;
        const { body_html, body_md, id: _id, created_at: _c, updated_at: _u, ...content } = item;
        await source.saveContent(
          { ...content, category_id: content.category_id ? (idMap.get(content.category_id) ?? null) : null },
          { md: body_md ?? '', html: body_html },
        );
        added++;
      }
      return { categories: bundle.categories.length, contents: added };
    },
    async exportLibrary() {
      const [categories, contents, config] = await Promise.all([
        source.listCategories(),
        source.listContents(),
        source.getConfig(),
      ]);
      const { data, error } = await db.from('content_bodies').select('content_id, body_md, body_html');
      fail(error);
      const bodies = new Map((data ?? []).map((b) => [b.content_id as string, b]));
      return {
        generated_at: now(),
        categories,
        contents: contents.map((c) => ({
          ...c,
          body_md: (bodies.get(c.id)?.body_md as string) ?? '',
          body_html: (bodies.get(c.id)?.body_html as string) ?? '',
        })),
        config,
      };
    },
  };
  return source;
}

export function createDataSource(conn: Connection): DataSource {
  return conn.mode === 'supabase' ? createSupabaseSource(conn) : createLocalSource();
}

export const SAMPLE_LIBRARY = sampleBundle;
