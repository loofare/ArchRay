# 真实仓库试用 · p-limit · 2026-11-17

目的：用发布包 `archray-0.3.0.tgz` 在外部仓库走“解包 → 安装 → AI 分析 → validate → build → 浏览器首次使用”，记录问题，决定是否发布。

范围：外部仓库 `sindresorhus/p-limit`（MIT），commit `a8a6fbe`，浅克隆到 `dist/trial/p-limit`；原始仓库未参与、未修改、未提交。发布包解包到 `dist/trial/archray-0.3.0`。所有试用产物在忽略目录 `dist/trial`。

## 结果概览

| 步骤 | 结果 | 证据 |
|---|---|---|
| 解包 | 通过 | 单根目录，`doctor` 13 项 ok |
| 安装 | 通过，约 0.07s | 写入 `.archray` 4 个模板 + `.claude` Skill 与 7 个命令 |
| AI 分析 | 完成，10 节点 / 14 边 / 3 链路 | 依据 `index.js`、`index.d.ts`、`test.js`、`benchmark.js`、`scripts/benchmarker.js`、`package.json`；sourcePaths 指向真实文件 |
| validate | 通过，约 0.03s | `Valid v2 graph` |
| build | 通过，约 0.04s | 2.1 MB 单文件 HTML |
| 浏览器 | 通过 | 1440/320、离线 `file://`、层过滤、三套风格、整图 PNG、录屏弹层、无页面错误 |
| 升级 `--force` | 通过 | `graph.json` 哈希不变，命令/模板刷新 |
| 旁路层 | 部分通过 | `--layers data` 正常；`--layers client` 因图无该层报错 |

分析说明：本次图由当前代理按 p-limit 真实源码生成，不是独立模型盲测；图中的路径与结论仍是待复核声明，不是运行时监控。

## 发现的问题

### T1 · P2 · 缺失层的 URL 提示文案错误

复现：`index.html?layers=frontend`（p-limit 没有 client 层）。
实际：页面回退到全图并提示“部分折叠分组已不存在，已移除”，实际原因是层不在图中。
原因：`viewer/src/App.tsx` 的 `noticeText` 只处理 `stale:focus/scenario/locale`，`stale:layers` 落入折叠分组分支。
影响：用户看到错误原因，无法判断是层名写错还是图缺层。
建议：补 `stale:layers` 分支，并加浏览器断言；回退行为本身正确。

### T2 · P2 · 预设命令在缺少对应层时直接失败

复现：对 p-limit 执行 `/archray:frontend` 对应的 `build --layers client`，CLI 返回 `Unknown layer: client`。
实际：预设命令没有“层不存在时退回全套并解释”的指令；用户会看到安装后的第一个子命令失败。
影响：库/后端项目没有 client、edge 等层，六个预设里多个不可用；首次体验受挫。
建议：每个预设命令加一句“若 CLI 报 Unknown layer，则不带 `--layers` 重建并说明该层不存在”；主命令 `/archray` 保持可用。

### T3 · P2 · 图自己的层名被通用标签覆盖

现象：p-limit 的层名是 “Public API & limiter / Queue state / Contracts & tooling”，工具栏显示 “Backend & middleware / Data & storage / Platform & infra”。
原因：`graphLayerLabel` 对规范层 id 优先用通用标签，忽略图作者写的具体名称。
影响：对库、工具、非典型系统，通用层名会误导；例如限流核心被标成“后端与中间层”。
建议：优先使用图声明的层名，缺失时回退通用标签；或显示“具体名（通用类）”。需要确认后再改。

### T4 · P1（发布决策）· 命令指向解包目录，移动/删除包体后全部失效

现象：安装写入的 7 个命令使用解包目录的绝对 CLI 路径；把 `archray-0.3.0/` 移走或删除后，命令与 `.claude/skills` 仍指向旧路径。
影响：用户把 tarball 解到 Downloads、试用后清理，就会得到“命令存在但 CLI 不存在”；这不是自包含安装。
建议（二选一）：
- **A. 仓库内自带工具**：`install.sh` 把 `cli/schema/skill/commands/knowledge/viewer` 复制到 `.archray/tool/`，命令引用相对路径 `.archray/tool/cli/bin/archray.mjs`；写入 `.archray/.gitignore` 忽略 `tool/`。每仓库约 +2.1 MB，但可移动、可离线、升级由 `--force` 覆盖。
- **B. 稳定安装位置**：安装到 `~/.archray/versions/0.3.0` 并由命令引用稳定路径；仓库更轻，但换机/共享仓库需重装。
建议选 A，符合“装完即用、仓库自包含”的目标。

### T5 · P3 · 全栈预设对库项目不适用

p-limit 没有 client/edge/security 层，`frontend`、`network`、`security` 预设无意义。主命令和 `data` 预设正常。
建议：文档说明预设是常见分层模板，先 `/archray` 看全图再选层；或让预设先读取 `.archray/graph.json` 的 layers，再决定是否带 `--layers`（AI 侧可做）。

### T6 · P3 · 层按钮在 320px 可滚动但首屏只看到部分

320px 下 chips 横排可滚动，首屏只露出部分层名，最后一层需横向滚动。功能可用，但可发现性一般。
建议：保留现状或在窄屏显示“层”下拉；非阻塞。

## 正向证据

- 安装后 `doctor` 13 项全 ok；升级保留 `graph.json`。
- p-limit 图在 flat/stack/iso、深色/蓝图/玻璃下均正常；层过滤保留一跳上下文。
- 整图 PNG 2x 有内容；录屏引导可用；`file://` 离线可开；320px 无横向溢出。
- 图中 Node/JavaScript/TypeScript 品牌图标正常，未知 `yocto-queue` 回退到队列图标。

## 发布决定

**暂不发布 v0.3.0 的公开 Release。** 先处理：

1. T1（文案）与 T2（预设回退）——直接影响首次使用，修复成本低。
2. T4（安装位置）——决定 A 或 B；这是“装完能用”的核心，不建议带缺口发布。
3. T3（层名优先级）——产品决策，建议改成图名优先；T5/T6 可写入已知限制。

修复后重跑本试用（至少 T1/T2/T4 的复现路径），按门禁送代码审计复审，PASS 后再创建 GitHub Release。

## 复现材料

- 图与 HTML：`dist/trial/p-limit/.archray/`（忽略目录）
- 截图：`dist/trial/shots/`（desktop-en、desktop-data、desktop-glass、layer-fallback、narrow-320、full）
- 发布包：`dist/archray-0.3.0.tgz`
- 试用脚本：`dist/trial/trial-check.cjs`（仅本地证据，不进入发布包）
