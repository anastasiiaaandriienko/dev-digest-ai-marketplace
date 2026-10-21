---
type: regex
pattern: '\|\s*S3\s*\|[^|\n]*\|[^|\n]*implementation-planner[^|\n]*\|\s*`?(?:sonnet|haiku|claude-sonnet[a-z0-9.-]*|claude-haiku[a-z0-9.-]*)`?\s*\|'
match: contains
target: {source: file, path: "specs/todo-due-dates/run-log.md"}
---
