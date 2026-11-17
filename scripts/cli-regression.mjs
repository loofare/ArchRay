/**
 * End-to-end CLI regression: real processes, real files, temp directory.
 * Covers init preflight, output protection, atomic refusal, embedded data fidelity
 * and the v2 Skill metadata that agents rely on.
 */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const workdir = mkdtempSync(join(tmpdir(), 'archray-cli-'));
const cli = resolve('cli/bin/archray.mjs');
const run = (args, { ok = true, env } = {}) => {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: workdir, encoding: 'utf8', env: { ...process.env, ...env } });
  const label = `archray ${args.join(' ')}`;
  assert.equal(result.status, ok ? 0 : 1, `${label}\n${result.stderr}`);
  return result;
};
const read = (path) => readFileSync(join(workdir, path), 'utf8');
const json = (path) => JSON.parse(read(path));

/* ---------------------------------------------------------------- init */
run(['init']);
assert.deepEqual(readdirSync(workdir), ['.archray'], 'init writes only .archray by default');
const skill = read('.archray/SKILL.md');
assert.match(skill, /^---\nname: archray\ndescription: .+\n---/, 'the installed Skill keeps agent-readable frontmatter');

const duplicate = run(['init'], { ok: false });
assert.match(duplicate.stderr, /already exists[\s\S]*--force/, 'repeat init explains how to overwrite');
assert.equal(read('.archray/SKILL.md'), skill, 'a refused init leaves existing templates untouched');

/* --------------------------------------------------- build and escaping */
const graph = JSON.parse(readFileSync('examples/freshmart.graph.json', 'utf8'));
graph.meta.name = "literal $& $` $' </script><script>globalThis.INJECTED=true</script>";
writeFileSync(join(workdir, 'graph.json'), JSON.stringify(graph));

run(['validate', 'graph.json']);
run(['build', 'graph.json', '--no-open']);
const html = read('.archray/index.html');
assert.ok(html.includes('literal $&amp; $`'), 'title keeps dollar literals and escapes markup');
assert.ok(!html.includes('<script>globalThis.INJECTED'), 'title markup is escaped');
const embedded = html.match(/window\.__ARCHRAY_DATA__=(.*?);<\/script>/);
assert.ok(embedded, 'graph data is embedded for offline use');
assert.deepEqual(JSON.parse(embedded[1]), graph, 'embedded graph survives JSON round-trip');

/* ---------------------------------------------------- output protection */
const refuseExisting = run(['build', 'graph.json', '--no-open'], { ok: false });
assert.match(refuseExisting.stderr, /already exists[\s\S]*--force/);
assert.equal(read('.archray/index.html').length > 0, true, 'refused rebuild leaves the earlier artifact in place');

const samePath = run(['build', 'graph.json', '--output', 'graph.json', '--force', '--no-open'], { ok: false });
assert.match(samePath.stderr, /over its input/);
assert.deepEqual(JSON.parse(read('graph.json')), graph, 'input survives a refused self-overwrite');

writeFileSync(join(workdir, 'other.json'), '{}');
symlinkSync(join(workdir, 'other.json'), join(workdir, 'out.html'));
const symlinkOut = run(['build', 'graph.json', '--output', 'out.html', '--force', '--no-open'], { ok: false });
assert.match(symlinkOut.stderr, /symbolic link/);
assert.equal(read('other.json'), '{}', 'a symlinked output target is not touched');

run(['build', 'graph.json', '--force', '--no-open']);

// An unwritable directory fails the atomic commit without leaving a partial or empty output.
const readonly = join(workdir, 'readonly');
mkdirSync(readonly);
chmodSync(readonly, 0o500);
const denied = run(['build', 'graph.json', '--output', 'readonly/index.html', '--force', '--no-open'], { ok: false });
chmodSync(readonly, 0o700);
assert.match(denied.stderr, /EACCES|permission denied/i);
assert.deepEqual(readdirSync(readonly), [], 'failed mid-write leaves no partial file');

/* ------------------------------------------------------- new-user errors */
const missing = run(['validate', 'missing.json'], { ok: false });
assert.match(missing.stderr, /file not found[\s\S]*archray init/, 'missing input suggests the first step');
const unknown = run(['nope'], { ok: false });
assert.match(unknown.stderr, /Unknown command: nope[\s\S]*archray help/);
const noFile = run(['migrate'], { ok: false });
assert.match(noFile.stderr, /needs a v1 graph file/);

/* -------------------------------------------------------- schema output */
const schema = run(['schema', 'view']);
assert.match(schema.stdout, /ArchRay View State/);

console.log('CLI regression passed:', workdir);
