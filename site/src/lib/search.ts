// Client-side full-text search over the catalog (plugins, skills, agents).
import MiniSearch from 'minisearch';
import type { CatalogIndex, Entry, EntryType } from './types';
import type { SearchType } from './router';

interface Doc {
  id: string;
  type: EntryType;
  name: string;
  namespacedName: string;
  description: string;
  keywords: string;
  text: string;
}

export interface Searcher {
  search(query: string, type?: SearchType): Entry[];
  all(type?: SearchType): Entry[];
}

export function createSearcher(index: CatalogIndex): Searcher {
  const entries: Entry[] = [...index.plugins, ...index.artifacts];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const docs: Doc[] = entries.map((e) => ({
    id: e.id,
    type: e.type,
    name: e.name,
    namespacedName: e.type === 'plugin' ? e.name : e.namespacedName,
    description: e.description,
    keywords: e.type === 'plugin' ? [...e.keywords, ...e.tags, e.category ?? ''].join(' ') : e.plugin,
    text: e.searchText,
  }));

  const mini = new MiniSearch<Doc>({
    fields: ['name', 'namespacedName', 'description', 'keywords', 'text'],
    storeFields: ['id'],
    searchOptions: {
      boost: { name: 4, namespacedName: 3, description: 2, keywords: 2 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
    },
    // Split on whitespace, punctuation and hyphens so "spec-creator" matches "spec".
    tokenize: (text) => text.split(/[\s\-_:/.,;()[\]{}"'`]+/u).filter(Boolean),
  });
  mini.addAll(docs);

  const ofType = (type: SearchType) => (e: Entry) => type === 'all' || e.type === type;

  return {
    search(query, type = 'all') {
      const q = query.trim();
      if (!q) return this.all(type);
      return mini
        .search(q)
        .map((r) => byId.get(String(r.id)))
        .filter((e): e is Entry => Boolean(e))
        .filter(ofType(type));
    },
    all(type = 'all') {
      return entries.filter(ofType(type));
    },
  };
}
