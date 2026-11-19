#!/usr/bin/env node
/**
 * Generate the 14 bilingual SEO/GEO guide & comparison pages + synced sitemap.xml.
 * Run: node scripts/gen-guides.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const ORIGIN = 'https://archray.dev';
const LASTMOD = '2026-11-20';
const INSTALL_CMD_BASE = 'curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh | sh -s -- . ';

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function codeBlock(label, code, isZh) {
  return `<div class="code-block">
  <div class="code-head"><span>${esc(label)}</span><button type="button" class="code-copy-btn" data-copy-code>${isZh ? '复制' : 'Copy'}</button></div>
  <pre><code>${esc(code)}</code></pre>
</div>`;
}

function tableBlock(headers, rows) {
  const th = headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const body = rows.map((row) => {
    const cells = row.map((cell, i) => {
      if (i === 0) return `<th scope="row">${esc(cell)}</th>`;
      const isStrong = typeof cell === 'object' && cell.strong;
      const text = typeof cell === 'object' ? cell.text : cell;
      return `<td${isStrong ? ' class="is-strong"' : ''}>${esc(text)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n      ');
  return `<div class="table-scroll">
  <table class="spec-table">
    <thead><tr>${th}</tr></thead>
    <tbody>
      ${body}
    </tbody>
  </table>
</div>`;
}

function faqSection(items, isZh) {
  if (!items || !items.length) return '';
  const heading = isZh ? '常见问题' : 'Frequently Asked Questions';
  const rows = items.map((item, idx) => `<details class="faq-item"${idx === 0 ? ' open' : ''}>
  <summary>${esc(item.q)}</summary>
  <p>${esc(item.a)}</p>
</details>`).join('\n');
  return `<section id="faq">
  <h2>${heading}</h2>
  <div class="guide-faq">
    ${rows}
  </div>
</section>`;
}

/* --------------------------------------------------------------------------
 * Paired bilingual route catalog (EN <-> ZH) for canonicals, hreflang & sitemap
 * -------------------------------------------------------------------------- */
const PAIRS = [
  { key: 'guides-hub', en: '/guides/', zh: '/zh/guides/', priority: '0.85' },
  { key: 'compare', en: '/compare/mermaid-structurizr-eraser/', zh: '/zh/compare/mermaid-structurizr-eraser/', priority: '0.90' },
  { key: 'claude', en: '/guides/claude-code-architecture-diagram/', zh: '/zh/guides/claude-code-architecture-diagram/', priority: '0.85' },
  { key: 'cursor', en: '/guides/cursor-codebase-visualization/', zh: '/zh/guides/cursor-codebase-visualization/', priority: '0.85' },
  { key: 'multi-host', en: '/guides/codex-pi-antigravity/', zh: '/zh/guides/codex-pi-antigravity/', priority: '0.80' },
  { key: 'audit', en: '/guides/offline-codebase-architecture-audit/', zh: '/zh/guides/offline-codebase-architecture-audit/', priority: '0.85' },
  { key: 'reference', en: '/guides/architecture-layers-reference/', zh: '/zh/guides/architecture-layers-reference/', priority: '0.80' }
];

const pairByKey = Object.fromEntries(PAIRS.map((p) => [p.key, p]));

/* --------------------------------------------------------------------------
 * Page Definitions (14 Pages: 7 EN + 7 ZH) — 100% Verified Facts
 * -------------------------------------------------------------------------- */
