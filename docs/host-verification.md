# 宿主与安装脚本实机验证步骤

日期：2026-11-18。用于发布前多宿主与安装脚本的实机兼容性验证。此文件只列可复现步骤；没有执行过的项不要标记为通过。

## 1. POSIX shell 参数矩阵

在临时目录中，使用本地发布包避免依赖线上 Release：

```sh
cd /path/to/ArchRay
npm run package
export ARCHRAY_INSTALL_BASE="file://$PWD/dist"
tmp=$(mktemp -d)
cd "$tmp"
sh -n /path/to/ArchRay/dist/install.sh
```

分别执行：

```sh
# 0 个参数：默认 target=.、agent=auto；干净目录应提示无法探测宿主，不应因 shift 崩溃
sh /path/to/ArchRay/dist/install.sh
# 1 个参数：target=.；仍应走 auto 的明确错误，不应因 shift 2 退出
sh /path/to/ArchRay/dist/install.sh .
# 2 个参数：正常安装
sh /path/to/ArchRay/dist/install.sh "$tmp/project-claude" claude
```

需要覆盖的 shell：

- macOS `/bin/sh`、`/bin/zsh`
- Ubuntu/Debian `dash`（重点）
- Alpine `ash`
- Git Bash / WSL 的 `sh`
- Windows `cmd.exe` 只验证安装后的 `.archray\archray.cmd`，不把 bootstrap 当作 cmd 脚本

记录：退出码、是否误执行安装、是否有 `shift` 报错。

## 2. 旧 Pi+Codex 布局一次性升级

模拟 v0.4 旧布局（没有 `.archray/install.json`）：

```sh
project=$(mktemp -d)
mkdir -p "$project/.pi/prompts" "$project/.agents/skills/archray"
printf 'legacy pi prompt\n' > "$project/.pi/prompts/archray.md"
printf 'legacy shared skill\n' > "$project/.agents/skills/archray/SKILL.md"
ARCHRAY_INSTALL_BASE="file://$PWD/dist" \
  sh dist/install.sh "$project" auto --force
cat "$project/.archray/install.json"
```

期望：`agents` 同时包含 `pi` 和 `codex`，共享 Skill 不被误删。

然后验证部分卸载：

```sh
"$project/.archray/archray" uninstall --agent codex
test -f "$project/.pi/prompts/archray.md"
test -f "$project/.agents/skills/archray/SKILL.md"
test -d "$project/.archray/tool"
"$project/.archray/archray" version
```

期望：Pi prompt、共享 Skill 和 tool 保留；manifest 只记录剩余宿主。

## 3. Antigravity

先核对当前 Antigravity 官方规范，确认它实际发现的目录：

- `.agent/skills` 还是 `.agents/skills`
- 是否支持 `.agent/commands/*.md`
- 是否只通过 Skill 激活

然后：

```sh
repo=$(pwd)
project=$(mktemp -d)
ARCHRAY_INSTALL_BASE="file://$repo/dist" \
  sh "$repo/dist/install.sh" "$project" antigravity --force
find "$project/.agent" "$project/.agents" -maxdepth 4 -type f 2>/dev/null | sort
```

在 Antigravity 中打开该项目，记录：

- 是否出现 `/archray`
- 是否出现 `/archray-frontend`
- 不出现时，Skill 是否能通过自然语言或 `/skill` 发现
- 更新/检查/卸载请求是否能触发 `SKILL.md`

如果宿主不支持 `.agent/commands`，不要把它标记为通过；应把 host matrix 的“命令”列改为“Skill”，并保留实测日期和宿主版本。

## 4. 真实 AI 宿主回合

对每个已安装宿主，新开会话并逐项执行：

```text
/archray
/archray 前端
/archray update --check
/archray update
```

Codex 使用：

```text
$archray
/skills
```

检查：

- 第一次是否生成 `.archray/graph.json` 和 `.archray/index.html`
- 第二次分层命令是否成功覆盖派生 HTML，且 graph/view 哈希不变
- `update --check` 是否只检查、不下载、不改文件
- `update` 是否保留 graph/view/index
- 卸载 dry-run 是否只展示范围，不实际删除
- 宿主是否需要 reload/新会话

## 5. Windows

在 Windows 10/11：

1. 用 Git Bash 或 WSL 执行 bootstrap。
2. 在 `cmd.exe` 中执行安装后的包装器：

```bat
.archray\archray.cmd version
.archray\archray.cmd doctor
.archray\archray.cmd update --check
.archray\archray.cmd uninstall --dry-run
```

3. 确认 `cmd` 不依赖 `sh`/`mktemp`；bootstrap 本身仍需要 POSIX 环境。

## 6. 记录模板

| 项目 | 环境/版本 | 结果 | 证据 |
|---|---|---|---|
| sh 0/1/2 参数 |  |  |  |
| dash/ash |  |  |  |
| 旧 Pi+Codex auto |  |  |  |
| 部分卸载 codex |  |  |  |
| Antigravity Skill |  |  |  |
| Antigravity 命令 |  |  |  |
| Claude 回合 |  |  |  |
| Cursor 回合 |  |  |  |
| Pi 回合 |  |  |  |
| Codex 回合 |  |  |  |
| Windows cmd |  |  |  |

未实际执行的项保持空白，不要用“文件存在”替代宿主加载或模型回合。
