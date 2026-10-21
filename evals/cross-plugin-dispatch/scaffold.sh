#!/usr/bin/env bash
# Minimal git repository: one file, one commit, nothing to review.
set -euo pipefail

cat > CLAUDE.md <<'MD'
# Smoke repository

One file, `hello.js`. No check commands.
MD
printf 'export const hello = () => "hello";\n' > hello.js

git init -q
git add -A
git -c user.email=eval@example.com -c user.name=eval commit -q -m "initial"
