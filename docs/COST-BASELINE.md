# Cost baseline — sdd-engineering

Status: **not measured yet.** Nothing below is an estimate; empty cells are filled
only from real runs.

## Scenario

Fixed SDD scenario: the user asks to prepare a spec and a plan for a small feature
(the `spec-from-request` and `plan-from-approved-spec` eval cases in
`plugins/sdd-engineering/evals/`, run on the same fixture repository).

Quality gate: every eval case passes (`claude plugin eval` exit 0, threshold 1.0), no
new critical false negatives.

## Baseline

| Field | Value |
|---|---|
| Plugin version and commit SHA | |
| Model | |
| Runs per case | |
| Input / output / cache-read / cache-write tokens (median per workflow) | |
| API calls / tool calls (median) | |
| Cost per workflow (median) and cost per successful workflow | |
| Latency (median) | |
| Pass rate | |
| Critical failures | |
| Source of every number | eval `aggregate-result.json`, `/sdd-engineering:workflow-retro` ledger entry |

## Optimization

One change at a time; model and routing stay the same.

| Field | Value |
|---|---|
| Change | |
| Hypothesis | |
| Same eval set and runs | |
| Result (same fields as the baseline) | |
| Quality gate | |
| Conclusion (including "within noise" if so) | |

## Free measurements available before paid runs

- `claude plugin details <plugin>` shows the component inventory and its projected
  token cost.
- `node plugins/sdd-engineering/skills/workflow-retro/scripts/retro-metrics.mjs`
  reads local transcripts of runs that already happened.
