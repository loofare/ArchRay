[中文](README.md) | **English**

# ArchRay

ArchRay is an **AI-first architecture visualiser**: install it once, then type `/archray` inside your AI assistant. It reads your repository, records evidence, and builds a layered, interactive single-file HTML view that you can explore, share and export.

## One-line install

Copy this to an AI that can run commands:

> Install ArchRay in this repository and start using it: download `archray-0.3.0.tgz` from https://github.com/loofare/ArchRay/releases/tag/v0.3.0, extract it, run `./archray-0.3.0/install.sh . claude`, then follow `.archray/SKILL.md` to generate `.archray/graph.json`, build the HTML, and show me how to use `/archray`.

Open a new AI session:

- **Claude Code / Cursor / Antigravity / Pi**: type `/archray`. Pi presets are `/archray-frontend` etc.; `/skill:archray` also works.
- **Codex**: type `$archray` or `/skills`; there is no `/archray` slash command.

For Cursor, Antigravity, Pi or Codex, replace `claude` with the matching value in the install command. **The v0.3.0 release only carries Claude/Cursor/Antigravity layouts; Pi/Codex need v0.4.0 or a source install.**

## Quick start (in your AI)

**Option A — release package (recommended).** Download `archray-<version>.tgz` from the releases page, then:

```sh
tar -xzf archray-<version>.tgz
./archray-<version>/install.sh /path/to/your-repo claude
```

The installer needs Node 20+. It vendors a self-contained copy of the CLI, viewer, skill, commands and knowledge base into `.archray/tool/`, writes the slash commands and templates, and adds `tool/` to `.archray/.gitignore`. The downloaded `archray-<version>/` folder is no longer needed after installation (about 2.1 MB per repository). Run `node .archray/tool/cli/bin/archray.mjs doctor` inside the repository if something looks missing.

**Option B — from source.** Node 20+:

```sh
git clone https://github.com/loofare/ArchRay.git
cd ArchRay
npm ci && npm run build
node /path/to/ArchRay/cli/bin/archray.mjs init --target /path/to/your-repo --agent claude
```

Then in your AI:

```text
/archray
/archray 前端,数据
```

Claude Code gets `/archray` plus `/archray:frontend`, `:backend`, `:data`, `:network`, `:security`, `:full`. Cursor and Antigravity get flat `archray-*.md` commands. Pi uses `/archray`, `/archray-frontend` and `/skill:archray`; Codex reads `.agents/skills` and uses `$archray` or `/skills`. Install with `--agent claude|cursor|antigravity|pi|codex`. See the [host compatibility matrix](docs/host-compatibility.md); Managed host uses a managed Skill (same document).

The AI inspects real source, writes `.archray/graph.json`, then builds `.archray/index.html`. `init` writes templates and commands only; the graph comes from that analysis. Candidates may be empty; keeping the current implementation is valid. ArchRay does not scan source or verify graph claims.

## Layers

`init` also writes `.archray/tech.json`: 212 technologies and brands with category, layer and component-kind hints. The AI uses it to classify what it finds; it is a hint, not proof that a technology is present.

Analyse once, then slice the view without re-analysing:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --layers frontend,data --no-open
```

Layers are `client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability`; Chinese aliases such as `前端`, `数据`, `网关` work too. A graph may declare its own layer ids; those stay selectable and are saved by their own id. Selected layers stay visible and one-hop runtime neighbours are dimmed as cross-layer context; platform/tooling nodes stay hidden unless selected. Graphs with 25+ modules open at a readable zoom on wide screens (up to 4×; extremely large graphs may still need manual zoom); Fit returns to the whole graph. `/archray` accepts the same keywords.

## Styles and language

Choose at build time, or switch style inside the HTML:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --style blueprint --lang en --no-open
```

Styles: `tech` (default), `blueprint`, `glass`, `paper`. Language uses the graph's locales; a missing locale is reported and falls back instead of inventing text. Known technologies (Postgres, React, Kubernetes, AWS, Stripe, …) get a brand mark on the node; unknown ones fall back to a generic component icon.

Motion is `full`, `calm` or `off`, via `--motion` or the toolbar. `full` adds ambient current and travelling particles; `calm` keeps slow dashes; `off` stops ambient motion. When the operating system asks for reduced motion, a saved or URL `full` setting is clamped to `calm`; `calm` and `off` are preserved. Choosing a level in the toolbar is an explicit override.

