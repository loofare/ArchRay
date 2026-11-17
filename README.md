**中文** | [English](README.en.md)

# ArchRay

ArchRay 是 **AI 优先的架构可视化工具**：安装一次，之后在 AI 助手里输入 `/archray`。它会读取你的仓库、记录证据，并生成可分层、可交互的单文件 HTML，用来查看、分享和导出。

## 一句话安装

把下面这句复制给能执行命令的 AI：

> 请把 ArchRay 安装到当前仓库并开始使用：从 https://github.com/loofare/ArchRay/releases/tag/v0.4.0 下载 `archray-0.4.0.tgz`，解压后运行 `./archray-0.4.0/install.sh . claude`；然后按 `.archray/SKILL.md` 生成 `.archray/graph.json`，构建 HTML，并告诉我 `/archray` 怎么用。

安装后新开一个 AI 会话：

- **Claude Code / Cursor / Antigravity / Pi**：输入 `/archray`。Pi 的预设是 `/archray-frontend` 等，也可用 `/skill:archray`。
- **Codex**：输入 `$archray` 或 `/skills`，没有 `/archray` 斜杠命令。

用 Cursor、Antigravity、Pi 或 Codex 时，把安装命令里的 `claude` 换成对应值。

## 快速开始（在 AI 里）

**方式 A —— 发布包（推荐）。** 从 Releases 下载 `archray-<version>.tgz`，然后：

```sh
tar -xzf archray-<version>.tgz
./archray-<version>/install.sh /path/to/your-repo claude
```

安装器需要 Node 20+。它会把 CLI、viewer、Skill、命令和知识库自带为 `.archray/tool/`，写入斜杠命令和模板，并把 `tool/` 加进 `.archray/.gitignore`。安装完成后下载的 `archray-<version>/` 可以删除（每个仓库约 2.1 MB）。如果怀疑文件缺失，在仓库里运行 `node .archray/tool/cli/bin/archray.mjs doctor`。

**方式 B —— 从源码。** Node 20+：

```sh
git clone https://github.com/loofare/ArchRay.git
cd ArchRay
npm ci && npm run build
node /path/to/ArchRay/cli/bin/archray.mjs init --target /path/to/your-repo --agent claude
```

然后在 AI 里输入：

```text
/archray
/archray 前端,数据
```

Claude Code 会得到 `/archray` 以及 `/archray:frontend`、`:backend`、`:data`、`:network`、`:security`、`:full`。Cursor 和 Antigravity 使用扁平的 `archray-*.md` 命令。Pi 使用 `/archray`、`/archray-frontend` 和 `/skill:archray`；Codex 通过 `.agents/skills` 使用 `$archray` 或 `/skills`。安装时分别用 `--agent claude|cursor|antigravity|pi|codex`。完整矩阵见[宿主兼容性](docs/host-compatibility.md)。Managed host 使用托管 Skill，见同一文档。

AI 会检查真实源码，写入 `.archray/graph.json`，再构建 `.archray/index.html`。`init` 只写模板和命令；图来自这次分析。候选可以为空，保持现状也是有效选择。ArchRay 不自行扫描源码，也不验证图中的声明。

## 分层

`init` 还会写入 `.archray/tech.json`：212 个技术和品牌，包含分类、层和组件类型提示。AI 用它辅助分类；它是提示，不是“某技术已经存在”的证明。

一次分析，多次切层，不重复分析：

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --layers frontend,data --no-open
```

层包括 `client`、`edge`、`gateway`、`service`、`async`、`data`、`ai`、`external`、`platform`、`observability`；中文别名如 `前端`、`数据`、`网关` 也可用。图可以声明自己的层 id，它们仍可选择，并按自己的 id 保存。选中的层完整显示，一跳运行时邻居淡显为跨层上下文；平台/工具链节点除非被选中，否则不进入上下文。25 个模块以上的图在宽屏上会以可读字号打开（最高 4×；极端大图仍可能需要手动放大），点“全图”回到整体视图。`/archray` 接受同样的关键词。

## 风格与语言

生成时选择，或在 HTML 里切换：

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --style blueprint --lang en --no-open
```

风格：`tech`（默认）、`blueprint`、`glass`、`paper`。语言使用图里的 locales；缺失时会提示并回退，不编造文本。已知技术（Postgres、React、Kubernetes、AWS、Stripe 等）在节点上显示品牌图标；未知技术回退到通用组件图标。

动效为 `full`、`calm`、`off`，可用 `--motion` 或工具栏设置。`full` 有环境流动和移动粒子；`calm` 保留慢速虚线；`off` 停止环境动效。系统要求减少动效时，保存或 URL 里的 `full` 会被钳制为 `calm`；`calm` 和 `off` 保持不变。在工具栏主动选择是显式覆盖。

## HTML 提供什么

