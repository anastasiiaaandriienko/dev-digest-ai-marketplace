import { describe, expect, it } from 'vitest';
import { installCommands } from './install';
import { fixture } from '../test/fixture';

describe('installCommands', () => {
  it('uses the GitHub slug and the marketplace name', () => {
    expect(installCommands(fixture.index.marketplace, 'sdd-engineering')).toEqual({
      addMarketplace: '/plugin marketplace add acme/demo-market',
      installInSession: '/plugin install sdd-engineering@demo-market',
      installCli: 'claude plugin install sdd-engineering@demo-market --scope project',
      list: 'claude plugin list --json',
      updateMarketplace: 'claude plugin marketplace update demo-market',
      updatePlugin: 'claude plugin update sdd-engineering@demo-market --scope project',
    });
  });

  it('matches the install command stored in the index', () => {
    for (const p of fixture.index.plugins) {
      expect(installCommands(fixture.index.marketplace, p.name).installInSession).toBe(p.install);
    }
  });
});
