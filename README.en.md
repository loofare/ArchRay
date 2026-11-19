🌐 [简体中文 README](./README.md) | **English** | [Website · archray.dev](https://archray.dev) | [Live 3D Sandbox](https://archray.dev/demo)

# ArchRay

**Equip your AI coding agent to read real source code and build interactive 3D Spatial & 2D Bento architecture maps.**

Turn tangled guessed box diagrams into verified engineering views. Install ArchRay into any repository once, type `/archray` in your coding agent, and generate a **100% offline, single-file interactive HTML** (`.archray/index.html`) backed by real `file:line` citations.

- **True 3D Spatial Atrium + 2D Bento Map**: VisionOS-style floating HUD, deterministic ELK port routing, and 4-quadrant separation across clients, core service towers, async/AI wings, and external SaaS orbits.
- **Evidence-Backed & Honest**: Every node and edge cites repository `sourcePaths`; measured metrics are cleanly separated from `≈` static estimates—never fake live APM.
- **Health Hotspots & Replaceability**: Surface coupling bottlenecks and lock-in risk, compare drop-in/managed upgrades, and copy ready-to-run AI migration prompts.
- **Zero-Network Single-File Delivery**: Embeds 167 vector tech logos, unclipped full-canvas PNG export, and offline QR share posters.

---

## 1. 30-Second Install & First Run

> Requires Node.js 20+, `curl`, and `tar` (on Windows, run the installer inside Git Bash or WSL; it emits `.archray\archray.cmd`).

### One-Line Install from Project Root

```sh
curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh | sh -s -- . claude
```

Replace `claude` with your AI host (comma-separated lists like `claude,cursor` or `all` are supported):

| AI Host | Argument | Session Entry | Host Files Written |
|---|---|---|---|
| **Claude Code** | `claude` | `/archray`, `/archray:frontend`, … | `.claude/skills/archray/`, `.claude/commands/` |
| **Cursor** | `cursor` | `/archray`, `/archray-frontend`, … | `.cursor/rules/archray.mdc`, `.cursor/commands/` |
| **Antigravity** | `antigravity` | `/archray` or Skill trigger | `.agent/skills/archray/`, `.agent/commands/` |
| **Pi** | `pi` | `/archray`, `/archray-frontend`, `/skill:archray` | `.agents/skills/archray/`, `.pi/prompts/` |
| **Codex** | `codex` | `$archray` or `/skills` | `.agents/skills/archray/SKILL.md` |

Or paste this instruction into your AI coding assistant:

```text
Download https://github.com/loofare/ArchRay/releases/latest/download/install.sh to a temporary file, verify it succeeded, and run `sh <temp-file> . claude` from this repo root (replace claude with your host).
```

### Generate Your First Map

1. Open a fresh AI coding session in the repository.
2. Run `/archray` (`$archray` on Codex), or simply ask: **“Use archray to inspect source code and build a 3D map”**.
3. Open `.archray/index.html` directly in any browser.

---

## 2. Usage in Your AI Agent (All Layers, Single Slice, or Combos)

Analyse source once into `.archray/graph.json`, then slice freely across any layer combination (one-hop neighbors stay dimmed for context):

| Goal | Slash Command / Args | What It Shows |
|---|---|---|
| **View All (Default)** | `/archray` or `/archray:full` | All 10 architectural layers (`L0–L9`) |
| **Frontend** | `/archray:frontend` or `/archray frontend` | Client apps & UI surfaces |
| **Backend + Async** | `/archray:backend` or `/archray backend` | Core domain services + queues/workers |
| **Data & Storage** | `/archray:data` or `/archray data` | Databases, caches, search & object stores |
| **Network & Edge** | `/archray:network` or `/archray network` | CDN, WAF, ingress & API gateways |
| **Security & Auth** | `/archray:security` or `/archray security` | Gateways, OAuth/OIDC & policy enforcement |
| **Cross-Layer Combos** | `/archray frontend,backend`<br>`/archray backend,data`<br>`/archray ai,async,data` | Combine any layers with commas (EN & ZH aliases work) |
| **Style & Language** | `--style blueprint --lang en` | Themes: `tech` / `blueprint` / `glass` / `paper` |
| **Update / Uninstall** | `/archray update` / `/archray uninstall` | Safely keeps `graph.json`, `view.json`, and HTML |

**All 10 Supported Canonical Layers**: `client`, `edge`, `gateway`, `service`, `async`, `data`, `ai`, `external`, `platform`, `observability` (Chinese aliases like `前端`, `后端`, `数据` also work).

---

## 3. CLI & Maintenance (From Repo Root)

Self-contained wrapper inside `.archray/` with zero global pollution (`.archray\archray.cmd` on Windows):

```sh
./.archray/archray doctor                                      # Check packaged files & Node version
./.archray/archray validate .archray/graph.json                # Validate schema & locale coverage
./.archray/archray build .archray/graph.json --force --no-open # Rebuild single-file HTML
./.archray/archray build .archray/graph.json --layers frontend,data --style blueprint --force
```

**Upgrade & Uninstall:**

```sh
./.archray/archray update --check   # Check latest release without modifying files
./.archray/archray update           # Verify SHA-256 & update (keeps graph/view/HTML)

./.archray/archray uninstall --dry-run  # Preview files to be removed
./.archray/archray uninstall            # Remove tool & host commands (keeps graph/view/HTML)
./.archray/archray uninstall --purge    # Remove the entire .archray/ directory
```

<details>
<summary>One-time upgrade from v0.4.0 or earlier</summary>

```sh
curl -fsSL https://github.com/loofare/ArchRay/releases/latest/download/install.sh | sh -s -- . auto --force
```

</details>

---

## 4. Privacy & Boundaries

- **100% Local & Zero Upload**: ArchRay CLI and generated HTML views run completely offline; source code and graphs are never sent to external servers (analysis happens only inside your authorized coding-agent session).
- **Honest Boundaries**: Not a SaaS scanner or live APM agent; `sourcePaths`, health findings, and alternatives are static review claims to verify against code.
- See [Host Compatibility](docs/host-compatibility.md), [Changelog](docs/changelog.md), and [NOTICE](NOTICE). Released under the [MIT License](LICENSE).
