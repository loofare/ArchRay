import type { ArchGraph, ArchLayer, LocalizedText } from './schema';
import { t } from './i18n';

/**
 * Canonical architecture layers. Graphs may use their own layer ids; the global
 * aliases help users type "前端" or "data", while a graph's own ids stay valid.
 */
export interface LayerDef {
  id: string;
  label: LocalizedText;
  order: number;
  aliases: string[];
}

export const LAYERS: LayerDef[] = [
  { id: 'client', order: 0, label: { en: 'Clients & frontend', zh: '客户端与前端' }, aliases: ['前端', '客户端', '用户端', '界面', 'ui', 'frontend', 'front-end', 'web', 'mobile', 'client', 'presentation', 'spa'] },
  { id: 'edge', order: 1, label: { en: 'Network & delivery', zh: '网络与传输' }, aliases: ['网络', '传输', '网络层', '传输层', '分发', '静态资源', '接入层', 'network', 'transport', 'edge', 'cdn', 'dns', 'delivery', 'http', 'access', 'access-layer'] },
  { id: 'gateway', order: 2, label: { en: 'Security & gateway', zh: '安全与网关' }, aliases: ['网关', '安全', '安全网关', '鉴权', '权限', 'gateway', 'security', 'auth', 'waf', 'proxy', 'ingress', 'loadbalancer', 'load-balancer', 'lb'] },
  { id: 'service', order: 3, label: { en: 'Backend & middleware', zh: '后端与中间层' }, aliases: ['后端', '服务', '中间层', '业务', '业务层', '应用层', '应用服务', '应用服务层', 'backend', 'service', 'services', 'server', 'api', 'middleware', 'microservice', 'domain', 'application', 'application-services'] },
  { id: 'async', order: 4, label: { en: 'Async & automation', zh: '异步与自动化' }, aliases: ['异步', '任务', '队列', '消息', '调度', 'async', 'worker', 'job', 'jobs', 'queue', 'messaging', 'event', 'events', 'stream', 'cron', 'automation'] },
  { id: 'data', order: 5, label: { en: 'Data & storage', zh: '数据与存储' }, aliases: ['数据', '存储', '数据层', '数据库', '缓存', '数仓', 'data', 'storage', 'database', 'db', 'cache', 'warehouse', 'lake', 'search', 'vector'] },
  { id: 'ai', order: 6, label: { en: 'AI & models', zh: 'AI 与模型' }, aliases: ['ai', '模型', '智能', '算法', 'ml', 'model', 'models', 'llm', 'inference', 'embedding', 'agent'] },
  { id: 'external', order: 7, label: { en: 'External & SaaS', zh: '外部与 SaaS' }, aliases: ['外部', '第三方', '商业', 'saas', 'external', 'third-party', 'thirdparty', 'vendor', 'partner', 'api-external'] },
  { id: 'platform', order: 8, label: { en: 'Platform & infra', zh: '平台与基础设施' }, aliases: ['平台', '基础设施', '部署', '运维', 'infra', 'infrastructure', 'platform', 'devops', 'cloud', 'k8s', 'kubernetes', 'container', 'hosting', 'ci'] },
  { id: 'observability', order: 9, label: { en: 'Observability', zh: '可观测' }, aliases: ['监控', '日志', '可观测', '告警', 'observability', 'monitoring', 'logging', 'tracing', 'metrics', 'alerting'] },
];

const BY_ID = new Map(LAYERS.map((l) => [l.id, l]));
const BY_ALIAS = new Map<string, string>();
for (const l of LAYERS) {
  BY_ALIAS.set(l.id, l.id);
  for (const a of l.aliases) BY_ALIAS.set(a.toLowerCase(), l.id);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, '-');

/** Map a user token or layer label to a canonical layer id (global vocabulary only). */
export function canonicalLayer(token: string | undefined): string | null {
  if (!token) return null;
  const key = token.trim();
  return BY_ALIAS.get(key.toLowerCase()) ?? BY_ALIAS.get(norm(key)) ?? (BY_ID.has(key) ? key : null);
}

export function layerLabel(id: string, locale: string): string {
  const def = BY_ID.get(id);
  return def ? t(def.label, locale, 'en') : id;
}

export function layerOrder(id: string): number {
  return BY_ID.get(id)?.order ?? 99;
}

export interface ParsedLayers {
  layers: string[];
  unknown: string[];
}

const ALL_TOKENS = new Set(['all', '*', '全部', '所有', '全部层', 'everything']);

function splitLayers(input: string | string[] | undefined): string[] {
  return (Array.isArray(input) ? input : [input ?? ''])
    .flatMap((v) => String(v).split(/[,\s，、+]+/))
    .filter(Boolean);
}

