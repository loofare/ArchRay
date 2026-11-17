---
description: Build an interactive layered architecture view of this repository
argument-hint: "[layers: frontend,data | all]"
---
Read `.archray/SKILL.md` first.

1. Reuse `.archray/graph.json` when it exists. Only inspect source again when the graph is missing or the user asks for a refresh.
2. Validate and build:

```sh
node "__ARCHRAY_CLI__" validate .archray/graph.json
node "__ARCHRAY_CLI__" build .archray/graph.json --layers "$ARGUMENTS" --no-open
```

Omit `--layers` when `$ARGUMENTS` is empty or `all`. If `$ARGUMENTS` is empty because this host does not fill it, use the user's text after the command.

Add `--style tech|blueprint|glass|paper`, `--motion full|calm|off` and `--lang <locale>` when the user asks for a look, motion level or language.

3. Reply with the absolute `.archray/index.html` path, the selected layers, and any warning about layers not present in the graph. Say that dimmed modules are cross-layer context.
