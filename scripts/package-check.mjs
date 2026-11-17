/** Extract the release tarball, install it, and prove the project works without the download. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tarball = resolve('dist', `archray-${version}.tgz`);
assert.ok(existsSync(tarball), `Run npm run package first (missing ${tarball})`);

const work = mkdtempSync(join(tmpdir(), 'archray-package-'));
const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${cmd} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  return result;
};

try {
  run('tar', ['-xzf', tarball, '-C', work]);
  const pkg = join(work, `archray-${version}`);
  const movedPkg = `${pkg}.moved`;
  const project = join(work, 'project');
  mkdirSync(project);

  run('sh', [join(pkg, 'install.sh'), project, 'claude']);
  assert.ok(existsSync(join(project, '.archray/tool/cli/bin/archray.mjs')), 'install vendors the CLI');
  assert.ok(existsSync(join(project, '.archray/tech.json')), 'install copies the knowledge base');
  assert.ok(existsSync(join(project, '.claude/commands/archray.md')), 'install writes slash commands');
  assert.ok(existsSync(join(project, '.claude/skills/archray/SKILL.md')), 'install writes the skill');
  assert.match(readFileSync(join(project, '.archray/.gitignore'), 'utf8'), /^tool\/$/m, 'vendored tool is git-ignored');

  const command = readFileSync(join(project, '.claude/commands/archray.md'), 'utf8');
  assert.ok(command.includes('.archray/tool/cli/bin/archray.mjs'), 'commands use the vendored relative path');
  assert.ok(!command.includes(pkg), 'commands do not point at the download directory');

  const cli = join(project, '.archray/tool/cli/bin/archray.mjs');
  const versionOut = run(process.execPath, [cli, 'version'], project).stdout.trim();
  assert.match(versionOut, new RegExp(`^archray ${version.replace(/\./g, '\\.')}$`));
  run(process.execPath, [cli, 'doctor'], project);

  // doctor must fail when an install file is missing, not just when a directory is missing.
  const mainCommand = join(project, '.archray/tool/commands/archray.md');
  renameSync(mainCommand, `${mainCommand}.bak`);
  const broken = spawnSync(process.execPath, [cli, 'doctor'], { cwd: project, encoding: 'utf8' });
  renameSync(`${mainCommand}.bak`, mainCommand);
  assert.notEqual(broken.status, 0, 'doctor fails when a command file is missing');
  assert.match(broken.stdout, /MISS command commands\/archray\.md/, 'doctor names the missing command');
  run(process.execPath, [cli, 'doctor'], project);

  const graph = {
    schemaVersion: '2.0',
    meta: { name: 'Package check', locales: ['en'], generatedAt: '2026-11-17T00:00:00Z' },
    layers: [{ id: 'service', name: 'Service', order: 0 }],
    nodes: [{ id: 'api', name: 'API', kind: 'service', layer: 'service' }],
    edges: [],
  };
  writeFileSync(join(project, '.archray/graph.json'), JSON.stringify(graph));
  run(process.execPath, [cli, 'build', join(project, '.archray/graph.json'), '--output', join(project, '.archray/index.html'), '--force', '--no-open'], project);

  // The extracted download is no longer needed once the project is installed.
  renameSync(pkg, movedPkg);
  try {
    run(process.execPath, [cli, 'version'], project);
    run(process.execPath, [cli, 'doctor'], project);
    run(process.execPath, [cli, 'build', join(project, '.archray/graph.json'), '--output', join(project, '.archray/index.html'), '--force', '--no-open'], project);
  } finally {
    renameSync(movedPkg, pkg);
  }

  const html = readFileSync(join(project, '.archray/index.html'), 'utf8');
  assert.ok(html.includes('window.__ARCHRAY_DATA__'), 'vendored build embeds graph data');
  assert.ok(!html.includes('window.__ARCHRAY_VIEW__={'), 'no view is embedded unless requested');
  console.log('Package check passed:', tarball);
} finally {
  rmSync(work, { recursive: true, force: true });
}
