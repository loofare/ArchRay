import type { ArchGraph, LocalizedText } from './schema';

/** Resolve LocalizedText with fallback chain: exact -> language -> default -> first available. */
export function t(text: LocalizedText | undefined, locale: string, fallback?: string): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  if (text[locale]) return text[locale]!;
  const lang = locale.split('-')[0]!;
  const byLang = Object.keys(text).find((k) => k.split('-')[0] === lang);
  if (byLang) return text[byLang]!;
  if (fallback && text[fallback]) return text[fallback]!;
  const first = Object.values(text)[0];
  return first ?? '';
}

export function graphLocales(g: ArchGraph): { locales: string[]; defaultLocale: string } {
  const locales = g.meta.locales;
  return { locales, defaultLocale: g.meta.defaultLocale ?? locales[0] ?? 'en' };
}

/** Pick best locale for a user given the graph's available locales. */
export function negotiateLocale(available: string[], preferred: readonly string[]): string {
  for (const p of preferred) {
    if (available.includes(p)) return p;
    const lang = p.split('-')[0];
    const hit = available.find((a) => a.split('-')[0] === lang);
    if (hit) return hit;
  }
  return available[0] ?? 'en';
}

/* -------------------------------------------------------- UI dictionary */

const en = {
  'lens.topology': 'Topology',
  'lens.health': 'Health',
  'lens.replaceability': 'Replaceability',
  'lens.flow': 'Flows',
  'projection.flat': 'Flat',
  'projection.iso': 'Isometric',
  'projection.stack': 'Stack',
  'lifecycle.planned': 'Planned',
  'lifecycle.deprecated': 'Deprecated',
  'health.good': 'Healthy',
  'health.warn': 'Warning',
  'health.critical': 'Critical',
  'health.unknown': 'Unknown',
  'replace.low': 'Core / hard to replace',
  'replace.medium': 'Replaceable with effort',
  'replace.high': 'Easily replaceable',
  'alt.drop-in': 'Drop-in',
  'alt.managed': 'Managed service',
  'alt.re-architect': 'Re-architect',
  'alt.remove': 'Remove',
  'inspector.sources': 'Source files',
  'inspector.stack': 'Tech stack',
  'inspector.findings': 'Findings',
  'inspector.inbound': 'Called by',
  'inspector.outbound': 'Depends on',
  'inspector.alternatives': 'Alternatives',
  'inspector.lockIn': 'Lock-in',
  'inspector.impact': 'Impact if replaced',
  'inspector.preview': 'Preview scenario',
  'inspector.copyPrompt': 'Copy AI prompt',
  'inspector.copied': 'Copied',
  'inspector.children': 'Open group',
  'inspector.effort': 'Effort',
  'inspector.risk': 'Risk',
  'common.measured': 'measured',
  'common.estimated': 'AI estimate',
  'common.exportPng': 'Export PNG',
  'common.exportView': 'Save view.json',
  'common.poster': 'Poster mode',
  'common.nodes': 'modules',
  'common.edges': 'links',
  'common.root': 'Overview',
  'common.exitScenario': 'Exit preview',
  'common.retry': 'Retry',
  'common.importView': 'Import view',
  'common.findModule': 'Find module',
  'common.fit': 'Fit',
  'common.zoomIn': 'Zoom in',
  'common.zoomOut': 'Zoom out',
  'layers.label': 'Layers',
  'layers.all': 'All layers',
  'layers.hint': 'Dimmed modules only provide cross-layer context',
  'meta.generated': 'Generated',
  'meta.commit': 'commit',
  'meta.inputOnly': 'Input graph facts only',
  'meta.notRuntime': 'Not runtime monitoring',
  'diff.preview': 'Target preview',
  'diff.added': 'added',
  'diff.removed': 'removed',
  'diff.changed': 'changed',
  'field.view': 'view',
  'field.locale': 'language',
  'field.theme': 'theme',
  'field.projection': 'projection',
  'field.lens': 'lens',
  'field.focus': 'focus',
  'field.collapsed': 'collapsed groups',
  'field.scenario': 'scenario',
  'field.camera': 'camera',
  'notice.invalid': 'Ignored invalid value',
  'notice.usingDefault': 'using default',
  'notice.staleFocus': 'Focus module no longer exists; showing the whole graph',
  'notice.staleScenario': 'Scenario no longer exists; showing current facts',
  'notice.staleLocale': 'Language is not in this graph; using default',
  'notice.staleCollapsed': 'Some collapsed groups no longer exist and were removed',
  'notice.staleLayers': 'Some layers are not in this graph and were ignored',
  'notice.reserved': 'hidden/pinned are reserved and were not restored',
  'notice.layoutFailed': 'Layout failed; retry or switch projection',
  'notice.pngFailed': 'PNG export failed',
  'notice.importFailed': 'View import failed',
  'notice.invalidView': 'Invalid view; using defaults',
  'inspector.evidence': 'Evidence comes from the input graph; verify source paths and dependencies. Candidates may be empty; keeping the current implementation is valid.',
  'inspector.copyFallback': 'Clipboard unavailable; select the text manually',
  'inspector.promptText': 'Prompt text',
  'inspector.references': 'References',
} as const;

