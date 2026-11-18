import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  applyScenario, boxesOverlap, computeLayout, impactOf, indexGraph, makeProjection, migrateV1,
  polylineHitsBox, t, validateGraph, visibleGraph, type ArchGraph,
} from '../src/index';

const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const fresh = load('../../examples/freshmart.graph.json') as ArchGraph;
const v1demo = load('../../examples/v1-demo-system.json');

function stress(n: number): ArchGraph {
  const layers = [0, 1, 2, 3].map((i) => ({ id: `l${i}`, name: { 'zh-CN': `第${i}层 测试层级名称` }, order: i }));
  const nodes = [] as ArchGraph['nodes'];
  const edges = [] as ArchGraph['edges'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) nodes.push({ id: `n${i}`, name: { 'zh-CN': `模块名称很长的服务${i}` }, kind: 'service', layer: `l${i % 4}` });
  for (let i = 0; i < n * 1.6; i++) {
    const a = Math.floor(rnd() * n), b = Math.floor(rnd() * n);
    if (a !== b) edges.push({ id: `e${i}`, source: `n${a}`, target: `n${b}` });
  }
  return { schemaVersion: '2.0', meta: { name: 'stress', locales: ['zh-CN'], generatedAt: '2026-01-01T00:00:00Z' }, layers, nodes, edges };
}

