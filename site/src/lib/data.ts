// Loads the generated catalog files (relative URLs: works under any Pages sub-path).
import type { CatalogData, CatalogIndex, Release, Stats } from './types';

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadCatalog(): Promise<CatalogData> {
  const [index, releases, stats] = await Promise.all([
    getJson<CatalogIndex>('./index.json'),
    getJson<{ releases: Release[] }>('./releases.json'),
    getJson<Stats>('./stats.json'),
  ]);
  return { index, releases: releases.releases, stats };
}

export async function loadBody(path: string): Promise<string> {
  // Paths come from index.json and always look like `bodies/<file>.md`.
  if (!/^bodies\/[a-z0-9-]+\.md$/.test(path)) throw new Error(`unexpected body path: ${path}`);
  const res = await fetch(`./${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}
