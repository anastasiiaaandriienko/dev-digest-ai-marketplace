#!/usr/bin/env node
// Cost and usage of `claude plugin eval` runs, for docs/COST-BASELINE.md.
// Reads the eval result JSON (--json) and each run's trace (kept with --keep-temp).
// Node.js built-ins only; reads files, never runs or loads anything from the run workspace.
// Usage: node scripts/eval-cost-report.mjs <result.json> [<result.json> ...] [--md]
import { existsSync, readFileSync } from 'node:fs';

export function traceMetrics(lines) {
  const events = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter(Boolean);

  const apiCalls = new Set();
  let toolCalls = 0;
  let subagentToolCalls = 0;
  const agents = [];
  for (const e of events) {
    if (e.type !== 'assistant') continue;
    const id = e.message?.id;
    if (id) apiCalls.add(id);
    for (const c of e.message?.content ?? []) {
      if (c.type !== 'tool_use') continue;
      if (e.parent_tool_use_id) subagentToolCalls += 1;
      else toolCalls += 1;
      if (c.name === 'Agent' || c.name === 'Task') agents.push(c.input?.subagent_type ?? 'unknown');
    }
  }
  // The session's own result event is the last one without a parent tool use.
  const result = [...events].reverse().find((e) => e.type === 'result' && !e.parent_tool_use_id) ?? null;
  const models = {};
  for (const [model, u] of Object.entries(result?.modelUsage ?? {})) {
    models[model] = {
      input: u.inputTokens ?? 0,
      output: u.outputTokens ?? 0,
      cacheRead: u.cacheReadInputTokens ?? 0,
      cacheWrite: u.cacheCreationInputTokens ?? 0,
      costUsd: u.costUSD ?? 0,
    };
  }
  const init = events.find((e) => e.type === 'system' && e.subtype === 'init' && !e.parent_tool_use_id);
  return {
    pluginsLoaded: (init?.plugins ?? []).map((p) => p.name),
    apiCalls: apiCalls.size,
    toolCalls,
    subagentToolCalls,
    agentCalls: agents,
    models,
    costUsd: result?.total_cost_usd ?? null,
    durationMs: result?.duration_ms ?? null,
  };
}

export function runsOf(resultJson) {
  const out = [];
  for (const c of resultJson.cases ?? []) {
    for (const r of c.arms?.with ?? []) {
      const trace = r.tracePath && existsSync(r.tracePath) ? traceMetrics(readFileSync(r.tracePath, 'utf8').split('\n')) : null;
      out.push({
        case: c.name,
        score: r.score,
        passed: r.passed,
        costUsd: r.costUsd,
        judgeCostUsd: r.judgeCostUsd ?? 0,
        durationSeconds: r.durationSeconds,
        failedGraders: (r.graders ?? []).filter((g) => !g.passed).map((g) => g.name),
        trace,
      });
    }
  }
  return out;
}

export function median(values) {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (v.length === 0) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function sumModels(runs) {
  const total = {};
  for (const r of runs) {
    for (const [model, u] of Object.entries(r.trace?.models ?? {})) {
      const t = (total[model] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0 });
      for (const k of Object.keys(t)) t[k] += u[k];
    }
  }
  return total;
}

if (process.argv[1] && process.argv[1].endsWith('eval-cost-report.mjs')) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (files.length === 0) {
    console.error('usage: node scripts/eval-cost-report.mjs <result.json> [...]');
    process.exit(2);
  }
  const runs = files.flatMap((f) => runsOf(JSON.parse(readFileSync(f, 'utf8'))));
  for (const r of runs) {
    const t = r.trace;
    console.log(
      `${r.case}: score ${r.score.toFixed(2)} · $${r.costUsd.toFixed(3)} (+judge $${r.judgeCostUsd.toFixed(4)}) · ${r.durationSeconds}s` +
        (t
          ? ` · api ${t.apiCalls} · tools ${t.toolCalls} main / ${t.subagentToolCalls} subagent · agents [${t.agentCalls.join(', ')}] · plugins ${t.pluginsLoaded.length}`
          : ' · no trace') +
        (r.failedGraders.length ? ` · failed: ${r.failedGraders.join(', ')}` : ''),
    );
  }
  console.log('tokens by model (sum):', JSON.stringify(sumModels(runs)));
}
