/**
 * ArchRay Graph Contract v2 — SINGLE SOURCE OF TRUTH.
 *
 * From this file we derive:
 *  - TypeScript types (Static<...>)            -> viewer / core
 *  - JSON Schema (scripts/gen-schema.ts)       -> schema/archray.schema.json (for AI agents & editors)
 *  - Runtime validation (validate.ts)          -> CLI + viewer
 *
 * Design rules:
 *  - Open vocabularies: `kind`, `protocol` are free strings; renderer has a registry with fallback.
 *  - Lifecycle (exists?) and health (is it good?) are orthogonal.
 *  - Flat node list + `parent` => cross-level edges, collapsible groups, flows at any depth.
 *  - Every human-readable text is `LocalizedText` (plain string OR { locale: text }).
 *  - Measured vs estimated facts are explicit (`origin`).
 *  - Unknown fields are allowed (forward compatible); `extensions` is the official escape hatch.
 */
import { Type, type Static, type TSchema } from '@sinclair/typebox';

export const SCHEMA_VERSION = '2.0';

const Id = Type.String({ minLength: 1, pattern: '^[A-Za-z0-9][A-Za-z0-9._:/-]*$', description: 'Stable kebab/slug id. Never translated.' });

export const LocalizedText = Type.Union(
  [
    Type.String(),
    Type.Record(Type.String({ pattern: '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' }), Type.String(), {
      description: 'Map of BCP-47 locale -> text, e.g. { "zh-CN": "订单服务", "en": "Order Service" }',
    }),
  ],
  { description: 'Plain string (in meta.defaultLocale) or per-locale map.' }
);

const Open = <T extends TSchema>(t: T) => t; // marker: object allows unknown keys (default in TypeBox)

/* ---------------------------------------------------------------- vocab */

export const KNOWN_NODE_KINDS = [
  'client', 'cli', 'gateway', 'service', 'worker', 'function', 'library', 'module',
  'database', 'cache', 'queue', 'storage', 'search', 'external-api', 'ai-model', 'config', 'group',
  'saas', 'archive',
] as const;

export const KNOWN_PROTOCOLS = [
  'http', 'grpc', 'graphql', 'ws', 'sse', 'amqp', 'kafka', 'sql', 'redis', 'ipc', 'import', 'fs', 'llm', 'event',
] as const;

export const Lifecycle = Type.Union(
  [Type.Literal('active'), Type.Literal('planned'), Type.Literal('deprecated')],
  { description: 'Does it exist? Orthogonal to health.' }
);

export const HealthLevel = Type.Union([
  Type.Literal('good'), Type.Literal('warn'), Type.Literal('critical'), Type.Literal('unknown'),
]);

export const Origin = Type.Union([Type.Literal('measured'), Type.Literal('estimated')], {
  description: 'measured = produced by a tool (archray scan, cloc...). estimated = AI judgement.',
});

export const Level3 = Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')]);
export const Effort = Type.Union([Type.Literal('S'), Type.Literal('M'), Type.Literal('L'), Type.Literal('XL')]);

/* ---------------------------------------------------------------- parts */

export const Metric = Type.Object({
  value: Type.Number(),
  unit: Type.Optional(Type.String()),
  origin: Origin,
});

export const Finding = Open(Type.Object({
  type: Type.String({ description: 'bottleneck | complexity | coupling | security | dead-code | ... (open)' }),
  severity: Type.Union([Type.Literal('info'), Type.Literal('warn'), Type.Literal('critical')]),
  text: LocalizedText,
  evidence: Type.Optional(Type.Array(Type.String(), { description: 'Repo-relative paths (optionally path:line).' })),
}));

export const Health = Open(Type.Object({
  level: HealthLevel,
  findings: Type.Optional(Type.Array(Finding)),
}));

