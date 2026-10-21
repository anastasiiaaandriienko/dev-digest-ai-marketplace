# Plugin guidelines

The standard every plugin in this marketplace is built to. CONTRIBUTING.md has the
mechanics; this page has the reasoning.

## 1. One owner, one reason to change

A plugin groups components that are released together for the same consumer
scenario. For each file you should be able to answer: who owns it, which scenario uses
it, and why it ships with the rest of the plugin. If a component is useful on its own
(a researcher, a reviewer), it belongs in its own plugin and becomes a dependency.

## 2. Portable, not personal

Before extracting a component from a project, sort its files:

| Group | Ships? | Examples |
|---|---|---|
| Reusable | yes | agents, skills, hooks, evals without product-specific paths |
| Project-specific | no — stays in the project | `CLAUDE.md`, product specs, module names, rules only for one product |
| Optional integrations | separate plugin, opt-in | MCP servers and anything needing network access or credentials |
| Local leftovers | never | caches, personal memory, experiments, absolute paths |

Replace assumptions about a repository's structure with explicit inputs: read the host
project's `CLAUDE.md` / `AGENTS.md` and manifests, fall back to documented defaults, and
say `UNKNOWN` instead of guessing.

## 3. Least privilege

- Read-only agents: no `Write`, `Edit`, `NotebookEdit`; `Bash` only when they need
  read-only git, and then say which commands.
- Writing agents: name their write scope in the prompt (which files, which folders).
- Manual workflows (`run-plan`, `workflow-retro`) use `disable-model-invocation: true`.
- Plugin agents cannot set `permissionMode`, `hooks` or `mcpServers`; don't rely on them.

## 4. Composition by name

- Reference other plugins' components by namespaced name and declare the dependency.
- One source per skill: technical skills live in `engineering-paved-path`.
- Agents link to plugin files through `${CLAUDE_PLUGIN_ROOT}`; skills link to their own
  scripts through `${CLAUDE_SKILL_DIR}`. Writable state goes to `${CLAUDE_PLUGIN_DATA}`,
  never next to the plugin (the plugin directory changes on update).

## 5. Two levels of checks

- **Schema**: `claude plugin validate` and `npm run validate` check that the files have
  the right shape and that names, versions and references line up.
- **Behaviour**: `claude plugin eval` checks that the composition does the job:
  positive cases for the intended workflow and at least one negative case (the plugin
  must stay quiet on unrelated requests).

## 6. Documentation

Every plugin has a README (what it gives, how to install, inputs, outputs, safety),
a CHANGELOG, and a COMPATIBILITY file when it depends on other plugins or on a minimum
Claude Code version.
