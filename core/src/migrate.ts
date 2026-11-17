import { SCHEMA_VERSION, type ArchEdge, type ArchGraph, type ArchNode, type HealthLevel, type Lifecycle } from './schema';

/** Upgrade a v1 graph (initial prototype) to v2. Lossless for all v1 fields. */
export function migrateV1(v1: any, locale = 'en'): ArchGraph {
  const nodes: ArchNode[] = [];
  const edges: ArchEdge[] = [];

  const statusMap = (s: string): { lifecycle: Lifecycle; level: HealthLevel; finding?: string } => {
    switch (s) {
      case 'planned': return { lifecycle: 'planned', level: 'unknown' };
      case 'deprecated': return { lifecycle: 'deprecated', level: 'warn' };
      case 'bottleneck': return { lifecycle: 'active', level: 'warn', finding: 'bottleneck' };
      case 'high-complexity': return { lifecycle: 'active', level: 'critical', finding: 'complexity' };
      default: return { lifecycle: 'active', level: 'good' };
    }
  };

  const convertNode = (n: any, parent?: string) => {
    const st = statusMap(n.status);
    const metrics: Record<string, { value: number; origin: 'estimated' }> = {};
    for (const k of ['complexity', 'coupling', 'loc'] as const) {
      if (typeof n.metrics?.[k] === 'number') metrics[k] = { value: n.metrics[k], origin: 'estimated' };
    }
    const node: ArchNode = {
      id: n.id,
      name: n.label,
      kind: n.kind,
      ...(parent ? { parent } : {}),
      layer: n.layerId,
      ...(n.subtitle ? { summary: n.subtitle } : {}),
      description: n.description,
      lifecycle: st.lifecycle,
      health: {
        level: st.level,
        ...(st.finding || n.refactorNotes
          ? { findings: [{ type: st.finding ?? 'note', severity: st.level === 'critical' ? 'critical' : st.level === 'warn' ? 'warn' : 'info', text: n.refactorNotes ?? st.finding! }] }
          : {}),
      },
      techStack: n.techStack ?? [],
      sourcePaths: n.sourcePaths ?? [],
      ...(Object.keys(metrics).length ? { metrics } : {}),
      ...(n.contracts ? { contracts: n.contracts } : {}),
    };
    nodes.push(node);
    for (const c of n.children?.nodes ?? []) convertNode(c, n.id);
    for (const e of n.children?.edges ?? []) edges.push(convertEdge(e));
  };
  const convertEdge = (e: any): ArchEdge => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.label ? { label: e.label } : {}),
    ...(e.protocol ? { protocol: e.protocol === 'llm-stream' ? 'llm' : e.protocol } : {}),
    lifecycle: e.status === 'planned' ? 'planned' : 'active',
    ...(e.bandwidth ? { weight: e.bandwidth } : {}),
  });

  for (const n of v1.nodes ?? []) convertNode(n);
  for (const e of v1.edges ?? []) edges.push(convertEdge(e));

  // Child nodes in v1 may reuse ids across subgraphs; make ids unique by prefixing parent.
  const seen = new Map<string, number>();
  for (const n of nodes) seen.set(n.id, (seen.get(n.id) ?? 0) + 1);

  const stats: Record<string, { value: number; origin: 'estimated' }> = {};
  for (const [k, v] of Object.entries(v1.meta?.stats ?? {})) if (typeof v === 'number') stats[k] = { value: v, origin: 'estimated' };

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      name: v1.meta?.name ?? 'Untitled',
      description: v1.meta?.description ?? '',
      locales: [locale],
      generatedAt: v1.meta?.generatedAt ?? new Date().toISOString(),
      generator: 'archray migrate v1->v2',
      ...(v1.meta?.repoRoot ? { repo: { root: v1.meta.repoRoot } } : {}),
      ...(Object.keys(stats).length ? { stats } : {}),
    },
    layers: (v1.layers ?? []).map((l: any) => ({ id: l.id, name: l.label, order: l.order, ...(l.color ? { color: l.color } : {}), ...(l.description ? { description: l.description } : {}) })),
    nodes,
    edges,
    flows: (v1.flows ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      ...(f.category ? { category: f.category } : {}),
      steps: f.steps.map((s: any) => ({ from: s.from, to: s.to, ...(s.edgeId ? { edge: s.edgeId } : {}), action: s.action, payload: s.payload, ...(s.latencyMs !== undefined ? { latencyMs: s.latencyMs } : {}) })),
    })),
  };
}
