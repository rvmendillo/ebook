import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { KIND_LABELS, type ContentKind, type ContentStatus } from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { Thumb } from '../components/Thumb';
import { useAdmin, useLoad } from '../lib/admin';

export function ContentList() {
  const { data, notify } = useAdmin();
  const navigate = useNavigate();
  const {
    data: snapshot,
    error,
    reload,
  } = useLoad(async () => ({ contents: await data.listContents(), categories: await data.listCategories() }), [data]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [kind, setKind] = useState<ContentKind | ''>('');
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [access, setAccess] = useState('');

  const catById = useMemo(() => new Map((snapshot?.categories ?? []).map((c) => [c.id, c])), [snapshot]);
  const rows = (snapshot?.contents ?? []).filter(
    (c) =>
      (!q || `${c.title} ${c.summary} ${c.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())) &&
      (!cat || c.category_id === cat) &&
      (!kind || c.kind === kind) &&
      (!status || c.status === status) &&
      (!access || c.access === access),
  );

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try {
      await data.deleteContent(id);
      notify('Deleted');
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (error) return <div className="notice error">{error.message}</div>;

  return (
    <>
      <PageHead title="Content" subtitle="Articles, tips, tutorials and ebooks.">
        <Link className="btn primary" to="/content/new">
          + New content
        </Link>
      </PageHead>
      <div className="card">
        <div className="filters">
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {(snapshot?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as ContentKind | '')} aria-label="Type">
            <option value="">All types</option>
            {(Object.keys(KIND_LABELS) as ContentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus | '')} aria-label="Status">
            <option value="">Any status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select value={access} onChange={(e) => setAccess(e.target.value)} aria-label="Access">
            <option value="">Free & premium</option>
            <option value="free">Free (ad-supported)</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="list">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Access</th>
                <th>Status</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const category = c.category_id ? catById.get(c.category_id) : undefined;
                return (
                  <tr key={c.id} onDoubleClick={() => navigate(`/content/${c.id}`)}>
                    <td>
                      <div className="title-cell">
                        <Thumb content={c} category={category} />
                        <div>
                          <Link
                            to={`/content/${c.id}`}
                            style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                            {c.title}
                          </Link>
                          <div className="faint small">
                            {category?.name ?? 'Uncategorised'} · {c.reading_minutes} min
                            {c.is_featured ? ' · ★ featured' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge kind">{KIND_LABELS[c.kind]}</span>
                    </td>
                    <td>
                      {c.access === 'free' ? (
                        <span className="badge free">Free · ad</span>
                      ) : (
                        <span className="badge premium">
                          Premium{c.price_credits ? ` · ${c.price_credits} cr` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.status}`}>{c.status}</span>
                    </td>
                    <td className="small muted">{new Date(c.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div className="row end">
                        <Link className="btn small" to={`/content/${c.id}`}>
                          Edit
                        </Link>
                        <button className="btn small danger" onClick={() => void remove(c.id, c.title)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {snapshot && !rows.length ? <div className="empty">No content matches these filters.</div> : null}
      </div>
    </>
  );
}
