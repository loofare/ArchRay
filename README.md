# ArchRay

ArchRay is an **AI-first architecture visualiser**: install it once, then type `/archray` inside your AI assistant. It reads your repository, records evidence, and builds a layered, interactive single-file HTML view that you can explore, share and export.

## Quick start (in your AI)

1. Get the tool and build it once (Node 20+):

```sh
git clone https://github.com/loofare/ArchRay.git
cd ArchRay
npm ci && npm run build
```

2. In the repository you want to map, install the skill and slash commands:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs init --agent claude
# claude | cursor | antigravity | all
```

3. In your AI:

```text
/archray
/archray 前端,数据
```

Claude Code gets `/archray` plus `/archray:frontend`, `:backend`, `:data`, `:network`, `:security`, `:full`. Cursor and Antigravity get flat `archray-*.md` commands. Codex, Pi/Managed host and other Skill hosts can read `.archray/SKILL.md` and use the same layer keywords.

The AI inspects real source, writes `.archray/graph.json`, then builds `.archray/index.html`. `init` writes templates and commands only; the graph comes from that analysis. Candidates may be empty; keeping the current implementation is valid. ArchRay does not scan source or verify graph claims.

## Layers

Analyse once, then slice the view without re-analysing:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --layers frontend,data --no-open
```

Layers are `client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability`; Chinese aliases such as `前端`, `数据`, `网关` work too. Selected layers stay visible and one-hop neighbours are dimmed as cross-layer context. `/archray` accepts the same keywords.

## Styles and language

Choose at build time, or switch style inside the HTML:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --style blueprint --lang en --no-open
```

Styles: `tech` (default), `blueprint`, `glass`, `paper`. Language uses the graph's locales; a missing locale is reported and falls back instead of inventing text. Known technologies (Postgres, React, Kubernetes, AWS, Stripe, …) get a brand mark on the node; unknown ones fall back to a generic component icon.

## What the HTML gives you

The single HTML embeds the viewer, the graph and operating-system fonts, so it opens offline, including over `file://`. It defaults to flat and also offers stack/iso, module selection, drill-down, fold/expand, zoom controls, wheel zoom, background drag and Fit. Details show full descriptions and source paths; narrow screens use a closable overlay.

Flow highlighting follows declared directed edges, not observed traffic. Save `view.json`, then import it or embed it with `--view` to restore language, style, projection, lens, focus, collapsed groups, layers, camera and scenario. Invalid or stale view values fall back with warnings. Export the current view as PNG; choosing an image size or recording a walkthrough happens inside the HTML in a later release.

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

The viewer defaults to flat and also offers stack/iso, module selection, drill-down, fold/expand, zoom controls, wheel zoom, background drag and Fit. Details show full descriptions and source paths; narrow screens use a closable overlay. Flow highlighting follows declared directed edges, not observed traffic. Save `view.json`, then import it or embed it with `--view` to restore language, theme, projection, lens, focus, collapsed groups, camera and scenario. Invalid or stale view values fall back with warnings. Hidden/pinned are reserved and not restored.

Scenarios are target previews; base graph facts remain the basis for impact and prompts. Deletion cascades subtrees, incident edges and flow steps; replacement reparents children and maps flow endpoints. The original input remains unchanged. Prompts request review, migration, rollback and verification plans; implementation requires separate authorization. Clipboard failure exposes selectable text. PNG exports the current camera framing.

