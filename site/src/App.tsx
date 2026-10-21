import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CatalogData } from './lib/types';
import { loadCatalog } from './lib/data';
import { parseHash, type Route } from './lib/router';
import { createSearcher } from './lib/search';
import { Header } from './components/Header';
import { Home } from './screens/Home';
import { SearchScreen } from './screens/SearchScreen';
import { PluginScreen } from './screens/PluginScreen';
import { ArtifactScreen } from './screens/ArtifactScreen';
import { WhatsNew } from './screens/WhatsNew';
import { GettingStarted } from './screens/GettingStarted';
import { NotFound } from './screens/NotFound';
import { en } from './i18n/en';

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: CatalogData };

export function App({ load = loadCatalog }: { load?: () => Promise<CatalogData> }) {
  const route = useRoute();
  const [state, setState] = useState<Load>({ status: 'loading' });
  const fetchData = useCallback(() => {
    setState({ status: 'loading' });
    load()
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => setState({ status: 'error' }));
  }, [load]);
  useEffect(fetchData, [fetchData]);

  const searcher = useMemo(() => (state.status === 'ready' ? createSearcher(state.data.index) : null), [state]);
  const repository = state.status === 'ready' ? state.data.index.marketplace.repository : null;

  let content: ReactNode;
  if (state.status === 'loading') content = <p role="status">{en.states.loading}</p>;
  else if (state.status === 'error')
    content = (
      <div role="alert">
        <p>{en.states.loadError}</p>
        <button type="button" onClick={fetchData}>
          {en.states.retry}
        </button>
      </div>
    );
  else {
    const { data } = state;
    switch (route.name) {
      case 'home':
        content = <Home data={data} />;
        break;
      case 'search':
        content = <SearchScreen searcher={searcher!} q={route.q} type={route.type} />;
        break;
      case 'plugin':
        content = <PluginScreen data={data} name={route.plugin} />;
        break;
      case 'artifact':
        content = <ArtifactScreen data={data} id={route.id} />;
        break;
      case 'whats-new':
        content = <WhatsNew data={data} />;
        break;
      case 'getting-started':
        content = <GettingStarted data={data} />;
        break;
      case 'not-found':
        content = <NotFound />;
        break;
    }
  }

  return (
    <>
      <Header query={route.name === 'search' ? route.q : ''} repository={repository} />
      <main id="main" className="main" tabIndex={-1}>
        {content}
      </main>
    </>
  );
}
