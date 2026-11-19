import { useMemo, useState } from 'react';

import { buildReaderDocument, type ReaderTheme } from '../../../../shared/reader';

/** Live preview inside a phone frame, rendered with the exact same template as the app. */
export function PhonePreview({
  title,
  kicker,
  meta,
  html,
  previewHtml,
  accent,
}: {
  title: string;
  kicker?: string;
  meta?: string;
  html: string;
  previewHtml: string;
  accent?: string;
}) {
  const [view, setView] = useState<'full' | 'preview'>('full');
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const doc = useMemo(
    () =>
      buildReaderDocument({
        html: view === 'full' ? html : `${previewHtml}<hr><p style="text-align:center;opacity:.7"><b>🔒 The rest is behind the ad / paywall gate</b></p>`,
        theme,
        accent,
        header: { title: title || 'Untitled', kicker, meta },
      }),
    [view, html, previewHtml, theme, accent, title, kicker, meta],
  );
  return (
    <div>
      <div className="phone-tabs">
        <button className={`btn small ${view === 'full' ? 'primary' : ''}`} onClick={() => setView('full')}>
          Full text
        </button>
        <button className={`btn small ${view === 'preview' ? 'primary' : ''}`} onClick={() => setView('preview')}>
          Free preview
        </button>
        <select value={theme} onChange={(e) => setTheme(e.target.value as ReaderTheme)} style={{ width: 'auto' }} aria-label="Preview theme">
          <option value="light">Light</option>
          <option value="sepia">Sepia</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div className="phone">
        <iframe title="Phone preview" srcDoc={doc} sandbox="allow-scripts" />
      </div>
    </div>
  );
}
