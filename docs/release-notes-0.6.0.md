# ArchRay v0.6.0

日期：2026-11-19。v0.6.0 带来 **Style B 3D 空间全景 + 2D Bento 圆弧曲线** 视觉重塑，并修复 Windows/跨编码下 `.archray/graph.json` 中文变成问号乱码的问题。

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

从 v0.5.x 升级：

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

> 升级后若直接重新构建现有图谱，运行 `./.archray/archray build .archray/graph.json --force`（Windows 为 `.\.archray\archray.cmd build .archray\graph.json --force`）。如果旧 `.archray/graph.json` 内已经出现 `????` 问号乱码，请先删除该文件或在 AI 会话中重新执行 `/archray` 重新生成 UTF-8 图谱。

## 本版本变更

- **3D 空间全景默认视图（Style B）**：按核心纵轴、异步/AI 侧翼、外部 SaaS 轨道与基础设施底座进行四象限空间分层；修正透视俯仰符号、长焦视距与分层画家排序，消除楼板遮挡；同层 3D 连线升级为拱起平滑贝塞尔曲线并附带方向箭头；楼层标签外移并参与节点标签避让。
- **2D Bento 圆弧版图**：采用平滑贝塞尔圆弧连线（含多端口扇形分散与同行弧拱）与悬浮半透明卡片；当单层包含超过 6 个平铺节点时自动重排为多行 Bento 网格，避免超宽拉扁。
- **交互体验、双语与分享回流**：修复桌面端顶栏布局碰撞；新增拓扑/健康度/可替代性 `?` 帮助说明；总览卡片支持拖拽、折叠、关闭与恢复；支持 3D/2D 完整无裁切整图 PNG 及离线二维码分享海报导出；完善全量双语检查与切换。
- **编码兼容与乱码拦截**：CLI 自动兼容 UTF-8 BOM、UTF-16 LE/BE BOM 与 GB18030 中文读取，HTML 嵌入 JSON 执行 `\uXXXX` ASCII 转义；`validate` / `build` 主动拦截 `\uFFFD` 与 `????` / `API ??` 等问号占位乱码；`SKILL.md` 与 `/archray` 明确要求以无 BOM UTF-8 写入图谱。

## 已知边界

- 更新仍依赖 HTTPS 与 Release manifest 的 SHA-256，不包含独立签名认证。
- 未覆盖所有 AI 宿主的真实模型回合实测与全量 Windows 实机矩阵（见 [宿主验证清单](host-verification.md)）。
