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

```sh
claude plugin eval ./plugins/sdd-engineering --scaffold --trust-plugin --no-publish --max-cost-usd 5
claude plugin eval ./plugins/sdd-engineering --scaffold --trust-plugin --no-publish --case negative-unrelated-request --runs 1 --ablation none
```

`--scaffold` is required: it runs each case's `scaffold.sh` (author-written, creates
files only inside the eval workspace). Results go to `evals/results/` (git-ignored).
`--no-publish` keeps the HTML report local.

## Notes

- Each run loads **only the plugin under test**, and a case may list plugins only from
  inside it (its containment root). These stages use sdd-engineering's own agents and
  skills only. Tests that need the dependency plugins together (for example
  cross-plugin subagent dispatch) live in the repository-level [`evals/`](../../../evals/README.md).
- `file_exists` only sees files created during the run, so `exists: false` on
  `src/**` proves the workflow did not write code before the approval gates.
