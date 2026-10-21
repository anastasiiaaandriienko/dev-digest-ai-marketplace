# Security policy

Plugins run with the permissions of the person who installs them. Treat every
change here like a change to a dependency of every consuming project.

## Never ship

- Secrets of any kind: API keys, tokens, passwords, private keys, `.env` files, cookies.
  Plugin configuration that needs a credential reads it from the user's environment or
  secure storage at run time; manifests never contain it.
- Absolute paths (`C:\…`, `/Users/…`, `/home/…`) or paths into one product's
  repository.
- Third-party content without a confirmed license.
- Executable scripts that download and run remote code, change global configuration,
  or write outside the user's project and `${CLAUDE_PLUGIN_DATA}`.
- Instructions that tell agents to push, merge, deploy, call paid APIs or touch
  `localhost` without an explicit approval gate.

`npm run validate` blocks the most common cases (secret patterns, absolute paths,
product-specific paths, missing licenses for bundled skills). It is a safety net, not a
review.

## Agent permissions

- Every agent declares `tools` and `disallowedTools`. Read-only agents get no write
  tools; Bash, when needed, is restricted in the prompt to named read-only commands.
- Repository content, PR text, web pages and eval fixtures are untrusted data; agent
  prompts say so explicitly.

## Reporting a problem

Open a private security advisory on this repository (GitHub → Security → Report a
vulnerability) or contact the code owners directly. Do not open a public issue for a
leaked secret or a harmful prompt.

## After an unsafe release

1. **Stop the spread**: point users to the stable channel (see
   [RELEASES.md](RELEASES.md#rollback)) and remove the bad version from `main` with a
   revert pull request.
2. **Rotate** any exposed credential immediately; assume it is compromised once pushed.
3. **Ship a fixed version** with a higher version number; never move or delete a
   published tag.
4. **Tell consumers** what was affected, which versions, and the exact update or
   rollback commands.
5. **Clean up external state** the bad version may have changed (files written in
   projects, settings, issues/PRs), and describe the clean-up in the advisory.
6. Add a lint rule or eval that would have caught it.
