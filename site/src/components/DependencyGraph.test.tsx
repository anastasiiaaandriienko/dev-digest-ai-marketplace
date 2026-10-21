import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { DependencyGraph } from './DependencyGraph';
import { fixture } from '../test/fixture';
import { en } from '../i18n/en';

afterEach(cleanup);

describe('DependencyGraph', () => {
  it('draws one node per plugin and one edge per dependency', () => {
    const { container } = render(<DependencyGraph plugins={fixture.index.plugins} />);
    expect(container.querySelectorAll('rect.graph-node')).toHaveLength(4);
    expect(container.querySelectorAll('path.graph-edge')).toHaveLength(4);
  });

  it('repeats the graph as a text list (shown on narrow screens), consumers first, dependencies in plugin.json order', () => {
    const { container } = render(<DependencyGraph plugins={fixture.index.plugins} highlight="architecture-review" />);
    const items = [...container.querySelectorAll('.graph-list li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
    expect(items).toEqual([
      `sdd-engineering ${en.home.dependsOn} engineering-paved-path ^1.0.0, research-tools ^1.0.0, architecture-review ^1.0.0`,
      `architecture-review ${en.home.dependsOn} engineering-paved-path ^1.0.0`,
      `engineering-paved-path ${en.home.noDependencies}`,
      `research-tools ${en.home.noDependencies}`,
    ]);
    expect(container.querySelector('.graph-list a[aria-current="page"]')?.textContent).toBe('architecture-review');
  });
});
