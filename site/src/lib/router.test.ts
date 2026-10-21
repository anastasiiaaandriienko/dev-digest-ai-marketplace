import { describe, expect, it } from 'vitest';
import { entryHref, href, parseHash } from './router';

describe('parseHash', () => {
  it.each([
    ['', { name: 'home' }],
    ['#/', { name: 'home' }],
    ['#/whats-new', { name: 'whats-new' }],
    ['#/getting-started', { name: 'getting-started' }],
    ['#/plugin/sdd-engineering', { name: 'plugin', plugin: 'sdd-engineering' }],
    ['#/artifact/skill%3Asdd-engineering%3Arun-plan', { name: 'artifact', id: 'skill:sdd-engineering:run-plan' }],
    ['#/search?q=spec%20plan&type=skill', { name: 'search', q: 'spec plan', type: 'skill' }],
    ['#/search?type=bogus', { name: 'search', q: '', type: 'all' }],
    ['#/nope/x', { name: 'not-found', path: '/nope/x' }],
    ['#/artifact/%E0%A4%A', { name: 'artifact', id: '%E0%A4%A' }],
  ])('%s', (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
  });
});

describe('href', () => {
  it('round-trips through parseHash', () => {
    const routes = [
      { name: 'search', q: 'a & b', type: 'agent' },
      { name: 'artifact', id: 'agent:research-tools:researcher' },
      { name: 'plugin', plugin: 'research-tools' },
    ] as const;
    for (const r of routes) expect(parseHash(href(r))).toEqual(r);
  });

  it('links entries by id', () => {
    expect(entryHref('plugin:research-tools')).toBe('#/plugin/research-tools');
    expect(entryHref('skill:x:y')).toBe('#/artifact/skill%3Ax%3Ay');
  });
});
