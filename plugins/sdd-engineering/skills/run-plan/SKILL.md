---
name: run-plan
description: Manual spec-driven development orchestrator. Drives one feature through spec-creator → approved spec → implementation-planner → cross-model plan review → approved plan → implementer (one task at a time) → architecture review → plan-verifier, stopping at every approval gate. Artifacts live in the SDD folder (default specs/<slug>/ - spec.md, plan.md, verification.md, run-log.md). Invoke explicitly as /run-plan.
argument-hint: "<slug> [feature request…]  |  <slug> --from <spec|plan|review|implement|arch|verify>"
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs":*), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs:*), Bash(date -u:*)
---

# run-plan (SDD workflow)

The **main agent** runs this skill and is the only hub: it calls each subagent,
relays questions to the user, and owns every file outside the subagents' write
scopes and all of git. Subagents never call each other. Agent rules live in the
agent files; this skill only sets the order, the gates and the hand-offs.

Arguments: `$ARGUMENTS`: `<slug>` (kebab-case, e.g. `password-reset`) plus either the
feature request or `--from <stage>` to resume. Empty → ask for the slug and the
request, then stop.

## Before S1 — resolve the project profile and open the run log

Read `${CLAUDE_PLUGIN_ROOT}/references/project-profile.md` and resolve, from the host
repository: the SDD artifact folder, the areas, the unit-level check commands and the
protected paths. Show them to the user in one short list with their sources. Pass
them to every subagent prompt. A value you could not find is `UNKNOWN`; if the check
commands are unknown, ask the user now (see "No check command" in the profile).

Then create `run-log.md` (or append to it when resuming) **before the first subagent
call**, as described under "Run log".

## Gates — hard stops

| Gate | Before | Passes only when |
|---|---|---|
| **G1 Spec** | planning | the requirement coverage check passes (below) **and** the user explicitly approves `spec.md` |
| **G2 Plan** | any code change | the user explicitly approves the plan, every `APPROVAL REQUIRED` item in it by name, and the commit mode |
| **G3 Extra** | the step that needs it | the user approves an unplanned protected action (protected path, dependency, integration/e2e, paid call) |
| **G4 Commit** | `git commit` | the user asks for the commit of the named task(s); nothing is pushed or merged by this skill |

At a gate: show the artifact summary, ask, then **end the turn**. Silence, "looks
good" about something else, or an approval of an earlier gate is not an approval.
Approval of one gate never covers the next one.

### Requirement coverage check (G1, and before S2 on `--from plan`)

