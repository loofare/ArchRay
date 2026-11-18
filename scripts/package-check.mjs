/** Extract the release tarball, install it, and prove the project works without the download. */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tarball = resolve('dist', `archray-${version}.tgz`);
assert.ok(existsSync(tarball), `Run npm run package first (missing ${tarball})`);
const latest = JSON.parse(readFileSync(resolve('dist', 'latest.json'), 'utf8'));
assert.equal(latest.version, version, 'latest.json names the package version');
assert.equal(latest.asset, `archray-${version}.tgz`, 'latest.json names the tarball');
assert.equal(latest.sha256, createHash('sha256').update(readFileSync(tarball)).digest('hex'), 'latest.json sha256 matches the tarball');
assert.ok(existsSync(resolve('dist', 'install.sh')), 'package emits the bootstrap installer');
const bootstrapText = readFileSync(resolve('dist', 'install.sh'), 'utf8');
assert.ok(bootstrapText.includes(String.raw`\.\.`), 'bootstrap tar path check escapes dots literally');

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
  assert.ok(existsSync(join(pkg, 'README.en.md')), 'package carries the English README');
  assert.ok(existsSync(join(pkg, 'NOTICE')), 'package carries the brand notice');
  assert.ok(existsSync(join(pkg, 'docs/host-compatibility.md')), 'package carries the host matrix');
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

  // A failed re-install must not touch the vendored tool.
  const project2 = join(work, 'project2');
  mkdirSync(project2);
  run('sh', [join(pkg, 'install.sh'), project2, 'claude']);
  const toolCommand = join(project2, '.archray/tool/commands/archray.md');
  writeFileSync(toolCommand, 'TOOL SENTINEL\n');
  const noForce = spawnSync('sh', [join(pkg, 'install.sh'), project2, 'claude'], { encoding: 'utf8' });
  assert.notEqual(noForce.status, 0, 'reinstall without --force fails');
  assert.equal(readFileSync(toolCommand, 'utf8'), 'TOOL SENTINEL\n', 'failed reinstall keeps the old tool');

  // A symlinked .archray/tool must be refused before any copy or delete.
  const project3 = join(work, 'project3');
  const outside = join(work, 'outside');
  mkdirSync(join(project3, '.archray'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(outside, 'sentinel.txt'), 'OUTSIDE SENTINEL\n');
  symlinkSync(outside, join(project3, '.archray/tool'), 'dir');
  const symlinked = spawnSync('sh', [join(pkg, 'install.sh'), project3, 'claude'], { encoding: 'utf8' });
  assert.notEqual(symlinked.status, 0, 'symlinked tool path is refused');
  assert.equal(readFileSync(join(outside, 'sentinel.txt'), 'utf8'), 'OUTSIDE SENTINEL\n', 'outside files are untouched');

  // An existing .gitignore without a trailing newline must not be concatenated.
  const project4 = join(work, 'project4');
  mkdirSync(join(project4, '.archray'), { recursive: true });
  writeFileSync(join(project4, '.archray/.gitignore'), 'custom/');
  run('sh', [join(pkg, 'install.sh'), project4, 'claude']);
  const ignore = readFileSync(join(project4, '.archray/.gitignore'), 'utf8');
  assert.equal(ignore, 'custom/\ntool/\n', 'gitignore keeps its rule and adds tool/ on a new line');

  // A symlinked .gitignore is another output boundary and must be refused.
  const project5 = join(work, 'project5');
  const externalIgnore = join(work, 'external-ignore');
  mkdirSync(join(project5, '.archray'), { recursive: true });
  writeFileSync(externalIgnore, 'OUTSIDE IGNORE\n');
  symlinkSync(externalIgnore, join(project5, '.archray/.gitignore'));
  const ignoreLink = spawnSync('sh', [join(pkg, 'install.sh'), project5, 'claude'], { encoding: 'utf8' });
  assert.notEqual(ignoreLink.status, 0, 'symlinked gitignore is refused');
  assert.equal(readFileSync(externalIgnore, 'utf8'), 'OUTSIDE IGNORE\n', 'external gitignore is untouched');

  // Pi installation uses the Agent Skills location + project prompt templates.
  const projectPi = join(work, 'project-pi');
  mkdirSync(projectPi);
  run('sh', [join(pkg, 'install.sh'), projectPi, 'pi']);
  assert.ok(existsSync(join(projectPi, '.agents/skills/archray/SKILL.md')), 'pi install writes the Agent Skill');
  assert.ok(existsSync(join(projectPi, '.pi/prompts/archray.md')), 'pi install writes /archray');
  assert.ok(existsSync(join(projectPi, '.pi/prompts/archray-frontend.md')), 'pi install writes /archray-frontend');
  assert.ok(!existsSync(join(projectPi, '.claude')), 'pi install does not write Claude files');

  // The bootstrap asset installs from a local release base without GitHub.
  const projectBoot = join(work, 'project-boot');
  mkdirSync(projectBoot);
  const boot = spawnSync('sh', [resolve('dist/install.sh'), projectBoot, 'claude'], {
    encoding: 'utf8', env: { ...process.env, ARCHRAY_INSTALL_BASE: `file://${resolve('dist')}` },
  });
  assert.equal(boot.status, 0, boot.stderr || boot.stdout);
  assert.ok(existsSync(join(projectBoot, '.archray/tool/cli/bin/archray.mjs')), 'bootstrap installs the vendored tool');
  assert.ok(existsSync(join(projectBoot, '.archray/archray')), 'bootstrap writes the short update wrapper');

  // 1-argument bootstrap invocation falls through to auto without crashing on POSIX shift.
  const projectOneArg = join(work, 'project-one-arg');
  mkdirSync(projectOneArg);
  const oneArg = spawnSync('sh', [resolve('dist/install.sh'), projectOneArg], {
    encoding: 'utf8', env: { ...process.env, ARCHRAY_INSTALL_BASE: `file://${resolve('dist')}` },
  });
  assert.notEqual(oneArg.status, 0, '1-arg bootstrap on clean repo fails clearly instead of crashing on shift');
  assert.match(oneArg.stderr + oneArg.stdout, /No installed ArchRay host was detected/, '1-arg bootstrap falls through to auto');

  // Bootstrap accepts valid 2-character directory names (escaped dots) and rejects ../ traversal.
  const bootStage = join(work, 'boot-stage');
  mkdirSync(bootStage);
  run('tar', ['-xzf', tarball, '-C', bootStage]);
  mkdirSync(join(bootStage, `archray-${version}/en`), { recursive: true });
  writeFileSync(join(bootStage, `archray-${version}/en/note.txt`), 'two-char dir ok\n');
  const twoCharBase = join(work, 'boot-two-char');
  mkdirSync(twoCharBase);
  const twoCharTar = join(twoCharBase, `archray-${version}.tgz`);
  run('tar', ['-czf', twoCharTar, '-C', bootStage, `archray-${version}`]);
  const twoCharSha = createHash('sha256').update(readFileSync(twoCharTar)).digest('hex');
  const twoCharScript = join(work, 'boot-two-char.sh');
  writeFileSync(twoCharScript, bootstrapText.replace(`SHA='${latest.sha256}'`, `SHA='${twoCharSha}'`), { mode: 0o755 });
  const projectTwoChar = join(work, 'project-two-char');
  mkdirSync(projectTwoChar);
  const twoCharRes = spawnSync('sh', [twoCharScript, projectTwoChar, 'claude'], {
    encoding: 'utf8', env: { ...process.env, ARCHRAY_INSTALL_BASE: `file://${twoCharBase}` },
  });
  assert.equal(twoCharRes.status, 0, `bootstrap allows 2-char dir names: ${twoCharRes.stderr || twoCharRes.stdout}`);

  const tarEntry = (name) => {
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'utf8');
    header.write('0000644\0', 100);
    header.write('0001750\0', 108);
    header.write('0001750\0', 116);
    header.write('00000000000\0', 124);
    header.write('00000000000\0', 136);
    header.write('        ', 148);
    header.write('0', 156);
    header.write('ustar\0', 257);
    header.write('00', 263);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148);
    return header;
  };
  const evilBase = join(work, 'boot-evil');
  mkdirSync(evilBase);
  const evilTar = join(evilBase, `archray-${version}.tgz`);
  writeFileSync(evilTar, gzipSync(Buffer.concat([tarEntry('../escape'), Buffer.alloc(1024)])));
  const evilSha = createHash('sha256').update(readFileSync(evilTar)).digest('hex');
  const evilScript = join(work, 'boot-evil.sh');
  writeFileSync(evilScript, bootstrapText.replace(`SHA='${latest.sha256}'`, `SHA='${evilSha}'`), { mode: 0o755 });
  const projectEvil = join(work, 'project-evil');
  mkdirSync(projectEvil);
  const evilRes = spawnSync('sh', [evilScript, projectEvil, 'claude'], {
    encoding: 'utf8', env: { ...process.env, ARCHRAY_INSTALL_BASE: `file://${evilBase}` },
  });
  assert.notEqual(evilRes.status, 0, 'bootstrap refuses ../ traversal tar');
  assert.match(evilRes.stderr + evilRes.stdout, /Unsafe archive path/, 'bootstrap reports unsafe archive path');

  // A controlled rename failure must roll back both the tool and every written template.
  const project6 = join(work, 'project6');
  mkdirSync(project6);
  run('sh', [join(pkg, 'install.sh'), project6, 'claude']);
  writeFileSync(join(project6, '.archray/SKILL.md'), 'OLD SKILL\n');
  writeFileSync(join(project6, '.archray/tool/commands/archray.md'), 'TOOL SENTINEL\n');
  const preload = join(work, 'preload.cjs');
  writeFileSync(preload, `const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = (from, to, ...rest) => {
  if (String(from).includes('.tool-stage-') && /[\\\\/]tool$/.test(String(to))) {
    const error = new Error('injected rename failure');
    error.code = 'EACCES';
    throw error;
  }
  return original(from, to, ...rest);
};
`);
  const failedSwap = spawnSync('sh', [join(pkg, 'install.sh'), project6, 'claude', '--force'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: `--require ${preload}` },
  });
  assert.notEqual(failedSwap.status, 0, 'a failed tool swap returns non-zero');
  assert.equal(readFileSync(join(project6, '.archray/SKILL.md'), 'utf8'), 'OLD SKILL\n', 'failed swap restores the template');
  assert.equal(readFileSync(join(project6, '.archray/tool/commands/archray.md'), 'utf8'), 'TOOL SENTINEL\n', 'failed swap restores the tool');
  assert.ok(!readdirSync(join(project6, '.archray')).some((name) => name.startsWith('.tool-')), 'failed swap leaves no stage/backup');

  const projectFreshFail = join(work, 'project-fresh-fail');
  mkdirSync(projectFreshFail);
  const freshFail = spawnSync('sh', [join(pkg, 'install.sh'), projectFreshFail, 'claude'], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: `--require ${preload}` },
  });
  assert.notEqual(freshFail.status, 0, 'a failed fresh install returns non-zero');
  assert.deepEqual(readdirSync(projectFreshFail), [], 'failed fresh install leaves no empty directories behind');

  console.log('Package check passed:', tarball);
} finally {
  rmSync(work, { recursive: true, force: true });
}
