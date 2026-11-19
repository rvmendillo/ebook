import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  KIND_LABELS,
  type Category,
  type ContentAccess,
  type ContentKind,
  type ContentStatus,
} from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { PhonePreview } from '../components/PhonePreview';
import { useAdmin } from '../lib/admin';
import type { ContentInput } from '../lib/data';
import { renderMarkdown, slugify } from '../lib/markdown';
import { sanitize } from '../lib/sanitize';

const TEMPLATES: Record<ContentKind, string> = {
  article: `Start with a hook — why should a reader care?\n\n<!-- more -->\n\n## The big idea\n\nExplain it simply.\n\n## An example\n\n...\n`,
  tip: `One sentence that states the tip.\n\n<!-- more -->\n\n## How to do it\n\n1. ...\n2. ...\n\n> [!TIP]\n> A memorable takeaway.\n`,
  tutorial: `What you'll build or learn, and what you need first.\n\n<!-- more -->\n\n## Step 1\n\n...\n\n## Step 2\n\n...\n\n## Practice\n\n...\n`,
  ebook: `A short introduction to the whole book.\n\n<!-- more -->\n\n## Chapter 1 · Title\n\n...\n\n## Chapter 2 · Title\n\n...\n\n## Chapter 3 · Title\n\n...\n`,
};

interface Draft {
  id?: string;
  title: string;
  slug: string;
  slugTouched: boolean;
  summary: string;
  kind: ContentKind;
  category_id: string | null;
  cover_url: string;
  author: string;
  tags: string;
  access: ContentAccess;
  price_credits: string;
  is_featured: boolean;
  status: ContentStatus;
  published_at: string;
  body: string;
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};

