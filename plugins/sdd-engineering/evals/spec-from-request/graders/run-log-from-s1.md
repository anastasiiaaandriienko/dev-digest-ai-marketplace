---
type: regex
pattern: '\|\s*S1\s*\|[^|\n]*\|\s*`?(?:sdd-engineering:)?spec-creator`?\s*\|\s*`?(?:opus|sonnet|haiku|claude-[a-z0-9.-]+)`?\s*\|'
match: contains
target: {source: file, path: "specs/todo-due-dates/run-log.md"}
weight: 2
---
