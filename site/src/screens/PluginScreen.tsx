import type { CatalogData } from '../lib/types';
import { href } from '../lib/router';
import { installCommands } from '../lib/install';
import { transitiveDependencies } from '../lib/graph';
import { ArtifactCard } from '../components/Cards';
import { CommandLine } from '../components/CopyButton';
import { DependencyGraph } from '../components/DependencyGraph';
import { MarkdownBody } from '../components/Markdown';
import { en } from '../i18n/en';
import { NotFound } from './NotFound';

export function PluginScreen({ data, name }: { data: CatalogData; name: string }) {
  const { index } = data;
  const plugin = index.plugins.find((p) => p.name === name);
  if (!plugin) return <NotFound message={en.plugin.notFound(name)} />;

  const artifacts = index.artifacts.filter((a) => a.plugin === plugin.name);
  const commands = installCommands(index.marketplace, plugin.name);
  const related = new Set([plugin.name, ...transitiveDependencies(plugin.name, index.plugins), ...plugin.dependents]);
  const source = { repository: index.marketplace.repository, sourcePath: plugin.sourcePath };
  const docPath = (file: string) => plugin.sourcePath.replace(/README\.md$/, file);

  return (
    <article>
      <header className="page-head">
        <h1>
          {plugin.name} <span className="version">v{plugin.version}</span>
        </h1>
        <p className="lead">{plugin.description}</p>
      </header>

      <dl className="facts">
        <dt>{en.plugin.version}</dt>
        <dd>{plugin.version}</dd>
        <dt>{en.plugin.author}</dt>
        <dd>{plugin.author}</dd>
        <dt>{en.plugin.license}</dt>
        <dd>{plugin.license}</dd>
        {plugin.minClaudeCode && (
          <>
            <dt>{en.plugin.compatibility}</dt>
            <dd>{en.plugin.compatibilityValue(plugin.minClaudeCode)}</dd>
          </>
        )}
        <dt>{en.plugin.dependencies}</dt>
        <dd>
          {plugin.dependencies.length === 0
            ? en.plugin.none
            : plugin.dependencies.map((d, i) => (
                <span key={d.name}>
                  {i > 0 && ', '}
                  <a href={href({ name: 'plugin', plugin: d.name })}>{d.name}</a>
                  {d.version && <code className="range"> {d.version}</code>}
                </span>
              ))}
        </dd>
        <dt>{en.plugin.dependents}</dt>
        <dd>
          {plugin.dependents.length === 0
            ? en.plugin.none
            : plugin.dependents.map((d, i) => (
                <span key={d}>
                  {i > 0 && ', '}
                  <a href={href({ name: 'plugin', plugin: d })}>{d}</a>
                </span>
              ))}
        </dd>
      </dl>

      <section>
        <h2>{en.plugin.install}</h2>
        <p className="muted">{en.plugin.installHint}</p>
        <CommandLine command={commands.addMarketplace} />
        <CommandLine command={commands.installInSession} />
        <CommandLine command={commands.installCli} />
      </section>

      {related.size > 1 && (
        <section>
          <h2>{en.home.graphTitle}</h2>
          <DependencyGraph plugins={index.plugins.filter((p) => related.has(p.name))} highlight={plugin.name} />
        </section>
      )}

      {(['skill', 'agent'] as const).map((type) => {
        const list = artifacts.filter((a) => a.type === type);
        if (list.length === 0) return null;
        return (
          <section key={type}>
            <h2>{type === 'skill' ? en.plugin.skills : en.plugin.agents}</h2>
            <div className="grid">
              {list.map((a) => (
                <ArtifactCard key={a.id} artifact={a} />
              ))}
            </div>
          </section>
        );
      })}

      {plugin.evals.length > 0 && (
        <section>
          <h2>{en.plugin.evals}</h2>
          <ul className="tags">
            {plugin.evals.map((e) => (
              <li key={e} className="mono">
                {e}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>{en.plugin.readme}</h2>
        <MarkdownBody path={plugin.body} source={source} />
      </section>
      {plugin.changelog && (
        <section>
          <h2>{en.plugin.changelog}</h2>
          <MarkdownBody path={plugin.changelog} source={{ ...source, sourcePath: docPath('CHANGELOG.md') }} />
        </section>
      )}
      {plugin.compatibility && (
        <section>
          <h2>{en.plugin.compatibilityDoc}</h2>
          <MarkdownBody path={plugin.compatibility} source={{ ...source, sourcePath: docPath('COMPATIBILITY.md') }} />
        </section>
      )}
      {index.marketplace.repository && (
        <p>
          <a href={`${index.marketplace.repository}/tree/main/${plugin.sourcePath.replace(/\/README\.md$/, '')}`} target="_blank" rel="noopener noreferrer">
            {en.plugin.viewSource}
          </a>
        </p>
      )}
    </article>
  );
}