/** Parse global aliases without a graph (used by tests and generic callers). */
export function parseLayers(input: string | string[] | undefined): ParsedLayers {
  const layers: string[] = [];
  const unknown: string[] = [];
  for (const token of splitLayers(input)) {
    if (ALL_TOKENS.has(token.toLowerCase())) continue;
    const id = canonicalLayer(token);
    if (id) {
      if (!layers.includes(id)) layers.push(id);
    } else {
      unknown.push(token);
    }
  }
  layers.sort((a, b) => layerOrder(a) - layerOrder(b));
  return { layers, unknown };
}

/* ------------------------------------------------------- graph layers */

/** Declared layers of a graph, plus node-only layer ids, in display order. */
export function graphLayerEntries(graph: ArchGraph): { id: string; label: LocalizedText; order: number }[] {
  const declared = new Map<string, ArchLayer>();
  for (const l of graph.layers ?? []) if (!declared.has(l.id)) declared.set(l.id, l);
  for (const n of graph.nodes) {
    if (!n.layer) continue;
    const key = graphLayerKey(graph, n.layer);
    if (key && !declared.has(key)) declared.set(key, { id: key, name: key, order: layerOrder(key) });
  }
  return [...declared.values()]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((l) => ({ id: l.id, label: l.name, order: l.order }));
}

export function graphLayers(graph: ArchGraph): string[] {
  return graphLayerEntries(graph).map((l) => l.id);
}

/** Localised label for a graph layer; custom ids fall back to the id. */
export function graphLayerLabel(graph: ArchGraph, id: string, locale: string): string {
  // Canonical ids keep the shared vocabulary; custom ids use the graph's own label.
  const canonical = BY_ID.get(id);
  if (canonical) return t(canonical.label, locale, 'en');
  const layer = graph.layers?.find((l) => l.id === id);
  if (layer) return t(layer.name, locale, 'en');
  return id;
}

const layerKeys = (layer: ArchLayer) => [layer.id, t(layer.name, 'en', 'en'), t(layer.name, 'zh-CN', 'en')]
  .map((v) => canonicalLayer(v))
  .filter((v): v is string => !!v);

/**
 * Resolve a node/layer token to the graph's own layer id.
 * The graph's declared ids win, then its names, then global aliases; unknown ids stay as-is.
 */
export function graphLayerKey(graph: ArchGraph, raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const declared = graph.layers ?? [];
  if (declared.some((l) => l.id === raw)) return raw;
  const canonical = canonicalLayer(raw);
  if (canonical) {
    const hit = declared.find((l) => layerKeys(l).includes(canonical));
    if (hit) return hit.id;
  }
  const byName = declared.find((l) => [t(l.name, 'en', 'en'), t(l.name, 'zh-CN', 'en')].some((n) => n.trim().toLowerCase() === raw.trim().toLowerCase()));
  return byName?.id ?? raw;
}

/** Resolve a user command token to a graph layer id, or null when the graph has no such layer. */
export function resolveGraphLayer(graph: ArchGraph, token: string): string | null {
  const key = graphLayerKey(graph, token);
  if (!key) return null;
  return graphLayers(graph).includes(key) ? key : null;
}

/** Parse layer tokens in the context of one graph, keeping custom layer ids. */
export function parseGraphLayers(graph: ArchGraph, input: string | string[] | undefined): ParsedLayers {
  const entries = graphLayerEntries(graph);
  const available = new Set(entries.map((l) => l.id));
  const order = new Map(entries.map((l, i) => [l.id, i]));
  const layers: string[] = [];
  const unknown: string[] = [];
  const add = (token: string) => {
    if (ALL_TOKENS.has(token.toLowerCase())) return;
    const id = resolveGraphLayer(graph, token);
    if (id && available.has(id)) {
      if (!layers.includes(id)) layers.push(id);
    } else {
      unknown.push(token);
    }
  };
  // Array members are atomic graph ids first: namespaced ids such as `business/core`
  // must not be split by the list syntax meant for command strings.
  const atoms = Array.isArray(input) ? input.map(String) : [input ?? ''];
  for (const atom of atoms) {
    const value = atom.trim();
    if (!value) continue;
    if (resolveGraphLayer(graph, value)) {
      add(value);
      continue;
    }
    for (const token of value.split(/[,\s，、+]+/).filter(Boolean)) add(token);
  }
  layers.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
  return { layers, unknown };
}

/** Compatibility helper: the graph layer key for a raw layer id. */
export function canonicalLayerOf(graph: ArchGraph, raw: string | undefined): string | undefined {
  return graphLayerKey(graph, raw);
}
