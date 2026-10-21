---
type: regex
pattern: '\|\s*S1\b[^|\n]*\|[^|\n]*\|\s*`?(?:sdd-engineering:)?spec-creator`?\s*\|\s*`?(?:opus|sonnet|haiku|claude-[a-z0-9.-]+)\b[^|\n]*\|'
match: contains
target: {source: file, path: "specs/todo-due-dates/run-log.md"}
weight: 2
---
