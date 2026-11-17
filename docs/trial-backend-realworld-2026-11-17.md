# 真实仓库试用 · 后端/数据服务 · RealWorld API · 2026-11-17

M5.2 第二个样本：真实 Express + Prisma/PostgreSQL 后端。目标是验证后端仓库的层映射、服务/数据边界、鉴权链路与预设命令。

## 样本

- 仓库：`gothinkster/node-express-realworld-example-app`，commit `30b68e1`，MIT。
- 范围：`src/` 与 `e2e/`，49 个文件；Nx 工作区。
- 安装：当前源码 `archray install --agent claude`，自带 `.archray/tool`。
- 未启动 API 或数据库（缺少 `.env`/PostgreSQL）；验收对象是 ArchRay 图与 HTML。

## 生成的图

10 个节点、18 条边、3 条链路；校验与构建通过。

| 层 | 节点 |
|---|---|
| HTTP & auth | Express server、API router、Auth & JWT |
| Domain services | Article、Profile、Tag |
| Data access | Prisma data layer、PostgreSQL |
| Tooling & tests | Service tests、Nx & container tooling |

- 证据：`src/main.ts`、`src/app/routes/routes.ts`、`auth/*`、`article/*`、`prisma/schema.prisma` 等。
- 三条链路：注册/登录、创建文章、关注用户。
- 健康度在 `Auth & JWT` 上标出真实风险：`JWT_SECRET` 缺失时回退到字面量 `superSecret`（源码证据，不是 ArchRay 的运行时结论）。
- 构建：0.03s，约 20 KB 图，2.1 MB HTML。

## 浏览器验收

- 1440px：10 节点全部渲染，四个层 chip，Express/Prisma/PostgreSQL/Jest 等品牌与回退图标；flat/stack/iso、三套风格、整图 PNG、录屏、view、320px、离线均通过。
- 选“HTTP & auth”：显示 server/router/auth，运行时一跳的 service 与 Prisma 淡显；`Service tests`、`Nx tooling` 不再被拉入上下文（见 B2 修复）。
- `--layers service`、`--layers gateway`、`--layers data` 可构建；`--layers client` 正确报 Unknown layer 并给出图内层。
- 页面无 JS 错误。

## 发现的问题与处理

### B1 · P3 · 预设包含当前仓库没有的层

`/archray:backend` 请求 `service,async`，`network` 请求 `edge,gateway`，`frontend` 请求 `client`；本仓库没有 async/edge/client，CLI 首次会报 `Unknown layer`。

处理：五个预设的指令从“报错就退回全套”改为“删掉缺失的层、保留其余；全部缺失才退回全套”，主命令也提示可丢弃未知层。CLI 仍保持严格报错，避免静默吞掉拼写错误。已在 CLI 回归中断言 preset 文案。

### B2 · P2 · 高扇出层的“一跳上下文”把测试/工具链也拉进来

`HTTP & auth` 的 server/router/auth 一跳连到 service、Prisma、tests、tooling；原策略会把 tests/tooling 也淡显，层筛选几乎变全图。

处理：层过滤的上下文排除 platform 类层（工具链/测试）；选中 platform 时仍完整显示。R4 复审后又把自定义/命名空间平台层（如 `infra`、`platform/build`，名称 Platform）纳入同一分类，纯业务自定义层不误伤；新增对应核心回归。前端样本的 client 视图不受影响。

### B3 · P3 · Express 图标缺失

节点技术栈含 Express，但品牌库未收录 `express`，实际回退到 Node 图标。记录到 M5.4：补 Express、Nx 等常用/小众图标。

### B4 · P3 · 样本自身的安全风险

`JWT_SECRET` 回退到 `superSecret` 是样本代码的真实问题；图把它标为 critical，说明健康度能看到源码风险。ArchRay 不修改样本。

### B5 · 方法说明

- 图由当前代理按真实源码人工分析生成，不是独立 AI 宿主模型回合，也不是运行时扫描。
- 未执行 `npm install`、Nx build 或数据库连接；本样本只验证图与 HTML。

## 结论

后端/数据服务主路径通过；没有阻塞的 P1。B1/B2 已做产品修正并补回归，B3 进入 M5.4，B4 作为图能暴露源码风险的正向证据。

M5.2 样本覆盖：前端应用、后端/数据服务、库/CLI（p-limit 已在 M4 试用）。下一步进入 M5.3 真实大图性能。
