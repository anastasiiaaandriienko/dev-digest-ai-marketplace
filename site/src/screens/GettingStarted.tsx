import type { CatalogData } from '../lib/types';
import { installCommands } from '../lib/install';
import { CommandLine } from '../components/CopyButton';
import { en } from '../i18n/en';

/** The workflow plugin is the usual entry point; its dependencies come with it. */
const EXAMPLE_PLUGIN = 'sdd-engineering';

export function GettingStarted({ data }: { data: CatalogData }) {
  const { index } = data;
  const example = index.plugins.find((p) => p.name === EXAMPLE_PLUGIN) ?? index.plugins[0];
  if (!example) return null;
  const c = installCommands(index.marketplace, example.name);
  const minVersion = index.plugins.map((p) => p.minClaudeCode).find(Boolean);
  return (
    <section className="steps">
      <h1>{en.gettingStarted.title}</h1>
      {minVersion && <p className="note">{en.gettingStarted.requirement(minVersion)}</p>}
      <ol>
        <li>
          <p>{en.gettingStarted.stepAdd}</p>
          <CommandLine command={c.addMarketplace} />
        </li>
        <li>
          <p>{en.gettingStarted.stepInstall}</p>
          <CommandLine command={c.installInSession} />
          <CommandLine command={c.installCli} />
        </li>
        <li>
          <p>{en.gettingStarted.stepCheck}</p>
          <CommandLine command={c.list} />
        </li>
        <li>
          <p>{en.gettingStarted.stepUpdate}</p>
          <CommandLine command={c.updateMarketplace} />
          <CommandLine command={c.updatePlugin} />
        </li>
      </ol>
      <p className="muted">{en.gettingStarted.more}</p>
    </section>
  );
}
