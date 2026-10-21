// Offline checks of the sdd-engineering 1.1.0 regex and tool_used graders: each pattern is
// read from its grader file and run against fixtures shaped like real workflow output, so
// a grader that can never pass (or never fail) is caught before a paid eval run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const evals = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plugins', 'sdd-engineering', 'evals');

/** Returns the grader's regex: a double-quoted `pattern`, or a single-quoted `pattern` / `input_match`. */
function graderRegex(path) {
  const text = readFileSync(join(evals, path), 'utf8');
  const dq = text.match(/^pattern:\s*(".*")\s*$/m);
  if (dq) return new RegExp(JSON.parse(dq[1]));
  const sq = text.match(/^(?:input_match|pattern):\s*'(.*)'\s*$/m);
  if (sq) return new RegExp(sq[sq.length - 1].replace(/''/g, "'"));
  throw new Error(`no pattern in ${path}`);
}

const coveredSpec = [
  '## 7. Requirements',
  '- **FR-1** `addTodo` accepts an optional due date. → AC-DUE-01, AC-DUE-02',
  '- FR-2 overdue listing → AC-DUE-03',
  '- NFR-1 listing 10k todos takes under 50 ms → AC-DUE-04',
  '## 12. Acceptance criteria (EARS)',
  '| AC-DUE-01 | … | unit |',
].join('\n');

test('requirements-covered passes a spec whose every requirement names an AC', () => {
  const re = graderRegex('spec-from-request/graders/requirements-covered.md'); // match: not_contains
  assert.equal(re.test(coveredSpec), false);
});

test('requirements-covered fails on an FR or NFR line without an AC', () => {
  const re = graderRegex('spec-from-request/graders/requirements-covered.md');
  assert.equal(re.test(`${coveredSpec}\n- FR-3 reject past due dates`), true);
  assert.equal(re.test(`${coveredSpec}\n- **NFR-2** p95 under 10 ms`), true);
});

test('requirements-covered ignores AC rows and prose that mention FR ids', () => {
  const re = graderRegex('spec-from-request/graders/requirements-covered.md');
  assert.equal(re.test(`${coveredSpec}\nSee FR-1 above.\n| AC-DUE-02 | covers FR-1 | unit |`), false);
});

test('requirements-listed needs at least FR-1 with an AC (an empty §7 cannot pass)', () => {
  const re = graderRegex('spec-from-request/graders/requirements-listed.md'); // match: contains
  assert.equal(re.test(coveredSpec), true);
  assert.equal(re.test('## 7. Requirements\nnone'), false);
});

const runLog = [
  '| Stage | Task | Agent | Model | Model source | Started (UTC) | Duration ms | Tokens | Tool uses | Cost USD | Result |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  '| S1 | — | sdd-engineering:spec-creator | opus | frontmatter | UNKNOWN | 69811 | 19199 | 5 | UNKNOWN | DONE |',
  '| S2 | — | sdd-engineering:implementation-planner | opus | frontmatter | UNKNOWN | 48449 | 22958 | 6 | UNKNOWN | READY |',
  '| S3 | — | sdd-engineering:implementation-planner (MODE: REVIEW) | sonnet | override | UNKNOWN | 37446 | 26118 | 7 | UNKNOWN | approve |',
].join('\n');

test('run-log-from-s1 finds the S1 spec-creator row with a model', () => {
  const re = graderRegex('spec-from-request/graders/run-log-from-s1.md');
  assert.equal(re.test(runLog), true);
  assert.equal(re.test(runLog.replace('| S1 | — | sdd-engineering:spec-creator | opus |', '| S1 | — | sdd-engineering:spec-creator | UNKNOWN |')), false);
});

test('run-log-review-model accepts an S3 row on a non-Opus model only', () => {
  const re = graderRegex('plan-from-approved-spec/graders/run-log-review-model.md');
  assert.equal(re.test(runLog), true);
  assert.equal(re.test(runLog.replace('(MODE: REVIEW) | sonnet |', '(MODE: REVIEW) | opus |')), false);
});

// Rows as the 1.1.0 eval run (2026-10-21) wrote them: a labelled stage and an annotated model.
test('run-log graders accept a labelled stage and an annotated model, and reject UNKNOWN', () => {
  const s1 = graderRegex('spec-from-request/graders/run-log-from-s1.md');
  const s3 = graderRegex('plan-from-approved-spec/graders/run-log-review-model.md');
  assert.equal(s1.test('| S1 | — | sdd-engineering:spec-creator | UNKNOWN | UNKNOWN | UNKNOWN | 63296 | 17632 | 8 | UNKNOWN | NEEDS_CLARIFICATION |'), false);
  assert.equal(s1.test('| S1 spec | — | sdd-engineering:spec-creator | opus (frontmatter default) | frontmatter | UNKNOWN | 63296 | 17632 | 8 | UNKNOWN | DONE |'), true);
  assert.equal(s3.test('| S3 review | — | sdd-engineering:implementation-planner (MODE: REVIEW) | sonnet | override | UNKNOWN | 26445 | 15803 | 7 | UNKNOWN | DONE |'), true);
  assert.equal(s3.test('| S2 plan | — | sdd-engineering:implementation-planner | opus (per skill) | frontmatter | UNKNOWN | 1 | 1 | 1 | UNKNOWN | READY |'), false);
});

test('the run-plan model table matches every agent frontmatter', () => {
  const plugins = join(evals, '..', '..');
  const skill = readFileSync(join(evals, '..', 'skills', 'run-plan', 'SKILL.md'), 'utf8');
  const rows = [...skill.matchAll(/^\s*\| `([a-z-]+):([a-z-]+)` \| (\w+) \|$/gm)];
  assert.equal(rows.length, 6);
  for (const [, plugin, agent, model] of rows) {
    const fm = readFileSync(join(plugins, plugin, 'agents', `${agent}.md`), 'utf8');
    assert.equal(fm.match(/^model:\s*(\S+)/m)?.[1], model, `${plugin}:${agent}`);
  }
});

test('review-on-other-model matches the REVIEW call with a sonnet override only', () => {
  const re = graderRegex('plan-from-approved-spec/graders/review-on-other-model.md');
  const call = (model) =>
    JSON.stringify({
      subagent_type: 'sdd-engineering:implementation-planner',
      description: 'Cross-model plan review',
      prompt: 'MODE: REVIEW\nSpec: specs/todo-due-dates/spec.md\nDraft: specs/todo-due-dates/plan.draft.md',
      ...(model ? { model } : {}),
    });
  assert.equal(re.test(call('sonnet')), true);
  assert.equal(re.test(call('opus')), false);
  assert.equal(re.test(call()), false);
  assert.equal(re.test(JSON.stringify({ subagent_type: 'sdd-engineering:implementation-planner', prompt: 'MODE: PLAN', model: 'sonnet' })), false);
});

test('legacy case: the planner grader matches a planner call and the scaffold spec leaves FR-3 uncovered', () => {
  const re = graderRegex('legacy-spec-uncovered-requirement/graders/no-planner.md');
  assert.equal(re.test(JSON.stringify({ subagent_type: 'sdd-engineering:implementation-planner' })), true);
  const scaffold = readFileSync(join(evals, 'legacy-spec-uncovered-requirement', 'scaffold.sh'), 'utf8');
  const fr3 = scaffold.split('\n').find((l) => l.startsWith('- FR-3'));
  assert.ok(fr3, 'scaffold spec has FR-3');
  assert.doesNotMatch(fr3, /AC-DUE-\d{2}/);
  assert.match(scaffold, /\*\*Status:\*\* Approved/);
});
