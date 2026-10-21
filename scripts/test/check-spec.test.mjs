import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSpec } from '../../plugins/sdd-engineering/scripts/check-spec.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plugins', 'sdd-engineering', 'scripts', 'check-spec.mjs');

/** A spec in the 1.0.0 template shape; `requirements` and `rows` replace sections 7 and 12. */
function spec({ requirements, rows, extra = '' } = {}) {
  return [
    '# Spec: Todo due dates',
    '- **Key:** DUE · **Status:** Draft · **Date:** 2026-10-22 · **Areas:** src',
    '## 7. Functional requirements (FR-1…, each → AC-IDs)',
    requirements ??
      [
        '- **FR-1** `addTodo` accepts an optional due date. → AC-DUE-01, AC-DUE-02',
        '- FR-2 overdue listing → AC-DUE-03',
      ].join('\n'),
    '## 10. Performance (numbers or [NEEDS CLARIFICATION])',
    'none',
    '## 12. Acceptance criteria (EARS)',
    '| AC-ID | EARS statement | Verification |',
    '|---|---|---|',
    rows ??
      [
        '| AC-DUE-01 | When … the service shall store it. | unit |',
        '| AC-DUE-02 | If … then the service shall throw. | unit |',
        '| AC-DUE-03 | When … the service shall list only overdue todos. | unit |',
      ].join('\n'),
    '## 15. Open questions ([NEEDS CLARIFICATION] index)',
    'none',
    extra,
  ].join('\n');
}

test('a spec whose every requirement has an AC is complete', () => {
  const r = checkSpec(spec());
  assert.equal(r.complete, true, r.errors.join('; '));
  assert.equal(r.key, 'DUE');
  assert.equal(r.status, 'Draft');
  assert.deepEqual(
    r.requirements.map((x) => [x.id, x.acs]),
    [
      ['FR-1', ['AC-DUE-01', 'AC-DUE-02']],
      ['FR-2', ['AC-DUE-03']],
    ],
  );
  assert.deepEqual(r.warnings, []);
});

test('section headings that mention the marker are not open questions', () => {
  assert.equal(checkSpec(spec()).errors.length, 0);
});

test('a requirement without an AC makes the spec incomplete', () => {
  const r = checkSpec(spec({ requirements: '- FR-1 store a due date → AC-DUE-01\n- FR-2 reject a past due date' }));
  assert.equal(r.complete, false);
  assert.match(r.errors.join('\n'), /FR-2 \(line \d+\) has no acceptance criterion/);
});

test('a non-functional requirement is mandatory too', () => {
  const r = checkSpec(spec({ requirements: '- FR-1 x → AC-DUE-01\n- NFR-1 listing takes under 10 ms for 10k todos' }));
  assert.match(r.errors.join('\n'), /NFR-1 .* has no acceptance criterion/);
});

test('an AC reference must exist in the AC table', () => {
  const r = checkSpec(spec({ requirements: '- FR-1 x → AC-DUE-01, AC-DUE-09' }));
  assert.match(r.errors.join('\n'), /points to AC-DUE-09, which is not in the acceptance-criteria table/);
});

test('a removed AC does not cover a requirement', () => {
  const rows = '| ~~AC-DUE-01~~ | (removed) | unit |\n| AC-DUE-02 | y | unit |';
  const r = checkSpec(spec({ requirements: '- FR-1 x → AC-DUE-01\n- FR-2 y → AC-DUE-02', rows }));
  assert.match(r.errors.join('\n'), /FR-1 .* points to removed AC-DUE-01/);
  assert.deepEqual(r.removed, ['AC-DUE-01']);
});

test('an open clarification marker blocks completion', () => {
  const r = checkSpec(spec({ extra: 'Time zone: [NEEDS CLARIFICATION: UTC or local?]' }));
  assert.equal(r.complete, false);
  assert.match(r.errors.join('\n'), /open \[NEEDS CLARIFICATION\] at line \d+/);
});

test('a spec with no requirement list is incomplete', () => {
  const r = checkSpec(spec({ requirements: 'Todos get due dates.' }));
  assert.match(r.errors.join('\n'), /no requirements found/);
});

test('duplicate requirement ids are reported', () => {
  const r = checkSpec(spec({ requirements: '- FR-1 a → AC-DUE-01\n- FR-1 b → AC-DUE-02' }));
  assert.match(r.errors.join('\n'), /FR-1 \(line \d+\) is defined twice/);
});

test('an AC no requirement links to is a warning, not an error', () => {
  const r = checkSpec(spec({ requirements: '- FR-1 x → AC-DUE-01, AC-DUE-02' }));
  assert.equal(r.complete, true);
  assert.deepEqual(r.warnings, ['AC-DUE-03 is not linked from any requirement']);
});

test('lines inside code fences are ignored', () => {
  const r = checkSpec(spec({ extra: '```\n- FR-9 example only\n[NEEDS CLARIFICATION: example]\n```' }));
  assert.equal(r.complete, true, r.errors.join('; '));
});

test('CLI exit codes: 0 complete, 1 gaps, 2 usage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'check-spec-'));
  const good = join(dir, 'good.md');
  const bad = join(dir, 'bad.md');
  writeFileSync(good, spec());
  writeFileSync(bad, spec({ requirements: '- FR-1 x' }));
  const run = (args) => {
    try {
      return { code: 0, out: execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: 'pipe' }) };
    } catch (e) {
      return { code: e.status, out: `${e.stdout}${e.stderr}` };
    }
  };
  assert.equal(run([good]).code, 0);
  const failed = run([bad]);
  assert.equal(failed.code, 1);
  assert.match(failed.out, /RESULT incomplete/);
  assert.equal(JSON.parse(run([good, '--json']).out).complete, true);
  assert.equal(run([]).code, 2);
  assert.equal(run([join(dir, 'missing.md')]).code, 2);
});
