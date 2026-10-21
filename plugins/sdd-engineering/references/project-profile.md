# Project profile — how SDD agents learn about the host repository

The sdd-engineering agents know nothing about any particular repository. Every
project-specific fact comes from the **host repository** at run time, resolved in this
order:

1. **Explicit inputs in the prompt** from the main agent (`/run-plan` passes them).
2. **Project instructions**: `CLAUDE.md` and/or `AGENTS.md` at the repository root and
   in the touched directories, plus the docs they reference.
3. **Manifests**: `package.json` scripts, `Makefile`, `pyproject.toml`, `go.mod`,
   `Cargo.toml`, etc. (read-only).
4. **Defaults** below.

Record every fact you used with its source (`path:line` or "default") in your report.
A fact found nowhere is `UNKNOWN`; never invent one.

## Inputs and defaults

| Input | Where it comes from | Default |
|---|---|---|
| SDD artifact folder | prompt, or a project instruction naming the SDD/spec folder | `specs/<slug>/` at the repository root |
| Artifacts | — | `spec.md`, `plan.md`, `verification.md`, `run-log.md` in that folder; requirement coverage of `spec.md` is checked with `${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs` |
| Areas (packages/modules) | project instructions; else top-level source directories | the repository as one area |
| Check commands | project instructions; else manifest scripts named like `typecheck`, `lint`, `test` | none → see "No check command" |
| Protected paths | project instructions + the defaults below | the defaults below |
| Insight files | project instructions | `<area>/INSIGHTS.md` (only if the project already uses them) |
| Architecture docs | project instructions | `ARCHITECTURE.md`, `docs/architecture*`, `docs/adr/**` when present |

## Check commands

- Use only **unit-level** commands that need no network, running services, Docker,
  databases or credentials: type checks, linters, unit tests.
- Never run commands that install, migrate, seed, deploy, start a server or call a
  paid API, even if a manifest names them. Integration and end-to-end suites run only
  with explicit approval in the prompt.
- Run package checks one at a time, never in parallel.

### No check command

If no check command can be found:

- **implementation-planner** writes `Checks: NONE FOUND` in each task and lists
  "confirm or provide the check command" under Approvals required.
- **implementer** reports `Checks: NONE FOUND (searched: <files>)`, never invents a
  command, and marks every criterion that needed an automated check as unverified.
- **plan-verifier** marks those criteria `PARTIAL` with "no automated check
  available" and the verdict says the change is unverified.
- **/run-plan** stops at the next gate and asks the user for the command.

## Protected paths (approval required before any change)

Always, in addition to what the project lists:

- lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`,
  `poetry.lock`, `uv.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`, `composer.lock`;
- dependency sections of manifests (adding, removing or upgrading dependencies);
- database migrations (`**/migrations/**`) and schema files the project says imply a
  migration;
- CI and release configuration (`.github/workflows/**` and similar);
- secrets and environment files (`.env*`, `*.pem`, `*.key`), which are never read
  into reports;
- agent configuration and instructions (`.claude/**`, `CLAUDE.md`, `AGENTS.md`);
- any paid LLM call, and anything that changes external state (git push, deploys,
  issue trackers).

## Skill map (name the skills per task; load on demand; never copy their text)

| Change touches | Skill |
|---|---|
| any area, before editing | `sdd-engineering:engineering-insights` (read mode), only if the project keeps insight files |
| backend layering, adapters, composition root | `engineering-paved-path:onion-architecture` |
| Fastify routes, plugins, schemas | `engineering-paved-path:fastify-best-practices` |
| Drizzle ORM schema, queries, transactions | `engineering-paved-path:drizzle-orm-patterns` |
| PostgreSQL table design (approved schema work only) | `engineering-paved-path:postgresql-table-design` |
| Zod schemas and shared contracts | `engineering-paved-path:zod` |

Skills for other stacks are not bundled; follow the project's own instructions there
and say so under Limitations.

## Subagents used by the workflow

| Name | Plugin | Role |
|---|---|---|
| `sdd-engineering:spec-creator` | sdd-engineering | request → `spec.md` |
| `sdd-engineering:implementation-planner` | sdd-engineering | spec → plan; cross-model plan review |
| `sdd-engineering:implementer` | sdd-engineering | plan → code and tests |
| `sdd-engineering:plan-verifier` | sdd-engineering | AC → task → test → commit matrix |
| `research-tools:researcher` | research-tools | read-only facts for spec and plan |
| `architecture-review:architecture-reviewer` | architecture-review | independent review gate |
