# ArchRay

**AI-Driven Living System Architecture Visual Engine** — *AI Cognitive Decomposition + Zero-Runtime-Dependency 2.5D Isometric Interactive Sandbox*.

ArchRay eliminates static diagram rot and LLM coordinate overlap by separating responsibilities:
1. **AI Brain (`skill/SKILL.md`)**: Any AI coding agent (Antigravity, Claude Code, Cursor, Gemini CLI) follows a 3-phase codebase scan and outputs pure semantic topology in `.archray/graph.json` — never screen pixel coordinates.
2. **Deterministic 2.5D Visual Trunk (`viewer/` + `cli/`)**: Computes non-overlapping ELK.js + `26°` isometric layouts, renders 10 volumetric 3D SVG node primitives with Living System Vitals, animates end-to-end packet flows, supports C4 drill-down & AI refactoring prompt export, and bundles into a single offline HTML file.

---

## Key Capabilities

- **Zero-Runtime-Dependency Output**: `archray build` compiles `.archray/graph.json` + the prebuilt `viewer/dist/viewer.html` into a self-contained `.archray/index.html` (~1.7 MB) you can open directly in any browser.
- **10 Volumetric 2.5D Node Primitives**: `client`, `gateway`, `service`, `worker`, `database`, `cache`, `queue`, `storage`, `external-api`, `ai-model`.
- **Living System Vitals**: `healthy` breathing glow, `bottleneck` / `high-complexity` pulse alerts, `planned` holographic wireframes, and `deprecated` markers.
- **3 Analytical Lenses (`LensBar`)**: **Topology**, **Vitals Heatmap**, and **Evolution Diff** (`+ PLANNED` architecture proposals), plus runtime JSON upload.
- **Interactive Flow Replay (`FlowPlayer`)**: Play, pause, or step through multi-step business journeys with glowing `<animateMotion>` data packet particles and payload callouts.
- **C4 Drill-Down & Bi-Directional AI Loop (`Inspector`)**: Double-click composite nodes to explore internal `children` subgraphs, click mapped `sourcePaths`, and copy a structured **AI Refactor Context Prompt** to the clipboard.

---

## Quick Start

### 1. Install & Build the Prebuilt 2.5D Viewer

```bash
npm install
npm run build:viewer
```

Run live dev mode with the built-in NexusAI Cloud demo (`examples/demo-system.json`):

```bash
npm run dev
```

### 2. Mount ArchRay into Another Git Project

```bash
node ./cli/bin/archray.mjs init --target /path/to/your-project --agent all
```

This mounts `.archray/archray.schema.json` along with Skill files for Antigravity (`.agent/skills/archray/SKILL.md`), Claude Code (`.claude/skills/archray/SKILL.md`), and Cursor (`.cursor/rules/archray.mdc`).

Then ask your AI agent inside that project:
> *"Use the ArchRay skill to analyze this repository and generate `.archray/graph.json`."*

### 3. Validate & Build `.archray/index.html`

```bash
node ./cli/bin/archray.mjs validate .archray/graph.json
node ./cli/bin/archray.mjs build --input .archray/graph.json --output .archray/index.html
```

Pass `--no-open` in CI or headless environments.

### 4. Self-Hosted Verification (ArchRay Analyzing ArchRay)

This repository includes its own self-analyzed graph at `.archray/graph.json`:

```bash
npm run self-analyze
```

---

## Documentation & Core Files

- **Product & Technical Architecture Spec**: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Universal AI Agent Skill Specification**: [`skill/SKILL.md`](./skill/SKILL.md)
- **Single Source of Truth JSON Schema**: [`schema/archray.schema.json`](./schema/archray.schema.json)
- **Zero-Dependency CLI**: [`cli/bin/archray.mjs`](./cli/bin/archray.mjs)
- **2.5D Isometric Layout Engine**: [`viewer/src/layout/isoLayout.ts`](./viewer/src/layout/isoLayout.ts)
- **Reference Demo Graph**: [`examples/demo-system.json`](./examples/demo-system.json)
