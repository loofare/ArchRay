/**
 * Per-repository update, install manifest and uninstall helpers.
 *
 * The CLI is vendored at <project>/.archray/tool; updates must never touch the
 * user's graph, view or built HTML. Network access is explicit: `update --check`
 * only reads the release manifest; `update` verifies the asset hash before it
 * runs the new installer.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

export const AGENTS = ['none', 'auto', 'claude', 'cursor', 'antigravity', 'pi', 'codex', 'all'] as const;
export type Agent = Exclude<(typeof AGENTS)[number], 'none' | 'auto' | 'all'>;
export const DEFAULT_MANIFEST = process.env.ARCHRAY_UPDATE_MANIFEST
  ?? 'https://github.com/loofare/ArchRay/releases/latest/download/latest.json';
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const NETWORK_TIMEOUT_MS = 30_000;

export interface InstallManifest {
  version: string;
  agents: Agent[];
  installedAt: string;
}

export interface ReleaseManifest {
  version: string;
  asset: string;
  sha256: string;
  minNode?: number;
  notes?: string;
}

const exists = (p: string) => existsSync(p);
const isDir = (p: string) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const isLink = (p: string) => { try { return lstatSync(p).isSymbolicLink(); } catch { return false; } };

/** Read the install manifest, returning null for old/manual installs. */
export function readInstallManifest(target: string): InstallManifest | null {
  const path = resolve(target, '.archray/install.json');
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof value?.version !== 'string' || !Array.isArray(value?.agents)) return null;
    const agents = value.agents.filter((x: unknown): x is Agent => typeof x === 'string' && isAgent(x));
    return { version: value.version, agents, installedAt: typeof value.installedAt === 'string' ? value.installedAt : '' };
  } catch { return null; }
}

export function writeInstallManifest(target: string, version: string, agents: Agent[]): void {
  const path = resolve(target, '.archray/install.json');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ version, agents, installedAt: new Date().toISOString() }, null, 2) + '\n');
}

/** Detect hosts from the files the installer wrote. */
export function detectAgents(target: string): Agent[] {
  const root = resolve(target);
  const found: Agent[] = [];
  const add = (a: Agent) => { if (!found.includes(a)) found.push(a); };
  if (exists(join(root, '.claude/skills/archray/SKILL.md')) || exists(join(root, '.claude/commands/archray.md'))) add('claude');
  if (exists(join(root, '.cursor/rules/archray.mdc')) || exists(join(root, '.cursor/commands/archray.md'))) add('cursor');
  if (exists(join(root, '.agent/skills/archray/SKILL.md')) || exists(join(root, '.agent/commands/archray.md'))) add('antigravity');
  const hasPi = exists(join(root, '.pi/prompts/archray.md'));
  const hasShared = exists(join(root, '.agents/skills/archray/SKILL.md'));
  if (hasPi) add('pi');
  // Pi and Codex share .agents/skills. Without an install manifest we cannot distinguish them;
  // conservatively keep both so a partial uninstall cannot remove the shared skill.
  if (hasShared) add('codex');
  return found;
}

export function isAgent(value: string): value is Agent {
  return (['claude', 'cursor', 'antigravity', 'pi', 'codex'] as readonly string[]).includes(value);
}

/** Resolve `auto`, `all`, a single host or a comma-separated host list. */
export function resolveAgents(target: string, raw: string): Agent[] {
  const value = raw.trim().toLowerCase();
  if (value === 'all') return ['claude', 'cursor', 'antigravity', 'pi', 'codex'];
  if (value === 'auto') {
    const detected = readInstallManifest(target)?.agents ?? detectAgents(target);
    if (!detected.length) {
      throw new Error('No installed ArchRay host was detected.\nPass --agent claude|cursor|antigravity|pi|codex or --agent all.');
    }
    return detected;
  }
  const parts = value.split(',').map((x) => x.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Empty --agent value.');
  for (const part of parts) {
    if (!isAgent(part)) throw new Error(`Unknown --agent value: ${part}. Use auto, all, or a comma-separated host list.`);
  }
  return [...new Set(parts as Agent[])];
}

export function wrapperFiles(target: string): { path: string; data: string; mode: number }[] {
  const dir = resolve(target, '.archray');
  return [
    {
      path: join(dir, 'archray'),
      mode: 0o755,
      data: '#!/bin/sh\nset -eu\nhere=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)\nexec node "$here/tool/cli/bin/archray.mjs" "$@"\n',
    },
    {
      path: join(dir, 'archray.cmd'),
      mode: 0o644,
      data: '@echo off\r\nnode "%~dp0tool\\cli\\bin\\archray.mjs" %*\r\n',
    },
  ];
}

export function writeWrappers(target: string): void {
  for (const file of wrapperFiles(target)) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.data, { mode: file.mode });
    chmodSync(file.path, file.mode);
  }
}

