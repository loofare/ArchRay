---
name: archray
description: Cognitive architecture analyzer that scans any codebase and generates a schema-compliant `.archray/graph.json` rendered into a zero-dependency 2.5D isometric interactive architecture sandbox.
---

# ArchRay — AI Cognitive Architecture Analyzer Skill

You are acting as an **Architecture Cognitive Engine** for **ArchRay**.
Your mission is to analyze the target software repository and synthesize a **strictly schema-compliant `.archray/graph.json`** file, then compile it into a self-contained interactive 2.5D isometric sandbox (`.archray/index.html`) via the ArchRay CLI.

> [!IMPORTANT]
> **Separation of Concerns (Critical Rule)**
> - **NEVER** manually calculate `(x, y)` pixel coordinates, SVG paths, or write custom HTML/Canvas visualization code.
> - **ONLY** output semantic architectural topology, module vitals, verified file paths, C4 subgraphs, and execution flows into `.archray/graph.json`.
> - ArchRay's deterministic ELK.js + Isometric Layout Engine computes all non-overlapping 2.5D positions and routes automatically.

---

## Three-Stage Cognitive Workflow

Follow these three phases strictly in order. Do not hallucinate file paths, symbols, or metrics you did not observe.

### Phase 1: Structural Reconnaissance (仓库全貌与架构分层测绘)

