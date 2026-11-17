import type { ArchEdge, ArchGraph, ArchNode, Scenario } from './schema';

export interface GraphIndex {
  graph: ArchGraph;
  byId: Map<string, ArchNode>;
  children: Map<string | null, ArchNode[]>;
  edgeById: Map<string, ArchEdge>;
}

export function indexGraph(graph: ArchGraph): GraphIndex {
  const byId = new Map<string, ArchNode>();
  const children = new Map<string | null, ArchNode[]>();
  for (const n of graph.nodes) byId.set(n.id, n);
  for (const n of graph.nodes) {
    const p = n.parent && byId.has(n.parent) ? n.parent : null;
    const list = children.get(p) ?? [];
    list.push(n);
    children.set(p, list);
  }
  const edgeById = new Map(graph.edges.map((e) => [e.id, e]));
  return { graph, byId, children, edgeById };
}

export function ancestors(idx: GraphIndex, id: string): string[] {
  const out: string[] = [];
  let cur = idx.byId.get(id)?.parent;
  while (cur && idx.byId.has(cur) && !out.includes(cur)) {
    out.push(cur);
    cur = idx.byId.get(cur)?.parent;
  }
  return out;
}

export function hasChildren(idx: GraphIndex, id: string): boolean {
  return (idx.children.get(id)?.length ?? 0) > 0;
}

export function layerOf(idx: GraphIndex, id: string): string | undefined {
  let n = idx.byId.get(id);
  while (n) {
    if (n.layer) return n.layer;
    n = n.parent ? idx.byId.get(n.parent) : undefined;
  }
  return undefined;
}

export interface VisibleEdge {
  id: string;
  source: string;
  target: string;
  /** underlying graph edges merged into this visible edge */
  members: ArchEdge[];
  aggregated: boolean;
}

export interface VisibleGraph {
  /** visible leaf-or-collapsed nodes (rendered as boxes) */
  nodes: ArchNode[];
  /** expanded groups that contain visible nodes (rendered as containers) */
  groups: ArchNode[];
  edges: VisibleEdge[];
  /** parent id in the visible tree (null = root of current view) */
  visibleParent: Map<string, string | null>;
}

/**
 * Compute what to draw.
 * - `root`: drill-down root (null = whole system). Only its descendants are shown.
 * - `expanded`: group ids whose children are shown inline. Others render as a single box.
 * Edges are lifted to the nearest visible ancestor and merged; internal edges disappear.
 */
export function visibleGraph(idx: GraphIndex, opts: { root?: string | null; expanded?: Set<string> } = {}): VisibleGraph {
  const root = opts.root ?? null;
  const expanded = opts.expanded ?? new Set<string>();
  const nodes: ArchNode[] = [];
  const groups: ArchNode[] = [];
  const visibleParent = new Map<string, string | null>();
  const repr = new Map<string, string>(); // any node id -> visible representative id

  const walk = (parent: string | null, visParent: string | null) => {
    for (const n of idx.children.get(parent) ?? []) {
      const kids = idx.children.get(n.id) ?? [];
      if (kids.length > 0 && expanded.has(n.id)) {
        groups.push(n);
        visibleParent.set(n.id, visParent);
        repr.set(n.id, n.id);
        walk(n.id, n.id);
      } else {
        nodes.push(n);
        visibleParent.set(n.id, visParent);
        markSubtree(n.id, n.id);
      }
    }
  };
  const markSubtree = (id: string, rep: string) => {
    repr.set(id, rep);
    for (const k of idx.children.get(id) ?? []) markSubtree(k.id, rep);
  };
  walk(root, null);

  const merged = new Map<string, VisibleEdge>();
  for (const e of idx.graph.edges) {
    const s = repr.get(e.source);
    const t = repr.get(e.target);
    if (!s || !t || s === t) continue;
    // edges to an expanded group itself are allowed (group-level dependency)
    const key = `${s}->${t}`;
    const ve = merged.get(key);
    if (ve) {
      ve.members.push(e);
      ve.aggregated = true;
    } else {
      merged.set(key, { id: s === e.source && t === e.target ? e.id : `agg:${key}`, source: s, target: t, members: [e], aggregated: !(s === e.source && t === e.target) });
    }
  }
  return { nodes, groups, edges: [...merged.values()], visibleParent };
}

/* ------------------------------------------------------------ scenarios */

export interface ScenarioDiff {
  added: Set<string>;
  removed: Set<string>;
  changed: Set<string>;
  addedEdges: Set<string>;
  removedEdges: Set<string>;
}

