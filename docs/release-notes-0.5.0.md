# ArchRay v0.5.0

日期：2026-11-18。v0.5.0 加入项目内自更新、一次性引导升级、完整卸载和新的楼层/等轴交互。

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

安装后新开 AI 会话：Claude/Cursor/Antigravity/Pi 输入 `/archray`；Codex 输入 `$archray` 或 `/skills`。

## 更新

```sh
.archray/archray update --check
.archray/archray update
```

或对 AI 说：`/archray update`。

更新只刷新工具、Skill、命令和模板，保留 `.archray/graph.json`、`view.json` 和 `index.html`；不重新分析源码。下载使用 Release `latest.json` 和 SHA-256 校验，失败保留旧工具。

## 从 v0.4.0 或更早升级

旧版没有 `update` 命令，需要做一次引导升级：

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

如果自动探测不确定，显式写宿主，例如 `claude,pi` 或 `pi,codex`。升级后才有 `.archray/archray update`。

## 卸载

```sh
.archray/archray uninstall --dry-run
.archray/archray uninstall
```

默认保留 graph/view/index；`--purge` 删除整个 `.archray`。卸载最后一个宿主后包装器也会消失。

## 视觉与导航

- 默认楼层视图；等轴/平面可切换。
- 指针中心缩放、拖拽平移、右键或 Alt+拖拽旋转、全屏和缩略图。
- 健康度总览：评分、热点、分层健康。
- 可替代性总览：高/中/低/未分析、锁定点、已保存方案。

## 验证

29 项核心测试、typecheck、build、CLI 回归、包级安装/回滚、更新/卸载回归、浏览器矩阵和脱敏扫描通过。

## 已知边界

- 更新需要网络；`--check` 也会读取 Release manifest。
- 系统需要 `tar`；Windows 使用自带 tar 或 Git Bash/WSL 的 tar。
- 下载校验依赖 HTTPS 与 Release manifest 的 SHA-256；不是独立签名认证。
- 未覆盖所有 AI 宿主的真实加载、所有平台和真实公开 Release 下载。
