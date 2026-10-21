import type { Artifact, CatalogData, Plugin } from '../lib/types';

function plugin(name: string, deps: string[], over: Partial<Plugin> = {}): Plugin {
  return {
    id: `plugin:${name}`,
    type: 'plugin',
    name,
    version: '1.0.0',
    description: `${name} description`,
    keywords: [],
    category: 'development',
    tags: [],
    author: 'team',
    license: 'MIT',
    dependencies: deps.map((d) => ({ name: d, version: '^1.0.0' })),
    dependents: [],
    skills: [],
    agents: [],
    evals: [],
    minClaudeCode: deps.length ? '2.1.110' : null,
    install: `/plugin install ${name}@demo-market`,
    body: `bodies/plugin--${name}.md`,
    changelog: `bodies/plugin--${name}--changelog.md`,
    compatibility: null,
    sourcePath: `plugins/${name}/README.md`,
    searchText: '',
    ...over,
  };
}

const plugins: Plugin[] = [
  plugin('engineering-paved-path', [], {
    keywords: ['architecture', 'zod'],
    skills: ['skill:engineering-paved-path:zod'],
    dependents: ['architecture-review', 'sdd-engineering'],
  }),
  plugin('research-tools', [], { agents: ['agent:research-tools:researcher'], dependents: ['sdd-engineering'] }),
  plugin('architecture-review', ['engineering-paved-path'], { dependents: ['sdd-engineering'] }),
  plugin('sdd-engineering', ['engineering-paved-path', 'research-tools', 'architecture-review'], {
    skills: ['skill:sdd-engineering:run-plan'],
    evals: ['spec-from-request'],
    searchText: 'Spec-driven development workflow with approval gates',
  }),
];

const artifacts: Artifact[] = [
  {
    id: 'skill:engineering-paved-path:zod',
    type: 'skill',
    name: 'zod',
    namespacedName: 'engineering-paved-path:zod',
    plugin: 'engineering-paved-path',
    description: 'Zod schema validation best practices',
    manualOnly: false,
    argumentHint: null,
    thirdParty: true,
    body: 'bodies/skill--engineering-paved-path--zod.md',
    sourcePath: 'plugins/engineering-paved-path/skills/zod/SKILL.md',
    searchText: 'safeParse z.object inference',
  },
  {
    id: 'skill:sdd-engineering:run-plan',
    type: 'skill',
    name: 'run-plan',
    namespacedName: 'sdd-engineering:run-plan',
    plugin: 'sdd-engineering',
    description: 'Manual spec-driven development orchestrator',
    manualOnly: true,
    argumentHint: '<slug> [feature request…]',
    thirdParty: false,
    body: 'bodies/skill--sdd-engineering--run-plan.md',
    sourcePath: 'plugins/sdd-engineering/skills/run-plan/SKILL.md',
    searchText: 'gates G1 G2 spec plan implement verify',
  },
  {
    id: 'agent:research-tools:researcher',
    type: 'agent',
    name: 'researcher',
    namespacedName: 'research-tools:researcher',
    plugin: 'research-tools',
    description: 'Read-only researcher with file:line evidence',
    model: 'sonnet',
    tools: ['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'],
    disallowedTools: ['Write', 'Edit'],
    body: 'bodies/agent--research-tools--researcher.md',
    sourcePath: 'plugins/research-tools/agents/researcher.md',
    searchText: 'external research official docs changelogs',
  },
];

export const fixture: CatalogData = {
  index: {
    generatedAt: '2026-10-21T00:00:00.000Z',
    marketplace: {
      name: 'demo-market',
      description: 'Demo marketplace',
      owner: 'team',
      repository: 'https://github.com/acme/demo-market',
      githubSlug: 'acme/demo-market',
    },
    plugins,
    artifacts,
  },
  releases: [
    { plugin: 'research-tools', version: '1.0.0', tag: 'research-tools--v1.0.0', released: true, date: '2026-10-22', notes: '### Added\n- researcher' },
    { plugin: 'sdd-engineering', version: '1.0.0', tag: 'sdd-engineering--v1.0.0', released: false, date: null, notes: '- workflow' },
  ],
  stats: {
    plugins: 4,
    skills: 2,
    agents: 1,
    evalCases: 1,
    thirdPartySkills: 1,
    releasedVersions: 1,
    commit: 'abcdef1234567',
    generatedAt: '2026-10-21T00:00:00.000Z',
  },
};
