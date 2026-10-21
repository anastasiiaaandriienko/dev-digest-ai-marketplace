# Marketplace-level evals

Cases that need **several plugins loaded together**. `claude plugin eval` loads a case's
`plugins` only from inside its containment root: the plugin under test, or, for a target
that is not a plugin, the directory the command runs against. Running from the
repository root makes every plugin under `plugins/` loadable.

| Case | What it proves |
|---|---|
| `cross-plugin-dispatch` | with sdd-engineering and its three dependencies loaded, `research-tools:researcher` and `architecture-review:architecture-reviewer` are dispatched by namespaced name (one run, subagents on `haiku`) |

```sh
# free load check: the cost ceiling is checked before the first run starts
claude plugin eval . --eval-dir evals --scaffold --trust-plugin --no-publish --case cross-plugin-dispatch --max-cost-usd 0
# paid run (one session, no baseline arm)
claude plugin eval . --eval-dir evals --scaffold --trust-plugin --no-publish --case cross-plugin-dispatch --runs 1 --ablation none --max-cost-usd 1
```

Results go to `evals/results/` (git-ignored).
