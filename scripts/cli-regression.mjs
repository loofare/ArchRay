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
assert.match(command, /update --check/, 'main command routes the update argument before layers');
assert.match(command, /build \.archray\/graph\.json[\s\S]*--force/, 'main command rebuilds the derived HTML with force');
for (const preset of ['frontend', 'backend', 'data', 'network', 'security', 'full']) {
  assert.match(
    readFileSync(join(agentDir, `.claude/commands/archray/${preset}.md`), 'utf8'),
    /build \.archray\/graph\.json[\s\S]*--force/,
    `preset ${preset} rebuilds the derived HTML with force`,
  );
}
assert.match(readFileSync(join(agentDir, '.claude/skills/archray/SKILL.md'), 'utf8'), /Updating and uninstalling/, 'skill explains update and uninstall');

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
assert.ok(!/[^\x00-\x7f]/.test(embedded[1]), 'embedded graph JSON escapes non-ASCII characters safely');
assert.deepEqual(JSON.parse(embedded[1]), graph, 'embedded graph survives JSON round-trip');

/* ------------------------------------------- encoding recovery & validation */
const utf8Graph = JSON.parse(readFileSync('examples/freshmart.graph.json', 'utf8'));
const utf8Json = JSON.stringify(utf8Graph);
writeFileSync(join(workdir, 'utf8-bom.json'), Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(utf8Json, 'utf8')]));
run(['validate', 'utf8-bom.json']);
run(['build', 'utf8-bom.json', '--output', '.archray/bom8.html', '--force', '--no-open']);
const bom8Embedded = read('.archray/bom8.html').match(/window\.__ARCHRAY_DATA__=(.*?);<\/script>/);
assert.ok(bom8Embedded && !/[^\x00-\x7f]/.test(bom8Embedded[1]));
assert.deepEqual(JSON.parse(bom8Embedded[1]), utf8Graph, 'UTF-8 BOM graph builds cleanly');

writeFileSync(join(workdir, 'utf16le-bom.json'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(utf8Json, 'utf16le')]));
run(['validate', 'utf16le-bom.json']);
run(['build', 'utf16le-bom.json', '--output', '.archray/bom16.html', '--force', '--no-open']);
assert.deepEqual(
  JSON.parse(read('.archray/bom16.html').match(/window\.__ARCHRAY_DATA__=(.*?);<\/script>/)[1]),
  utf8Graph,
  'UTF-16 LE BOM graph builds cleanly',
);

const gbkGraph = {
  schemaVersion: '2.0',
  meta: { name: '网关系统', locales: ['zh-CN'], generatedAt: '2026-11-19T00:00:00Z' },
  layers: [{ id: 'gateway', name: '网关', order: 0 }],
  nodes: [{ id: 'gw', name: '网关', kind: 'gateway', layer: 'gateway', summary: '核心网关' }],
  edges: [],
};
const gbkPrefix = Buffer.from('{"schemaVersion":"2.0","meta":{"name":"', 'ascii');
const gbkWord = Buffer.from([0xcd, 0xf8, 0xb9, 0xd8]); // "网关" in GB18030
const gbkSys = Buffer.from([0xcf, 0xb5, 0xcd, 0xb3]); // "系统" in GB18030
const gbkCore = Buffer.from([0xba, 0xcb, 0xd0, 0xc4]); // "核心" in GB18030
const gbkBuf = Buffer.concat([
  gbkPrefix, gbkWord, gbkSys,
  Buffer.from('","locales":["zh-CN"],"generatedAt":"2026-11-19T00:00:00Z"},"layers":[{"id":"gateway","name":"', 'ascii'),
  gbkWord,
  Buffer.from('","order":0}],"nodes":[{"id":"gw","name":"', 'ascii'),
  gbkWord,
  Buffer.from('","kind":"gateway","layer":"gateway","summary":"', 'ascii'),
  gbkCore, gbkWord,
  Buffer.from('"}],"edges":[]}', 'ascii'),
]);
writeFileSync(join(workdir, 'gbk.json'), gbkBuf);
const gbkVal = run(['validate', 'gbk.json']);
assert.match(gbkVal.stderr, /GB18030/, 'GB18030 input warns caller to save as UTF-8');
run(['build', 'gbk.json', '--output', '.archray/gbk.html', '--force', '--no-open']);
const gbkEmbedded = read('.archray/gbk.html').match(/window\.__ARCHRAY_DATA__=(.*?);<\/script>/);
assert.ok(gbkEmbedded && !/[^\x00-\x7f]/.test(gbkEmbedded[1]));
assert.deepEqual(JSON.parse(gbkEmbedded[1]), gbkGraph, 'GB18030 Chinese graph decodes accurately instead of turning into ?');

const corruptGraph = structuredClone(utf8Graph);
corruptGraph.meta.name = '????????';
corruptGraph.layers[0].name = '????';
corruptGraph.nodes[0].name = 'API ??';
writeFileSync(join(workdir, 'corrupt.json'), JSON.stringify(corruptGraph));
const corruptVal = run(['validate', 'corrupt.json'], { ok: false });
assert.match(corruptVal.stderr, /corrupted text/, 'validate rejects ?-corrupted graph');
const corruptBuild = run(['build', 'corrupt.json', '--output', '.archray/corrupt.html', '--force', '--no-open'], { ok: false });
assert.match(corruptBuild.stderr, /corrupted text/, 'build rejects ?-corrupted graph');

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
