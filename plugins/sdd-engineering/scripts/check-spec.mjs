#!/usr/bin/env node
// Requirement coverage check for an SDD spec (sdd-engineering >= 1.1.0).
// Every mandatory requirement (`- FR-n …` / `- NFR-n …` lines) must name at least one
// acceptance criterion that exists in the spec, and no [NEEDS CLARIFICATION: …] marker
// may stay open. Node.js built-ins only; reads one file, writes nothing.
// Usage: node check-spec.mjs <path/to/spec.md> [--json]
// Exit codes: 0 = complete, 1 = gaps found, 2 = usage or read error.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REQUIREMENT = /^\s*[-*]\s+(?:\*\*)?((?:NFR|FR)-\d+)(?:\*\*)?(?=[\s:.)\]—-]|$)(.*)$/;
const AC_REF = /AC-[A-Z]{2,6}-\d{2,}/g;
const AC_ROW = /^\|\s*(~~)?\s*(AC-[A-Z]{2,6}-\d{2,})\s*(~~)?\s*\|(.*)$/;
const OPEN_MARKER = /\[NEEDS CLARIFICATION:/;
const KEY = /\*\*Key:\*\*\s*([A-Z]{2,6})\b/;
const STATUS = /\*\*Status:\*\*\s*([^·\n]+?)\s*(?:·|$)/m;

/**
 * Checks requirement → acceptance-criterion coverage of a spec.
 * @param {string} text spec.md content
 * @returns {{ key: string|null, status: string|null, requirements: Array<{id: string, line: number, acs: string[]}>,
 *   acs: string[], removed: string[], errors: string[], warnings: string[], complete: boolean }}
 */
export function checkSpec(text) {
  const lines = text.split(/\r?\n/);
  const requirements = [];
  const acs = new Set();
  const removed = new Set();
  const openMarkers = [];
  let inFence = false;

  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const row = line.match(AC_ROW);
    if (row) {
      const struck = Boolean(row[1] || row[3]) || /\(removed\)/i.test(row[4]);
      (struck ? removed : acs).add(row[2]);
    }
    const req = line.match(REQUIREMENT);
    if (req) requirements.push({ id: req[1], line: i + 1, acs: [...new Set(req[2].match(AC_REF) ?? [])] });
    if (OPEN_MARKER.test(line)) openMarkers.push(i + 1);
  });

  const key = text.match(KEY)?.[1] ?? null;
  const status = text.match(STATUS)?.[1]?.trim() ?? null;
  const errors = [];
  const warnings = [];

  if (requirements.length === 0) {
    errors.push('no requirements found: list each mandatory requirement as "- FR-<n> <text> → AC-<KEY>-<NN>"');
  }
  if (acs.size === 0) errors.push('no acceptance criteria found in an "| AC-<KEY>-<NN> | … |" table');

  const seen = new Map();
  for (const r of requirements) {
    if (seen.has(r.id)) errors.push(`${r.id} (line ${r.line}) is defined twice (first at line ${seen.get(r.id)})`);
    else seen.set(r.id, r.line);
    if (r.acs.length === 0) {
      errors.push(`${r.id} (line ${r.line}) has no acceptance criterion`);
      continue;
    }
    for (const ac of r.acs) {
      if (removed.has(ac)) errors.push(`${r.id} (line ${r.line}) points to removed ${ac}`);
      else if (!acs.has(ac)) errors.push(`${r.id} (line ${r.line}) points to ${ac}, which is not in the acceptance-criteria table`);
    }
  }
  for (const n of openMarkers) errors.push(`open [NEEDS CLARIFICATION] at line ${n}`);

  const referenced = new Set(requirements.flatMap((r) => r.acs));
  for (const ac of acs) {
    if (!referenced.has(ac)) warnings.push(`${ac} is not linked from any requirement`);
    if (key && !ac.startsWith(`AC-${key}-`)) warnings.push(`${ac} does not use the spec key ${key}`);
  }

  return {
    key,
    status,
    requirements,
    acs: [...acs],
    removed: [...removed],
    errors,
    warnings,
    complete: errors.length === 0,
  };
}

function main(argv) {
  const json = argv.includes('--json');
  const path = argv.find((a) => !a.startsWith('--'));
  if (!path) {
    process.stderr.write('usage: node check-spec.mjs <spec.md> [--json]\n');
    return 2;
  }
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    process.stderr.write(`cannot read ${path}: ${e.message}\n`);
    return 2;
  }
  const result = checkSpec(text);
  if (json) {
    process.stdout.write(`${JSON.stringify({ spec: path, ...result }, null, 2)}\n`);
  } else {
    const covered = result.requirements.filter((r) => r.acs.length > 0).length;
    const out = [
      `Spec: ${path} · Key ${result.key ?? 'UNKNOWN'} · Status ${result.status ?? 'UNKNOWN'}`,
      `Requirements with an AC: ${covered}/${result.requirements.length} · ACs: ${result.acs.length}`,
      ...result.errors.map((e) => `ERROR ${e}`),
      ...result.warnings.map((w) => `WARN  ${w}`),
      result.complete ? 'RESULT complete' : 'RESULT incomplete',
    ];
    process.stdout.write(`${out.join('\n')}\n`);
  }
  return result.complete ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}
