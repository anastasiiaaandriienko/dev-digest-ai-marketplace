# sdd-engineering

Spec-driven development for Claude Code: one feature goes from a request to a verified
change through four agents and explicit approval gates. Nothing is planned before the
spec is approved, nothing is coded before the plan is approved, and nothing is
committed unless you ask.

```sh
/plugin marketplace add anastasiiaaandriienko/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
```

Installing it also installs its dependencies: `engineering-paved-path`,
`research-tools` and `architecture-review`.

## How it works

```
/sdd-engineering:run-plan <slug> <request>
  │
  ├─ S0 research (optional) ─ research-tools:researcher
  ├─ S1 spec ─────────────── sdd-engineering:spec-creator ──► <SDD folder>/<slug>/spec.md
  │      ▼ G1: you approve the spec
  ├─ S2 plan ─────────────── sdd-engineering:implementation-planner
  ├─ S3 plan review ──────── implementation-planner MODE: REVIEW on another model
  │      ▼ G2: you approve the plan and every APPROVAL REQUIRED item ──► plan.md
  ├─ S4 implement ────────── sdd-engineering:implementer (code + the tests the plan names)
  ├─ S5 review ───────────── architecture-review:architecture-reviewer (fresh context)
  ├─ S6 verify ───────────── sdd-engineering:plan-verifier ──► verification.md
  │      ▼ G4: you ask for commits (never pushed or merged by the workflow)
  └─ /sdd-engineering:workflow-retro <slug>   (only when you ask)
```

| Component | Type | Role |
|---|---|---|
| `spec-creator` | agent | request → one spec with EARS acceptance criteria (`AC-<KEY>-NN`); gaps become `[NEEDS CLARIFICATION]` questions; no implementation details |
| `implementation-planner` | agent | `MODE: PLAN` spec → plan where every task cites AC-IDs; `MODE: AD-HOC` plan without a spec; `MODE: REVIEW` cross-model plan review |
| `implementer` | agent | executes approved tasks, writes the named tests, runs the project's unit checks |
| `plan-verifier` | agent | last stage: AC → task → test → commit matrix with PASS / PARTIAL / MISSING |
| `run-plan` | skill (manual) | the orchestrator and its gates |
| `workflow-retro` | skill (manual) | measured tokens, cache, tool calls and concurrency of a run → a ledger entry; bundles `scripts/retro-metrics.mjs` (Node.js, no dependencies) |
| `engineering-insights` | skill | read/record verified per-area insights (`<area>/INSIGHTS.md`) |

## What it needs from your repository

The agents learn about your project at run time
(`references/project-profile.md`). They read, in order: the prompt, your `CLAUDE.md` /
`AGENTS.md`, your manifests, then the defaults.

| Fact | Default if your instructions don't say |
|---|---|
| Where specs and plans go | `specs/<slug>/` (`spec.md`, `plan.md`, `verification.md`, `run-log.md`) |
| Check commands | manifest scripts named like `typecheck`, `lint`, `test`; only unit-level ones are run |
| Protected paths | lockfiles, dependency changes, migrations, CI config, secrets, `.claude/**`, project instructions |

**If no test command is found**, the planner writes `Checks: NONE FOUND`, the
implementer reports it instead of inventing one, the verifier marks those criteria
PARTIAL, and `/run-plan` asks you for the command at the next gate.

To change a default, say it in your `CLAUDE.md`, for example:
"SDD artifacts live in `docs/specs/<slug>/`. Check command: `make test`."

## Safety

- Agents never push, merge, install, migrate, start your app, call `localhost` or make
  paid API calls. Read-only agents have no write tools.
- `run-plan` and `workflow-retro` run only when you invoke them
  (`disable-model-invocation`).
- The workflow writes only inside the SDD folder and the files of approved tasks;
  `workflow-retro` appends to the retro ledger (default `docs/retros/ledger.md`).

## Evals

Behavior evals live in [`evals/`](evals/README.md) (`claude plugin eval`, paid).

See [CHANGELOG.md](CHANGELOG.md) and [COMPATIBILITY.md](COMPATIBILITY.md).
Extracted and generalized from DevDigest (MIT).
