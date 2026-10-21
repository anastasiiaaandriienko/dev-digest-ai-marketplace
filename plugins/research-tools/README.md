# research-tools

A read-only `researcher` agent for questions you want answered with evidence before
you plan or change anything:

- "Is X implemented? Where? How does it work?"
- "What does library/API Y support in the version we use?"
- "What constraints apply to change Z?"

```sh
/plugin install research-tools@dev-digest-ai-marketplace
```

Use it as `research-tools:researcher` (for example "use the
research-tools:researcher agent to find …"). `sdd-engineering` calls it during
`/run-plan` when a spec or plan depends on unverified facts.

## Behaviour

- **Two modes**: project research (your code, `CLAUDE.md`/`AGENTS.md`, docs) and
  external research (official docs, specs, changelogs, pinned to the versions in
  your manifests).
- **Evidence or "Unknown"**: every claim cites `path:line` or a URL it read; absence
  is only claimed after a documented search.
- **Asks instead of guessing** when the question is ambiguous
  (`STATUS: NEEDS_CLARIFICATION`).
- **Read-only**: tools are `Read, Grep, Glob, WebSearch, WebFetch`. No edits, no
  shell, no skills, no subagents; never fetches `localhost` or private addresses and
  never calls paid APIs.

## Report

`STATUS`, mode, findings with evidence IDs, sources, unknowns, limitations and the
searches it ran — at most about 60 lines.

See [CHANGELOG.md](CHANGELOG.md). Extracted and generalized from DevDigest (MIT).
