import type { ArchGraph, LocalizedText } from './schema';
import { t } from './i18n';

/**
 * Canonical architecture layers. Graphs may use their own layer ids; aliases map them
 * onto these buckets so one command vocabulary works across repositories and languages.
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

/** Map a user token, graph layer id or layer label to a canonical layer id. */
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

/** Parse `frontend,data` / `前端 数据` / repeated flags into canonical ids. */
export function parseLayers(input: string | string[] | undefined): ParsedLayers {
  const tokens = (Array.isArray(input) ? input : [input ?? ''])
    .flatMap((v) => String(v).split(/[,\s，、+/]+/))
    .filter(Boolean);
  const layers: string[] = [];
  const unknown: string[] = [];
  for (const token of tokens) {
    if (['all', '*', '全部', '所有', '全部层', 'everything'].includes(token.toLowerCase())) continue;
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

/** Every layer the graph actually uses, canonicalised and sorted. */
export function graphLayers(graph: ArchGraph): string[] {
  const ids = new Set<string>();
  for (const l of graph.layers ?? []) {
    const fromName = canonicalLayer(t(l.name, 'en', 'en')) ?? canonicalLayer(t(l.name, 'zh-CN', 'en'));
    const fromId = canonicalLayer(l.id);
    const id = fromName ?? fromId ?? l.id;
    if (!ids.has(id)) ids.add(id);
  }
  for (const n of graph.nodes) {
    if (!n.layer) continue;
    const id = canonicalLayer(n.layer) ?? n.layer;
    if (!ids.has(id)) ids.add(id);
  }
  return [...ids].sort((a, b) => layerOrder(a) - layerOrder(b) || a.localeCompare(b));
}

/** Resolve the graph's own layer id for a node, then canonicalise it. */
export function canonicalLayerOf(graph: ArchGraph, raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const layer = graph.layers?.find((l) => l.id === raw);
  const byName = layer
    ? canonicalLayer(t(layer.name, 'en', 'en')) ?? canonicalLayer(t(layer.name, 'zh-CN', 'en'))
    : null;
  return byName ?? canonicalLayer(raw) ?? raw;
}
