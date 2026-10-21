// Hash routing: works on any GitHub Pages sub-path without server rewrites.
import type { EntryType } from './types';

export type SearchType = EntryType | 'all';

export type Route =
  | { name: 'home' }
  | { name: 'search'; q: string; type: SearchType }
  | { name: 'plugin'; plugin: string }
  | { name: 'artifact'; id: string }
  | { name: 'whats-new' }
  | { name: 'getting-started' }
  | { name: 'not-found'; path: string };

const TYPES: readonly SearchType[] = ['all', 'plugin', 'skill', 'agent'];

/** `#/plugin/x`, `#/search?q=…&type=…` → Route. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path = '/', query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(safeDecode);
  const params = new URLSearchParams(query);

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'search' && parts.length === 1) {
    const type = params.get('type') as SearchType | null;
    return { name: 'search', q: params.get('q') ?? '', type: type && TYPES.includes(type) ? type : 'all' };
  }
  if (parts[0] === 'plugin' && parts.length === 2) return { name: 'plugin', plugin: parts[1]! };
  if (parts[0] === 'artifact' && parts.length === 2) return { name: 'artifact', id: parts[1]! };
  if (parts[0] === 'whats-new' && parts.length === 1) return { name: 'whats-new' };
  if (parts[0] === 'getting-started' && parts.length === 1) return { name: 'getting-started' };
  return { name: 'not-found', path };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'search': {
      const params = new URLSearchParams();
      if (route.q) params.set('q', route.q);
      if (route.type !== 'all') params.set('type', route.type);
      const qs = params.toString();
      return `#/search${qs ? `?${qs}` : ''}`;
    }
    case 'plugin':
      return `#/plugin/${encodeURIComponent(route.plugin)}`;
    case 'artifact':
      return `#/artifact/${encodeURIComponent(route.id)}`;
    case 'whats-new':
      return '#/whats-new';
    case 'getting-started':
      return '#/getting-started';
    case 'not-found':
      return `#${route.path}`;
  }
}

/** Link to a catalog entry by its id (`plugin:x` goes to the plugin page). */
export function entryHref(id: string): string {
  return id.startsWith('plugin:') ? href({ name: 'plugin', plugin: id.slice('plugin:'.length) }) : href({ name: 'artifact', id });
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
