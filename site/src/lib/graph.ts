// Dependency graph of the marketplace plugins: layering for the drawing and
// transitive closures for the plugin page.
import type { Plugin } from './types';

export interface GraphNode {
  name: string;
  /** 0 = depends on nothing; n = one more than its deepest dependency. */
  level: number;
}

export interface GraphEdge {
  from: string; // dependent
  to: string; // dependency
  range: string | null;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  levels: string[][];
}

export function buildGraph(plugins: readonly Plugin[]): Graph {
  const byName = new Map(plugins.map((p) => [p.name, p]));
  const memo = new Map<string, number>();
  const level = (name: string, stack: Set<string>): number => {
    const known = memo.get(name);
    if (known !== undefined) return known;
    if (stack.has(name)) return 0; // cycle guard: the lint forbids cycles, the UI must not hang
    stack.add(name);
    const deps = byName.get(name)?.dependencies ?? [];
    const value = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => (byName.has(d.name) ? level(d.name, stack) : 0)));
    stack.delete(name);
    memo.set(name, value);
    return value;
  };

  const nodes = plugins.map((p) => ({ name: p.name, level: level(p.name, new Set()) }));
  const edges = plugins.flatMap((p) =>
    p.dependencies.filter((d) => byName.has(d.name)).map((d) => ({ from: p.name, to: d.name, range: d.version })),
  );
  const depth = Math.max(0, ...nodes.map((n) => n.level));
  const levels = Array.from({ length: depth + 1 }, (_, i) =>
    nodes.filter((n) => n.level === i).map((n) => n.name).sort(),
  );
  return { nodes, edges, levels };
}

/** Every plugin `name` needs, directly or through other dependencies. */
export function transitiveDependencies(name: string, plugins: readonly Plugin[]): string[] {
  const byName = new Map(plugins.map((p) => [p.name, p]));
  const seen = new Set<string>();
  const visit = (n: string) => {
    for (const d of byName.get(n)?.dependencies ?? []) {
      if (!seen.has(d.name) && d.name !== name) {
        seen.add(d.name);
        visit(d.name);
      }
    }
  };
  visit(name);
  return [...seen].sort();
}
