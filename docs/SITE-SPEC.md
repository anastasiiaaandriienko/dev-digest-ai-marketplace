# Catalog site — specification

A static catalog on GitHub Pages for **discovery**: find a plugin, skill or agent, read its
documentation, see versions and dependencies, and copy the install command. Installing
stays in the Claude Code CLI. No backend, ratings or download counters in this version.

## Architecture

```
repository sources ──► scripts/build-index.mjs ──► site/public/{index,releases,stats}.json + bodies/*.md
                                                         │
                         site/ (React + TypeScript + Vite) ── fetches the JSON at run time ──► site/dist ──► GitHub Pages
```

- **Build-time index.** GitHub Pages serves static files only, so the browser cannot read
  `plugins/` at run time. `build-index.mjs` snapshots the repository on every build.
  Generated JSON, `bodies/` and `site/dist/` are not committed.
- **Where it builds.** Pull requests: the `Build catalog site` job in
  `.github/workflows/validate.yml` (index + type check + tests + build). `main`:
  `.github/workflows/pages.yml` builds again and deploys `site/dist`.
- **Local development.** `cd site && npm ci && npm run dev` (rebuilds the index first);
  `npm run build && npm run preview` for the production bundle.

## Index fields

| File | Content |
|---|---|
| `index.json` | `marketplace` (name, description, owner, repository, GitHub slug); `plugins[]` (name, version, description, keywords, category, tags, author, license, dependencies with ranges, dependents, skill and agent ids, eval case names, minimum Claude Code version, install command, body paths, source path, search text); `artifacts[]` (skills and agents: id, type, name, namespaced name, plugin, description, manual-only flag, argument hint, third-party flag, model, tools, body path, source path, search text) |
| `releases.json` | one entry per `## <version>` section of each plugin's `CHANGELOG.md`: plugin, version, tag `<plugin>--v<version>`, `released` (the tag exists), date (tag date, else changelog date), notes |
| `stats.json` | counts of plugins, skills, agents, eval cases, third-party skills, tagged versions; commit SHA and build time |
| `bodies/*.md` | README of each plugin, its CHANGELOG and COMPATIBILITY, and the body of every SKILL.md and agent file (frontmatter removed) |

Ids: `plugin:<plugin>`, `skill:<plugin>:<skill>`, `agent:<plugin>:<agent>`.

## Routes (hash routing, works on any Pages sub-path)

| Route | Screen |
|---|---|
| `#/` | stats tiles, dependency graph, plugin cards |
| `#/search?q=<text>&type=<all\|plugin\|skill\|agent>` | results as cards with type facets |
| `#/plugin/<name>` | version, owner, license, compatibility, dependencies and dependents (graph), skills, agents, eval cases, install commands, README, changelog |
| `#/artifact/<id>` | namespaced name, plugin and version, description, model and tools (agents), manual-only flag (skills), third-party notice, body |
| `#/whats-new` | releases feed, newest first; unreleased versions are labelled as such |
| `#/getting-started` | add the marketplace, install a plugin, update, where to read more |

Unknown routes show a not-found screen with a link home.

## Search

- Client-side full-text search (MiniSearch) over name, namespaced name, description,
  keywords/tags and the search text of READMEs, SKILL.md and agent bodies; prefix and
  fuzzy matching; name and description are boosted.
- The header search box is available on every page; `/` focuses it.
- Results can be filtered by type (plugin, skill, agent).

## Detail pages

- A plugin page shows the version and dependency ranges exactly as in `plugin.json`, and
  the commands:
  - `/plugin marketplace add <owner>/<repo>`
  - `/plugin install <plugin>@<marketplace>`
  - `claude plugin install <plugin>@<marketplace> --scope project`
- **Copy** buttons copy the exact command; the button confirms or reports failure.

## Markdown rendering (security)

Repository content is not trusted HTML. Markdown is rendered with `marked` and the result
is always sanitized with DOMPurify before it reaches the DOM:

- no scripts, event handlers, `style`, iframes, forms or embedded objects;
- links keep only `http(s)`, `mailto` and in-page anchors; relative links resolve to the
  file on GitHub; external links open in a new tab with `rel="noopener noreferrer"`;
- images resolve to `raw.githubusercontent.com` for relative paths.

## Quality

- All UI strings live in one file (`site/src/i18n/en.ts`), none hard-coded in components.
- Dark theme first, light theme as an option (remembered per browser; storage failures are
  ignored).
- Keyboard: every control is reachable; visible focus.
- Tests (Vitest): Markdown sanitizing, search, routing, dependency layering, install
  commands, and render tests of the main screens. `scripts/test/build-index.test.mjs`
  covers the index.

## Out of scope (later)

Download statistics (needs a backend), ratings, plugin collections, an MCP server for
search, RSS.
