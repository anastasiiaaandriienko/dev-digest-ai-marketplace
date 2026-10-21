import type { CatalogData } from '../lib/types';
import { href } from '../lib/router';
import { MarkdownHtml } from '../components/Markdown';
import { en } from '../i18n/en';

export function WhatsNew({ data }: { data: CatalogData }) {
  const { releases, index } = data;
  return (
    <section>
      <h1>{en.whatsNew.title}</h1>
      {releases.length === 0 && <p>{en.whatsNew.empty}</p>}
      <ol className="releases">
        {releases.map((r) => {
          const plugin = index.plugins.find((p) => p.name === r.plugin);
          const sourcePath = plugin ? plugin.sourcePath.replace(/README\.md$/, 'CHANGELOG.md') : 'README.md';
          return (
            <li key={r.tag} className="release">
              <h2>
                <a href={href({ name: 'plugin', plugin: r.plugin })}>{r.plugin}</a> <span className="version">v{r.version}</span>
              </h2>
              <p className={r.released ? 'muted' : 'badge badge-pending'}>
                {r.released ? en.whatsNew.released(r.date) : en.whatsNew.unreleased}
                {r.released && <code className="range"> {r.tag}</code>}
              </p>
              <MarkdownHtml markdown={r.notes} source={{ repository: index.marketplace.repository, sourcePath }} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
