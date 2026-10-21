# Compatibility — sdd-engineering

| Requirement | Version | Why |
|---|---|---|
| Claude Code | `>= 2.1.110` | version-constrained plugin dependencies (`"version": "^1.0.0"`) |
| Claude Code, for running the bundled evals | `>= 2.1.269` | `claude plugin eval` |
| Node.js, for `/workflow-retro` only | `>= 22` (the version it was written and tested with) | runs `skills/workflow-retro/scripts/retro-metrics.mjs` |

| Dependency plugin | Range |
|---|---|
| `engineering-paved-path` | `^1.0.0` |
| `research-tools` | `^1.0.0` |
| `architecture-review` | `^1.0.0` |

## Host repository

- Any language or stack. The bundled technical skills cover Node.js backends
  (Fastify, Drizzle, PostgreSQL, Zod); other stacks rely on the project's own
  instructions.
- Works best when the repository has `CLAUDE.md` or `AGENTS.md` naming its check
  commands and protected paths; without them the defaults in
  `references/project-profile.md` apply.
- A git repository is expected (reviews and verification read `git diff`/`git log`).

## Platforms

Written for macOS, Linux and Windows (Git Bash). The agents use the shell only for
read-only git and the project's check commands.
