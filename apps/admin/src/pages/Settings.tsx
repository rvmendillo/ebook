import { createClient } from '@supabase/supabase-js';
import { useRef, useState } from 'react';

import type { LibraryBundle } from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { useAdmin } from '../lib/admin';
import { saveConnection } from '../lib/connection';
import { resetDemoDatabase, SAMPLE_LIBRARY } from '../lib/data';

export function Settings() {
  const { connection, reconnect, data, notify } = useAdmin();
  const [url, setUrl] = useState(connection.mode === 'supabase' ? connection.url : '');
  const [key, setKey] = useState(connection.mode === 'supabase' ? connection.key : '');
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const test = async () => {
    setTesting(true);
    try {
      const client = createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
      const { error } = await client.from('categories').select('id').limit(1);
      if (error) throw new Error(error.message);
      notify('Connected — the Polymath schema is installed');
      return true;
    } catch (e) {
      notify(`Connection failed: ${e instanceof Error ? e.message : String(e)}. Did you run the migration?`, 'error');
      return false;
    } finally {
      setTesting(false);
    }
  };

  const connect = async () => {
    if (!(await test())) return;
    saveConnection({ url: url.trim(), key: key.trim() });
    reconnect();
  };

  const download = async () => {
    const bundle = await data.exportLibrary();
    const name = `polymath-library-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    // In the iOS app (and on phones) hand the file to the share sheet — Files, AirDrop, Mail…
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Polymath library export' });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBundle = async (bundle: LibraryBundle) => {
    setBusy(true);
    try {
      const r = await data.importLibrary(bundle);
      notify(`Imported ${r.contents} new items (${r.categories} categories checked)`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Settings" subtitle="Connection, import/export and setup." />

      <div className="card stack">
        <div>
          <h2>Supabase connection</h2>
          <p className="sub">
            {connection.mode === 'supabase'
              ? `Connected to ${new URL(connection.url).host} (${connection.source === 'build' ? 'set at build time' : 'saved in this browser'}).`
              : 'Demo mode — content is stored in this browser only.'}
          </p>
        </div>
        <div className="fields">
          <label className="field">
            Project URL
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://abcdefgh.supabase.co" />
          </label>
          <label className="field">
            Publishable (anon) key
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="sb_publishable_… or eyJ…" />
          </label>
        </div>
        <p className="faint small">
          Supabase → Project Settings → API. The publishable key is safe in a browser; row-level security decides what
          each user can change. Never paste the service-role / secret key here.
        </p>
        <div className="row">
          <button className="btn primary" disabled={!url || !key || testing} onClick={() => void connect()}>
            {testing ? 'Checking…' : 'Save & connect'}
          </button>
          <button className="btn" disabled={!url || !key || testing} onClick={() => void test()}>
            Test
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              saveConnection({ demo: true });
              reconnect();
            }}>
            Switch to demo mode
          </button>
          {connection.source === 'browser' ? (
            <button
              className="btn ghost"
              onClick={() => {
                saveConnection(null);
                reconnect();
              }}>
              Forget saved connection
            </button>
          ) : null}
        </div>
      </div>

      <div className="card stack">
        <div>
          <h2>Library import & export</h2>
          <p className="sub">Back up everything as JSON, move content between projects, or load the starter library.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => void download()}>
            Export JSON
          </button>
          <button className="btn" disabled={busy} onClick={() => file.current?.click()}>
            Import JSON…
          </button>
          <button className="btn" disabled={busy} onClick={() => void importBundle(SAMPLE_LIBRARY)}>
            Load starter library ({SAMPLE_LIBRARY.contents.length} items)
          </button>
          {connection.mode === 'demo' ? (
            <button
              className="btn danger"
              onClick={() => {
                if (!confirm('Reset the demo database to the starter library?')) return;
                resetDemoDatabase();
                location.reload();
              }}>
              Reset demo data
            </button>
          ) : null}
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                await importBundle(JSON.parse(await f.text()) as LibraryBundle);
              } catch {
                notify('That file is not a Polymath library export', 'error');
              }
            }}
          />
        </div>
        <p className="faint small">Imports only add items whose slug doesn’t exist yet — nothing is overwritten.</p>
      </div>

      <div className="card stack">
        <h2>Setup checklist</h2>
        <ol className="checklist">
          <li>
            <span className={`dot ${connection.mode === 'supabase' ? 'ok' : ''}`}>1</span>
            <div>
              <b>Create a Supabase project</b> and run <code>supabase/migrations/*.sql</code> (SQL editor or{' '}
              <code>supabase db push</code>). Optional: <code>supabase/seed.sql</code> for the starter library.
            </div>
          </li>
          <li>
            <span className="dot">2</span>
            <div>
              <b>Enable anonymous sign-ins</b> (Authentication → Sign In / Providers) so every app install gets an
              account for its purchases.
            </div>
          </li>
          <li>
            <span className="dot">3</span>
            <div>
              <b>Make yourself admin:</b> create a user (Authentication → Users → Add user) and run{' '}
              <code>
                insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
              </code>
            </div>
          </li>
          <li>
            <span className="dot">4</span>
            <div>
              <b>Payments:</b> create the products in App Store Connect / Google Play, connect them in RevenueCat,
              deploy the edge functions and add the webhook.
            </div>
          </li>
          <li>
            <span className="dot">5</span>
            <div>
              <b>Ads:</b> create an AdMob app per platform plus rewarded, interstitial and banner units.
            </div>
          </li>
          <li>
            <span className="dot">6</span>
            <div>
              <b>Build:</b> add the keys as GitHub secrets — the iOS and Android workflows build the app with them. Full
              guide: <code>docs/SETUP.md</code> in the repository.
            </div>
          </li>
        </ol>
      </div>
    </>
  );
}