Every mandatory requirement (`FR-n` / `NFR-n` in spec §7) must name an existing AC-ID,
and no `[NEEDS CLARIFICATION: …]` may stay open. Run

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs" <SDD folder>/<slug>/spec.md
```

Run it as one command, exactly in this form (it is pre-approved; don't chain it with
other commands). Exit 0 = complete. Exit 1 → do **not** offer G1 and do not call the planner: show the
reported gaps, send them to `sdd-engineering:spec-creator` (S1) or to the user, and stop.
If Bash is not available, apply the same rules by reading the spec, list every
requirement with its AC-IDs in the gate summary, and say "coverage checked manually".
This also applies to a spec that is already marked `Approved` (for example by an
earlier plugin version): an uncovered requirement sends the run back to S1.

## Artifacts — `<SDD folder>/<slug>/` (default `specs/<slug>/`)

| File | Written by | When |
|---|---|---|
| `run-log.md` | main agent, one row per subagent call | created before the first call; every stage |
| `spec.md` | `sdd-engineering:spec-creator`; main agent sets `Status: Approved (<date>)` | S1, at G1 |
| `plan.draft.md` | main agent (the planner's latest plan, verbatim) | S2, rewritten on every rework round |
| `plan.md` | main agent (`plan.draft.md` + `Status: Approved (<date>)` + review verdict + commit mode) | at G2 |
| `verification.md` | main agent (plan-verifier report verbatim) | S6 |

## Run log

Header, written once:

```
# Run log — <slug>
- Plugin: sdd-engineering <version from ${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json> · Main session model: <your model id, or UNKNOWN>
- Opened: <UTC timestamp or UNKNOWN>

| Stage | Task | Agent | Model | Model source | Started (UTC) | Duration ms | Tokens | Tool uses | Cost USD | Result |
|---|---|---|---|---|---|---|---|---|---|---|
```

One row per subagent call, appended right after the call returns:

- **Stage**: exactly `S0`…`S6` (details go in Result).
- **Task**: the task ID for S4 (and S5 fix rounds), `—` otherwise.
- **Model**: the model the call ran on; never `UNKNOWN`. **Model source**: `override`
  when you passed the Agent `model` parameter (write that model), `frontmatter` when you
  did not (write the agent's frontmatter model from the table below). If the
  environment forces one model for every subagent, write that model and `environment`.

  | Agent | Frontmatter model |
  |---|---|
  | `sdd-engineering:spec-creator` | opus |
  | `sdd-engineering:implementation-planner` | opus |
  | `sdd-engineering:implementer` | sonnet |
  | `sdd-engineering:plan-verifier` | sonnet |
  | `research-tools:researcher` | sonnet |
  | `architecture-review:architecture-reviewer` | opus |
- **Started**: `date -u +%Y-%m-%dT%H:%M:%SZ` run just before the call; `UNKNOWN` without Bash.
- **Duration ms, Tokens, Tool uses**: copied from the call's task notification.
- **Cost USD**: only when the notification or the user reports it; otherwise `UNKNOWN`.
- **Result**: the status line, plus for S4 the changed files and the commit (SHA, or
  `uncommitted`).

Never estimate a value. `/workflow-retro` reads this file.

## Stages

**S0 — research (optional)** · `research-tools:researcher` when the request depends on
facts nobody has verified yet (how something works today, what a library supports).
Pass its report verbatim to S1/S2.

**S1 — spec** · `sdd-engineering:spec-creator` (prompt: request, target spec path,
profile facts, user answers so far). `NEEDS_CLARIFICATION` → ask the user its
questions → run it again with the answers. Research requests → S0. Repeat until
`DONE`. Run the coverage check → **G1**.

**S2 — plan** · coverage check first when resuming with `--from plan`. Then
`sdd-engineering:implementation-planner` (prompt: spec path, profile facts,
constraints, approvals already known). `READY` → write the returned plan verbatim to
`plan.draft.md`. `SPEC_GAP` → back to S1 with the gap. `BLOCKED` → fix the input.

**S3 — cross-model review** · `sdd-engineering:implementation-planner` with
`MODE: REVIEW`, the spec path and the `plan.draft.md` path, on a **different model**
than S2. Pass the Agent `model` parameter: `sonnet` when S2 ran on `opus` (the
planner's frontmatter default), `opus` when S2 ran on any other model. Log both rows
with their models. If the override is rejected or the environment forces one model,
run the review anyway, log it as `same-model review`, and say so in the G2 summary;
never call a same-model review cross-model. Verdict `rework` or any blocker → S2 again
with the `plan.draft.md` path and the review findings; rewrite `plan.draft.md` with the
result (at most 2 rounds, then ask the user). Present a short plan summary + review
verdict and the models of both calls + approvals required + the commit mode question
→ **G2** → save `plan.md` from `plan.draft.md`.

Commit mode, chosen by the user at G2 and written into `plan.md`:

- `per-task` (default): after each task, stop at **G4** with that task's changed files
  and the plan's commit message; commit only that task's files when the user asks;
  then continue with the next task.
- `at-end`: all tasks first, one **G4** after S6 with the plan's commit table.

**S4 — implement** · `sdd-engineering:implementer`, **one call per task** in plan order
(prompt: `plan.md` path, the single task ID, profile facts, approvals granted at
G2/G3). It writes the tests the plan names. Log a row per task with its changed files.
`BLOCKED` → answer or return to the user. Area checks never run in parallel.

**S5 — architecture review** · build the REVIEW PACKET (plan, task IDs, ACs, base
ref, changed files per task, commits so far, approvals; no author reasoning) and run
`architecture-review:architecture-reviewer` in a fresh context. Findings → S4 fixes
(logged against the task they change) → re-review (at most 2 rounds).

**S6 — verify (last)** · `sdd-engineering:plan-verifier` with the spec path,
`plan.md`, task IDs, base ref (the commit range when tasks were committed, plus the
working tree) and approvals. Save `verification.md`. Any PARTIAL/MISSING → report the
gaps to the user; do not call the feature done.

**After S6** · show `git status`, the verification summary and the task → files →
commit table from `run-log.md` → **G4** for anything still uncommitted. After commits,
re-run `sdd-engineering:plan-verifier` with the commit range if the user wants the
commit column filled. Then mention that `/workflow-retro <slug>` is available (it runs
only when the user asks).

## Rules

- One feature per run. Follow the project instructions (protected paths, no
  installs, no paid calls); this skill grants no extra permission.
- Never commit, push or merge on your own: every commit needs the user's request at
  G4, and this skill never pushes or merges.
- Hand off artifacts **by path** (`spec.md`, `plan.draft.md`, `plan.md`): subagents read
  the file themselves. Never paste or summarise a spec or plan into a subagent prompt;
  pass review findings and user answers as text.
- Never mark a stage done on a subagent's say-so alone when its report says
  `PARTIAL`, `BLOCKED` or lists failing checks.
- Not for unrelated requests: if the user's request is not a feature to specify and
  build, say so and stop instead of starting the workflow.
- Write artifacts in English.
