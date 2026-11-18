/** End-to-end update/uninstall regression using a local release server. */
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const oldTar = resolve('dist', `archray-${version}.tgz`);
assert.ok(existsSync(oldTar), 'Run npm run package first');
const next = version.replace(/(\d+)$/, (n) => String(Number(n) + 1));
const work = mkdtempSync(join(tmpdir(), 'archray-update-test-'));
const releases = join(work, 'releases');
mkdirSync(releases, { recursive: true });

// Build a newer-looking package without changing the checkout.
const unpack = join(work, 'unpack');
mkdirSync(unpack);
const tar = spawnSync('tar', ['-xzf', oldTar, '-C', unpack], { encoding: 'utf8' });
assert.equal(tar.status, 0, tar.stderr);
const nextDir = join(releases, `archray-${next}`);
cpSync(join(unpack, `archray-${version}`), nextDir, { recursive: true });
const pkgPath = join(nextDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.version = next;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
await build({
  entryPoints: [resolve('cli/src/main.ts')], outfile: join(nextDir, 'cli/bin/archray.mjs'), bundle: true,
  platform: 'node', format: 'esm', target: 'node20', banner: { js: '#!/usr/bin/env node' },
  define: { __ARCHRAY_VERSION__: JSON.stringify(next) },
});
const nextTar = join(releases, `archray-${next}.tgz`);
const pack = spawnSync('tar', ['-czf', nextTar, '-C', releases, `archray-${next}`], { encoding: 'utf8' });
assert.equal(pack.status, 0, pack.stderr);
const sha = createHash('sha256').update(readFileSync(nextTar)).digest('hex');
const manifest = { version: next, asset: `archray-${next}.tgz`, sha256: sha, minNode: 20 };
writeFileSync(join(releases, 'latest.json'), JSON.stringify(manifest));


const runAsync = (cmd, args, cwd) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd, encoding: 'utf8' });
  let stdout = '', stderr = '';
  child.stdout?.on('data', (d) => { stdout += d; });
  child.stderr?.on('data', (d) => { stderr += d; });
  child.on('close', (status) => resolve({ status, stdout, stderr }));
});
function tarEntry(name, type = '0', data = Buffer.alloc(0), link = '') {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100);
  header.write('0001750\0', 108);
  header.write('0001750\0', 116);
  header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124);
  header.write('00000000000\0', 136);
  header.write('        ', 148);
  header.write(type, 156);
  header.write(link, 157, 100, 'utf8');
  header.write('ustar\0', 257);
  header.write('00', 263);
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
  const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([header, data, padding]);
}
function makeTar(entries) {
  return gzipSync(Buffer.concat([...entries.map((e) => tarEntry(e.name, e.type, e.data, e.link)), Buffer.alloc(1024)]));
}
const malicious = {
  'malicious-link.tgz': makeTar([{ name: `archray-${next}/evil`, type: '2', link: '/tmp/outside' }]),
  'malicious-hardlink.tgz': makeTar([{ name: `archray-${next}/evil`, type: '1', link: '/etc/passwd' }]),
  'malicious-path.tgz': makeTar([{ name: '../escape', type: '0' }]),
};
for (const [name, data] of Object.entries(malicious)) writeFileSync(join(releases, name), data);

