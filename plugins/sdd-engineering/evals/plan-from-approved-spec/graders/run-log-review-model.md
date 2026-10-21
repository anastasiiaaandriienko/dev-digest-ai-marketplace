---
type: regex
pattern: '\|\s*S3\b[^|\n]*\|[^|\n]*\|[^|\n]*implementation-planner[^|\n]*\|\s*`?(?:sonnet|haiku|claude-sonnet[a-z0-9.-]*|claude-haiku[a-z0-9.-]*)\b[^|\n]*\|'
match: contains
target: {source: file, path: "specs/todo-due-dates/run-log.md"}
---
