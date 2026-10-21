# Changelog — sdd-engineering

All notable changes to this plugin. Versions follow [SemVer](https://semver.org/);
release tags are `sdd-engineering--v<version>`.

## [Unreleased]

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
