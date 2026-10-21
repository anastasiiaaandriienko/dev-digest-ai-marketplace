import type { CatalogData } from '../lib/types';
import { DependencyGraph } from '../components/DependencyGraph';
import { PluginCard } from '../components/Cards';
import { en } from '../i18n/en';

export function Home({ data }: { data: CatalogData }) {
  const { index, stats } = data;
  const tiles: [number, string][] = [
    [stats.plugins, en.stats.plugins],
    [stats.skills, en.stats.skills],
    [stats.agents, en.stats.agents],
    [stats.evalCases, en.stats.evalCases],
    [stats.releasedVersions, en.stats.released],
  ];
  return (
    <>
      <section className="hero">
        <h1>{en.home.title}</h1>
        <p className="lead">{index.marketplace.description}</p>
        <ul className="stats">
          {tiles.map(([value, label]) => (
            <li key={label} className="stat">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </li>
          ))}
        </ul>
        {stats.commit && (
          <p className="muted small">{en.stats.builtFrom(stats.commit.slice(0, 7), stats.generatedAt.slice(0, 10))}</p>
        )}
      </section>
      <section>
        <h2>{en.home.graphTitle}</h2>
        <DependencyGraph plugins={index.plugins} />
      </section>
      <section>
        <h2>{en.home.pluginsTitle}</h2>
        <div className="grid">
          {index.plugins.map((p) => (
            <PluginCard key={p.id} plugin={p} />
          ))}
        </div>
      </section>
    </>
  );
}
