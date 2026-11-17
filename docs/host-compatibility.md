# AI 宿主兼容性 / Host compatibility

日期：2026-11-18。本文件记录安装位置、调用方式与实际验证边界。文件存在不等于宿主已加载；未实际启动的宿主明确标注。



| 宿主 | 安装参数 | 写入位置 | 调用方式 | 本轮验证 |
|---|---|---|---|---|
| Claude Code | `--agent claude` | `.claude/skills/archray/SKILL.md` + `.claude/commands/archray.md`、`archray/*.md` | `/archray`、`/archray:frontend` | 文件布局与命令格式；本机未安装 Claude Code，未实际加载 |
| Cursor | `--agent cursor` | `.cursor/rules/archray.mdc` + `.cursor/commands/archray*.md` | `/archray`、`/archray-frontend` | 文件布局；本机未安装 Cursor，未实际加载 |
| Antigravity | `--agent antigravity` | `.agent/skills/archray/SKILL.md` + `.agent/commands/archray*.md` | `/archray`、`/archray-frontend` | 文件布局；宿主未安装，未实际加载 |
| Pi | `--agent pi` | `.agents/skills/archray/SKILL.md` + `.pi/prompts/archray.md`、`archray-*.md` | `/archray`、`/archray-frontend`、`/skill:archray` | **实际验证**：`pi --mode rpc get_commands` 列出全部七个 prompt 与 `skill:archray` |
| Codex | `--agent codex` | `.agents/skills/archray/SKILL.md` | `$archray` 或 `/skills` | 官方文档确认 `.agents/skills` 与显式技能调用；本机未安装 Codex CLI，未实际加载 |

## 已实测：Pi

测试仓库使用 `init --agent pi`，得到：

```text
.agents/skills/archray/SKILL.md
.pi/prompts/archray.md
.pi/prompts/archray-backend.md
.pi/prompts/archray-data.md
.pi/prompts/archray-frontend.md
.pi/prompts/archray-full.md
.pi/prompts/archray-network.md
.pi/prompts/archray-security.md
```

通过 `pi --mode rpc --no-session --approve` 发送 `get_commands`，实际返回：

```text
archray [prompt]
archray-backend [prompt]
archray-data [prompt]
archray-frontend [prompt]
archray-full [prompt]
archray-network [prompt]
archray-security [prompt]
skill:archray [skill]
```

这说明 Pi 能发现斜杠命令与 Skill。独立 `pi` CLI 在本机没有配置模型 API key，因此只验证了命令发现，没有执行一次完整模型回合；命令内容与 CLI 执行已由包级和真实仓库试用覆盖。

## 安装示例

v0.4.0 发布包包含全部宿主：

```sh
./archray-0.4.0/install.sh /path/to/repo claude
./archray-0.4.0/install.sh /path/to/repo pi
./archray-0.4.0/install.sh /path/to/repo codex
./archray-0.4.0/install.sh /path/to/repo all
```

从源码安装时，把 `./archray-0.4.0/install.sh` 换成 `node cli/bin/archray.mjs install`。

Pi 首次打开项目时会要求信任项目文件；信任后 `/archray` 可用；编辑 prompt 后用 `/reload`。

## 尚未覆盖

- Claude Code / Cursor / Antigravity 的真实斜杠加载与参数传递。
- Codex 的 `$archray` / `/skills` 实际调用。
- 各宿主的权限模型、工具批准和网络策略差异。
