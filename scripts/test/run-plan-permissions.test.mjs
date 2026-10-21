// The commands /run-plan tells the main session to run must match the skill's own
// `allowed-tools` rules, or every run stops at a permission prompt (sdd-engineering 1.1.0
// shipped a quoted command with an unquoted rule). Claude Code substitutes
// ${CLAUDE_PLUGIN_ROOT} in both before matching; `Bash(<prefix>:*)` is a prefix rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../lib/frontmatter.mjs';

const skillPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plugins', 'sdd-engineering', 'skills', 'run-plan', 'SKILL.md');
const skill = readFileSync(skillPath, 'utf8');

/** `Bash(<prefix>:*)` rules from an allowed-tools value. */
function bashPrefixes(allowedTools) {
  return [...String(allowedTools).matchAll(/Bash\((.*?):\*\)/g)].map((m) => m[1]);
}

function allowed(prefixes, command) {
  return prefixes.some((p) => command === p || command.startsWith(`${p} `));
}

const roots = [
  'C:/Users/dev/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.1.1',
  'C:/Users/Jane Doe/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.1.1',
  '/opt/claude-home/.claude/plugins/cache/dev-digest-ai-marketplace/sdd-engineering/1.1.1',
];

/** The coverage-check command exactly as the skill body writes it. */
const instructed = skill.match(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/check-spec\.mjs" .+$/m)?.[0];

test('the skill body instructs one coverage-check command', () => {
  assert.ok(instructed, 'run-plan names the check-spec command in a code block');
});

test('allowed-tools pre-approves the coverage check as the skill writes it, for any install path', () => {
  const rules = bashPrefixes(parseFrontmatter(skill).data['allowed-tools']);
  for (const root of roots) {
    const prefixes = rules.map((r) => r.replaceAll('${CLAUDE_PLUGIN_ROOT}', root));
    const command = instructed.replaceAll('${CLAUDE_PLUGIN_ROOT}', root).replace('<SDD folder>/<slug>/spec.md', 'specs/note-pinning/spec.md');
    assert.ok(allowed(prefixes, command), `not pre-approved: ${command}`);
    // The unquoted form (as /workflow-retro writes its script) is approved too.
    assert.ok(allowed(prefixes, command.replace(/"/g, '')), `unquoted form not pre-approved under ${root}`);
    assert.ok(allowed(prefixes, 'date -u +%Y-%m-%dT%H:%M:%SZ'));
    // Nothing broader: other scripts and chained commands still need a prompt.
    assert.equal(allowed(prefixes, `node "${root}/scripts/other.mjs" x`), false);
    assert.equal(allowed(prefixes, `rm -rf specs`), false);
  }
});

test('the 1.1.0 rule did not match the quoted command (regression)', () => {
  const root = roots[0];
  const old = bashPrefixes('Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/check-spec.mjs:*), Bash(date -u:*)').map((r) => r.replaceAll('${CLAUDE_PLUGIN_ROOT}', root));
  const command = instructed.replaceAll('${CLAUDE_PLUGIN_ROOT}', root).replace('<SDD folder>/<slug>/spec.md', 'specs/x/spec.md');
  assert.equal(allowed(old, command), false);
});
