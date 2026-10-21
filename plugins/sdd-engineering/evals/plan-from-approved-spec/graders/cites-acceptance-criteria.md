---
type: regex
pattern: "^(?=[\\s\\S]*AC-DUE-01)(?=[\\s\\S]*AC-DUE-02)(?=[\\s\\S]*AC-DUE-03)(?=[\\s\\S]*AC-DUE-04)"
match: contains
target: last_message
weight: 2
---
