import { applyScenario } from './graph';
import { FormatRegistry } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { Graph, ViewState, SCHEMA_VERSION, type ArchGraph } from './schema';

if (!FormatRegistry.Has('date-time')) FormatRegistry.Set('date-time', (v) => !Number.isNaN(Date.parse(v)));

export interface Issue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

/** Structural (schema) + semantic (referential integrity) validation. Pure; works in Node & browser. */
export function validateGraph(input: unknown, scenarios = true): ValidationResult {
  const issues: Issue[] = [];

  if (input && typeof input === 'object' && (input as any).version === '1.0') {
    issues.push({ level: 'error', path: '/version', message: 'This is a v1 graph. Run `archray migrate <file>` to upgrade to v2.' });
    return finalize(issues);
  }

  for (const e of Value.Errors(Graph, input)) {
    issues.push({ level: 'error', path: e.path || '/', message: e.message });
    if (issues.length > 50) break;
  }
  if (issues.length > 0) return finalize(issues);

  semantic(input as ArchGraph, issues);
  if(scenarios && !issues.some(i=>i.level==='error')) {
    const g=input as ArchGraph; const ids=new Set<string>();
    (g.scenarios ?? []).forEach((s,i)=>{
      if(ids.has(s.id)) issues.push({level:'error',path:`/scenarios/${i}/id`,message:'duplicate scenario id'});
      ids.add(s.id);
      try { applyScenario(g,s); } catch(e) { issues.push({level:'error',path:`/scenarios/${i}/patch`,message:String(e)}); }
    });
  }
  return finalize(issues);
}

export function validateView(input: unknown): ValidationResult {
  const issues: Issue[] = [];
  for (const e of Value.Errors(ViewState, input)) issues.push({ level: 'error', path: e.path || '/', message: e.message });
  return finalize(issues);
}

function finalize(issues: Issue[]): ValidationResult {
  const errors = issues.filter((i) => i.level === 'error');
  return { ok: errors.length === 0, errors, warnings: issues.filter((i) => i.level === 'warning') };
}

function semantic(g: ArchGraph, issues: Issue[]) {
  const err = (path: string, message: string) => issues.push({ level: 'error', path, message });
  const warn = (path: string, message: string) => issues.push({ level: 'warning', path, message });

  const locales = new Set(g.meta.locales);
  if (g.meta.defaultLocale && !locales.has(g.meta.defaultLocale)) {
    err('/meta/defaultLocale', `defaultLocale "${g.meta.defaultLocale}" not in meta.locales`);
  }

  const layerIds = new Set<string>();
  (g.layers ?? []).forEach((l, i) => {
    if (layerIds.has(l.id)) err(`/layers/${i}/id`, `duplicate layer id "${l.id}"`);
    layerIds.add(l.id);
  });

  const nodeIds = new Map<string, number>();
  g.nodes.forEach((n, i) => {
    if (nodeIds.has(n.id)) err(`/nodes/${i}/id`, `duplicate node id "${n.id}"`);
    nodeIds.set(n.id, i);
  });

  g.nodes.forEach((n, i) => {
    if (n.layer && !layerIds.has(n.layer)) err(`/nodes/${i}/layer`, `unknown layer "${n.layer}"`);
    if (n.parent) {
      if (!nodeIds.has(n.parent)) err(`/nodes/${i}/parent`, `unknown parent "${n.parent}"`);
      else if (n.parent === n.id) err(`/nodes/${i}/parent`, 'node cannot be its own parent');
    }
    if (!n.parent && !n.layer && layerIds.size > 0) warn(`/nodes/${i}/layer`, `top-level node "${n.id}" has no layer`);
    checkText(n.name, `/nodes/${i}/name`);
  });

  // parent cycles
  for (const n of g.nodes) {
    const seen = new Set<string>();
    let cur: string | undefined = n.id;
    while (cur) {
      if (seen.has(cur)) { err(`/nodes/${nodeIds.get(n.id)}/parent`, `parent cycle involving "${n.id}"`); break; }
      seen.add(cur);
      cur = g.nodes[nodeIds.get(cur) ?? -1]?.parent;
    }
  }

  const edgeIds = new Set<string>();
  g.edges.forEach((e, i) => {
    if (edgeIds.has(e.id)) err(`/edges/${i}/id`, `duplicate edge id "${e.id}"`);
    edgeIds.add(e.id);
    if (!nodeIds.has(e.source)) err(`/edges/${i}/source`, `unknown node "${e.source}"`);
    if (!nodeIds.has(e.target)) err(`/edges/${i}/target`, `unknown node "${e.target}"`);
  });

  const scenarioIds = new Set((g.scenarios ?? []).map((s) => s.id));

  g.nodes.forEach((n, i) => {
    n.alternatives?.options?.forEach((o, j) => {
      if (o.scenario && !scenarioIds.has(o.scenario)) err(`/nodes/${i}/alternatives/options/${j}/scenario`, `unknown scenario "${o.scenario}"`);
      (o.references ?? []).forEach((r, k) => {
        if (!/^https?:\/\//i.test(r)) warn(`/nodes/${i}/alternatives/options/${j}/references/${k}`, 'reference must be an http(s) URL');
      });
    });
  });

  (g.flows ?? []).forEach((f, i) => {
    f.steps.forEach((s, j) => {
      if (!nodeIds.has(s.from)) err(`/flows/${i}/steps/${j}/from`, `unknown node "${s.from}"`);
      if (!nodeIds.has(s.to)) err(`/flows/${i}/steps/${j}/to`, `unknown node "${s.to}"`);
      const linked=g.edges.find(e=>e.id===s.edge);
      if(linked && (linked.source!==s.from || linked.target!==s.to)) err(`/flows/${i}/steps/${j}/edge`, 'edge direction must match flow step');
      if (s.edge && !edgeIds.has(s.edge)) err(`/flows/${i}/steps/${j}/edge`, `unknown edge "${s.edge}"`);
    });
  });

  function checkText(t: unknown, path: string) {
    if (t && typeof t === 'object') {
      for (const k of Object.keys(t)) if (!locales.has(k)) warn(path, `locale "${k}" not declared in meta.locales`);
    }
  }
}

export { SCHEMA_VERSION };
