🌐 **简体中文** | [English README](./README.en.md) | [官网 · archray.dev](https://archray.dev) | [在线 3D 沙盒](https://archray.dev/demo)

# ArchRay

**让你的 AI 编程助手（Agent）读懂仓库真实源码，画出可交互的 3D 空间与 2D 版图架构。**

告别乱线重叠与凭目录臆测的静态方块图。将 ArchRay 装入项目一次，在 AI 中输入 `/archray`，它会通读真实代码、绑定源码行号证据，并在本地生成 **100% 离线可交互的单文件 HTML**（`.archray/index.html`）。

- **真 3D 空间 + 2D Bento 双视图**：VisionOS 风格悬浮顶栏，ELK 确定性端口分流，四象限分离客户端、核心主塔、异步/AI 侧翼与外部 SaaS 轨道。
- **源码证据与诚实边界**：每条依赖与结论绑定 `sourcePaths` / 文件行号，诚实区分实测指标（`measured`）与静态估算（`≈`），绝不伪造线上监控。
- **健康度诊断 + 平替演进闭环**：内置热点模块扫描与技术选型可替代性对比，一键复制 AI 迁移 Prompt 发回编码助手。
- **零网络单文件交付**：内嵌 167 枚技术栈矢量图标，支持无裁切整图 PNG 导出与带开源溯源二维码的分享海报。

---

## 1. 30 秒安装与首次使用

> 环境要求：Node.js 20+、`curl`、`tar`（Windows 请在 Git Bash 或 WSL 中执行，安装后会生成 `.archray\archray.cmd`）。

### 一行命令安装到项目根目录

```sh
curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh | sh -s -- . claude
```

把末尾的 `claude` 换成你的 AI 宿主（支持同时装多个，如 `claude,cursor` 或 `all`）：

| AI 宿主 | 安装参数 | 装好后在会话中输入 | 写入宿主目录 |
|---|---|---|---|
| **Claude Code** | `claude` | `/archray`、`/archray:frontend` 等 | `.claude/skills/archray/`、`.claude/commands/` |
| **Cursor** | `cursor` | `/archray`、`/archray-frontend` 等 | `.cursor/rules/archray.mdc`、`.cursor/commands/` |
| **Antigravity** | `antigravity` | `/archray` 或通过 Skill 唤醒 | `.agent/skills/archray/`、`.agent/commands/` |
| **Pi** | `pi` | `/archray`、`/archray-frontend`、`/skill:archray` | `.agents/skills/archray/`、`.pi/prompts/` |
| **Codex** | `codex` | `$archray` 或 `/skills` | `.agents/skills/archray/SKILL.md` |

也可以直接把下面这段话发给你的 AI 助手，让它帮你装好：

```text
请下载 https://github.com/loofare/ArchRay/releases/latest/download/install.sh 到临时文件并校验后，在当前仓库根目录执行 `sh <临时文件> . claude`（将 claude 替换为你的宿主），完成后告诉我即可。
```

### 装好后马上体验

1. 新开一个 AI 编程会话。
2. 输入 `/archray`（Codex 用 `$archray`），或直接用自然语言说：**“用 archray 分析源码并画出 3D 架构图”**。
3. 完成后用浏览器打开生成的 `.archray/index.html` 即可交互查看。

---

## 2. 在 AI 里怎么用（支持全栈、单端与自由组合）

一次分析源码生成 `.archray/graph.json` 后，可随时按任意层切片重绘（未选中的直接上下游会自动保留“一跳半透明上下文”）：

| 场景 | 斜杠指令 / 参数 | 说明 |
|---|---|---|
| **查看全部（默认）** | `/archray` 或 `/archray:full` | 展示 L0–L9 全部架构层 |
| **前端视角** | `/archray:frontend` 或 `/archray frontend` | 聚焦客户端与 UI 层 |
| **后端与异步** | `/archray:backend` 或 `/archray backend` | 聚焦业务服务与异步任务通道 |
| **数据与存储** | `/archray:data` 或 `/archray data` | 聚焦数据库、缓存与对象存储 |
| **网络与接入** | `/archray:network` 或 `/archray network` | 聚焦 CDN/WAF 边缘网络与网关 |
| **安全与鉴权** | `/archray:security` 或 `/archray security` | 聚焦网关、OAuth/OIDC 与权限边界 |
| **跨端自由组合** | `/archray frontend,backend`<br>`/archray 前端,后端,数据`<br>`/archray ai,async,data` | 用逗号自由组合任意多层（支持中英文别名） |
| **切换风格/语言** | `--style blueprint --lang en` | 支持 `tech` / `blueprint` / `glass` / `paper` |
| **工具升级/卸载** | `/archray update` / `/archray uninstall` | 升级或卸载均默认保留 `graph.json` 与 HTML |

**支持的 10 个规范架构层**：`client`（前端/客户端）、`edge`（网络/接入）、`gateway`（安全/网关）、`service`（后端/中间层）、`async`（异步/任务）、`data`（数据/存储）、`ai`（AI/模型）、`external`（外部/SaaS）、`platform`（平台/基础设施）、`observability`（可观测/监控）。

---

## 3. 命令行与维护（项目根目录执行）

安装器在项目 `.archray/` 内提供自包含短命令，零全局污染（Windows 用 `.archray\archray.cmd`）：

```sh
./.archray/archray doctor                                      # 检查工具与 Node 版本
./.archray/archray validate .archray/graph.json                # 校验图谱 Schema 与双语覆盖
./.archray/archray build .archray/graph.json --force --no-open # 重新构建离线 HTML
./.archray/archray build .archray/graph.json --layers frontend,data --style blueprint --force
```

**升级与卸载：**

```sh
./.archray/archray update --check   # 仅检查最新版本，不修改本地文件
./.archray/archray update           # 校验 SHA-256 并升级（保留 graph/view/HTML）

./.archray/archray uninstall --dry-run  # 预览卸载清单
./.archray/archray uninstall            # 移除工具与宿主命令（保留 graph/view/HTML）
./.archray/archray uninstall --purge    # 连同 .archray/graph.json 与 HTML 全部清除
```

<details>
<summary>从 v0.4.0 及更早版本升级（无 update 子命令）</summary>

```sh
curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh | sh -s -- . auto --force
```

</details>

---

## 4. 隐私安全与边界

- **100% 本地零上传**：ArchRay CLI 与单文件 HTML 完全离线运行，绝不向外部服务器上传源码、路径或图谱数据；源码阅读仅在你自己授权的 AI 会话内完成。
- **诚实边界**：不包含云端 SaaS 或运行时 APM 探针；节点 `sourcePaths` 与健康度建议均为静态源码审查结论，需开发者复核。
- 更多兼容性细节见 [宿主兼容性矩阵](docs/host-compatibility.md)、[变更记录](docs/changelog.md) 与 [NOTICE](NOTICE)。遵循 [MIT License](LICENSE)。
