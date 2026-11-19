import { NavLink, Outlet } from 'react-router';

import { useAdmin } from '../lib/admin';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '◎', end: true },
  { to: '/content', label: 'Content', icon: '✎' },
  { to: '/categories', label: 'Categories', icon: '▦' },
  { to: '/monetization', label: 'Monetization', icon: '◈' },
  { to: '/readers', label: 'Readers & sales', icon: '☺' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Layout() {
  const { connection, session, signOut } = useAdmin();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="./favicon-192.png" alt="" />
          <div>
            <strong>Polymath</strong>
            <span>Admin studio</span>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="ico" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="mode-pill">
          {connection.mode === 'demo' ? (
            <>
              <b>Demo mode</b> — saved in this browser.
              <br />
              Connect Supabase in Settings.
            </>
          ) : (
            <>
              <b>Live</b> · {new URL(connection.url).host.split('.')[0]}
              <br />
              {session?.user.email}
              <br />
              <button className="btn ghost small" style={{ color: '#fff', padding: '6px 0' }} onClick={() => void signOut()}>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <Toasts />
    </div>
  );
}

export function Toasts() {
  const { toasts } = useAdmin();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  );
}
