/**
 * Renders the Markdown in /content into:
 *   apps/mobile/src/demo/library.json   – offline demo library bundled in the app
 *   apps/admin/src/demo/library.json    – demo data + "import sample library" in the admin
 *   supabase/seed.sql                   – the same library as SQL for a fresh project
 *
 *   npm run content        (from apps/admin)
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from '../src/lib/markdown.ts';
import { mergeConfig, type AppConfig, type Category, type Content, type LibraryBundle } from '../../../shared/types.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** Stable UUID (v5-style layout) derived from a name, so regenerated ids never change. */
export function stableId(name: string): string {
  const h = createHash('sha1').update(`polymath:${name}`).digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Minimal front-matter parser: `key: value`, `[a, b]` lists, booleans, quoted strings. */
export function parseFrontMatter(src: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { data: {}, body: src };
  const data: Record<string, unknown> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const [, key, raw] = kv;
    const v = raw.trim();
    if (v === '') data[key] = null;
    else if (v === 'true' || v === 'false') data[key] = v === 'true';
    else if (/^-?\d+(\.\d+)?$/.test(v)) data[key] = Number(v);
    else if (v.startsWith('[') && v.endsWith(']')) {
      data[key] = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else data[key] = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
  }
  return { data, body: src.slice(m[0].length) };
}

const sql = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.length ? `array[${v.map(sql).join(', ')}]::text[]` : `'{}'::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const sqlJson = (v: unknown) => `${sql(JSON.stringify(v))}::jsonb`;

function main() {
  const categoriesIn = JSON.parse(read('content/categories.json')) as Omit<Category, 'id'>[];
  const config: AppConfig = mergeConfig(JSON.parse(read('content/config.json')));
  const categories: Category[] = categoriesIn.map((c) => ({ id: stableId(`category:${c.slug}`), ...c }));
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const files = readdirSync(join(root, 'content/samples'))
    .filter((f) => f.endsWith('.md'))
    .sort();
  const base = Date.parse('2026-11-15T09:00:00Z');
  const contents: LibraryBundle['contents'] = files.map((file, index) => {
    const { data, body } = parseFrontMatter(read(`content/samples/${file}`));
    const slug = String(data.slug ?? file.replace(/^\d+-/, '').replace(/\.md$/, ''));
    const category = bySlug.get(String(data.category));
    if (!category) throw new Error(`${file}: unknown category "${data.category}"`);
    const rendered = renderMarkdown(body);
    const published = new Date(base - index * 36 * 3_600_000).toISOString();
    const content: Content & { body_html: string; body_md: string } = {
      id: stableId(`content:${slug}`),
      slug,
      title: String(data.title),
      summary: String(data.summary ?? ''),
      kind: (data.kind as Content['kind']) ?? 'article',
      category_id: category.id,
      cover_url: (data.cover as string) ?? null,
      author: String(data.author ?? ''),
      tags: (data.tags as string[]) ?? [],
      access: data.access === 'premium' ? 'premium' : 'free',
      price_credits: data.access === 'premium' && typeof data.price_credits === 'number' ? data.price_credits : null,
      reading_minutes: rendered.readingMinutes,
      is_featured: Boolean(data.featured),
      status: 'published',
      published_at: published,
      preview_html: rendered.previewHtml,
      headings: rendered.headings,
      created_at: published,
      updated_at: published,
      body_html: rendered.html,
      body_md: body,
    };
    return content;
  });

  const bundle: LibraryBundle = { generated_at: new Date(base).toISOString(), categories, contents, config };

  const mobileBundle = { ...bundle, contents: contents.map(({ body_md: _drop, ...rest }) => rest) };
  for (const [path, value] of [
    ['apps/mobile/src/demo/library.json', mobileBundle],
    ['apps/admin/src/demo/library.json', bundle],
  ] as const) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(value, null, 1) + '\n');
  }

  const lines: string[] = [
    '-- Polymath starter library.',
    '-- GENERATED by apps/admin/scripts/build-content.ts from /content — edit the Markdown, then run `npm run content`.',
    '-- Safe to run more than once: existing rows (matched by slug/key) are left untouched.',
    '',
    'insert into public.categories (slug, name, description, icon, color, sort_order) values',
    categories
      .map((c) => `  (${[c.slug, c.name, c.description, c.icon, c.color, c.sort_order].map(sql).join(', ')})`)
      .join(',\n') + '\non conflict (slug) do nothing;',
    '',
  ];
  for (const c of contents) {
    const catSlug = categories.find((k) => k.id === c.category_id)!.slug;
    lines.push(
      'insert into public.contents (slug, title, summary, kind, category_id, cover_url, author, tags, access, price_credits,',
      '  reading_minutes, is_featured, status, published_at, preview_html, headings)',
      `values (${sql(c.slug)}, ${sql(c.title)}, ${sql(c.summary)}, ${sql(c.kind)},`,
      `  (select id from public.categories where slug = ${sql(catSlug)}), ${sql(c.cover_url)}, ${sql(c.author)}, ${sql(c.tags)},`,
      `  ${sql(c.access)}, ${sql(c.price_credits)}, ${c.reading_minutes}, ${c.is_featured}, 'published', ${sql(c.published_at)},`,
      `  ${sql(c.preview_html)}, ${sqlJson(c.headings)})`,
      'on conflict (slug) do nothing;',
      'insert into public.content_bodies (content_id, body_md, body_html)',
      `select id, ${sql(c.body_md)}, ${sql(c.body_html)} from public.contents where slug = ${sql(c.slug)}`,
      'on conflict (content_id) do nothing;',
      '',
    );
  }
  lines.push(
    'insert into public.app_config (key, value) values',
    (Object.keys(config) as (keyof AppConfig)[]).map((k) => `  (${sql(k)}, ${sqlJson(config[k])})`).join(',\n'),
    'on conflict (key) do nothing;',
    '',
  );
  writeFileSync(join(root, 'supabase/seed.sql'), lines.join('\n'));

  console.log(`Rendered ${contents.length} items in ${categories.length} categories.`);
  for (const c of contents) {
    console.log(`  ${c.access === 'premium' ? '★' : '·'} ${c.kind.padEnd(8)} ${c.reading_minutes}m  ${c.title}`);
  }
}

main();
