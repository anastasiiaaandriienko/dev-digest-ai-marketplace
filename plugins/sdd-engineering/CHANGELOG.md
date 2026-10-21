# Changelog — sdd-engineering

All notable changes to this plugin. Versions follow [SemVer](https://semver.org/);
release tags are `sdd-engineering--v<version>`.

## [Unreleased]

## 1.1.0 — 2026-10-22

### Added
- **Every mandatory requirement has an acceptance criterion.** spec-creator returns
  `DONE` only when every `FR-n` / `NFR-n` line in §7 names an existing AC-ID; an
  uncovered requirement becomes `[NEEDS CLARIFICATION]` and `NEEDS_CLARIFICATION`.
- `scripts/check-spec.mjs` (Node.js, no dependencies): the requirement → AC coverage
  check. `/run-plan` runs it before G1 and before planning on `--from plan`, including
  for specs approved under 1.0.0; the planner returns `SPEC_GAP` for an uncovered
  requirement.
- Evals: negative case `legacy-spec-uncovered-requirement`; new graders for requirement
  coverage, the S1 run-log row and the cross-model review.

### Fixed (found in the 1.0.0 consumer run)
- `run-log.md` is created before the first subagent call (S1) and records per call the
  task, model and its source (`override` / `frontmatter` / `environment`), start time
  (UTC), duration, tokens, tool uses, cost when reported (else `UNKNOWN`) and the result.
- The S3 plan review passes an explicit model override that differs from S2 (`sonnet`
  when the planner ran on `opus`). A same-model review is logged and reported as such,
  never as cross-model.
- Task → commit traceability: the implementer runs one task per call, `run-log.md` lists
  changed files and the commit per task, and the user picks a commit mode at G2
  (`per-task` G4 after each task, or `at-end`). The verifier checks per-task commits.
  Nothing is committed without the user's request at G4.

### Compatibility
- Minor release: inputs, artifacts, gates and dependencies (`^1.0.0`) are unchanged.
  The coverage rule enforces what the 1.0.0 template already required ("each → AC-IDs");
  a 1.0.0 spec that met it passes unchanged.

## 1.0.0 — 2026-10-21

### Added
- Agents `spec-creator`, `implementation-planner` (PLAN / AD-HOC / REVIEW modes),
  `implementer`, `plan-verifier`, generalized from DevDigest: no repository-specific
  paths; project facts come from the host repository through
  `references/project-profile.md`.
- Skills `run-plan` (gates G1–G4, artifacts in the SDD folder), `workflow-retro`
  (bundled `retro-metrics.mjs`) and `engineering-insights` (per-area insight files).
- Namespaced dependencies on `engineering-paved-path`, `research-tools` and
  `architecture-review`.
- Behavior evals: spec from a request, plan from an approved spec, and a negative
  case (an unrelated question must not start the workflow).

### Changed (compared with the DevDigest originals)
- The workflow no longer uses `test-writer`, `security-reviewer` or `doc-writer`:
  the implementer writes the tests the plan names, and the review gate is
  `architecture-review:architecture-reviewer`.
- Defined behaviour when the host repository has no test command.
- `/run-plan` hands artifacts to subagents by path: the planner's draft is saved as
  `plan.draft.md` and the review, rework and implementer stages read the file instead
  of receiving the pasted plan (cost optimization; see docs/COST-BASELINE.md).
