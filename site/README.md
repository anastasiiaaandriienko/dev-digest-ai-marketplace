# Catalog site

React + TypeScript + Vite catalog of this marketplace, published to GitHub Pages.
Specification: [docs/SITE-SPEC.md](../docs/SITE-SPEC.md).

```sh
cd site
npm ci
npm run dev        # builds the index (../scripts/build-index.mjs → public/) and starts Vite
npm test           # Vitest (jsdom)
npm run build      # index + type check + production bundle in dist/
npm run preview    # serves dist/ locally
```

`public/index.json`, `public/releases.json`, `public/stats.json`, `public/bodies/` and
`dist/` are generated and git-ignored.

Layout: `src/lib` (data types, loading, routing, search, Markdown, dependency graph,
install commands), `src/components`, `src/screens`, `src/i18n/en.ts` (every UI string).
