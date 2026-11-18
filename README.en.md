[中文](README.md) | **English**

# ArchRay

ArchRay is an **AI-first architecture visualiser**: install it into your repository once, then type `/archray` in your AI assistant. It reads real source, records evidence, and builds a layered, interactive, offline single-file HTML view.

---

## 1. First use

1. Install ArchRay from the **root of your project repository** (section 4).
2. Open a new AI session.
3. Use the entry for your host: Claude/Cursor/Pi use `/archray`; Antigravity uses the Skill (command discovery depends on host version); Codex uses `$archray` or `/skills`.
4. The first run analyses the repository and writes `.archray/graph.json` and `.archray/index.html`. Open the HTML.

Already installed? Start at section 2.

## 2. What to say in your AI

| Goal | Input |
|---|---|
| Install | copy the install sentence in section 4 |
| Analyse this repository | `/archray` |
| Frontend only | `/archray frontend` |
| Update | `/archray update` |
| Uninstall | `Uninstall ArchRay from this repository; keep graph/view/index` |

Natural language also works:

```text
Analyse the real source in this repository, build a layered architecture view, record evidence and unknowns, build the single-file HTML, and tell me the output path. Do not modify business code.
```

```text
Update ArchRay in this repository to the latest version, keep .archray/graph.json and view.json, and tell me the old and new versions.
```

Codex has no `/archray` slash command; use `$archray` or `/skills`.

## 3. Command line

Run these from the **target repository root**. The installer provides a project-local command, not a global PATH entry:

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

On Windows:

```bat
.archray\archray.cmd help
.archray\archray.cmd update --check
```

The long form also works:

```sh
node .archray/tool/cli/bin/archray.mjs build .archray/graph.json --force --no-open
```

## 4. Install

Requires Node 20+, `curl`, `tar`, and network access to GitHub Releases. The installer needs POSIX `sh`/`mktemp`; on Windows use Git Bash or WSL. The installed `.archray\archray.cmd` is the later CLI entry, not the bootstrap shell.

### One-line release install

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

Replace `claude` with your host:

| Host | Argument | Entry |
|---|---|---|
| Claude Code | `claude` | `/archray`, `/archray:frontend`, … |
| Cursor | `cursor` | `/archray`, `/archray-frontend`, … |
| Antigravity | `antigravity` | `/archray` (command discovery depends on host version) |
| Pi | `pi` | `/archray`, `/archray-frontend`, `/skill:archray` |
| Codex | `codex` | `$archray` or `/skills` |

Multiple hosts (download once, choose one command):

```sh
tmp=$(mktemp)
if curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh -o "$tmp"; then
  sh "$tmp" . claude,pi          # or pi,codex / all
  archray_install_status=$?
else
  archray_install_status=$?
fi
rm -f "$tmp"
test "$archray_install_status" -eq 0
```


The inner `install` defaults to `claude`; the root bootstrap defaults to `auto`; these differ. `auto` detects **existing ArchRay installs in this repository**, not which AI apps are on your computer. On a clean repository, choose the host explicitly.

The installer writes the CLI, viewer, skill, commands and knowledge base under `.archray/tool/`, adds `.archray/SKILL.md`, schemas, `tech.json`, host files, the `.archray/archray` + `.archray/archray.cmd` wrappers, and `.archray/install.json`.

`--force` refreshes the tool and registered host templates/commands while **keeping** `.archray/graph.json`, `view.json` and `index.html`. Back up local edits to generated commands/skills before upgrading.

### AI install sentence

Copy this to an AI that can run commands (replace `claude` with your host or `claude,pi`):

```text
Install ArchRay in this repository: download https://github.com/loofare/ArchRay/releases/latest/download/install.sh to a temporary file, then run `sh <temp-file> . claude` only if the download succeeded; stop if it failed.
```

Open a new AI session afterwards. If installation succeeded but later commands misbehave, run `./.archray/archray doctor`; if the first install fails early (the wrapper may not exist yet), read the Node/curl/tar/sh or network error first, and do not delete `.archray` data blindly.

## 5. Upgrade

### v0.5.0 and later

`./.archray/archray update --check` reads the manifest over the network and reports current/available only; it does not download or apply. `update` downloads, verifies and installs.

Updates refresh the tool, skill, commands and templates; they **do not re-analyse source** and keep graph/view/index. A failed update keeps the old tool. Run `version` and `doctor` afterwards. `/archray update` does the same in AI.

### One-time upgrade from v0.4.0 or older

Old versions have no `update` command and no wrapper, so they cannot update themselves. Without an install manifest, `auto` conservatively records shared `.agents/skills` layouts as `pi,codex` so partial uninstalls never drop the shared skill; pass your exact host if you only use one. Run the bootstrap once:

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

If you do not want `auto`, or old Pi+Codex shared `.agents/skills`, name the hosts:

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

After this, `./.archray/archray update` exists. Back up local edits to generated commands/skills first.

## 6. Uninstall

Preview first:

```sh
./.archray/archray uninstall --dry-run
```

The default removes the tool, wrappers and host files but **keeps** `.archray/graph.json`, `view.json` and `index.html`:

```sh
./.archray/archray uninstall
```

Remove one host while keeping the others and the shared tool:

```sh
./.archray/archray uninstall --agent pi
```

`--purge` deletes the whole `.archray`, including graph/view/index and any files you stored there, and cannot be combined with `--agent`. Back up first:

```sh
./.archray/archray uninstall --purge
```

A full uninstall also removes the wrapper, so `./.archray/archray` no longer exists. Back up the graph first.

AI uninstall sentence:

```text
Uninstall ArchRay from this repository, removing only ArchRay install files; keep .archray/graph.json, view.json and index.html.
```

---

## What the HTML gives you

The single HTML embeds the viewer and graph data and uses the OS font stack; it opens offline, including `file://`.

- Layered stack view by default; iso/flat also available.
- Cursor-centred wheel zoom, drag pan, right-drag or Alt-drag rotation.
- Fullscreen, minimap, module selection, drill-down, fold/expand and Fit.
- Health overview: score, hotspots and per-layer health.
- Replaceability overview: high/medium/low/unknown, lock-in and saved options.
- Save `view.json` to restore language, style, motion, projection, camera (including rotation), focus, layers and scenario.

Flow highlighting follows declared directed edges, not observed traffic. Source paths are claims to verify, not runtime monitoring. PNG exports the current camera or the full graph; the page never records by itself.

## Layers and styles

```sh
./.archray/archray build .archray/graph.json --layers frontend,data --force --no-open
./.archray/archray build .archray/graph.json --style blueprint --lang en --force --no-open
```

Layers include `client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability`; Chinese aliases such as `前端`, `数据`, `网关` work too. Styles are `tech`, `blueprint`, `glass`, `paper`; unknown technologies fall back to a generic icon rather than an invented brand.

## Troubleshooting

- `Cannot read ... file not found`: run `./.archray/archray help`, then have the AI write `.archray/graph.json`.
- `already exists`: keep the file, choose another output, or use `--force` when replacement is intended.
- `--purge deletes the whole .archray`: back up `graph.json`, `view.json` and `index.html` first.
- Update check fails: the old tool remains usable; check network/proxy and retry. Do not delete the old tool first.

## Boundaries

No npm release, scan service, SaaS, automatic refactoring, replacement catalogue, timeline/watch or poster editor. Analysis is generated by AI from real source or user description; paths, health and replaceability claims need review.

Brand names and trademarks belong to their owners. Icons come from Iconify `logos` (CC0) and are used only for identification. See [NOTICE](NOTICE) and the [changelog](docs/changelog.md). [MIT](LICENSE).
