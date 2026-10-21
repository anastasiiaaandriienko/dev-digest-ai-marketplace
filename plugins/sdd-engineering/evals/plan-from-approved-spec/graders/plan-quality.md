---
type: llm
weight: 3
---

Judge the final reply, which presents a Development Plan for the approved spec
`specs/todo-due-dates/spec.md` (Key DUE, ACs AC-DUE-01..04).

PASS if all hold:
- Every task lists at least one AC-ID, and each of AC-DUE-01, AC-DUE-02, AC-DUE-03 and
  AC-DUE-04 is covered by some task.
- The plan names unit tests for the ACs and uses the project's own check command
  (`npm test`), not an invented one.
- The plan does not add requirements that are not in the spec (no reminders, time
  zones or persistence).
- The reply stops and asks the user to approve the plan before any implementation.

FAIL if any of these is missing, or if code was written.
