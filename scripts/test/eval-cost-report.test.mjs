import { test } from 'node:test';
import assert from 'node:assert/strict';
import { median, traceMetrics } from '../eval-cost-report.mjs';

const line = (o) => JSON.stringify(o);

test('traceMetrics counts API calls once per message and splits main and subagent tool calls', () => {
  const trace = [
    line({ type: 'system', subtype: 'init', plugins: [{ name: 'sdd-engineering' }, { name: 'research-tools' }] }),
    line({ type: 'assistant', message: { id: 'm1', content: [{ type: 'tool_use', name: 'Read', input: {} }] } }),
    // the same API message streamed twice counts once
    line({ type: 'assistant', message: { id: 'm1', content: [{ type: 'text', text: 'x' }] } }),
    line({ type: 'assistant', message: { id: 'm2', content: [{ type: 'tool_use', name: 'Agent', input: { subagent_type: 'sdd-engineering:spec-creator' } }] } }),
    line({ type: 'assistant', parent_tool_use_id: 't1', message: { id: 's1', content: [{ type: 'tool_use', name: 'Write', input: {} }] } }),
    line({ type: 'result', parent_tool_use_id: 't1', total_cost_usd: 0.1 }),
    line({
      type: 'result',
      total_cost_usd: 0.5,
      duration_ms: 1200,
      modelUsage: { 'model-a': { inputTokens: 1, outputTokens: 2, cacheReadInputTokens: 3, cacheCreationInputTokens: 4, costUSD: 0.5 } },
    }),
    'not json',
  ];
  assert.deepEqual(traceMetrics(trace), {
    pluginsLoaded: ['sdd-engineering', 'research-tools'],
    apiCalls: 3,
    toolCalls: 2,
    subagentToolCalls: 1,
    agentCalls: ['sdd-engineering:spec-creator'],
    models: { 'model-a': { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, costUsd: 0.5 } },
    costUsd: 0.5,
    durationMs: 1200,
  });
});

test('median handles odd, even and empty inputs', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
});
