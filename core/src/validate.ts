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
  const hasNonZh = g.meta.locales.some((l) => !l.startsWith('zh'));
  const hasCjkLocale = g.meta.locales.some((l) => /^(zh|ja|ko)/i.test(l));
  const declaredLangs = new Set(g.meta.locales.map((l) => l.split('-')[0]!));
  const suspiciousDoubleQ: { path: string; sample: string }[] = [];
  const emittedCorruptPaths = new Set<string>();
  if (g.meta.defaultLocale && !locales.has(g.meta.defaultLocale)) {
    err('/meta/defaultLocale', `defaultLocale "${g.meta.defaultLocale}" not in meta.locales`);
  }
  checkText(g.meta.name, '/meta/name', 'primary');
  checkText(g.meta.description, '/meta/description', 'detail');

  const layerIds = new Set<string>();
  (g.layers ?? []).forEach((l, i) => {
    if (layerIds.has(l.id)) err(`/layers/${i}/id`, `duplicate layer id "${l.id}"`);
    layerIds.add(l.id);
    checkText(l.name, `/layers/${i}/name`, 'primary');
    checkText(l.description, `/layers/${i}/description`, 'detail');
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
    checkText(n.name, `/nodes/${i}/name`, 'primary');
    checkText(n.summary, `/nodes/${i}/summary`, 'summary');
    checkText(n.description, `/nodes/${i}/description`, 'detail');
    n.health?.findings?.forEach((f, j) => checkText(f.text, `/nodes/${i}/health/findings/${j}/text`, 'detail'));
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
    checkText(e.label, `/edges/${i}/label`, 'summary');
  });

  const scenarioIds = new Set((g.scenarios ?? []).map((s) => s.id));

  g.nodes.forEach((n, i) => {
    checkText(n.alternatives?.rationale, `/nodes/${i}/alternatives/rationale`, 'detail');
    n.alternatives?.lockIn?.forEach((x, j) => checkText(x, `/nodes/${i}/alternatives/lockIn/${j}`, 'detail'));
    n.alternatives?.options?.forEach((o, j) => {
      checkText(o.name, `/nodes/${i}/alternatives/options/${j}/name`, 'detail');
      checkText(o.summary, `/nodes/${i}/alternatives/options/${j}/summary`, 'detail');
      o.pros?.forEach((x, k) => checkText(x, `/nodes/${i}/alternatives/options/${j}/pros/${k}`, 'detail'));
      o.cons?.forEach((x, k) => checkText(x, `/nodes/${i}/alternatives/options/${j}/cons/${k}`, 'detail'));
      if (o.scenario && !scenarioIds.has(o.scenario)) err(`/nodes/${i}/alternatives/options/${j}/scenario`, `unknown scenario "${o.scenario}"`);
      (o.references ?? []).forEach((r, k) => {
        if (!/^https?:\/\//i.test(r)) warn(`/nodes/${i}/alternatives/options/${j}/references/${k}`, 'reference must be an http(s) URL');
      });
    });
  });

  (g.flows ?? []).forEach((f, i) => {
    checkText(f.name, `/flows/${i}/name`, 'summary');
    checkText(f.description, `/flows/${i}/description`, 'detail');
    f.steps.forEach((s, j) => {
      checkText(s.action, `/flows/${i}/steps/${j}/action`, 'summary');
      if (!nodeIds.has(s.from)) err(`/flows/${i}/steps/${j}/from`, `unknown node "${s.from}"`);
      if (!nodeIds.has(s.to)) err(`/flows/${i}/steps/${j}/to`, `unknown node "${s.to}"`);
      const linked=g.edges.find(e=>e.id===s.edge);
      if(linked && (linked.source!==s.from || linked.target!==s.to)) err(`/flows/${i}/steps/${j}/edge`, 'edge direction must match flow step');
      if (s.edge && !edgeIds.has(s.edge)) err(`/flows/${i}/steps/${j}/edge`, `unknown edge "${s.edge}"`);
    });
  });

  (g.scenarios ?? []).forEach((s, i) => {
    checkText(s.name, `/scenarios/${i}/name`, 'summary');
    checkText(s.description, `/scenarios/${i}/description`, 'detail');
  });

  if (suspiciousDoubleQ.length > 0) {
    const uniqueSuspicious = suspiciousDoubleQ.filter((item, idx, arr) => arr.findIndex((x) => x.path === item.path) === idx);
    if (uniqueSuspicious.length >= 2 || (uniqueSuspicious.length >= 1 && hasCjkLocale)) {
      let emitted = 0;
      for (const item of uniqueSuspicious) {
        if (emittedCorruptPaths.has(item.path)) continue;
        emittedCorruptPaths.add(item.path);
        err(
          item.path,
          `corrupted text (looks like '?' placeholders from non-UTF-8 encoding, e.g. "${item.sample}"); rewrite .archray/graph.json as UTF-8 without BOM (avoid Windows PowerShell Set-Content/Out-File default encodings)`,
        );
        emitted += 1;
        if (emitted >= 5) break;
      }
    }
  }

  function inspectTextValue(s: string, path: string, role: 'primary' | 'summary' | 'detail') {
    if (emittedCorruptPaths.has(path)) return;
    if (s.includes('\uFFFD')) {
      emittedCorruptPaths.add(path);
      err(path, 'corrupted UTF-8 text (contains replacement character "\\uFFFD"); rewrite .archray/graph.json as UTF-8 without BOM');
      return;
    }
    const isAllQPrimary = role === 'primary' && (s.match(/\?/g)?.length ?? 0) >= 2 && /^[?\s.,·•/\\\-_:;()[\]{}]+$/.test(s);
    const hasLongQRun = (role === 'primary' || role === 'summary') ? /\?{3,}/.test(s) : /\?{4,}/.test(s);
    if (isAllQPrimary || hasLongQRun) {
      emittedCorruptPaths.add(path);
      err(
        path,
        `corrupted text (looks like '?' placeholders from non-UTF-8 encoding, e.g. "${s.slice(0, 48)}"); rewrite .archray/graph.json as UTF-8 without BOM (avoid Windows PowerShell Set-Content/Out-File default encodings)`,
      );
      return;
    }
    if (
      (role === 'primary' || role === 'summary') &&
      /(?:^|[\s/(\[，、])\?{2}$|^\?{2}(?:$|[\s/)\]，、])|[A-Za-z0-9]\?{2}|\?{2}[A-Za-z0-9]/.test(s)
    ) {
      suspiciousDoubleQ.push({ path, sample: s.slice(0, 48) });
    }
  }

  function checkText(t: unknown, path: string, role: 'primary' | 'summary' | 'detail' = 'detail') {
    if (t === undefined || t === null) return;
    if (typeof t === 'string') {
      inspectTextValue(t, path, role);
      if (g.meta.locales.length > 1 && hasNonZh && /[\u2E80-\u9FFF\uF900-\uFAFF]/.test(t)) {
        warn(path, 'plain CJK text in multi-locale graph; provide translations for all meta.locales');
      }
      return;
    }
    if (typeof t === 'object') {
      const obj = t as Record<string, unknown>;
      const keys = Object.keys(obj);
      for (const k of keys) {
        const val = obj[k];
        if (typeof val === 'string') inspectTextValue(val, path, role);
      }
      const langs = new Set(keys.map((k) => k.split('-')[0]!));
      for (const k of keys) if (!locales.has(k)) warn(path, `locale "${k}" not declared in meta.locales`);
      if (g.meta.locales.length > 1) {
        for (const loc of g.meta.locales) {
          if (!keys.includes(loc) && !langs.has(loc.split('-')[0]!)) {
            warn(path, `missing translation for "${loc}"`);
          }
        }
        // Satisfy TypeScript unused-check cleanly if declaredLangs not needed elsewhere
        void declaredLangs;
      }
    }
  }
}

export { SCHEMA_VERSION };
