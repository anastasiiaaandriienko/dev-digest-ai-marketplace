# Contributing

This repository is the team's Claude Code harness. A change here ships to every
project that installs the plugins, so every change goes through a pull request,
review by the owners in [CODEOWNERS](CODEOWNERS), and green CI.

## Plugin structure

```
plugins/<plugin-name>/
├── .claude-plugin/plugin.json   required
├── agents/<agent>.md            optional
├── skills/<skill>/SKILL.md      optional (+ scripts/, references/, assets/)
├── references/                  optional, plugin-level files read by agents/skills
├── evals/<case>/                optional: prompt.md, case.yaml, graders/*.md
├── README.md                    required
├── CHANGELOG.md                 required
└── COMPATIBILITY.md             required when the plugin has dependencies or needs a minimum Claude Code version
```

Only `plugin.json` goes inside `.claude-plugin/`. A `CLAUDE.md` inside a plugin is not
loaded by Claude Code; put instructions into a skill or agent.

## Manifest fields

`plugins/<name>/.claude-plugin/plugin.json` is the source of truth for the plugin:

| Field | Rule |
|---|---|
| `name` | kebab-case, equals the directory name and the marketplace entry name |
| `version` | SemVer; bump it in every release (see [docs/RELEASES.md](docs/RELEASES.md)) |
| `description` | one or two sentences: what the plugin gives the user |
| `author`, `repository`, `license`, `keywords` | required by our lint |
| `dependencies` | `[{ "name": "<plugin in this marketplace>", "version": "^X.Y.Z" }]` |

The marketplace entry in `.claude-plugin/marketplace.json` carries only `name`,
`source` (`./plugins/<name>`) and catalog metadata (`description`, `category`,
`tags`). Do not repeat `version` or component lists there.

## Dependency rules

- A dependency must be a plugin of this marketplace, with a caret range on a released
  major version.
- No cycles. Today's graph: `sdd-engineering → {engineering-paved-path, research-tools,
  architecture-review}`, `architecture-review → engineering-paved-path`.
- Reference another plugin's component only by namespaced name
  (`<plugin>:<agent-or-skill>`) and only if that plugin is a declared dependency.
- Technical skills live once, in `engineering-paved-path`. Don't copy skill text into
  agents; name the skill instead.

## Content rules

- English only: manifests, docs, prompts, comments.
- No repository-specific paths or product names in components. Agents learn about the
  host repository from its `CLAUDE.md` / `AGENTS.md` and manifests.
- No absolute paths, secrets or tokens. Reference files inside a plugin with
  `${CLAUDE_PLUGIN_ROOT}` (plugin level) or `${CLAUDE_SKILL_DIR}` (inside a skill).
- Third-party content only with a confirmed license; bundle its `LICENSE` and add it
  to the plugin's `THIRD_PARTY_NOTICES.md`.
- Every agent has the narrowest `tools` list it needs and an explicit
  `disallowedTools` list. Read-only agents get no write tools.
- See [docs/SECURITY.md](docs/SECURITY.md) for what must never be shipped.

## Checks

```sh
npm run validate          # our lint: names, sources, versions, dependencies, namespaced references, forbidden content
npm test                  # tests for the lint
claude plugin validate .  # Claude Code's schema validation of the marketplace and every plugin
cd site && npm ci && npm test && npm run build   # when the catalog site or the index changes
```

The catalog site picks up new plugins, skills and agents automatically: the index is
rebuilt from the repository on every Pages deployment. See
[docs/SITE-SPEC.md](docs/SITE-SPEC.md).

Behavior evals (`claude plugin eval`) run real model sessions and cost money; run them
for the plugin you changed before asking for a release, and attach the summary to the
pull request.

## Pull request checklist

- [ ] One plugin (or the marketplace scaffolding) per pull request.
- [ ] `npm run validate`, `npm test` and `claude plugin validate .` pass locally.
- [ ] `CHANGELOG.md` updated under `[Unreleased]`.
- [ ] New or changed behaviour has an eval case; eval results attached when behaviour changed.
- [ ] No repository-specific paths, secrets, absolute paths or unlicensed third-party content.
- [ ] Dependencies declared for every namespaced reference.
- [ ] README updated if usage changed.
