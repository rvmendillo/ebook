# Polymath — admin studio

React 19 + Vite 8 web app for publishing content and managing monetization. Works against your Supabase project, or in demo mode (browser storage) until one is connected.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # renderer + access rules + reader template
npm run build        # static site in dist/ (deployed to GitHub Pages by .github/workflows/admin.yml)
npm run content      # re-render /content into the app's demo library and supabase/seed.sql
```

```
src/pages/        Dashboard, Content list/editor, Categories, Monetization, Readers & sales, Settings, Login
src/components/   Layout, Markdown editor toolbar, live phone preview
src/lib/          Markdown renderer (KaTeX/highlight.js/ABC), sanitizer, data sources (Supabase + demo), auth context
scripts/          build-content.ts
tests/            node:test suites (run with tsx)
```

Guide: [docs/CONTENT.md](../../docs/CONTENT.md).
