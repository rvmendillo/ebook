import { useEffect, useState } from 'react';

import type { AppConfig, CreditPack } from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { useAdmin } from '../lib/admin';

export function Monetization() {
  const { data, notify } = useAdmin();
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void data.getConfig().then(setCfg).catch((e: Error) => notify(e.message, 'error'));
  }, [data, notify]);

  if (!cfg) return <p className="muted">Loading…</p>;

  const setPack = (i: number, patch: Partial<CreditPack>) =>
    setCfg({ ...cfg, pricing: { credit_packs: cfg.pricing.credit_packs.map((p, j) => (j === i ? { ...p, ...patch } : p)) } });

  const save = async () => {
    setSaving(true);
    try {
      await data.saveConfig({
        ...cfg,
        paywall: { ...cfg.paywall, benefits: cfg.paywall.benefits.map((b) => b.trim()).filter(Boolean) },
      });
      notify('Monetization settings saved — the app picks them up on next launch');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Monetization" subtitle="Ads for the free tier, the Premium subscription, and pay-as-you-go credits.">
        <button className="btn primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </PageHead>

      <div className="grid two">
        <div className="card stack">
          <div>
            <h2>Free tier · ads</h2>
            <p className="sub">Free items open after an ad for readers without Premium.</p>
          </div>
          <label className="field">
            Ad before free content
            <select value={cfg.ads.gate} onChange={(e) => setCfg({ ...cfg, ads: { ...cfg.ads, gate: e.target.value as AppConfig['ads']['gate'] } })}>
              <option value="rewarded">Rewarded video — reader taps “Watch ad” (best eCPM)</option>
              <option value="interstitial">Interstitial — full-screen ad, then read</option>
              <option value="off">Off — free content opens without ads</option>
            </select>
          </label>
          <label className="field">
            Keep an item open after an ad for (hours)
            <input
              type="number"
              min={0}
              max={720}
              value={cfg.ads.unlock_hours}
              onChange={(e) => setCfg({ ...cfg, ads: { ...cfg.ads, unlock_hours: Number(e.target.value) } })}
            />
          </label>
          <label className="check">
            <input type="checkbox" checked={cfg.ads.banners} onChange={(e) => setCfg({ ...cfg, ads: { ...cfg.ads, banners: e.target.checked } })} />
            Show banner ads in lists (free readers only)
          </label>
          <div className="notice small">
            Ad unit IDs are set at build time (GitHub secrets <code>EXPO_PUBLIC_ADMOB_*</code>). Until then the app shows
            Google’s test ads.
          </div>
        </div>

        <div className="card stack">
          <div>
            <h2>Paywall</h2>
            <p className="sub">Copy on the Premium screen.</p>
          </div>
          <label className="field">
            Headline
            <input value={cfg.paywall.headline} onChange={(e) => setCfg({ ...cfg, paywall: { ...cfg.paywall, headline: e.target.value } })} />
          </label>
          <label className="field">
            Sub-headline
            <input value={cfg.paywall.subheadline} onChange={(e) => setCfg({ ...cfg, paywall: { ...cfg.paywall, subheadline: e.target.value } })} />
          </label>
          <label className="field">
            Benefits <span className="help">One per line</span>
            <textarea
              rows={5}
              value={cfg.paywall.benefits.join('\n')}
              onChange={(e) => setCfg({ ...cfg, paywall: { ...cfg.paywall, benefits: e.target.value.split('\n') } })}
            />
          </label>
          <div className="notice small">
            Subscription plans and prices come from the store via RevenueCat (offering <b>default</b>, entitlement{' '}
            <b>premium</b>).
          </div>
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div>
          <h2>Credit packs · pay as you go</h2>
          <p className="sub">
            Consumable products readers buy to own single premium items. Create each product id in App Store Connect and
            Google Play, then add it to RevenueCat. Set the credit price of each item in its editor.
          </p>
        </div>
        <div className="table-wrap">
          <table className="list">
            <thead>
              <tr>
                <th>Store product id</th>
                <th>Credits</th>
                <th>Fallback price</th>
                <th>Badge</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {cfg.pricing.credit_packs.map((p, i) => (
                <tr key={i}>
                  <td>
                    <input value={p.id} onChange={(e) => setPack(i, { id: e.target.value.trim() })} />
                  </td>
                  <td>
                    <input type="number" min={1} value={p.credits} onChange={(e) => setPack(i, { credits: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input value={p.fallback_price} onChange={(e) => setPack(i, { fallback_price: e.target.value })} />
                  </td>
                  <td>
                    <input value={p.badge ?? ''} placeholder="optional" onChange={(e) => setPack(i, { badge: e.target.value || undefined })} />
                  </td>
                  <td>
                    <button
                      className="btn small danger"
                      onClick={() => setCfg({ ...cfg, pricing: { credit_packs: cfg.pricing.credit_packs.filter((_, j) => j !== i) } })}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <button
            className="btn"
            onClick={() =>
              setCfg({
                ...cfg,
                pricing: { credit_packs: [...cfg.pricing.credit_packs, { id: `credits_${(cfg.pricing.credit_packs.length + 1) * 10}`, credits: 10, fallback_price: '$1.99' }] },
              })
            }>
            + Add pack
          </button>
        </div>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h2>Legal & support links</h2>
        <div className="fields">
          {(['privacy', 'terms', 'support'] as const).map((k) => (
            <label key={k} className="field">
              {k === 'privacy' ? 'Privacy policy URL' : k === 'terms' ? 'Terms of use URL' : 'Support (URL or mailto:)'}
              <input value={cfg.links[k]} onChange={(e) => setCfg({ ...cfg, links: { ...cfg.links, [k]: e.target.value } })} />
            </label>
          ))}
        </div>
        <p className="faint small">Apple and Google require working privacy and terms links for apps that sell subscriptions.</p>
      </div>
    </>
  );
}
