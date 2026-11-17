/**
 * Node kind registry. Add a kind = add one entry. Unknown kinds fall back to `default`.
 * Icons are lucide-react (pure SVG → exportable).
 */
import {
  Archive, Boxes, BrainCircuit, Cloud, Cog, Database, Globe, HardDrive, Layers, Library, ListOrdered,
  Monitor, Package, Search, Server, Settings2, Shield, Terminal, Zap, type LucideIcon,
} from 'lucide-react';

export interface KindSpec {
  icon: LucideIcon;
  hue: string;
  label: { en: string; zh: string };
}

export const KINDS: Record<string, KindSpec> = {
  client: { icon: Monitor, hue: '#38BDF8', label: { en: 'Client', zh: '客户端' } },
  cli: { icon: Terminal, hue: '#38BDF8', label: { en: 'CLI', zh: '命令行' } },
  gateway: { icon: Shield, hue: '#22D3EE', label: { en: 'Gateway', zh: '网关' } },
  service: { icon: Server, hue: '#818CF8', label: { en: 'Service', zh: '服务' } },
  module: { icon: Package, hue: '#A5B4FC', label: { en: 'Module', zh: '模块' } },
  library: { icon: Library, hue: '#A5B4FC', label: { en: 'Library', zh: '库' } },
  function: { icon: Zap, hue: '#FBBF24', label: { en: 'Function', zh: '函数' } },
  worker: { icon: Cog, hue: '#C084FC', label: { en: 'Worker', zh: '后台任务' } },
  'ai-model': { icon: BrainCircuit, hue: '#E879F9', label: { en: 'AI Model', zh: 'AI 模型' } },
  database: { icon: Database, hue: '#34D399', label: { en: 'Database', zh: '数据库' } },
  cache: { icon: Zap, hue: '#F87171', label: { en: 'Cache', zh: '缓存' } },
  queue: { icon: ListOrdered, hue: '#FB923C', label: { en: 'Queue', zh: '队列' } },
  storage: { icon: HardDrive, hue: '#2DD4BF', label: { en: 'Storage', zh: '存储' } },
  search: { icon: Search, hue: '#FACC15', label: { en: 'Search', zh: '搜索' } },
  'external-api': { icon: Globe, hue: '#94A3B8', label: { en: 'External', zh: '外部服务' } },
  config: { icon: Settings2, hue: '#94A3B8', label: { en: 'Config', zh: '配置' } },
  group: { icon: Layers, hue: '#818CF8', label: { en: 'Group', zh: '分组' } },
  saas: { icon: Cloud, hue: '#94A3B8', label: { en: 'SaaS', zh: 'SaaS' } },
  archive: { icon: Archive, hue: '#2DD4BF', label: { en: 'Archive', zh: '归档' } },
};

const DEFAULT: KindSpec = { icon: Boxes, hue: '#94A3B8', label: { en: 'Component', zh: '组件' } };

export function kindSpec(kind: string): KindSpec {
  return KINDS[kind] ?? DEFAULT;
}

export function kindLabel(kind: string, locale: string): string {
  const s = KINDS[kind];
  if (!s) return kind;
  return locale.startsWith('zh') ? s.label.zh : s.label.en;
}
