import type { Plugin } from '../lib/types';
import { buildGraph } from '../lib/graph';
import { href } from '../lib/router';
import { en } from '../i18n/en';

const NODE_W = 200;
const NODE_H = 40;
const COL_GAP = 90;
const ROW_GAP = 22;
const DETOUR = 34;

/**
 * Layered drawing: level 0 (no dependencies) on the left, consumers to the right.
 * Every node links to its plugin page; `highlight` marks the current plugin.
 */
export function DependencyGraph({ plugins, highlight }: { plugins: readonly Plugin[]; highlight?: string }) {
  const graph = buildGraph(plugins);
  const pos = new Map<string, { x: number; y: number }>();
  graph.levels.forEach((names, col) =>
    names.forEach((name, row) => pos.set(name, { x: col * (NODE_W + COL_GAP), y: row * (NODE_H + ROW_GAP) })),
  );
  const width = graph.levels.length * (NODE_W + COL_GAP) - COL_GAP;
  const rowsHeight = Math.max(...graph.levels.map((l) => l.length)) * (NODE_H + ROW_GAP) - ROW_GAP;
  const levelOf = new Map(graph.nodes.map((n) => [n.name, n.level]));
  // An edge that skips a level would cross the nodes in between; route it below all rows.
  const skips = (from: string, to: string) => (levelOf.get(from) ?? 0) - (levelOf.get(to) ?? 0) > 1;
  const detourY = rowsHeight + DETOUR;
  const longEdges = graph.edges.filter((e) => skips(e.from, e.to));
  const height = longEdges.length > 0 ? detourY + 4 : rowsHeight;

  return (
    <figure className="graph">
      <svg
        viewBox={`-8 -8 ${width + 16} ${height + 16}`}
        role="img"
        aria-label={`${en.home.graphTitle}: ${graph.edges.map((e) => `${e.from} → ${e.to}`).join(', ')}`}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="graph-arrow" />
          </marker>
        </defs>
        {graph.edges.map((e) => {
          const from = pos.get(e.from)!;
          const to = pos.get(e.to)!;
          const x1 = from.x;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x + NODE_W;
          const y2 = to.y + NODE_H / 2;
          const mid = (x1 + x2) / 2;
          // Orthogonal detour: down below every row, across, up through the empty gap right
          // of the target column, then into the target. Gaps never contain nodes.
          const lane = (longEdges.indexOf(e) % 4) * 7;
          const gapX = x2 + COL_GAP / 2 - lane;
          const d = skips(e.from, e.to)
            ? `M ${x1 + NODE_W / 2} ${from.y + NODE_H} V ${detourY - lane} H ${gapX} V ${y2} H ${x2}`
            : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={d}
              className="graph-edge"
              markerEnd="url(#arrow)"
            >
              <title>{`${e.from} → ${e.to}${e.range ? ` ${e.range}` : ''}`}</title>
            </path>
          );
        })}
        {graph.nodes.map((n) => {
          const p = pos.get(n.name)!;
          return (
            <a key={n.name} href={href({ name: 'plugin', plugin: n.name })}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                className={n.name === highlight ? 'graph-node graph-node-current' : 'graph-node'}
              />
              <text x={p.x + NODE_W / 2} y={p.y + NODE_H / 2} className="graph-label" dominantBaseline="middle" textAnchor="middle">
                {n.name}
              </text>
            </a>
          );
        })}
      </svg>
      {/* The same graph as text: replaces the drawing on narrow screens (see styles.css). */}
      <ul className="graph-list">
        {[...graph.levels].reverse().flat().map((name) => {
          const deps = graph.edges.filter((e) => e.from === name);
          return (
            <li key={name}>
              <a href={href({ name: 'plugin', plugin: name })} aria-current={name === highlight ? 'page' : undefined}>
                {name}
              </a>{' '}
              <span className="muted">{deps.length ? en.home.dependsOn : en.home.noDependencies}</span>
              {deps.map((e, i) => (
                <span key={e.to}>
                  {i === 0 ? ' ' : ', '}
                  <a href={href({ name: 'plugin', plugin: e.to })}>{e.to}</a>
                  {e.range && <code className="range"> {e.range}</code>}
                </span>
              ))}
            </li>
          );
        })}
      </ul>
      <figcaption className="muted">{en.home.graphHint}</figcaption>
    </figure>
  );
}
