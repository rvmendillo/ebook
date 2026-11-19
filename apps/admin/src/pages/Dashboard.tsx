import { Link } from 'react-router';

import { KIND_LABELS } from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { Thumb } from '../components/Thumb';
import { useAdmin, useLoad } from '../lib/admin';

export function Dashboard() {
  const { data, connection } = useAdmin();
  const { data: snapshot, error } = useLoad(
    async () => {
      const [stats, contents, categories] = await Promise.all([data.stats(), data.listContents(), data.listCategories()]);
      return { stats, contents, categories };
    },
    [data],
  );

  if (error) return <div className="notice error">{error.message}</div>;
  if (!snapshot) return <p className="muted">Loading…</p>;
  const { stats, contents, categories } = snapshot;
  const byCat = categories.map((c) => ({ c, n: contents.filter((x) => x.category_id === c.id).length }));
  const max = Math.max(1, ...byCat.map((x) => x.n));
  const catById = new Map(categories.map((c) => [c.id, c]));

  return (
    <>
      <PageHead title="Dashboard" subtitle="Your library at a glance.">
        <Link className="btn primary" to="/content/new">
          + New content
        </Link>
      </PageHead>

      {connection.mode === 'demo' ? (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          <b>Demo mode.</b> Changes are saved in this browser only. Connect your Supabase project in{' '}
          <Link to="/settings">Settings</Link> to publish to the app.
        </div>
      ) : null}

      <div className="grid stats">
        <div className="card stat accent">
          <div className="label">Published</div>
          <div className="value">{stats.published}</div>
          <div className="hint">live in the app</div>
        </div>
        <div className="card stat">
          <div className="label">Drafts</div>
          <div className="value">{stats.drafts}</div>
        </div>
        <div className="card stat">
          <div className="label">Premium items</div>
          <div className="value">{stats.premium}</div>
        </div>
        <div className="card stat">
          <div className="label">Categories</div>
          <div className="value">{stats.categories}</div>
        </div>
        {stats.users !== undefined ? (
          <>
            <div className="card stat">
              <div className="label">Readers</div>
              <div className="value">{stats.users}</div>
              <div className="hint">{stats.anonymous_users ?? 0} guests</div>
            </div>
            <div className="card stat">
              <div className="label">Subscribers</div>
              <div className="value">{stats.active_subscribers}</div>
              <div className="hint">active now</div>
            </div>
            <div className="card stat">
              <div className="label">Items sold (30d)</div>
              <div className="value">{stats.unlocks_30d}</div>
              <div className="hint">{stats.unlocks} all time</div>
            </div>
            <div className="card stat">
              <div className="label">Credits sold</div>
              <div className="value">{stats.credits_sold}</div>
              <div className="hint">{stats.credits_spent} spent</div>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>By subject</h2>
          <p className="sub">How much you’ve written per category.</p>
          <div className="bars">
            {byCat.map(({ c, n }) => (
              <div className="bar" key={c.id}>
                <span>
                  {c.icon} {c.name}
                </span>
                <div className="track">
                  <div className="fill" style={{ width: `${(n / max) * 100}%`, background: c.color }} />
                </div>
                <b>{n}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="row between">
            <h2>Recently edited</h2>
            <Link to="/content" className="small">
              All content →
            </Link>
          </div>
          <table className="list" style={{ marginTop: 8 }}>
            <tbody>
              {contents.slice(0, 6).map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/content/${c.id}`} className="title-cell" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <Thumb content={c} category={c.category_id ? catById.get(c.category_id) : undefined} />
                      <span>
                        <b>{c.title}</b>
                        <br />
                        <span className="faint small">
                          {KIND_LABELS[c.kind]} · {c.status}
                        </span>
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
