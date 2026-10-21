---
type: llm
weight: 3
---

You see only the final reply of a spec-driven workflow that was asked to plan an approved
spec (Key DUE: AC-DUE-01 store a valid due date; AC-DUE-02 reject an invalid one;
AC-DUE-03 list only overdue, not-done todos; AC-DUE-04 listing without options is
unchanged). Other graders check the AC-IDs and that no code was written; judge the reply
alone.

PASS if all hold:
- The reply presents a plan made of tasks, and each task is tied to one or more AC-DUE IDs.
- The plan names tests for the behaviour and uses the project's check command
  (`npm test`), not an invented one.
- The plan adds no requirement that is not in the spec (for example reminders,
  time-zone handling beyond UTC, persistence, new dependencies).
- The reply stops and asks the user to approve the plan before any implementation.
  Mentioning that a review suggested further changes is fine.

FAIL if any of these is missing.
