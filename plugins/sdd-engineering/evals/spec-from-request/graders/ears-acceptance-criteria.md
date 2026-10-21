---
type: regex
pattern: "AC-[A-Z]{2,6}-\\d{2}"
match: contains
target: {source: file, path: "specs/todo-due-dates/spec.md"}
weight: 2
---
