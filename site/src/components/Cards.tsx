import type { Artifact, Entry, Plugin } from '../lib/types';
import { entryHref } from '../lib/router';
import { en } from '../i18n/en';

export function TypeBadge({ type }: { type: Entry['type'] }) {
  return <span className={`badge badge-${type}`}>{en.types[type]}</span>;
}

export function PluginCard({ plugin }: { plugin: Plugin }) {
  return (
    <a className="card" href={entryHref(plugin.id)}>
      <div className="card-head">
        <TypeBadge type="plugin" />
        <span className="card-title">{plugin.name}</span>
        <span className="version">v{plugin.version}</span>
      </div>
      <p className="card-text">{plugin.description}</p>
      <div className="card-meta">
        <span>
          {plugin.skills.length} {en.types.skillPlural.toLowerCase()} · {plugin.agents.length}{' '}
          {en.types.agentPlural.toLowerCase()}
        </span>
        {plugin.dependencies.length > 0 && (
          <span>
            {en.plugin.dependencies}: {plugin.dependencies.map((d) => d.name).join(', ')}
          </span>
        )}
      </div>
    </a>
  );
}

export function ArtifactCard({ artifact }: { artifact: Artifact }) {
  return (
    <a className="card" href={entryHref(artifact.id)}>
      <div className="card-head">
        <TypeBadge type={artifact.type} />
        <span className="card-title mono">{artifact.namespacedName}</span>
      </div>
      <p className="card-text">{artifact.description}</p>
    </a>
  );
}

export function EntryCard({ entry }: { entry: Entry }) {
  return entry.type === 'plugin' ? <PluginCard plugin={entry} /> : <ArtifactCard artifact={entry} />;
}