单个 HTML 内嵌 viewer 和图数据，使用系统字体栈（不内嵌字体文件）。它可离线打开，包括 `file://`。默认楼层视图，也提供等轴/平面；滚轮以指针为中心缩放，拖拽平移，右键或 Alt 拖拽旋转（等轴/楼层），支持全屏和缩略图快速定位。还提供模块选择、下钻、折叠/展开、FIT 全图。健康度视角给出总评分、热点和分层健康；可替代性视角给出高/中/低分布、锁定点和已保存方案。详情显示完整描述和源码路径；窄屏使用可关闭的覆盖层。

流程高亮依据声明的有向边，不是实际流量。保存 `view.json`，再导入或用 `--view` 嵌入，可恢复语言、风格、动效、投影、镜头（含旋转）、聚焦、折叠分组、层、相机和方案。失效或过期的 view 值会回退并给出警告。

导出当前相机或**整图** PNG（2x，限制在安全画布尺寸）。静图会移除环境粒子，避免冻结在半路。**录屏**指南说明系统快捷键和建议演示步骤；页面不会自行录屏，内容不离开本机。

## 底层 CLI

```sh
node /path/to/ArchRay/cli/bin/archray.mjs validate .archray/graph.json
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --no-open
# 在浏览器打开 .archray/index.html，file:// 也可以。
```

如果命令停下，提示会给出下一步：

- `already exists` —— 保留文件、换一个 `--output`，或确实要替换时加 `--force`。
- `over its input` 或 `symbolic link` —— 换一个独立的真实输出路径；即使加 `--force` 也会拒绝。
- `Cannot read ... file not found` —— 先运行 `archray init`，再让 AI 写入 `.archray/graph.json`。
- `...: <path>: <reason>` —— 图字段不合法；修图，不要改 viewer。

编译后的 CLI 只依赖 Node 内置模块。HTML 内嵌 viewer 和图数据，使用系统字体栈；浏览产物不需要 ArchRay 服务。依赖安装和 AI 代理可能使用网络。

默认 `init` 只写 `.archray`。集成到代理需要显式 `--agent claude|cursor|antigravity|all`。已有输出默认拒绝覆盖；请谨慎使用 `--force`。输入/输出别名和输出符号链接即使加 force 也会拒绝。每个输出原子提交；`init` 在写入前检查每个目标（它不是多文件文件系统事务）。

其他命令：

```sh
node /path/to/ArchRay/cli/bin/archray.mjs migrate old-v1.json --output .archray/graph.v2.json
node /path/to/ArchRay/cli/bin/archray.mjs schema graph
node /path/to/ArchRay/cli/bin/archray.mjs schema view
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --view .archray/view.json --no-open
```

v1 迁移把原始证据保存在 `extensions.migration` 下，给局部 ID 加作用域，并拒绝歧义引用。原文件不会被覆盖。在工具仓库里，`npm run self-analyze` 会在临时目录转换保留的 v1 图，并构建 `.archray/self-legacy.html`。它是标题明确标注“非当前源码分析”的旧版演示，不是对本仓库的扫描。仓库里跟踪的 `.archray/graph.json` 和 `.archray/index.html` 就是这份 v1 基线，不代表当前检出。

方案是目标状态预览；当前图事实仍是影响分析和提示词的基础。删除会级联子树、相关边和流程步骤；替换会重挂子节点并映射流程端点。原始输入不变。提示词只要求复核、迁移、回滚和验证计划；实施需要另行授权。剪贴板失败会显示可选文本。PNG 可导出当前相机或完整可见图。

不包含 npm 正式发布、scan、SaaS、Playground、自动重构、替代目录、时间线/watch 或海报编辑器。


## 升级与卸载

用更新的发布包升级；`--force` 会刷新自带工具、Skill、命令和模板，同时保留 `.archray/graph.json`：

```sh
./archray-<new-version>/install.sh /path/to/your-repo claude --force
```

卸载就是删除已安装文件（没有全局安装）。这也会删除 `.archray`，包括 `graph.json`、`view.json` 和构建出的 HTML——想保留请先备份：

```sh
rm -f /path/to/your-repo/.claude/commands/archray.md /path/to/your-repo/.claude/commands/archray/*.md
rm -rf /path/to/your-repo/.claude/skills/archray /path/to/your-repo/.archray
# .archray/tool 在 .archray 内，自带 CLI 也会一起删除
# Cursor: .cursor/commands/archray*.md 和 .cursor/rules/archray.mdc
# Antigravity: .agent/commands/archray*.md 和 .agent/skills/archray
# Pi: .pi/prompts/archray.md、.pi/prompts/archray-*.md 和 .agents/skills/archray
# Codex: .agents/skills/archray（与 Pi 共用；只删 ArchRay 目录，不要删其他工具）
# 删除前确认 .pi/prompts 和 .agents/skills 没有其他工具的同名文件
```

`archray version` 打印包版本；`archray doctor` 检查 viewer 模板、schema、Skill、命令和知识库。安装后的命令使用相对路径 `.archray/tool/cli/bin/archray.mjs`，所以下载包删除或仓库移动后仍可用。
