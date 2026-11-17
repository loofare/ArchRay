import { validateGraph } from './validate';
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
  const working = structuredClone(graph);
  let nodes = working.nodes;
  let edges = working.edges;
  let flows = working.flows ?? [];
  const diff: ScenarioDiff = { added: new Set(), removed: new Set(), changed: new Set(), addedEdges: new Set(), removedEdges: new Set() };
  const fail = (i: number, message: string): never => { throw Error(`scenario ${scenario.id} patch ${i}: ${message}`); };
  scenario.patch.forEach((p, i) => {
    if (['removeNode', 'updateNode', 'replaceNode'].includes(p.op) && !nodes.some(n => n.id === (p as any).id)) fail(i, 'unknown node');
    if (p.op === 'addNode' && nodes.some(n => n.id === p.node.id)) fail(i, 'duplicate node');
    if (p.op === 'replaceNode' && p.with.id !== p.id && nodes.some(n => n.id === p.with.id)) fail(i, 'duplicate replacement id');
    if (p.op === 'addEdge' && edges.some(e => e.id === p.edge.id)) fail(i, 'duplicate edge');
    if (p.op === 'removeEdge' && !edges.some(e => e.id === p.id)) fail(i, 'unknown edge');
    switch(p.op) {
      case 'addNode': nodes.push({...p.node, lifecycle:p.node.lifecycle ?? 'planned'}); diff.added.add(p.node.id); break;
      case 'updateNode':
        if ('id' in p.set) fail(i, 'update cannot change id');
        nodes = nodes.map(n => n.id === p.id ? {...n, ...p.set} : n); diff.changed.add(p.id); break;
      case 'replaceNode': {
        const old = nodes.find(n => n.id === p.id)!;
        const next = {...p.with, parent:p.with.parent ?? old.parent, layer:p.with.layer ?? old.layer, lifecycle:p.with.lifecycle ?? 'planned'};
        nodes = nodes.filter(n => n.id !== p.id).map(n => n.parent === p.id ? {...n,parent:next.id} : n); nodes.push(next);
        edges = edges.map(e => ({...e,source:e.source === p.id ? next.id : e.source,target:e.target === p.id ? next.id : e.target}));
        flows = flows.map(f=>({...f,steps:f.steps.map(s=>({...s,from:s.from === p.id ? next.id : s.from,to:s.to === p.id ? next.id : s.to}))}));
        diff.removed.add(p.id); diff.added.add(next.id); break;
      }
      case 'removeNode': {
        const removed = new Set([p.id]);
        let count=-1; while(count !== removed.size) {count=removed.size; for(const n of nodes) if(n.parent && removed.has(n.parent)) removed.add(n.id);}
        for(const id of removed) diff.removed.add(id);
        const cut = new Set(edges.filter(e=>removed.has(e.source)||removed.has(e.target)).map(e=>e.id));
        for(const id of cut) diff.removedEdges.add(id);
        nodes=nodes.filter(n=>!removed.has(n.id)); edges=edges.filter(e=>!cut.has(e.id));
        flows=flows.map(f=>({...f,steps:f.steps.filter(s=>!removed.has(s.from)&&!removed.has(s.to)&&!cut.has(s.edge ?? ''))})); break;
      }
      case 'addEdge': edges.push({...p.edge,lifecycle:p.edge.lifecycle ?? 'planned'}); diff.addedEdges.add(p.edge.id); break;
      case 'removeEdge': edges=edges.filter(e=>e.id!==p.id); flows=flows.map(f=>({...f,steps:f.steps.filter(s=>s.edge!==p.id)})); diff.removedEdges.add(p.id); break;
    }
    flows=flows.filter(f=>f.steps.length>0);
    const result=validateGraph({...working,nodes,edges,flows}, false);
    if(!result.ok) fail(i,result.errors.map(e=>`${e.path}: ${e.message}`).join('; '));
  });
  return {graph:{...working,nodes:nodes.map(n=>({...n,alternatives:n.alternatives ? {...n.alternatives,options:n.alternatives.options?.map(o=>({...o,scenario:undefined}))}:undefined})),edges,flows,scenarios:[]},diff};
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
