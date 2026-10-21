# sdd-engineering 1.1.0 — requirements, coverage and rollback

Release notes: [plugins/sdd-engineering/CHANGELOG.md](../../plugins/sdd-engineering/CHANGELOG.md).
Release rules: [docs/RELEASES.md](../RELEASES.md).

## Mandatory requirements

Sources: the HW-08 lab, step 11 ("update to 1.1.0 and verify the return to 1.0.0"), and
three defects found when 1.0.0 was installed in a consumer repository
([sdd-consumer-demo PR #1](https://github.com/anastasiiaaandriienko/sdd-consumer-demo/pull/1),
`specs/note-tags/trace-summary.md`).

| ID | Requirement | Source |
|---|---|---|
| R1 | spec-creator does not finish a spec until every mandatory requirement has an acceptance criterion | lab step 11 |
| R2 | The new behaviour is covered by an eval, including a negative scenario | lab step 11 |
| R3 | `run-log.md` is created at S1 and records real models, timestamps and cost where available | 1.0.0 defect 1 |
| R4 | The plan review runs on a really different model, or the workflow says it did not | 1.0.0 defect 2 |
| R5 | Work is traceable task → files → commit, with no commit outside an approval gate | 1.0.0 defect 3 |
| R6 | Version 1.1.0 with changelog, manifest and docs; dependencies stay `^1.0.0` and compatible | lab step 11 |
| R7 | Old and new evals pass | lab step 11 |
| R8 | Tag `sdd-engineering--v1.1.0`; consumers update with `marketplace update` + `plugin update` and see the new version | lab step 11 |
| R9 | A stable channel stays on 1.0.0 while 1.1.0 is available; this is verified from the version actually installed | lab step 11 |
| R10 | Rollback rehearsal: remove latest, install from stable, reload, smoke eval; plugin data is not lost; then return to latest | lab step 11 |
| R11 | Other plugins keep their behaviour | release scope |

## Coverage matrix

Status: **verified** = checked in this branch (free); **ready** = the eval or step exists
but is paid or needs approval and has not run yet.

| Req | Acceptance criterion | Eval / check | Evidence | Status |
|---|---|---|---|---|
| R1 | AC-REL-01: If a requirement line (`FR-n`/`NFR-n`) names no existing AC-ID, then the coverage check shall report it and exit 1 | `scripts/test/check-spec.test.mjs` (12 tests) | requirement without AC, NFR, unknown AC, removed AC, open marker, duplicate IDs, CLI exit codes 0/1/2; the consumer's real spec passes 7/7 | verified |
| R1 | AC-REL-02: When a spec is complete, spec-creator shall return `DONE` only with every requirement covered (`Coverage: n/n`) | eval `spec-from-request` graders `requirements-covered`, `requirements-listed` | eval run E2: both PASS; grader regexes unit-tested | verified (eval) |
| R1 | AC-REL-03: If a spec approved under 1.0.0 has an uncovered requirement, then `/run-plan --from plan` shall not call the planner and shall name the requirement | eval `legacy-spec-uncovered-requirement` (negative): `no-planner`, `no-plan-files`, `names-uncovered-requirement`, `no-code-written`, `sends-back-to-spec` | eval run E1: score 1.00, all 5 graders PASS (planner called 0×, FR-3 named, judge 3/3) | verified (eval) |
| R2 | AC-REL-04: The eval suite shall include a negative case for the 1.1.0 rule | `legacy-spec-uncovered-requirement` (tags `negative`, `v1.1`) | E1 PASS; `npm run validate` checks its structure | verified (eval) |
| R3 | AC-REL-05: `/run-plan` shall create `run-log.md` before the first subagent call, with a header (plugin version, main model, UTC time), and the Model column shall never be `UNKNOWN` | `run-plan/SKILL.md` "Run log" (model table, tested against frontmatter); eval grader `run-log-from-s1` | E1: the log was created at S1 but its model was `UNKNOWN` → FAIL, fixed in `cc0252d`; E2: PASS | verified (eval) |
| R3 | AC-REL-06: Each row shall record task, model, model source (`override`/`frontmatter`/`environment`), start time, duration, tokens, tool uses, cost when reported (else `UNKNOWN`) and result; values are never estimated | `run-plan/SKILL.md` | text review | verified (text) |
| R4 | AC-REL-07: S3 shall pass a model override that differs from S2 (`sonnet` when S2 ran on `opus`) and log both models | eval graders `review-on-other-model` (tool call), `run-log-review-model` (log) | E1: override PASS, log grader FAIL on the stage label "S3 review" (grader too strict, fixed); E2: both PASS (planner opus, review sonnet override) | verified (eval) |
| R4 | AC-REL-08: If the override is rejected or the environment forces one model, then the run shall log and report `same-model review` and never call it cross-model | `run-plan/SKILL.md` S3 | text review | verified (text) |
| R5 | AC-REL-09: The implementer shall run one task per call; `run-log.md` shall list changed files and the commit (or `uncommitted`) per task | `run-plan/SKILL.md` S4, `agents/implementer.md` | text review | verified (text) |
| R5 | AC-REL-10: The user shall choose the commit mode at G2 (`per-task` / `at-end`); a commit shall happen only at G4 on the user's request; the skill never pushes or merges | `run-plan/SKILL.md` gates and rules; `plan-verifier` checks per-task commits | text review; the 1.0.0 positive evals' `no-code-written` graders still apply | verified (text) |
| R6 | AC-REL-11: `plugin.json` version 1.1.0; dependencies unchanged (`^1.0.0`); CHANGELOG, README, COMPATIBILITY and evals README updated | `npm run validate`, `claude plugin validate --strict` (root, 4 plugins, stable channel) | 0 errors; all exit 0 | verified |
| R6 | AC-REL-12: 1.1.0 shall install with the released 1.0.0 dependencies | rehearsal, latest step | GitHub branch install: sdd-engineering 1.1.0 + 3 dependencies, all enabled | verified |
| R7 | AC-REL-13: The old (3) and new (1) cases shall pass on 1.1.0 | `claude plugin eval … --runs 1` | E1 (`d7eb986`): legacy 1.00, negative 1.00, plan 0.92, spec 0.88; E2 (`cc0252d`, positive cases): plan 1.00, spec 1.00. Negative cases were not re-run after `cc0252d`, which changed only the run-log rules they do not reach | verified (eval, n=1) |
| R8 | AC-REL-14: `sdd-engineering--v1.1.0` shall point at the merge commit after CI passes | `claude plugin tag --push` | — | needs approval |
| R8 | AC-REL-15: In the consumer repository, `plugin update` shall move to 1.1.0 and an uncovered requirement shall not pass G1 | consumer run | — | needs approval + budget |
| R9 | AC-REL-16: While 1.1.0 is installable from latest, the stable channel shall install sdd-engineering 1.0.0 at commit `30809ef` | `scripts/rehearse-rollback.mjs` | `installed_plugins.json` sha `30809ef…`; installed `plugin.json` says 1.0.0; no `scripts/check-spec.mjs` in the stable copy | verified |
| R9 | AC-REL-17: The lint shall reject a channel entry that is not pinned to a release tag and full commit, or that misses a dependency | `scripts/test/validate-marketplace.test.mjs` | channel test (6 error cases + valid fixture) | verified |
| R10 | AC-REL-18: After a rollback no plugin from the latest channel stays installed, and the latest channel's plugin data survives the round trip | rehearsal (`--keep-data --prune -y`) | `latest channel gone`, `latest data kept`, `latest data still there` PASS | verified |
| R10 | AC-REL-19: The smoke eval shall pass on the stable copy after the rollback | `spec-from-request` (1.0.0 graders) on the exact tree of `sdd-engineering--v1.0.0` (`30809ef`), the content the stable channel installs | E3: score 1.00, 6/6 PASS; trace loads sdd-engineering@1.0.0 | verified (eval) |
| R11 | AC-REL-20: engineering-paved-path, research-tools and architecture-review are unchanged | `git diff main -- plugins/{engineering-paved-path,research-tools,architecture-review}` | empty diff | verified |

## Eval runs

| Run | Commit | Cases | Score | Cost |
|---|---|---|---|---|
| E1 | `d7eb986` (1.1.0) | all 4 | legacy 1.00 · negative-unrelated 1.00 · plan 0.92 · spec 0.88 | $0.923 |
| E2 | `cc0252d` (1.1.0 + run-log fix) | positive (spec, plan) | 1.00 · 1.00 | $0.758 |
| E3 | `30809ef` (tag 1.0.0 = stable) | spec-from-request (smoke) | 1.00 | $0.294 |

One run per case (`--runs 1 --ablation none`, main session `claude-sonnet-5-5`). Each trace's
`init` event confirms the plugin versions. Two extra user-level plugins
(`cc-plugin-agents-md`, `cc-plugin-plugin-authoring`) were also loaded from the operator's
environment. Total: $1.975 of the approved $3.50.

## Rollback plan

1. **Trigger:** a regression in 1.1.0. Examples: a failing eval, a G1 that never opens on a
   valid spec, a wrong run log.
2. **Contain:** do not move tags. Users on latest roll back per project:
   `claude plugin uninstall sdd-engineering@dev-digest-ai-marketplace --scope project --keep-data --prune -y`,
   then add the stable channel and run
   `claude plugin install sdd-engineering@dev-digest-ai-marketplace-stable --scope project`.
   Then run `/reload-plugins`.
3. **Verify:** `claude plugin list --json` shows `sdd-engineering@dev-digest-ai-marketplace-stable`
   with version `1.0.0`. Then run the smoke eval (paid).
4. **External state:** check `git status` in the host repository. The workflow writes
   only `specs/<slug>/` and the files of approved tasks, and it commits only at G4.
   Revert unwanted uncommitted changes with git. 1.1.0 changes no settings outside
   the project.
5. **Return:** release a fixed version, let its evals pass, then reverse step 2.
6. **Rehearsed:** `scripts/rehearse-rollback.mjs` against GitHub sources. Latest was the
   branch of this release (1.1.0 at `ccb2d4b`), stable was `channels/stable` from the same
   branch. Result: REHEARSAL PASSED, 13/13 checks.

## Not done yet (needs approval)

- Merge of this release PR. Until then `main` still serves 1.0.0. After the merge, latest
  users get 1.1.0 at once, so tagging follows right after CI.
- Tag `sdd-engineering--v1.1.0`, with no GitHub release.
- Consumer update in `sdd-consumer-demo` and the rollback rehearsal there. Both change
  that repository.
- Any later move of the stable channel to a new version.