const PAGES = [
  /* 1. GUIDES HUB — EN */
  {
    pairKey: 'guides-hub',
    lang: 'en',
    kind: 'hub',
    title: 'ArchRay Guides — Architecture Maps, Comparisons & Specs',
    description: 'Step-by-step ArchRay playbooks for Claude Code, Cursor, Codex, Pi, and Antigravity, plus tool comparisons, monorepo benchmarks, and Graph v2 reference.',
    h1: 'ArchRay Guides & Technical Reference',
    lead: 'Practical playbooks for turning real repository source code into deterministic, offline 3D and 2D architecture maps across five AI coding agents.',
    tldr: 'Every guide here documents real commands, host file paths, and measured benchmarks from ArchRay v0.6.0. Use these playbooks to set up /archray in Claude Code, Cursor, Codex, Pi, or Antigravity, compare ArchRay against Mermaid and Structurizr, or slice your repo across L0–L9 layers.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides' }],
    sections: [
      {
        heading: 'Comparisons & Architecture Audits',
        rows: [
          {
            title: 'ArchRay vs Mermaid, Structurizr, Eraser & Draw.io',
            href: '/compare/mermaid-structurizr-eraser/',
            desc: 'Direct feature matrix comparing source truth, ELK layout determinism, 3D/2D views, file:line evidence, and offline security.'
          },
          {
            title: 'Offline Codebase Architecture Audit & Monorepo Benchmarks',
            href: '/guides/offline-codebase-architecture-audit/',
            desc: 'How ArchRay handles 7,712-file monorepos (calcom/cal.com in 196ms), tracks measured vs ≈ estimates, and enforces UTF-8 on Windows.'
          }
        ]
      },
      {
        heading: 'AI Coding Agent Playbooks',
        rows: [
          {
            title: 'Claude Code Architecture Diagram Guide (/archray)',
            href: '/guides/claude-code-architecture-diagram/',
            desc: 'Install ArchRay into .claude/skills and .claude/commands, slice layers without re-scanning, and verify source citations.'
          },
          {
            title: 'Cursor Codebase Visualization Guide (/archray)',
            href: '/guides/cursor-codebase-visualization/',
            desc: 'Wire .cursor/rules/archray.mdc and slash commands to explore large repositories visually in 3D and 2D Bento views.'
          },
          {
            title: 'Codex, Pi & Antigravity Integration Guide',
            href: '/guides/codex-pi-antigravity/',
            desc: 'Use $archray in Codex, /skill:archray in Pi, or unified --agent all multi-host setup across teams.'
          }
        ]
      },
      {
        heading: 'Specifications & Reference',
        rows: [
          {
            title: 'Canonical Layers (L0–L9), 19 Node Kinds & Graph v2 Reference',
            href: '/guides/architecture-layers-reference/',
            desc: 'Complete lookup for all 10 layers, 19 node kinds, 14 edge protocols, 4 visual themes, and every CLI subcommand.'
          }
        ]
      }
    ]
  },

  /* 1. GUIDES HUB — ZH */
  {
    pairKey: 'guides-hub',
    lang: 'zh-CN',
    kind: 'hub',
    title: 'ArchRay 指南与对比 — 源码架构图、AI 宿主教程与参考',
    description: 'ArchRay v0.6.0 完整中文教程：Claude Code、Cursor、Codex、Pi 与 Antigravity 接入指南，Mermaid/Structurizr 深度对比，十层架构与 CLI 参考。',
    h1: 'ArchRay 中文指南与技术参考',
    lead: '将真实仓库源码转化为可分层、可交互、100% 离线分享的 3D 与 2D 空间架构图——涵盖五大 AI 编程助手集成、选型对比与基准实测。',
    tldr: '本专栏汇总 ArchRay v0.6.0 已验证的真实安装命令、宿主配置文件路径、L0–L9 分层规范与大型 Monorepo 实测数据。你可以按需查阅 Claude Code / Cursor / Codex 接入教程，或查看 ArchRay 与 Mermaid、Structurizr、Eraser 的客观选型对比。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南' }],
    sections: [
      {
        heading: '选型对比与离线架构审计',
        rows: [
          {
            title: 'ArchRay 对比 Mermaid、Structurizr、Eraser 与 Excalidraw',
            href: '/zh/compare/mermaid-structurizr-eraser/',
            desc: '从源码真实性、确定性排版、3D/2D 视图、文件行号证据到零上传离线交付的 10 项全维度对比矩阵。'
          },
          {
            title: '大型 Monorepo 离线架构审计与编码安全实践',
            href: '/zh/guides/offline-codebase-architecture-audit/',
            desc: '实测 calcom/cal.com（7,712 文件 / 196ms ELK 布局）、实测值与 ≈ 估算边界，以及 v0.6.0 Windows 中文无乱码保障。'
          }
        ]
      },
      {
        heading: 'AI 编程助手集成教程',
        rows: [
          {
            title: 'Claude Code 生成 3D 架构图实战（/archray）',
            href: '/zh/guides/claude-code-architecture-diagram/',
            desc: '一键安装到 .claude/skills 与 .claude/commands，使用分层切片与跨端组合深入理解陌生仓库。'
          },
          {
            title: 'Cursor 代码库空间可视化指南',
            href: '/zh/guides/cursor-codebase-visualization/',
            desc: '配置 .cursor/rules/archray.mdc 与快捷指令，在本地秒级生成可旋转、可排查热点的交互式架构图。'
          },
          {
            title: 'Codex、Pi 与 Antigravity 多宿主协同指南',
            href: '/zh/guides/codex-pi-antigravity/',
            desc: '适配 Codex 的 $archray 技能触发、Pi 提示模板及多助手 --agent all 团队统一部署方案。'
          }
        ]
      },
      {
        heading: '规范与参考手册',
        rows: [
          {
            title: 'L0–L9 十层架构、19 种节点类型与 Graph v2 参考',
            href: '/zh/guides/architecture-layers-reference/',
            desc: '完整查阅 10 个规范架构层、中英文斜杠别名、14 种协议、4 套视觉主题与全部 CLI 参数。'
          }
        ]
      }
    ]
  },

  /* 2. COMPARISON FLAGSHIP — EN */
  {
    pairKey: 'compare',
    lang: 'en',
    kind: 'article',
    title: 'ArchRay vs Mermaid, Structurizr & Eraser (Comparison)',
    description: 'Objective comparison of ArchRay vs Mermaid, Structurizr C4 DSL, Eraser DiagramGPT, and Excalidraw across source truth, layout determinism, 3D views, and offline privacy.',
    h1: 'ArchRay vs Mermaid, Structurizr & Eraser',
    lead: 'Architectural diagrams only stay useful when they reflect real source code, survive scale beyond 15 nodes, and share without leaking private repository metadata.',
    tldr: 'Choose ArchRay when you want your AI coding agent (Claude Code, Cursor, Codex, Pi, or Antigravity) to verify real source code and produce an offline, single-file 3D/2D architecture map with file:line citations and ELK port routing. Choose Mermaid for quick README snippets, Structurizr for manually governed formal C4 models, and Excalidraw for freehand whiteboarding.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'ArchRay vs Mermaid, Structurizr & Eraser' }],
    blocks: [
      {
        id: 'matrix',
        heading: 'Side-by-Side Architecture Tool Matrix',
        paragraphs: [
          'Different diagramming tools optimize for different parts of the software lifecycle. Generic AI diagram prompts optimize for speed on 4–6 box sketches, whereas ArchRay separates semantic source verification (done by your coding agent) from deterministic geometric layout (done offline by ELK and the ArchRay viewer engine).'
        ],
        table: {
          headers: ['Capability', 'ArchRay (v0.6.0)', 'Mermaid', 'Structurizr DSL', 'Eraser / DiagramGPT', 'Excalidraw / Draw.io'],
          rows: [
            ['Source Evidence', { text: 'Verified paths & file:line citations in graph.json', strong: true }, 'Manual / unverified text', 'Manual DSL declarations', 'Optional prompt upload / opaque', 'Manual shapes'],
            ['AI Coding Integration', { text: 'Native Skill + /archray for 5 AI hosts', strong: true }, 'Generic text generation', 'External DSL scripting', 'Web chat UI / IDE plugin', 'Manual or ad-hoc AI plugins'],
            ['Deterministic Layout', { text: 'ELK port routing + 4-quadrant 3D atrium + 2D Bento', strong: true }, 'Basic DAG / Sugiyama (tangles at >15 nodes)', 'Auto-layout + manual coordinates', 'Cloud layout engine', 'Manual drag & align'],
            ['Layer Slicing & Filtering', { text: 'L0–L9 single layers + comma combos w/ 1-hop context', strong: true }, 'Separate files required', 'Explicit view scopes in DSL', 'Single flat canvas per diagram', 'Separate pages / layers'],
            ['Tech Logos & Silhouettes', { text: '167 embedded vector logos + semantic 3D shapes', strong: true }, 'Generic rectangles', 'Custom themes required', 'Built-in cloud icon library', 'Manual icon packs'],
            ['Health & Replaceability', { text: 'Hotspots, measured vs ≈ estimates, migration prompts', strong: true }, 'None', 'None', 'None', 'None'],
            ['Offline Privacy', { text: '100% local single-file HTML (file://)', strong: true }, 'Local via Markdown preview / CLI', 'Requires local Docker/Lite server or Cloud', 'Requires SaaS server', 'Local file or web storage'],
            ['License & Cost', { text: 'MIT Open Source · Free', strong: true }, 'MIT Open Source', 'Apache 2.0 DSL / paid Cloud tiers', 'Freemium SaaS subscription', 'Open source / freemium']
          ]
        }
      },
      {
        id: 'why-raw-mermaid-breaks',
        heading: 'Why Raw LLM Diagrams Collapse Past 15 Nodes',
        paragraphs: [
          'When an LLM writes Mermaid or raw SVG directly for a real multi-service codebase, three structural failures emerge quickly:',
          'First, LLMs guess missing edges from directory names rather than inspecting imports or route definitions, creating plausible boxes with zero file citations. Second, client UIs, API gateways, async workers, and SQL stores share the same flat plane, producing crossed orthogonal spaghetti lines. Third, regenerating the diagram shuffles node positions completely, breaking visual memory in code reviews.'
        ],
        bullets: [
          'Semantic separation: In ArchRay, the coding agent only outputs schema-validated JSON (.archray/graph.json) containing repository-relative sourcePaths.',
          'Deterministic layout: ELK computes layered coordinates, port anchors, and auto-collapses dense child packages (+N) without overlaps.',
          'Auditable provenance: Numeric metrics explicitly carry origin: "measured" vs estimated (≈) markers so teams never mistake AI heuristics for live profiler telemetry.'
        ]
      },
      {
        id: 'when-not-archray',
        heading: 'Honest Trade-Offs: When NOT to Use ArchRay',
        paragraphs: [
          'ArchRay is built specifically for source-backed codebase topology and offline team handoffs—not every diagramming job.'
        ],
        bullets: [
          'Use Mermaid directly when you want a compact 5-step sequence diagram embedded inside a GitHub Pull Request description or Markdown README.',
          'Use Structurizr when your organization enforces strict C4 Model DSL governance across enterprise workspaces with manually curated System Context diagrams.',
          'Use Excalidraw or Draw.io when brainstorming unbuilt greenfield ideas where source code does not yet exist.',
          'Note ArchRay boundaries: ArchRay does not attach a live runtime APM agent, capture production request traces, or run standalone AST parsing without your AI coding session.'
        ]
      },
      {
        id: 'install-switch',
        heading: 'Try ArchRay on Your Own Repository in 30 Seconds',
        paragraphs: [
          'Install ArchRay cleanly into .archray/tool without modifying any application source files, then compare the interactive output directly against your existing diagrams.'
        ],
        code: {
          label: 'Install for Claude Code, Cursor, or all supported hosts',
          body: `${INSTALL_CMD_BASE}all\n# Inside a fresh coding agent session:\n/archray\n# Or slice specific layers after initial generation:\n./.archray/archray build .archray/graph.json --layers frontend,backend,data --style blueprint --force`
        }
      }
    ],
    faqs: [
      {
        q: 'Can ArchRay replace Mermaid inside Markdown pull requests?',
        a: 'They serve complementary jobs. Keep Mermaid for tiny inline PR sequence flows, and attach an ArchRay full-canvas PNG export or .archray/index.html artifact when reviewing whole-service architecture, cross-layer dependencies, or migration plans.'
      },
      {
        q: 'Does ArchRay support C4-style hierarchical drill-down like Structurizr?',
        a: 'Yes. ArchRay Graph v2 models flat nodes with parent references so complex domains group cleanly, auto-collapse with +N badges at overview zoom, and expand interactively without writing C4 DSL by hand.'
      },
      {
        q: 'Why does ArchRay produce both 3D Spatial Atrium and 2D Bento maps?',
        a: '3D Spatial Atrium separates Client/Edge, Central Services, Async/AI Left Wing (-X), External SaaS Right Orbit (+X), and Data/Infra Plinth vertically so deep cross-layer paths stand out. Switching to 2D Bento flattens the exact same verified graph into clean print-ready containment boxes.'
      },
      {
        q: 'Does ArchRay upload source code to archray.dev or any SaaS server?',
        a: 'Never. Analysis occurs exclusively inside the AI coding session you already authorize. CLI build runs offline and produces a self-contained HTML file that works over file://.'
      },
      {
        q: 'Can I keep graph.json under version control like code?',
        a: 'Yes. Many teams commit .archray/graph.json (and view.json) so architecture changes remain diffable in Git alongside application code, while regenerating .archray/index.html locally.'
      }
    ],
    related: ['claude', 'cursor', 'audit', 'reference']
  },

  /* 2. COMPARISON FLAGSHIP — ZH */
  {
    pairKey: 'compare',
    lang: 'zh-CN',
    kind: 'article',
    title: 'ArchRay 对比 Mermaid、Structurizr 与 Eraser：源码架构图选型',
    description: '深度对比 ArchRay、Mermaid、Structurizr C4 DSL、Eraser DiagramGPT 与 Excalidraw：源码证据链、ELK 确定性排版、3D/2D 视图、大型仓库表现与离线零上传安全边界。',
    h1: 'ArchRay 对比 Mermaid、Structurizr 与 Eraser',
    lead: '架构图真正的价值在于“忠实映射真实代码、节点多了不乱线、且能在不泄密的前提下离线交付团队”。不同工具各擅胜场，以下是客观选型指南。',
    tldr: '当你需要 AI 编程助手（Claude Code、Cursor、Codex、Pi 或 Antigravity）直接通读真实仓库，输出带文件行号证据、支持 L0–L9 按层切片且可离线双击打开的 3D/2D 单文件架构图时，选择 ArchRay。文档内嵌微型流程图可选 Mermaid，强规范手工 C4 建模可选 Structurizr，前期自由草图头脑风暴可选 Excalidraw。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: '工具选型对比' }],
    blocks: [
      {
        id: 'matrix',
        heading: '核心能力对比矩阵',
        paragraphs: [
          '传统 AI 制图把“理解代码语义”和“画框算坐标”混在一起，导致复杂项目一画就乱。ArchRay 将工作严格拆为两段：AI 只输出经过源码核验的 .archray/graph.json，坐标计算、端口走线与 3D/2D 投影全部交给离线确定性引擎完成。'
        ],
        table: {
          headers: ['对比维度', 'ArchRay (v0.6.0)', 'Mermaid', 'Structurizr DSL', 'Eraser / DiagramGPT', 'Excalidraw / Draw.io'],
          rows: [
            ['源码证据链', { text: '强制记录 sourcePaths 与文件行号依据', strong: true }, '手写文本，无代码绑定', '手工维护 DSL 模型', '部分依赖提示词或云端解析', '纯手工连线'],
            ['AI 编程助手集成', { text: '原生适配 5 大宿主（/archray 与 $archray）', strong: true }, '大模型通用输出文本', '需人工编写 DSL', '独立网页或 IDE 插件', '手绘或零散插件'],
            ['大仓库排版稳定性', { text: 'ELK 确定性路由 + 三维象限分离 + 2D Bento', strong: true }, '超过 15 个节点易交叉缠绕', '自动排版或手调坐标', '云端布局引擎', '人工拖拽对齐'],
            ['按层切片查看', { text: '支持 L0–L9 单层或逗号组合 + 一跳上下游', strong: true }, '需拆分多个代码块', '需提前定义 View 作用域', '单一平面视图', '需切换画布或手动隐藏'],
            ['技术栈与体块识别', { text: '内嵌 167 枚矢量徽标与语义 3D 体块', strong: true }, '同质普通矩形', '需自配样式主题', '云端图标库', '手动粘贴图标'],
            ['健康度与平替评估', { text: '内置热点诊断、实测/≈ 区分与迁移 Prompt', strong: true }, '无', '无', '无', '无'],
            ['离线隐私与交付', { text: '零上传 · 单文件 HTML (file:// 直接打开)', strong: true }, '依赖 Markdown 渲染器或 CLI', '依赖本地容器或云服务', '强制走 SaaS 云服务', '本地文件或云盘'],
            ['开源协议与费用', { text: 'MIT 开源完全免费', strong: true }, 'MIT 开源', 'DSL 开源 / 云端收费', 'SaaS 订阅制', '开源 / 商业版']
          ]
        }
      },
      {
        id: 'why-mermaid-fails',
        heading: '为什么大模型直接画 Mermaid / SVG 容易失真？',
        paragraphs: [
          '在小型 Demo 上让大模型画一张 Mermaid 看似顺手，但在真实工程仓库里通常会遇到三个顽疾：',
          '第一是“凭目录名脑补”：模型没核对真实 import/调用代码就编造模块依赖；第二是“平面穿线蜘蛛网”：前端、网关、消息队列与数据库挤在同一平面互相遮挡；第三是“无法局部增量审视”：前后端联调时只想看端到端核心链路，每次却要让 AI 重写整段图代码。'
        ],
        bullets: [
          '事实与几何解耦：AI 写语义 JSON，ELK 与三维投影算几何坐标，彻底杜绝坐标重叠与标签裁切。',
          '一次扫描、按需切片：生成一次 .archray/graph.json 后，可瞬间切换 /archray:frontend、backend,data 等多层组合。',
          '诚实证据口径：TypeBox 严格校验必填字段，将未知依赖隔离到显式清单，并将静态估算指标标注为 ≈。'
        ]
      },
      {
        id: 'non-goals',
        heading: '坦诚适用边界：哪些场景不建议用 ArchRay？',
        paragraphs: [
          'ArchRay 聚焦“基于真实代码库的拓扑透视与离线团队分享”，以下场景使用对应工具会更合适：'
        ],
        bullets: [
          'GitHub PR 或技术博客里的轻量时序图（5–8 个步骤）：继续使用 Mermaid 代码块最轻量。',
          '架构委员会强制审计的纯手工 C4 架构治理模型：继续使用 Structurizr DSL 编写标准视图。',
          '尚未编写任何源码的新项目脑暴草图：使用 Excalidraw 或纸笔自由涂鸦更快捷。',
          '生产环境全链路追踪与真实 QPS 监控：ArchRay 不是 APM 探针或运行时监控系统，不采集线上流量。'
        ]
      },
      {
        id: 'try-cmd',
        heading: '30 秒装入当前项目实测对比',
        paragraphs: [
          '所有工具文件全部自包含隔离在 .archray/tool 内，零污染业务源码，支持随时一条命令干净卸载：'
        ],
        code: {
          label: '安装全宿主并一键切换蓝色蓝图（Blueprint）视图',
          body: `${INSTALL_CMD_BASE}all\n# 重开 AI 会话并输入：\n/archray\n# 随时免重新扫描代码，仅切换配色或分层切片：\n./.archray/archray build .archray/graph.json --layers frontend,backend,data --style blueprint --force`
        }
      }
    ],
    faqs: [
      {
        q: 'ArchRay 生成的结果能嵌入 Confluence、飞书或设计文档吗？',
        a: '可以。点击架构图顶部工具栏的“整图 PNG”可导出不裁切画布外沿的高清全景图（例如 4440×4002 级别完整包围盒重投影），或导出带开源溯源二维码的分享海报直接贴入文档。'
      },
      {
        q: 'ArchRay 的 graph.json 适合提交进 Git 仓库吗？',
        a: '非常适合。推荐提交 .archray/graph.json 与 view.json 方便团队同步代码演进中的架构变更与健康度发现，离线单文件 HTML 可随时按需本地重构。'
      },
      {
        q: '为什么 3D 全景和 2D Bento 使用同一份数据时能严格一致？',
        a: '两种投影渲染同一份验证通过的 graph.json 语义节点和连线，仅改变布局与投影算法。三维视图把异步翼（-X）、外部 SaaS 轨（+X）和底层存储圆柱拉开空间层次；2D Bento 则适合印刷与平面嵌套审查。'
      },
      {
        q: '使用 ArchRay 会把企业私有源码发到外部官网吗？',
        a: '绝对不会。archray.dev 本身完全是静态站点。代码阅读仅发生于你本地已授权的 AI 编程助手会话中，CLI 离线构建，只有主动运行 update 时才会从 GitHub Releases 只读校验版本。'
      }
    ],
    related: ['claude', 'cursor', 'audit', 'reference']
  },

  /* 3. CLAUDE CODE PLAYBOOK — EN */
  {
    pairKey: 'claude',
    lang: 'en',
    kind: 'article',
    title: 'Claude Code Architecture Diagram Guide (/archray Skill)',
    description: 'Install ArchRay into Claude Code to inspect repository source code and generate interactive 3D/2D offline HTML architecture maps via /archray.',
    h1: 'Claude Code Architecture Diagram Guide',
    lead: 'Turn Claude Code from a text-first coding assistant into an evidence-backed spatial architect with a single /archray slash command.',
    tldr: 'Install ArchRay targeting Claude Code once in your repo root (`sh -s -- . claude`), start a fresh Claude Code session, and run `/archray`. Claude reads real source files into `.archray/graph.json`, runs deterministic validation and ELK layout, and emits a zero-dependency `.archray/index.html` you can slice by layer (`/archray:frontend`, `/archray backend,data`) without re-scanning.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'Claude Code Architecture Diagram' }],
    howTo: {
      name: 'Generate an architecture diagram in Claude Code with ArchRay',
      totalTime: 'PT2M',
      steps: [
        { name: 'Install ArchRay with the claude host target', text: 'Run install.sh in your repository root with `. claude` to install .claude/skills/archray/ and .claude/commands/ alongside .archray/tool.' },
        { name: 'Open a fresh Claude Code session and run /archray', text: 'Restart or open a new Claude Code terminal so newly installed slash commands register, then type `/archray`.' },
        { name: 'Inspect slices, health hotspots, and export PNG/HTML', text: 'Open `.archray/index.html` locally in your browser or run layer slices such as `/archray frontend,backend` without re-analyzing source.' }
      ]
    },
    blocks: [
      {
        id: 'install',
        heading: '1. Install ArchRay for Claude Code',
        paragraphs: [
          'Run the self-contained installer from the root directory of the repository you want to map. Node.js 20+, curl, and tar are required (on Windows, use Git Bash or WSL). Application source code is never modified.'
        ],
        code: {
          label: 'Run in target repository root',
          body: `${INSTALL_CMD_BASE}claude`
        },
        table: {
          headers: ['Artifact Created', 'Purpose', 'Source Code Touched?'],
          rows: [
            ['.claude/skills/archray/', 'Claude Code skill rules & v2 schema prompt', 'No'],
            ['.claude/commands/archray*.md', 'Slash presets (/archray, /archray:frontend, etc.)', 'No'],
            ['.archray/tool/ & .archray/archray', 'Self-contained CLI, ELK engine & viewer bundle', 'No'],
            ['.archray/graph.json & index.html', 'Generated graph facts & offline HTML (after /archray)', 'No']
          ]
        }
      },
      {
        id: 'commands',
        heading: '2. Available Claude Code Slash Commands',
        paragraphs: [
          'Open a new Claude Code session after installation so `.claude/commands/` is discovered cleanly. Type `/archray` for the full 10-layer map, or slice straight into specific subsystems once `.archray/graph.json` exists.'
        ],
        table: {
          headers: ['Slash Command', 'Canonical Layers Highlighted', 'When to Use'],
          rows: [
            ['/archray or /archray:full', 'All present layers (L0–L9)', 'Initial full-repository onboarding & architecture review'],
            ['/archray:frontend', 'client (L0)', 'Web SPA/SSR, mobile, and desktop UI surfaces + 1-hop APIs'],
            ['/archray:backend', 'service + async (L3 + L4)', 'Core domain services, RPC handlers, queues & background workers'],
            ['/archray:data', 'data (L5)', 'PostgreSQL, Redis caches, search indices & object stores'],
            ['/archray:network', 'edge + gateway (L1 + L2)', 'CDN, WAF, reverse proxies & ingress gateway routing'],
            ['/archray:security', 'gateway (L2)', 'OAuth/OIDC auth boundaries, JWT guards & rate limiting'],
            ['/archray frontend,backend', 'Comma-separated custom combo', 'Trace end-to-end feature calls while dimming peripheral infra']
          ]
        }
      },
      {
        id: 'tips',
        heading: '3. Best Practices & Windows UTF-8 Reliability',
        paragraphs: [
          'Because Claude Code inspects real files before generating `.archray/graph.json`, results improve significantly when you verify two habits:'
        ],
        bullets: [
          'Always verify with `./.archray/archray doctor` if Claude cannot find the CLI binary after moving folders.',
          'On Windows PowerShell, avoid piping JSON through Out-File or Set-Content without UTF-8 encoding; ArchRay v0.6.0 guides Claude to use native UTF-8 file writes without BOM and automatically flags any accidental ? placeholder corruption during `validate`.',
          'Re-style offline at zero LLM token cost: run `./.archray/archray build .archray/graph.json --style blueprint --lang en --force` in your terminal to switch between tech, blueprint, glass, and paper themes.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Do I have to re-install ArchRay for every repository?',
        a: 'Install once per target repository root so `.archray/` and `.claude/` stay scoped cleanly to that repo without polluting global Node modules or unrelated projects.'
      },
      {
        q: 'Why must I open a new Claude Code session after running install.sh?',
        a: 'Claude Code scans `.claude/commands/` and skills when starting a session. Opening a fresh session guarantees `/archray` and its preset variants appear in autocomplete.'
      },
      {
        q: 'Does `/archray frontend,data` re-read the entire codebase with tokens?',
        a: 'Once `.archray/graph.json` is built, slicing layers runs deterministically in seconds through `./.archray/archray build --layers ...`—no extra full-repo re-scan required.'
      },
      {
        q: 'How do I remove ArchRay from a repository cleanly?',
        a: 'Run `./.archray/archray uninstall --dry-run` to inspect all host files to remove, then `uninstall` (keeps your generated maps) or `uninstall --purge` (removes `.archray/` completely).'
      }
    ],
    related: ['compare', 'cursor', 'audit', 'reference']
  },

  /* 3. CLAUDE CODE PLAYBOOK — ZH */
  {
    pairKey: 'claude',
    lang: 'zh-CN',
    kind: 'article',
    title: 'Claude Code 生成 3D 架构图实战教程（/archray）',
    description: '在 Claude Code 中一键安装 ArchRay Skill 与斜杠命令，读取真实仓库源码并生成带文件行号证据、支持 L0–L9 分层切片的离线 3D 架构图。',
    h1: 'Claude Code 生成 3D 架构图实战教程',
    lead: '在仓库根目录安装一次 ArchRay，让 Claude Code 从纯文本问答升级为“先读真实源码证据、再生成可旋转立体架构图”的工程助手。',
    tldr: '在项目根目录运行针对 claude 的 install.sh 安装脚本后，重开一次 Claude Code 会话输入 `/archray`，Claude 会核查仓库代码、写入带源码证据的 `.archray/graph.json`，再由确定性引擎构建零依赖的 `.archray/index.html` 单文件视图。后续可通过 `/archray:frontend` 或 `/archray frontend,data` 秒级按层切片。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: 'Claude Code 教程' }],
    howTo: {
      name: '在 Claude Code 中使用 ArchRay 生成架构图',
      totalTime: 'PT2M',
      steps: [
        { name: '安装 claude 宿主集成', text: '在目标项目根目录执行 install.sh（参数为 `. claude`），自动部署 .claude/skills/archray/、.claude/commands/ 与 .archray/tool。' },
        { name: '重开 Claude Code 会话并执行 /archray', text: '开启全新终端会话使命令列表生效，输入 `/archray` 触发源码架构审查与构建。' },
        { name: '离线打开并按层切片探索', text: '双击打开 `.archray/index.html`，或使用 `/archray:backend`、`/archray frontend,data` 组合聚焦关键链路。' }
      ]
    },
    blocks: [
      {
        id: 'install',
        heading: '1. 一键安装到 Claude Code 仓库目录',
        paragraphs: [
          '在目标仓库根目录执行下方命令（需 Node.js 20+、curl 与 tar；Windows 用户建议在 Git Bash 或 WSL 内执行）。整个过程完全隔离在 .archray/ 与 .claude/ 目录，不会修改一行应用业务源码。'
        ],
        code: {
          label: '在目标项目根目录运行',
          body: `${INSTALL_CMD_BASE}claude`
        },
        table: {
          headers: ['写入文件/目录', '作用说明', '修改业务源码？'],
          rows: [
            ['.claude/skills/archray/', 'Claude Code Skill 规范与 v2 Schema 约束', '否'],
            ['.claude/commands/archray*.md', '预置斜杠命令（/archray、/archray:frontend 等）', '否'],
            ['.archray/tool/ 与 .archray/archray', '离线 CLI 封装、ELK 排版引擎与前端查看器', '否'],
            ['.archray/graph.json 与 index.html', '执行 /archray 后生成的语义图与离线单文件图谱', '否']
          ]
        }
      },
      {
        id: 'commands',
        heading: '2. 常用 Claude Code 斜杠命令速查',
        paragraphs: [
          '安装完毕请重启或新开一个 Claude Code 会话以确保命令清单被加载。首次全库分析只需跑一次 `/archray`，后续切层无需浪费 Token 重新扫描整库。'
        ],
        table: {
          headers: ['斜杠命令', '高亮涵盖层', '适用研发场景'],
          rows: [
            ['/archray 或 /archray:full', '全部存在的层 (L0–L9)', '新接手项目全景摸底、全栈架构评审'],
            ['/archray:frontend', 'client (L0)', '排查前端页面、移动客户端及一跳直连接口'],
            ['/archray:backend', 'service + async (L3 + L4)', '聚焦核心领域服务、RPC 链路与异步队列'],
            ['/archray:data', 'data (L5)', '数据库扇入分析、Redis 缓存与对象存储依赖'],
            ['/archray:network', 'edge + gateway (L1 + L2)', 'CDN、WAF 与反向代理入口流量汇聚审查'],
            ['/archray:security', 'gateway (L2)', 'OAuth/OIDC 鉴权、JWT 校验与限流边界审计'],
            ['/archray frontend,backend', '逗号拼接多层自由组合', '前后端联调，其它基础设施层保留半透明上下文']
          ]
        }
      },
      {
        id: 'best-practices',
        heading: '3. 工程最佳实践与无损升级',
        paragraphs: [
          '为了确保生成质量与团队协作效率，推荐搭配以下命令习惯：'
        ],
        bullets: [
          '零 Token 切换视觉皮肤：已在本地生成 graph.json 后，可直接执行 `./.archray/archray build .archray/graph.json --style blueprint --lang zh-CN --force` 秒换蓝图、极光玻璃或纸质风格。',
          '排查问号乱码问题（v0.6.0+）：Windows 用户已内置 UTF-8 无 BOM 强制校验与 GB18030/UTF-16 解码兜底，避免旧版 PowerShell 重定向导致的中文变成 ???。',
          '保留成果安全升级：执行 `./.archray/archray update` 会通过 SHA-256 校验更新工具链，完整保留你原有的 graph.json、view.json 与导出页面。'
        ]
      }
    ],
    faqs: [
      {
        q: '为什么刚跑完 install.sh，在原有 Claude 会话里输入 /archray 没提示？',
        a: 'Claude Code 会在会话启动时索引 .claude/commands/ 与 skills。重开一次 Claude Code 会话即可在斜杠菜单看到 /archray 及所有分层预设命令。'
      },
      {
        q: '切换 `/archray:data` 或更换风格会重新消耗大模型读取全库吗？',
        a: '不会。语义事实一旦写入 `.archray/graph.json`，按层过滤和样式重构全部由本地 CLI 确定性引擎秒级重渲染完成。'
      },
      {
        q: '双语仓库的中英文切换只翻译层名不翻译模块怎么办？',
        a: 'v0.6.0 Skill 已强化双语字段覆盖率检查；如发现缺漏，只需让 Claude 对照 `meta.locales` 补全 nodes/edges/flows 的双语对象并重新 `validate` + `build` 即可。'
      },
      {
        q: '不再需要时如何彻底清除 ArchRay？',
        a: '先执行 `./.archray/archray uninstall --dry-run` 预览清理清单，确认后运行 `uninstall` 保留图谱产物，或加 `--purge` 连同 .archray 目录一并清除。'
      }
    ],
    related: ['compare', 'cursor', 'audit', 'reference']
  },

  /* 4. CURSOR PLAYBOOK — EN */
  {
    pairKey: 'cursor',
    lang: 'en',
    kind: 'article',
    title: 'Cursor Codebase Visualization Guide (ArchRay)',
    description: 'Add ArchRay to Cursor via .cursor/rules and slash commands to map unfamiliar repositories into interactive 3D/2D offline architecture diagrams with source citations.',
    h1: 'Cursor Codebase Visualization Guide',
    lead: 'Give Cursor Composer and Agent a deterministic architecture lens: map real modules, inspect coupling hotspots, and export shareable offline HTML maps.',
    tldr: 'Install ArchRay with `sh -s -- . cursor` to add `.cursor/rules/archray.mdc` and slash commands (`/archray`, `/archray-frontend`, `/archray-backend`, `/archray-data`). When triggered in a fresh Cursor Agent session, Cursor extracts verified repository facts into `.archray/graph.json` and builds a self-contained 3D/2D `.archray/index.html` viewer.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'Cursor Codebase Visualization' }],
    howTo: {
      name: 'Visualize a codebase inside Cursor using ArchRay',
      totalTime: 'PT2M',
      steps: [
        { name: 'Install the Cursor host integration', text: 'Run install.sh with `. cursor` (or `. claude,cursor`) from the repository root.' },
        { name: 'Start a new Cursor chat/Agent session and run /archray', text: 'Use `/archray` or ask Cursor in natural language: "Use archray to inspect source code and build a 3D map".' },
        { name: 'Inspect 3D Spatial Atrium or 2D Bento view offline', text: 'Open `.archray/index.html` directly or re-slice layers using `./.archray/archray build --layers ...`.' }
      ]
    },
    blocks: [
      {
        id: 'setup',
        heading: '1. Install ArchRay Rules & Commands in Cursor',
        paragraphs: [
          'Running the bootstrap script with `cursor` (or `claude,cursor` if your team uses both) drops a dedicated Cursor rule file alongside isolated CLI binaries in `.archray/tool`.'
        ],
        code: {
          label: 'Install for Cursor (or multi-host claude,cursor)',
          body: `${INSTALL_CMD_BASE}cursor\n# Using multiple hosts in one repo:\n${INSTALL_CMD_BASE}claude,cursor`
        },
        table: {
          headers: ['Host File / Folder', 'What It Provides Inside Cursor'],
          rows: [
            ['.cursor/rules/archray.mdc', 'Always-available project rule guiding Cursor Agent to read real files & produce Graph v2 JSON'],
            ['.cursor/commands/archray.md', 'Slash command entry `/archray` plus layer variants (`/archray-frontend`, `/archray-backend`, `/archray-data`)'],
            ['.archray/graph.schema.json', 'TypeBox JSON schema ensuring every generated node, edge, and flow is valid']
          ]
        }
      },
      {
        id: 'workflow',
        heading: '2. Cursor Prompts & Deterministic Slicing Workflow',
        paragraphs: [
          'Notice Cursor separates preset commands with a hyphen (`/archray-frontend`) rather than a colon, or accepts natural language requests anywhere in Agent mode because `.cursor/rules/archray.mdc` stays indexed inside the workspace.'
        ],
        code: {
          label: 'Trigger inside Cursor Agent / Chat & re-slice locally',
          body: `# Full system discovery in Cursor chat:\n/archray\n\n# Focused frontend slice in Cursor:\n/archray-frontend\n\n# Instant offline re-theme or custom cross-layer combo via terminal:\n./.archray/archray build .archray/graph.json --layers frontend,gateway,data --style glass --force --no-open`
        }
      },
      {
        id: 'why-cursor-users',
        heading: '3. Why Cursor Teams Pair Composer with ArchRay',
        paragraphs: [
          'During refactors or onboarding onto monorepos, raw chat summaries scroll out of context quickly. ArchRay anchors every module to real `sourcePaths` and surfaces replaceability trade-offs right beside the 3D diagram:'
        ],
        bullets: [
          'Inspect health hotspots (e.g., 6,200-LOC sync locks or hardcoded fallback secrets) visually rather than hunting across grep tabs.',
          'Preview drop-in or managed service replacements and copy ready-to-paste migration prompts back into Cursor Composer.',
          'Share an interactive `.archray/index.html` or unclipped 4K-class PNG in Slack/Confluence with colleagues who do not have Cursor open.'
        ]
      }
    ],
    faqs: [
      {
        q: 'Can Claude Code and Cursor share the same .archray installation?',
        a: 'Yes. Install with `sh -s -- . claude,cursor` (or `--agent all`). Both hosts write into `.archray/graph.json` using identical Graph v2 semantics and share `.archray/tool`.'
      },
      {
        q: 'Does ArchRay add external MCP servers or slow down Cursor indexing?',
        a: 'No MCP background server is needed. `.cursor/rules/archray.mdc` is lightweight Markdown and the viewer CLI only runs when building or validating `.archray/graph.json`.'
      },
      {
        q: 'What if Cursor generates English labels when I wanted bilingual zh-CN + en?',
        a: 'ArchRay v0.6.0 Skill explicitly asks the agent to set `meta.locales: ["zh-CN", "en"]` and translate every node, layer, edge, finding, and flow. If any entry is single-language, tell Cursor to complete bilingual translations against `.archray/graph.schema.json` and rebuild.'
      },
      {
        q: 'How do I check installation integrity inside Cursor terminal?',
        a: 'Run `./.archray/archray doctor` to verify Node.js 20+, schema assets, embedded vector brand icons (167 logos), and packaged viewer bundles.'
      }
    ],
    related: ['compare', 'claude', 'multi-host', 'reference']
  },

  /* 4. CURSOR PLAYBOOK — ZH */
  {
    pairKey: 'cursor',
    lang: 'zh-CN',
    kind: 'article',
    title: 'Cursor 代码库空间可视化指南（ArchRay 集成实战）',
    description: '在 Cursor 中安装 ArchRay 的 .cursor/rules 规则与斜杠指令，让 Agent 基于源码证据构建 3D 立体与 2D Bento 离线架构图。',
    h1: 'Cursor 代码库空间可视化指南',
    lead: '给 Cursor Composer / Agent 装上空间架构透视镜：自动读取真实调用链路、定位高耦合热点，并输出可双击离线打开的单文件 HTML 图谱。',
    tldr: '在仓库根目录执行 `sh -s -- . cursor`（或 `claude,cursor`）安装后，Cursor 会获得 `.cursor/rules/archray.mdc` 规则与 `/archray`、`/archray-frontend` 等快捷指令。在 Agent 会话中触发后，即可产出经源码核验的 `.archray/graph.json` 与 3D/2D 交互式视图。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: 'Cursor 代码可视化' }],
    howTo: {
      name: '在 Cursor 中使用 ArchRay 可视化代码库',
      totalTime: 'PT2M',
      steps: [
        { name: '在仓库根目录安装 Cursor 宿主集成', text: '运行 install.sh 并指定 `. cursor`（支持逗号拼接多宿主如 `claude,cursor`）。' },
        { name: '开启新对话并触发 /archray', text: '输入 `/archray` 或直接发送自然语言“用 archray 分析真实源码生成 3D 架构图”。' },
        { name: '免重扫切换图层与视觉主题', text: '直接打开 `.archray/index.html`，或在终端运行 `--layers`、`--style` 瞬时重切片。' }
      ]
    },
    blocks: [
      {
        id: 'setup',
        heading: '1. 部署 Cursor 规则与快捷命令',
        paragraphs: [
          '执行安装命令后，ArchRay 会把 Cursor 专用规则文件放进 `.cursor/` 目录，把运行引擎放进 `.archray/tool`，完全独立于你的项目依赖。'
        ],
        code: {
          label: '为 Cursor（或同时为 Claude Code + Cursor）安装',
          body: `${INSTALL_CMD_BASE}cursor\n# 多编辑器协同团队可用逗号一次安装：\n${INSTALL_CMD_BASE}claude,cursor`
        },
        table: {
          headers: ['生成的文件路径', '在 Cursor 中的用途'],
          rows: [
            ['.cursor/rules/archray.mdc', '工程规范规则，引导 Cursor Agent 核对真实源码路径与行号后再建模'],
            ['.cursor/commands/archray*.md', '斜杠指令入口（/archray、/archray-frontend、/archray-backend、/archray-data）'],
            ['.archray/graph.schema.json', 'v2 图谱结构与双语字段强校验文件']
          ]
        }
      },
      {
        id: 'workflow',
        heading: '2. Cursor 对话触发与终端零损耗切片',
        paragraphs: [
          '与 Claude Code 使用冒号不同，Cursor 命令文件采用连字符（例如 `/archray-frontend`），同时你也随时可以直接用中文自然语言向 Cursor Agent 发起指令。'
        ],
        code: {
          label: '在 Cursor 对话窗口触发 & 在集成终端免 Token 重构建',
          body: `# 在 Cursor Chat / Agent 窗口中输入：\n/archray\n\n# 只聚焦前端与客户端层：\n/archray-frontend\n\n# 终端零大模型开销切换跨端组合与 Glass 风格：\n./.archray/archray build .archray/graph.json --layers frontend,gateway,data --style glass --force --no-open`
        }
      },
      {
        id: 'team',
        heading: '3. 适合重构与接手陌生工程的三大动作',
        paragraphs: [
          '相比阅读大段纯文本总结，Cursor 开发者通常使用以下三步快速掌握新代码库：'
        ],
        bullets: [
          '利用右上角「健康度」透镜直击单体巨型文件或硬编码兜底配置等热点模块，直查源码路径。',
          '切换到「可替代性」透镜对比自研与托管替代方案的工作量，点击按钮直接把迁移 Prompt 复制回 Cursor Composer 执行改造。',
          '将单文件 `.archray/index.html` 或导出海报发给产品/测试同事，对方无需安装 Cursor 即可在浏览器自由缩放查阅。'
        ]
      }
    ],
    faqs: [
      {
        q: '团队里有人用 Claude Code、有人用 Cursor，配置会冲突吗？',
        a: '完全兼容。使用 `--agent claude,cursor` 或 `all` 安装后，两个工具共用同一套 `.archray/graph.json` 数据契约与本地引擎，互不覆盖。'
      },
      {
        q: 'ArchRay 会额外安装占内存的 MCP 常驻进程吗？',
        a: '不会。它采用轻量 `.mdc` 规则 + 按需调用本地 CLI 的方式工作，平时零后台常驻资源开销。'
      },
      {
        q: '为什么导出的图里只有单语内容，点顶部 中/EN 开关没全部翻译？',
        a: '确保在 Cursor 生成阶段 `meta.locales` 为 `["zh-CN", "en"]` 且所有层、节点、连线、健康度与流程均填写了双语字段；可让 Cursor 对照 `.archray/graph.schema.json` 补全后重建。'
      },
      {
        q: '如何验证 Cursor 环境下的 ArchRay 组件是否完整？',
        a: '在集成终端执行 `./.archray/archray doctor`，可一键自检 Node.js 版本、Schema 模板、167 枚内嵌矢量徽标与查看器构建包状态。'
      }
    ],
    related: ['compare', 'claude', 'multi-host', 'reference']
  },

  /* 5. CODEX, PI & ANTIGRAVITY PLAYBOOK — EN */
  {
    pairKey: 'multi-host',
    lang: 'en',
    kind: 'article',
    title: 'Codex, Pi & Antigravity Architecture Guide (ArchRay)',
    description: 'Configure ArchRay across OpenAI Codex ($archray), Pi (/skill:archray), and Antigravity agent skills with one unified installer.',
    h1: 'Codex, Pi & Antigravity Integration Guide',
    lead: 'Standardize repository architecture maps across polyglot engineering teams using Codex, Pi, Antigravity, Claude Code, and Cursor on one shared Graph v2 contract.',
    tldr: 'Pass `codex`, `pi`, `antigravity`, or `all` to ArchRay `install.sh` to install the shared CLI plus each agent’s native trigger (`$archray` or `/skills` in Codex, `/archray` or `/skill:archray` in Pi, and `.agent/skills/archray/` in Antigravity). Every host reads the same `.archray/graph.schema.json` and writes `.archray/index.html`.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'Codex, Pi & Antigravity' }],
    blocks: [
      {
        id: 'matrix',
        heading: '1. Five-Host Trigger & File Matrix',
        paragraphs: [
          'ArchRay packages first-class host adapters so teams using mixed AI coding tools produce byte-compatible `.archray/graph.json` artifacts.'
        ],
        table: {
          headers: ['AI Host', 'Installer Target', 'Session Entry Syntax', 'Workspace Files Written'],
          rows: [
            ['Codex', 'codex', '$archray or /skills', '.agents/skills/archray/SKILL.md'],
            ['Pi', 'pi', '/archray, /archray-frontend, /skill:archray', '.agents/skills/archray/ & .pi/prompts/'],
            ['Antigravity', 'antigravity', '/archray or Skill trigger', '.agent/skills/archray/ & .agent/commands/'],
            ['Claude Code', 'claude', '/archray, /archray:frontend', '.claude/skills/archray/ & .claude/commands/'],
            ['Cursor', 'cursor', '/archray, /archray-frontend', '.cursor/rules/archray.mdc & .cursor/commands/']
          ]
        }
      },
      {
        id: 'install-all',
        heading: '2. Install One Host or All Five at Once',
        paragraphs: [
          'Use `--force` with `auto` or explicit comma lists when upgrading legacy v0.4 repositories or adding a new agent host to an already-mapped repo:'
        ],
        code: {
          label: 'Install Codex, Pi, Antigravity, or all hosts',
          body: `# Specific hosts:\n${INSTALL_CMD_BASE}codex\n${INSTALL_CMD_BASE}codex,pi,antigravity\n\n# Install adapters for all 5 supported coding agents:\n${INSTALL_CMD_BASE}all`
        }
      },
      {
        id: 'lifecycle',
        heading: '3. Safe Updates, Check-Only Audits & Clean Removal',
        paragraphs: [
          'Starting from v0.5.0+, ArchRay includes native update and uninstall commands inside `.archray/archray` (and `.archray\\archray.cmd` on Windows) that respect user-owned architecture graphs:'
        ],
        code: {
          label: 'Self-contained maintenance commands',
          body: `./.archray/archray update --check   # Read-only release check vs SHA-256 manifest\n./.archray/archray update           # Upgrade CLI & Skills while preserving graph.json & index.html\n\n./.archray/archray uninstall --dry-run  # Preview files before removing adapters\n./.archray/archray uninstall            # Keep graph.json, view.json & index.html\n./.archray/archray uninstall --purge    # Remove the entire .archray/ directory`
        }
      }
    ],
    faqs: [
      {
        q: 'How do I invoke ArchRay inside Codex CLI or Codex IDE?',
        a: 'Open a new Codex session inside the repository root and type `$archray` or open `/skills` and pick `archray`. Codex automatically follows `.agents/skills/archray/SKILL.md`.'
      },
      {
        q: 'Does Pi support layer preset prompts out of the box?',
        a: 'Yes. Installing with `pi` adds prompt templates under `.pi/prompts/` alongside `.agents/skills/archray/` so both `/archray` and `/skill:archray` work cleanly.'
      },
      {
        q: 'Will running update overwrite my curated graph.json or view.json?',
        a: 'No. Both `update` and default `uninstall` preserve `.archray/graph.json`, `view.json`, and your built `index.html`. Only `uninstall --purge` deletes user-generated maps.'
      },
      {
        q: 'Can I still build views manually from existing JSON without an AI host?',
        a: 'Yes. Once `.archray/graph.json` exists, run `./.archray/archray validate` and `./.archray/archray build` directly offline with zero AI agent or network connection.'
      }
    ],
    related: ['compare', 'claude', 'cursor', 'reference']
  },

  /* 5. CODEX, PI & ANTIGRAVITY PLAYBOOK — ZH */
  {
    pairKey: 'multi-host',
    lang: 'zh-CN',
    kind: 'article',
    title: 'Codex、Pi 与 Antigravity 多 AI 宿主接入指南',
    description: '一文掌握 OpenAI Codex（$archray）、Pi（/skill:archray）与 Antigravity 的 ArchRay 安装部署、SHA-256 在线检查更新与安全卸载命令。',
    h1: 'Codex、Pi 与 Antigravity 集成指南',
    lead: '当团队同时使用 Codex CLI、Pi、Antigravity、Claude Code 与 Cursor 时，ArchRay 用统一安装器让所有宿主生成完全一致的 Graph v2 立体架构图。',
    tldr: '运行 install.sh 时传入 `codex`、`pi`、`antigravity` 或 `all`，即可按各助手规范写入原生入口（Codex 用 `$archray` 或 `/skills`，Pi 用 `/archray` 或 `/skill:archray`，Antigravity 自动发现 `.agent/skills/archray/`），全员共享同一份 `.archray/graph.json` 规范。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: 'Codex / Pi / Antigravity' }],
    blocks: [
      {
        id: 'hosts',
        heading: '1. 五大 AI 宿主触发语法与部署路径',
        paragraphs: [
          '不同编程助手读取技能与命令的目录约定不同，ArchRay 安装器已全部自动适配：'
        ],
        table: {
          headers: ['AI 宿主', '安装参数', '会话触发命令', '写入宿主路径'],
          rows: [
            ['Codex', 'codex', '$archray 或 /skills', '.agents/skills/archray/SKILL.md'],
            ['Pi', 'pi', '/archray、/archray-frontend、/skill:archray', '.agents/skills/archray/ 与 .pi/prompts/'],
            ['Antigravity', 'antigravity', '/archray 或自动 Skill 匹配', '.agent/skills/archray/ 与 .agent/commands/'],
            ['Claude Code', 'claude', '/archray、/archray:frontend', '.claude/skills/archray/ 与 .claude/commands/'],
            ['Cursor', 'cursor', '/archray、/archray-frontend', '.cursor/rules/archray.mdc 与 .cursor/commands/']
          ]
        }
      },
      {
        id: 'install',
        heading: '2. 单独安装或全宿主一键部署',
        paragraphs: [
          '支持单宿主安装、逗号多选安装，或传入 `all` 一次性为所有五大助手部署适配器：'
        ],
        code: {
          label: '安装 Codex / Pi / Antigravity / 全宿主',
          body: `# 指定单一或多宿主：\n${INSTALL_CMD_BASE}codex\n${INSTALL_CMD_BASE}codex,pi,antigravity\n\n# 全宿主一次安装：\n${INSTALL_CMD_BASE}all`
        }
      },
      {
        id: 'maint',
        heading: '3. 自包含检查更新、SHA-256 升级与卸载',
        paragraphs: [
          '从 v0.5.0 起，项目内 `.archray/archray`（Windows 下生成 `.archray\\archray.cmd`）内置完整维护命令，升级和默认卸载均保留用户的架构成果：'
        ],
        code: {
          label: '项目内维护指令（不污染全局 Node）',
          body: `./.archray/archray update --check   # 只读检查最新 Release，不改动文件\n./.archray/archray update           # 校验 SHA-256 并升级 CLI/Skill（保留 graph/view/HTML）\n\n./.archray/archray uninstall --dry-run  # 预览将被删除的适配器清单\n./.archray/archray uninstall            # 移除工具和宿主配置（保留已有图谱）\n./.archray/archray uninstall --purge    # 连同 .archray/ 产物一并彻底清除`
        }
      }
    ],
    faqs: [
      {
        q: '在 Codex 里输入 /archray 没反应怎么办？',
        a: 'Codex 原生技能调用使用 `$archray` 前缀或运行 `/skills` 选择 `archray`，也可直接用自然语言“使用 archray Skill 检查源码并构建架构图”。'
      },
      {
        q: 'Antigravity 如何触发 ArchRay？',
        a: '安装参数使用 `antigravity` 会写入 `.agent/skills/archray/` 与 `.agent/commands/`，重开会话即可按命令或 Skill 描述触发。'
      },
      {
        q: '执行 update 会覆盖我辛辛苦苦标注的 graph.json 吗？',
        a: '绝对不会。`update` 只更新工具链、Skill 与查看器模板，严格保留 `.archray/graph.json`、`view.json` 与 `index.html`。'
      },
      {
        q: 'v0.4 或更早版本如何升级到 v0.6.0？',
        a: 'v0.4.0 及更早版本尚未内置自升级命令，只需在项目根目录重新运行一次最新版 `install.sh`（可带 `. auto --force` 参数），之后即可永久享受 `.archray/archray update`。'
      }
    ],
    related: ['compare', 'claude', 'cursor', 'audit']
  },

  /* 6. OFFLINE AUDIT & BENCHMARKS — EN */
  {
    pairKey: 'audit',
    lang: 'en',
    kind: 'article',
    title: 'Offline Codebase Architecture Audit & Benchmarks',
    description: 'How ArchRay maps 7,712-file monorepos (calcom/cal.com in 196ms) completely offline with zero source upload, measured vs estimate labels, and Windows UTF-8 safety.',
    h1: 'Offline Codebase Architecture Audit & Real Benchmarks',
    lead: 'Inspecting enterprise repositories requires two non-negotiable guarantees: private source never touches external diagram servers, and large monorepos do not collapse into unreadable spiderwebs.',
    tldr: 'ArchRay runs layout and single-file HTML compilation 100% locally inside `.archray/tool` with zero telemetry and zero code upload. On the real `calcom/cal.com` monorepo (7,712 tracked files), ArchRay distilled 33 architectural modules and 75 edges across 7 layers in a 196ms ELK layout, separating measured facts from ≈ estimates and enforcing UTF-8 without BOM.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'Offline Audit & Benchmarks' }],
    blocks: [
      {
        id: 'benchmarks',
        heading: '1. Measured Real-Repository Benchmarks',
        paragraphs: [
          'Every benchmark below was tested against real repository code rather than synthetic toy stubs. Dense clusters auto-collapse with +N badges at overview zoom and expand on demand:'
        ],
        table: {
          headers: ['Repository Tested', 'Scale & Modules', 'Layout & Build Performance', 'Verified Findings Highlight'],
          rows: [
            ['calcom/cal.com (commit ae027bb)', '7,712 tracked files → 33 modules · 75 edges · 7 layers', { text: '196ms Node ELK computeLayout · 60fps orbit', strong: true }, 'Dense subpackages collapsed cleanly (+N) with zero label overlap'],
            ['FreshMart Commerce (Live Sandbox)', '16 modules · 19 edges · 5 layers · 1 Checkout flow', 'Instant local single-file HTML', 'Identifies 6.2k LOC order lock hotspot & Passport → Clerk migration scenario'],
            ['SaaS Starter & RealWorld', '43–49 source files', '0.03s CLI build', 'Maps App Router, Prisma & Stripe flows; flags JWT_SECRET fallback risk']
          ]
        }
      },
      {
        id: 'security',
        heading: '2. Zero-Upload Privacy Boundary',
        paragraphs: [
          'Traditional SaaS diagram tools upload repository metadata or prompt payloads to hosted web renderers before returning SVG screenshots. ArchRay keeps the entire rendering pipeline offline:'
        ],
        bullets: [
          'Zero telemetry & zero SaaS backend: archray.dev hosts only static marketing pages, documentation, and the FreshMart sandbox.',
          'Your AI coding session only reads files you authorize under your existing model provider policy.',
          '`.archray/index.html` embeds React, the 3D spatial & 2D Bento renderers, 167 vector tech logos, and the QR poster generator in one portable file that works over `file://` in air-gapped environments.',
          'Only explicit `./.archray/archray update` queries GitHub Releases read-only to check `latest.json` and verify SHA-256.'
        ]
      },
      {
        id: 'provenance',
        heading: '3. Measured Facts vs ≈ Static Estimates & UTF-8 Safety',
        paragraphs: [
          'ArchRay forbids presenting guessed LLM numbers as live production telemetry. Schema fields explicitly annotate each metric’s `origin` (`measured` vs `estimated`, rendered with an `≈` indicator in the UI).',
          'Starting in v0.6.0, ArchRay also hardens cross-platform CJK reliability: CLI validation detects `?` placeholder or `U+FFFD` replacement character corruption, supports decoding GB18030 and UTF-16 inputs cleanly, and requires UTF-8 without BOM output when coding agents write `.archray/graph.json` on Windows.'
        ],
        code: {
          label: 'Audit & export commands after AI graph generation',
          body: `./.archray/archray validate .archray/graph.json\n./.archray/archray build .archray/graph.json --force --no-open\n# Open .archray/index.html -> Export unclipped full-bounds PNG or offline QR poster`
        }
      }
    ],
    faqs: [
      {
        q: 'Does ArchRay replace APM tools like Datadog, OpenTelemetry, or Prometheus?',
        a: 'No. ArchRay explicitly distinguishes static repository evidence from runtime monitoring. It inspects repository architecture, file dependencies, and migration options without deploying runtime agents.'
      },
      {
        q: 'Why does the Health Overview panel distinguish measured vs ≈ metrics?',
        a: 'Exact values counted directly from files (like module file count or measured LOC) show verbatim; inferred or sampled complexity/risk heuristics display an ≈ prefix and provenance note so engineers know what to verify.'
      },
      {
        q: 'How does unclipped PNG export avoid chopping off wide layers?',
        a: 'Instead of screenshotting only the current browser viewport, ArchRay re-projects the full 3D or 2D world-space bounding envelope of every node and layer plate cleanly into a high-resolution offscreen canvas.'
      },
      {
        q: 'What does `validate` check beyond JSON syntax?',
        a: 'TypeBox schema validation verifies globally unique node IDs, resolvable edge source/target endpoints, flow steps, bilingual locale coverage when multiple locales are declared, and UTF-8 encoding integrity (catching ??? corruption).'
      }
    ],
    related: ['compare', 'claude', 'reference', 'cursor']
  },

  /* 6. OFFLINE AUDIT & BENCHMARKS — ZH */
  {
    pairKey: 'audit',
    lang: 'zh-CN',
    kind: 'article',
    title: '大型 Monorepo 离线架构审计与实测基准（零源码外传）',
    description: '深入解析 ArchRay 如何在完全离线零上传条件下处理 7,712 文件大型 Monorepo（calcom/cal.com 196ms 排版）、实测与 ≈ 估算边界以及 v0.6.0 Windows UTF-8 乱码防护。',
    h1: '大型 Monorepo 离线架构审计与实测基准',
    lead: '企业代码架构审查有两条底线：私有源码不能传给第三方画图 SaaS，面对几千个文件的 Monorepo 也不能铺成一团毫无层次的蜘蛛网。',
    tldr: 'ArchRay 在 `.archray/tool` 内完全本地离线完成图谱校验与单文件 HTML 构建，零遥测、零服务器外传。在真实开源大仓 `calcom/cal.com`（7,712 个跟踪文件）实测中，ArchRay 将架构收敛为 33 个核心模块、75 条边与 7 层，ELK 确定性布局仅耗时 196ms，同时清晰标出实测值与 ≈ 静态估算值并强制 UTF-8 无 BOM 校验。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: '离线审计与基准' }],
    blocks: [
      {
        id: 'benchmarks',
        heading: '1. 真实工程仓库实测数据',
        paragraphs: [
          '以下基准均直接采集自真实工程仓库，而非拼接假图。高密子包在全景视角会自动折叠显示 `+N` 标记，需要时可单点或分层下钻：'
        ],
        table: {
          headers: ['实测仓库', '架构体量与模块数', '布局与构建耗时', '关键工程发现'],
          rows: [
            ['calcom/cal.com (commit ae027bb)', '7,712 跟踪文件 → 33 模块 · 75 边 · 7 层', { text: 'Node ELK 布局 196ms · 60fps 流畅交互', strong: true }, '高密子包默认 +N 自动折叠，标签零重叠'],
            ['FreshMart Commerce（官网在线沙盒）', '16 模块 · 19 边 · 5 层 · Checkout 6 步链路', '本地毫秒级单文件交付', '精确定位 6,200 行订单同步锁热点并生成 Passport → Clerk 迁移方案'],
            ['SaaS Starter & RealWorld', '43–49 源文件', '0.03s CLI 快速构建', '清晰串起 App Router、Prisma、Stripe，并揪出硬编码 JWT_SECRET 回退风险']
          ]
        }
      },
      {
        id: 'privacy',
        heading: '2. 100% 离线零外传安全边界',
        paragraphs: [
          '在线 AI 画图平台通常需要把源码目录、接口关系传到平台云端再生成图片。ArchRay 彻底切断云端画图链路：'
        ],
        bullets: [
          '官网零代码存储：archray.dev 本身是纯静态网站，没有任何接收源码或架构图谱的后端接口。',
          '会话边界透明：源码审查仅发生在你主动授权使用的 AI 编程助手（如 Claude Code、Cursor、Codex）本地会话中。',
          '纯本地便携交付：生成的 `.archray/index.html` 内嵌查看器、167 枚技术栈徽标及离线二维码海报生成器，内网隔离电脑也可通过 `file://` 直接打开。',
          '仅在人为运行 `./.archray/archray update` 时只读连接 GitHub Releases 校验 SHA-256。'
        ]
      },
      {
        id: 'utf8-provenance',
        heading: '3. 实测与 ≈ 估算严格区隔 + v0.6.0 Windows 乱码防护',
        paragraphs: [
          'ArchRay 拒绝用大模型猜的数字冒充监控指标。Graph v2 规范要求指标必须标注 `origin: "measured"`（实测）或 `estimated`（前端以 `≈` 前缀高亮呈现），不虚构 QPS、延时或运行时调用统计。',
          '同时自 v0.6.0 起，针对朋友在 Windows 环境下遇到的中文变 ??? 问题，CLI 在 `validate` 阶段新增“孤立问号占位与 U+FFFD 替换符”检测、支持自动解码 GB18030/UTF-16 编码文件，并在 Skill 规范中禁止用 PowerShell 默认编码重定向写入中文 JSON。'
        ],
        code: {
          label: '生成后本地离线校验与重建命令',
          body: `./.archray/archray validate .archray/graph.json\n./.archray/archray build .archray/graph.json --force --no-open`
        }
      }
    ],
    faqs: [
      {
        q: 'ArchRay 能代替 Prometheus / OpenTelemetry 等生产可观测平台吗？',
        a: '不能。ArchRay 定位是静态源码与仓库结构可视化分析，不会向线上业务注入 APM 探针，也不会抓取生产真实 QPS/延迟数据。'
      },
      {
        q: '导出的高清整图 PNG 会不会像浏览器截图那样把两边切掉？',
        a: '不会。ArchRay 的整图 PNG 导出会根据所有节点和楼层的完整三维/二维世界坐标包围盒重新投影绘制，无论仓库多宽都能完整保留。'
      },
      {
        q: '`validate` 命令除了 JSON 格式还校验哪些规则？',
        a: '会基于 TypeBox 校验节点 ID 全局唯一性、边端点与流步骤引用完整性、双语仓库下所有字段的多语言对齐度，以及 UTF-8 无 BOM 与乱码损坏检查。'
      },
      {
        q: '如何验证我手里生成的旧图是安全可靠的？',
        a: '可以在查看器右侧检查每个节点附带的 sourcePaths 文件路径，并用本地 `./.archray/archray validate .archray/graph.json` 复核引用一致性；未核实代码只靠文字描述生成的内容会被列为未知项。'
      }
    ],
    related: ['compare', 'claude', 'cursor', 'reference']
  },

  /* 7. ARCHITECTURE LAYERS & GRAPH V2 REFERENCE — EN */
  {
    pairKey: 'reference',
    lang: 'en',
    kind: 'article',
    title: 'ArchRay Reference: L0–L9 Layers, Node Kinds & CLI',
    description: 'Complete ArchRay Graph v2 specification reference: 10 canonical layers (L0–L9), 19 node kinds, 14 edge protocols, 4 visual styles, and every CLI flag.',
    h1: 'L0–L9 Layers, Node Kinds & Graph v2 Reference',
    lead: 'Technical lookup for ArchRay’s canonical 10-layer taxonomy, deterministic 3D spatial zoning, node kinds, edge protocols, themes, and CLI subcommands.',
    tldr: 'ArchRay Graph v2 organizes architecture into 10 canonical layers (`client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability`), 19 node kinds, and 14 edge protocols rendered across 4 visual themes (`tech`, `blueprint`, `glass`, `paper`) with 167 embedded vector logos and 212 technology classification hints.',
    crumbs: [{ label: 'Home', href: '/' }, { label: 'Guides', href: '/guides/' }, { label: 'Layers & CLI Reference' }],
    blocks: [
      {
        id: 'layers',
        heading: '1. The 10 Canonical Architectural Layers (L0–L9)',
        paragraphs: [
          'Assigning a node to a canonical layer places it in a deterministic 3D zone (and clean Bento row in 2D) while unlocking single-layer and comma-separated CLI filtering with English or Chinese aliases:'
        ],
        table: {
          headers: ['Band', 'Canonical ID', 'CLI / Slash Aliases', '3D Spatial Role & Silhouette', 'Representative Tech'],
          rows: [
            ['L0', 'client', 'frontend, client, 前端, 客户端', 'Top Atrium · Tilted Screen Slab', 'Next.js, Vue 3, React Native, Electron'],
            ['L1', 'edge', 'network, edge, 网络, 边缘', 'Upper Ingress Buffer · Wide Slab', 'Cloudflare, Nginx, Envoy, Traefik'],
            ['L2', 'gateway', 'security, gateway, 网关, 鉴权', 'Auth Hub · Gateway Prism', 'Kong, Better Auth, Clerk, Keycloak'],
            ['L3', 'service', 'service, backend, 后端, 服务', 'Central Spine · Rounded Service Slab', 'NestJS, FastAPI, Spring Boot, Go'],
            ['L4', 'async', 'async, worker, 异步, 队列', 'Left Wing (-X) · Capsule Worker', 'Kafka, BullMQ, Socket.IO, Celery'],
            ['L5', 'data', 'data, db, 数据, 存储', 'Storage Plinth · Segmented Cylinder', 'PostgreSQL, Redis, Elasticsearch, S3'],
            ['L6', 'ai', 'ai, model, AI, 智能', 'AI Wing (-X) · Inference Core', 'Gemini, Claude, Qdrant, pgvector'],
            ['L7', 'external', 'external, saas, 外部, 三方', 'Right Orbit (+X) · Dashed Satellite', 'Stripe, Resend, Twilio, OAuth SaaS'],
            ['L8', 'platform', 'platform, infra, 平台, 运维', 'Infra Base · Foundation Plate', 'Docker, Kubernetes, Terraform, Actions'],
            ['L9', 'observability', 'observability, obs, 可观测, 监控', 'Telemetry Base · Plane', 'OpenTelemetry, Prometheus, Grafana, Sentry']
          ]
        }
      },
      {
        id: 'kinds-protocols',
        heading: '2. 19 Known Node Kinds & 14 Protocols',
        paragraphs: [
          'Known technologies (212 entries in `knowledge/tech.json`) resolve automatically against 167 embedded vector brand logos; unknown or custom components fall back crisply to role-based kind silhouettes:'
        ],
        bullets: [
          '19 known node kinds: `client`, `cli`, `gateway`, `service`, `worker`, `function`, `library`, `module`, `database`, `cache`, `queue`, `storage`, `search`, `external-api`, `ai-model`, `config`, `group`, `saas`, `archive` (custom strings also permitted).',
          '14 known edge protocols: `http`, `grpc`, `graphql`, `ws`, `sse`, `amqp`, `kafka`, `sql`, `redis`, `ipc`, `import`, `fs`, `llm`, `event`.',
          '4 visual themes (`--style`): `tech` (default deep studio), `blueprint` (architectural cyan), `glass` (translucent frost), `paper` (high-contrast print light).',
          '3 motion presets (`--motion`): `full`, `calm`, `off` (respecting `prefers-reduced-motion`).'
        ]
      },
      {
        id: 'schema-example',
        heading: '3. Minimal Graph v2 JSON Example',
        paragraphs: [
          'AI coding agents write semantic facts only—zero pixel coordinates are ever authored by hand in `.archray/graph.json`:'
        ],
        code: {
          label: 'Minimal bilingual v2 node & edge structure (.archray/graph.json)',
          body: `{\n  "schemaVersion": "2.0",\n  "meta": { "name": { "en": "Acme App", "zh-CN": "Acme 应用" }, "locales": ["en", "zh-CN"], "generatedAt": "2026-11-20T00:00:00Z" },\n  "layers": [\n    { "id": "client", "name": { "en": "Client", "zh-CN": "客户端" }, "order": 0 },\n    { "id": "service", "name": { "en": "Services", "zh-CN": "业务服务" }, "order": 3 },\n    { "id": "data", "name": { "en": "Data", "zh-CN": "数据存储" }, "order": 5 }\n  ],\n  "nodes": [\n    { "id": "web", "layer": "client", "kind": "client", "name": { "en": "Web App", "zh-CN": "Web 前端" }, "sourcePaths": ["apps/web/src/app/page.tsx"] },\n    { "id": "api", "layer": "service", "kind": "service", "name": { "en": "Order API", "zh-CN": "订单服务" }, "sourcePaths": ["apps/api/src/order.ts"] },\n    { "id": "pg", "layer": "data", "kind": "database", "name": { "en": "PostgreSQL", "zh-CN": "PostgreSQL 主库" }, "tech": ["PostgreSQL"], "sourcePaths": ["prisma/schema.prisma"] }\n  ],\n  "edges": [\n    { "id": "e1", "from": "web", "to": "api", "protocol": "http" },\n    { "id": "e2", "from": "api", "to": "pg", "protocol": "sql" }\n  ]\n}`
        }
      },
      {
        id: 'cli-ref',
        heading: '4. Complete CLI Command Reference',
        paragraphs: [
          'Run from the target repository root using `./.archray/archray` (or `.archray\\archray.cmd` on Windows):'
        ],
        table: {
          headers: ['Command', 'Purpose & Key Flags'],
          rows: [
            ['./.archray/archray doctor', 'Verify Node.js 20+, bundled assets, schemas & icon packs'],
            ['./.archray/archray validate .archray/graph.json', 'Validate TypeBox schema, unique IDs, locale parity & UTF-8 integrity'],
            ['./.archray/archray build <graph.json> [flags]', 'Compile single-file HTML (--layers, --style, --lang, --motion, --output, --force, --no-open)'],
            ['./.archray/archray update [--check]', 'Read-only check or SHA-256 verified tool update preserving graph/view/index'],
            ['./.archray/archray uninstall [--dry-run] [--purge]', 'Preview or cleanly remove adapters and optionally `.archray/` artifacts']
          ]
        }
      }
    ],
    faqs: [
      {
        q: 'Do I have to use all 10 canonical layers on every repository?',
        a: 'No. Recommended maps declare 3–6 layers that actually exist in your repository (e.g., FreshMart declares 5 layers), while the CLI still maps nodes accurately into the L0–L9 taxonomy.'
      },
      {
        q: 'How are child modules grouped under a parent node?',
        a: 'Set `parent: "<parent-id>"` on child nodes inside the flat `nodes` array with globally unique IDs (e.g., `order/repo`). At overview zoom they auto-collapse cleanly into `+N` badges.'
      },
      {
        q: 'Can I save a customized camera angle and filter state?',
        a: 'Yes. Use `view.json` import/export right inside the viewer top bar to save or share exact layer toggles, lens modes, theme selection, and camera coordinates.'
      },
      {
        q: 'How many brand icons ship offline inside each built HTML file?',
        a: '167 vector brand icons derived from `@iconify-json/logos` paired with 212 technology classification rules in `knowledge/tech.json`—loaded with zero CDN calls.'
      }
    ],
    related: ['compare', 'audit', 'claude', 'cursor']
  },

  /* 7. ARCHITECTURE LAYERS & GRAPH V2 REFERENCE — ZH */
  {
    pairKey: 'reference',
    lang: 'zh-CN',
    kind: 'article',
    title: 'ArchRay 技术参考：L0–L9 架构层、节点类型、协议与 CLI',
    description: 'ArchRay Graph v2 规范完全参考：L0–L9 十个标准架构层、3D 象限分区规则、19 种节点类型、14 种协议、4 套主题与全部命令行参数。',
    h1: 'L0–L9 十层架构、节点类型与 CLI 技术参考',
    lead: '面向架构师与研发工具团队的 ArchRay Graph v2 技术词典：完整收录十层分层语义、三维空间分区、中英文别名及命令行全参数。',
    tldr: 'ArchRay Graph v2 定义了 10 个规范架构层（`client` 至 `observability`）、19 种节点类型（`kind`）与 14 种已知连接协议，支持 `tech`/`blueprint`/`glass`/`paper` 四套皮肤，内置 212 条技术栈识别提示与 167 枚离线矢量品牌徽标。',
    crumbs: [{ label: '首页', href: '/zh/' }, { label: '指南', href: '/zh/guides/' }, { label: '十层架构与 CLI 参考' }],
    blocks: [
      {
        id: 'layers',
        heading: '1. L0–L9 十个规范架构层与 3D 空间象限',
        paragraphs: [
          '每个模块归属的 canonical layer 不仅决定三维空间纵深与体块形态，还直接绑定斜杠命令和 CLI `--layers` 的中英文别名筛选：'
        ],
        table: {
          headers: ['层级', '标准层 ID', '可用中英文别名', '3D 空间分区与体块造型', '典型技术栈示例'],
          rows: [
            ['L0', 'client', 'frontend, client, 前端, 客户端', '顶层入口 · 倾斜屏幕薄板', 'Next.js, Vue 3, React Native, Electron'],
            ['L1', 'edge', 'network, edge, 网络, 边缘', '上层接入缓冲 · 宽幅接入层板', 'Cloudflare, Nginx, Envoy, Traefik'],
            ['L2', 'gateway', 'security, gateway, 网关, 鉴权', '鉴权枢纽 · 网关分流棱台', 'Kong, Better Auth, Clerk, Keycloak'],
            ['L3', 'service', 'service, backend, 后端, 服务', '中央主塔 · 圆角核心方台', 'NestJS, FastAPI, Spring Boot, Go'],
            ['L4', 'async', 'async, worker, 异步, 队列', '左侧任务翼 (-X) · 胶囊任务体', 'Kafka, BullMQ, Socket.IO, Celery'],
            ['L5', 'data', 'data, db, 数据, 存储', '核心存储底座 · 三段存储圆柱', 'PostgreSQL, Redis, Elasticsearch, S3'],
            ['L6', 'ai', 'ai, model, AI, 智能', '智能侧翼 (-X) · 推理核心体', 'Gemini, Claude, Qdrant, pgvector'],
            ['L7', 'external', 'external, saas, 外部, 三方', '右侧独立轨 (+X) · 虚线外部边界', 'Stripe, Resend, Twilio, OAuth SaaS'],
            ['L8', 'platform', 'platform, infra, 平台, 运维', '底层地基 · 基础设施宽台', 'Docker, Kubernetes, Terraform, Actions'],
            ['L9', 'observability', 'observability, obs, 可观测, 监控', '底层遥测面 · 遥测追踪平面', 'OpenTelemetry, Prometheus, Grafana, Sentry']
          ]
        }
      },
      {
        id: 'kinds-protocols',
        heading: '2. 19 种节点类型（kind）与 14 种连线协议',
        paragraphs: [
          '212 条分类提示会优先匹配 167 枚内嵌矢量徽标；如未识别到特定产品徽标，会自动匹配对应角色的三维体块图标：'
        ],
        bullets: [
          '19 种已知节点 kind：client、cli、gateway、service、worker、function、library、module、database、cache、queue、storage、search、external-api、ai-model、config、group、saas、archive（也允许自定义字符串）。',
          '14 种已知连接协议：http、grpc、graphql、ws、sse、amqp、kafka、sql、redis、ipc、import、fs、llm、event。',
          '4 套视觉主题（--style）：tech（科技深空，默认）、blueprint（架构蓝图）、glass（极光磨砂）、paper（高对比打印白底）。',
          '3 档动效控制（--motion）：full、calm、off（遵循系统减弱动效偏好）。'
        ]
      },
      {
        id: 'schema-example',
        heading: '3. Graph v2 极简双语 JSON 示例',
        paragraphs: [
          '`.archray/graph.json` 严格禁止大模型写入像素坐标，仅表达节点、父子层级与连线关系：'
        ],
        code: {
          label: '最小双语 v2 图谱结构（.archray/graph.json）',
          body: `{\n  "schemaVersion": "2.0",\n  "meta": { "name": { "zh-CN": "Acme 系统", "en": "Acme App" }, "locales": ["zh-CN", "en"], "generatedAt": "2026-11-20T00:00:00Z" },\n  "layers": [\n    { "id": "client", "name": { "zh-CN": "客户端", "en": "Client" }, "order": 0 },\n    { "id": "service", "name": { "zh-CN": "核心服务", "en": "Services" }, "order": 3 },\n    { "id": "data", "name": { "zh-CN": "数据存储", "en": "Data" }, "order": 5 }\n  ],\n  "nodes": [\n    { "id": "web", "layer": "client", "kind": "client", "name": { "zh-CN": "Web 控制台", "en": "Web App" }, "sourcePaths": ["apps/web/src/app/page.tsx"] },\n    { "id": "api", "layer": "service", "kind": "service", "name": { "zh-CN": "订单服务", "en": "Order API" }, "sourcePaths": ["apps/api/src/order.ts"] },\n    { "id": "pg", "layer": "data", "kind": "database", "name": { "zh-CN": "PostgreSQL 主库", "en": "PostgreSQL" }, "tech": ["PostgreSQL"], "sourcePaths": ["prisma/schema.prisma"] }\n  ],\n  "edges": [\n    { "id": "e1", "from": "web", "to": "api", "protocol": "http" },\n    { "id": "e2", "from": "api", "to": "pg", "protocol": "sql" }\n  ]\n}`
        }
      },
      {
        id: 'cli-ref',
        heading: '4. 全部 CLI 子命令速查',
        paragraphs: [
          '在项目根目录直接调用 `./.archray/archray`（Windows 下使用 `.archray\\archray.cmd`）：'
        ],
        table: {
          headers: ['CLI 命令', '功能与常用选项'],
          rows: [
            ['./.archray/archray doctor', '检查 Node.js 20+、内嵌 Schema、查看器与图标资源完整性'],
            ['./.archray/archray validate .archray/graph.json', 'TypeBox 校验、唯一 ID 冲突检测、双语完整度与 UTF-8 无乱码检测'],
            ['./.archray/archray build <json> [选项]', '离线构建单文件 HTML（支持 --layers、--style、--lang、--motion、--output、--force、--no-open）'],
            ['./.archray/archray update [--check]', '只读检查新版本或 SHA-256 校验更新工具链（保留现有图谱成果）'],
            ['./.archray/archray uninstall [--dry-run] [--purge]', '预览或卸载适配器与命令文件，加 --purge 清除全部产物']
          ]
        }
      }
    ],
    faqs: [
      {
        q: '每个仓库必须把 10 层全部填满吗？',
        a: '不需要。建议按仓库真实复杂度只声明 3–6 个实际存在的层（例如官网在线沙盒 FreshMart 只使用了 5 层），同时每层归属会自动匹配十层布局规则。'
      },
      {
        q: '子模块怎么归属到父节点实现自动折叠？',
        a: '在平铺 `nodes` 数组中为子节点填写 `parent: "<父节点ID>"`，确保全库节点 ID 唯一（例如 `order/repo`），缩放到全景比例时引擎会自动折叠显示 `+N` 数量标记。'
      },
      {
        q: '自定义调好的 3D 角度、隐藏层与筛选状态如何发给别人？',
        a: '点击画布顶部工具栏导出 `view.json` 并发送，对方在你导出的同一份 `index.html` 中导入该 `view.json` 即可还原完全相同的视角与高亮状态。'
      },
      {
        q: '内嵌的 167 枚技术栈品牌图标会走外部 CDN 请求吗？',
        a: '绝对不会。所有 SVG 图标全部来自构建期封装的离线图标包，生成的单文件 HTML 断网环境下照常高清展示。'
      }
    ],
    related: ['compare', 'audit', 'claude', 'multi-host']
  }
];

