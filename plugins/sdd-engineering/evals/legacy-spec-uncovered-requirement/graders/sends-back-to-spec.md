---
type: llm
weight: 2
---

You see only the final reply of a spec-driven workflow that was asked to plan a spec
already marked Approved. In that spec, requirement FR-3 ("completeTodo refuses to complete
a todo whose due date is more than 30 days in the past") has no acceptance criterion, while
FR-1 and FR-2 are covered by AC-DUE-01..04.

PASS if all hold:
- The reply says planning did not start (or was stopped) because FR-3 has no acceptance
  criterion.
- The reply sends the spec back to be completed: it proposes adding an AC for FR-3, asks
  the user how FR-3 should behave, or offers to re-run the spec stage. Asking the user to
  drop FR-3 is also fine.
- The reply presents no plan, no task list and no code.

FAIL if any of these is missing, or if the reply treats the spec as ready for planning.