export function removeWrappers(target: string): void {
  for (const file of wrapperFiles(target)) rmSync(file.path, { force: true });
}

/** Exact command files written by planInit; never infer ownership from a prefix. */
const PRESET_KEYS = ['frontend', 'backend', 'data', 'network', 'security', 'full'];
const PRESET_NAMES = ['archray', ...PRESET_KEYS.map((k) => `archray-${k}`)];

function assertSafePath(root: string, path: string): void {
  const abs = resolve(path);
  const parentReal = (() => { try { return realpathSync(dirname(abs)); } catch { return resolve(dirname(abs)); } })();
  const rel = relative(root, parentReal);
  if (rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`Refusing path outside the project: ${path}`);
  }
  const parts = relative(root, abs).split(sep);
  let cur = root;
  for (const part of parts) {
    cur = join(cur, part);
    try {
      if (lstatSync(cur).isSymbolicLink()) throw new Error(`Refusing symbolic-link path: ${cur}`);
    } catch (e: any) {
      if (e.code === 'ENOENT') break;
      throw e;
    }
  }
}

/** Remove only now-empty directories owned by the removed hosts, child before parent. */
function pruneEmptyHostDirs(root: string, agents: Agent[], remaining: Agent[]): void {
  const removeShared = (agents.includes('pi') || agents.includes('codex')) && !remaining.includes('pi') && !remaining.includes('codex');
  const candidateDirs: string[] = [];
  if (agents.includes('claude')) {
    candidateDirs.push('.claude/commands/archray', '.claude/commands', '.claude/skills/archray', '.claude/skills', '.claude');
  }
  if (agents.includes('cursor')) {
    candidateDirs.push('.cursor/commands', '.cursor/rules', '.cursor');
  }
  if (agents.includes('antigravity')) {
    candidateDirs.push('.agent/commands', '.agent/skills/archray', '.agent/skills', '.agent');
  }
  if (agents.includes('pi')) {
    candidateDirs.push('.pi/prompts', '.pi');
  }
  if (removeShared) {
    candidateDirs.push('.agents/skills/archray', '.agents/skills', '.agents');
  }
  for (const d of candidateDirs) {
    const abs = join(root, d);
    try {
      assertSafePath(root, abs);
      if (!isLink(abs) && lstatSync(abs).isDirectory() && readdirSync(abs).length === 0) {
        rmSync(abs, { recursive: true, force: true });
      }
    } catch { /* best effort */ }
  }
}

/** Remove only files ArchRay installed for the selected hosts. */
export function removeHostFiles(target: string, agents: Agent[], remaining: Agent[], dry: boolean): string[] {
  const root = realpathSync(target);
  const paths: string[] = [];
  const add = (p: string) => {
    const abs = resolve(root, p);
    assertSafePath(root, abs);
    if (exists(abs) || isDir(abs)) paths.push(abs);
  };
  if (agents.includes('claude')) {
    add('.claude/commands/archray.md');
    for (const name of PRESET_KEYS) add(`.claude/commands/archray/${name}.md`);
    add('.claude/skills/archray/SKILL.md');
  }
  if (agents.includes('cursor')) {
    add('.cursor/rules/archray.mdc');
    for (const name of PRESET_NAMES) add(`.cursor/commands/${name}.md`);
  }
  if (agents.includes('antigravity')) {
    for (const name of PRESET_NAMES) add(`.agent/commands/${name}.md`);
    add('.agent/skills/archray/SKILL.md');
  }
  if (agents.includes('pi')) {
    for (const name of PRESET_NAMES) add(`.pi/prompts/${name}.md`);
  }
  // .agents/skills/archray is shared by Pi and Codex. Keep it while either remains.
  if ((agents.includes('pi') || agents.includes('codex')) && !remaining.includes('pi') && !remaining.includes('codex')) {
    add('.agents/skills/archray/SKILL.md');
  }
  if (dry) return [...new Set(paths)];
  for (const p of [...new Set(paths)]) rmSync(p, { recursive: true, force: true });
  pruneEmptyHostDirs(root, agents, remaining);
  return [...new Set(paths)];
}

