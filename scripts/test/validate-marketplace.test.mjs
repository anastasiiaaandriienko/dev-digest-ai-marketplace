import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatter, validateMarketplace } from '../validate-marketplace.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Writes a minimal valid marketplace (two plugins, one dependency) and returns its root. */
function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'mp-lint-'));
  const files = {
    '.claude-plugin/marketplace.json': JSON.stringify({
      name: 'demo-market',
      owner: { name: 'team' },
      plugins: [
        { name: 'base', source: './plugins/base', description: 'b' },
        { name: 'app', source: './plugins/app', description: 'a' },
      ],
    }),
    'plugins/base/.claude-plugin/plugin.json': JSON.stringify(manifest('base')),
    'plugins/base/README.md': '# base',
    'plugins/base/CHANGELOG.md': '# changelog',
    'plugins/base/skills/layers/SKILL.md': '---\nname: layers\ndescription: d\n---\nbody',
    'plugins/app/.claude-plugin/plugin.json': JSON.stringify(
      manifest('app', [{ name: 'base', version: '^1.0.0' }]),
    ),
    'plugins/app/README.md': '# app',
    'plugins/app/CHANGELOG.md': '# changelog',
    'plugins/app/COMPATIBILITY.md': '# compat',
    'plugins/app/agents/worker.md':
      '---\nname: worker\ndescription: d\ntools: Read\ndisallowedTools: Write\n---\nLoad `base:layers` first.',
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    if (content === null) continue;
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function manifest(name, dependencies) {
  return {
    name,
    version: '1.0.0',
    description: 'd',
    author: { name: 'team' },
    repository: 'https://example.com/repo',
    license: 'MIT',
    keywords: ['k'],
    ...(dependencies ? { dependencies } : {}),
  };
}

function errorsOf(overrides) {
  const root = fixture(overrides);
  try {
    return validateMarketplace(root).errors;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const has = (errors, text) => errors.some((e) => e.includes(text));

test('this repository passes the lint with no errors', () => {
  const { errors } = validateMarketplace(repoRoot);
  assert.deepEqual(errors, []);
});

test('a minimal valid fixture passes', () => {
  assert.deepEqual(errorsOf({}), []);
});

test('plugin.json name must match the directory and entry', () => {
  const errors = errorsOf({ 'plugins/base/.claude-plugin/plugin.json': JSON.stringify(manifest('other')) });
  assert.ok(has(errors, 'must equal the directory'), errors.join('\n'));
});

test('version is SemVer and not repeated in the marketplace entry', () => {
  const errors = errorsOf({
    '.claude-plugin/marketplace.json': JSON.stringify({
      name: 'demo-market',
      owner: { name: 'team' },
      plugins: [
        { name: 'base', source: './plugins/base', version: '1.0.0' },
        { name: 'app', source: './plugins/app' },
      ],
    }),
    'plugins/base/.claude-plugin/plugin.json': JSON.stringify({ ...manifest('base'), version: 'one' }),
  });
  assert.ok(has(errors, 'do not repeat version'));
  assert.ok(has(errors, 'SemVer'));
});

test('unknown dependency, missing caret range and missing COMPATIBILITY.md are errors', () => {
  const errors = errorsOf({
    'plugins/app/.claude-plugin/plugin.json': JSON.stringify(manifest('app', [{ name: 'ghost', version: '1.0.0' }])),
    'plugins/app/COMPATIBILITY.md': null,
  });
  assert.ok(has(errors, 'not a plugin of this marketplace'));
  assert.ok(has(errors, 'caret version range'));
  // COMPATIBILITY.md was not written for this fixture.
  assert.ok(has(errors, 'COMPATIBILITY.md is required'));
});

test('dependency cycles are reported', () => {
  const errors = errorsOf({
    'plugins/base/.claude-plugin/plugin.json': JSON.stringify(manifest('base', [{ name: 'app', version: '^1.0.0' }])),
    'plugins/base/COMPATIBILITY.md': '# compat',
  });
  assert.ok(has(errors, 'dependency cycle'), errors.join('\n'));
});

test('namespaced references must exist and be declared dependencies', () => {
  const missing = errorsOf({
    'plugins/app/agents/worker.md':
      '---\nname: worker\ndescription: d\ntools: Read\ndisallowedTools: Write\n---\nLoad `base:nope`.',
  });
  assert.ok(has(missing, 'does not match an agent or skill of base'));
  const undeclared = errorsOf({
    'plugins/base/skills/layers/SKILL.md': '---\nname: layers\ndescription: d\n---\nAsk `app:worker`.',
  });
  assert.ok(has(undeclared, 'needs "app" in base\'s dependencies'));
});

test('agent frontmatter needs name, tools and disallowedTools', () => {
  const errors = errorsOf({ 'plugins/app/agents/worker.md': '---\nname: wrong\ndescription: d\n---\nbody' });
  assert.ok(has(errors, 'frontmatter name must be "worker"'));
  assert.ok(has(errors, 'frontmatter tools is required'));
  assert.ok(has(errors, 'frontmatter disallowedTools is required'));
});

test('product-specific paths, absolute paths, secrets and non-English text are blocked', () => {
  const errors = errorsOf({
    'plugins/base/skills/layers/SKILL.md':
      '---\nname: layers\ndescription: d\n---\n' +
      'See server/src/modules for DevDigest.\n' +
      'Open C:\\Users\\me\\repo.\n' +
      'token ghp_' + 'a'.repeat(36) + '\n' +
      // A Cyrillic word built from code points, so this file itself stays English-only.
      String.fromCodePoint(0x41f, 0x440, 0x438, 0x432, 0x456, 0x442) + '\n',
  });
  assert.ok(has(errors, 'product-specific reference'));
  assert.ok(has(errors, 'absolute machine path'));
  assert.ok(has(errors, 'looks like a secret'));
  assert.ok(has(errors, 'non-English'));
});

test('third-party skills need a LICENSE and a notice entry', () => {
  const noLicense = errorsOf({ 'plugins/base/THIRD_PARTY_NOTICES.md': '| `skills/layers` | upstream |' });
  assert.ok(has(noLicense, 'has no LICENSE file'));
  const noNotice = errorsOf({ 'plugins/base/skills/layers/LICENSE': 'MIT' });
  assert.ok(has(noNotice, 'missing from THIRD_PARTY_NOTICES.md'));
});

test('eval cases need a prompt, graders with a known type and an existing scaffold', () => {
  const errors = errorsOf({
    'plugins/app/evals/broken/case.yaml': 'schema_version: "1.1"\nname: broken\ncontext:\n  scaffold_script: missing.sh\n',
    'plugins/app/evals/broken/graders/g.md': '---\ntype: magic\n---\n',
  });
  assert.ok(has(errors, 'needs prompt.md'));
  assert.ok(has(errors, 'grader type must be one of'));
  assert.ok(has(errors, 'scaffold_script missing.sh does not exist'));
});

test('eval cases may load plugins only from inside their own plugin', () => {
  const caseFiles = (plugins) => ({
    'plugins/app/evals/c/case.yaml': `schema_version: "1.1"\nname: c\nplugins: ${plugins}\n`,
    'plugins/app/evals/c/prompt.md': '---\nmax_turns: 1\n---\nhi',
    'plugins/app/evals/c/graders/g.md': '---\ntype: llm\n---\nok',
  });
  assert.ok(has(errorsOf(caseFiles('["../..", "../../../base"]')), 'leaves plugins/app'));
  assert.deepEqual(errorsOf(caseFiles('["../.."]')), []);
});

test('frontmatter parser reads top-level keys and ignores files without it', () => {
  assert.deepEqual(frontmatter('---\nname: x\ndescription: "y"\n---\nbody'), { name: 'x', description: 'y' });
  assert.equal(frontmatter('no frontmatter'), null);
});