describe('contract', () => {
  it('fixture is valid', () => {
    const r = validateGraph(fresh);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
  it('rejects v1 with migrate hint', () => {
    expect(validateGraph(v1demo).errors[0]!.message).toMatch(/migrate/);
  });
  it('migrates v1 graphs into valid v2', () => {
    for (const g of [v1demo]) {
      const r = validateGraph(migrateV1(g));
      expect(r.errors).toEqual([]);
    }
  });
  it('warns on non-http reference links', () => {
    const g = structuredClone(fresh);
    g.nodes[0]!.alternatives = { replaceability: 'medium', options: [{ id: 'x', name: 'X', type: 'drop-in', summary: 'X', references: ['javascript:alert(1)', 'https://example.com'] }] };
    const warnings = validateGraph(g).warnings.map((w) => w.message).join('\n');
    expect(warnings).toMatch(/http\(s\) URL/);
  });
  it('rejects duplicate child ids in the flat node list', () => {
    const g = structuredClone(fresh);
    g.nodes.push({ ...g.nodes[0]!, id: 'web' });
    const errs = validateGraph(g).errors.map((e) => e.message).join('\n');
    expect(errs).toMatch(/duplicate node id "web"/);
  });
  it('catches referential errors', () => {
    const bad = structuredClone(fresh);
    bad.edges.push({ id: 'x', source: 'nope', target: 'web' });
    bad.nodes[0]!.parent = 'ghost';
    const msgs = validateGraph(bad).errors.map((e) => e.message).join('\n');
    expect(msgs).toMatch(/unknown node "nope"/);
    expect(msgs).toMatch(/unknown parent "ghost"/);
  });
  it('allows unknown fields and open kinds (forward compat)', () => {
    const g = structuredClone(fresh) as any;
    g.nodes[0].kind = 'edge-function';
    g.nodes[0].futureField = 1;
    expect(validateGraph(g).ok).toBe(true);
  });
});

describe('i18n', () => {
  it('falls back sensibly', () => {
    expect(t({ 'zh-CN': '订单', en: 'Order' }, 'zh-TW')).toBe('订单');
    expect(t({ en: 'Order' }, 'zh-CN')).toBe('Order');
    expect(t('Plain', 'en')).toBe('Plain');
  });
});

describe('graph ops', () => {
  const idx = indexGraph(fresh);
  it('collapses groups and lifts edges', () => {
    const v = visibleGraph(idx);
    expect(v.nodes.map((n) => n.id)).toContain('backend');
    expect(v.nodes.map((n) => n.id)).not.toContain('order');
    const e = v.edges.find((x) => x.source === 'gateway' && x.target === 'backend')!;
    expect(e.aggregated).toBe(true);
    expect(e.members.length).toBe(3);
  });
  it('expands groups', () => {
    const v = visibleGraph(idx, { expanded: new Set(['backend']) });
    expect(v.groups.map((n) => n.id)).toEqual(['backend']);
    expect(v.nodes.map((n) => n.id)).toContain('order');
  });
  it('computes impact deterministically', () => {
    const imp = impactOf(idx, 'payment');
    expect(imp.direct.sort()).toEqual(['order', 'stripe']);
    expect(imp.upstream).toEqual(expect.arrayContaining(['order', 'gateway', 'web', 'mobile']));
    expect(imp.flows).toEqual(['checkout']);
  });
  it('applies replacement scenario', () => {
    const { graph, diff } = applyScenario(fresh, fresh.scenarios![0]!);
    expect(diff.added.has('clerk')).toBe(true);
    expect(graph.edges.some((e) => e.source === 'gateway' && e.target === 'clerk')).toBe(true);
    expect(validateGraph(graph).ok).toBe(true);
  });
});

describe('layout invariants', () => {
  const cases: [string, ArchGraph, Set<string>][] = [
    ['freshmart collapsed', fresh, new Set()],
    ['freshmart expanded', fresh, new Set(['backend'])],
    ['stress 40', stress(40), new Set()],
  ];
  for (const [name, g, expanded] of cases) {
    it(`${name}: no node overlap, edges avoid boxes, bands disjoint`, async () => {
      const idx = indexGraph(g);
      const vis = visibleGraph(idx, { expanded });
      const L = await computeLayout(idx, vis, { locale: 'zh-CN', defaultLocale: 'zh-CN' });
      expect(L.nodes.length).toBe(vis.nodes.length);
      for (let i = 0; i < L.nodes.length; i++)
        for (let j = i + 1; j < L.nodes.length; j++)
          expect(boxesOverlap(L.nodes[i]!, L.nodes[j]!), `${L.nodes[i]!.id} vs ${L.nodes[j]!.id}`).toBe(false);
      for (const e of L.edges)
        for (const n of L.nodes)
          if (n.id !== e.source && n.id !== e.target) expect(polylineHitsBox(e.points, n), `${e.id} through ${n.id}`).toBe(false);
      for (let i = 1; i < L.bands.length; i++) expect(L.bands[i]!.y).toBeGreaterThanOrEqual(L.bands[i - 1]!.y + L.bands[i - 1]!.h);
      // nodes inside their band
      for (const n of L.nodes.filter((n) => n.depth === 0)) {
        const b = L.bands.find((b) => b.layer.id === n.layer);
        if (b) expect(n.y >= b.y && n.y + n.h <= b.y + b.h).toBe(true);
      }
      // projections are monotonic in y within each column => order preserved
      for (const pid of ['iso', 'stack'] as const) {
        const pr = makeProjection(pid, L);
        const a = pr.project({ x: 0, y: 0 }), b = pr.project({ x: 0, y: 100 });
        expect(b.y).toBeGreaterThan(a.y);
      }
    });
  }
  it('places unlayered top-level nodes inside the first layer band', async () => {
    const g: ArchGraph = {
      schemaVersion: '2.0',
      meta: { name: 'unlayered', locales: ['en'], generatedAt: '2026-11-18T00:00:00Z' },
      layers: [{ id: 'client', name: 'Client', order: 0 }, { id: 'data', name: 'Data', order: 1 }],
      nodes: [
        { id: 'ui', name: 'UI', kind: 'client', layer: 'client' },
        { id: 'misc', name: 'Misc', kind: 'module' },
        { id: 'db', name: 'DB', kind: 'database', layer: 'data' },
      ],
      edges: [{ id: 'ud', source: 'ui', target: 'db' }],
    };
    const idx = indexGraph(g);
    const L = await computeLayout(idx, visibleGraph(idx), { locale: 'en', defaultLocale: 'en' });
    const misc = L.nodes.find((n) => n.id === 'misc')!;
    const band0 = L.bands[0]!;
    expect(misc.y >= band0.y && misc.y + misc.h <= band0.y + band0.h).toBe(true);
  });
});
