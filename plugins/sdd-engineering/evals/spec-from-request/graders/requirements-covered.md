---
type: regex
pattern: '(^|\n)\s*[-*]\s+(\*\*)?N?FR-\d+(?![^\n]*AC-[A-Z]{2,6}-\d{2})'
match: not_contains
target: {source: file, path: "specs/todo-due-dates/spec.md"}
weight: 3
---
