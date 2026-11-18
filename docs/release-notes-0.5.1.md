# ArchRay v0.5.1

日期：2026-11-18。v0.5.1 修复默认楼层视图缩放标签、二次切层构建、自更新与引导脚本安全校验、卸载清理与跨平台兼容问题，并补齐 CLI 类型检查与三平台 CI。

## 安装

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

把 `claude` 换成 `cursor`、`antigravity`、`pi`、`codex`、`claude,pi` 或 `all`。Node 20+。

## 升级

从 v0.5.0 升级：

```sh
./.archray/archray update --check
./.archray/archray update
```

从 v0.4.0 或更早一次性升级：

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

## 本版本变更

- **楼层/等轴视图与导航**：通过 `ResizeObserver` 按实际视口缩放与 `zoom` 计算标签尺寸，大图缩放后标题与摘要保持清晰；`autoZoom` 改用当前投影包围盒；缩略图视口框与点击定位同步支持相机旋转；详情面板多协议重复边去重、`importView` 缺省动效重置。
- **二次视图重建与模板对齐**：主命令与六个分层预设重建派生 `.archray/index.html` 时显式携带 `--force`（保留 `.archray/graph.json` 与 `view.json`）；统一 `SKILL.md` 的全局唯一节点 ID 与 19 种已知组件 `kind`；参数占位从代码块移出避免误插。
- **自更新与引导安装加固**：更新源拒绝非本地 `http://` 与重定向降级（逐跳校验）、增加 30s 超时与体积上限；解压前预检 `tar` 条目（拦截绝对路径、`..`、反斜杠、软硬链接与设备节点）；修复引导脚本在严格 POSIX `sh`/`dash` 下少参 `shift` 退出问题与正则转义，修复 Windows 下解压校验路径分隔符问题；保守识别无清单的旧 Pi+Codex 共享 `.agents/skills` 布局。
- **卸载与安装回滚**：`install` 失败回滚恢复文件权限并清理新建空目录；`uninstall` 仅清理所选宿主空目录（含 `skills/archray`）并对未安装宿主明确提示；`init` 统一接入越界与符号链接保护；`doctor` 检查系统 `tar` 可用性。
- **详情链接安全与工程质量**：`Inspector` 参考链接仅渲染 `http:`/`https:` 并附带 `noopener noreferrer`；`npm run typecheck` 覆盖 `cli/src` 与 `scripts/*.ts`；新增 Ubuntu / macOS / Windows GitHub Actions CI 工作流。

## 已知边界

- 更新仍依赖 HTTPS 与 Release manifest 的 SHA-256，不包含独立签名认证。
- 未覆盖所有 AI 宿主的真实模型回合实测与全量 Windows 实机矩阵（见 [宿主验证清单](host-verification.md)）。