export const AlternativeOption = Open(Type.Object({
  id: Id,
  name: LocalizedText,
  type: Type.Union(
    [Type.Literal('drop-in'), Type.Literal('managed'), Type.Literal('re-architect'), Type.Literal('remove')],
    { description: 'drop-in: same contract swap; managed: SaaS/cloud service; re-architect: change shape; remove: delete it.' }
  ),
  summary: LocalizedText,
  pros: Type.Optional(Type.Array(LocalizedText)),
  cons: Type.Optional(Type.Array(LocalizedText)),
  effort: Type.Optional(Effort),
  risk: Type.Optional(Level3),
  techStack: Type.Optional(Type.Array(Type.String())),
  scenario: Type.Optional(Id),
  references: Type.Optional(Type.Array(Type.String({ description: 'URL' }))),
}));

export const Alternatives = Open(Type.Object({
  replaceability: Level3,
  rationale: Type.Optional(LocalizedText),
  lockIn: Type.Optional(Type.Array(LocalizedText, { description: 'What couples this node to its current implementation.' })),
  options: Type.Optional(Type.Array(AlternativeOption)),
}));

export const Layer = Open(Type.Object({
  id: Id,
  name: LocalizedText,
  order: Type.Integer({ minimum: 0, description: '0 = user-facing / top' }),
  description: Type.Optional(LocalizedText),
  color: Type.Optional(Type.String({ pattern: '^#[0-9A-Fa-f]{6}$' })),
}));

export const Node = Open(Type.Object({
  id: Id,
  name: LocalizedText,
  kind: Type.String({ minLength: 1, description: `Open. Known: ${KNOWN_NODE_KINDS.join(', ')}` }),
  parent: Type.Optional(Id),
  layer: Type.Optional(Id),
  summary: Type.Optional(LocalizedText),
  description: Type.Optional(LocalizedText),
  lifecycle: Type.Optional(Lifecycle),
  health: Type.Optional(Health),
  techStack: Type.Optional(Type.Array(Type.String())),
  sourcePaths: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
  metrics: Type.Optional(Type.Record(Type.String(), Metric)),
  contracts: Type.Optional(Type.Object({
    exposes: Type.Optional(Type.Array(Type.String())),
    consumes: Type.Optional(Type.Array(Type.String())),
  })),
  alternatives: Type.Optional(Alternatives),
  extensions: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}));

export const Edge = Open(Type.Object({
  id: Id,
  source: Id,
  target: Id,
  label: Type.Optional(LocalizedText),
  protocol: Type.Optional(Type.String({ description: `Open. Known: ${KNOWN_PROTOCOLS.join(', ')}` })),
  mode: Type.Optional(Type.Union([Type.Literal('sync'), Type.Literal('async')])),
  lifecycle: Type.Optional(Lifecycle),
  weight: Type.Optional(Level3),
  extensions: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}));

export const FlowStep = Open(Type.Object({
  from: Id,
  to: Id,
  edge: Type.Optional(Id),
  action: LocalizedText,
  payload: Type.Optional(Type.String()),
  latencyMs: Type.Optional(Type.Number()),
}));

export const Flow = Open(Type.Object({
  id: Id,
  name: LocalizedText,
  description: Type.Optional(LocalizedText),
  category: Type.Optional(Type.String({ description: 'core | async | ops | ... (open)' })),
  steps: Type.Array(FlowStep, { minItems: 1 }),
}));

export const ScenarioPatch = Type.Union([
  Type.Object({ op: Type.Literal('addNode'), node: Node }),
  Type.Object({ op: Type.Literal('removeNode'), id: Id }),
  Type.Object({ op: Type.Literal('updateNode'), id: Id, set: Type.Record(Type.String(), Type.Unknown()) }),
  Type.Object({ op: Type.Literal('replaceNode'), id: Id, with: Node, description: Type.Optional(Type.String()) }),
  Type.Object({ op: Type.Literal('addEdge'), edge: Edge }),
  Type.Object({ op: Type.Literal('removeEdge'), id: Id }),
]);

export const Scenario = Open(Type.Object({
  id: Id,
  name: LocalizedText,
  description: Type.Optional(LocalizedText),
  kind: Type.Optional(Type.Union([Type.Literal('replacement'), Type.Literal('evolution'), Type.Literal('removal')])),
  patch: Type.Array(ScenarioPatch),
}));

