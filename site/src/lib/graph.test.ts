import { describe, expect, it } from 'vitest';
import { buildGraph, transitiveDependencies } from './graph';
import { fixture } from '../test/fixture';
import type { Plugin } from './types';

const plugins = fixture.index.plugins;

describe('buildGraph', () => {
  it('layers plugins by dependency depth', () => {
    expect(buildGraph(plugins).levels).toEqual([
      ['engineering-paved-path', 'research-tools'],
      ['architecture-review'],
      ['sdd-engineering'],
    ]);
  });

  it('has one edge per declared dependency, with its range', () => {
    const edges = buildGraph(plugins).edges;
    expect(edges).toHaveLength(4);
    expect(edges).toContainEqual({ from: 'architecture-review', to: 'engineering-paved-path', range: '^1.0.0' });
  });

  it('ignores dependencies outside the catalog and survives a cycle', () => {
    const p = (name: string, deps: string[]) => ({ ...plugins[0]!, name, dependencies: deps.map((d) => ({ name: d, version: null })) }) as Plugin;
    const g = buildGraph([p('a', ['b']), p('b', ['a']), p('c', ['missing'])]);
    expect(g.nodes.map((n) => n.name).sort()).toEqual(['a', 'b', 'c']);
    expect(g.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['a>b', 'b>a']);
  });
});

describe('transitiveDependencies', () => {
  it('includes indirect dependencies once', () => {
    expect(transitiveDependencies('sdd-engineering', plugins)).toEqual(['architecture-review', 'engineering-paved-path', 'research-tools']);
    expect(transitiveDependencies('architecture-review', plugins)).toEqual(['engineering-paved-path']);
    expect(transitiveDependencies('research-tools', plugins)).toEqual([]);
  });
});
