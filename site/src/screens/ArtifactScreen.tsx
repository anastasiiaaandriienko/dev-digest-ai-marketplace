import type { CatalogData } from '../lib/types';
import { href } from '../lib/router';
import { TypeBadge } from '../components/Cards';
import { CommandLine } from '../components/CopyButton';
import { MarkdownBody } from '../components/Markdown';
import { en } from '../i18n/en';
import { NotFound } from './NotFound';

export function ArtifactScreen({ data, id }: { data: CatalogData; id: string }) {
  const { index } = data;
  const artifact = index.artifacts.find((a) => a.id === id);
  if (!artifact) return <NotFound message={en.artifact.notFound(id)} />;
  const plugin = index.plugins.find((p) => p.name === artifact.plugin);

  return (
    <article>
      <header className="page-head">
        <p>
          <TypeBadge type={artifact.type} />
        </p>
        <h1 className="mono">{artifact.namespacedName}</h1>
        <p className="lead">{artifact.description}</p>
      </header>

      <dl className="facts">
        <dt>{en.artifact.inPlugin}</dt>
        <dd>
          <a href={href({ name: 'plugin', plugin: artifact.plugin })}>{artifact.plugin}</a>
          {plugin && <span className="version"> v{plugin.version}</span>}
        </dd>
        <dt>{en.artifact.namespaced}</dt>
        <dd>
          <CommandLine command={artifact.type === 'skill' ? `/${artifact.namespacedName}` : artifact.namespacedName} />
        </dd>
        {artifact.type === 'agent' && (
          <>
            {artifact.model && (
              <>
                <dt>{en.artifact.model}</dt>
                <dd>{artifact.model}</dd>
              </>
            )}
            <dt>{en.artifact.tools}</dt>
            <dd className="mono">{artifact.tools.join(', ') || en.plugin.none}</dd>
            <dt>{en.artifact.disallowedTools}</dt>
            <dd className="mono">{artifact.disallowedTools.join(', ') || en.plugin.none}</dd>
          </>
        )}
        {artifact.type === 'skill' && artifact.argumentHint && (
          <>
            <dt>{en.artifact.argumentHint}</dt>
            <dd className="mono">{artifact.argumentHint}</dd>
          </>
        )}
      </dl>

      {artifact.type === 'skill' && artifact.manualOnly && <p className="note">{en.artifact.manualOnly}</p>}
      {artifact.type === 'skill' && artifact.thirdParty && <p className="note">{en.artifact.thirdParty}</p>}

      <MarkdownBody path={artifact.body} source={{ repository: index.marketplace.repository, sourcePath: artifact.sourcePath }} />
    </article>
  );
}
