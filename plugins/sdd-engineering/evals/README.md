# sdd-engineering behavior evals

Format: [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Each case is
a folder with `case.yaml` (scaffold), `prompt.md` (the user turn) and `graders/*.md`.
Every run starts in an empty workspace; `scaffold.sh` writes a tiny "todo" project with
its own `CLAUDE.md` and test command, so the workflow is exercised on a repository it has
never seen.

| Case | Scenario | What must happen |
|---|---|---|
| `spec-from-request` | fixed SDD scenario, stage 1: "prepare a spec for a small feature" | `sdd-engineering:spec-creator` runs; `specs/todo-due-dates/spec.md` is created with EARS ACs; no source file is created; the workflow stops at gate G1 |
| `plan-from-approved-spec` | fixed SDD scenario, stage 2: an approved spec exists | `sdd-engineering:implementation-planner` runs; the plan cites AC-IDs and uses the project's test command; no source file is created before gate G2 |
| `negative-unrelated-request` | a plain code question | no SDD subagent, no `run-plan`, no `specs/` file |

## Running (paid)

Each case runs `runs` agent sessions (default 3) with the plugin and, by default, the
same number without it (baseline arm); `llm` graders add judge calls. Always set a
ceiling:

Run **from the repository root**:

```sh
# free load check (the cost ceiling is checked before the first run starts)
claude plugin eval . --eval-dir plugins/sdd-engineering/evals --scaffold --allow-tools Write Edit --trust-plugin --no-publish --max-cost-usd 0
# the fixed SDD scenario (spec + plan), one run each, no baseline arm
claude plugin eval . --eval-dir plugins/sdd-engineering/evals --scaffold --tag positive --runs 1 --ablation none --allow-tools Write Edit --trust-plugin --no-publish --max-cost-usd 2
```

`--scaffold` runs each case's `scaffold.sh` (author-written, creates files only inside the
eval workspace). `--allow-tools Write Edit` lets spec-creator write the spec. `--case` takes
one glob (a second one replaces the first); select several cases with `--tag`.
`--no-publish` keeps the HTML report local.

## Notes

- **Load the dependencies too.** sdd-engineering declares dependencies; a session that
  loads it without them **disables** it (`dependency-unsatisfied`), and the eval still
  prints "Plugin under test" and runs with no plugin. Each `case.yaml` therefore lists
  sdd-engineering and its three dependencies. A case can load plugins only from inside
  the directory the eval runs against, so these cases are run from the repository root.
  `npm run validate` checks the list.
- Confirm a run really loaded the plugins in its trace (`--keep-temp`): the `init` event
  lists `plugins` and `agents`.
- `file_exists` only sees files created during the run, so `exists: false` on
  `src/**` proves the workflow did not write code before the approval gates.
