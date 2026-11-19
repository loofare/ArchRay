---
description: Build an interactive layered architecture view of this repository
argument-hint: "[layers: frontend,data | all | update [--check] | uninstall]"
---
Read `.archray/SKILL.md` first.

0. Resolve the user's intent first. Use `$ARGUMENTS`; if it is empty, use the user's text after the command when the host provides it.
   - If the intent is `update --check` or an explicit check-only request, run `node "__ARCHRAY_CLI__" update --check`, report current vs available version and that nothing was applied, then stop. Do not run `update` and do not continue to validate/build/analysis.
   - If the intent is `update`, run `node "__ARCHRAY_CLI__" update`, report the old/new version and whether graph/view/HTML were kept, then stop. Do not continue to validate/build/analysis.
   - If the update check or update fails, report the error and stop; do not fall back to analysis or building.
   - Only an explicit update authorizes `update`; a check-only request never does.
   - If the intent is `uninstall`, run `node "__ARCHRAY_CLI__" uninstall --dry-run`, show the removal scope, and stop. Wait for explicit confirmation before running the real uninstall; never use `--purge` without explicit user authorization.

1. Reuse `.archray/graph.json` when it exists. Only inspect source again when the graph is missing or the user asks for a refresh. When writing `.archray/graph.json`, always save it as **UTF-8 without BOM** (using a native file-write tool or Node UTF-8 write; never pipe CJK text through Windows PowerShell `Set-Content`/`Out-File`).
2. Validate and build (if `validate` reports any encoding corruption such as `?` placeholders or `\uFFFD`, rewrite `.archray/graph.json` cleanly in UTF-8 first):

```sh
node "__ARCHRAY_CLI__" validate .archray/graph.json
node "__ARCHRAY_CLI__" build .archray/graph.json --layers "<layers>" --force --no-open
```

Fill `<layers>` from `$ARGUMENTS` (or the user's text after the command when `$ARGUMENTS` is empty); omit `--layers` when empty or `all`. If the CLI reports an unknown layer, drop it from the list or omit `--layers`.

Add `--style tech|blueprint|glass|paper`, `--motion full|calm|off` and `--lang <locale>` when the user asks for a look, motion level or language.

3. Reply with the absolute `.archray/index.html` path, the selected layers, and any warning about layers not present in the graph. Say that dimmed modules are cross-layer context.