/* --------------------------------------------------------------------------
 * Lookup for Related Links
 * -------------------------------------------------------------------------- */
const PAGE_INDEX = Object.fromEntries(PAGES.map((p) => [`${p.pairKey}:${p.lang}`, p]));

function renderJsonLd(page, canonicalUrl, crumbs) {
  const isZh = page.lang === 'zh-CN';
  const webPageId = `${canonicalUrl}#webpage`;
  const breadcrumbId = `${canonicalUrl}#breadcrumb`;
  const imageUrl = isZh ? `${ORIGIN}/share.png` : `${ORIGIN}/share-en.png`;

  const graph = [
    {
      '@type': page.kind === 'hub' ? 'CollectionPage' : 'TechArticle',
      '@id': `${canonicalUrl}#article`,
      url: canonicalUrl,
      headline: page.h1,
      name: page.title,
      description: page.description,
      inLanguage: page.lang,
      datePublished: LASTMOD,
      dateModified: LASTMOD,
      author: { '@type': 'Person', '@id': `${ORIGIN}/#person`, name: 'David Yin', url: 'https://davidyin.dev' },
      publisher: { '@type': 'Person', '@id': `${ORIGIN}/#person`, name: 'David Yin', url: 'https://davidyin.dev' },
      about: { '@type': 'SoftwareApplication', '@id': `${ORIGIN}/#software`, name: 'ArchRay', url: `${ORIGIN}/` },
      isPartOf: { '@id': `${ORIGIN}/#website` },
      mainEntityOfPage: { '@id': webPageId },
      image: { '@type': 'ImageObject', url: imageUrl, width: 1200, height: 630 },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.answer-box p', '.guide-faq summary', '.guide-faq p']
      }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: crumbs.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: c.label,
        item: c.href ? `${ORIGIN}${c.href}` : canonicalUrl
      }))
    }
  ];

  if (page.howTo) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${canonicalUrl}#howto`,
      name: page.howTo.name,
      inLanguage: page.lang,
      totalTime: page.howTo.totalTime,
      step: page.howTo.steps.map((s, idx) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        name: s.name,
        text: s.text
      }))
    });
  }

  if (page.faqs && page.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonicalUrl}#faq`,
      inLanguage: page.lang,
      isPartOf: { '@id': webPageId },
      mainEntity: page.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2);
}

