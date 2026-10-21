#!/usr/bin/env node
// Builds the static data of the catalog site from the repository sources:
//   <out>/index.json     marketplace, plugins and artifacts (skills, agents) with search text
//   <out>/releases.json  versions from each plugin's CHANGELOG.md, matched with git tags <plugin>--v<version>
//   <out>/stats.json     counts and the commit the index was built from
//   <out>/bodies/*.md    Markdown shown on detail pages (READMEs, SKILL.md and agent bodies)
// Node.js built-ins only. Usage: node scripts/build-index.mjs [--out site/public] [--root .]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const SEARCH_TEXT_LIMIT = 4000;

export function buildIndex({ root, now = new Date(), git = gitInfo(root) }) {
  const mp = readJson(join(root, '.claude-plugin', 'marketplace.json'));
  const repository = repoUrlOf(mp, root);
  const marketplace = {
    name: mp.name,
    description: mp.description ?? '',
    owner: mp.owner?.name ?? '',
    repository,
    githubSlug: githubSlug(repository),
  };

  const plugins = [];
  const artifacts = [];
  const bodies = new Map(); // file name -> markdown

  for (const entry of mp.plugins) {
    const dir = join(root, entry.source.replace(/^\.\//, ''));
    const sourceDir = entry.source.replace(/^\.\//, '');
    const manifest = readJson(join(dir, '.claude-plugin', 'plugin.json'));
    const readme = readText(join(dir, 'README.md'));
    const compatibility = readText(join(dir, 'COMPATIBILITY.md'));
    const changelog = readText(join(dir, 'CHANGELOG.md'));

    const pluginBody = `plugin--${entry.name}.md`;
    bodies.set(pluginBody, readme ?? '');
    if (changelog !== null) bodies.set(`plugin--${entry.name}--changelog.md`, changelog);
    if (compatibility !== null) bodies.set(`plugin--${entry.name}--compatibility.md`, compatibility);

    const own = { skills: [], agents: [] };
    for (const skill of listDirs(join(dir, 'skills'))) {
      const file = join(dir, 'skills', skill, 'SKILL.md');
      if (!existsSync(file)) continue;
      const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'));
      const id = `skill:${entry.name}:${skill}`;
      const bodyFile = `skill--${entry.name}--${skill}.md`;
      bodies.set(bodyFile, body);
      const thirdParty = existsSync(join(dir, 'skills', skill, 'LICENSE'));
      artifacts.push({
        id,
        type: 'skill',
        name: skill,
        namespacedName: `${entry.name}:${skill}`,
        plugin: entry.name,
        description: str(data?.description),
        manualOnly: data?.['disable-model-invocation'] === 'true',
        argumentHint: str(data?.['argument-hint']) || null,
        thirdParty,
        body: `bodies/${bodyFile}`,
        sourcePath: `${sourceDir}/skills/${skill}/SKILL.md`,
        searchText: searchText(body),
      });
      own.skills.push(id);
    }
    for (const file of listFiles(join(dir, 'agents')).filter((f) => f.endsWith('.md'))) {
      const agent = file.slice(0, -3);
      const { data, body } = parseFrontmatter(readFileSync(join(dir, 'agents', file), 'utf8'));
      const id = `agent:${entry.name}:${agent}`;
      const bodyFile = `agent--${entry.name}--${agent}.md`;
      bodies.set(bodyFile, body);
      artifacts.push({
        id,
        type: 'agent',
        name: agent,
        namespacedName: `${entry.name}:${agent}`,
        plugin: entry.name,
        description: str(data?.description),
        model: str(data?.model) || null,
        tools: splitList(data?.tools),
        disallowedTools: splitList(data?.disallowedTools),
        body: `bodies/${bodyFile}`,
        sourcePath: `${sourceDir}/agents/${file}`,
        searchText: searchText(body),
      });
      own.agents.push(id);
    }

    plugins.push({
      id: `plugin:${entry.name}`,
      type: 'plugin',
      name: entry.name,
      version: manifest.version,
      description: manifest.description ?? entry.description ?? '',
      keywords: manifest.keywords ?? [],
      category: entry.category ?? null,
      tags: entry.tags ?? [],
      author: manifest.author?.name ?? '',
      license: manifest.license ?? '',
      dependencies: (manifest.dependencies ?? []).map((d) =>
        typeof d === 'string' ? { name: d, version: null } : { name: d.name, version: d.version ?? null },
      ),
      dependents: [],
      skills: own.skills,
      agents: own.agents,
      evals: listDirs(join(dir, 'evals')).filter((c) => c !== 'results' && c !== 'mocks'),
      minClaudeCode: minVersion(compatibility),
      install: `/plugin install ${entry.name}@${mp.name}`,
      body: `bodies/${pluginBody}`,
      changelog: changelog !== null ? `bodies/plugin--${entry.name}--changelog.md` : null,
      compatibility: compatibility !== null ? `bodies/plugin--${entry.name}--compatibility.md` : null,
      sourcePath: `${sourceDir}/README.md`,
      searchText: searchText(readme ?? ''),
    });
  }

  for (const p of plugins) {
    p.dependents = plugins.filter((q) => q.dependencies.some((d) => d.name === p.name)).map((q) => q.name);
  }

  const releases = [];
  for (const p of plugins) {
    const changelog = bodies.get(`plugin--${p.name}--changelog.md`) ?? '';
    for (const r of parseChangelog(changelog)) {
      const tag = `${p.name}--v${r.version}`;
      const tagged = git.tags.get(tag);
      releases.push({
        plugin: p.name,
        version: r.version,
        tag,
        released: Boolean(tagged),
        date: tagged?.date ?? r.date,
        notes: r.notes,
      });
    }
  }
  releases.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.plugin.localeCompare(b.plugin));

  const stats = {
    plugins: plugins.length,
    skills: artifacts.filter((a) => a.type === 'skill').length,
    agents: artifacts.filter((a) => a.type === 'agent').length,
    evalCases: plugins.reduce((n, p) => n + p.evals.length, 0),
    thirdPartySkills: artifacts.filter((a) => a.thirdParty).length,
    releasedVersions: releases.filter((r) => r.released).length,
    commit: git.commit,
    generatedAt: now.toISOString(),
  };

  return {
    index: { generatedAt: now.toISOString(), marketplace, plugins, artifacts },
    releases: { releases },
    stats,
    bodies,
  };
}

export function writeIndex(result, out) {
  rmSync(join(out, 'bodies'), { recursive: true, force: true });
  mkdirSync(join(out, 'bodies'), { recursive: true });
  writeFileSync(join(out, 'index.json'), JSON.stringify(result.index, null, 2));
  writeFileSync(join(out, 'releases.json'), JSON.stringify(result.releases, null, 2));
  writeFileSync(join(out, 'stats.json'), JSON.stringify(result.stats, null, 2));
  for (const [name, md] of result.bodies) writeFileSync(join(out, 'bodies', name), md);
}

/** `## <version> — <date or note>` sections of a CHANGELOG (an `[Unreleased]` section is skipped). */
export function parseChangelog(text) {
  const out = [];
  const heads = [...text.replace(/\r\n/g, '\n').matchAll(/^## \[?(\d+\.\d+\.\d+[^\]\s]*)\]?(.*)$/gm)];
  heads.forEach((h, i) => {
    const start = h.index + h[0].length;
    const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const date = h[2].match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
    out.push({ version: h[1], date, notes: text.slice(start, end).trim() });
  });
  return out;
}

/** Plain text for client-side search: Markdown syntax and code fences removed, length capped. */
export function searchText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_|~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_TEXT_LIMIT);
}

/** `https://github.com/<owner>/<repo>` → `<owner>/<repo>`; null for other hosts. */
export function githubSlug(url) {
  const m = (url ?? '').match(/^https:\/\/github\.com\/([^/]+\/[^/.]+)(?:\.git)?\/?$/);
  return m ? m[1] : null;
}

function minVersion(compatibility) {
  const m = (compatibility ?? '').match(/Claude Code\s*\|\s*`>=\s*([\d.]+)`/);
  return m ? m[1] : null;
}

function repoUrlOf(mp, root) {
  for (const entry of mp.plugins) {
    const manifest = readJson(join(root, entry.source.replace(/^\.\//, ''), '.claude-plugin', 'plugin.json'));
    if (typeof manifest.repository === 'string') return manifest.repository;
  }
  return null;
}

function gitInfo(root) {
  const run = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const tags = new Map();
  let commit = null;
  try {
    commit = run(['rev-parse', 'HEAD']);
  } catch {
    // not a git checkout: no commit, no tags
  }
  try {
    const lines = run(['for-each-ref', '--format=%(refname:short) %(creatordate:short)', 'refs/tags']);
    for (const line of lines.split('\n').filter(Boolean)) {
      const [name, date] = line.split(' ');
      if (/--v\d+\.\d+\.\d+/.test(name)) tags.set(name, { date: date ?? null });
    }
  } catch {
    // no tags available (e.g. a shallow clone without --tags)
  }
  return { commit, tags };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}
function readText(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
}
function listDirs(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).sort() : [];
}
function listFiles(dir) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile()).sort() : [];
}
function str(v) {
  return typeof v === 'string' ? v : '';
}
function splitList(v) {
  return typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const here = join(fileURLToPath(import.meta.url), '..', '..');
  const root = resolve(arg('--root', here));
  const out = resolve(arg('--out', join(root, 'site', 'public')));
  const result = buildIndex({ root });
  writeIndex(result, out);
  const s = result.stats;
  console.log(
    `index: ${s.plugins} plugins, ${s.skills} skills, ${s.agents} agents, ${s.evalCases} eval cases, ` +
      `${result.releases.releases.length} changelog versions (${s.releasedVersions} tagged), ${result.bodies.size} bodies → ${out}`,
  );
}
