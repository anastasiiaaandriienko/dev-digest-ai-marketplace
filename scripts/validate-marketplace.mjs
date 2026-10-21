#!/usr/bin/env node
// Structure and content lint for this marketplace. Complements `claude plugin validate`
// (schema) with the repository's own rules from CONTRIBUTING.md and docs/SECURITY.md.
// Node.js built-ins only. Usage: node scripts/validate-marketplace.mjs [repo-root]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const CARET = /^\^\d+\.\d+\.\d+$/;
const TEXT_EXT = new Set(['.md', '.json', '.yaml', '.yml', '.mjs', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.sh', '.txt', '']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'results', 'dist']);
/** Generated or third-party machine files that are not authored content. */
const SKIP_FILES = new Set(['package-lock.json']);
/** Build output of scripts/build-index.mjs (git-ignored; regenerated from the sources). */
const GENERATED = [/^site\/public\/(index|releases|stats)\.json$/, /^site\/public\/bodies\//];

/** Product-specific names that must not appear inside plugin components. */
const PRODUCT_SPECIFIC = [/devdigest/i, /reviewer-core/, /@devdigest\//, /\bserver\/src\//, /\bclient\/src\//];
/** Absolute paths of a developer machine. */
const ABSOLUTE_PATH = [/\b[A-Za-z]:\\[A-Za-z]/, /(^|[\s"'`(])\/Users\/[A-Za-z]/, /(^|[\s"'`(])\/home\/[a-z]/];
/** Secret patterns (a safety net, not a scanner). */
const SECRETS = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
/** Non-English script (Cyrillic). The repository is English only. */
const CYRILLIC = new RegExp(`[${String.fromCodePoint(0x0400)}-${String.fromCodePoint(0x04ff)}]`);

export function validateMarketplace(root) {
  const errors = [];
  const warnings = [];
  const rel = (p) => relative(root, p).split(sep).join('/');
  const err = (p, msg) => errors.push(`${p}: ${msg}`);
  const warn = (p, msg) => warnings.push(`${p}: ${msg}`);

  // ---- marketplace.json ----
  const mpPath = join(root, '.claude-plugin', 'marketplace.json');
  const mp = readJson(mpPath, err, rel);
  if (!mp) return { errors, warnings };
  if (!KEBAB.test(mp.name ?? '')) err(rel(mpPath), 'name must be kebab-case');
  if (!mp.owner?.name) err(rel(mpPath), 'owner.name is required');
  if (!Array.isArray(mp.plugins) || mp.plugins.length === 0) {
    err(rel(mpPath), 'plugins must be a non-empty array');
    return { errors, warnings };
  }

  const plugins = new Map(); // name -> { dir, manifest }
  for (const entry of mp.plugins) {
    const where = `${rel(mpPath)} plugins[${entry?.name ?? '?'}]`;
    if (!entry?.name || !KEBAB.test(entry.name)) {
      err(where, 'name must be kebab-case');
      continue;
    }
    if (plugins.has(entry.name)) err(where, 'duplicate plugin name');
    const expected = `./plugins/${entry.name}`;
    if (entry.source !== expected) err(where, `source must be "${expected}"`);
    if ('version' in entry) err(where, 'do not repeat version in the marketplace entry; plugin.json is the source of truth');
    if (!entry.description) warn(where, 'description is recommended for the catalog');
    const dir = join(root, 'plugins', entry.name);
    if (!existsSync(dir)) {
      err(where, `source directory ${expected} does not exist`);
      continue;
    }
    plugins.set(entry.name, { dir, manifest: null });
  }

  // Every plugin directory is listed.
  const pluginsDir = join(root, 'plugins');
  if (existsSync(pluginsDir)) {
    for (const d of readdirSync(pluginsDir)) {
      if (statSync(join(pluginsDir, d)).isDirectory() && !plugins.has(d)) {
        err(`plugins/${d}`, 'directory is not listed in marketplace.json');
      }
    }
  }

  // ---- plugin.json and required files ----
  for (const [name, p] of plugins) {
    const manifestPath = join(p.dir, '.claude-plugin', 'plugin.json');
    const m = readJson(manifestPath, err, rel);
    if (!m) continue;
    p.manifest = m;
    const where = rel(manifestPath);
    if (m.name !== name) err(where, `name "${m.name}" must equal the directory and marketplace entry "${name}"`);
    if (!SEMVER.test(m.version ?? '')) err(where, 'version must be SemVer (X.Y.Z)');
    for (const f of ['description', 'author', 'repository', 'license', 'keywords']) {
      if (!m[f]) err(where, `${f} is required`);
    }
    for (const f of ['README.md', 'CHANGELOG.md']) {
      if (!existsSync(join(p.dir, f))) err(`plugins/${name}`, `${f} is required`);
    }
    const deps = m.dependencies ?? [];
    if (!Array.isArray(deps)) err(where, 'dependencies must be an array');
    if (deps.length > 0 && !existsSync(join(p.dir, 'COMPATIBILITY.md'))) {
      err(`plugins/${name}`, 'COMPATIBILITY.md is required for a plugin with dependencies');
    }
    for (const d of Array.isArray(deps) ? deps : []) {
      const depName = typeof d === 'string' ? d : d?.name;
      if (depName === name) err(where, 'a plugin cannot depend on itself');
      else if (!plugins.has(depName)) err(where, `dependency "${depName}" is not a plugin of this marketplace`);
      if (typeof d !== 'object' || !CARET.test(d?.version ?? '')) {
        err(where, `dependency "${depName}" needs a caret version range like "^1.0.0"`);
      }
    }
    for (const stray of readdirSync(join(p.dir, '.claude-plugin'))) {
      if (stray !== 'plugin.json') err(`plugins/${name}/.claude-plugin/${stray}`, 'only plugin.json belongs in .claude-plugin/');
    }
  }

  // ---- dependency cycles ----
  const depsOf = (n) => (plugins.get(n)?.manifest?.dependencies ?? []).map((d) => (typeof d === 'string' ? d : d?.name));
  for (const start of plugins.keys()) {
    const stack = [[start, [start]]];
    while (stack.length) {
      const [node, path] = stack.pop();
      for (const next of depsOf(node)) {
        if (next === start) {
          err(`plugins/${start}`, `dependency cycle: ${[...path, next].join(' -> ')}`);
        } else if (!path.includes(next) && plugins.has(next)) {
          stack.push([next, [...path, next]]);
        }
      }
    }
  }

  // ---- components ----
  const componentsOf = new Map(); // plugin -> Set of agent/skill names
  for (const [name, p] of plugins) {
    const set = new Set();
    const agentsDir = join(p.dir, 'agents');
    if (existsSync(agentsDir)) {
      for (const f of readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
        const path = join(agentsDir, f);
        const fm = frontmatter(readFileSync(path, 'utf8'));
        const agent = f.slice(0, -3);
        set.add(agent);
        if (!fm) {
          err(rel(path), 'missing YAML frontmatter');
          continue;
        }
        if (fm.name !== agent) err(rel(path), `frontmatter name must be "${agent}"`);
        for (const k of ['description', 'tools', 'disallowedTools']) if (!fm[k]) err(rel(path), `frontmatter ${k} is required`);
        for (const k of ['permissionMode', 'hooks', 'mcpServers']) {
          if (fm[k]) warn(rel(path), `${k} is ignored for plugin agents`);
        }
      }
    }
    const skillsDir = join(p.dir, 'skills');
    if (existsSync(skillsDir)) {
      for (const s of readdirSync(skillsDir)) {
        const path = join(skillsDir, s, 'SKILL.md');
        if (!existsSync(path)) {
          err(rel(join(skillsDir, s)), 'skill directory without SKILL.md');
          continue;
        }
        set.add(s);
        const fm = frontmatter(readFileSync(path, 'utf8'));
        if (!fm) err(rel(path), 'missing YAML frontmatter');
        else {
          if (fm.name !== s) err(rel(path), `frontmatter name must be "${s}"`);
          if (!fm.description) err(rel(path), 'frontmatter description is required');
        }
      }
    }
    componentsOf.set(name, set);
  }

  // ---- third-party skills: license + notice ----
  for (const [name, p] of plugins) {
    const noticesPath = join(p.dir, 'THIRD_PARTY_NOTICES.md');
    const notices = existsSync(noticesPath) ? readFileSync(noticesPath, 'utf8') : '';
    const listed = new Set([...notices.matchAll(/`skills\/([a-z0-9-]+)`/g)].map((x) => x[1]));
    const skillsDir = join(p.dir, 'skills');
    if (!existsSync(skillsDir)) continue;
    for (const s of readdirSync(skillsDir)) {
      const hasLicense = existsSync(join(skillsDir, s, 'LICENSE'));
      if (listed.has(s) && !hasLicense) err(`plugins/${name}/skills/${s}`, 'listed in THIRD_PARTY_NOTICES.md but has no LICENSE file');
      if (hasLicense && !listed.has(s)) err(`plugins/${name}/skills/${s}`, 'has a LICENSE file but is missing from THIRD_PARTY_NOTICES.md');
    }
  }

  // ---- namespaced references (in components; README/CHANGELOG may mention consumers) ----
  const names = [...plugins.keys()].join('|');
  const refRe = new RegExp(`\\b(${names}):([a-z0-9]+(?:-[a-z0-9]+)*)\\b`, 'g');
  for (const [name, p] of plugins) {
    const allowed = new Set([name, ...depsOf(name)]);
    for (const file of walk(p.dir)) {
      if (!file.endsWith('.md') || !/[\\/](agents|skills|references|evals)[\\/]/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const [, plugin, component] of text.matchAll(refRe)) {
        if (!componentsOf.get(plugin)?.has(component)) {
          err(rel(file), `reference ${plugin}:${component} does not match an agent or skill of ${plugin}`);
        } else if (!allowed.has(plugin)) {
          err(rel(file), `reference ${plugin}:${component} needs "${plugin}" in ${name}'s dependencies`);
        }
      }
    }
  }

  // ---- forbidden content ----
  for (const file of walk(root)) {
    const r = rel(file);
    const base = r.slice(r.lastIndexOf('/') + 1);
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
    if (!TEXT_EXT.has(ext) || base === 'LICENSE' || SKIP_FILES.has(base) || GENERATED.some((g) => g.test(r))) continue;
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    const isComponent =
      r.startsWith('plugins/') &&
      /\/(agents|skills|references|evals)\//.test(r) &&
      !isThirdParty(r, plugins);
    lines.forEach((line, i) => {
      const at = `${r}:${i + 1}`;
      if (CYRILLIC.test(line)) err(at, 'non-English (Cyrillic) text; this repository is English only');
      for (const re of SECRETS) if (re.test(line)) err(at, 'looks like a secret');
      for (const re of ABSOLUTE_PATH) if (re.test(line)) err(at, 'absolute machine path');
      if (isComponent) for (const re of PRODUCT_SPECIFIC) if (re.test(line)) err(at, `product-specific reference (${re.source}) in a plugin component`);
    });
  }

  // ---- evals ----
  for (const [name, p] of plugins) {
    const evalsDir = join(p.dir, 'evals');
    if (!existsSync(evalsDir)) continue;
    for (const c of readdirSync(evalsDir)) {
      const caseDir = join(evalsDir, c);
      if (!statSync(caseDir).isDirectory() || c === 'results' || c === 'mocks') continue;
      const where = rel(caseDir);
      const hasPrompt = existsSync(join(caseDir, 'prompt.md'));
      const caseYaml = existsSync(join(caseDir, 'case.yaml')) ? readFileSync(join(caseDir, 'case.yaml'), 'utf8') : null;
      if (!hasPrompt && !/^\s*prompt\s*:/m.test(caseYaml ?? '')) err(where, 'eval case needs prompt.md or execution.prompt in case.yaml');
      const gradersDir = join(caseDir, 'graders');
      const graders = existsSync(gradersDir) ? readdirSync(gradersDir).filter((g) => g.endsWith('.md')) : [];
      if (graders.length === 0 && !/^\s*graders\s*:/m.test(caseYaml ?? '')) err(where, 'eval case needs at least one grader');
      for (const g of graders) {
        const fm = frontmatter(readFileSync(join(gradersDir, g), 'utf8'));
        const types = ['regex', 'tool_used', 'tool_order', 'file_exists', 'llm', 'baseline'];
        if (!fm?.type || !types.includes(fm.type)) err(rel(join(gradersDir, g)), `grader type must be one of ${types.join(', ')}`);
      }
      // `claude plugin eval` loads case `plugins` only from inside the plugin under test
      // (its containment root); cross-plugin cases live in the repository-level evals/.
      const pluginsLine = caseYaml?.match(/^plugins\s*:\s*(\[.*\])\s*$/m)?.[1];
      if (pluginsLine) {
        let entries = [];
        try {
          entries = JSON.parse(pluginsLine);
        } catch {
          err(`${where}/case.yaml`, 'plugins must be a JSON-style list of quoted paths');
        }
        for (const entry of entries) {
          const target = resolve(caseDir, entry);
          if (target !== p.dir && !target.startsWith(p.dir + sep)) {
            err(`${where}/case.yaml`, `plugins entry "${entry}" leaves plugins/${name}; put cross-plugin cases in the repository-level evals/`);
          }
        }
      }
      const scaffold = caseYaml?.match(/^\s*scaffold_script\s*:\s*(\S+)/m)?.[1];
      if (scaffold && !existsSync(join(caseDir, scaffold))) err(where, `scaffold_script ${scaffold} does not exist`);
      if (caseYaml && !/^schema_version\s*:\s*"?1\.1"?/m.test(caseYaml)) err(`${where}/case.yaml`, 'schema_version "1.1" is required');
    }
  }

  return { errors, warnings };
}

function isThirdParty(relPath, plugins) {
  const m = relPath.match(/^plugins\/([^/]+)\/skills\/([^/]+)\//);
  if (!m || !plugins.has(m[1])) return false;
  return existsSync(join(plugins.get(m[1]).dir, 'skills', m[2], 'LICENSE'));
}

function readJson(path, err, rel) {
  if (!existsSync(path)) {
    err(rel(path), 'file is missing');
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    err(rel(path), `invalid JSON: ${e.message}`);
    return null;
  }
}

/** Top-level `key: value` pairs of a leading YAML frontmatter block (enough for our checks). */
export function frontmatter(text) {
  return parseFrontmatter(text).data;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? join(fileURLToPath(import.meta.url), '..', '..'));
  const { errors, warnings } = validateMarketplace(root);
  for (const w of warnings) console.log(`warning  ${w}`);
  for (const e of errors) console.log(`error    ${e}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length > 0 ? 1 : 0);
}
