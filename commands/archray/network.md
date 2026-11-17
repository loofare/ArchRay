---
description: Network, delivery and gateway (with cross-layer context)
---
Read `.archray/SKILL.md` first. Reuse `.archray/graph.json` unless it is missing or the user asks to refresh.

```sh
node "__ARCHRAY_CLI__" validate .archray/graph.json
node "__ARCHRAY_CLI__" build .archray/graph.json --layers edge,gateway --no-open
```

Report the absolute `.archray/index.html` path. Dimmed modules are cross-layer context; do not invent modules.
