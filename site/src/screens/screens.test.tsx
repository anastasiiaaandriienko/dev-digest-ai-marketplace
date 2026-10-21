import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from '../App';
import { PluginScreen } from './PluginScreen';
import { ArtifactScreen } from './ArtifactScreen';
import { SearchScreen } from './SearchScreen';
import { WhatsNew } from './WhatsNew';
import { createSearcher } from '../lib/search';
import { fixture } from '../test/fixture';
import { en } from '../i18n/en';

const bodies: Record<string, string> = {
  './bodies/plugin--sdd-engineering.md': '# sdd-engineering\n\n<script>alert(1)</script>\n\nSee [evals](evals/README.md).',
  './bodies/plugin--sdd-engineering--changelog.md': '## 1.0.0\n- first',
  './bodies/agent--research-tools--researcher.md': '# researcher\n\nRead-only.',
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => (url in bodies ? new Response(bodies[url]) : new Response('missing', { status: 404 }))),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = '';
});

describe('PluginScreen', () => {
  it('shows version, dependency ranges, dependents, install commands and the sanitized README', async () => {
    const { container } = render(<PluginScreen data={fixture} name="sdd-engineering" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('v1.0.0');
    const facts = container.querySelector('.facts')!;
    expect(within(facts as HTMLElement).getByText('architecture-review').getAttribute('href')).toBe('#/plugin/architecture-review');
    expect(facts.textContent).toContain('^1.0.0');
    expect(screen.getByText('/plugin marketplace add acme/demo-market')).toBeTruthy();
    expect(screen.getByText('/plugin install sdd-engineering@demo-market')).toBeTruthy();
    expect(screen.getByText('claude plugin install sdd-engineering@demo-market --scope project')).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('sdd-engineering → research-tools');

    await waitFor(() => expect(container.querySelector('.markdown a[href*="evals/README.md"]')).toBeTruthy());
    expect(container.innerHTML).not.toContain('<script');
    expect(container.querySelector('.markdown a')!.getAttribute('href')).toBe(
      'https://github.com/acme/demo-market/blob/main/plugins/sdd-engineering/evals/README.md',
    );
  });

  it('copies the exact install command', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<PluginScreen data={fixture} name="sdd-engineering" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: en.copy.label('/plugin install sdd-engineering@demo-market') }));
    });
    expect(writeText).toHaveBeenCalledWith('/plugin install sdd-engineering@demo-market');
    expect(screen.getAllByText(en.copy.copied)).toHaveLength(1);
  });

  it('reports a failed copy instead of pretending it worked', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) } });
    render(<PluginScreen data={fixture} name="research-tools" />);
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Copy/ })[0]!);
    });
    expect(screen.getByText(en.copy.failed)).toBeTruthy();
  });

  it('shows not-found for an unknown plugin', () => {
    render(<PluginScreen data={fixture} name="nope" />);
    expect(screen.getByText(en.plugin.notFound('nope'))).toBeTruthy();
  });
});

describe('ArtifactScreen', () => {
  it('shows an agent with its plugin, model and tools', async () => {
    render(<ArtifactScreen data={fixture} id="agent:research-tools:researcher" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('research-tools:researcher');
    expect(screen.getByText('sonnet')).toBeTruthy();
    expect(screen.getByText('Read, Grep, Glob, WebSearch, WebFetch')).toBeTruthy();
    await screen.findByText('Read-only.');
  });

  it('labels a manual-only skill and a third-party skill', () => {
    render(<ArtifactScreen data={fixture} id="skill:sdd-engineering:run-plan" />);
    expect(screen.getByText(en.artifact.manualOnly)).toBeTruthy();
    cleanup();
    render(<ArtifactScreen data={fixture} id="skill:engineering-paved-path:zod" />);
    expect(screen.getByText(en.artifact.thirdParty)).toBeTruthy();
  });

  it('says so when a body cannot be loaded', async () => {
    render(<ArtifactScreen data={fixture} id="skill:engineering-paved-path:zod" />);
    await screen.findByText(en.states.bodyError);
  });
});

describe('SearchScreen', () => {
  const searcher = createSearcher(fixture.index);

  it('shows matching cards with a result count and type facets', () => {
    render(<SearchScreen searcher={searcher} q="zod" type="all" />);
    // The skill itself and the plugin that lists "zod" in its keywords.
    expect(screen.getByText(en.search.count(2))).toBeTruthy();
    expect(screen.getByText('engineering-paved-path:zod').closest('a')!.getAttribute('href')).toBe(
      '#/artifact/skill%3Aengineering-paved-path%3Azod',
    );
    const facets = screen.getByRole('navigation', { name: en.search.filterLabel });
    expect(within(facets).getByText(en.types.skillPlural).getAttribute('href')).toBe('#/search?q=zod&type=skill');
    expect(within(facets).getByText(en.types.all).getAttribute('aria-current')).toBe('page');
  });

  it('explains an empty result', () => {
    render(<SearchScreen searcher={searcher} q="kubernetes" type="all" />);
    expect(screen.getByText(en.search.empty('kubernetes'))).toBeTruthy();
  });
});

describe('WhatsNew', () => {
  it('lists released and unreleased versions', () => {
    render(<WhatsNew data={fixture} />);
    expect(screen.getByText(en.whatsNew.unreleased)).toBeTruthy();
    expect(screen.getByText(en.whatsNew.released('2026-10-22'), { exact: false })).toBeTruthy();
  });
});

describe('App', () => {
  it('shows an error with a retry, then the catalog', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fixture);
    render(<App load={load} />);
    await screen.findByText(en.states.loadError);
    fireEvent.click(screen.getByRole('button', { name: en.states.retry }));
    await screen.findByRole('heading', { name: en.home.title });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('routes by hash and searches from the header', async () => {
    window.location.hash = '#/plugin/research-tools';
    render(<App load={async () => fixture} />);
    await screen.findByRole('heading', { level: 1, name: /research-tools/ });
    fireEvent.change(screen.getByRole('searchbox', { name: en.search.label }), { target: { value: 'zod' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByRole('heading', { name: en.search.resultsTitle('zod') });
  });
});
