# ArchRay

ArchRay helps developers using AI in their own repositories understand modules, dependencies and source evidence, compare optional alternatives, and prepare migration plans. This is a **source trial**, not an npm release or runtime monitor.

Acquire and build the tool (Node 20+):

```sh
git clone https://github.com/loofare/ArchRay.git
cd ArchRay
# To reproduce a reviewed delivery, check out its recorded commit.
npm ci
npm run build
npm test
npm run typecheck
```

From your target repository, use the absolute path to this tool:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs init
```

Ask your coding agent to read `.archray/SKILL.md` and `.archray/graph.schema.json`, inspect real source and generate `.archray/graph.json` with current facts, source paths and uncertainties. `init` writes templates only; the graph comes from that analysis. Candidates may be empty; keeping the current implementation is valid. ArchRay does not scan source or verify graph claims.

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

Install slash commands into your agent (Claude Code example; Cursor and Antigravity use flat `archray-*.md` files):

```sh
node /path/to/ArchRay/cli/bin/archray.mjs init --agent claude
# /archray, /archray:frontend, /archray:backend, /archray:data,
# /archray:network, /archray:security, /archray:full
```

Analyse once, then slice the view without re-analysing:

```sh
node /path/to/ArchRay/cli/bin/archray.mjs build .archray/graph.json --layers frontend,data --no-open
```

Layers are `client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability`; Chinese aliases such as `前端`, `数据`, `网关` work too. Selected layers stay visible and one-hop neighbours are dimmed as cross-layer context.

Run `archray help` for every command and option.

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

