# Compatibility — architecture-review

| Requirement | Version | Why |
|---|---|---|
| Claude Code | `>= 2.1.110` | version-constrained plugin dependencies (`"version": "^1.0.0"`) |

| Dependency plugin | Range |
|---|---|
| `engineering-paved-path` | `^1.0.0` |

## Host repository

- Any language or stack. The reviewer reads your `CLAUDE.md` / `AGENTS.md` and
  architecture docs; the bundled skills cover Node.js backends (layering, Fastify,
  Drizzle, PostgreSQL, Zod).
- A git repository is required: the reviewer collects the diff with read-only git.