const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0].replace(/^\//, '');
  if (name === 'redirect-external') {
    res.writeHead(302, { location: 'http://example.com/latest.json' }).end();
    return;
  }
  if (!['latest.json', `archray-${next}.tgz`, ...Object.keys(malicious)].includes(name)) { res.writeHead(404).end(); return; }
  const data = readFileSync(join(releases, name));
  res.writeHead(200, { 'content-length': data.length, 'content-type': name.endsWith('.json') ? 'application/json' : 'application/octet-stream' });
  res.end(data);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
server.unref();
const port = (server.address()).port;
const base = `http://127.0.0.1:${port}`;

const project = join(work, 'project');
mkdirSync(project);
const install = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', project, '--agent', 'claude'], { encoding: 'utf8' });
assert.equal(install.status, 0, install.stderr);
const wrapper = join(project, '.archray/archray');
assert.ok(existsSync(wrapper), 'install writes the short wrapper');
assert.ok(existsSync(join(project, '.archray/install.json')), 'install writes the install manifest');
const graph = { schemaVersion: '2.0', meta: { name: 'Update fixture', locales: ['en'], generatedAt: '2026-11-18T00:00:00Z' }, nodes: [{ id: 'api', name: 'API', kind: 'service' }] };
writeFileSync(join(project, '.archray/graph.json'), JSON.stringify(graph));
writeFileSync(join(project, '.archray/view.json'), 'VIEW SENTINEL\n');
writeFileSync(join(project, '.archray/index.html'), 'HTML SENTINEL\n');
const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const before = hash(join(project, '.archray/graph.json'));
const viewBefore = hash(join(project, '.archray/view.json'));
const htmlBefore = hash(join(project, '.archray/index.html'));

const insecure = await runAsync(wrapper, ['update', '--check', '--manifest', 'http://example.com/latest.json'], project);
assert.notEqual(insecure.status, 0, 'non-local plain HTTP manifest is refused');
assert.match(insecure.stderr, /plain HTTP/, 'plain HTTP refusal is explicit');

const redirectInsecure = await runAsync(wrapper, ['update', '--check', '--manifest', `${base}/redirect-external`], project);
assert.notEqual(redirectInsecure.status, 0, 'redirect to non-local plain HTTP is refused');
assert.match(redirectInsecure.stderr, /plain HTTP/, 'redirect plain HTTP refusal is explicit');

const check = await runAsync(wrapper, ['update', '--check', '--manifest', `${base}/latest.json`], project);
assert.equal(check.status, 0, check.stderr);
assert.match(check.stdout, new RegExp(`v${version} → v${next}`), 'check reports the available version');

const update = await runAsync(wrapper, ['update', '--manifest', `${base}/latest.json`], project);
assert.equal(update.status, 0, `${update.stderr}\n${update.stdout}`);
assert.match(update.stdout, new RegExp(`v${version} → v${next}`), 'update reports old and new versions');
assert.equal(JSON.parse(readFileSync(join(project, '.archray/install.json'), 'utf8')).version, next, 'manifest records the new version');
assert.equal(hash(join(project, '.archray/graph.json')), before, 'graph survives update');
assert.equal(hash(join(project, '.archray/view.json')), viewBefore, 'view survives update');
assert.equal(hash(join(project, '.archray/index.html')), htmlBefore, 'HTML survives update');
assert.equal(spawnSync(join(project, '.archray/archray'), ['version'], { encoding: 'utf8' }).stdout.trim(), `archray ${next}`, 'wrapper reports the real new version');
const up = await runAsync(wrapper, ['update', '--check', '--manifest', `${base}/latest.json`], project);
assert.equal(up.status, 0, up.stderr);
assert.match(up.stdout, /up to date/, 'second check sees the installed version');

const badVersion = next.replace(/(\d+)$/, (n) => String(Number(n) + 1));
const bad = { ...manifest, version: badVersion, sha256: '0'.repeat(64) };
writeFileSync(join(releases, 'latest.json'), JSON.stringify(bad));
const refused = await runAsync(wrapper, ['update', '--manifest', `${base}/latest.json`], project);
assert.notEqual(refused.status, 0, 'checksum mismatch is refused');
assert.match(refused.stderr, /Checksum mismatch/, 'checksum error is explicit');
assert.equal(hash(join(project, '.archray/graph.json')), before, 'failed update leaves graph untouched');

for (const asset of Object.keys(malicious)) {
  const badTarManifest = { ...manifest, version: badVersion, asset, sha256: createHash('sha256').update(malicious[asset]).digest('hex') };
  writeFileSync(join(releases, 'latest.json'), JSON.stringify(badTarManifest));
  const beforeTool = hash(join(project, '.archray/tool/cli/bin/archray.mjs'));
  const archiveResult = await runAsync(wrapper, ['update', '--manifest', `${base}/latest.json`], project);
  assert.notEqual(archiveResult.status, 0, `${asset} is refused`);
  assert.match(archiveResult.stderr, /Unsafe archive/, `${asset} reports an unsafe archive`);
  assert.equal(hash(join(project, '.archray/tool/cli/bin/archray.mjs')), beforeTool, `${asset} leaves the old tool intact`);
  assert.equal(hash(join(project, '.archray/graph.json')), before, `${asset} leaves the graph intact`);
}

const notInstalled = await runAsync(wrapper, ['uninstall', '--agent', 'cursor'], project);
assert.equal(notInstalled.status, 0, notInstalled.stderr);
assert.match(notInstalled.stdout, /Host not installed: cursor/, 'uninstall reports when requested host is not installed');

mkdirSync(join(project, '.cursor/commands'), { recursive: true });
const dry = await runAsync(wrapper, ['uninstall', '--dry-run'], project);
assert.equal(dry.status, 0, dry.stderr);
assert.match(dry.stdout, /would keep \.archray\/graph\.json/, 'uninstall dry-run states what is kept');
const un = await runAsync(wrapper, ['uninstall'], project);
assert.equal(un.status, 0, un.stderr);
assert.ok(existsSync(join(project, '.archray/graph.json')), 'uninstall keeps graph by default');
assert.ok(!existsSync(join(project, '.archray/tool')), 'uninstall removes the tool');
assert.ok(!existsSync(join(project, '.claude/commands/archray.md')), 'uninstall removes host commands');
assert.ok(!existsSync(join(project, '.claude')), 'uninstall removes empty host directories including skills/archray');
assert.ok(existsSync(join(project, '.cursor/commands')), 'uninstall does not delete unrelated empty host directories');

const install2 = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', project, '--agent', 'all'], { encoding: 'utf8' });
assert.equal(install2.status, 0, install2.stderr);
const purge = await runAsync(join(project, '.archray/archray'), ['uninstall', '--purge'], project);
assert.equal(purge.status, 0, purge.stderr);
assert.ok(!existsSync(join(project, '.archray')), '--purge removes .archray');

// Old Pi+Codex layout without a manifest is conservatively detected as both hosts.
const oldLayout = join(work, 'old-layout');
mkdirSync(join(oldLayout, '.pi/prompts'), { recursive: true });
mkdirSync(join(oldLayout, '.agents/skills/archray'), { recursive: true });
writeFileSync(join(oldLayout, '.pi/prompts/archray.md'), 'legacy pi prompt\n');
writeFileSync(join(oldLayout, '.agents/skills/archray/SKILL.md'), 'legacy shared skill\n');
const oldInstall = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', oldLayout, '--agent', 'auto', '--force'], { encoding: 'utf8' });
assert.equal(oldInstall.status, 0, oldInstall.stderr);
assert.deepEqual(JSON.parse(readFileSync(join(oldLayout, '.archray/install.json'), 'utf8')).agents.sort(), ['codex', 'pi'], 'old shared layout keeps both hosts');

// Install must not follow a symlinked manifest into user data.
const guard = join(work, 'guard');
mkdirSync(guard);
let r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', guard, '--agent', 'claude'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
writeFileSync(join(guard, '.archray/graph.json'), 'GRAPH SENTINEL\n');
rmSync(join(guard, '.archray/install.json'));
spawnSync('ln', ['-s', 'graph.json', join(guard, '.archray/install.json')]);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', guard, '--agent', 'claude', '--force'], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'symlinked install manifest is refused');
assert.equal(readFileSync(join(guard, '.archray/graph.json'), 'utf8'), 'GRAPH SENTINEL\n', 'install does not overwrite graph through a link');

// A hardlinked ignore file is also user data, not an alias target.
const guardIgnore = join(work, 'guard-ignore');
mkdirSync(guardIgnore);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', guardIgnore, '--agent', 'claude'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
writeFileSync(join(guardIgnore, '.archray/graph.json'), 'GRAPH SENTINEL\n');
rmSync(join(guardIgnore, '.archray/.gitignore'));
spawnSync('ln', [join(guardIgnore, '.archray/graph.json'), join(guardIgnore, '.archray/.gitignore')]);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', guardIgnore, '--agent', 'claude', '--force'], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'hardlinked ignore file is refused');
assert.equal(readFileSync(join(guardIgnore, '.archray/graph.json'), 'utf8'), 'GRAPH SENTINEL\n', 'ignore alias does not touch graph');

// Uninstall must preflight its manifest write too, not follow it into the graph.
const partialGuard = join(work, 'partial-guard');
mkdirSync(partialGuard);
for (const a of ['pi', 'codex']) {
  r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', partialGuard, '--agent', a, '--force'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}
writeFileSync(join(partialGuard, '.archray/graph.json'), JSON.stringify(graph));
rmSync(join(partialGuard, '.archray/install.json'));
spawnSync('ln', ['-s', 'graph.json', join(partialGuard, '.archray/install.json')]);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'uninstall', '--target', partialGuard, '--agent', 'codex'], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'partial uninstall refuses a linked manifest');
assert.equal(JSON.parse(readFileSync(join(partialGuard, '.archray/graph.json'), 'utf8')).meta.name, 'Update fixture', 'linked manifest does not overwrite graph');

