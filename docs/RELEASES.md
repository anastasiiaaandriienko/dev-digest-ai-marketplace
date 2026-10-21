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

| Channel | Marketplace | Tracks |
|---|---|---|
| latest | `dev-digest-ai-marketplace` (this repository, `main`) | the newest released versions |
| stable | a second marketplace entry pinned to the `ref`/SHA of a verified release | the last version that passed the smoke eval |

## Rollback

There is no `plugin rollback` command. Roll back by switching channels:

1. Prepare the stable channel once: a marketplace whose plugin `source` points to this
   repository at the verified tag (for example `sdd-engineering--v1.0.0`) or its SHA.
2. Disable or uninstall the plugin from the latest channel.
3. Install the same plugin from the stable channel; run `/reload-plugins`.
4. Run the smoke eval and record the result.
5. Return to latest only after a fixed version is released and its evals pass.

Before rolling back, check what the bad version may have changed outside the plugin
(files in projects, settings) and restore it; plugin data in `${CLAUDE_PLUGIN_DATA}`
must not be deleted by a channel switch. The exact command sequence is rehearsed and
recorded when the first rollback test is run.
