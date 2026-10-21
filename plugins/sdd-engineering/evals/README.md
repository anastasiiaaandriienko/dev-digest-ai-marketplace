# sdd-engineering behavior evals

Format: [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals). Each case is
a folder with `case.yaml` (scaffold, plugins to load), `prompt.md` (the user turn) and
`graders/*.md`. Every run starts in an empty workspace; `scaffold.sh` writes a tiny
"todo" project with its own `CLAUDE.md` and test command, so the workflow is exercised
on a repository it has never seen.

| Case | Scenario | What must happen |
|---|---|---|
| `spec-from-request` | fixed SDD scenario, stage 1: "prepare a spec for a small feature" | `sdd-engineering:spec-creator` runs; `specs/todo-due-dates/spec.md` is created with EARS ACs; no source file is created; the workflow stops at gate G1 |
| `plan-from-approved-spec` | fixed SDD scenario, stage 2: an approved spec exists | `sdd-engineering:implementation-planner` runs; the plan cites AC-IDs and uses the project's test command; no source file is created before gate G2 |
| `negative-unrelated-request` | a plain code question | no SDD subagent, no `run-plan`, no `specs/` file |
| `cross-plugin-dispatch` | wiring smoke test, 1 run | `research-tools:researcher` and `architecture-review:architecture-reviewer` are dispatched by namespaced name (subagents on `haiku`) |

## Running (paid)

Each case runs `runs` agent sessions (default 3) with the plugins and, by default,
the same number without them (baseline arm); `llm` graders add judge calls. Always set
a ceiling:

```sh
claude plugin eval ./plugins/sdd-engineering --scaffold --max-cost-usd 5
claude plugin eval ./plugins/sdd-engineering --scaffold --case negative-unrelated-request --runs 1 --ablation none
# cheapest check that cross-plugin subagent dispatch works (one run, no baseline arm)
claude plugin eval ./plugins/sdd-engineering --scaffold --case cross-plugin-dispatch --runs 1 --ablation none --max-cost-usd 1
```

`--scaffold` is required: it runs each case's `scaffold.sh` (author-written, creates
files only inside the eval workspace). Results go to `evals/results/` (git-ignored).

## Notes

- `case.yaml` loads all four marketplace plugins from this repository, so the
  namespaced dependencies (`research-tools:researcher`,
  `architecture-review:architecture-reviewer`, `engineering-paved-path:*`) resolve.
- `file_exists` only sees files created during the run, so `exists: false` on
  `src/**` proves the workflow did not write code before the approval gates.
- Matching `subagent_type` in the `Agent` tool input is the documented mechanism for
  skills (`tool_used` + `input_match`); its use for subagents is to be confirmed on the
  first run.
