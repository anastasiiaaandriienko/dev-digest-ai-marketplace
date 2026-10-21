# architecture-review

An independent, read-only `architecture-reviewer` agent. It reviews a change in a fresh
context against **your repository's own architecture rules** and reports only issues
that affect correctness, stated requirements or hard project rules, each with
`file:line` evidence.

```sh
/plugin install architecture-review@dev-digest-ai-marketplace
```

Installing it also installs `engineering-paved-path`, whose skills it loads on demand.

## Where its rules come from

1. Your `CLAUDE.md` / `AGENTS.md` (root and touched directories).
2. The architecture docs they reference, or `ARCHITECTURE.md`, `docs/architecture*`,
   `docs/adr/**`.
3. Skills from `engineering-paved-path`: `onion-architecture`,
   `fastify-best-practices`, `drizzle-orm-patterns`, `postgresql-table-design`, `zod`
   (only the ones the diff needs).

If your repository documents no architecture, the review says so and checks only the
generic skills and the approved plan.

## Input and output

- **Input**: the approved plan (or task list), task IDs, base ref (default:
  uncommitted work vs `HEAD`) and the changed-file list. Do not pass the author's
  reasoning; the reviewer collects the diff itself.
- **Output**: findings table (severity, `file:line`, rule, evidence, fix), contract
  parity for duplicated contracts your docs declare, out-of-plan changes, verdict.

## Safety

Read-only: `Read, Grep, Glob`, the `Skill` tool and read-only git (`status`, `diff`,
`show`, `log`, `ls-files`). No builds, tests, installs, scripts, `localhost` or paid
APIs.

`sdd-engineering` uses it as the review gate of `/run-plan` (stage S5).

See [CHANGELOG.md](CHANGELOG.md). Extracted and generalized from DevDigest (MIT).
