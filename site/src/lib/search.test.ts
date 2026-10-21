import { describe, expect, it } from 'vitest';
import { createSearcher } from './search';
import { fixture } from '../test/fixture';

const searcher = createSearcher(fixture.index);
const ids = (q: string, type?: Parameters<typeof searcher.search>[1]) => searcher.search(q, type).map((e) => e.id);

describe('createSearcher', () => {
  it('finds a skill by a word in its description', () => {
    expect(ids('zod')).toContain('skill:engineering-paved-path:zod');
  });

  it('matches body text, prefixes and small typos', () => {
    expect(ids('safeParse')).toContain('skill:engineering-paved-path:zod');
    expect(ids('orchestr')).toContain('skill:sdd-engineering:run-plan');
    expect(ids('reseacher')).toContain('agent:research-tools:researcher');
  });

  it('matches parts of namespaced and hyphenated names', () => {
    expect(ids('research-tools:researcher')[0]).toBe('agent:research-tools:researcher');
    expect(ids('paved')).toContain('plugin:engineering-paved-path');
  });

  it('ranks a name match above body-only matches', () => {
    expect(ids('researcher')[0]).toBe('agent:research-tools:researcher');
  });

  it('filters by type and lists everything for an empty query', () => {
    expect(ids('spec', 'plugin')).toEqual(['plugin:sdd-engineering']);
    expect(searcher.search('', 'agent').map((e) => e.id)).toEqual(['agent:research-tools:researcher']);
    expect(searcher.search('   ').length).toBe(fixture.index.plugins.length + fixture.index.artifacts.length);
  });

  it('returns nothing for unknown words', () => {
    expect(ids('kubernetes')).toEqual([]);
  });
});