## What the HTML gives you

The single HTML embeds the viewer and the graph data, and uses the operating-system font stack; font files are not embedded. It opens offline, including over `file://`. It defaults to flat and also offers stack/iso, module selection, drill-down, fold/expand, zoom controls, wheel zoom, background drag and Fit. Details show full descriptions and source paths; narrow screens use a closable overlay.

Flow highlighting follows declared directed edges, not observed traffic. Save `view.json`, then import it or embed it with `--view` to restore language, style, motion, projection, lens, focus, collapsed groups, layers, camera and scenario. Invalid or stale view values fall back with warnings.

Export the current camera or the **whole graph** as PNG (2x, capped at a safe canvas size). Ambient particles are stripped from stills so nothing freezes mid-path. A **Record** guide explains the system shortcuts and what to demonstrate; the page never records by itself, so nothing leaves the machine.

## Under the hood (CLI)

```sh
node /path/to/ArchRay/cli/bin/archray.mjs validate .archray/graph.json
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --no-open
# Open .archray/index.html in a browser, including file://.
```

If a command stops, the message names the next step:

- `already exists` — keep the file, choose another `--output`, or add `--force` when replacement is intended.
- `over its input` or `symbolic link` — choose a separate real output path; these are refused even with `--force`.
- `Cannot read ... file not found` — run `archray init`, then have your agent write `.archray/graph.json`.
- `...: <path>: <reason>` — invalid graph fields; fix the graph, not the viewer.

The compiled CLI uses Node built-ins only. The HTML embeds the viewer, fonts supplied by the operating system, and graph data. Browsing that artifact does not require an ArchRay service; dependency installation and your AI agent may use the network.

Default init writes only `.archray`. Agent integrations require explicit `--agent claude|cursor|antigravity|all`. Existing outputs are refused; use `--force` deliberately. Input/output aliases and output symlinks are refused even with force. Each output is committed atomically; init checks every destination before writing (it is not a multi-file filesystem transaction).

Other commands:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs migrate old-v1.json --output .archray/graph.v2.json
node /path/to/ArchRay/cli/bin/archray.mjs schema graph
node /path/to/ArchRay/cli/bin/archray.mjs schema view
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --view .archray/view.json --no-open
```

v1 migration preserves original evidence under `extensions.migration`, scopes local IDs and refuses ambiguous references. Original files are not overwritten. From the tool checkout, `npm run self-analyze` converts the retained v1 graph in a temporary directory and builds `.archray/self-legacy.html`. It is a legacy demo labelled in the title as not current-source analysis, not a scan of this checkout. The tracked `.archray/graph.json` and `.archray/index.html` are that retained initial baseline, not a description of the current checkout.

Scenarios are target previews; base graph facts remain the basis for impact and prompts. Deletion cascades subtrees, incident edges and flow steps; replacement reparents children and maps flow endpoints. The original input remains unchanged. Prompts request review, migration, rollback and verification plans; implementation requires separate authorization. Clipboard failure exposes selectable text. PNG exports the current camera or the full visible graph.


## Upgrade and uninstall

Upgrade with a newer release tarball; `--force` refreshes the vendored tool, skill, commands and templates while keeping `.archray/graph.json`:

```sh
./archray-<new-version>/install.sh /path/to/your-repo claude --force
```

Uninstall by removing the installed files (nothing is global). This also deletes `.archray`, including `graph.json`, `view.json` and the built HTML — back them up first if you want to keep them:

```sh
rm -f /path/to/your-repo/.claude/commands/archray.md /path/to/your-repo/.claude/commands/archray/*.md
rm -rf /path/to/your-repo/.claude/skills/archray /path/to/your-repo/.archray
# .archray/tool is inside .archray, so the vendored CLI is removed too
# Cursor: .cursor/commands/archray*.md and .cursor/rules/archray.mdc
# Antigravity: .agent/commands/archray*.md and .agent/skills/archray
# Pi: .pi/prompts/archray.md, .pi/prompts/archray-*.md and .agents/skills/archray
# Codex: .agents/skills/archray (shared with Pi; delete only the ArchRay directory)
# Check .pi/prompts and .agents/skills for other tools before deleting
```

`archray version` prints the bundle version; `archray doctor` checks the viewer template, schemas, skill, commands and knowledge base. Installed commands use the relative `.archray/tool/cli/bin/archray.mjs`, so they keep working after the download is removed or the repository moves.