export type UiKey = keyof typeof en;

const zh: Record<UiKey, string> = {
  'lens.topology': '拓扑',
  'lens.health': '健康度',
  'lens.replaceability': '可替代性',
  'lens.flow': '链路',
  'projection.flat': '平面',
  'projection.iso': '等轴',
  'projection.stack': '楼层',
  'lifecycle.planned': '规划中',
  'lifecycle.deprecated': '已废弃',
  'health.good': '健康',
  'health.warn': '注意',
  'health.critical': '严重',
  'health.unknown': '未知',
  'replace.low': '核心 / 难替代',
  'replace.medium': '可替代（需投入）',
  'replace.high': '易替代',
  'alt.drop-in': '平替',
  'alt.managed': '托管服务',
  'alt.re-architect': '架构重构',
  'alt.remove': '移除',
  'inspector.sources': '源码文件',
  'inspector.stack': '技术栈',
  'inspector.findings': '诊断',
  'inspector.inbound': '被谁调用',
  'inspector.outbound': '依赖谁',
  'inspector.alternatives': '替代方案',
  'inspector.lockIn': '锁定点',
  'inspector.impact': '替换影响范围',
  'inspector.preview': '预览方案',
  'inspector.copyPrompt': '复制 AI 提示词',
  'inspector.copied': '已复制',
  'inspector.children': '展开子模块',
  'inspector.effort': '工作量',
  'inspector.risk': '风险',
  'common.measured': '实测',
  'common.estimated': 'AI 估算',
  'common.exportPng': '导出 PNG',
  'common.exportView': '保存 view.json',
  'common.poster': '海报模式',
  'common.nodes': '个模块',
  'common.edges': '条关系',
  'common.root': '总览',
  'common.exitScenario': '退出预览',
  'common.retry': '重试',
  'common.importView': '导入视图',
  'common.findModule': '查找模块',
  'common.fit': '全图',
  'common.zoomIn': '放大',
  'common.zoomOut': '缩小',
  'layers.label': '架构层',
  'layers.all': '全部层',
  'layers.hint': '淡显模块仅提供跨层上下文',
  'meta.generated': '生成于',
  'meta.commit': '提交',
  'meta.inputOnly': '仅输入图事实',
  'meta.notRuntime': '非运行时监控',
  'diff.preview': '目标预览',
  'diff.added': '新增',
  'diff.removed': '移除',
  'diff.changed': '变更',
  'field.view': '视图',
  'field.locale': '语言',
  'field.theme': '主题',
  'field.projection': '投影',
  'field.lens': '视角',
  'field.focus': '聚焦模块',
  'field.collapsed': '折叠分组',
  'field.scenario': '方案',
  'field.camera': '相机位置',
  'notice.invalid': '已忽略无效值',
  'notice.usingDefault': '使用默认值',
  'notice.staleFocus': '聚焦模块已不存在，已显示全图',
  'notice.staleScenario': '方案已不存在，已显示当前事实',
  'notice.staleLocale': '图中没有该语言，已使用默认语言',
  'notice.staleCollapsed': '部分折叠分组已不存在，已移除',
  'notice.staleLayers': '部分层不在图中，已忽略',
  'notice.reserved': 'hidden/pinned 为保留字段，未恢复',
  'notice.layoutFailed': '布局失败，可重试或切换投影',
  'notice.pngFailed': 'PNG 导出失败',
  'notice.importFailed': '视图导入失败',
  'notice.invalidView': '视图无效，已使用默认值',
  'inspector.evidence': '依据仅限输入图；源码路径与依赖需复核。候选可以为空，保持现状也是有效选择。',
  'inspector.copyFallback': '无法写入剪贴板，请手动选择文字',
  'inspector.promptText': '提示词文本',
  'inspector.references': '参考链接',
};

const DICTS: Record<string, Record<UiKey, string>> = { en, zh };

export function ui(key: UiKey, locale: string): string {
  const lang = locale.split('-')[0]!;
  return DICTS[lang]?.[key] ?? en[key];
}

/** Text width estimate (px) — CJK glyphs ~1em, latin ~0.56em. Used by layout for card sizing. */
export function measureText(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x2e80 && c <= 0x9fff) w += 1;
    else if (c >= 0xac00 && c <= 0xd7af) w += 1;
    else if (c >= 0xff00 && c <= 0xffef) w += 1;
    else if (ch === ' ') w += 0.28;
    else if (/[A-Z0-9]/.test(ch)) w += 0.62;
    else w += 0.52;
  }
  return w * fontSize;
}
