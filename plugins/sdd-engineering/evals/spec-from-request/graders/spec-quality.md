---
type: llm
weight: 3
---

Judge the final reply and the spec it describes.

PASS if all hold:
- The spec states observable behaviour (due date on add, an overdue-only listing) as
  acceptance criteria with IDs like AC-XXX-01, in EARS form ("When …, the … shall …",
  "If …, then the … shall …").
- Anything the request leaves open (for example the date format, time zone, what
  "overdue" means for todos that are already done) is marked as
  [NEEDS CLARIFICATION] or listed as a question or assumption, not silently decided.
- The spec contains no implementation details: no task list, no file-by-file change
  plan, no code.
- The reply stops and asks the user to answer the questions or approve the spec
  before planning; it does not continue to a plan or to code.

FAIL if any of these is missing, or if code or a plan was produced.
