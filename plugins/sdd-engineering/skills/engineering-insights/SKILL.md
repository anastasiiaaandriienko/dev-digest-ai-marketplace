---
name: engineering-insights
description: Reads and records verified, non-obvious engineering insights in per-area INSIGHTS.md files of the current repository. Use before meaningful coding, debugging or refactoring in an area (to load prior insights), when a non-obvious technical fact, root cause, pitfall or library quirk has just been verified, and at the wrap-up of a substantial session. Also invoked manually as /engineering-insights.
argument-hint: "[read <area> | record | wrap-up]"
---

# Engineering Insights

Keeps a small, verified knowledge base per area so later tasks start from what
earlier tasks learned. An **area** is a package, module or top-level directory as the
project instructions define it (`CLAUDE.md` / `AGENTS.md`); if they define none, the
repository is one area.

Files: `<area>/INSIGHTS.md` (or the location the project instructions name). Never a
second knowledge file next to it (`LEARNINGS.md` etc.).

Automatic loading of this skill is decided by the model from the description above
and is **not guaranteed**. When in doubt, the user can invoke `/engineering-insights`
explicitly.

## Modes

Arguments: `$ARGUMENTS`

- `read <area>` → **Reading** for that area only.
- `record` → **Recording** for the finding just verified in this conversation.
- `wrap-up` → **Wrap-up** for the current session.
- No argument → infer: before work → Reading; after a verified discovery →
  Recording; at the end of a session → Wrap-up.

## Area ownership

The file of the area whose code the finding is about owns it. For root files, CI or
scripts, use the area whose behaviour is affected; if unclear, ask the user. If
several areas are involved, write ONE entry in the primary area and describe the
others in its **Cross-area** field. Do not copy the entry into every file.

## Reading (before work)

1. Determine which areas the task touches. Read only those `INSIGHTS.md` files.
2. If a file does not exist, continue normally. Do NOT create it just to read it.
3. Use entries as context, not as truth. Before relying on an entry for a decision,
   re-check its **Evidence** against the current code (`Grep`/`Read`).
4. If an entry is contradicted by current code, mention it and flag it during
   Recording (see **Outdated entries**).
5. Briefly say which insights (titles) are relevant to the task, or that none exist.

## What qualifies

Record only if ALL hold: verified in this session (code read, command output, test
result), non-obvious from a quick read of the code, reusable for future tasks, not
already in the project instructions, a README or an existing insight.

Record: architectural constraints and cross-area dependencies; bug root causes with
the verified fix; reusable codebase patterns; important tool or library behaviour;
decisions with their technical justification; non-obvious pitfalls and how to avoid
them.

Do NOT record: generic programming advice, unverified assumptions (unless as an Open
Question), routine summaries of completed work, trivia obvious from the code,
duplicates. If nothing qualifies, write nothing and say so.

Code inspection verifies what the implementation does structurally. Do not claim a
suspected runtime bug is reproduced unless a test or execution confirms it; label
uncertain runtime behaviour as a hypothesis or Open Question.

## Categories

`What Works` · `What Doesn't Work` · `Codebase Patterns` · `Tool & Library Notes` ·
`Recurring Errors & Fixes` · `Session Notes` · `Open Questions`

## Entry format

```markdown
### YYYY-MM-DD — <short actionable title>
- **Category:** <one category from the list above>
- **Status:** verified | open
- **Discovery:** <what is true and why it matters — specific, 1–3 sentences>
- **Evidence:** `<repo-relative/path>:<line>` (`<symbol>`) — <what that line shows>; <command + observed result, if any>
- **Guidance:** <what to do / avoid next time>
- **Cross-area:** <affected areas and how> (omit if none)
```

Evidence uses repo-relative paths with forward slashes and the symbol name, so the
entry survives line drift. Confirm every line number with `Grep -n` or `Read`
immediately before writing. Never invent paths, line numbers, commands or results.

## Recording (safe persistence)

1. Draft the entry and check it against **What qualifies**. Drop it if it fails.
2. Pick the owning file (**Area ownership**).
3. **Read the whole target file right before writing.**
4. Duplicates: if an entry already says the same thing, do not add one. If yours adds
   verified detail, append a new entry with `Extends: "<old title>"`.
5. Append at the END of the file with `Edit` (or `Write` only when creating a new
   file). Never reorder, reformat, shorten or delete existing content.
6. Create a file only together with its first real entry, with this header:
   ```markdown
   # <area> — Engineering Insights

   Verified, non-obvious knowledge for `<area>/`. Append-only; maintained via the `engineering-insights` skill.
   ```
7. Report: file path, entry title(s), anything flagged.

## Outdated entries

Never modify, reorder or delete existing entries. When current code contradicts one:
verify the contradiction, append a new entry explaining what changed with
`Supersedes (pending review): "<old title>"`, and tell the user which entry needs
review. Never delete or consolidate entries without explicit user approval.

## Wrap-up (end of a substantial session)

Run only after meaningful coding or debugging. List candidate discoveries, filter
them through **What qualifies**, re-verify evidence, record the survivors (at most
about 5 per session; prefer fewer, stronger entries), and report written entries,
skipped candidates with the reason, and open questions. Nothing qualifies → write
nothing and say "No new insights."

## Boundaries

This skill edits only `INSIGHTS.md` files. It never changes application code,
project instructions, migrations or lockfiles. Some workflows forbid subagents from
recording: then return insight candidates to the main agent instead of writing.
