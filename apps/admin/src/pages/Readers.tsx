import { useState } from 'react';
import { Link } from 'react-router';

import { PageHead } from '../components/Layout';
import { useAdmin, useLoad } from '../lib/admin';

const short = (id: string) => `${id.slice(0, 8)}…`;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

export function Readers() {
  const { data, notify, connection } = useAdmin();
  const {
    data: snap,
    error,
    reload,
  } = useLoad(async () => ({ activity: await data.activity(), contents: await data.listContents() }), [data]);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('5');
  const [note, setNote] = useState('Thank-you gift');

  if (connection.mode === 'demo') {
    return (
      <>
        <PageHead title="Readers & sales" />
        <div className="card empty">
          <h2>Connect Supabase to see readers</h2>
          <p>
            Subscriptions, credit purchases and owned items are recorded in your Supabase project. Connect it in{' '}
            <Link to="/settings">Settings</Link>.
          </p>
        </div>
      </>
    );
  }
  if (error) return <div className="notice error">{error.message}</div>;
  if (!snap?.activity) return <p className="muted">Loading…</p>;
  const { unlocks, ledger, subscriptions } = snap.activity;
  const titles = new Map(snap.contents.map((c) => [c.id, c.title]));

  const grant = async () => {
    const n = Number.parseInt(amount, 10);
    if (!/^[0-9a-f-]{36}$/i.test(userId.trim()) || !Number.isFinite(n) || n === 0) {
      notify('Enter a reader id (UUID) and a non-zero amount', 'error');
      return;
    }
    try {
      await data.grantCredits(userId.trim(), n, note);
      notify(`${n} credits granted`);
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Grant failed', 'error');
    }
  };

  return (
    <>
      <PageHead title="Readers & sales" subtitle="Latest subscriptions, credit purchases and items owned." />
      <div className="grid two">
        <div className="card">
          <h2>Subscriptions</h2>
          <p className="sub">Mirrored from RevenueCat by the webhook.</p>
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th>Reader</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Renews / ends</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.user_id}>
                    <td>
                      <code title={s.user_id}>{short(s.user_id)}</code>
                    </td>
                    <td>
                      {s.is_active ? (
                        <span className="badge free">active</span>
                      ) : (
                        <span className="badge draft">inactive</span>
                      )}
                    </td>
                    <td className="small">
                      {s.product_id ?? '—'} <span className="faint">{s.store ?? ''}</span>
                    </td>
                    <td className="small">
                      {s.expires_at ? when(s.expires_at) : s.is_active ? 'lifetime' : '—'} {s.will_renew ? '↻' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!subscriptions.length ? <div className="empty">No subscribers yet.</div> : null}
        </div>

        <div className="card">
          <h2>Owned items</h2>
          <p className="sub">Premium items readers unlocked with credits.</p>
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Reader</th>
                  <th>Credits</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {unlocks.map((u) => (
                  <tr key={u.id}>
                    <td className="small">{titles.get(u.content_id) ?? short(u.content_id)}</td>
                    <td>
                      <code title={u.user_id}>{short(u.user_id)}</code>
                    </td>
                    <td>{u.credits_spent}</td>
                    <td className="small muted">{when(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!unlocks.length ? <div className="empty">Nothing sold yet.</div> : null}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Credit ledger</h2>
          <p className="sub">Purchases (+), spending (−), refunds and gifts.</p>
          <div className="table-wrap">
            <table className="list">
              <thead>
                <tr>
                  <th>Reader</th>
                  <th>Change</th>
                  <th>Type</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code title={l.user_id}>{short(l.user_id)}</code>
                    </td>
                    <td style={{ color: l.delta > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 800 }}>
                      {l.delta > 0 ? `+${l.delta}` : l.delta}
                    </td>
                    <td className="small">
                      {l.kind} <span className="faint">{l.product_id ?? l.note ?? ''}</span>
                    </td>
                    <td className="small muted">{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!ledger.length ? <div className="empty">No credit activity yet.</div> : null}
        </div>
        <div className="card stack">
          <div>
            <h2>Gift credits</h2>
            <p className="sub">
              Compensate a reader or run a promotion. Readers can share their ID from the app’s Account screen; it’s
              also listed in Supabase → Authentication → Users.
            </p>
          </div>
          <label className="field">
            Reader id (UUID)
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </label>
          <div className="fields">
            <label className="field">
              Credits
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="field">
              Note
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </div>
          <div>
            <button className="btn primary" onClick={() => void grant()}>
              Grant credits
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
