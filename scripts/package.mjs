/** Assemble the self-contained release bundle and tarball. */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
for (const file of ['LICENSE', 'NOTICE', 'README.md', 'README.zh-CN.md', 'package.json']) copyFileSync(file, resolve(out, file));
mkdirSync(resolve(out, 'docs'), { recursive: true });
copyFileSync('docs/host-compatibility.md', resolve(out, 'docs/host-compatibility.md'));
copyFileSync('docs/changelog.md', resolve(out, 'docs/changelog.md'));

writeFileSync(resolve(out, 'install.sh'), `#!/usr/bin/env sh
set -eu
command -v node >/dev/null 2>&1 || { echo "Node 20+ is required"; exit 1; }
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" || { echo "Node 20+ is required"; exit 1; }
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
target=\${1:-.}
agent=\${2:-claude}
if [ "$#" -ge 2 ]; then shift 2; elif [ "$#" -eq 1 ]; then shift; fi
node "$here/cli/bin/archray.mjs" install --target "$target" --agent "$agent" "$@"
`, { mode: 0o755 });
console.log(`Contents: ${out}`);

rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', 'dist', `archray-${version}`]);

const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
writeFileSync(resolve('dist', 'latest.json'), JSON.stringify({
  version,
  tag: `v${version}`,
  asset: `archray-${version}.tgz`,
  sha256,
  minNode: 20,
  notes: `https://github.com/loofare/ArchRay/releases/tag/v${version}`,
}, null, 2) + '\n');

writeFileSync(resolve('dist', 'install.sh'), `#!/usr/bin/env sh
set -eu
VERSION='${version}'
ASSET='archray-${version}.tgz'
SHA='${sha256}'
TARGET=\${1:-.}
AGENT=\${2:-auto}
if [ "$#" -ge 2 ]; then shift 2; elif [ "$#" -eq 1 ]; then shift; fi
command -v node >/dev/null 2>&1 || { echo "Node 20+ is required"; exit 1; }
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" || { echo "Node 20+ is required"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "tar is required"; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM
base=\${ARCHRAY_INSTALL_BASE:-https://github.com/loofare/ArchRay/releases/download/v\${VERSION}}
url="\${base}/\${ASSET}"
curl -fL --connect-timeout 15 --max-time 120 "$url" -o "$tmp/$ASSET"
if command -v shasum >/dev/null 2>&1; then actual=$(shasum -a 256 "$tmp/$ASSET" | awk '{print $1}'); else actual=$(sha256sum "$tmp/$ASSET" | awk '{print $1}'); fi
[ "$actual" = "$SHA" ] || { echo "Checksum mismatch for $ASSET"; exit 1; }
entries=$(tar -tzf "$tmp/$ASSET")
if printf '%s\\n' "$entries" | grep -Eq '(^/|\\\\|(^|/)\\.\\.(/|$))'; then echo "Unsafe archive path in $ASSET"; exit 1; fi
types=$(tar -tvzf "$tmp/$ASSET")
if printf '%s\\n' "$types" | grep -Eq '^[lhbcp]'; then echo "Unsafe archive entry type in $ASSET"; exit 1; fi
tar -xzf "$tmp/$ASSET" -C "$tmp"
node "$tmp/archray-\${VERSION}/cli/bin/archray.mjs" install --target "$TARGET" --agent "$AGENT" --force "$@"
`, { mode: 0o755 });

console.log(`Package ready: ${tarball}`);
console.log(`Manifest: dist/latest.json (${sha256.slice(0, 12)}…)`);
console.log('Bootstrap: dist/install.sh');
