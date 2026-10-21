---
max_turns: 8
timeout_seconds: 300
allowed_tools: [Agent, Read, Glob, Grep]
---

This is a plugin wiring check. Do exactly two subagent calls, each with model "haiku", and nothing else:

1. Agent with subagent_type "research-tools:researcher" and the prompt: "Project mode. Which function does hello.js export? Answer in at most 5 lines."
2. Agent with subagent_type "architecture-review:architecture-reviewer" and the prompt: "Base ref HEAD. Approved plan: none (wiring check). Changed files: none. Return your report."

Then reply with the first line of each subagent's report.
