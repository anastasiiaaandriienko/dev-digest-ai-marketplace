# engineering-paved-path

Shared engineering skills: one source for technical guidance that the other plugins
(and you) load by namespaced name instead of copying it into every agent.

```sh
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```

| Skill | Use it for | Origin |
|---|---|---|
| `engineering-paved-path:onion-architecture` | layering, dependency direction, ports/adapters, composition root, reviewing backend changes | generalized from DevDigest (MIT) |
| `engineering-paved-path:fastify-best-practices` | Fastify routes, plugins, schemas, hooks, errors | [mcollina/skills](https://github.com/mcollina/skills) (MIT) |
| `engineering-paved-path:drizzle-orm-patterns` | Drizzle schema, queries, relations, transactions, migrations | [giuseppe-trisciuoglio/developer-kit](https://github.com/giuseppe-trisciuoglio/developer-kit) (MIT) |
| `engineering-paved-path:postgresql-table-design` | PostgreSQL data types, keys, constraints, indexes, partitioning | [wshobson/agents](https://github.com/wshobson/agents) (MIT) |
| `engineering-paved-path:zod` | Zod schemas, parsing, error handling, type inference | [pproenca/dot-skills](https://github.com/pproenca/dot-skills) (MIT) |

Third-party skills are bundled unmodified with their license file; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Consumers

- `architecture-review:architecture-reviewer` loads the skills that match a diff.
- `sdd-engineering` names them per task in its plans; the implementer loads them.

## Not included (on purpose)

React, React Testing Library, Next.js, TypeScript, security and Mermaid skills were
used in DevDigest but are **not** bundled: their license or origin could not be
confirmed. Install them from their upstream sources, or contribute a skill with a
confirmed license (see [CONTRIBUTING.md](../../CONTRIBUTING.md)).

See [CHANGELOG.md](CHANGELOG.md).
