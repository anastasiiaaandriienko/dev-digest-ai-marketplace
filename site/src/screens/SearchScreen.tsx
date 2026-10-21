import { useMemo } from 'react';
import type { Searcher } from '../lib/search';
import { href, type SearchType } from '../lib/router';
import { EntryCard } from '../components/Cards';
import { en } from '../i18n/en';

const FACETS: { type: SearchType; label: string }[] = [
  { type: 'all', label: en.types.all },
  { type: 'plugin', label: en.types.pluginPlural },
  { type: 'skill', label: en.types.skillPlural },
  { type: 'agent', label: en.types.agentPlural },
];

export function SearchScreen({ searcher, q, type }: { searcher: Searcher; q: string; type: SearchType }) {
  const results = useMemo(() => searcher.search(q, type), [searcher, q, type]);
  return (
    <section>
      <h1>{en.search.resultsTitle(q)}</h1>
      <nav className="facets" aria-label={en.search.filterLabel}>
        {FACETS.map((f) => (
          <a key={f.type} href={href({ name: 'search', q, type: f.type })} aria-current={f.type === type ? 'page' : undefined}>
            {f.label}
          </a>
        ))}
      </nav>
      <p className="muted" role="status">
        {en.search.count(results.length)}
      </p>
      {results.length === 0 ? (
        <p>{en.search.empty(q)}</p>
      ) : (
        <div className="grid">
          {results.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </section>
  );
}
