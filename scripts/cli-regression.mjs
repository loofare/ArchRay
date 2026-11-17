/**
 * End-to-end CLI regression: real processes, real files, temp directory.
 * Covers init preflight, output protection, atomic refusal, embedded data fidelity
 * and the v2 Skill metadata that agents rely on.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
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
assert.ok(existsSync(join(workdir, '.archray/tech.json')), 'init writes the technology knowledge base');
const version = run(['version']).stdout.trim();
assert.match(version, /^archray \d+\.\d+\.\d+$/, 'version prints the packaged version');
const skill = read('.archray/SKILL.md');
assert.ok(!skill.includes('__ARCHRAY_CLI__'), 'installed skill resolves the CLI path');
assert.match(skill, /^---\nname: archray\ndescription: .+\n---/, 'the installed Skill keeps agent-readable frontmatter');

const piDir = join(workdir, 'pi-agent');
mkdirSync(piDir);
run(['init', '--target', piDir, '--agent', 'pi']);
assert.ok(existsSync(join(piDir, '.agents/skills/archray/SKILL.md')), 'pi init writes the Agent Skill');
assert.ok(existsSync(join(piDir, '.pi/prompts/archray.md')), 'pi init writes /archray');
assert.ok(existsSync(join(piDir, '.pi/prompts/archray-frontend.md')), 'pi init writes /archray-frontend');
assert.match(readFileSync(join(piDir, '.pi/prompts/archray.md'), 'utf8'), /\$ARGUMENTS/, 'pi prompt keeps argument substitution');

const allDir = join(workdir, 'all-agents');
mkdirSync(allDir);
run(['init', '--target', allDir, '--agent', 'all']);
for (const file of [
  '.claude/commands/archray.md', '.cursor/commands/archray-frontend.md',
  '.agent/commands/archray-backend.md', '.agents/skills/archray/SKILL.md',
  '.pi/prompts/archray.md', '.pi/prompts/archray-data.md',
]) assert.ok(existsSync(join(allDir, file)), `all agents install ${file}`);

const agentDir = join(workdir, 'agent');
mkdirSync(agentDir);
run(['init', '--target', agentDir, '--agent', 'claude']);
assert.ok(existsSync(join(agentDir, '.claude/commands/archray.md')), 'agent init installs /archray');
assert.ok(existsSync(join(agentDir, '.claude/commands/archray/frontend.md')), 'agent init installs /archray:frontend');
const command = readFileSync(join(agentDir, '.claude/commands/archray.md'), 'utf8');
assert.ok(!command.includes('__ARCHRAY_CLI__'), 'command templates resolve the CLI path');
assert.ok(command.includes(cli.replaceAll('\\', '/')) || command.includes(cli), 'commands call this checkout');
assert.match(readFileSync(join(agentDir, '.claude/commands/archray/frontend.md'), 'utf8'), /remove the missing layer/, 'preset explains partial layer fallback');

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

// Layer focus is a view, not a new analysis.
run(['build', 'graph.json', '--layers', '前端,数据', '--force', '--no-open']);
const focused = read('.archray/index.html').match(/window\.__ARCHRAY_VIEW__=(.*?);<\/script>/);
assert.ok(focused, 'layer build embeds a view');
assert.deepEqual(JSON.parse(focused[1]).layers, ['client', 'data']);
const badLayer = run(['build', 'graph.json', '--layers', 'nope', '--force', '--no-open'], { ok: false });
assert.match(badLayer.stderr, /Unknown layer: nope[\s\S]*This graph has/);

run(['build', 'graph.json', '--style', 'blueprint', '--lang', 'en', '--force', '--no-open']);
const styled = JSON.parse(read('.archray/index.html').match(/window\.__ARCHRAY_VIEW__=(.*?);<\/script>/)[1]);
assert.equal(styled.theme, 'blueprint');
assert.equal(styled.locale, 'en');
const badStyle = run(['build', 'graph.json', '--style', 'nope', '--force', '--no-open'], { ok: false });
assert.match(badStyle.stderr, /Unknown style: nope/);
run(['build', 'graph.json', '--motion', 'calm', '--force', '--no-open']);
assert.equal(JSON.parse(read('.archray/index.html').match(/window\.__ARCHRAY_VIEW__=(.*?);<\/script>/)[1]).motion, 'calm');
const badMotion = run(['build', 'graph.json', '--motion', 'nope', '--force', '--no-open'], { ok: false });
assert.match(badMotion.stderr, /Unknown motion: nope/);
const badLang = run(['build', 'graph.json', '--lang', 'fr', '--force', '--no-open'], { ok: false });
assert.match(badLang.stderr, /Language fr is not in this graph/);

// Custom graph layers survive CLI focus and remain selectable in the viewer.
const custom = {
  schemaVersion: '2.0',
  meta: { name: 'Custom layers', locales: ['en'], generatedAt: '2026-11-17T00:00:00Z' },
  layers: [{ id: 'business/core', name: { en: 'Business core', zh: '业务核心' }, order: 0 }, { id: 'data', name: 'Data', order: 1 }],
  nodes: [
    { id: 'b', name: 'B', kind: 'service', layer: 'business/core' },
    { id: 'd', name: 'D', kind: 'database', layer: 'data' },
  ],
  edges: [{ id: 'bd', source: 'b', target: 'd' }],
};
writeFileSync(join(workdir, 'custom.json'), JSON.stringify(custom));
run(['build', 'custom.json', '--layers', 'business/core', '--force', '--no-open']);
const customView = JSON.parse(read('.archray/index.html').match(/window\.__ARCHRAY_VIEW__=(.*?);<\/script>/)[1]);
assert.deepEqual(customView.layers, ['business/core'], 'namespaced layer ids survive --layers');
const missingCustom = run(['build', 'custom.json', '--layers', 'platform', '--force', '--no-open'], { ok: false });
assert.match(missingCustom.stderr, /Unknown layer: platform[\s\S]*business\/core/);

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
