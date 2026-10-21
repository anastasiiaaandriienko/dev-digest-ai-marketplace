---
name: onion-architecture
description: Layered (onion) architecture for backend services — transport → application service → domain/repository, with every external integration (LLM, VCS, payment, mail, queue, secrets, tokenizer…) behind a port interface built by one composition root; dependencies point inward and transport code never calls adapters or the database directly. Includes how to find a project's concrete layers, good/bad examples, testing through overridable dependencies, and how to treat documented exceptions. Use when adding or changing a backend module, route, service, repository or adapter, or when reviewing backend changes for layering.
---

# Onion architecture

The dependency rule for backend code: **arrows point inward only.** This skill states
the generic rules. The concrete names (folders, base classes, the composition root,
known exceptions) belong to the project: read its `CLAUDE.md` / `AGENTS.md` and
architecture docs (`ARCHITECTURE.md`, `docs/architecture*`, `docs/adr/**`) first and
map the layers below onto them. If the project documents a different architecture,
the project wins; use this skill only for what it leaves open.

## The layers (outside → inside)

```
transport   routes / controllers / handlers   parse + validate input, resolve the caller's context,
            │                                   call ONE application-service method, map the result
            ▼
application services / use cases            orchestration, authorization, domain errors
            │                \
            ▼                 ▼
persistence repositories     domain (pure)        ports (interfaces)
                             rules, calculations   e.g. LlmProvider, VcsClient, Mailer
                                                        ▲
                                                        │ implemented by
            adapters (edge): SDK/HTTP/DB clients, built ONLY in the composition root
```

- **Domain** imports nothing from the web framework, the ORM or adapters. It is pure
  and unit-testable.
- **Application services** depend on ports and repositories, never on concrete
  adapter classes.
- **Adapters** live at the edge, implement a port, and are constructed in exactly one
  place (the composition root / DI container / factory module).
- **Transport** depends on application services only.

## Finding the concrete layers in a project

1. Read the project instructions and architecture docs; note the module layout, the
   composition root and any documented exceptions.
2. If undocumented, infer from the code: look for where adapters are constructed
   (`new …Client(`, SDK initialisation), where the framework app is built, and how
   handlers obtain services. Report the inference as an assumption, not a fact.

## Good / bad (illustrative TypeScript)

**Good — the handler delegates, the service orchestrates through ports**

```ts
// transport
router.post('/projects/:id/sync', async (req) => {
  const ctx = await resolveContext(req);
  return projects.sync(ctx.tenantId, req.params.id);
});

// application service
async sync(tenantId: string, projectId: string) {
  const project = await this.repo.get(tenantId, projectId);
  if (!project) throw new NotFoundError('Project not found');
  const items = await this.vcs.listChanges(project.remote); // port
  return this.repo.saveChanges(tenantId, project.id, items);  // repository
}
```

**Bad — transport talks to the adapter and the database itself**

```ts
router.post('/projects/:id/sync', async (req) => {
  const [project] = await db.select().from(projects).where(/* … */);
  const items = await new VcsSdkClient(token).listChanges(project.remote);
  for (const i of items) await db.insert(changes).values(/* … */);
});
```

**Bad — an inner layer reaching outward**

```ts
// domain/pricing.ts
import { db } from '../db/client';           // ✗ domain imports persistence
import { StripeClient } from '../adapters/stripe'; // ✗ domain imports an adapter
```

**Bad — constructing an adapter outside the composition root**

```ts
// application service
const llm = new SomeLlmSdk(process.env.API_KEY); // ✗ untestable, bypasses overrides
```

## Rules for new or changed code

1. A handler: validate input, resolve context, one service call, return. No database
   handle, SDK client or adapter in transport code.
2. Business rules and orchestration in application services; data access in
   repositories; pure logic in domain modules.
3. A new external integration = a port interface, an adapter implementing it, one
   construction site in the composition root, an override hook for tests, and a
   test double.
4. Scope every query by the tenant/workspace the caller belongs to when the project
   is multi-tenant; raise the project's domain error types, not framework errors.
5. Pure domain code gets unit tests; tests that need a real database follow the
   project's naming and isolation rules for integration tests.

## Testing through the composition root

Because everything outside the domain is reached through the composition root, a
service is testable without network, keys or real services: build the app with test
doubles passed as overrides. If a project has no override mechanism, adding one is
an architectural change; propose it, don't improvise it inside a feature task.

## Documented exceptions

Projects often list existing violations (for example a handler that still queries the
database). Do not copy them into new code and do not "fix" them inside an unrelated
task. In a review, flag a **new** occurrence as a finding; mention an existing one only
if the change touches that code.
