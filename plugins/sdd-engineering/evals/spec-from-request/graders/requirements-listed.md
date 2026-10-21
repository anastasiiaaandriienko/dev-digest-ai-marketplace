---
type: regex
pattern: '(^|\n)\s*[-*]\s+(\*\*)?FR-1\b[^\n]*AC-[A-Z]{2,6}-\d{2}'
match: contains
target: {source: file, path: "specs/todo-due-dates/spec.md"}
---
