**中文** | [English](README.en.md)

# ArchRay

ArchRay 是 **AI 优先的架构可视化工具**：安装到你的仓库一次，之后在 AI 助手里输入 `/archray`。它会读取真实源码、记录证据，并生成可分层、可交互、可离线的单文件 HTML。

---

## 1. 第一次使用

1. 在**你的项目仓库根目录**安装 ArchRay（见第 4 节）。
2. 新开一个 AI 会话。
3. 输入你的宿主对应入口：Claude/Cursor/Pi 用 `/archray`；Antigravity 用 Skill（命令目录兼容性以宿主版本为准）；Codex 用 `$archray` 或 `/skills`。
4. 第一次会分析当前仓库，生成 `.archray/graph.json` 和 `.archray/index.html`。打开 HTML 即可查看。

已经安装过？直接从第 2 节开始。

## 2. 在 AI 里怎么说

| 目的 | 直接输入 |
|---|---|
| 安装 | 把第 4 节的安装句复制给 AI |
| 分析当前仓库 | `/archray` |
| 只看前端 | `/archray 前端` |
| 更新 | `/archray update` |
| 卸载 | `请卸载当前仓库的 ArchRay，保留 graph/view/index` |

自然语言也可以：

```text
分析当前仓库的真实代码，生成分层架构图，记录证据和未知项，构建单文件 HTML，并告诉我产物路径。不要修改业务代码。
```

```text
请把当前仓库的 ArchRay 更新到最新版，保留 .archray/graph.json 和 view.json，并告诉我更新前后的版本。
```

Codex 没有 `/archray` 斜杠命令，使用 `$archray` 或先输入 `/skills`。

## 3. 在命令行里怎么用

以下命令都在**目标仓库根目录**执行。安装器提供项目内短命令，不会安装到全局 PATH：

```sh
./.archray/archray help
./.archray/archray version
./.archray/archray doctor

./.archray/archray update --check
./.archray/archray update

./.archray/archray validate .archray/graph.json
./.archray/archray build .archray/graph.json --force --no-open

./.archray/archray uninstall --dry-run
./.archray/archray uninstall
```

Windows 使用：

```bat
.archray\archray.cmd help
.archray\archray.cmd update --check
```

直接调用 CLI 也可以：

```sh
node .archray/tool/cli/bin/archray.mjs build .archray/graph.json --force --no-open
```

## 4. 安装

要求：Node 20+、`curl`、`tar`，以及能访问 GitHub Releases 的网络。安装脚本需要 POSIX `sh`/`mktemp`；Windows 请在 Git Bash 或 WSL 中执行，安装后的 `.archray\archray.cmd` 是后续 CLI 入口。

### 发布包一键安装

```sh
tmp=$(mktemp)
if curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh -o "$tmp"; then
  sh "$tmp" . claude
  archray_install_status=$?
else
  archray_install_status=$?
fi
rm -f "$tmp"
test "$archray_install_status" -eq 0
```

把 `claude` 换成你的宿主：

| 宿主 | 参数 | 安装后入口 |
|---|---|---|
| Claude Code | `claude` | `/archray`、`/archray:frontend` 等 |
| Cursor | `cursor` | `/archray`、`/archray-frontend` 等 |
| Antigravity | `antigravity` | `/archray`（命令目录兼容性以宿主版本为准） |
| Pi | `pi` | `/archray`、`/archray-frontend`、`/skill:archray` |
| Codex | `codex` | `$archray` 或 `/skills` |

多宿主（下载一次，按需选择一个命令）：

```sh
tmp=$(mktemp)
if curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh -o "$tmp"; then
  sh "$tmp" . claude,pi          # 或 pi,codex / all
  archray_install_status=$?
else
  archray_install_status=$?
fi
rm -f "$tmp"
test "$archray_install_status" -eq 0
```


包内 `install` 的默认宿主是 `claude`，根 bootstrap 的默认值是 `auto`；两者不同。`auto` 只探测**这个仓库里已有的 ArchRay 安装**，不是识别你电脑上装了哪些 AI；干净仓库第一次安装请显式写宿主。

安装器会：

- 把 CLI、viewer、Skill、命令和知识库放到 `.archray/tool/`；
- 写入 `.archray/SKILL.md`、schema 和 `tech.json`；
- 写入选中宿主的命令/Skill 文件；
- 写入 `.archray/archray` 与 `.archray/archray.cmd` 短命令；
- 记录 `.archray/install.json` 的版本和宿主。

`--force` 会刷新工具和已登记宿主的自带模板/命令，但**保留** `.archray/graph.json`、`view.json`、`index.html`。如果你改过自带命令或 Skill，升级前先备份。

### AI 安装句

把下面这句复制给能执行命令的 AI（把 `claude` 换成你的宿主或 `claude,pi`）：

```text
请在这个仓库安装 ArchRay：把 https://github.com/loofare/ArchRay/releases/latest/download/install.sh 下载到临时文件，确认下载成功后运行 `sh <临时文件> . claude`；下载失败或校验失败就不要执行。
```

