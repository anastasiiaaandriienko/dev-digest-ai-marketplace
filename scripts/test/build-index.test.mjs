import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, githubSlug, parseChangelog, searchText, writeIndex } from '../build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const noGit = { commit: 'abc123', tags: new Map() };
const now = new Date('2026-10-21T00:00:00Z');
const manifest = (name) => JSON.parse(readFileSync(join(root, 'plugins', name, '.claude-plugin', 'plugin.json'), 'utf8'));

test('index lists every marketplace plugin with the version and dependencies from plugin.json', () => {
  const { index } = buildIndex({ root, now, git: noGit });
  const marketplace = JSON.parse(readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
  assert.deepEqual(
    index.plugins.map((p) => p.name),
    marketplace.plugins.map((p) => p.name),
  );
  for (const p of index.plugins) {
    const m = manifest(p.name);
    assert.equal(p.version, m.version, p.name);
    assert.deepEqual(
      p.dependencies.map((d) => d.name),
      (m.dependencies ?? []).map((d) => d.name),
      p.name,
    );
    assert.equal(p.install, `/plugin install ${p.name}@${marketplace.name}`);
  }
});

test('dependents are the reverse of dependencies', () => {
  const { index } = buildIndex({ root, now, git: noGit });
  const byName = new Map(index.plugins.map((p) => [p.name, p]));
  assert.deepEqual(byName.get('engineering-paved-path').dependents.sort(), ['architecture-review', 'sdd-engineering']);
  assert.deepEqual(byName.get('sdd-engineering').dependents, []);
});

test('skills and agents become namespaced artifacts with their frontmatter and a body without it', () => {
  const { index, bodies } = buildIndex({ root, now, git: noGit });
  const researcher = index.artifacts.find((a) => a.id === 'agent:research-tools:researcher');
  assert.equal(researcher.namespacedName, 'research-tools:researcher');
  assert.equal(researcher.model, 'sonnet');
  assert.ok(researcher.tools.includes('WebSearch'));
  assert.ok(researcher.description.startsWith('Read-only researcher'));
  const runPlan = index.artifacts.find((a) => a.id === 'skill:sdd-engineering:run-plan');
  assert.equal(runPlan.manualOnly, true);
  const body = bodies.get(runPlan.body.replace('bodies/', ''));
  assert.ok(!body.startsWith('---'), 'frontmatter is stripped');
  assert.ok(body.includes('# run-plan'));
  assert.equal(index.artifacts.find((a) => a.id === 'skill:engineering-paved-path:zod').thirdParty, true);
  assert.equal(index.artifacts.find((a) => a.id === 'skill:engineering-paved-path:onion-architecture').thirdParty, false);
});

test('releases come from CHANGELOG versions and are marked released only when the tag exists', () => {
  const git = { commit: 'abc', tags: new Map([['research-tools--v1.0.0', { date: '2026-10-22' }]]) };
  const { releases, stats } = buildIndex({ root, now, git });
  const rt = releases.releases.find((r) => r.plugin === 'research-tools' && r.version === '1.0.0');
  assert.deepEqual([rt.released, rt.date, rt.tag], [true, '2026-10-22', 'research-tools--v1.0.0']);
  const sdd = releases.releases.find((r) => r.plugin === 'sdd-engineering');
  assert.equal(sdd.released, false);
  assert.equal(stats.releasedVersions, 1);
  // newest first
  assert.equal(releases.releases[0].plugin, 'research-tools');
});

test('stats count plugins, skills, agents and eval cases', () => {
  const { index, stats } = buildIndex({ root, now, git: noGit });
  assert.equal(stats.plugins, index.plugins.length);
  assert.equal(stats.skills + stats.agents, index.artifacts.length);
  assert.equal(stats.commit, 'abc123');
  assert.ok(stats.evalCases >= 1);
});

test('writeIndex writes the three JSON files and one Markdown body per entry', () => {
  const out = mkdtempSync(join(tmpdir(), 'catalog-index-'));
  try {
    const result = buildIndex({ root, now, git: noGit });
    writeIndex(result, out);
    for (const f of ['index.json', 'releases.json', 'stats.json']) assert.ok(existsSync(join(out, f)), f);
    assert.equal(readdirSync(join(out, 'bodies')).length, result.bodies.size);
    for (const item of [...result.index.plugins, ...result.index.artifacts]) {
      assert.ok(existsSync(join(out, item.body)), item.body);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('parseChangelog reads version sections and skips [Unreleased]', () => {
  const md = '# Changelog\n\n## [Unreleased]\n\n## 1.1.0 — 2026-11-01\n### Added\n- x\n\n## 1.0.0 — not released yet\n- y\n';
  assert.deepEqual(parseChangelog(md), [
    { version: '1.1.0', date: '2026-11-01', notes: '### Added\n- x' },
    { version: '1.0.0', date: null, notes: '- y' },
  ]);
});

test('searchText strips Markdown syntax and code fences', () => {
  assert.equal(searchText('# Title\n\nUse `zod` and [docs](https://x.y).\n\n```sh\nnpm i\n```'), 'Title Use zod and docs.');
});

test('githubSlug extracts owner/repo from GitHub URLs only', () => {
  assert.equal(githubSlug('https://github.com/acme/market'), 'acme/market');
  assert.equal(githubSlug('https://github.com/acme/market.git'), 'acme/market');
  assert.equal(githubSlug('https://gitlab.com/acme/market'), null);
});
