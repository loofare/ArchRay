---
description: Frontend and client only (with cross-layer context)
---
Read `.archray/SKILL.md` first. Reuse `.archray/graph.json` unless it is missing or the user asks to refresh.

```sh
node "__ARCHRAY_CLI__" validate .archray/graph.json
node "__ARCHRAY_CLI__" build .archray/graph.json --layers client --no-open
```

If the CLI reports `Unknown layer`, remove the missing layer(s) from `--layers` and rebuild with the remaining ones; if none remain, rebuild without `--layers`. Say which layer was not present.

Report the absolute `.archray/index.html` path. Dimmed modules are cross-layer context; do not invent modules.
