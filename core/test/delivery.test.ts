import { describe, it, expect } from 'vitest';
import {
  applyScenario, indexGraph, migrateV1, parseView, replacementPrompt, validateGraph, validateView,
  type ArchGraph, type Scenario,
} from '../src';

const base = (): ArchGraph => ({
  schemaVersion: '2.0',
  meta: { name: 'test', locales: ['en'], generatedAt: '2026-11-17T00:00:00Z' },
  nodes: [
    { id: 'a', name: 'a', kind: 'service' },
    { id: 'b', name: 'b', kind: 'service' },
    { id: 'child', parent: 'b', name: 'child', kind: 'service' },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b' }],
  flows: [{ id: 'f', name: 'f', steps: [{ from: 'a', to: 'b', edge: 'ab', action: 'call' }] }],
});

describe('scenario transactions', () => {
  it('rejects malformed patches before preview and leaves the input untouched', () => {
    const patches = [
      [{ op: 'removeNode', id: 'ghost' }],
      [{ op: 'addNode', node: { id: 'a', name: 'a', kind: 'service' } }],
      [{ op: 'updateNode', id: 'b', set: { name: null } }],
      [{ op: 'updateNode', id: 'b', set: { parent: 'child' } }],
      [{ op: 'removeEdge', id: 'ghost' }],
    ];
    for (const patch of patches) {
      const graph = base();
      const before = structuredClone(graph);
      const scenario = { id: 's', name: 's', patch } as Scenario;
      expect(validateGraph({ ...graph, scenarios: [scenario] }).ok).toBe(false);
      expect(() => applyScenario(graph, scenario)).toThrow(/patch/);
      expect(graph).toEqual(before);
    }
  });

  it('replaces a parent and remaps flow without modifying the base graph', () => {
    const graph = base();
    const before = structuredClone(graph);
    const result = applyScenario(graph, {
      id: 's', name: 's',
      patch: [{ op: 'replaceNode', id: 'b', with: { id: 'c', name: 'c', kind: 'service' } }],
    });
    expect(result.graph.nodes.find((n) => n.id === 'child')?.parent).toBe('c');
    expect(result.graph.flows?.[0]?.steps[0]).toMatchObject({ from: 'a', to: 'c', edge: 'ab' });
    expect(validateGraph(result.graph).ok).toBe(true);
    expect(graph).toEqual(before);
    expect(result.diff.removed.has('b')).toBe(true);
  });

  it('cascades target deletion and accepts ordered additions', () => {
    const graph = base();
    const result = applyScenario(graph, {
      id: 's', name: 's',
      patch: [
        { op: 'addNode', node: { id: 'new', name: 'new', kind: 'service' } },
        { op: 'updateNode', id: 'new', set: { name: 'updated' } },
        { op: 'removeNode', id: 'b' },
      ],
    });
    expect(result.graph.nodes.map((n) => n.id)).toEqual(['a', 'new']);
    expect(result.graph.edges).toEqual([]);
    expect(result.graph.flows).toEqual([]);
    expect(validateGraph(result.graph).ok).toBe(true);
  });
});

describe('v1 migration', () => {
  it('scopes local ids and edges and refuses ambiguous global references', () => {
    const v1: any = {
      version: '1.0',
      nodes: ['p', 'q'].map((id) => ({
        id, label: id, kind: 'service',
        children: {
          nodes: [{ id: 'x', label: 'x', kind: 'service' }, { id: 'y', label: 'y', kind: 'service' }],
          edges: [{ id: 'xy', source: 'x', target: 'y', status: 'bottleneck' }],
        },
      })),
      edges: [],
    };
    const graph = migrateV1(v1);
    expect(validateGraph(graph).ok).toBe(true);
    expect(graph.edges.map((e) => [e.source, e.target])).toEqual([['p/x', 'p/y'], ['q/x', 'q/y']]);
    expect(graph.extensions).toBeDefined();

    v1.edges = [{ id: 'bad', source: 'x', target: 'p' }];
    expect(() => migrateV1(v1)).toThrow(/Ambiguous/);
  });

  it('names metrics and edge status it cannot represent instead of dropping them silently', () => {
    const v1: any = {
      version: '1.0',
      nodes: [
        { id: 'a', label: 'A', kind: 'service', metrics: { loc: 10, latencyMs: '14ms', throughput: '2.4k req/s' } },
        { id: 'b', label: 'B', kind: 'service' },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b', status: 'bottleneck' }],
    };
    const graph = migrateV1(v1);
    const warnings = (graph.extensions as any).migration.warnings.join('\n');
    expect(warnings).toContain('latencyMs');
    expect(warnings).toContain('throughput');
    expect(warnings).toContain('bottleneck');
    expect(graph.nodes[0]!.metrics).toEqual({ loc: { value: 10, origin: 'estimated' } });
    expect((graph.extensions as any).migration.original.nodes[0].metrics.latencyMs).toBe('14ms');
  });
});

describe('view recovery and prompts', () => {
  it('recovers malformed views and round-trips supported fields', () => {
    const graph = base();
    expect(validateView({ viewVersion: '1', theme: 'bad' }).ok).toBe(false);

    const bad = parseView({ theme: 'bad', projection: 'bad', lens: 1, collapsed: 123, focus: 'ghost', camera: { x: 0, y: 0, zoom: -1 } }, graph);
    expect(bad.warnings).toHaveLength(6);
    expect(bad.view).toEqual({ viewVersion: '1' });

    const view = { viewVersion: '1', locale: 'en', theme: 'paper', projection: 'flat', lens: 'flow', focus: 'b', collapsed: ['b'], camera: { x: 12, y: 13, zoom: 2 } };
    expect(parseView(JSON.parse(JSON.stringify(view)), graph).view).toEqual(view);
  });

  it('prompts for review and plans only, with graph provenance', () => {
    const prompt = replacementPrompt(indexGraph(base()), 'b', null, 'en');
    expect(prompt).toContain('Wait for separate user authorization');
    expect(prompt).not.toContain('implement step 1');
    expect(prompt).toContain('commit: unknown');
    expect(prompt).toContain('Evidence is limited to the input graph');
  });
});