/** Apply a scenario patch → new graph + diff (for overlay rendering). Pure. */
export function applyScenario(graph: ArchGraph, scenario: Scenario): { graph: ArchGraph; diff: ScenarioDiff } {
  let nodes = graph.nodes.map((n) => ({ ...n }));
  let edges = graph.edges.map((e) => ({ ...e }));
  const diff: ScenarioDiff = { added: new Set(), removed: new Set(), changed: new Set(), addedEdges: new Set(), removedEdges: new Set() };

  for (const p of scenario.patch) {
    switch (p.op) {
      case 'addNode':
        nodes.push({ ...p.node, lifecycle: p.node.lifecycle ?? 'planned' });
        diff.added.add(p.node.id);
        break;
      case 'removeNode':
        diff.removed.add(p.id);
        break;
      case 'updateNode':
        nodes = nodes.map((n) => (n.id === p.id ? { ...n, ...(p.set as object) } : n));
        diff.changed.add(p.id);
        break;
      case 'replaceNode': {
        const old = nodes.find((n) => n.id === p.id);
        const next = { ...p.with, lifecycle: p.with.lifecycle ?? 'planned', parent: p.with.parent ?? old?.parent, layer: p.with.layer ?? old?.layer };
        nodes.push(next);
        diff.removed.add(p.id);
        diff.added.add(next.id);
        // rewire edges from old to new
        edges = edges.map((e) => {
          if (e.source !== p.id && e.target !== p.id) return e;
          const ne = { ...e, id: `${e.id}.${next.id}`, source: e.source === p.id ? next.id : e.source, target: e.target === p.id ? next.id : e.target, lifecycle: 'planned' as const };
          diff.addedEdges.add(ne.id);
          diff.removedEdges.add(e.id);
          return ne;
        });
        break;
      }
      case 'addEdge':
        edges.push({ ...p.edge, lifecycle: p.edge.lifecycle ?? 'planned' });
        diff.addedEdges.add(p.edge.id);
        break;
      case 'removeEdge':
        diff.removedEdges.add(p.id);
        break;
    }
  }
  // Removed nodes stay in the graph (rendered as ghosts) but edges are cut.
  nodes = nodes.map((n) => (diff.removed.has(n.id) ? { ...n, lifecycle: 'deprecated' as const } : n));
  edges = edges.filter((e) => !diff.removedEdges.has(e.id) || false);
  return { graph: { ...graph, nodes, edges }, diff };
}

/* --------------------------------------------------------------- impact */

export interface Impact {
  /** nodes directly connected (both directions) */
  direct: string[];
  /** nodes reachable from upstream callers (transitively depend on target) */
  upstream: string[];
  /** contracts the replacement must keep (from inbound edges + node contracts) */
  mustKeep: string[];
  /** flows that pass through the target */
  flows: string[];
}

/**
 * Deterministic blast radius if `id` (and its subtree) is replaced.
 * upstream = everyone that (transitively) calls into it — they are what breaks if the contract changes.
 */
export function impactOf(idx: GraphIndex, id: string): Impact {
  const subtree = new Set<string>([id]);
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const k of idx.children.get(cur) ?? []) if (!subtree.has(k.id)) { subtree.add(k.id); stack.push(k.id); }
  }
  const direct = new Set<string>();
  const callers = new Map<string, string[]>(); // target -> sources
  for (const e of idx.graph.edges) {
    const list = callers.get(e.target) ?? [];
    list.push(e.source);
    callers.set(e.target, list);
    if (subtree.has(e.source) && !subtree.has(e.target)) direct.add(e.target);
    if (subtree.has(e.target) && !subtree.has(e.source)) direct.add(e.source);
  }
  const upstream = new Set<string>();
  const q = [...subtree];
  while (q.length) {
    const cur = q.shift()!;
    for (const s of callers.get(cur) ?? []) {
      if (subtree.has(s) || upstream.has(s)) continue;
      upstream.add(s);
      q.push(s);
    }
  }
  const node = idx.byId.get(id);
  const mustKeep = new Set<string>(node?.contracts?.exposes ?? []);
  for (const e of idx.graph.edges) {
    if (subtree.has(e.target) && !subtree.has(e.source)) {
      const label = typeof e.label === 'string' ? e.label : e.label ? Object.values(e.label)[0] : undefined;
      if (e.protocol || label) mustKeep.add([e.protocol, label].filter(Boolean).join(': '));
    }
  }
  const flows = (idx.graph.flows ?? [])
    .filter((f) => f.steps.some((s) => subtree.has(s.from) || subtree.has(s.to)))
    .map((f) => f.id);
  return { direct: [...direct], upstream: [...upstream], mustKeep: [...mustKeep], flows };
}