// Uninstall must not follow a project-level .archray link.
const a = join(work, 'uninstall-a'), b = join(work, 'uninstall-b');
mkdirSync(a); mkdirSync(b);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', a, '--agent', 'pi'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
spawnSync('ln', ['-s', join(a, '.archray'), join(b, '.archray')]);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'uninstall', '--target', b], { encoding: 'utf8' });
assert.notEqual(r.status, 0, 'symlinked .archray is refused by uninstall');
assert.ok(existsSync(join(a, '.archray/tool/cli/bin/archray.mjs')), 'outside tool survives refused uninstall');

// Only exact generated files are removed; a user file with the archray prefix remains.
const personal = join(work, 'personal');
mkdirSync(personal);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', personal, '--agent', 'pi'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
writeFileSync(join(personal, '.pi/prompts/archray-personal-notes.md'), 'USER NOTE\n');
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'uninstall', '--target', personal], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
assert.equal(readFileSync(join(personal, '.pi/prompts/archray-personal-notes.md'), 'utf8'), 'USER NOTE\n', 'user file is not removed by prefix');
assert.ok(!existsSync(join(personal, '.pi/prompts/archray.md')), 'generated prompt is removed');

// Adding a host keeps existing hosts; removing one keeps the shared tool/skill.
const multi = join(work, 'multi');
mkdirSync(multi);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', multi, '--agent', 'claude'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', multi, '--agent', 'pi', '--force'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
assert.deepEqual(JSON.parse(readFileSync(join(multi, '.archray/install.json'), 'utf8')).agents.sort(), ['claude', 'pi']);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'install', '--target', multi, '--agent', 'codex', '--force'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
r = spawnSync(process.execPath, [resolve('cli/bin/archray.mjs'), 'uninstall', '--target', multi, '--agent', 'codex'], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
assert.ok(existsSync(join(multi, '.archray/tool/cli/bin/archray.mjs')), 'tool remains while another host is installed');
assert.ok(existsSync(join(multi, '.pi/prompts/archray.md')), 'pi prompt remains');
assert.ok(existsSync(join(multi, '.agents/skills/archray/SKILL.md')), 'shared skill remains');
assert.match(readFileSync(join(multi, '.archray/.gitignore'), 'utf8'), /^tool\/$/m, 'partial uninstall keeps the tool ignore rule');
assert.deepEqual(JSON.parse(readFileSync(join(multi, '.archray/install.json'), 'utf8')).agents.sort(), ['claude', 'pi']);

server.close();
console.log('Update regression passed');