安装完成后新开 AI 会话。安装已经成功、后续命令异常时先运行 `./.archray/archray doctor`；如果首次安装早期就失败（此时可能还没有包装器），先看 Node/curl/tar/sh 和网络错误，不要直接删除 `.archray` 数据。

## 5. 升级

### v0.5.0 及以后

`./.archray/archray update --check` 会联网读取 manifest，只报告当前/可用版本，不下载、不应用；`update` 才下载、校验并安装。

更新只刷新工具、Skill、命令和模板，**不重新分析源码**，保留 graph/view/index。失败会保留旧工具；成功后可运行 `version` 和 `doctor` 确认。AI 里输入 `/archray update` 等价。

### 从 v0.4.0 或更早一次性升级

旧版本没有 `update` 命令，也没有新短命令，不能自己更新自己。旧版无安装清单时 `auto` 会把共用 `.agents/skills` 的布局保守识别为 `pi,codex` 以免部分卸载误删共享 Skill；只用单宿主的仓库建议显式指定宿主。做一次引导升级：

```sh
tmp=$(mktemp)
if curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh -o "$tmp"; then
  sh "$tmp" . auto --force
  archray_install_status=$?
else
  archray_install_status=$?
fi
rm -f "$tmp"
test "$archray_install_status" -eq 0
```

如果不想用 `auto`，或旧 Pi+Codex 共用 `.agents/skills`，请显式写：

```sh
tmp=$(mktemp)
if curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh -o "$tmp"; then
  sh "$tmp" . pi,codex --force
  archray_install_status=$?
else
  archray_install_status=$?
fi
rm -f "$tmp"
test "$archray_install_status" -eq 0
```

升级后才有 `./.archray/archray update`。自带模板/命令的本地修改会被刷新覆盖，升级前先备份。

## 6. 卸载

先预览：

```sh
./.archray/archray uninstall --dry-run
```

默认卸载会移除工具、包装器和宿主命令，**保留** `.archray/graph.json`、`view.json` 和 `index.html`：

```sh
./.archray/archray uninstall
```

只移除某个宿主（保留其他宿主和共享工具）：

```sh
./.archray/archray uninstall --agent pi
```

`--purge` 删除整个 `.archray`，包括 graph/view/index 和你在其中自存的文件，且不能和 `--agent` 组合。先备份再执行：

```sh
./.archray/archray uninstall --purge
```

完整卸载后包装器也会消失，不能再执行 `./.archray/archray`。要保留图，先备份。

AI 卸载话术：

```text
请卸载当前仓库的 ArchRay，只删除 ArchRay 的安装文件，保留 .archray/graph.json、view.json 和 index.html。
```

---

## HTML 提供什么

单个 HTML 内嵌 viewer 和图数据，使用系统字体栈（不内嵌字体文件），可离线打开，包括 `file://`。

- 默认楼层视图，也提供等轴/平面；
- 滚轮以指针为中心缩放，拖拽平移，右键或 Alt+拖拽旋转；
- 全屏、缩略图定位、模块选择、下钻、折叠/展开、Fit；
- 健康度总览：评分、热点、分层健康；
- 可替代性总览：高/中/低/未分析、锁定点、已保存方案；
- 保存 `view.json` 可恢复语言、风格、动效、投影、镜头（含旋转）、聚焦、层和方案。

流程高亮依据声明的有向边，不是实际流量；sourcePaths 是待复核声明，不是运行时监控。PNG 导出当前相机或整图；页面不自行录屏。

## 分层与风格

```sh
./.archray/archray build .archray/graph.json --layers frontend,data --force --no-open
./.archray/archray build .archray/graph.json --style blueprint --lang en --force --no-open
```

层包括 `client`、`edge`、`gateway`、`service`、`async`、`data`、`ai`、`external`、`platform`、`observability`；中文别名如 `前端`、`数据`、`网关` 也可用。风格为 `tech`、`blueprint`、`glass`、`paper`；未知技术回退通用图标，不虚构品牌。

## 常见问题

- `Cannot read ... file not found`：先运行 `./.archray/archray help`，让 AI 写入 `.archray/graph.json`。
- `already exists`：保留文件、换输出路径，或确认要替换时加 `--force`。
- `--purge 删除整个 .archray`：先备份 `graph.json`、`view.json`、`index.html`。
- 更新检查失败：旧工具仍可用，检查网络和代理后重试；不要先删旧工具。

## 边界

不包含 npm 正式发布、自动扫描服务、SaaS、自动重构、替代目录、时间线/watch 或海报编辑器。分析由 AI 依据真实源码或用户描述生成；图中的路径、健康度、可替代性都需要复核。

品牌名称与商标归各所有者；图标来自 Iconify `logos`（CC0），仅用于识别。详见 [NOTICE](NOTICE) 和 [变更记录](docs/changelog.md)。[MIT](LICENSE)。
