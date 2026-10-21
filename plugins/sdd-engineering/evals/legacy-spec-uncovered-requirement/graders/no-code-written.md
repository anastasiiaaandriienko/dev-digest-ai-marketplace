---
type: regex
pattern: "dueDate|due_date|overdue"
flags: i
match: not_contains
target: {source: file, path: "src/todos.js"}
---
