# ArchRay v0.4.0

日期：2026-11-17。v0.4.0 是 M5「真实使用与规模化」的收口版本。

## 亮点

- **AI 宿主矩阵**：Claude Code、Cursor、Antigravity、Pi、Codex；Pi 使用 `/archray`、`/archray-frontend` 与 `/skill:archray`，Codex 使用 `$archray` 或 `/skills`。`install --agent all` 一次安装。
- **真实仓库验证**：前端 `nextjs/saas-starter`、后端 `Express + Prisma`、大型 `Cal.com` 包级架构；覆盖安装、生成、分层、离线浏览、导出与 320px。
- **大图可读缩放**：25+ 模块在宽屏按布局边界打开到可读字号（最高 4×）；Fit 回全图；显式 camera/layers/focus 不覆盖。
- **知识库与图标**：212 条技术/品牌提示、167 个品牌图标；kind、重复 ID、跨条目别名冲突在生成期拒绝；Drizzle ORM 使用专用标记。
- **质量门禁**：29 项核心测试、CLI 回归、宿主发现、包级安装/回滚、原版浏览器矩阵、脱敏扫描；M5 代码审计 R9 PASS。

## 安装

```sh
tar -xzf archray-0.4.0.tgz
./archray-0.4.0/install.sh /path/to/your-repo claude   # cursor | antigravity | pi | codex | all
```

安装后新开会话：Claude/Cursor/Antigravity/Pi 输入 `/archray`；Codex 输入 `$archray` 或 `/skills`。Node 20+。

安装器把 CLI、viewer、Skill、命令和知识库自带为 `.archray/tool`，命令使用相对路径，下载包可删除。

## 已知限制

- 前端 13 节点样例低于 25 节点阈值，仍以 fit 打开；F1 是观察项。
- 大图可读缩放最高 4×，极端大图仍可能需要手动放大；首屏居中可能裁掉顶部入口，Fit 可恢复。
- 密集边未做聚合/标签；320px 层名依赖横向滚动。
- Express 官方宽字标在 fit 下偏小；已记录，缩放后可读。
- 分析由 AI 依据真实源码或用户描述生成；sourcePaths 是待复核声明，不是运行时监控或自动扫描。
- 未包含 npm 发布之外的 scan/SaaS/自动重构/时间线；未做全平台、全设备性能或商标法律审查。

## 证据

- [前端试用](trial-frontend-saas-2026-11-17.md)
- [后端试用](trial-backend-realworld-2026-11-17.md)
- [Cal.com 大图](trial-large-calcom-2026-11-17.md)
- [知识库扩充](trial-knowledge-expansion-2026-11-17.md)