/** Remove only the tool/ rule ArchRay added; keep user ignore rules. */
function removeOwnIgnore(root: string): void {
  const path = join(root, '.archray/.gitignore');
  assertSafePath(root, path);
  if (!exists(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const kept = lines.filter((line) => line.trim() !== 'tool/' && line.trim() !== '.archray/tool/');
  const text = kept.join('\n').replace(/\n+$/, '\n');
  if (text.trim()) writeFileSync(path, text);
  else rmSync(path, { force: true });
}

export interface UpdateOptions {
  target: string;
  currentVersion: string;
  check: boolean;
  force: boolean;
  manifest: string;
  agent?: string;
}

export async function runUpdate(opts: UpdateOptions): Promise<void> {
  const target = resolve(opts.target);
  const installManifest = readInstallManifest(target);
  const agents = installManifest?.agents.length
    ? installManifest.agents
    : opts.agent
      ? resolveAgents(target, opts.agent)
      : detectAgents(target);
  if (!agents.length) throw new Error('No installed ArchRay host was detected; pass --agent claude|cursor|antigravity|pi|codex.');

  const manifest = await readManifest(opts.manifest);
  const cmp = compareVersions(manifest.version, opts.currentVersion);
  if (cmp <= 0 && !opts.force) {
    console.log(`ArchRay is up to date (v${opts.currentVersion}).`);
    console.log('Run ./.archray/archray update --check to verify again; --check reads the release manifest over the network.');
    return;
  }
  if (opts.check) {
    console.log(`ArchRay update available: v${opts.currentVersion} → v${manifest.version}`);
    console.log(`Asset: ${manifest.asset} (${manifest.sha256.slice(0, 12)}…)`);
    if (manifest.notes) console.log(manifest.notes);
    console.log('Check only: no package was downloaded and no files were changed.');
    console.log('Run ./.archray/archray update to apply it.');
    return;
  }

  const major = Number(process.versions.node.split('.')[0]);
  if (manifest.minNode && major < manifest.minNode) {
    throw new Error(`ArchRay v${manifest.version} requires Node ${manifest.minNode}+ (running ${process.version}).`);
  }

  const tmp = mkdtempSync(join(tmpdir(), 'archray-update-'));
  try {
    const assetUrl = resolveAsset(opts.manifest, manifest.asset);
    console.log(`Downloading ArchRay v${manifest.version}…`);
    const bytes = await readBytes(assetUrl);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== manifest.sha256.toLowerCase()) {
      throw new Error(`Checksum mismatch for ${manifest.asset}.\nExpected ${manifest.sha256}\nReceived ${digest}\nRefusing to install.`);
    }
    const archive = join(tmp, manifest.asset);
    writeFileSync(archive, bytes);
    assertArchiveSafe(archive);
    const result = spawnSync('tar', ['-xzf', archive, '-C', tmp], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Could not extract ${manifest.asset}: ${result.stderr || result.error?.message || 'tar failed'}`);
    const pkg = join(tmp, `archray-${manifest.version}`);
    const inner = join(pkg, 'cli/bin/archray.mjs');
    if (!exists(inner)) throw new Error(`Release ${manifest.asset} does not contain cli/bin/archray.mjs.`);
    assertNoLinks(tmp, tmp);
    const candidate = spawnSync(process.execPath, [inner, 'version'], { encoding: 'utf8' });
    const candidateVersion = (candidate.stdout || '').trim().replace(/^archray\s+/, '');
    if (candidate.status !== 0 || candidateVersion !== manifest.version) {
      throw new Error(`Release manifest says v${manifest.version}, but the package CLI reports v${candidateVersion || 'unknown'}. Refusing a mismatched update.`);
    }
    console.log(`Installing v${manifest.version} over v${opts.currentVersion}…`);
    const install = spawnSync(process.execPath, [inner, 'install', '--target', target, '--agent', agents.join(','), '--force'], { encoding: 'utf8' });
    if (install.status !== 0) {
      if (install.stdout) process.stderr.write(install.stdout);
      if (install.stderr) process.stderr.write(install.stderr);
      throw new Error('The new package installer failed; the previous tool was left in place.');
    }
    console.log(`Updated ArchRay: v${opts.currentVersion} → v${manifest.version}`);
    console.log('Your .archray/graph.json, view.json and index.html were not changed.');
    console.log(`Hosts refreshed: ${agents.join(', ')}. Reload the AI window if commands do not update.`);
    if (manifest.notes) console.log(`Release notes: ${manifest.notes}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function assertNotUserAlias(root: string, path: string): void {
  const protectedPaths = ['graph.json', 'view.json', 'index.html'].map((name) => join(root, '.archray', name));
  for (const userPath of protectedPaths) {
    if (!exists(path) || !exists(userPath)) continue;
    try {
      const a = statSync(path), b = statSync(userPath);
      if (a.ino === b.ino && a.dev === b.dev) throw new Error(`Refusing to write over user data: ${path}`);
      if (realpathSync(path) === realpathSync(userPath)) throw new Error(`Refusing to write over user data: ${path}`);
    } catch (e: any) {
      if (e.message?.startsWith('Refusing')) throw e;
      if (e.code === 'ENOENT') continue;
      throw e;
    }
  }
}

export function uninstallProject(target: string, opts: { purge: boolean; dry: boolean; agent?: string }): void {
  const root = realpathSync(resolve(target));
  const archray = join(root, '.archray');
  assertSafePath(root, archray);
  const manifest = readInstallManifest(root);
  const installed = manifest?.agents.length ? manifest.agents : detectAgents(root);
  const selected = opts.purge ? installed : opts.agent ? resolveAgents(root, opts.agent) : installed;
  const removed = selected.filter((a) => installed.includes(a));
  const skipped = selected.filter((a) => !installed.includes(a));
  if (!opts.purge && opts.agent && removed.length === 0) {
    console.log(`Host not installed: ${skipped.join(', ')}. Currently installed: ${installed.length ? installed.join(', ') : 'none'}.`);
    return;
  }
  const remaining = opts.purge ? [] : installed.filter((a) => !removed.includes(a));
  const paths = removeHostFiles(root, removed, remaining, true);
  assertSafePath(root, join(archray, '.gitignore'));
  assertNotUserAlias(root, join(archray, '.gitignore'));
  const manifestPath = join(archray, 'install.json');
  assertSafePath(root, manifestPath);
  assertNotUserAlias(root, manifestPath);
  const removeTool = opts.purge || remaining.length === 0;
  if (removeTool) {
    for (const p of ['archray', 'archray.cmd', 'tool', 'SKILL.md', 'graph.schema.json', 'view.schema.json', 'tech.json', 'install.json']) {
      const abs = join(archray, p);
      assertSafePath(root, abs);
      if (exists(abs) || isDir(abs)) paths.push(abs);
    }
  } else {
    // Keep the tool and templates while another host still uses ArchRay.
    console.log(`Keeping ArchRay for: ${remaining.join(', ')}`);
  }
  if (opts.dry) {
    if (skipped.length) console.log(`Host not installed: ${skipped.join(', ')}.`);
    for (const p of [...new Set(paths)]) console.log(`would remove ${p}`);
    if (opts.purge) console.log(`would remove ${archray} (including graph/view/index)`);
    else console.log('would keep .archray/graph.json, view.json and index.html');
    return;
  }
  for (const p of [...new Set(paths)]) rmSync(p, { recursive: true, force: true });
  pruneEmptyHostDirs(root, removed, remaining);
  if (removeTool) removeOwnIgnore(root);
  if (!opts.purge && remaining.length && manifest) writeInstallManifest(root, manifest.version, remaining);
  if (opts.purge) {
    assertSafePath(root, archray);
    rmSync(archray, { recursive: true, force: true });
  } else {
    try { if (isDir(archray) && readdirSync(archray).length === 0) rmSync(archray, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  if (skipped.length) console.log(`Host not installed: ${skipped.join(', ')}.`);
  if (opts.purge) console.log('ArchRay removed: all hosts and all .archray data were deleted.');
  else if (remaining.length) console.log(`Removed hosts: ${removed.join(', ')}. Still installed: ${remaining.join(', ')}. The shared tool, wrapper and graph/view/index were kept.`);
  else console.log('ArchRay removed. The wrapper is gone; graph/view/index were kept. To remove those too, back them up and delete .archray manually.');
}

/* --------------------------------------------------------------- network */

export async function readManifest(source: string): Promise<ReleaseManifest> {
  const value = JSON.parse(await readText(source));
  if (!value || typeof value !== 'object') throw new Error('Invalid latest.json: expected an object.');
  if (typeof value.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.version)) throw new Error('Invalid latest.json: version must be x.y.z.');
  if (typeof value.asset !== 'string' || basename(value.asset) !== value.asset || !value.asset.endsWith('.tgz')) throw new Error('Invalid latest.json: asset must be a .tgz file name.');
  if (typeof value.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(value.sha256)) throw new Error('Invalid latest.json: sha256 must be 64 hex characters.');
  if (value.minNode !== undefined && (!Number.isInteger(value.minNode) || value.minNode < 18)) throw new Error('Invalid latest.json: minNode must be an integer >= 18.');
  return value as ReleaseManifest;
}

function resolveAsset(manifestSource: string, asset: string): string {
  if (/^https?:\/\//i.test(manifestSource)) return new URL(asset, manifestSource).href;
  if (manifestSource.startsWith('file://')) return new URL(asset, manifestSource).href;
  return resolve(dirname(manifestSource), asset);
}

function isRemote(source: string): boolean { return /^https?:\/\//i.test(source); }
function isLocalHost(host: string): boolean { return host === '127.0.0.1' || host === 'localhost' || host === '[::1]' || host === '::1'; }

function assertSecureSource(source: string): void {
  if (!/^http:\/\//i.test(source)) return;
  let host = '';
  try { host = new URL(source).hostname; } catch { throw new Error(`Invalid URL: ${source}`); }
  if (!isLocalHost(host)) throw new Error(`Refusing plain HTTP update source: ${source}.\nUse HTTPS (plain HTTP is allowed only for localhost tests).`);
}

const MAX_REDIRECTS = 8;

async function fetchChecked(source: string, accept: string): Promise<Response> {
  const startedHttps = /^https:\/\//i.test(source);
  let current = source;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertSecureSource(current);
    if (startedHttps && !/^https:\/\//i.test(current)) {
      throw new Error(`Refusing an HTTPS-to-HTTP redirect: ${current}`);
    }
    let res: Response;
    try {
      res = await fetch(current, {
        headers: { 'user-agent': 'archray-update', accept },
        redirect: 'manual',
        signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
      });
    } catch (e: any) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new Error(`Timed out reading ${current}.`);
      throw e;
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error(`Redirect without Location from ${current}.`);
      await res.body?.cancel().catch(() => {});
      current = new URL(location, current).href;
      if (!isRemote(current)) throw new Error(`Refusing non-HTTP(S) redirect: ${current}`);
      continue;
    }
    if (!res.ok) throw new Error(`Could not read ${current}: HTTP ${res.status}.`);
    return res;
  }
  throw new Error(`Too many redirects reading ${source}.`);
}

async function readText(source: string): Promise<string> {
  if (isRemote(source)) {
    const res = await fetchChecked(source, 'application/json');
    const length = Number(res.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_MANIFEST_BYTES) throw new Error('Release manifest is too large.');
    const text = await res.text();
    if (Buffer.byteLength(text) > MAX_MANIFEST_BYTES) throw new Error('Release manifest is too large.');
    return text;
  }
  if (source.startsWith('file://')) return readFileSync(new URL(source), 'utf8');
  return readFileSync(source, 'utf8');
}

async function readBytes(source: string): Promise<Buffer> {
  if (isRemote(source)) {
    const res = await fetchChecked(source, '*/*');
    const length = Number(res.headers.get('content-length'));
    if (Number.isFinite(length) && length > MAX_ARCHIVE_BYTES) throw new Error('Release archive is too large.');
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error('Release archive is too large.');
    return bytes;
  }
  if (source.startsWith('file://')) return readFileSync(new URL(source));
  return readFileSync(source);
}

/** Check paths and entry types before handing the archive to tar. */
function assertArchiveSafe(archive: string): void {
  const list = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
  if (list.status !== 0) throw new Error(`Could not inspect ${archive}: ${list.stderr || 'tar -tzf failed'}`);
  for (const entry of list.stdout.split(/\r?\n/).filter(Boolean)) {
    if (entry.startsWith('/') || entry.includes('\\') || entry.split('/').includes('..')) {
      throw new Error(`Unsafe archive path: ${entry}`);
    }
  }
  const verbose = spawnSync('tar', ['-tvzf', archive], { encoding: 'utf8' });
  if (verbose.status !== 0) throw new Error(`Could not inspect ${archive}: ${verbose.stderr || 'tar -tvzf failed'}`);
  for (const line of verbose.stdout.split(/\r?\n/).filter(Boolean)) {
    if (/^[lhbcp]/i.test(line.trim())) throw new Error(`Unsafe archive entry type: ${line.slice(0, 80)}`);
  }
}

/** Reject symlinks and anything outside the extraction root. */
function assertNoLinks(root: string, dir: string): void {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (isLink(p)) throw new Error(`Release archive contains a symbolic link: ${p}`);
    if (!isDir(p) && statSync(p).nlink > 1) throw new Error(`Release archive contains a hard link: ${p}`);
    if (resolve(p) !== p || !p.startsWith(root + sep)) throw new Error(`Unsafe archive path: ${p}`);
    if (isDir(p)) assertNoLinks(root, p);
  }
}

/* --------------------------------------------------------------- semver */

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}