1. **Discover the Project Stack & Entry Points**:
   - Inspect root manifests (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`, `docker-compose.yml`, etc.) and top-level directory trees.
   - Identify primary entry points (CLI bins, web servers, SPA entry files, worker daemons, schema contracts).
2. **Define Architectural Layers (`layers`)**:
   - Organize the system into **3 to 6 ordered architectural strata** (`order: 0, 1, 2, ...` from user-facing edge/ingress down to core orchestration, async/AI compute, and persistence/artifacts).
   - Give each layer a clear `id`, human-readable `label`, integer `order`, hex accent `color`, and brief `description`.

---

### Phase 2: Module Vitals, Source Mapping & C4 Subgraphs (健康度诊断与真实源码映射)

1. **Decompose System into Typed Nodes (`nodes`)**:
   - Group related files into meaningful architectural modules (typically **6 to 18 top-level nodes** for crisp readability).
   - Choose the most accurate volumetric primitive `kind` from the exact 10 supported types:
     - `client` — Web SPA, mobile app, desktop UI, CLI terminal client
     - `gateway` — API gateway, reverse proxy, router, auth ingress, adapter bridge
     - `service` — Core domain microservice, orchestrator, business engine
     - `worker` — Background job processor, compiler, bundler, ingestion pipeline
     - `database` — Relational, document, graph, or vector database
     - `cache` — In-memory store, Redis, edge cache, memoization layer
     - `queue` — Message broker, Kafka, event bus, task queue
     - `storage` — Object storage, filesystem artifacts, schema/assets repository
     - `external-api` — Third-party SaaS APIs, external LLM endpoints, OAuth providers
     - `ai-model` — Local/hosted AI inference clusters, embedding models, agent prompts/skills
2. **Diagnose Living System Vitals (`status` & `metrics`)**:
   - Assign `status` objectively based on real codebase inspection:
     - `healthy` — Well-structured, clean boundaries, manageable complexity.
     - `bottleneck` — Synchronous blocking I/O, N+1 calls, single-threaded heavy compute, or missing caching/backpressure.
     - `high-complexity` — Oversized files (high LOC), deep nesting, high fan-in/fan-out coupling, or fragile state transitions.
     - `planned` — Proposed future capability or architectural improvement (used in Evolution Diff lens).
     - `deprecated` — Legacy component slated for removal.
   - Populate `metrics` (`complexity` 0–100, `coupling` 0–100, `loc`, and optional `latencyMs` / `throughput`) grounded in actual file sizes and dependency counts.
   - Provide actionable `refactorNotes` for any `bottleneck`, `high-complexity`, or `planned` node.
3. **Ground Every Node in Real Code (`sourcePaths` & `contracts`)**:
   - Every existing node MUST list **verified relative paths** to real files in the repository under `sourcePaths`.
   - Document `contracts.exposes` and `contracts.consumes` using real exported symbols, API routes, CLI commands, or schemas observed in the code.
4. **Extract C4 Subgraphs (`children`)**:
   - For **1 to 3 complex or composite nodes**, populate `children: { nodes: [...], edges: [...] }` describing the internal sub-modules so users can double-click to drill down into C4 Level-3 component views.
   - Keep child `layerId` values aligned with existing top-level `layers` IDs.

---

### Phase 3: Flow Tracing & Evolution Synthesis (核心业务链路追踪与演进推演)

1. **Map Topology Links (`edges`)**:
   - Connect modules with directed `edges` (`id`, `source`, `target`, `label`, `protocol`, `status`, `bandwidth`).
   - Allowed `protocol` values: `http`, `grpc`, `ws`, `amqp`, `sql`, `redis`, `ipc`, `llm-stream`.
   - Allowed edge `status` values: `active`, `bottleneck`, `planned`.
2. **Trace End-to-End Business Flows (`flows`)**:
   - Construct **2 to 4 representative flows** covering primary synchronous paths (`category: "core"`), background/build pipelines (`category: "async"`), and planned architecture evolution (`category: "evolution"`).
   - Each step (`step: 1..N`) specifies `from`, `to`, matching `edgeId`, concise `action`, realistic JSON/data `payload` string, and optional `latencyMs`.
3. **Synthesize Evolution Diff (`planned` nodes & edges)**:
   - Include at least **1–2 `planned` nodes** and corresponding `planned` edges representing high-value architectural improvements discovered during analysis (e.g., automated schema validator, test harness, edge cache, worker pool), plus an `evolution` flow linking them.

---

## Output Contract Quick Reference (`.archray/graph.json`)

Validate against `.archray/archray.schema.json` (or `schema/archray.schema.json`):

```json
{
  "version": "1.0",
  "meta": {
    "name": "<Project Name>",
    "description": "<1-line system summary>",
    "generatedAt": "<ISO-8601 UTC timestamp>",
    "repoRoot": "<relative or repo identifier>",
    "stats": { "totalFiles": 0, "totalLoc": 0, "healthScore": 85 }
  },
  "layers": [
    { "id": "layer-id", "label": "Layer Name", "order": 0, "color": "#38BDF8", "description": "..." }
  ],
  "nodes": [
    {
      "id": "unique-kebab-id",
      "label": "Display Name",
      "subtitle": "Short Role",
      "layerId": "layer-id",
      "kind": "service",
      "status": "healthy",
      "description": "Clear single-paragraph responsibility summary.",
      "techStack": ["TypeScript", "Node.js"],
      "sourcePaths": ["relative/path/to/file.ts"],
      "metrics": { "complexity": 40, "coupling": 30, "loc": 420 },
      "contracts": { "exposes": ["..."], "consumes": ["..."] },
      "children": { "nodes": [], "edges": [] }
    }
  ],
  "edges": [
    { "id": "e-1", "source": "a", "target": "b", "label": "Invokes", "protocol": "ipc", "status": "active", "bandwidth": "medium" }
  ],
  "flows": [
    {
      "id": "flow-1",
      "name": "Primary Execution Flow",
      "description": "...",
      "category": "core",
      "steps": [
        { "step": 1, "from": "a", "to": "b", "edgeId": "e-1", "action": "...", "payload": "{...}", "latencyMs": 10 }
      ]
    }
  ]
}
```

---

## Build & Verification Steps

After writing `.archray/graph.json`, run the ArchRay CLI to validate and compile the standalone 2.5D interactive viewer:

1. **Validate schema & graph integrity**:
   ```bash
   node cli/bin/archray.mjs validate .archray/graph.json
   ```
   *(Or `npx archray validate .archray/graph.json` when installed as a package.)*

2. **Compile single-file interactive HTML sandbox**:
   ```bash
   node cli/bin/archray.mjs build --input .archray/graph.json --output .archray/index.html
   ```
   *(Pass `--no-open` in headless CI environments.)*

3. **Verify**:
   - Confirm `.archray/graph.json` passes validation with 0 errors.
   - Confirm `.archray/index.html` is generated and opens cleanly in the browser showing all layers, volumetric 2.5D nodes, C4 drill-downs, flow playback, and real mapped source paths.
