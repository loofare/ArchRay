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
for (const file of ['LICENSE', 'README.md', 'README.en.md', 'package.json']) copyFileSync(file, resolve(out, file));
mkdirSync(resolve(out, 'docs'), { recursive: true });
copyFileSync('docs/host-compatibility.md', resolve(out, 'docs/host-compatibility.md'));

writeFileSync(resolve(out, 'install.sh'), `#!/usr/bin/env sh
set -eu
command -v node >/dev/null 2>&1 || { echo "Node 20+ is required"; exit 1; }
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" || { echo "Node 20+ is required"; exit 1; }
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=\${1:-.}
agent=\${2:-claude}
shift 2 2>/dev/null || true
node "$here/cli/bin/archray.mjs" install --target "$target" --agent "$agent" "$@"
`, { mode: 0o755 });
console.log(`Contents: ${out}`);

rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', 'dist', `archray-${version}`]);
console.log(`Package ready: ${tarball}`);
