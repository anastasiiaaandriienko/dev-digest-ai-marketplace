---
type: llm
weight: 3
---

You see only the final reply of a spec-driven workflow that was asked to prepare a spec
for "optional due dates on todos, and listing only overdue todos". The spec file itself is
checked by other graders; judge the reply alone.

PASS if all hold:
- The reply says a spec was written (or updated) for this feature, or names its path.
- The reply raises the open decisions the request leaves undecided, as questions or
  explicit assumptions — at least two of: the due-date format or type, the time zone or
  the source of "now", what "overdue" means (strict vs inclusive, completed todos), how an
  invalid due date is handled.
- The reply stops and asks the user to answer those questions or to approve the spec
  before any planning or implementation.
- The reply contains no code and does not claim that code was written or a plan was made.

FAIL if any of these is missing.
