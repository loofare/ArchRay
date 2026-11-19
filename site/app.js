/* ==========================================================================
   ArchRay Official Website v2 — Interactive Studio Controller (Zero Deps)
   ========================================================================== */
(function () {
  'use strict';

  const INSTALL_URL = 'https://github.com/loofare/ArchRay/releases/latest/download/install.sh';

  const I18N = {
    'zh-CN': {
      'page.title': 'ArchRay — AI 编程助手的 3D 架构图与源码证据链',
      'page.description': 'ArchRay 是 AI 优先的架构可视化工具：在 Claude Code、Cursor、Antigravity、Pi 或 Codex 里输入 /archray，读取真实仓库源码，生成可分层、可交互、可离线分享的 3D/2D 单文件 HTML。',
      'nav.home': '首页',
      'nav.detector': '痛点解剖',
      'nav.console': '命令与分层',
      'nav.live': '实机沙盒',
      'nav.principles': '真实工程',
      'nav.install': '安装',
      'nav.privacy': '隐私与联系',
      'nav.themeToDark': '深色',
      'nav.themeToLight': '浅色',
      'nav.menu': '打开导航',
      'share.label': '分享',
      'share.title': '接手新仓库？\n先拍张立体架构图',
      'share.lede': '不用硬啃成百上千个文件，把真实依赖与架构分层立体铺开。',
      'share.captionLabel': '分享文案',
      'share.captionHint': '可直接粘贴',
      'share.caption': '把真实代码仓库直接变成可 3D 旋转、分层下钻、离线分享的单文件 HTML 架构图，无需部署。装进 Claude Code、Cursor 或 Codex，输入 /archray，立刻生成你自己的架构图。',
      'share.demoCta': '先看真实 Demo',
      'share.linkLabel': '链接',
      'share.native': '分享图片 + 链接',
      'share.imageOnly': '只分享图片',
      'share.copyImage': '复制图片',
      'share.download': '保存图片',
      'share.copyLink': '复制链接',
      'share.copyCaption': '复制文案',
      'share.previewAlt': 'ArchRay 分享卡片：给代码库拍张立体架构透视图',
      'share.statusNative': '已打开系统分享。',
      'share.statusFallback': '图片已保存，文案和链接已复制。',
      'share.statusImage': '图片已保存，可粘贴到聊天或社交平台。',
      'share.statusCopied': '已复制。',
      'share.statusImageCopied': '图片已复制，可粘贴分享。',
      'share.statusFailed': '浏览器不支持，已为你保存图片。',
      'share.close': '关闭分享',
      'common.copy': '复制',
      'common.copied': '已复制 ✓',

      'hero.parityBadge': '基于真实产物的空间渲染',
      'hero.pin1': '跨层乱线',
      'hero.pin2': '臆造黑盒',
      'hero.pin3': '僵硬白框',
      'hero.pin4': '零源码证据',
      'hero.title': '让 AI 读懂仓库源码，画出真实的空间架构。',
      'hero.lead': '装进你的 AI 编程助手，让它直接通读项目源码，几秒生成可交互的 3D 与 2D 空间架构图。',
      'hero.freeBadge': 'FREE · MIT',
      'hero.freeText': '立刻免费安装并使用，完全免费',
      'hero.capLocal': '完全本地化直管',
      'hero.capNonIntrusive': '对项目无侵入性',
      'hero.capOffline': '零源码外传',
      'hero.ctaSecondary': '查看 3D 沙盒 DEMO',
      'hero.ctaInstall': '一键安装',
      'hero.supportLabel': '全部支持：',
      'hero.lens3d': '✦ 3D 空间全景',
      'hero.lensHealth': '◉ 健康度热点',
      'hero.lensReplace': '⇄ 可替代性平替',
      'hero.caption.3d': '在同一深空 3D 舞台内预览拓扑、健康度与可替代性三种视角',
      'hero.caption.health': '健康度透镜（同源深空 3D 舞台）：高亮严重热点模块并弹出可拖拽的诊断卡片',
      'hero.caption.replace': '可替代性透镜（同源深空 3D 舞台）：预览替换目标与右侧一键复制 AI 迁移 Prompt',

      'sceneCommon.lensTopo': '拓扑',
      'sceneCommon.lensHealth': '健康',
      'sceneCommon.lensReplace': '平替',

      'scene3d.brandTitle': '鲜集电商',
      'scene3d.nodeWeb': 'Web 控制台',
      'scene3d.nodeGw': 'API 网关',
      'scene3d.nodeRec': '推荐引擎',
      'scene3d.nodeCore': '后端单体',
      'scene3d.nodeCoreSub': 'NestJS · L2',
      'scene3d.footLeft': 'Next.js · NestJS · PG',
      'scene3d.footRight': '✦ 透视 3D 环绕',

      'sceneHealth.panelTitle': '健康度总览',
      'sceneHealth.scoreLbl': '结构健康分',
      'sceneHealth.goodChip': '13 健康 · 1 严重',
      'sceneHealth.hotspotHdr': '▲ 风险热点',
      'sceneHealth.hot1Title': '订单服务',
      'sceneHealth.critTag': '严重',
      'sceneHealth.hot1Desc': 'order.service.ts',
      'sceneHealth.hot1Desc2': '6,200 行 · 同步阻塞',
      'sceneHealth.hot2Title': '推荐引擎',
      'sceneHealth.warnTag': '警告',
      'sceneHealth.hot2Desc': '实时向量化无缓存',
      'sceneHealth.nodeOrder': '订单服务 · 热点',

      'sceneReplace.banner': '⇄ 预览 · 替换 Clerk',
      'sceneReplace.oldNode': '认证鉴权',
      'sceneReplace.insTitle': '认证授权',
      'sceneReplace.insSec': '可替代性评估',
      'sceneReplace.highChip': '高可替代',
      'sceneReplace.rationale': '标准 OIDC · 自研价值低',
      'sceneReplace.managedTag': '托管平替',
      'sceneReplace.optSummary': '内置 MFA 与登录页',
      'sceneReplace.optMeta': '工作量 M · 风险 中',
      'sceneReplace.previewBtn': '预览目标',
      'sceneReplace.copyPromptBtn': '复制 Prompt',
      'sceneReplace.dropinTag': '开源自托管',
      'sceneReplace.opt2Sub': '工作量 L · 保留完整控制',

      'proof.oneMeta': '真实源码证据链，零臆测',
      'proof.twoMeta': '确定性空间布局',
      'proof.threeMeta': '离线单文件 · 向量徽标',
      'proof.fourMeta': '健康度与可替代性',

      'detector.title': '精准消除传统架构图的五大乱象。',
      'detector.subtitle': '一次切换，五格同时从通用 AI 草图缺陷变为 ArchRay 的确定性解法。',
      'detector.countBefore': '5 个待解决问题',
      'detector.countAfter': '5 / 5 已解决',
      'detector.sideBefore': '传统通病',
      'detector.sideAfter': '✦ ArchRay 解法',

      'console.title': '从你想审视的架构层开始，支持全部查看与跨端自由组合。',
      'console.subtitle': '一条命令即可查看全部 10 层，也可以单看前端、后端、数据，或用逗号跨端自由组合；未选中的关联层自动保留一跳半透明上下文。',
      'console.presetLabel': '点选视角生成命令：',
      'console.layersSummary': '10 层与自由组合',
      'console.layersSummaryHint': '展开后可单层选择或拼接',
      'console.composerLabel': 'AI 会话命令',
      'console.presetAll': '全部层 (all)',
      'console.presetFrontend': '前端 (frontend)',
      'console.presetBackend': '后端与异步 (backend)',
      'console.presetData': '数据存储 (data)',
      'console.presetNetwork': '网络与安全 (network)',
      'console.presetFeBe': '前后端组合 (frontend,backend)',
      'console.presetAi': 'AI+队列+数据 (ai,async,data)',
      'console.wellTitle': '3D 空间透视坐标栈',
      'console.faderLabel': '层距推子',
      'console.jumpDemo': '在实机沙盒中查看该层 →',
      'console.multiOff': '多选自由组合：关闭',
      'console.multiOn': '多选自由组合：开启（可勾选多层）',
      'console.btnAll': '查看全部 (L0–L9)',
      'console.modeHint': '点击单层或开启“多选自由组合”，任意拼接前端+后端+AI+数据（自动保留一跳上下游）',
      'console.bankEntry': 'ENTRY · 接入',
      'console.bankCore': 'CORE · 核心',
      'console.bankWings': 'WINGS · 侧翼',
      'console.bankBase': 'BASE · 基座',

      'live.title': '实机在线沙盒：真单文件 HTML 即刻把玩。',
      'live.subtitle': '上方还原 AI 会话指令，下方全宽内嵌由 FreshMart 构建的真实单文件 HTML。',
      'live.p3d': '3D 空间全景',
      'live.p2d': '2D Bento 版图',
      'live.pHealth': '健康度热点',
      'live.pReplace': '可替代性评估',
      'live.openFull': '新窗口全屏 ↗',
      'live.promptText': '审查当前仓库真实源码，输出双语分层 3D/2D 架构视图与热点证据。',
      'live.tip': '提示：在右侧画布拖拽旋转 3D 视角、点击 ? 查看指标图例，或点顶栏“分享”生成带开源仓库二维码的海报。',
      'live.unlock': '点击解锁 3D 旋转与缩放交互',

      'principles.title': '围绕你的真实工程构建，而非演示玩具。',
      'principles.subtitle': '页面所见均由真实仓库源码提取：玩具画法只有 4 个手绘方块、没有行号引用；ArchRay 直接读取真实代码，经数千文件 Monorepo 验证并区分实测与估算（≈）。',
      'principles.r1Tag': '大型 Monorepo',
      'principles.r1Metrics': '7,712 文件 · 33 模块 · 75 边 · 7 层',
      'principles.r1Desc': '高密子包默认 +N 折叠，196ms 完成 ELK 确定性布局，60fps 流畅缩放。',
      'principles.r2Tag': '沙盒同源工程',
      'principles.r2Metrics': '16 模块 · 21 边 · 5 层 · 3 条链路',
      'principles.r2Desc': '定位订单服务 6,200 行同步锁热点，给出 Passport → Clerk 平替方案与迁移 Prompt。',
      'principles.r3Tag': '前后端真实样本',
      'principles.r3Metrics': '43–49 源文件 · 0.03s 出图 · 零虚构指标',
      'principles.r3Desc': '精准映射 App Router、Prisma 与 Stripe 轨道，并捕获 JWT_SECRET 回退高危项。',
      'principles.leftTitle': 'AI 负责语义阅读，引擎负责确定性几何。',
      'principles.leftBody': '大模型从不直接手写 SVG 坐标，只提取经源码验证的模块与证据；布局与三维投影全由确定性引擎完成，零全局污染（.archray/ 可随时卸载）。',
      'principles.rightTitle': '每一处结论都留在仓库可审计的 JSON 里。',
      'principles.rightBody': '图谱保存为 .archray/graph.json 与 view.json 随 Git 演进，实测值与静态估算（≈）诚实分标，支持无裁切整图与离线扫码海报导出。',

      'install.title': '安装 ArchRay',
      'install.subtitle': '30 秒装入目标项目根目录，开启新会话输入 /archray，第一张空间架构图即刻生成。',
      'install.repoLink': '浏览 GitHub 源码与完整文档 →',
      'install.point1': '不修改业务源码',
      'install.point2': 'CLI、viewer、Skill 自包含在 .archray/tool',
      'install.point3': '保留 graph/view/index，可随时更新或卸载',
      'install.step1Title': '第一步：复制安装命令，在项目根目录运行',
      'install.entryLabel': '会话触发入口',
      'install.pathLabel': '写入宿主配置',
      'install.step2Title': '第二步：安装好后，复制这句话对你的 AI 说',
      'install.verify': 'SHA-256 校验 · 与 latest.json 同批发布',
      'install.release': '查看 Release',
      'install.step2Prompt': '用 archray 画一下这个项目的架构（或直接输入 /archray）',
      'install.maintLabel': '日常自检、升级与干净卸载：',

      'privacy.title': '隐私协议与合作联系',
      'privacy.subtitle': '代码资产永远留在你的本地仓库；开源共建、企业定制或技术交流欢迎直接联系。',
      'privacy.cardTitle': 'ArchRay 隐私与数据安全声明',
      'privacy.svgRepo': '本地项目源码',
      'privacy.svgOffline': '本地离线构建',
      'privacy.svgCloud': '0 字节外传',
      'privacy.p1Head': '1. 业务源码与图谱 100% 本地零上传',
      'privacy.p1Body': 'ArchRay CLI 与构建生成的单文件 HTML 完全在本地离线运行，绝不向 archray.dev 或任何远端服务器上传源码、目录名、环境变量或架构数据。',
      'privacy.p2Head': '2. 宿主 AI 会话隔离与透明边界',
      'privacy.p2Body': '代码审查与架构提取仅发生在你自行授权的 AI 编程助手（Claude Code / Cursor / Antigravity / Pi / Codex）会话内，受你所选模型服务商自身的隐私条款约束。',
      'privacy.p3Head': '3. 零埋点、零追踪、全量 MIT 开源可审计',
      'privacy.p3Body': '工具链与导出视图不含任何遥测探针或第三方追踪 Cookie；仅在主动执行 update 时只读查询 GitHub Releases 校验 SHA-256。',
      'privacy.auditLink': '在 GitHub 审计完整开源代码 →',

      'faq.title': '常见问题',
      'faq.subtitle': '关于 ArchRay 的能力、数据边界、宿主和更新方式，先看这几条。',
      'faq.q1': 'ArchRay 是什么？',
      'faq.a1': 'ArchRay 是 AI 优先的架构可视化工具。安装到仓库后，在 AI 助手里输入 /archray，它会读取真实源码并生成可分层、可交互、可离线分享的 3D/2D 单文件 HTML。',
      'faq.q2': '会上传我的源码吗？',
      'faq.a2': '不会。分析发生在你授权使用的 AI 编程助手会话里，产物保存在本地 .archray 目录；HTML 是自包含离线文件。只有主动执行 update 时才会访问 GitHub Releases 读取版本和校验文件。',
      'faq.q3': '支持哪些 AI 宿主？',
      'faq.a3': '支持 Claude Code、Cursor、Antigravity、Pi 和 Codex。Claude/Cursor/Pi 使用 /archray，Codex 使用 $archray 或 /skills。安装时可用 --agent all 或逗号列表。',
      'faq.q4': '如何安装和更新？',
      'faq.a4': '从 GitHub Releases 下载安装包或运行 bootstrap install.sh，安装到目标仓库根目录。安装后使用 ./.archray/archray update --check 检查，再用 update 应用更新；旧版 v0.4 需要一次 bootstrap 升级。',
      'faq.q5': '它和普通 AI 架构图有什么区别？',
      'faq.a5': 'ArchRay 把语义事实和确定性布局分开：AI 记录源码证据与依赖，布局引擎计算坐标和 3D/2D 投影。它强调可追溯路径、离线交付、分层查看、健康度和可替代性，而不是让模型直接画一张不可复现的图。',
      'faq.q6': '它适合哪些仓库？',
      'faq.a6': '适合需要理解真实分层、跨层依赖、技术债或迁移评估的仓库，尤其是希望把架构图离线分享给团队的项目。它不是运行时监控或自动扫描器；没有源码证据、只靠描述的图需要额外复核。',
      'contact.role': 'ArchRay 作者 · 独立开发者与架构设计',
      'contact.badge': '欢迎交流合作',
      'contact.cardDesc': '欢迎架构可视化共创、研发效能工具合作、私有化规范定制或问题反馈，以下企业邮箱与个人邮箱均可直接联系。',
      'contact.emailLabel': '联系邮箱（官方域名）',
      'contact.personalEmailLabel': '个人邮箱（直达回复）',
      'contact.siteLabel': '作者个人官网',
      'contact.repoLabel': 'GitHub 开源仓库',
      'contact.ctaMail': '写信联系我',
      'contact.ctaSite': '访问 davidyin.dev',

      'footer.note': 'MIT 开源项目 · AI 优先的空间架构可视化工具',
      'footer.faq': '常见问题',
      'footer.privacy': '隐私协议',
      'footer.demo': '全屏沙盒'
    },
    en: {
      'page.title': 'ArchRay — 3D Architecture Maps with Source Evidence for AI Coding Agents',
      'page.description': 'ArchRay is an AI-first architecture visualiser: type /archray in Claude Code, Cursor, Antigravity, Pi or Codex, read real repository source, and get a layered, interactive, offline 3D/2D single-file HTML map.',
      'nav.home': 'Home',
      'nav.detector': 'Anti-Slop',
      'nav.console': 'Commands & Layers',
      'nav.live': 'Live Sandbox',
      'nav.principles': 'Real Repos',
      'nav.install': 'Install',
      'nav.privacy': 'Privacy & Contact',
      'nav.themeToDark': 'Dark',
      'nav.themeToLight': 'Light',
      'nav.menu': 'Open navigation',
      'share.label': 'Share',
      'share.title': 'Taking Over a Codebase?\nX-Ray It in 3D',
      'share.lede': 'Skip wading through hundreds of files—unfold real layers and dependencies in three dimensions.',
      'share.captionLabel': 'Share copy',
      'share.captionHint': 'Ready to paste',
      'share.caption': 'Turn your real repo into a rotatable, drillable, offline 3D architecture map in one HTML file—no deploy. Install it in Claude Code, Cursor, or Codex, type /archray, and generate your own map now.',
      'share.demoCta': 'Open the live demo',
      'share.linkLabel': 'Link',
      'share.native': 'Share image + link',
      'share.imageOnly': 'Share image only',
      'share.copyImage': 'Copy image',
      'share.download': 'Save image',
      'share.copyLink': 'Copy link',
      'share.copyCaption': 'Copy caption',
      'share.previewAlt': 'ArchRay share card: a 3D architecture X-ray of your codebase',
      'share.statusNative': 'System share opened.',
      'share.statusFallback': 'Image saved; caption and link copied.',
      'share.statusImage': 'Image saved. Paste it into chat or social.',
      'share.statusCopied': 'Copied.',
      'share.statusImageCopied': 'Image copied. Paste it to share.',
      'share.statusFailed': 'Not supported here, so the image was saved.',
      'share.close': 'Close share dialog',
      'common.copy': 'Copy',
      'common.copied': 'Copied ✓',

      'hero.parityBadge': 'Rendered from real output',
      'hero.pin1': 'Spaghetti lines',
      'hero.pin2': 'Hallucinated box',
      'hero.pin3': 'Lifeless flat rect',
      'hero.pin4': 'Zero evidence',
      'hero.title': 'Let AI read your real repo and draw true spatial architecture.',
      'hero.lead': 'Equip your AI coding agent to read real repo source and generate interactive 3D & 2D spatial architecture maps in seconds.',
      'hero.freeBadge': 'FREE · MIT',
      'hero.freeText': 'Install and use immediately — 100% free',
      'hero.capLocal': '100% local & self-managed',
      'hero.capNonIntrusive': 'Zero project intrusion',
      'hero.capOffline': 'Zero code upload',
      'hero.ctaSecondary': 'View 3D Sandbox DEMO',
      'hero.ctaInstall': 'One-Click Install',
      'hero.supportLabel': 'All supported:',
      'hero.lens3d': '✦ 3D Spatial Atrium',
      'hero.lensHealth': '◉ Health Hotspots',
      'hero.lensReplace': '⇄ Replaceability Diff',
      'hero.caption.3d': 'Preview Topology, Health, and Replaceability inside the same Midnight 3D stage',
      'hero.caption.health': 'Health Lens (same Midnight 3D stage): highlights hotspot nodes with the draggable diagnostic summary card',
      'hero.caption.replace': 'Replaceability Lens (same Midnight 3D stage): previews target swap diff and docked AI migration prompt drawer',

      'sceneCommon.lensTopo': 'Topo',
      'sceneCommon.lensHealth': 'Health',
      'sceneCommon.lensReplace': 'Swap',

      'scene3d.brandTitle': 'FreshMart',
      'scene3d.nodeWeb': 'Web Console',
      'scene3d.nodeGw': 'API Gateway',
      'scene3d.nodeRec': 'Recommender',
      'scene3d.nodeCore': 'Backend Core',
      'scene3d.nodeCoreSub': 'NestJS · L2',
      'scene3d.footLeft': 'Next.js · NestJS · PG',
      'scene3d.footRight': '✦ 3D Perspective Orbit',

      'sceneHealth.panelTitle': 'Health Overview',
      'sceneHealth.scoreLbl': 'Health Score',
      'sceneHealth.goodChip': '13 Good · 1 Crit',
      'sceneHealth.hotspotHdr': '▲ RISK HOTSPOTS',
      'sceneHealth.hot1Title': 'Order Service',
      'sceneHealth.critTag': 'Critical',
      'sceneHealth.hot1Desc': 'order.service.ts',
      'sceneHealth.hot1Desc2': '6.2k LOC · Sync lock',
      'sceneHealth.hot2Title': 'Recommender',
      'sceneHealth.warnTag': 'Warn',
      'sceneHealth.hot2Desc': 'Embeds per req · No cache',
      'sceneHealth.nodeOrder': 'Order Service · Hot',

      'sceneReplace.banner': '⇄ Preview · Swap Clerk',
      'sceneReplace.oldNode': 'Auth Module',
      'sceneReplace.insTitle': 'Auth Module',
      'sceneReplace.insSec': 'REPLACEABILITY',
      'sceneReplace.highChip': 'High',
      'sceneReplace.rationale': 'Standard OIDC · Low moat',
      'sceneReplace.managedTag': 'Managed',
      'sceneReplace.optSummary': 'Hosted MFA & login flow',
      'sceneReplace.optMeta': 'Effort M · Risk Med',
      'sceneReplace.previewBtn': 'Preview Diff',
      'sceneReplace.copyPromptBtn': 'Copy Prompt',
      'sceneReplace.dropinTag': 'Self-hosted',
      'sceneReplace.opt2Sub': 'Effort L · Full control',

      'proof.oneMeta': 'Verified source citations',
      'proof.twoMeta': 'Deterministic spatial layout',
      'proof.threeMeta': 'Offline single file · vector logos',
      'proof.fourMeta': 'Health & replaceability',

      'detector.title': 'Detects and removes architecture diagram slop.',
      'detector.subtitle': 'One switch turns all five specimens from generic AI failure modes into deterministic ArchRay answers.',
      'detector.countBefore': '5 problems to resolve',
      'detector.countAfter': '5 / 5 resolved',
      'detector.sideBefore': 'Traditional Slop',
      'detector.sideAfter': '✦ ArchRay Engine',

      'console.title': 'Inspect any layer—view all 10 layers or combine ends freely.',
      'console.subtitle': 'Inspect all 10 layers with one command, focus on frontend/backend/data, or combine multiple layers with commas; 1-hop neighbors stay softly visible.',
      'console.presetLabel': 'Pick a view to compose command:',
      'console.layersSummary': '10 layers & combinations',
      'console.layersSummaryHint': 'Open to select one layer or combine several',
      'console.composerLabel': 'Agent Command',
      'console.presetAll': 'All (all)',
      'console.presetFrontend': 'Frontend (frontend)',
      'console.presetBackend': 'Backend + Async (backend)',
      'console.presetData': 'Data (data)',
      'console.presetNetwork': 'Network (network)',
      'console.presetFeBe': 'FE + BE (frontend,backend)',
      'console.presetAi': 'AI + Async + DB (ai,async,data)',
      'console.wellTitle': '3D Perspective Coordinate Stack',
      'console.faderLabel': 'Explode',
      'console.jumpDemo': 'Explore this layer in the live sandbox ↓',
      'console.multiOff': 'Multi-Layer Combo: OFF',
      'console.multiOn': 'Multi-Layer Combo: ON (select multiple)',
      'console.btnAll': 'View All (L0–L9)',
      'console.modeHint': 'Click a layer keycap, or enable Multi-Layer Combo to stitch ends (1-hop neighbors stay dimmed)',
      'console.bankEntry': 'ENTRY · Access',
      'console.bankCore': 'CORE · Compute',
      'console.bankWings': 'WINGS · Side',
      'console.bankBase': 'BASE · Infra',

      'live.title': 'ArchRay in action: live single-file HTML.',
      'live.subtitle': 'Top strip shows the coding-agent prompt; below embeds the real self-contained FreshMart HTML build.',
      'live.p3d': '3D Spatial Atrium',
      'live.p2d': '2D Bento Map',
      'live.pHealth': 'Health Hotspots',
      'live.pReplace': 'Replaceability',
      'live.openFull': 'Open Fullscreen ↗',
      'live.promptText': 'Analyze real repository source code, build a bilingual layered 3D/2D architecture map, and surface health hotspots.',
      'live.tip': 'Tip: Drag inside the canvas to orbit in 3D, click ? on metric pills for legends, or open Share to export a QR poster.',
      'live.unlock': 'Click to unlock interactive 3D orbit & zoom',

      'principles.title': 'Built around your real engineering repo, not a toy demo.',
      'principles.subtitle': 'Everything here comes from reading real source repositories: toy diagrams draw 4 unlinked boxes without citations, while ArchRay is benchmarked on 7,700+ file monorepos with measured vs. ≈ estimate provenance.',
      'principles.r1Tag': 'Large Monorepo',
      'principles.r1Metrics': '7,712 files · 33 modules · 75 edges · 7 layers',
      'principles.r1Desc': 'Dense packages auto-collapse (+N) into a 196ms ELK layout with 60fps 3D orbit.',
      'principles.r2Tag': 'Live Sandbox Source',
      'principles.r2Metrics': '16 modules · 21 edges · 5 layers · 3 flows',
      'principles.r2Desc': 'Finds the 6.2k LOC sync lock hotspot and writes Passport → Clerk migration prompts.',
      'principles.r3Tag': 'FE + BE Real Benchmarks',
      'principles.r3Metrics': '43–49 source files · 0.03s build · Zero fluff',
      'principles.r3Desc': 'Maps App Router, Prisma, and Stripe flows while flagging hardcoded JWT_SECRET fallbacks.',
      'principles.leftTitle': 'Agents extract facts. The engine computes geometry.',
      'principles.leftBody': 'LLMs never hand-author SVG coordinates. Your agent outputs verified modules and source evidence; deterministic layout and 3D projection stay clean inside .archray/.',
      'principles.rightTitle': 'Every claim lives in auditable repo JSON.',
      'principles.rightBody': 'Architecture state stays in Git-friendly .archray/graph.json and view.json, separating measured facts from ≈ estimates with unclipped PNG & QR poster exports.',

      'install.title': 'Install ArchRay',
      'install.subtitle': 'Install into your project root in 30 seconds, open a fresh agent session, and run /archray.',
      'install.repoLink': 'Browse source & full docs on GitHub →',
      'install.point1': 'Does not modify application source',
      'install.point2': 'CLI, viewer and Skill are self-contained in .archray/tool',
      'install.point3': 'Keeps graph/view/index; update or uninstall anytime',
      'install.step1Title': 'Step 1: Copy install command & run in repo root',
      'install.entryLabel': 'Session trigger',
      'install.pathLabel': 'Host files written',
      'install.step2Title': 'Step 2: Once installed, copy & say this to your AI',
      'install.verify': 'SHA-256 verified · shipped with latest.json',
      'install.release': 'View release',
      'install.step2Prompt': 'Map this project architecture with archray (or type /archray)',
      'install.maintLabel': 'Health check, update & clean uninstall:',

      'privacy.title': 'Privacy Policy & Collaboration',
      'privacy.subtitle': 'Your source code never leaves your machine. Reach out directly for partnerships, custom workflows, or feedback.',
      'privacy.cardTitle': 'ArchRay Privacy & Data Security Policy',
      'privacy.p1Head': '1. 100% Local Execution · Zero Source Upload',
      'privacy.p1Body': 'ArchRay CLI and single-file HTML views run entirely offline on your machine. No source code, file paths, secrets, or architecture graphs are ever uploaded to archray.dev or external servers.',
      'privacy.p2Head': '2. Host Coding-Agent Boundary',
      'privacy.p2Body': 'Source analysis happens solely inside your own authorized AI coding session (Claude Code, Cursor, Antigravity, Pi, or Codex) under your chosen provider’s terms.',
      'privacy.p3Head': '3. Zero Telemetry, Zero Cookies, MIT Auditable',
      'privacy.p3Body': 'Generated HTML views and CLI tools contain zero analytics beacons or tracking cookies; update checks perform read-only GitHub Release SHA-256 verification.',
      'privacy.auditLink': 'Audit full MIT open-source repository on GitHub →',
      'privacy.svgRepo': 'Local Source',
      'privacy.svgOffline': 'Offline Build',
      'privacy.svgCloud': '0 Bytes Sent',

      'faq.title': 'FAQ',
      'faq.subtitle': 'Short answers about ArchRay capabilities, data boundaries, hosts and updates.',
      'faq.q1': 'What is ArchRay?',
      'faq.a1': 'ArchRay is an AI-first architecture visualiser. Install it into a repository, type /archray in your AI assistant, and it reads real source to produce layered, interactive, offline 3D/2D single-file HTML.',
      'faq.q2': 'Does it upload my source?',
      'faq.a2': 'No. Analysis runs inside the AI assistant session you authorize, and artifacts stay in the local .archray directory; the HTML is self-contained. Only an explicit update contacts GitHub Releases to read the version and verify the archive.',
      'faq.q3': 'Which AI hosts are supported?',
      'faq.a3': 'Claude Code, Cursor, Antigravity, Pi and Codex. Claude/Cursor/Pi use /archray; Codex uses $archray or /skills. Install with --agent all or a comma-separated list.',
      'faq.q4': 'How do I install and update?',
      'faq.a4': 'Download the release or run the bootstrap install.sh in the target repository root. Then use ./.archray/archray update --check followed by update; v0.4 and older need a one-time bootstrap upgrade.',
      'faq.q5': 'How is it different from a generic AI diagram?',
      'faq.a5': 'ArchRay separates semantic facts from deterministic layout: the AI records source evidence and dependencies, while the layout engine computes coordinates and 3D/2D projections. It focuses on traceable paths, offline delivery, layers, health and replaceability instead of a one-off image.',
      'faq.q6': 'Which repositories is it for?',
      'faq.a6': 'It fits repositories where you need to understand real layers, cross-layer dependencies, technical debt or migration options, especially when the map should be shared offline. It is not runtime monitoring or an automatic scanner; description-only maps need extra review.',
      'contact.role': 'Creator of ArchRay · Builder & Architect',
      'contact.badge': 'Open to Inquiries',
      'contact.cardDesc': 'Open to developer-tool collaborations, enterprise architecture workflows, and feedback via either domain or personal email.',
      'contact.emailLabel': 'Contact Email (Domain)',
      'contact.personalEmailLabel': 'Personal Email (Direct)',
      'contact.siteLabel': 'Author Website',
      'contact.repoLabel': 'Open-Source Repo',
      'contact.ctaMail': 'Send an Email',
      'contact.ctaSite': 'Visit davidyin.dev',

      'footer.note': 'MIT Open-Source Project · AI-First Spatial Architecture Visualizer',
      'footer.faq': 'FAQ',
      'footer.privacy': 'Privacy',
      'footer.demo': 'Fullscreen Demo'
    }
  };

  const SPECIMENS = {
    'zh-CN': {
      before: [
        { tag: '跨层乱线蜘蛛网', title: '所有连线挤在同一平面互相穿透', desc: '前端、网关、后台线程与数据库堆叠在无序矩形里，节点超过 15 个即彻底失去可读性。', code: 'crossings: 28 · unreadable' },
        { tag: 'AI 臆测黑盒', title: '凭目录名字脑补不存在的调用关系', desc: '缺少 schema 校验与源码引用约束，架构图看似完整却与真实代码脱节。', code: 'citations: 0 · unverified' },
        { tag: '死板同质白框', title: '网关、数据库与消息队列长相完全一样', desc: '无法一眼分辨存储基座、异步任务流与三方外部依赖的技术角色。', code: 'generic rect × 25' },
        { tag: '静态死图无诊断', title: '看不出哪里存在高耦合或供应商锁定', desc: '画完即止，无法辅助技术债治理、框架升级或云服务平替决策。', code: 'insights: none' },
        { tag: '截图裁切难分享', title: '大图截不全、外链图床泄露代码隐私', desc: '浏览器手动截图只剩局部残片，依赖在线制图服务又无法通过安全合规审查。', code: 'clipped viewport' }
      ],
      after: [
        { tag: '✓ 空间分层 + 确定性分流', title: '3D 象限分离核心塔、异步翼与外部轨', desc: 'ELK 自动计算端口锚点，跨层调用合并为清爽光束，高密子模块默认智能折叠。', code: '0 label overlaps · 3D + 2D' },
        { tag: '✓ 真实源码行号证据链', title: '点击任意节点直查源码路径与行号依据', desc: 'TypeBox 强校验 + 双语完整性检查，未证实的推测强制隔离到未知项清单。', code: 'apps/api/src/order/order.service.ts' },
        { tag: '✓ 167 枚徽标 + 3D 语义体块', title: '客户端屏、服务方台、存储圆柱一眼可辨', desc: '离线内嵌 167 枚官方技术栈矢量图标，自动映射三维体块造型与层级色温。', code: '167 vector logos embedded' },
        { tag: '✓ 健康度热点 + 平替提示词', title: '可拖拽总览面板直达高风险与锁定模块', desc: '评估平替方案工作量与风险级别，一键复制迁移 Prompt 发回 AI 编程助手。', code: 'Passport → Clerk (Medium)' },
        { tag: '✓ 无裁切整图 + 离线二维码海报', title: '一键导出超清全景图与开源溯源分享卡', desc: '按完整三维/二维包络重投影渲染，内置零网络二维码生成器，安全脱敏传播。', code: '4440×4002 PNG · 100% offline' }
      ]
    },
    en: {
      before: [
        { tag: 'Spaghetti crossings', title: 'Every edge collides on a single flat plane', desc: 'Clients, gateways, workers, and databases pile into undifferentiated boxes that collapse past 15 nodes.', code: 'crossings: 28 · unreadable' },
        { tag: 'Hallucinated boxes', title: 'Agents guess edges from folder names alone', desc: 'Without schema validation or file:line citations, pretty diagrams silently drift from real code.', code: 'citations: 0 · unverified' },
        { tag: 'Identical flat rectangles', title: 'Gateways, queues, and SQL stores look identical', desc: 'Zero visual distinction between stateful persistence, async workers, and third-party SaaS APIs.', code: 'generic rect × 25' },
        { tag: 'Dead static diagram', title: 'Hides coupling bottlenecks and vendor lock-in', desc: 'Once exported, static charts offer zero help for tech-debt triage or migration planning.', code: 'insights: none' },
        { tag: 'Clipped & leaky exports', title: 'Manual screenshots clip; cloud tools leak code', desc: 'Viewport captures chop off outer layers while SaaS diagramming uploads proprietary repo metadata.', code: 'clipped viewport' }
      ],
      after: [
        { tag: '✓ Spatial zones + ELK ports', title: '3D quadrants separate core, async, and external', desc: 'Deterministic port routing bundles cross-layer conduits while dense clusters auto-collapse cleanly.', code: '0 label overlaps · 3D + 2D' },
        { tag: '✓ File & line evidence trail', title: 'Every node and edge links to verified source', desc: 'TypeBox schema + bilingual checks quarantine unverified assumptions into explicit unknowns.', code: 'apps/api/src/order/order.service.ts' },
        { tag: '✓ 167 logos + 3D silhouettes', title: 'Tilted screens, service slabs, and storage cylinders', desc: 'Embeds 167 crisp vector tech icons offline with semantic 3D geometry per architectural role.', code: '167 vector logos embedded' },
        { tag: '✓ Health & replaceability lens', title: 'Draggable overview pinpoints hotspots & lock-in', desc: 'Compare drop-in vs managed alternatives and copy ready-to-run migration prompts for your agent.', code: 'Passport → Clerk (Medium)' },
        { tag: '✓ Unclipped PNG + QR poster', title: 'Full-bounds export & offline QR share cards', desc: 'Re-projects the entire 3D/2D bounding envelope with an offline-encoded repository QR footer.', code: '4440×4002 PNG · 100% offline' }
      ]
    }
  };

  const LAYERS = [
    { id: 'L0', key: 'client', bank: 'Entry', cli: 'client', color: '#38bdf8',
      zh: { name: '前端与客户端', zone: '3D 顶层入口', shape: '倾斜屏幕薄板', desc: '承载 Web SPA、SSR 控制台、移动端 App 与桌面端壳，位于三维全景最上方入口层。' },
      en: { name: 'Client & UI', zone: '3D TOP ATRIUM', shape: 'Tilted Screen Slab', desc: 'Web SPAs, SSR consoles, mobile apps, and desktop shells crowning the top of the 3D atrium.' },
      tech: ['Next.js 14', 'Vue 3', 'React Native', 'Electron'] },
    { id: 'L1', key: 'edge', bank: 'Entry', cli: 'edge', color: '#22d3ee',
      zh: { name: '边缘与接入网络', zone: '3D 上层缓冲', shape: '宽幅接入层板', desc: 'CDN、DNS、WAF 与反向代理负载均衡，承接公网流量进入内网边界。' },
      en: { name: 'Edge & Network', zone: '3D UPPER BUFFER', shape: 'Wide Ingress Slab', desc: 'CDN, DNS, WAF, and reverse-proxy load balancers shielding internal workloads.' },
      tech: ['Cloudflare', 'Nginx', 'Envoy', 'Traefik'] },
    { id: 'L2', key: 'gateway', bank: 'Entry', cli: 'gateway', color: '#3b82f6',
      zh: { name: '安全与网关层', zone: '3D 鉴权枢纽', shape: '网关分流棱台', desc: 'API 网关、OAuth/OIDC 身份认证、限流熔断与权限策略路由中心。' },
      en: { name: 'Auth & Gateway', zone: '3D AUTH HUB', shape: 'Gateway Prism', desc: 'API gateways, OAuth/OIDC identity providers, rate limiting, and policy enforcement.' },
      tech: ['Kong', 'Better Auth', 'Clerk', 'Keycloak'] },
    { id: 'L3', key: 'service', bank: 'Core', cli: 'service', color: '#818cf8',
      zh: { name: '核心业务服务', zone: '3D 中央主塔', shape: '圆角核心方台', desc: 'REST / GraphQL / gRPC 领域服务与核心业务编排模块，构成架构中央主轴。' },
      en: { name: 'Core Services', zone: '3D CENTRAL TOWER', shape: 'Rounded Service Slab', desc: 'Domain microservices, REST/gRPC APIs, and business orchestration forming the central spine.' },
      tech: ['NestJS', 'FastAPI', 'Spring Boot', 'Go'] },
    { id: 'L4', key: 'async', bank: 'Core', cli: 'async', color: '#f59e0b',
      zh: { name: '异步与实时通道', zone: '3D 左侧任务翼 (-X)', shape: '胶囊任务体', desc: '消息队列、后台消费者线程、定时任务与 WebSocket 实时事件推送侧翼。' },
      en: { name: 'Async & Realtime', zone: '3D LEFT WING (-X)', shape: 'Capsule Worker', desc: 'Message queues, background workers, cron jobs, and WebSocket event streams.' },
      tech: ['Kafka', 'BullMQ', 'Socket.IO', 'Celery'] },
    { id: 'L5', key: 'data', bank: 'Core', cli: 'data', color: '#34d399',
      zh: { name: '数据与持久存储', zone: '3D 核心底座', shape: '三段存储圆柱', desc: '关系型主库、缓存集群、全文检索引擎与对象存储桶，采用高辨识度圆柱体块。' },
      en: { name: 'Data & Storage', zone: '3D STORAGE PLINTH', shape: 'Segmented Cylinder', desc: 'Relational databases, Redis caches, search indices, and S3 object buckets.' },
      tech: ['PostgreSQL 16', 'Redis 7', 'Elasticsearch', 'S3'] },
    { id: 'L6', key: 'ai', bank: 'Wings', cli: 'ai', color: '#c084fc',
      zh: { name: '智能模型与向量', zone: '3D 智能侧翼 (-X)', shape: '推理核心体', desc: '大语言模型推理网关、Embedding 管线、Agent 编排与向量检索服务。' },
      en: { name: 'AI & Vector', zone: '3D AI WING (-X)', shape: 'Inference Core', desc: 'LLM gateways, embedding pipelines, agent orchestrators, and vector stores.' },
      tech: ['Gemini', 'Claude', 'Qdrant', 'pgvector'] },
    { id: 'L7', key: 'external', bank: 'Wings', cli: 'external', color: '#ec4899',
      zh: { name: '外部第三方服务', zone: '3D 右侧独立轨 (+X)', shape: '虚线外部边界', desc: '支付网关、短信邮件、政务/企业征信接口等不受仓库直接控制的外部依赖。' },
      en: { name: 'External SaaS', zone: '3D RIGHT ORBIT (+X)', shape: 'Dashed Satellite', desc: 'Stripe billing, email/SMS gateways, and third-party APIs outside repo ownership.' },
      tech: ['Stripe', 'Resend', 'Twilio', 'OAuth SaaS'] },
    { id: 'L8', key: 'platform', bank: 'Base', cli: 'platform', color: '#64748b',
      zh: { name: '平台与部署基座', zone: '3D 底层地基', shape: '基础设施宽台', desc: 'Docker 容器镜像、Kubernetes 编排、CI/CD 流水线与 IaC 基础设施定义。' },
      en: { name: 'Platform & Ops', zone: '3D INFRA BASE', shape: 'Foundation Plate', desc: 'Containers, Kubernetes manifests, Terraform IaC, and CI/CD pipelines.' },
      tech: ['Docker', 'Kubernetes', 'Cloudflare', 'GitHub Actions'] },
    { id: 'L9', key: 'observability', bank: 'Base', cli: 'observability', color: '#0d9488',
      zh: { name: '可观测性与审计', zone: '3D 底层遥测面', shape: '遥测追踪平面', desc: 'OpenTelemetry 链路追踪、指标采集、集中式日志与异常告警通道。' },
      en: { name: 'Observability', zone: '3D TELEMETRY BASE', shape: 'Telemetry Plane', desc: 'Distributed tracing, metrics collection, structured logs, and error alerting.' },
      tech: ['OpenTelemetry', 'Prometheus', 'Grafana', 'Sentry'] }
  ];

  const COMBO_PRESETS = {
    all: {
      indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      slashArg: 'all',
      cliLayers: '',
      zh: {
        heading: 'ALL · L0–L9',
        title: '全栈十层全景视角',
        zone: '3D 全景空间 · 十层完整映射',
        shape: '零遗漏完整拓扑',
        desc: '一次审查全仓真实源码，同时呈现客户端入口、边缘网关、中央业务塔、异步/AI 侧翼、外部 SaaS 轨道与底层存储基础设施。',
        natural: '“用 archray 审查仓库真实源码，生成全栈 3D 架构图”'
      },
      en: {
        heading: 'ALL · L0–L9',
        title: 'Full 10-Layer System Overview',
        zone: '3D FULL ATRIUM · ALL 10 LAYERS',
        shape: 'Complete Repository Topology',
        desc: 'Inspect repository source once to map clients, gateways, central services, async/AI wings, external SaaS orbits, and storage/infra plinths.',
        natural: '“Use archray to inspect source code and build the full 3D map”'
      }
    },
    frontend: {
      indices: [0],
      slashArg: 'frontend',
      cliLayers: 'client',
      zh: {
        heading: 'PRESET · frontend',
        title: '前端与客户端切片（/archray:frontend）',
        zone: '3D 顶层入口 · L0',
        shape: '倾斜屏幕薄板 + 一跳上下文',
        desc: '聚焦 Web SPA、SSR 页面、移动端 App 与直连网关，只凸显前端职责模块，直接调用的后端接口保留半透明上下文。',
        natural: '“用 archray 只看前端与客户端层，保留一跳关联接口”'
      },
      en: {
        heading: 'PRESET · frontend',
        title: 'Frontend & Client Slice (/archray:frontend)',
        zone: '3D TOP ATRIUM · L0',
        shape: 'Tilted Screen Slab + 1-Hop Context',
        desc: 'Focuses on Web SPAs, SSR pages, and mobile apps while keeping direct downstream gateway/API edges softly visible.',
        natural: '“Use archray to focus on frontend and clients with 1-hop context”'
      }
    },
    backend: {
      indices: [3, 4],
      slashArg: 'backend',
      cliLayers: 'service,async',
      zh: {
        heading: 'PRESET · backend',
        title: '后端服务与异步任务切片（/archray:backend）',
        zone: '3D 中央主塔 + 左侧异步翼',
        shape: '服务方台 + 胶囊消费者',
        desc: '同时高亮 L3 核心业务服务与 L4 消息队列/后台消费者，清晰呈现同步 RPC 调用与异步事件解耦边界。',
        natural: '“用 archray 只看后端服务和异步任务层”'
      },
      en: {
        heading: 'PRESET · backend',
        title: 'Backend & Async Slice (/archray:backend)',
        zone: '3D CENTRAL TOWER + LEFT WING',
        shape: 'Service Slabs + Capsule Workers',
        desc: 'Highlights both L3 core business services and L4 async workers/queues so sync vs event boundaries stand out.',
        natural: '“Use archray to inspect backend services and async workers”'
      }
    },
    data: {
      indices: [5],
      slashArg: 'data',
      cliLayers: 'data',
      zh: {
        heading: 'PRESET · data',
        title: '数据与持久存储切片（/archray:data）',
        zone: '3D 核心存储底座 · L5',
        shape: '三段存储圆柱体',
        desc: '聚焦关系型数据库、Redis 缓存、检索引擎与对象存储，直观审计读写扇入压力与数据孤岛。',
        natural: '“用 archray 分析数据层和存储依赖关系”'
      },
      en: {
        heading: 'PRESET · data',
        title: 'Data & Storage Slice (/archray:data)',
        zone: '3D STORAGE PLINTH · L5',
        shape: 'Segmented Cylinders',
        desc: 'Focuses on SQL databases, Redis caches, search indices, and object storage to audit read/write fan-in.',
        natural: '“Use archray to inspect data stores and persistence dependencies”'
      }
    },
    network: {
      indices: [1, 2],
      slashArg: 'network',
      cliLayers: 'edge,gateway',
      zh: {
        heading: 'PRESET · network',
        title: '网络接入与安全网关切片（/archray:network）',
        zone: '3D 上层接入缓冲 · L1 + L2',
        shape: '宽幅接入板 + 网关棱台',
        desc: '审视 CDN、WAF、反向代理与 API 网关流转路径，快速排查外网流量入口与路由转发收敛点。',
        natural: '“用 archray 查看网络接入和网关路由层”'
      },
      en: {
        heading: 'PRESET · network',
        title: 'Network & Gateway Slice (/archray:network)',
        zone: '3D INGRESS BUFFER · L1 + L2',
        shape: 'Ingress Slab + Gateway Prism',
        desc: 'Inspects CDN, WAF, reverse proxies, and API gateway routing across the external ingress boundary.',
        natural: '“Use archray to map edge network and gateway routing”'
      }
    },
    security: {
      indices: [2],
      slashArg: 'security',
      cliLayers: 'gateway',
      zh: {
        heading: 'PRESET · security',
        title: '安全与身份鉴权切片（/archray:security）',
        zone: '3D 鉴权枢纽 · L2',
        shape: '网关鉴权棱台',
        desc: '聚焦身份认证、OAuth/OIDC、JWT 校验与限流防护模块，快速定位硬编码密钥或旁路鉴权风险。',
        natural: '“用 archray 审查安全网关与鉴权模块”'
      },
      en: {
        heading: 'PRESET · security',
        title: 'Security & Auth Slice (/archray:security)',
        zone: '3D AUTH HUB · L2',
        shape: 'Gateway Auth Prism',
        desc: 'Focuses on OAuth/OIDC providers, JWT guards, and rate limiters to surface auth bypass or lock-in risks.',
        natural: '“Use archray to audit security and authentication boundaries”'
      }
    },
    'frontend,backend': {
      indices: [0, 3, 4],
      slashArg: 'frontend,backend',
      cliLayers: 'frontend,backend',
      zh: {
        heading: 'COMBO · FE + BE',
        title: '组合：前端 + 后端 + 异步（frontend,backend）',
        zone: '跨端组合 · L0 + L3 + L4',
        shape: '跨层调用光束全亮',
        desc: '前后端联调最常用组合：同时点亮客户端页面与后端业务/队列服务，屏蔽底层运维细节，专注 API 契约与事件流。',
        natural: '“用 archray 组合查看前端和后端的调用关系”'
      },
      en: {
        heading: 'COMBO · FE + BE',
        title: 'Combo: Frontend + Backend (frontend,backend)',
        zone: 'CROSS-LAYER COMBO · L0 + L3 + L4',
        shape: 'End-to-End API Conduits Lit',
        desc: 'Ideal for fullstack feature sync: illuminates client apps alongside backend services and async queues.',
        natural: '“Use archray to combine frontend and backend layers”'
      }
    },
    'backend,data': {
      indices: [3, 4, 5],
      slashArg: 'backend,data',
      cliLayers: 'backend,data',
      zh: {
        heading: 'COMBO · 后端 + 数据库',
        title: '组合：后端 + 异步 + 数据存储（backend,data）',
        zone: '跨端组合 · L3 + L4 + L5',
        shape: '核心计算塔 + 存储圆柱',
        desc: '排查慢查询、锁竞争与数据一致性的黄金组合：直击业务服务、异步消费者与数据库/缓存之间的读写链路。',
        natural: '“用 archray 组合查看后端服务与数据库存储关系”'
      },
      en: {
        heading: 'COMBO · BE + Data',
        title: 'Combo: Backend + Data (backend,data)',
        zone: 'CROSS-LAYER COMBO · L3 + L4 + L5',
        shape: 'Core Tower + Storage Cylinders',
        desc: 'Built for backend & DBA reviews: highlights services, async workers, and SQL/Redis/Search persistence.',
        natural: '“Use archray to combine backend services and data storage”'
      }
    },
    'ai,async,data': {
      indices: [4, 5, 6],
      slashArg: 'ai,async,data',
      cliLayers: 'ai,async,data',
      zh: {
        heading: 'COMBO · AI + ASYNC',
        title: '组合：AI 模型 + 异步队列 + 向量/数据（ai,async,data）',
        zone: '跨端组合 · L4 + L5 + L6',
        shape: 'AI 侧翼 + 异步翼 + 存储底座',
        desc: '专为 AI 应用架构设计：看清 LLM 推理网关、Embedding 异步生成任务与 pgvector/Qdrant 向量库如何协同工作。',
        natural: '“用 archray 组合查看 AI 模型、异步队列和数据存储”'
      },
      en: {
        heading: 'COMBO · AI Pipeline',
        title: 'Combo: AI + Async + Data (ai,async,data)',
        zone: 'CROSS-LAYER COMBO · L4 + L5 + L6',
        shape: 'AI Wing + Worker + Vector DB',
        desc: 'Built for AI engineering: reveals LLM gateways, async embedding jobs, and vector/relational storage.',
        natural: '“Use archray to combine AI, async workers, and data layers”'
      }
    },
    'frontend,gateway,backend,data': {
      indices: [0, 2, 3, 5],
      slashArg: 'frontend,gateway,backend,data',
      cliLayers: 'frontend,gateway,backend,data',
      zh: {
        heading: 'COMBO · 核心主链路',
        title: '组合：前端 + 网关 + 后端 + 数据库',
        zone: '端到端主干 · L0 + L2 + L3 + L5',
        shape: '中央主轴垂直贯通',
        desc: '隐藏监控与外围 CI 工具链，聚焦用户请求从浏览器穿越鉴权网关、核心服务直达数据库的完整垂直主干。',
        natural: '“用 archray 组合展示前端、网关、后端到数据库的核心主链路”'
      },
      en: {
        heading: 'COMBO · Core Spine',
        title: 'Combo: Frontend + Gateway + Backend + Data',
        zone: 'VERTICAL SPINE · L0 + L2 + L3 + L5',
        shape: 'End-to-End Core Stack',
        desc: 'Hides tooling noise to trace user traffic cleanly from client UI through auth gateway and core APIs to SQL.',
        natural: '“Use archray to combine frontend, gateway, backend, and data”'
      }
    }
  };

  const HOSTS = {
    claude: { flag: 'claude', entry: '/archray · /archray:frontend', paths: '.claude/skills/archray/ · .claude/commands/archray.md' },
    cursor: { flag: 'cursor', entry: '/archray · /archray-frontend', paths: '.cursor/rules/archray.mdc · .cursor/commands/' },
    antigravity: { flag: 'antigravity', entry: '/archray · Skill (archray)', paths: '.agent/skills/archray/ · .agent/commands/' },
    pi: { flag: 'pi', entry: '/archray · /skill:archray', paths: '.agents/skills/archray/ · .pi/prompts/' },
    codex: { flag: 'codex', entry: '$archray · /skills', paths: '.agents/skills/archray/SKILL.md' }
  };

  const initialLang = new URLSearchParams(location.search).get('lang');
  const pathIsChinese = /^\/zh(?:\/|$)/.test(location.pathname);
  let lang = initialLang === 'en'
    ? 'en'
    : initialLang === 'zh-CN'
      ? 'zh-CN'
      : (pathIsChinese ? 'zh-CN' : 'en');
  let theme = 'light';
  let detectorResolved = false;
  let activePreset = 'all';
  let multiSelectMode = false;
  let selectedLayerIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  let explodeFactor = 1.15;
  let activeHeroLens = '3d';
  let activeDemoPreset = '3d';
  let activeHost = 'claude';

  function t(key) {
    return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  }

  /* ---- Hero Split Slider & 3-Lens Specimen Switcher ---- */


  function initHeroComparison() {
    const stage = document.getElementById('compareStage');
    const callouts = document.getElementById('heroCallouts');
    if (!stage) return;

    let dragging = false;
    let animTimer = null;

    function setSplit(pct, animated) {
      const clamped = Math.max(8, Math.min(92, pct));
      if (animated) {
        stage.classList.add('is-animating');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => stage.classList.remove('is-animating'), 460);
      } else {
        stage.classList.remove('is-animating');
      }
      stage.style.setProperty('--split', clamped.toFixed(1) + '%');
      stage.setAttribute('aria-valuenow', String(Math.round(clamped)));
      if (callouts) {
        callouts.style.opacity = clamped < 20 ? '0' : '1';
      }
    }

    function fromPointer(clientX) {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      setSplit(((clientX - rect.left) / rect.width) * 100, false);
    }

    stage.addEventListener('pointerdown', (e) => {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      fromPointer(e.clientX);
    });
    stage.addEventListener('pointermove', (e) => {
      if (dragging) fromPointer(e.clientX);
    });
    stage.addEventListener('pointerup', () => { dragging = false; });
    stage.addEventListener('pointercancel', () => { dragging = false; });
    stage.addEventListener('keydown', (e) => {
      const cur = Number(stage.getAttribute('aria-valuenow') || 28);
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSplit(cur - 6, true); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSplit(cur + 6, true); }
    });

    const targetSplits = { '3d': 50, health: 44, replace: 44 };

    document.querySelectorAll('[data-hero-lens]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeHeroLens = btn.getAttribute('data-hero-lens') || '3d';
        document.querySelectorAll('[data-hero-lens]').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', String(on));
        });
        setSplit(targetSplits[activeHeroLens] || 28, true);
        renderHeroSpecimenLens();
      });
    });

  }

  function renderHeroSpecimenLens() {
    const switcher = document.getElementById('heroLensSwitcher');
    const stage = document.getElementById('compareStage');
    const caption = document.getElementById('heroLensCaption');

    if (switcher) switcher.setAttribute('data-active-lens', activeHeroLens);

    document.querySelectorAll('.after-scene').forEach((scene) => {
      scene.classList.toggle('is-active', scene.getAttribute('data-scene') === activeHeroLens);
    });

    if (caption) {
      caption.textContent = t('hero.caption.' + activeHeroLens);
    }
  }

  /* ---- Section 2: Pain-Point Detector Mosaic ---- */
  function renderDetector() {
    const mosaic = document.getElementById('specimenMosaic');
    const pod = document.getElementById('detectorSwitchPod');
    const sw = document.getElementById('detectorSwitch');
    const btnBefore = document.getElementById('detectorBtnBefore');
    const btnAfter = document.getElementById('detectorBtnAfter');
    if (!mosaic || !sw) return;

    mosaic.classList.toggle('is-resolved', detectorResolved);
    sw.setAttribute('aria-checked', String(detectorResolved));
    if (pod) pod.setAttribute('data-state', detectorResolved ? 'after' : 'before');
    if (btnBefore) btnBefore.classList.toggle('is-active', !detectorResolved);
    if (btnAfter) btnAfter.classList.toggle('is-active', detectorResolved);

    const count = document.getElementById('detectorCount');
    if (count) count.textContent = detectorResolved ? t('detector.countAfter') : t('detector.countBefore');
    const dots = document.getElementById('detectorDots');
    if (dots) [...dots.children].forEach((dot) => dot.classList.toggle('is-done', detectorResolved));

    const items = SPECIMENS[lang][detectorResolved ? 'after' : 'before'];
    items.forEach((item, idx) => {
      const tagEl = document.querySelector('[data-spec-tag="' + idx + '"]');
      const titleEl = document.querySelector('[data-spec-title="' + idx + '"]');
      const descEl = document.querySelector('[data-spec-desc="' + idx + '"]');
      const codeEl = document.querySelector('[data-spec-code="' + idx + '"]');
      if (tagEl) tagEl.textContent = item.tag;
      if (titleEl) titleEl.textContent = item.title;
      if (descEl) descEl.textContent = item.desc;
      if (codeEl) codeEl.textContent = item.code;
    });

    const g = document.getElementById('specimenHeroGraphic');
    if (g) {
      if (!detectorResolved) {
        g.innerHTML =
          '<g stroke="#9c8970" stroke-width="1.4" fill="none">' +
            '<polyline points="48,38 48,136 286,136 286,44" />' +
            '<polyline points="172,34 172,98 32,98 32,148 242,148" />' +
            '<line x1="60" y1="44" x2="270" y2="128" stroke-dasharray="4 3" />' +
            '<line x1="274" y1="42" x2="68" y2="128" />' +
          '</g>' +
          '<g fill="#f6efe3" stroke="#8a7861" stroke-width="1.2" font-family="Georgia, serif" font-size="11.5">' +
            '<rect x="20" y="18" width="84" height="30" rx="2"/><text x="34" y="37" fill="#3f3224" stroke="none">Web UI</text>' +
            '<rect x="128" y="18" width="84" height="30" rx="2"/><text x="145" y="37" fill="#3f3224" stroke="none">Worker?</text>' +
            '<rect x="236" y="18" width="84" height="30" rx="2"/><text x="252" y="37" fill="#3f3224" stroke="none">Auth_v2</text>' +
            '<rect x="68" y="114" width="90" height="30" rx="2"/><text x="86" y="133" fill="#3f3224" stroke="none">SQL_raw</text>' +
            '<rect x="188" y="114" width="96" height="30" rx="2"/><text x="202" y="133" fill="#3f3224" stroke="none">ext_stripe</text>' +
          '</g>';
      } else {
        g.innerHTML =
          '<polygon points="84,36 256,22 288,46 116,60" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/>' +
          '<text x="186" y="45" text-anchor="middle" fill="#065f46" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">L0 · Web &amp; App</text>' +
          '<polygon points="84,88 256,74 288,98 116,112" fill="#eff6ff" stroke="#0284c7" stroke-width="1.5"/>' +
          '<text x="186" y="97" text-anchor="middle" fill="#075985" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">L3 · Core Services</text>' +
          '<polygon points="84,138 256,124 288,148 116,162" fill="#f8fafc" stroke="#0d9488" stroke-width="1.5"/>' +
          '<text x="186" y="147" text-anchor="middle" fill="#0f766e" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700">L5 · Postgres + Redis</text>' +
          '<path d="M186,53 L186,81 M186,105 L186,131" stroke="#10b981" stroke-width="2" />';
      }
    }
  }

  /* ---- Section 3: Tactile 10-Layer Multi-Combo Console ---- */
  function getConsoleDetails() {
    if (activePreset && COMBO_PRESETS[activePreset]) {
      const p = COMBO_PRESETS[activePreset];
      const copy = lang === 'zh-CN' ? p.zh : p.en;
      const hostPrefix = activeHost === 'codex' ? '$archray' : '/archray';
      const slashText = p.slashArg === 'all' ? hostPrefix : hostPrefix + ' ' + p.slashArg;
      const cliText = p.cliLayers
        ? './.archray/archray build .archray/graph.json --layers ' + p.cliLayers + ' --force'
        : './.archray/archray build .archray/graph.json --force';
      const techSet = [];
      p.indices.forEach((idx) => {
        LAYERS[idx].tech.slice(0, p.indices.length > 3 ? 1 : 3).forEach((item) => {
          if (!techSet.includes(item) && techSet.length < 8) techSet.push(item);
        });
      });
      return {
        heading: copy.heading,
        title: copy.title,
        slashArg: p.slashArg === 'all' ? 'all' : p.slashArg,
        slashFull: slashText,
        natural: copy.natural,
        cliCmd: cliText,
        zone: copy.zone,
        shape: copy.shape,
        desc: copy.desc,
        tech: techSet
      };
    }

    const sorted = [...selectedLayerIndices].sort((a, b) => a - b);
    if (sorted.length === 1) {
      const layer = LAYERS[sorted[0]];
      const copy = lang === 'zh-CN' ? layer.zh : layer.en;
      const hostPrefix = activeHost === 'codex' ? '$archray' : '/archray';
      const natural = lang === 'zh-CN'
        ? '“用 archray 只看 ' + copy.name + '（' + layer.cli + '），保留一跳关联上下文”'
        : '“Use archray to inspect ' + copy.name + ' (' + layer.cli + ') with 1-hop context”';
      return {
        heading: layer.id + ' · ' + layer.key,
        title: copy.name,
        slashArg: layer.cli,
        slashFull: hostPrefix + ' ' + layer.cli,
        natural,
        cliCmd: './.archray/archray build .archray/graph.json --layers ' + layer.cli + ' --force',
        zone: copy.zone,
        shape: copy.shape,
        desc: copy.desc,
        tech: layer.tech
      };
    }

    const cliList = sorted.map((i) => LAYERS[i].cli).join(',');
    const names = sorted.map((i) => (lang === 'zh-CN' ? LAYERS[i].zh.name : LAYERS[i].en.name));
    const hostPrefix = activeHost === 'codex' ? '$archray' : '/archray';
    const techSet = [];
    sorted.forEach((i) => {
      LAYERS[i].tech.slice(0, 2).forEach((item) => {
        if (!techSet.includes(item) && techSet.length < 8) techSet.push(item);
      });
    });

    return {
      heading: 'COMBO · ' + sorted.length + ' LAYERS',
      title: names.join(' + '),
      slashArg: cliList,
      slashFull: hostPrefix + ' ' + cliList,
      natural: lang === 'zh-CN'
        ? '“用 archray 组合查看 ' + names.join('、') + ' 的调用链路”'
        : '“Use archray to combine ' + names.join(', ') + '”',
      cliCmd: './.archray/archray build .archray/graph.json --layers ' + cliList + ' --force',
      zone: lang === 'zh-CN' ? '跨端自由组合 · ' + sorted.map((i) => LAYERS[i].id).join('+') : 'CUSTOM COMBO · ' + sorted.map((i) => LAYERS[i].id).join('+'),
      shape: lang === 'zh-CN' ? '自动保留一跳半透明上下文' : '1-Hop Context Dimmed Automatically',
      desc: lang === 'zh-CN'
        ? '你已自定义组合 ' + sorted.length + ' 个架构层。构建时仅高亮选中层及其内部模块，直接相连的一跳上下游模块保持半透明上下文显示。'
        : 'Custom ' + sorted.length + '-layer slice active. Selected layers render at full opacity while direct one-hop neighbors remain dimmed for context.',
      tech: techSet
    };
  }

  function renderPresetButtons() {
    document.querySelectorAll('[data-combo-preset]').forEach((btn) => {
      const key = btn.getAttribute('data-combo-preset');
      btn.classList.toggle('is-active', key === activePreset);
    });
    const modeBtn = document.getElementById('multiLayerModeBtn');
    if (modeBtn) {
      modeBtn.setAttribute('aria-pressed', String(multiSelectMode));
      modeBtn.textContent = multiSelectMode ? t('console.multiOn') : t('console.multiOff');
    }
  }

  function renderConsoleKeys() {
    const banks = { Entry: 'bankEntry', Core: 'bankCore', Wings: 'bankWings', Base: 'bankBase' };
    Object.values(banks).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    const bankHeaderEls = document.querySelectorAll('.deck-bank .bank-label');
    const bankKeys = ['console.bankEntry', 'console.bankCore', 'console.bankWings', 'console.bankBase'];
    bankHeaderEls.forEach((el, i) => { el.textContent = t(bankKeys[i]); });

    const activeSet = new Set(selectedLayerIndices);

    LAYERS.forEach((layer, idx) => {
      const container = document.getElementById(banks[layer.bank]);
      if (!container) return;
      const copy = lang === 'zh-CN' ? layer.zh : layer.en;
      const isOn = activeSet.has(idx);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hw-keycap' + (isOn ? ' is-active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isOn));
      btn.setAttribute('data-layer-idx', String(idx));
      btn.innerHTML =
        '<span class="keycap-led" aria-hidden="true"></span>' +
        '<span class="keycap-code">' + layer.id + ' · ' + layer.key + '</span>' +
        '<span class="keycap-title">' + copy.name + '</span>';
      btn.addEventListener('click', () => {
        if (multiSelectMode) {
          if (activePreset === 'all') {
            selectedLayerIndices = [idx];
          } else if (selectedLayerIndices.includes(idx)) {
            selectedLayerIndices = selectedLayerIndices.filter((i) => i !== idx);
            if (selectedLayerIndices.length === 0) {
              activePreset = 'all';
              selectedLayerIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
              renderAllConsole();
              return;
            }
          } else {
            selectedLayerIndices = [...selectedLayerIndices, idx];
          }
          activePreset = null;
        } else {
          activePreset = null;
          selectedLayerIndices = [idx];
        }
        renderAllConsole();
      });
      container.appendChild(btn);
    });
  }

  function renderConsoleInspector() {
    const info = getConsoleDetails();
    const h = document.getElementById('layerHeading');
    const title = document.getElementById('layerTitle');
    const prefix = document.getElementById('layerCmdPrefix');
    const cli = document.getElementById('layerCliArg');
    const hint = document.getElementById('layerHintLine');
    const zone = document.getElementById('layerZoneBadge');
    const shape = document.getElementById('layerShapeBadge');
    const desc = document.getElementById('layerDesc');
    const chips = document.getElementById('layerTechChips');

    if (h) h.textContent = info.heading;
    if (title) title.textContent = info.title;
    if (prefix) prefix.textContent = activeHost === 'codex' ? '$archray' : '/archray';
    if (cli) cli.textContent = info.slashArg;
    if (hint) {
      const cliFlag = info.slashArg === 'all' ? '--layers all' : '--layers ' + info.slashArg;
      hint.textContent = (lang === 'zh-CN'
        ? '对 AI 说 ' + info.natural + ' · 构建参数 ' + cliFlag + ' --style tech|blueprint|glass|paper'
        : 'Prompt: ' + info.natural + ' · CLI: ' + cliFlag + ' --style tech|blueprint|glass|paper');
    }
    if (zone) zone.textContent = info.zone;
    if (shape) shape.textContent = info.shape;
    if (desc) desc.textContent = info.desc;
    if (chips) {
      chips.innerHTML = info.tech
        .map((item) => '<span class="agent-badge">' + item + '</span>')
        .join('');
    }
  }

  function renderIsoStack() {
    const svg = document.getElementById('isoStackSvg');
    if (!svg) return;
    const activeIds = new Set(selectedLayerIndices.map((i) => LAYERS[i].id));
    const stepY = 35 * explodeFactor;
    const centerY = 140;

    const slabs = [
      { tier: 0, label: 'L0 Client', cx: 300, w: 122, h: 19, match: ['L0'], color: '#38bdf8' },
      { tier: 1, label: 'L1–L2 Edge / Gateway', cx: 300, w: 134, h: 20, match: ['L1', 'L2'], color: '#22d3ee' },
      { tier: 2, label: 'L4/L6 Async', cx: 96, w: 92, h: 17, match: ['L4', 'L6'], color: '#c084fc' },
      { tier: 2, label: 'L3 Core Services', cx: 300, w: 126, h: 20, match: ['L3'], color: '#818cf8' },
      { tier: 2, label: 'L7 External', cx: 504, w: 92, h: 17, match: ['L7'], color: '#ec4899' },
      { tier: 3, label: 'L5 Data & Storage', cx: 300, w: 128, h: 19, match: ['L5'], color: '#34d399' },
      { tier: 4, label: 'L8–L9 Platform & Obs', cx: 300, w: 142, h: 20, match: ['L8', 'L9'], color: '#0d9488' }
    ];

    const isDark = theme === 'dark';
    const baseStroke = isDark ? '#3f3f46' : '#cbd5e1';
    const baseFill = isDark ? '#232329' : '#ffffff';
    const sideFill = isDark ? '#18181c' : '#f1f5f9';
    const textFill = isDark ? '#a1a1aa' : '#64748b';

    let out = '';
    const topY = centerY + (0 - 2) * stepY;
    const botY = centerY + (4 - 2) * stepY;
    out += '<line x1="300" y1="' + topY + '" x2="300" y2="' + botY + '" stroke="' + baseStroke + '" stroke-dasharray="3 3" stroke-width="1.3" />';
    out += '<path d="M160,' + centerY + ' L212,' + centerY + ' M398,' + centerY + ' L442,' + centerY + '" stroke="' + baseStroke + '" stroke-dasharray="3 3" stroke-width="1.2" />';

    slabs.forEach((s) => {
      const cy = centerY + (s.tier - 2) * stepY;
      const hitLayerId = s.match.find((id) => activeIds.has(id));
      const isHit = Boolean(hitLayerId);
      const hitColor = hitLayerId
        ? (LAYERS.find((l) => l.id === hitLayerId)?.color || s.color)
        : s.color;

      const xL = s.cx - s.w * 0.72;
      const xT = s.cx + s.w * 0.24;
      const xR = s.cx + s.w * 0.76;
      const xB = s.cx - s.w * 0.2;
      const yT = cy - s.h;
      const yB = cy + s.h;
      const depth = 5;

      const stroke = isHit ? hitColor : baseStroke;
      const fill = isHit ? (isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5') : baseFill;
      const sw = isHit ? '2' : '1.1';

      const skirtPts = [
        xL + ',' + cy,
        xB + ',' + yB,
        xR + ',' + cy,
        xR + ',' + (cy + depth),
        xB + ',' + (yB + depth),
        xL + ',' + (cy + depth)
      ].join(' ');
      out += '<polygon points="' + skirtPts + '" fill="' + sideFill + '" stroke="' + stroke + '" stroke-width="1" />';

      const topPts = [xL + ',' + cy, xT + ',' + yT, xR + ',' + cy, xB + ',' + yB].join(' ');
      out += '<polygon points="' + topPts + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '" />';
      out += '<text x="' + s.cx + '" y="' + (cy + 3.5) + '" text-anchor="middle" fill="' + (isHit ? stroke : textFill) + '" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="' + (isHit ? '700' : '500') + '">' + s.label + '</text>';
    });

    svg.innerHTML = out;
  }

  function renderAllConsole() {
    renderPresetButtons();
    renderConsoleKeys();
    renderConsoleInspector();
    renderIsoStack();
  }

  /* ---- Section 4: Live Sandbox Controller ---- */
  function updateDemoIframe() {
    const frame = document.getElementById('demoFrame');
    const subTag = document.getElementById('sessionSubTag');
    if (!frame) return;
    if (subTag) subTag.textContent = activeDemoPreset;

    const params = new URLSearchParams();
    params.set('locale', lang === 'en' ? 'en' : 'zh-CN');
    if (activeDemoPreset === '2d') {
      params.set('projection', '2d');
      params.set('mode', 'topology');
    } else if (activeDemoPreset === 'health') {
      params.set('proj', '3d');
      params.set('mode', 'health');
    } else if (activeDemoPreset === 'replace') {
      params.set('proj', '3d');
      params.set('mode', 'replace');
    } else {
      params.set('proj', '3d');
      params.set('mode', 'topology');
    }
    frame.src = '/demo.html?' + params.toString();
  }

  /* ---- Host Installer (Install Section Selector; Hero stays on `. all`) ---- */
  function renderHostInstaller() {
    const h = HOSTS[activeHost] || HOSTS.claude;
    const cmdText = '$ curl -fsSL ' + INSTALL_URL + ' | sh -s -- . ' + h.flag;
    const cmdHtml = '$ curl -fsSL ' + INSTALL_URL.replace(/\//g, '/<wbr>') + ' | sh -s -- . ' + h.flag;
    const code = document.getElementById('hostInstallCode');
    const entry = document.getElementById('hostEntryVal');
    const paths = document.getElementById('hostPathVal');

    if (code) code.innerHTML = cmdHtml;
    if (entry) entry.textContent = h.entry;
    if (paths) paths.textContent = h.paths;

    document.querySelectorAll('[data-host]').forEach((btn) => {
      const on = btn.getAttribute('data-host') === activeHost;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
  }

  function copyWithFeedback(btn, text, restoreText) {
    if (!btn || !text) return;
    const clean = text.replace(/^\$\s*/, '').replace(/^>\s*/, '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(clean).catch(() => {});
    }
    const prev = restoreText || btn.textContent;
    btn.textContent = t('common.copied');
    setTimeout(() => {
      const i18nKey = btn.getAttribute('data-i18n');
      btn.textContent = i18nKey ? t(i18nKey) : prev;
    }, 1500);
  }

  /* ---- Global Language & Theme ---- */
  function applyAll() {
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-theme', theme);
    document.title = t('page.title');
    const isEnglish = lang === 'en';
    const canonicalUrl = isEnglish ? 'https://archray.dev/' : 'https://archray.dev/zh/';
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', isEnglish ? 'en_US' : 'zh_CN');
    const ogLocaleAlt = document.querySelector('meta[property="og:locale:alternate"]');
    if (ogLocaleAlt) ogLocaleAlt.setAttribute('content', isEnglish ? 'zh_CN' : 'en_US');

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', t('page.description'));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', t('page.title'));
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', t('page.description'));
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', t('page.title'));
    const twDescription = document.querySelector('meta[name="twitter:description"]');
    if (twDescription) twDescription.setAttribute('content', t('page.description'));
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', isEnglish ? 'https://archray.dev/share-en.png' : 'https://archray.dev/share.png');
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute('content', isEnglish ? 'https://archray.dev/share-en.png' : 'https://archray.dev/share.png');
    const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
    if (ogImageAlt) ogImageAlt.setAttribute('content', t('share.previewAlt'));

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (k) el.textContent = t(k);
    });

    const navToggle = document.getElementById('navToggle');
    if (navToggle) navToggle.setAttribute('aria-label', t('nav.menu'));

    const themeLbl = document.querySelector('[data-i18n="nav.themeLabel"]');
    if (themeLbl) {
      themeLbl.textContent = theme === 'light' ? t('nav.themeToDark') : t('nav.themeToLight');
    }

    renderHeroSpecimenLens();
    renderDetector();
    renderAllConsole();
    renderHostInstaller();
    document.querySelectorAll('[data-lang-switch]').forEach((link) => {
      const active = link.getAttribute('data-lang-switch') === lang;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-demo-link]').forEach((link) => {
      link.href = '/demo.html?locale=' + (lang === 'en' ? 'en' : 'zh-CN');
    });
    updateShareAssets();
  }

  function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('primaryNav');
    if (!toggle || !menu) return;
    const close = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
    document.addEventListener('click', (event) => {
      if (!menu.classList.contains('is-open')) return;
      if (!menu.contains(event.target) && !toggle.contains(event.target)) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1240) close(); });
  }

  /* ---- Share Card ---- */
  const shareStatusTimers = new WeakMap();

  function shareImagePath() {
    return lang === 'en' ? '/share-en.png' : '/share.png';
  }

  function sharePageUrl() {
    return lang === 'en' ? 'https://archray.dev/' : 'https://archray.dev/zh/';
  }

  function updateShareAssets() {
    const dialog = document.getElementById('shareDialog');
    if (dialog) dialog.style.setProperty('--share-card-bg', `url("${shareImagePath()}")`);
    const image = document.getElementById('sharePreview');
    if (image) {
      image.src = shareImagePath();
      image.alt = t('share.previewAlt');
    }
    const demoLink = document.getElementById('shareDemoLink');
    if (demoLink) demoLink.href = '/demo.html?locale=' + (lang === 'en' ? 'en' : 'zh-CN');
    const link = document.getElementById('shareLink');
    if (link) {
      link.href = sharePageUrl();
      link.textContent = lang === 'en' ? 'archray.dev' : 'archray.dev/zh';
    }
    const trigger = document.getElementById('shareToggle');
    if (trigger) {
      trigger.setAttribute('aria-label', t('share.label'));
      trigger.setAttribute('title', t('share.label'));
    }
    const close = document.getElementById('shareClose');
    if (close) {
      close.setAttribute('aria-label', t('share.close'));
      close.setAttribute('title', t('share.close'));
    }
  }

  function showShareStatus(key) {
    const el = document.getElementById('shareStatus');
    if (!el) return;
    const previous = shareStatusTimers.get(el);
    if (previous) clearTimeout(previous);
    el.textContent = t(key);
    shareStatusTimers.set(el, setTimeout(() => { el.textContent = ''; }, 5200));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      area.remove();
      return copied;
    }
  }

  async function getShareFile() {
    const response = await fetch(shareImagePath(), { cache: 'no-store' });
    if (!response.ok) throw new Error('share image unavailable');
    const blob = await response.blob();
    const name = lang === 'en' ? 'archray-share-en.png' : 'archray-share.png';
    return new File([blob], name, { type: 'image/png' });
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = lang === 'en' ? 'archray-share-en.png' : 'archray-share.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadShareImage() {
    const anchor = document.createElement('a');
    anchor.href = shareImagePath();
    anchor.download = lang === 'en' ? 'archray-share-en.png' : 'archray-share.png';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function copyShareImage() {
    try {
      const file = await getShareFile();
      if (!navigator.clipboard || !navigator.clipboard.write || typeof ClipboardItem === 'undefined') {
        throw new Error('clipboard image unsupported');
      }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file })]);
      showShareStatus('share.statusImageCopied');
    } catch {
      try { downloadShareImage(); } catch { /* no-op */ }
      showShareStatus('share.statusImage');
    }
  }

  async function shareCard(withLink) {
    try {
      const file = await getShareFile();
      const caption = t('share.caption') + (withLink ? '\n\n' + sharePageUrl() : '');
      const payload = withLink
        ? { files: [file], title: t('share.title').replace(/\n/g, ' '), text: caption }
        : { files: [file], title: t('share.title').replace(/\n/g, ' ') };
      let canShareFiles = false;
      try {
        canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare(payload);
      } catch { canShareFiles = false; }

      if (typeof navigator.share === 'function' && canShareFiles) {
        await navigator.share(payload);
        showShareStatus('share.statusNative');
        return;
      }

      if (withLink) {
        downloadBlob(file);
        await copyText(caption);
        showShareStatus('share.statusFallback');
      } else {
        downloadBlob(file);
        showShareStatus('share.statusImage');
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return;
      showShareStatus('share.statusFailed');
    }
  }

  function initShare() {
    const dialog = document.getElementById('shareDialog');
    const trigger = document.getElementById('shareToggle');
    if (!dialog || !trigger) return;

    const close = () => {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
      document.body.classList.remove('share-open');
    };

    trigger.addEventListener('click', () => {
      updateShareAssets();
      const status = document.getElementById('shareStatus');
      if (status) status.textContent = '';
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      document.body.classList.add('share-open');
    });

    const closeBtn = document.getElementById('shareClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('close', () => document.body.classList.remove('share-open'));

    const nativeBtn = document.getElementById('shareNativeBtn');
    const imageBtn = document.getElementById('shareImageOnlyBtn');
    const copyImageBtn = document.getElementById('shareCopyImageBtn');
    const downloadBtn = document.getElementById('shareDownloadBtn');
    const copyLinkBtn = document.getElementById('shareCopyLinkBtn');
    const copyCaptionBtn = document.getElementById('shareCopyCaptionBtn');

    if (nativeBtn) nativeBtn.addEventListener('click', () => { void shareCard(true); });
    if (imageBtn) imageBtn.addEventListener('click', () => { void shareCard(false); });
    if (copyImageBtn) copyImageBtn.addEventListener('click', () => { void copyShareImage(); });
    if (downloadBtn) downloadBtn.addEventListener('click', () => {
      downloadShareImage();
      showShareStatus('share.statusImage');
    });
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', () => {
      void copyText(sharePageUrl()).then((ok) => showShareStatus(ok ? 'share.statusCopied' : 'share.statusFailed'));
    });
    if (copyCaptionBtn) copyCaptionBtn.addEventListener('click', () => {
      void copyText(t('share.caption') + '\n\n' + sharePageUrl())
        .then((ok) => showShareStatus(ok ? 'share.statusCopied' : 'share.statusFailed'));
    });
  }

  function init() {
    initHeroComparison();
    initMobileNav();
    initShare();

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        theme = theme === 'light' ? 'dark' : 'light';
        applyAll();
      });
    }

    /* Section 2: Breathing Switch Controls */
    const detSwitch = document.getElementById('detectorSwitch');
    const detBefore = document.getElementById('detectorBtnBefore');
    const detAfter = document.getElementById('detectorBtnAfter');
    if (detSwitch) detSwitch.addEventListener('click', () => { detectorResolved = !detectorResolved; renderDetector(); });
    if (detBefore) detBefore.addEventListener('click', () => { detectorResolved = false; renderDetector(); });
    if (detAfter) detAfter.addEventListener('click', () => { detectorResolved = true; renderDetector(); });

    /* Section 3: Console Presets & Multi-Select Toggle */
    document.querySelectorAll('[data-combo-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-combo-preset') || 'all';
        const preset = COMBO_PRESETS[key];
        if (!preset) return;
        activePreset = key;
        selectedLayerIndices = [...preset.indices];
        renderAllConsole();
      });
    });

    const multiBtn = document.getElementById('multiLayerModeBtn');
    if (multiBtn) {
      multiBtn.addEventListener('click', () => {
        multiSelectMode = !multiSelectMode;
        renderPresetButtons();
      });
    }

    const allBtn = document.getElementById('selectAllLayersBtn');
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        activePreset = 'all';
        selectedLayerIndices = [...COMBO_PRESETS.all.indices];
        renderAllConsole();
      });
    }

    const expRange = document.getElementById('explodeRange');
    const expVal = document.getElementById('explodeValue');
    if (expRange) {
      expRange.addEventListener('input', () => {
        explodeFactor = Number(expRange.value) || 1.15;
        if (expVal) expVal.textContent = explodeFactor.toFixed(2) + 'x';
        renderIsoStack();
      });
    }

    /* Section 4: Live Demo Presets */
    document.querySelectorAll('[data-demo-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeDemoPreset = btn.getAttribute('data-demo-preset') || '3d';
        document.querySelectorAll('[data-demo-preset]').forEach((b) => {
          b.classList.toggle('is-active', b === btn);
        });
        const veil = document.getElementById('demoVeil');
        if (veil) veil.classList.add('is-hidden');
        updateDemoIframe();
      });
    });

    const veil = document.getElementById('demoVeil');
    const unlockBtn = document.getElementById('unlockDemoBtn');
    if (veil) veil.addEventListener('click', () => veil.classList.add('is-hidden'));
    if (unlockBtn) unlockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (veil) veil.classList.add('is-hidden');
    });

    /* Host Pills (Synced across Hero & Install Section) */
    document.querySelectorAll('[data-host]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeHost = btn.getAttribute('data-host') || 'claude';
        renderHostInstaller();
        renderConsoleInspector();
      });
    });

    /* Copy Buttons */
    const copyLayerSlashBtn = document.getElementById('copyLayerSlashBtn');
    if (copyLayerSlashBtn) {
      copyLayerSlashBtn.addEventListener('click', () => {
        copyWithFeedback(copyLayerSlashBtn, getConsoleDetails().slashFull);
      });
    }

    const copyInstallBtn = document.getElementById('copyInstallBtn');
    if (copyInstallBtn) {
      copyInstallBtn.addEventListener('click', () => {
        const el = document.getElementById('hostInstallCode');
        if (el) copyWithFeedback(copyInstallBtn, el.textContent || '');
      });
    }

    const copyInstallPromptBtn = document.getElementById('copyInstallPromptBtn');
    if (copyInstallPromptBtn) {
      copyInstallPromptBtn.addEventListener('click', () => {
        copyWithFeedback(copyInstallPromptBtn, t('install.step2Prompt'));
      });
    }

    const copyMaintBtn = document.getElementById('copyMaintBtn');
    if (copyMaintBtn) {
      copyMaintBtn.addEventListener('click', () => {
        const el = document.getElementById('maintCode');
        if (el) copyWithFeedback(copyMaintBtn, el.textContent || '');
      });
    }

    const copyEmailBtn = document.getElementById('copyEmailBtn');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', () => {
        copyWithFeedback(copyEmailBtn, 'hello@archray.dev');
      });
    }

    const copyPersonalEmailBtn = document.getElementById('copyPersonalEmailBtn');
    if (copyPersonalEmailBtn) {
      copyPersonalEmailBtn.addEventListener('click', () => {
        copyWithFeedback(copyPersonalEmailBtn, 'loofare@gmail.com');
      });
    }

    applyAll();
    updateDemoIframe();
    initScrollImmersion();
  }

  function initScrollImmersion() {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bar = document.getElementById('scrollProgressBar');
    const frame = document.querySelector('.artifact-frame-outer');
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
    const navDot = document.querySelector('.nav-links .nav-dot');
    const sectionIds = ['live', 'console', 'detector', 'principles', 'install', 'privacy'];

    const cards = Array.from(document.querySelectorAll(
      '.proof-card, .studio-console, .specimen-cell, .action-window, .real-repo-card, .ledger-pane, .install-card, .policy-card, .creator-card'
    ));
    if (!reduced) {
      cards.forEach((card, idx) => {
        card.classList.add('reveal-card');
        card.style.setProperty('--reveal-delay', ((idx % 4) * 55) + 'ms');
      });
    }

    let revealArmed = false;
    let observer = null;
    if (!reduced && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    }

    function armRevealOnScroll() {
      if (revealArmed || reduced || !observer) return;
      if (window.scrollY <= 8) return;
      revealArmed = true;
      const cutoff = window.innerHeight * 0.92;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top > cutoff) {
          card.classList.add('will-reveal');
          observer.observe(card);
        }
      });
    }

    function updateScrollState() {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, scrollY / maxScroll));
      if (bar) bar.style.setProperty('--scroll-progress', progress.toFixed(4));

      if (!reduced && frame) {
        const offset = Math.min(scrollY, 500) * -0.035;
        frame.style.setProperty('--hero-parallax', offset.toFixed(1) + 'px');
      }

      let activeHref = '#top';
      if (scrollY >= 140) {
        for (const id of sectionIds) {
          const sec = document.getElementById(id);
          if (sec && sec.getBoundingClientRect().top <= 180) {
            activeHref = '#' + id;
          }
        }
        if (scrollY + window.innerHeight >= doc.scrollHeight - 24) {
          activeHref = '#privacy';
        }
      }

      navLinks.forEach((link) => {
        const match = link.getAttribute('href') === activeHref;
        link.classList.toggle('is-active', match);
        if (match && navDot && link.firstElementChild !== navDot) {
          link.insertBefore(navDot, link.firstChild);
        }
      });

      armRevealOnScroll();
    }

    let rafPending = false;
    window.addEventListener('scroll', () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        updateScrollState();
      });
    }, { passive: true });
    updateScrollState();

    const previewWell = document.querySelector('.spatial-preview-well');
    if (!reduced && previewWell) {
      previewWell.addEventListener('mousemove', (e) => {
        const r = previewWell.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -4.5;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 4.5;
        previewWell.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      previewWell.addEventListener('mouseleave', () => {
        previewWell.style.transform = '';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
