/** Assemble the self-contained release bundle and tarball. */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const out = resolve('dist', `archray-${version}`);
const tarball = resolve('dist', `archray-${version}.tgz`);

const required = ['viewer/dist/viewer.html', 'cli/bin/archray.mjs', 'knowledge/tech.json'];
for (const file of required) if (!existsSync(file)) throw new Error(`Missing ${file}; run npm run build first.`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const dir of ['cli/bin', 'schema', 'skill', 'commands', 'knowledge', 'examples']) {
  cpSync(dir, resolve(out, dir), { recursive: true });
}
mkdirSync(resolve(out, 'viewer/dist'), { recursive: true });
copyFileSync('viewer/dist/viewer.html', resolve(out, 'viewer/dist/viewer.html'));
for (const file of ['LICENSE', 'README.md', 'package.json']) copyFileSync(file, resolve(out, file));

writeFileSync(resolve(out, 'install.sh'), `#!/usr/bin/env sh
set -eu
command -v node >/dev/null 2>&1 || { echo "Node 20+ is required"; exit 1; }
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" || { echo "Node 20+ is required"; exit 1; }
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=\${1:-.}
agent=\${2:-claude}
shift 2 2>/dev/null || true

# Vendor the tool into the project so commands keep working after the download is removed.
mkdir -p "$target/.archray/tool"
for dir in cli schema skill commands knowledge viewer; do
  rm -rf "$target/.archray/tool/$dir"
  cp -R "$here/$dir" "$target/.archray/tool/$dir"
done
touch "$target/.archray/.gitignore"
grep -qx 'tool/' "$target/.archray/.gitignore" || printf 'tool/\n' >> "$target/.archray/.gitignore"

node "$here/cli/bin/archray.mjs" init --target "$target" --agent "$agent" --cli ".archray/tool/cli/bin/archray.mjs" "$@"
echo ""
echo "Installed. Open $target in your AI and type /archray"
`, { mode: 0o755 });

rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', 'dist', `archray-${version}`]);
console.log(`Package ready: ${tarball}`);
console.log(`Contents: ${out}`);
