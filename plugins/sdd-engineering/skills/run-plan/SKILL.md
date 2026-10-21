---
name: run-plan
description: Manual spec-driven development orchestrator. Drives one feature through spec-creator → approved spec → implementation-planner → cross-model plan review → approved plan → implementer → architecture review → plan-verifier, stopping at every approval gate. Artifacts live in the SDD folder (default specs/<slug>/ - spec.md, plan.md, verification.md, run-log.md). Invoke explicitly as /run-plan.
argument-hint: "<slug> [feature request…]  |  <slug> --from <spec|plan|review|implement|arch|verify>"
disable-model-invocation: true
---

# run-plan (SDD workflow)

The **main agent** runs this skill and is the only hub: it calls each subagent,
relays questions to the user, and owns every file outside the subagents' write
scopes and all of git. Subagents never call each other. Agent rules live in the
agent files; this skill only sets the order, the gates and the hand-offs.

Arguments: `$ARGUMENTS`: `<slug>` (kebab-case, e.g. `password-reset`) plus either the
feature request or `--from <stage>` to resume. Empty → ask for the slug and the
request, then stop.

## Before S1 — resolve the project profile

Read `${CLAUDE_PLUGIN_ROOT}/references/project-profile.md` and resolve, from the host
repository: the SDD artifact folder, the areas, the unit-level check commands and the
protected paths. Show them to the user in one short list with their sources. Pass
them to every subagent prompt. A value you could not find is `UNKNOWN`; if the check
commands are unknown, ask the user now (see "No check command" in the profile).

## Gates — hard stops

| Gate | Before | Passes only when |
|---|---|---|
| **G1 Spec** | planning | the user explicitly approves `spec.md` and it has no `[NEEDS CLARIFICATION]` |
| **G2 Plan** | any code change | the user explicitly approves the plan **and** every `APPROVAL REQUIRED` item in it by name |
| **G3 Extra** | the step that needs it | the user approves an unplanned protected action (protected path, dependency, integration/e2e, paid call) |
| **G4 Commit** | `git commit` | the user asks for the commit; nothing is pushed or merged by this skill |

At a gate: show the artifact summary, ask, then **end the turn**. Silence, "looks
good" about something else, or an approval of an earlier gate is not an approval.
Approval of one gate never covers the next one.

## Artifacts — `<SDD folder>/<slug>/` (default `specs/<slug>/`)

| File | Written by | When |
|---|---|---|
| `spec.md` | `sdd-engineering:spec-creator`; main agent sets `Status: Approved (<date>)` | S1, at G1 |
| `plan.draft.md` | main agent (the planner's latest plan, verbatim) | S2, rewritten on every rework round |
| `plan.md` | main agent (`plan.draft.md` + `Status: Approved (<date>)` + review verdict) | at G2 |
| `verification.md` | main agent (plan-verifier report verbatim) | S6 |
| `run-log.md` | main agent, one row per subagent call | every stage |

`run-log.md` feeds `/workflow-retro`:
`| Stage | Agent | Model | Agent ID | Started | Duration ms | Tokens | Tool uses | Result |`
Copy duration, tokens and tool uses from the task notification of each call; write
`UNKNOWN` when a value is not reported. Never estimate.

## Stages

**S0 — research (optional)** · `research-tools:researcher` when the request depends on
facts nobody has verified yet (how something works today, what a library supports).
Pass its report verbatim to S1/S2.

**S1 — spec** · `sdd-engineering:spec-creator` (prompt: request, target spec path,
profile facts, user answers so far). `NEEDS_CLARIFICATION` → ask the user its
questions → run it again with the answers. Research requests → S0. Repeat until
`DONE`. → **G1**.

**S2 — plan** · `sdd-engineering:implementation-planner` (prompt: spec path, profile
facts, constraints, approvals already known). `READY` → write the returned plan verbatim
to `plan.draft.md`. `SPEC_GAP` → back to S1 with the gap. `BLOCKED` → fix the input.

**S3 — cross-model review** · `sdd-engineering:implementation-planner` with
`MODE: REVIEW`, the spec path and the `plan.draft.md` path, on a **different model**
than S2 (Agent `model` override). Verdict `rework` or any blocker → S2 again with the
`plan.draft.md` path and the review findings; rewrite `plan.draft.md` with the result
(at most 2 rounds, then ask the user). Present a short plan summary + review verdict +
approvals required → **G2** → save `plan.md` from `plan.draft.md`.

**S4 — implement** · `sdd-engineering:implementer` (prompt: `plan.md` path, task IDs in
plan order, profile facts, approvals granted at G2/G3). It writes the tests the plan
names. `BLOCKED` → answer or return to the user. Run dependent tasks sequentially; area
checks never in parallel.

**S5 — architecture review** · build the REVIEW PACKET (plan, task IDs, ACs, base
ref, changed files, approvals; no author reasoning) and run
`architecture-review:architecture-reviewer` in a fresh context. Findings → S4 fixes →
re-review (at most 2 rounds).

**S6 — verify (last)** · `sdd-engineering:plan-verifier` with the spec path,
`plan.md`, task IDs, base ref and approvals. Save `verification.md`. Any
PARTIAL/MISSING → report the gaps to the user; do not call the feature done.

**After S6** · show `git status`, the verification summary and the plan's commit
table → **G4**. After commits, re-run `sdd-engineering:plan-verifier` with the commit
range if the user wants the commit column filled. Then mention that
`/workflow-retro <slug>` is available (it runs only when the user asks).

## Rules

- One feature per run. Follow the project instructions (protected paths, no
  installs, no paid calls); this skill grants no extra permission.
- Hand off artifacts **by path** (`spec.md`, `plan.draft.md`, `plan.md`): subagents read
  the file themselves. Never paste or summarise a spec or plan into a subagent prompt;
  pass review findings and user answers as text.
- Never mark a stage done on a subagent's say-so alone when its report says
  `PARTIAL`, `BLOCKED` or lists failing checks.
- Not for unrelated requests: if the user's request is not a feature to specify and
  build, say so and stop instead of starting the workflow.
- Write artifacts in English.
