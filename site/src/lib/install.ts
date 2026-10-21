// Install and update commands shown on the site. Must match README.md and docs/RELEASES.md.
import type { MarketplaceInfo } from './types';

export interface InstallCommands {
  addMarketplace: string;
  installInSession: string;
  installCli: string;
  list: string;
  updateMarketplace: string;
  updatePlugin: string;
}

export function installCommands(marketplace: MarketplaceInfo, plugin: string): InstallCommands {
  const source = marketplace.githubSlug ?? marketplace.repository ?? marketplace.name;
  const id = `${plugin}@${marketplace.name}`;
  return {
    addMarketplace: `/plugin marketplace add ${source}`,
    installInSession: `/plugin install ${id}`,
    installCli: `claude plugin install ${id} --scope project`,
    list: 'claude plugin list --json',
    updateMarketplace: `claude plugin marketplace update ${marketplace.name}`,
    updatePlugin: `claude plugin update ${id} --scope project`,
  };
}
