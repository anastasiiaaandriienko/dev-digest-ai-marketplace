# Cost baseline — sdd-engineering

Measured on 2026-10-21. Every number comes from `claude plugin eval` result files and the
run traces (`--keep-temp`), summarised with `node scripts/eval-cost-report.mjs`. Nothing
is estimated. Cost is the list-price figure Claude Code reports per run (`costUsd`);
judge calls are listed separately.

## Scenario and setup

| | |
|---|---|
| Scenario | the fixed SDD scenario: prepare a spec (`spec-from-request`, stops at G1) and plan an approved spec (`plan-from-approved-spec`, stops at G2). One **workflow** = one run of each case. |
| Fixture | a tiny Node.js "todo" repository with its own `CLAUDE.md` and `npm test` (the cases' `scaffold.sh`) |
| Plugins loaded | sdd-engineering + engineering-paved-path + research-tools + architecture-review (all 1.0.0); confirmed in each trace's `init` event |
| Command | `claude plugin eval . --eval-dir plugins/sdd-engineering/evals --scaffold --tag positive --runs 1 --ablation none --model claude-sonnet-5-5 --allow-tools Write Edit --keep-temp --trust-plugin --no-publish` |
| Models | main session `claude-sonnet-5-5` (pinned); subagents use their frontmatter models — spec-creator and implementation-planner run on `claude-opus-5-5` |
| Claude Code | 2.1.306 |
| Baseline commit | `ec353f0` — plugin content identical to `main` `8429f41` |
| Optimized commit | `9b54407` |

## Quality gate

All graders of both cases pass (`claude plugin eval` threshold 1.0): the right subagent ran,
the spec file exists with EARS AC-IDs, the plan cites AC-DUE-01..04, no source file was
created or changed before the approval gate, and the LLM judge (3 votes, majority) accepts
the reply. A **critical failure** is the workflow writing code before approval or skipping
its subagents; none occurred in the runs below.

## Baseline (`ec353f0`)

| Run | Case | Score | Cost | Time | API calls | Tool calls | Subagent calls | Sonnet in / out | Opus in / out | Failed graders |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | spec | 0.73 | $0.323 | 104 s | 10 | 15 | 1 | 120.6k / 2.8k | 40.8k / 6.8k | `spec-quality` ¹ |
| B1 | plan | 0.67 | $0.906 | 299 s | 23 | 37 | 4 | 361.7k / 10.6k | 109.6k / 21.5k | `plan-quality` ¹ |
| B2 | spec | 1.00 | $0.359 | 100 s | 10 | 14 | 1 | 120.5k / 2.7k | 42.2k / 8.3k | — |
| B2 | plan | 0.78 | $0.656 | 187 s | 18 | 31 | 3 | 275.8k / 8.4k | 75.4k / 14.1k | `cites-acceptance-criteria` ² |

Input = uncached + cache-read + cache-write tokens. Judge cost: $0.0037 for B1–B2.

¹ B1 ran with the earlier rubrics, which asked the judge to assess the spec and plan files it
cannot see (the judge sees only the final reply). The rubrics were rewritten before B2; the
deterministic graders of B1 all passed.
² The plan covered all four ACs, but the final reply abbreviated them ("AC-DUE-01, 02"), so the
regex did not find `AC-DUE-02`. A format deviation, not missing coverage; the grader was
left unchanged so baseline and optimized runs stay comparable.

| Baseline | spec (n=2) | plan (n=2) | workflow |
|---|---|---|---|
| Median cost | $0.341 | $0.781 | $1.122 (runs: $1.229, $1.015) |
| Median latency | 102 s | 243 s | 345 s |
| Pass rate (all graders) | 1/2 | 0/2 | 0/2 |

## Optimization (one change)

**Change (`9b54407`):** `/run-plan` hands artifacts to subagents **by path**. The planner's
draft is saved as `plan.draft.md`; the cross-model review, the rework round and the
implementer read the file instead of receiving the plan pasted into their prompts. Model and
routing are unchanged.

**Why this one:** in B1/B2 three quarters of the cost is the plan stage, and the main session
re-sent the full plan to every review and rework call (median main-session cache reads: 282.6k tokens).

## After the optimization (`9b54407`)

| Run | Case | Score | Cost | Time | API calls | Tool calls | Subagent calls | Sonnet in / out | Opus in / out | Failed graders |
|---|---|---|---|---|---|---|---|---|---|---|
| O1 | spec | 1.00 | $0.328 | 93 s | 9 | 13 | 1 | 119.7k / 2.4k | 31.2k / 7.3k | — |
| O1 | plan | 1.00 | $0.806 | 218 s | 19 | 37 | 3 | 285.6k / 13.0k | 96.1k / 16.9k | — |
| O2 | plan | 1.00 | $0.785 | 215 s | 20 | 36 | 3 | 316.4k / 12.9k | 96.1k / 16.5k | — |

Judge cost: $0.0027 for O1–O2. O2 measured the plan stage only (see Budget).

| Optimized | spec (n=1) | plan (n=2) | workflow |
|---|---|---|---|
| Median cost | $0.328 | $0.796 | $1.124 (spec + plan medians); O1 workflow $1.134 |
| Median latency | 93 s | 216.5 s | 309.5 s |
| Pass rate (all graders) | 1/1 | 2/2 | 1/1 full workflow (O1) |

## Result

| Metric (plan stage, medians, n=2 each) | Baseline | Optimized | Change |
|---|---|---|---|
| Cost | $0.781 | $0.796 | +2% |
| Latency | 243 s | 216.5 s | −11% |
| API calls | 20.5 | 19.5 | −1 |
| Main-session (Sonnet) cache reads | 282.6k | 261.4k | −8% |
| Main-session (Sonnet) output | 9.5k | 13.0k | +36% |
| Subagent (Opus) output | 17.8k | 16.7k | −6% |

**Cost per successful workflow**

- Baseline: **no workflow passed every grader** (0/2), so the strict figure is undefined. Both
  failures were grader issues (¹ ²), and the workflow behaved correctly in both: the subagents
  ran, code was never touched, the run stopped at G1/G2. Counting those two runs, the
  baseline costs **$1.122 per workflow** (median).
- Optimized: **$1.134** for the one full workflow (O1, all graders green); spec + plan
  medians give $1.124.

**Conclusion: the optimization did not measurably reduce cost.** The plan stage cost moved
+2%, inside the run-to-run spread of the baseline itself ($0.656–$0.906). Passing paths saved
some main-session cache reads and subagent output, but writing `plan.draft.md` added
main-session output tokens, which cost more per token. Latency fell 11%, but with two runs per
side that is not a proven gain either. The quality gate stayed green after the change
(3/3 runs passed all graders, no critical failures), so the change is kept for traceability
(the draft plan is now a file), not as a cost saving.

**What drives the cost:** the number of review → rework rounds (B1 had one more planner
call and was the most expensive run) and Opus subagent output. Candidates for the next
experiment, one at a time: cap the plan review at one round unless it finds a blocker, or run
the cross-model review on a cheaper model.

## Budget

$5.00 allocated. Spent $4.58 in total: two failed pilots $0.42 (the plugin was not loaded —
see `plugins/sdd-engineering/evals/README.md`), baseline $2.24, optimized $1.92, judges ~$0.01.
The second optimized run covered the plan stage only, so the total stayed under budget.

## Reproduce

```sh
claude plugin eval . --eval-dir plugins/sdd-engineering/evals --scaffold --tag positive --runs 1 \
  --ablation none --model claude-sonnet-5-5 --allow-tools Write Edit --keep-temp \
  --trust-plugin --no-publish --max-cost-usd 1.5 --json result.json
node scripts/eval-cost-report.mjs result.json
```

Delete the kept eval directories afterwards (the command prints their paths).