function renderHtml(page) {
  const pair = pairByKey[page.pairKey];
  const isZh = page.lang === 'zh-CN';
  const relPath = isZh ? pair.zh : pair.en;
  const canonicalUrl = `${ORIGIN}${relPath}`;
  const enUrl = `${ORIGIN}${pair.en}`;
  const zhUrl = `${ORIGIN}${pair.zh}`;
  const ogImage = isZh ? `${ORIGIN}/share.png` : `${ORIGIN}/share-en.png`;
  const ogAlt = isZh
    ? 'ArchRay 分享卡：给代码库拍张立体架构透视图'
    : 'ArchRay share card: a 3D architecture X-ray of your codebase';

  const fontUrl = isZh
    ? 'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Alumni+Sans:wght@200;300;400;600&family=JetBrains+Mono:wght@400;500;700&family=Noto+Sans+SC:wght@300;400;500;600&display=swap'
    : 'https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;500;600;700&family=Alumni+Sans:wght@200;300;400;600&family=JetBrains+Mono:wght@400;500;700&display=swap';

  const homeHref = isZh ? '/zh/' : '/';
  const guidesHref = isZh ? '/zh/guides/' : '/guides/';
  const compareHref = isZh ? '/zh/compare/mermaid-structurizr-eraser/' : '/compare/mermaid-structurizr-eraser/';
  const installHref = isZh ? '/zh/#install' : '/#install';
  const demoHref = isZh ? '/demo?locale=zh-CN' : '/demo';

  const crumbHtml = page.crumbs.map((c, idx) => {
    const item = c.href ? `<a href="${esc(c.href)}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`;
    return idx === 0 ? item : `<span class="guide-crumb-sep" aria-hidden="true">/</span>${item}`;
  }).join('');

  let bodyInner = '';
  let tocHtml = '';

  if (page.kind === 'hub') {
    const sectionsHtml = page.sections.map((sec) => {
      const rows = sec.rows.map((r) => `<li class="hub-row">
  <a class="hub-row-link" href="${esc(r.href)}">
    <div>
      <span class="hub-row-title">${esc(r.title)}</span>
      <span class="hub-row-desc">${esc(r.desc)}</span>
    </div>
    <span class="hub-row-arrow" aria-hidden="true">${isZh ? '阅读 →' : 'Read →'}</span>
  </a>
</li>`).join('\n');
      return `<section class="hub-section">
  <h2>${esc(sec.heading)}</h2>
  <ul class="hub-list" style="list-style:none;margin:0;padding:0;">
    ${rows}
  </ul>
</section>`;
    }).join('\n');

    bodyInner = `<div class="guide-shell is-hub">
  <article class="guide-article">
    <h1>${esc(page.h1)}</h1>
    <p class="guide-lead">${esc(page.lead)}</p>
    <div class="guide-meta">
      <span>ArchRay v0.6.0</span>
      <span>${isZh ? '更新于 2026-11-20' : 'Updated 2026-11-20'}</span>
      <span><a href="${esc(demoHref)}">${isZh ? '打开 3D 沙盒 ↗' : 'Open 3D Sandbox ↗'}</a></span>
    </div>
    <section class="answer-box" aria-label="${isZh ? '核心概要' : 'Summary'}">
      <p>${esc(page.tldr)}</p>
    </section>
    ${sectionsHtml}
  </article>
</div>`;
  } else {
    const tocItems = page.blocks.map((b) => `<li><a href="#${esc(b.id)}">${esc(b.heading)}</a></li>`);
    if (page.faqs && page.faqs.length) {
      tocItems.push(`<li><a href="#faq">${isZh ? '常见问题' : 'FAQ'}</a></li>`);
    }
    tocHtml = `<aside class="guide-toc" aria-label="${isZh ? '本文目录' : 'On this page'}">
  <div class="guide-toc-title">${isZh ? '本页目录' : 'On this page'}</div>
  <ul>${tocItems.join('')}</ul>
</aside>`;

    const blocksHtml = page.blocks.map((b) => {
      const ps = (b.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('\n');
      const ul = b.bullets
        ? `<ul>${b.bullets.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>`
        : '';
      const tbl = b.table ? tableBlock(b.table.headers, b.table.rows) : '';
      const cd = b.code ? codeBlock(b.code.label, b.code.body, isZh) : '';
      return `<section id="${esc(b.id)}">
  <h2>${esc(b.heading)}</h2>
  ${ps}
  ${ul}
  ${tbl}
  ${cd}
</section>`;
    }).join('\n');

    const relatedRows = (page.related || []).map((rk) => {
      const target = PAGE_INDEX[`${rk}:${page.lang}`];
      if (!target) return '';
      const targetPath = isZh ? pairByKey[rk].zh : pairByKey[rk].en;
      return `<a class="related-link" href="${esc(targetPath)}">
  <span>${esc(target.h1)}</span>
  <span>${isZh ? '查看详情 →' : 'Read guide →'}</span>
</a>`;
    }).join('\n');

    const ctaHtml = `<div class="guide-cta-band">
  <div>
    <h2>${isZh ? '30 秒装入你的仓库实测' : 'Try ArchRay on your repository in 30 seconds'}</h2>
    <p>${isZh ? '纯本地运行、零源码上传，支持 Claude Code、Cursor、Antigravity、Pi 与 Codex。' : '100% local CLI and single-file offline HTML across Claude Code, Cursor, Antigravity, Pi, and Codex.'}</p>
  </div>
  <div class="guide-cta-actions">
    <a class="btn-ink" href="${esc(installHref)}">${isZh ? '获取安装命令' : 'Install ArchRay'} <span class="arrow-amber" aria-hidden="true">→</span></a>
    <a class="btn-outline" href="${esc(demoHref)}">${isZh ? '体验 3D 沙盒' : 'Open Live Sandbox'}</a>
  </div>
</div>`;

    const relatedHtml = relatedRows
      ? `<section style="margin-top: 44px;">
  <h2>${isZh ? '继续阅读相关指南' : 'Related Guides & Reference'}</h2>
  <div class="related-list">${relatedRows}</div>
</section>`
      : '';

    bodyInner = `<div class="guide-shell">
  <article class="guide-article">
    <h1>${esc(page.h1)}</h1>
    <p class="guide-lead">${esc(page.lead)}</p>
    <div class="guide-meta">
      <span>ArchRay v0.6.0</span>
      <span>${isZh ? '作者：David Yin · 更新 2026-11-20' : 'By David Yin · Updated 2026-11-20'}</span>
      <span>MIT Open Source</span>
    </div>
    <section class="answer-box" aria-label="${isZh ? '核心结论' : 'Direct answer'}">
      <p>${esc(page.tldr)}</p>
    </section>
    ${blocksHtml}
    ${faqSection(page.faqs, isZh)}
    ${ctaHtml}
    ${relatedHtml}
  </article>
  ${tocHtml}
</div>`;
  }

  return `<!doctype html>
<html lang="${page.lang}" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}" />
  <meta name="author" content="David Yin" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="theme-color" content="#f9fafb" />
  <meta property="og:title" content="${esc(page.title)}" />
  <meta property="og:description" content="${esc(page.description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:site_name" content="ArchRay" />
  <meta property="og:locale" content="${isZh ? 'zh_CN' : 'en_US'}" />
  <meta property="og:locale:alternate" content="${isZh ? 'en_US' : 'zh_CN'}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${esc(ogAlt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(page.title)}" />
  <meta name="twitter:description" content="${esc(page.description)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="${esc(ogAlt)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="alternate" hreflang="en" href="${enUrl}" />
  <link rel="alternate" hreflang="zh-CN" href="${zhUrl}" />
  <link rel="alternate" hreflang="x-default" href="${enUrl}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="manifest" href="/manifest.webmanifest" />
  <link rel="alternate" type="text/markdown" href="${ORIGIN}/llms.txt" hreflang="en" title="LLM summary" />
  <link rel="alternate" type="text/markdown" href="${ORIGIN}/llms-zh.txt" hreflang="zh-CN" title="ArchRay 中文 LLM 完整文档" />
  <script type="application/ld+json">${renderJsonLd(page, canonicalUrl, page.crumbs)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${fontUrl}" rel="stylesheet" />
  <link rel="stylesheet" href="/styles/tokens.css?v=064" />
  <link rel="stylesheet" href="/styles/site.css?v=064" />
  <link rel="stylesheet" href="/styles/guides.css?v=064" />
</head>
<body>
  <header class="site-header">
    <div class="wrap nav-bar">
      <a class="brand-mark" href="${homeHref}" aria-label="${isZh ? 'ArchRay 首页' : 'ArchRay home'}">
        <span class="brand-glyph" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">
            <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" />
            <polyline points="3 7 12 12 21 7" />
            <line x1="12" y1="12" x2="12" y2="22" />
          </svg>
        </span>
        <span class="brand-name">ArchRay</span>
      </a>

      <nav class="nav-links" id="primaryNav" aria-label="${isZh ? '主导航' : 'Primary navigation'}">
        <a href="${homeHref}">${isZh ? '首页' : 'Home'}</a>
        <a href="${guidesHref}"${page.pairKey === 'guides-hub' ? ' class="is-active"' : ''}>${isZh ? '指南合集' : 'Guides'}</a>
        <a href="${compareHref}"${page.pairKey === 'compare' ? ' class="is-active"' : ''}>${isZh ? '工具对比' : 'Compare'}</a>
        <a href="${demoHref}">${isZh ? '实机沙盒' : 'Live Demo'}</a>
        <a href="${installHref}">${isZh ? '一键安装' : 'Install'}</a>
      </nav>

      <div class="nav-tools">
        <div class="lang-switch" role="group" aria-label="Language / 语言">
          <a href="${pair.en}" class="lang-option${isZh ? '' : ' is-active'}"${isZh ? '' : ' aria-current="page"'} hreflang="en" lang="en">EN</a>
          <a href="${pair.zh}" class="lang-option${isZh ? ' is-active' : ''}"${isZh ? ' aria-current="page"' : ''} hreflang="zh-CN" lang="zh-CN">中文</a>
        </div>
        <button type="button" class="pill-ctl" id="themeToggle" aria-label="${isZh ? '切换深浅主题' : 'Switch color theme'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          <span class="hide-xs" data-theme-label>${isZh ? '深色' : 'Dark'}</span>
        </button>
        <button type="button" class="nav-toggle" id="navToggle" aria-label="${isZh ? '打开导航' : 'Open navigation'}" aria-expanded="false" aria-controls="primaryNav">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <a class="pill-ctl nav-github" href="https://github.com/loofare/ArchRay" target="_blank" rel="noopener noreferrer" aria-label="ArchRay GitHub repository">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.19-1.49 3.16-1.18 3.16-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .31.21.67.79.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          <span>GitHub</span>
          <span class="star-glyph" aria-hidden="true">★</span>
        </a>
      </div>
    </div>
    <div class="scroll-progress-bar" id="scrollProgressBar" aria-hidden="true"></div>
  </header>

  <main class="wrap guide-main">
    <nav class="guide-crumb" aria-label="${isZh ? '面包屑导航' : 'Breadcrumb'}">${crumbHtml}</nav>
    ${bodyInner}
  </main>

  <footer class="site-footer">
    <div class="wrap footer-row">
      <p style="font-size: 0.88rem;">
        <strong style="color: var(--ink-strong);">ArchRay</strong> · ${isZh ? 'MIT 开源项目 · AI 优先的空间架构可视化工具' : 'MIT Open-Source Project · AI-First Spatial Architecture Visualizer'}
      </p>
      <div class="footer-links">
        <a href="${homeHref}">${isZh ? '首页' : 'Home'}</a>
        <a href="${guidesHref}">${isZh ? '指南合集' : 'Guides'}</a>
        <a href="${compareHref}">${isZh ? '工具对比' : 'Compare'}</a>
        <a href="${demoHref}">${isZh ? '全屏沙盒' : 'Live Demo'}</a>
        <a href="${isZh ? '/llms-zh.txt' : '/llms.txt'}">${isZh ? 'llms-zh.txt' : 'llms.txt'}</a>
        <a href="https://github.com/loofare/ArchRay" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="mailto:hello@archray.dev">hello@archray.dev</a>
      </div>
    </div>
  </footer>

  <script src="/guides.js?v=064"></script>
</body>
</html>
`;
}

function buildSitemap() {
  const entries = [
    { loc: `${ORIGIN}/`, priority: '1.0', changefreq: 'weekly', pair: { en: '/', zh: '/zh/' } },
    { loc: `${ORIGIN}/zh/`, priority: '0.9', changefreq: 'weekly', pair: { en: '/', zh: '/zh/' } },
    { loc: `${ORIGIN}/demo`, priority: '0.8', changefreq: 'monthly', pair: null }
  ];

  for (const p of PAIRS) {
    entries.push({ loc: `${ORIGIN}${p.en}`, priority: p.priority, changefreq: 'weekly', pair: p });
    entries.push({ loc: `${ORIGIN}${p.zh}`, priority: p.priority, changefreq: 'weekly', pair: p });
  }

  const urlsXml = entries.map((e) => {
    const alts = e.pair
      ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}${e.pair.en}"/>\n    <xhtml:link rel="alternate" hreflang="zh-CN" href="${ORIGIN}${e.pair.zh}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${e.pair.en}"/>`
      : '';
    return `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>${alts}\n  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urlsXml}\n</urlset>\n`;
}

for (const page of PAGES) {
  const pair = pairByKey[page.pairKey];
  const rel = page.lang === 'zh-CN' ? pair.zh : pair.en;
  const outPath = path.join(SITE, rel.replace(/^\//, ''), 'index.html');
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderHtml(page), 'utf8');
}

const sitemapPath = path.join(SITE, 'sitemap.xml');
writeFileSync(sitemapPath, buildSitemap(), 'utf8');
console.log(`gen-guides: generated ${PAGES.length} pages and synced ${path.relative(ROOT, sitemapPath)} (17 URLs).`);
