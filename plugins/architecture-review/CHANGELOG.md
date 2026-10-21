# Changelog — architecture-review

Versions follow [SemVer](https://semver.org/); release tags are
`architecture-review--v<version>`.

## [Unreleased]

## 1.0.0 — 2026-10-21

### Added
- `architecture-reviewer` agent, generalized from DevDigest: reads the host
  repository's architecture docs instead of hardcoded DevDigest checks
  (`server/`, `reviewer-core`, `@devdigest/shared`); loads
  `engineering-paved-path` skills by namespaced name.
- Dependency on `engineering-paved-path@^1.0.0`.

### Removed (compared with the DevDigest original)
- The reference to DevDigest's `pr-self-review` skill table; the skill map now lives
  in the agent.
