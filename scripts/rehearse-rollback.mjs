#!/usr/bin/env node
// Rollback rehearsal: latest channel → stable channel → back to latest, in a throwaway
// Claude Code config (CLAUDE_CONFIG_DIR) and a throwaway project, so the user's own
// plugins and settings are never touched. It asserts the version that was actually
// installed (`claude plugin list --json`, installed_plugins.json and the installed copy's
// plugin.json), not documentation. No model calls. Needs the `claude` CLI and git; network
// for git-backed sources.
//
// Usage:
//   node scripts/rehearse-rollback.mjs --latest <marketplace source> --stable <marketplace source> \
//     [--plugin sdd-engineering] [--expect-latest 1.1.0] [--expect-stable 1.0.0] [--stable-sha <40 hex>] \
//     [--work <dir>] [--keep]
// A marketplace source is anything `claude plugin marketplace add` accepts: owner/repo[#ref],
// a git URL, a marketplace.json URL or a local directory. Keep --work short on Windows
// (plugin caches nest deeply).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function parseArgs(argv) {
  const opts = { plugin: 'sdd-engineering', keep: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--keep') opts.keep = true;
    else if (a.startsWith('--')) opts[a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
  }
  for (const k of ['latest', 'stable']) if (!opts[k]) throw new Error(`--${k} <marketplace source> is required`);
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const work = opts.work ? resolve(opts.work) : mkdtempSync(join(tmpdir(), 'rollback-'));
const config = join(work, 'config');
const project = join(work, 'project');
mkdirSync(config, { recursive: true });
mkdirSync(project, { recursive: true });
const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: config,
  GIT_TERMINAL_PROMPT: '0',
  // Plugin caches nest deeply; avoid "Filename too long" on Windows without touching git config.
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: 'core.longpaths',
  GIT_CONFIG_VALUE_0: 'true',
};

const steps = [];
let failed = false;

function claude(args, { quiet = false } = {}) {
  if (!quiet) steps.push(`$ claude ${args.join(' ')}`);
  const out = execFileSync('claude', args, { cwd: project, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const last = out.trim().split('\n').pop();
  if (last && !quiet) steps.push(`  ${last}`);
  return out;
}

function list() {
  return JSON.parse(claude(['plugin', 'list', '--json'], { quiet: true }));
}

function installed(id) {
  const entry = list().find((p) => p.id === id);
  const file = join(config, 'plugins', 'installed_plugins.json');
  const record = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).plugins?.[id]?.find((x) => x.scope === 'project') : undefined;
  return entry ? { version: entry.version, enabled: entry.enabled, installPath: entry.installPath, sha: record?.gitCommitSha ?? 'UNKNOWN' } : null;
}

/** Version written in the installed copy's own plugin.json (the files that will load). */
function manifestVersion(installPath) {
  const file = join(installPath ?? '', '.claude-plugin', 'plugin.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).version : 'UNKNOWN';
}

function check(label, ok, detail) {
  steps.push(`${ok ? 'PASS' : 'FAIL'} ${label} — ${detail}`);
  if (!ok) failed = true;
}

function channelLeftovers(marketplace) {
  return list()
    .filter((p) => p.id.endsWith(`@${marketplace}`))
    .map((p) => p.id);
}

function marketplaceName(source) {
  const names = () => JSON.parse(claude(['plugin', 'marketplace', 'list', '--json'], { quiet: true }) || '[]').map((m) => m.name);
  const before = new Set(names());
  claude(['plugin', 'marketplace', 'add', source, '--scope', 'project']);
  return names().find((n) => !before.has(n));
}

try {
  execFileSync('git', ['init', '-q'], { cwd: project });

  // 1. Latest channel.
  const latest = marketplaceName(opts.latest);
  const latestId = `${opts.plugin}@${latest}`;
  claude(['plugin', 'install', latestId, '--scope', 'project']);
  const a = installed(latestId);
  check('latest installed', Boolean(a?.enabled), `${latestId} ${a?.version} sha ${a?.sha}`);
  if (opts.expectLatest) {
    check('latest version', a?.version === opts.expectLatest, `expected ${opts.expectLatest}, got ${a?.version}`);
    check('latest files', manifestVersion(a?.installPath) === opts.expectLatest, `installed plugin.json says ${manifestVersion(a?.installPath)}`);
  }

  // Plugin data written while on latest must survive the round trip.
  const dataDir = join(config, 'plugins', 'data', latestId);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, 'rehearsal-marker.txt'), 'written on the latest channel\n');

  // 2. Roll back: remove latest and its now-unused dependencies (keep plugin data), install from stable.
  claude(['plugin', 'uninstall', latestId, '--scope', 'project', '--keep-data', '--prune', '-y']);
  const stable = marketplaceName(opts.stable);
  const stableId = `${opts.plugin}@${stable}`;
  claude(['plugin', 'install', stableId, '--scope', 'project']);
  const b = installed(stableId);
  check('stable installed', Boolean(b?.enabled), `${stableId} ${b?.version} sha ${b?.sha}`);
  if (opts.expectStable) {
    check('stable version', b?.version === opts.expectStable, `expected ${opts.expectStable}, got ${b?.version}`);
    check('stable files', manifestVersion(b?.installPath) === opts.expectStable, `installed plugin.json says ${manifestVersion(b?.installPath)}`);
  }
  if (opts.stableSha) check('stable commit', b?.sha === opts.stableSha, `expected ${opts.stableSha}, got ${b?.sha}`);
  const left = channelLeftovers(latest);
  check('latest channel gone', left.length === 0, left.length ? `still installed: ${left.join(', ')}` : 'no plugin from the latest channel in the project');
  check('latest data kept', existsSync(join(dataDir, 'rehearsal-marker.txt')), dataDir.replace(work, '<work>'));
  // The coverage script is new in sdd-engineering 1.1.0: present on latest, absent on a 1.0.0 stable.
  if (b?.installPath) steps.push(`  stable install has scripts/check-spec.mjs: ${existsSync(join(b.installPath, 'scripts', 'check-spec.mjs'))}`);
  if (a?.installPath) steps.push(`  latest install has scripts/check-spec.mjs: ${existsSync(join(a.installPath, 'scripts', 'check-spec.mjs'))}`);

  // 3. Return to latest.
  claude(['plugin', 'uninstall', stableId, '--scope', 'project', '--keep-data', '--prune', '-y']);
  claude(['plugin', 'install', latestId, '--scope', 'project']);
  const c = installed(latestId);
  check('back on latest', c?.version === a?.version, `${latestId} ${c?.version}`);
  const stableLeft = channelLeftovers(stable);
  check('stable channel gone', stableLeft.length === 0, stableLeft.length ? `still installed: ${stableLeft.join(', ')}` : 'no plugin from the stable channel in the project');
  check('latest data still there', existsSync(join(dataDir, 'rehearsal-marker.txt')), 'marker readable after the round trip');
} catch (e) {
  failed = true;
  steps.push(`ERROR ${e.message.split('\n')[0]}`);
  if (e.stderr) steps.push(`  ${String(e.stderr).trim().split('\n').slice(-2).join(' | ')}`);
} finally {
  console.log(steps.join('\n'));
  console.log(failed ? '\nREHEARSAL FAILED' : '\nREHEARSAL PASSED');
  if (!opts.keep) rmSync(work, { recursive: true, force: true });
  else console.log(`work dir kept: ${work}`);
  process.exitCode = failed ? 1 : 0;
}
