/** Extract the release tarball and run install → doctor → build without the source tree. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  const project = join(work, 'project');
  mkdirSync(project);

  run('sh', [join(pkg, 'install.sh'), project, 'claude']);
  assert.ok(existsSync(join(project, '.archray/tech.json')), 'install copies the knowledge base');
  assert.ok(existsSync(join(project, '.claude/commands/archray.md')), 'install writes slash commands');
  assert.ok(existsSync(join(project, '.claude/skills/archray/SKILL.md')), 'install writes the skill');

  const cli = join(pkg, 'cli/bin/archray.mjs');
  const versionOut = run(process.execPath, [cli, 'version']).stdout.trim();
  assert.match(versionOut, new RegExp(`^archray ${version.replace(/\./g, '\\.')}$`));
  run(process.execPath, [cli, 'doctor']);
  assert.ok(!existsSync(join(pkg, 'node_modules')), 'package has no node_modules');

  const graph = {
    schemaVersion: '2.0',
    meta: { name: 'Package check', locales: ['en'], generatedAt: '2026-11-17T00:00:00Z' },
    layers: [{ id: 'service', name: 'Service', order: 0 }],
    nodes: [{ id: 'api', name: 'API', kind: 'service', layer: 'service' }],
    edges: [],
  };
  writeFileSync(join(project, '.archray/graph.json'), JSON.stringify(graph));
  run(process.execPath, [cli, 'build', join(project, '.archray/graph.json'), '--output', join(project, '.archray/index.html'), '--no-open'], project);
  const html = readFileSync(join(project, '.archray/index.html'), 'utf8');
  assert.ok(html.includes('window.__ARCHRAY_DATA__'), 'package build embeds graph data');
  assert.ok(!html.includes('window.__ARCHRAY_VIEW__={'), 'no view is embedded unless requested');
  console.log('Package check passed:', tarball);
} finally {
  rmSync(work, { recursive: true, force: true });
}