export function ContentEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { data, notify } = useAdmin();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const cats = await data.listCategories();
        if (!alive) return;
        setCategories(cats);
        if (isNew) {
          setDraft({
            title: '',
            slug: '',
            slugTouched: false,
            summary: '',
            kind: 'article',
            category_id: cats[0]?.id ?? null,
            cover_url: '',
            author: '',
            tags: '',
            access: 'free',
            price_credits: '',
            is_featured: false,
            status: 'draft',
            published_at: '',
            body: TEMPLATES.article,
          });
          return;
        }
        const content = (await data.listContents()).find((c) => c.id === id);
        if (!content) throw new Error('Content not found');
        const body = await data.getBody(content.id);
        if (!alive) return;
        setDraft({
          id: content.id,
          title: content.title,
          slug: content.slug,
          slugTouched: true,
          summary: content.summary,
          kind: content.kind,
          category_id: content.category_id,
          cover_url: content.cover_url ?? '',
          author: content.author,
          tags: content.tags.join(', '),
          access: content.access,
          price_credits: content.price_credits ? String(content.price_credits) : '',
          is_featured: content.is_featured,
          status: content.status,
          published_at: toLocalInput(content.published_at),
          body,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [data, id, isNew]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const rendered = useMemo(() => renderMarkdown(draft?.body ?? '', { sanitize }), [draft?.body]);

  if (error) return <div className="notice error">{error}</div>;
  if (!draft) return <p className="muted">Loading…</p>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDirty(true);
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, [key]: value };
      if (key === 'title' && !d.slugTouched) next.slug = slugify(String(value));
      if (key === 'kind' && (!d.body.trim() || Object.values(TEMPLATES).includes(d.body)))
        next.body = TEMPLATES[value as ContentKind];
      return next;
    });
  };

  const category = categories.find((c) => c.id === draft.category_id);

  const save = async (statusOverride?: ContentStatus) => {
    const status = statusOverride ?? draft.status;
    if (!draft.title.trim()) return notify('Give it a title first', 'error');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug))
      return notify('Slug may only contain lowercase letters, numbers and dashes', 'error');
    const price = draft.price_credits ? Number.parseInt(draft.price_credits, 10) : null;
    if (draft.access === 'premium' && price !== null && (!Number.isFinite(price) || price <= 0)) {
      return notify('Credit price must be a positive whole number', 'error');
    }
    const publishedAt =
      status === 'published'
        ? draft.published_at
          ? new Date(draft.published_at).toISOString()
          : new Date().toISOString()
        : draft.published_at
          ? new Date(draft.published_at).toISOString()
          : null;
    const input: ContentInput = {
      id: draft.id,
      slug: draft.slug,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      kind: draft.kind,
      category_id: draft.category_id,
      cover_url: draft.cover_url.trim() || null,
      author: draft.author.trim(),
      tags: draft.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      access: draft.access,
      price_credits: draft.access === 'premium' ? price : null,
      reading_minutes: rendered.readingMinutes,
      is_featured: draft.is_featured,
      status,
      published_at: publishedAt,
      preview_html: rendered.previewHtml,
      headings: rendered.headings,
    };
    setSaving(true);
    try {
      const saved = await data.saveContent(input, { md: draft.body, html: rendered.html });
      setDirty(false);
      setDraft((d) => (d ? { ...d, id: saved.id, status, published_at: toLocalInput(saved.published_at) } : d));
      notify(status === 'published' ? 'Published — it’s live in the app' : 'Saved');
      if (isNew) navigate(`/content/${saved.id}`, { replace: true });
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    try {
      const url = await data.uploadImage(file);
      notify('Image uploaded');
      return url;
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Upload failed', 'error');
      throw e;
    }
  };

  const meta = `${KIND_LABELS[draft.kind]} · ${rendered.readingMinutes} min read${draft.author ? ` · ${draft.author}` : ''}`;

  return (
    <>
      <PageHead
        title={isNew ? 'New content' : 'Edit content'}
        subtitle={dirty ? 'Unsaved changes' : draft.status === 'published' ? 'Published' : 'Draft'}>
        <button className="btn" onClick={() => navigate('/content')}>
          Back
        </button>
        <button className="btn" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {draft.status !== 'published' ? (
          <button className="btn primary" disabled={saving} onClick={() => void save('published')}>
            Publish
          </button>
        ) : (
          <button className="btn" disabled={saving} onClick={() => void save('draft')}>
            Unpublish
          </button>
        )}
      </PageHead>

      <div className="editor">
        <div className="stack">
          <div className="card stack">
            <label className="field">
              Title
              <input
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. The Circle of Fifths, Explained"
              />
            </label>
            <label className="field">
              Summary <span className="help">Shown on cards and in search — one or two sentences.</span>
              <textarea rows={2} value={draft.summary} onChange={(e) => set('summary', e.target.value)} />
            </label>
            <div className="meta-grid">
              <label className="field">
                Type
                <select value={draft.kind} onChange={(e) => set('kind', e.target.value as ContentKind)}>
                  {(Object.keys(KIND_LABELS) as ContentKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Category
                <select value={draft.category_id ?? ''} onChange={(e) => set('category_id', e.target.value || null)}>
                  <option value="">— none —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Slug
                <input
                  value={draft.slug}
                  onChange={(e) => {
                    set('slugTouched', true);
                    set('slug', slugify(e.target.value));
                  }}
                />
              </label>
              <label className="field">
                Author
                <input value={draft.author} onChange={(e) => set('author', e.target.value)} />
              </label>
            </div>
            <div className="meta-grid">
              <label className="field">
                Access
                <select value={draft.access} onChange={(e) => set('access', e.target.value as ContentAccess)}>
                  <option value="free">Free — opens after an ad</option>
                  <option value="premium">Premium — subscription or credits</option>
                </select>
              </label>
              {draft.access === 'premium' ? (
                <label className="field">
                  Price in credits <span className="help">Empty = subscribers only</span>
                  <input
                    inputMode="numeric"
                    value={draft.price_credits}
                    onChange={(e) => set('price_credits', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 15"
                  />
                </label>
              ) : null}
              <label className="field">
                Tags <span className="help">Comma separated</span>
                <input
                  value={draft.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="beginner, theory"
                />
              </label>
              <label className="field">
                Publish date <span className="help">Future date = scheduled</span>
                <input
                  type="datetime-local"
                  value={draft.published_at}
                  onChange={(e) => set('published_at', e.target.value)}
                />
              </label>
            </div>
            <div className="row">
              <label className="field" style={{ flex: 1 }}>
                Cover image URL{' '}
                <span className="help">Optional — a cover is generated from the category otherwise</span>
                <input
                  value={draft.cover_url}
                  onChange={(e) => set('cover_url', e.target.value)}
                  placeholder="https://…"
                />
              </label>
              <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => coverInput.current?.click()}>
                Upload cover
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) set('cover_url', await upload(f));
                }}
              />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.is_featured}
                onChange={(e) => set('is_featured', e.target.checked)}
              />
              Feature on the home screen
            </label>
          </div>

          <div>
            <MarkdownEditor value={draft.body} onChange={(v) => set('body', v)} onUploadImage={upload} />
            <p className="faint small">
              {rendered.words} words · {rendered.readingMinutes} min read · {rendered.headings.length} sections. Free
              readers see everything above <code>&lt;!-- more --&gt;</code> before the ad / paywall.
            </p>
          </div>
        </div>

        <PhonePreview
          title={draft.title}
          kicker={category?.name}
          meta={meta}
          html={rendered.html}
          previewHtml={rendered.previewHtml}
          accent={category?.color}
        />
      </div>
    </>
  );
}
