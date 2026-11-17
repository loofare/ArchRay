# 真实仓库试用 · 前端应用 · nextjs/saas-starter · 2026-11-17

M5.2 第一个样本：一个真实 Next.js 前端/全栈应用。目标不是跑起业务，而是走完整 ArchRay 流程：安装 → 按真实源码生成图 → validate/build → 离线浏览器使用，并记录问题。

## 样本

- 仓库：`nextjs/saas-starter`，commit `6e33e58`，MIT。
- 范围：`app/`、`components/`、`lib/` 与构建配置；43 个源文件（app/components/lib）。
- 安装：从当前源码执行 `archray install --agent claude`，写入 `.archray/tool`、`.claude` 与模板；不是旧 v0.3.0 发布包。
- 未启动 Next.js 应用（缺少 `.env`/Postgres/Stripe 配置）；本轮验收对象是 ArchRay 的图与 HTML，不是应用运行。

## 生成的图

13 个节点、20 条边、3 条链路，校验与构建通过：

| 层 | 节点 |
|---|---|
| Pages & UI | Marketing、Sign-in/up、Dashboard & pricing UI、UI kit |
| Auth & middleware | Edge middleware、Session & action guards |
| Server actions & API | Server actions、Route handlers |
| Data & schema | Query layer、Schema & migrations、PostgreSQL |
| External | Stripe |
| Tooling | DB setup & config |

- 图依据真实文件：`app/(dashboard)/page.tsx`、`app/(login)/actions.ts`、`middleware.ts`、`lib/db/queries.ts`、`lib/payments/stripe.ts` 等；每个节点有 sourcePaths 与 measured loc。
- 三条链路：登录、Stripe 订阅、仪表盘加载。
- 构建：`0.03s`，22 KB 图，2.1 MB 单文件 HTML。

## 浏览器验收

- 1440px：13 个节点全部渲染；六个层 chip；Next.js/Stripe 等品牌图标；flat/stack/iso、三套风格、整图 PNG、录屏引导、view 保存/导入均通过。
- 只选“Pages & UI”：显示四个页面/组件节点，`Server actions` 与 `Route handlers` 作为一跳上下文淡显；数据/外部/工具层隐藏。
- `build --layers client` 生成的前端视图可打开，view.layers 为 `['client']`。
- 320px：无横向溢出，层 chip 横排可滚动，更多菜单可打开；离线 `file://` 正常。
- 页面无 JS 错误。

## 发现的问题

### F1 · P2 · 六个层时默认“全图”字号偏小

现象：13 个节点分布在 6 层，默认 fit 后图只占视口中间一条竖带，节点标题约 10px，需要放大才能舒适阅读。缩放/全图功能正常，因此不是不可用，而是首次阅读体验偏弱。
影响：前端/全栈应用天然层多；用户第一眼容易觉得“太远”，需要先滚轮放大。
建议：M5.3 用真实较大仓库测默认 fit 的可读性，考虑“适应宽度/最小可读缩放”或更紧凑的层间距；不先改布局算法。

### F2 · P3 · 服务端渲染的定价页放在 client 层

现象：`app/(dashboard)/pricing/page.tsx` 是 server component，读取 Stripe 价格；本轮归入“Pages & UI”（client），因为层名是页面/界面而不是纯浏览器代码。
影响：层语义是“页面/界面”时可接受；若用户把 client 理解为浏览器运行时代码，会略有歧义。
建议：文档说明层是架构关注点而非运行时边界；或后续把“页面/界面”与“浏览器组件”拆成两个层，需产品决定。

### F3 · P3 · 节点摘要截断

卡片只显示一行摘要（如 “Authenticated dashboard, act...”），完整内容在详情面板。真实应用摘要较长时，首屏信息量有限。
建议：保持现状；详情可读。若要提升首屏，可增加两行摘要或悬浮提示，需评估密度。

### F4 · P3 · 320px 层名仍依赖横向滚动

六个层名较长，320px 首屏只显示部分，需横向滚动；与 M5.1 T6 已知限制一致，本轮无新增回归。

### 方法说明

- 图由当前代理按真实源码人工分析生成；不是独立 AI 宿主模型回合，也不是运行时扫描。
- 初稿 stats.files 写成 42，实际 43，已改为 measured 43；这是本轮生成纪律问题，不是产品 bug。

## 结论

前端应用样本的安装、图生成、构建、分层阅读、离线浏览与导出主路径通过；没有发现阻塞发布的 P1。F1 的默认可读性进入 M5.3 观察清单；F2/F3/F4 作为体验记录。

下一站：后端/数据服务仓库，再跑一轮并对比层映射与默认视图。
