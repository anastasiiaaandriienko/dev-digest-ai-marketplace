# Releases

## Versioning (SemVer)

| Change | Bump |
|---|---|
| Breaking: removed or renamed component, changed input/output contract, stricter rules that make previously accepted work fail | major |
| Backward-compatible: new component, new optional behaviour, a new requirement that only adds checks without breaking existing flows | minor |
| Fixes, wording, docs, evals only | patch |

`plugin.json` `version` is the single source of truth. The marketplace entry does not
repeat it.

## Tags

Each plugin is released separately with a tag `<plugin-name>--v<version>`, for example
`sdd-engineering--v1.0.0`. Claude Code resolves version-constrained dependencies
(`"version": "^1.0.0"`) against these tags, so a dependency must be tagged before a
consumer that requires it.

Release order: dependencies first, then consumers:

1. `engineering-paved-path`
2. `research-tools`
3. `architecture-review`
4. `sdd-engineering`

## Release checklist (per plugin)

1. `CHANGELOG.md`: move `[Unreleased]` items under the new version with the date.
2. Bump `version` in `.claude-plugin/plugin.json`.
3. `npm run validate`, `npm test`, `claude plugin validate .` pass.
4. Evals of the plugin pass; record the results in the pull request.
5. Merge to `main`; wait for CI on the merge commit.
6. From the plugin directory, on the merge commit:
   ```sh
   claude plugin tag --dry-run
   claude plugin tag --push
   ```
   The command checks that `plugin.json` and the marketplace entry agree and creates
   the tag. A tag is never moved or deleted after it is pushed.

## Updates for users

Updates are pull-based: users run

```sh
claude plugin marketplace update dev-digest-ai-marketplace
claude plugin update <plugin>@dev-digest-ai-marketplace --scope project
```

and then `/reload-plugins` or a new session. If auto-update is enabled for the
marketplace in the user's settings, Claude Code refreshes the catalog at start-up.

## Channels

| Channel | Marketplace name | Added with | Serves |
|---|---|---|---|
| latest | `dev-digest-ai-marketplace` | `claude plugin marketplace add anastasiiaaandriienko/dev-digest-ai-marketplace` | whatever is on `main` (relative sources); dependency ranges resolve to the highest matching release tag |
| stable | `dev-digest-ai-marketplace-stable` | `claude plugin marketplace add https://raw.githubusercontent.com/anastasiiaaandriienko/dev-digest-ai-marketplace/main/channels/stable/.claude-plugin/marketplace.json` | every plugin pinned to a verified release tag **and** its commit SHA (`git-subdir` sources) |

The stable channel lives in `channels/stable/.claude-plugin/marketplace.json`. It has its own
name because a user can register only one marketplace per name. It lists every
dependency of the plugins it serves, because dependencies resolve inside the same
marketplace. `npm run validate` checks this, plus the tag-shaped `ref` and the 40-character `sha`.

Moving stable to a new release is a separate pull request. Change `ref` and `sha`, run
the rehearsal below against the new pins, and merge only after the smoke eval passes.
Merging a release to `main` never changes stable.

Main is the latest channel. A merged but untagged version is already served to latest
users, so tag right after the merge (see the checklist).

## Rollback

There is no `plugin rollback` command. You roll back by switching channels. In the
affected project:

```sh
# 1. Leave latest: remove the plugin and the dependencies it auto-installed; keep plugin data.
claude plugin uninstall sdd-engineering@dev-digest-ai-marketplace --scope project --keep-data --prune -y
# 2. Add the stable channel (once) and install from it.
claude plugin marketplace add https://raw.githubusercontent.com/anastasiiaaandriienko/dev-digest-ai-marketplace/main/channels/stable/.claude-plugin/marketplace.json --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace-stable --scope project
# 3. Confirm the version that actually loads, then /reload-plugins (or start a new session).
claude plugin list --json        # sdd-engineering@dev-digest-ai-marketplace-stable → "version": "1.0.0"
# 4. Smoke eval (paid): the fixed scenario against the stable copy; record the result.
```

To return to latest after a fixed version is released and its evals pass, run the same
steps the other way round: uninstall `@dev-digest-ai-marketplace-stable` with
`--keep-data --prune -y`, then install `@dev-digest-ai-marketplace`.

**Plugin data.** `${CLAUDE_PLUGIN_DATA}` is `~/.claude/plugins/data/<plugin>@<marketplace>/`,
so each channel has its own data folder. `--keep-data` keeps the latest channel's folder
for the return trip. Data is not copied between channels. sdd-engineering stores
nothing there: its state is the SDD artifacts in the host repository (`specs/<slug>/`),
and a channel switch never touches them.

**External state.** sdd-engineering writes only the SDD folder and the files of approved
tasks. It commits only at G4 and never pushes. Before switching, check `git status`
in the host repository. Uncommitted work from the bad version is reverted with git like
any other change. The plugin changed no settings outside the project.

### Rehearsal (free, isolated)

`scripts/rehearse-rollback.mjs` runs latest → stable → latest. It uses a throwaway
`CLAUDE_CONFIG_DIR` and project, so your own plugins are untouched. It asserts the
installed version from `claude plugin list --json`, the commit from
`installed_plugins.json`, the installed copy's `plugin.json`, that no plugin of the
channel you left stays installed, and that plugin data survives the round trip. It
makes no model calls.

```sh
node scripts/rehearse-rollback.mjs \
  --latest anastasiiaaandriienko/dev-digest-ai-marketplace \
  --stable https://raw.githubusercontent.com/anastasiiaaandriienko/dev-digest-ai-marketplace/main/channels/stable/.claude-plugin/marketplace.json \
  --expect-latest 1.1.0 --expect-stable 1.0.0 --stable-sha 30809ef0df39eb4510c05bc40c4819668b0b3a91
```

The smoke eval after a rollback is paid. Run it only with an approved budget, and record
it with the rehearsal output in the release pull request.