export const Meta = Open(Type.Object({
  name: LocalizedText,
  description: Type.Optional(LocalizedText),
  locales: Type.Array(Type.String(), { minItems: 1, description: 'Locales present in this graph. First = default if defaultLocale omitted.' }),
  defaultLocale: Type.Optional(Type.String()),
  generatedAt: Type.String({ format: 'date-time' }),
  generator: Type.Optional(Type.String({ description: 'e.g. "claude-code/archray-skill@2"' })),
  repo: Type.Optional(Type.Object({
    url: Type.Optional(Type.String()),
    commit: Type.Optional(Type.String()),
    root: Type.Optional(Type.String()),
  })),
  stats: Type.Optional(Type.Record(Type.String(), Metric)),
}));

export const Graph = Open(Type.Object({
  $schema: Type.Optional(Type.String()),
  schemaVersion: Type.Literal(SCHEMA_VERSION),
  meta: Meta,
  layers: Type.Optional(Type.Array(Layer)),
  nodes: Type.Array(Node, { minItems: 1 }),
  edges: Type.Array(Edge),
  flows: Type.Optional(Type.Array(Flow)),
  scenarios: Type.Optional(Type.Array(Scenario)),
  extensions: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, {
  $id: 'https://archray.dev/schema/v2/graph.json',
  title: 'ArchRay Graph v2',
  description: 'Semantic architecture graph produced by an AI agent (and archray scan) and rendered by the ArchRay engine. Contains NO coordinates.',
}));

/* ------------------------------------------------- view.json (user state) */

export const ViewState = Open(Type.Object({
  $schema: Type.Optional(Type.String()),
  viewVersion: Type.Literal('1'),
  locale: Type.Optional(Type.String()),
  theme: Type.Optional(Type.Union([Type.Literal('midnight'),Type.Literal('paper'),Type.Literal('blueprint'),Type.Literal('glass')])),
  projection: Type.Optional(Type.Union([
    Type.Literal('3d'), Type.Literal('2d'),
    Type.Literal('flat'), Type.Literal('iso'), Type.Literal('stack'),
  ])),
  lens: Type.Optional(Type.Union([Type.Literal('topology'),Type.Literal('health'),Type.Literal('replaceability'),Type.Literal('flow')])),
  focus: Type.Optional(Id),
  collapsed: Type.Optional(Type.Array(Id)),
  layers: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { description: 'Canonical architecture layers to focus; empty means all.' })),
  motion: Type.Optional(Type.Union([Type.Literal('full'), Type.Literal('calm'), Type.Literal('off')], { description: 'Ambient motion level; defaults to calm when the system asks for reduced motion.' })),
  hidden: Type.Optional(Type.Array(Id)),
  pinned: Type.Optional(Type.Record(Id, Type.Object({ x: Type.Number(), y: Type.Number() }), { description: 'Manual position overrides in layout space.' })),
  scenario: Type.Optional(Id),
  camera: Type.Optional(Type.Object({
    x: Type.Number(), y: Type.Number(),
    zoom: Type.Number({minimum:0.1,maximum:20}),
    rotate: Type.Optional(Type.Number({minimum:-30,maximum:30})),
  })),
}, { $id: 'https://archray.dev/schema/v2/view.json', title: 'ArchRay View State' }));

/* ---------------------------------------------------------------- types */

export type LocalizedText = Static<typeof LocalizedText>;
export type Lifecycle = Static<typeof Lifecycle>;
export type HealthLevel = Static<typeof HealthLevel>;
export type Metric = Static<typeof Metric>;
export type Finding = Static<typeof Finding>;
export type Health = Static<typeof Health>;
export type AlternativeOption = Static<typeof AlternativeOption>;
export type Alternatives = Static<typeof Alternatives>;
export type ArchLayer = Static<typeof Layer>;
export type ArchNode = Static<typeof Node>;
export type ArchEdge = Static<typeof Edge>;
export type FlowStep = Static<typeof FlowStep>;
export type ArchFlow = Static<typeof Flow>;
export type ScenarioPatch = Static<typeof ScenarioPatch>;
export type Scenario = Static<typeof Scenario>;
export type GraphMeta = Static<typeof Meta>;
export type ArchGraph = Static<typeof Graph>;
export type ViewState = Static<typeof ViewState>;
