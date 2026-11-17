import {
  closeSync, cpSync, existsSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { validateGraph, validateView } from '../../core/src/validate';
import { migrateV1 } from '../../core/src/migrate';
import { graphLayers, parseGraphLayers } from '../../core/src/layers';
import type { ArchGraph, ViewState } from '../../core/src/schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
declare const __ARCHRAY_VERSION__: string;
const VERSION = typeof __ARCHRAY_VERSION__ === 'string' ? __ARCHRAY_VERSION__ : 'dev';

const HELP = `ArchRay v2 (source trial)

Usage: archray <command> [options]

  validate [graph]          check a v2 graph (default .archray/graph.json)
  build [graph] [options]   build a single-file HTML view
  migrate <v1.json>         convert a v1 graph to v2 (original kept)
  schema [graph|view]       print a JSON schema
  init [options]            write .archray templates for your AI agent
  install [options]         vendor the tool into a project and install commands
  doctor                    check the packaged files and Node version
  version                   print the CLI version

build options:
  --input <file>            graph to render (default .archray/graph.json)
  --output <file>           HTML output (default .archray/index.html)
  --view <file>             view.json to embed (language, theme, projection, camera)
  --layers <list>           focus architecture layers, e.g. frontend,data (or all)
  --style <name>            tech | blueprint | glass | paper (default tech)
  --lang <locale>           view language, e.g. zh-CN or en
  --motion <mode>           full | calm | off (default full; calm for reduced motion)
  --no-open                 do not launch a browser
  --force                   replace an existing output file

init options:
  --target <dir>            project directory (default .)
  --agent <name>            none | claude | cursor | antigravity | all; installs
                            skills and /archray slash commands (default none)
  --cli <path>              CLI path written into commands (default: this package)

install options:
  --target <dir>            project directory (default .)
  --agent <name>            none | claude | cursor | antigravity | all (default claude)
  --force                   update the vendored tool and existing files

migrate / schema options:
  --output <file>           write to a file instead of stdout / default path
  --force                   replace an existing output file

First run:
  1. archray init
  2. ask your agent to read .archray/SKILL.md and .archray/graph.schema.json,
     inspect real source and write .archray/graph.json
  3. archray validate .archray/graph.json
  4. archray build .archray/graph.json --no-open
     then open .archray/index.html in a browser
`;

interface Args {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const args = [...argv];
  const command = args.shift();
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  while (args.length) {
    const arg = args.shift()!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[0];
      flags[key] = next && !next.startsWith('--') ? args.shift()! : true;
    } else {
      positional.push(arg);
    }
  }
  return { command, positional, flags };
}

const flag = (args: Args, key: string, fallback: string) =>
  typeof args.flags[key] === 'string' ? (args.flags[key] as string) : fallback;
const has = (args: Args, key: string) => args.flags[key] !== undefined;

function readJson(path: string): any {
  if (!existsSync(path)) {
    throw new Error(
      `Cannot read ${path}: file not found.\n` +
      `Run "archray init" and have your AI agent write the graph, or pass the correct path.`,
    );
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e: any) {
    throw new Error(`Cannot read ${path}: ${e.message}`);
  }
}

function assertValid(value: unknown, view = false): any {
  const result = view ? validateView(value) : validateGraph(value);
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join('\n'));
  return value;
}

/** Real path of a file, resolving symlinked parent directories for not-yet-created outputs. */
function identity(path: string): string {
  const absolute = resolve(path);
  if (existsSync(absolute)) return realpathSync(absolute);
  return resolve(identity(dirname(absolute)), absolute.slice(dirname(absolute).length + 1));
}

/** Refuse to write over the input, through a symlink, or over an existing file without --force. */
function guard(path: string, input: string | undefined, args: Args): void {
  const sameAlias = input && (identity(path) === identity(input) ||
    (existsSync(path) && existsSync(input) && statSync(path).ino === statSync(input).ino && statSync(path).dev === statSync(input).dev));
  if (sameAlias) throw new Error(`Refusing to write output over its input: ${path}.\nChoose a different --output.`);

  let present = false;
  try {
    const stat = lstatSync(path);
    present = true;
    if (stat.isSymbolicLink()) throw new Error(`Refusing to write through a symbolic link: ${path}.\nChoose a real file path.`);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (present && !has(args, 'force')) {
    throw new Error(`${path} already exists.\nRe-run with --force to replace it, or choose another --output.`);
  }
}

/** Write atomically via a same-directory temporary file; never leave a partial output. */
function writeOutput(path: string, data: string, args: Args, input?: string): void {
  const target = resolve(path);
  guard(target, input, args);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    const fd = openSync(temp, 'wx');
    try {
      writeFileSync(fd, data);
    } finally {
      closeSync(fd);
    }
    if (has(args, 'force')) {
      guard(target, input, args);
      renameSync(temp, target);
    } else {
      // link() fails if the target appeared meanwhile, preserving the no-overwrite promise.
      linkSync(temp, target);
      unlinkSync(temp);
    }
  } finally {
    if (existsSync(temp)) unlinkSync(temp);
  }
  console.log(target);
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

function cmdDoctor(): void {
  const checks: [string, string][] = [
    ['cli bundle', 'cli/bin/archray.mjs'],
    ['viewer template', 'viewer/dist/viewer.html'],
    ...CORE_TEMPLATES.map(([source]) => [`template ${source}`, source] as [string, string]),
    ...COMMAND_FILES.map(([source]) => [`command ${source}`, source] as [string, string]),
  ];
  let ok = Number(process.versions.node.split('.')[0]) >= 20;
  console.log(`archray ${VERSION} · node ${process.version}${ok ? '' : ' (Node 20+ required)'}`);
  for (const [label, file] of checks) {
    const path = resolve(root, file);
    const exists = existsSync(path);
    if (!exists) ok = false;
    console.log(`${exists ? 'ok  ' : 'MISS'} ${label}: ${path}`);
  }
  if (!ok) console.log('Missing files: re-extract the release package or rebuild with npm run build.');
  if (!ok) process.exitCode = 1;
}

function cmdVersion(): void {
  console.log(`archray ${VERSION}`);
}

function cmdValidate(args: Args): void {
  const path = args.positional[0] ?? '.archray/graph.json';
  assertValid(readJson(path));
  console.log(`Valid v2 graph: ${path}`);
}

function cmdSchema(args: Args): void {
  const kind = args.positional[0] === 'view' ? 'view' : 'graph';
  const data = readFileSync(resolve(root, `schema/${kind}.schema.json`), 'utf8');
  if (has(args, 'output')) writeOutput(flag(args, 'output', ''), data, args);
  else process.stdout.write(data);
}

const CORE_TEMPLATES: [string, string][] = [
  ['schema/graph.schema.json', '.archray/graph.schema.json'],
  ['schema/view.schema.json', '.archray/view.schema.json'],
  ['skill/SKILL.md', '.archray/SKILL.md'],
  ['knowledge/tech.json', '.archray/tech.json'],
];

const COMMAND_FILES: [string, string][] = [
  ['commands/archray.md', 'archray.md'],
  ['commands/archray/frontend.md', 'frontend.md'],
  ['commands/archray/backend.md', 'backend.md'],
  ['commands/archray/data.md', 'data.md'],
  ['commands/archray/network.md', 'network.md'],
  ['commands/archray/security.md', 'security.md'],
  ['commands/archray/full.md', 'full.md'],
];

const AGENTS = ['none', 'claude', 'cursor', 'antigravity', 'all'];

/** Files init writes for one target/agent; shared by init, install and doctor. */
function planInit(target: string, agent: string, cliPath: string): { path: string; data: string }[] {
  const files: [string, string][] = [...CORE_TEMPLATES];
  const integrations: [string, string][] = [
    ['claude', '.claude/skills/archray/SKILL.md'],
    ['cursor', '.cursor/rules/archray.mdc'],
    ['antigravity', '.agent/skills/archray/SKILL.md'],
  ];
  for (const [id, destination] of integrations) {
    if (agent === id || agent === 'all') files.push(['skill/SKILL.md', destination]);
  }

  // Slash commands: `/archray` plus focused presets. Claude namespaces subdirectories;
  // other hosts get flat `archray-<preset>.md` files.
  const addCommands = (base: string, flat: boolean) => {
    for (const [source, name] of COMMAND_FILES) {
      const destination = name === 'archray.md' ? `${base}/archray.md` : flat ? `${base}/archray-${name}` : `${base}/archray/${name}`;
      files.push([source, destination]);
    }
  };
  if (agent === 'claude' || agent === 'all') addCommands('.claude/commands', false);
  if (agent === 'cursor' || agent === 'all') addCommands('.cursor/commands', true);
  if (agent === 'antigravity' || agent === 'all') addCommands('.agent/commands', true);

  return files.map(([source, destination]) => ({
    path: resolve(target, destination),
    data: readFileSync(resolve(root, source), 'utf8').replaceAll('__ARCHRAY_CLI__', cliPath),
  }));
}

function cmdInit(args: Args): void {
  const target = resolve(flag(args, 'target', '.'));
  const agent = flag(args, 'agent', 'none');
  if (!AGENTS.includes(agent)) {
    throw new Error(`Unknown --agent value: ${agent}. Use none, claude, cursor, antigravity or all.`);
  }

  const cliPath = has(args, 'cli') ? flag(args, 'cli', '') : resolve(root, 'cli/bin/archray.mjs');
  const planned = planInit(target, agent, cliPath);
  // Preflight every destination before writing so a conflict cannot leave a half-written init.
  for (const file of planned) guard(file.path, undefined, args);
  for (const file of planned) writeOutput(file.path, file.data, args);
}

function cmdInstall(args: Args): void {
  if (Number(process.versions.node.split('.')[0]) < 20) {
    throw new Error(`Node 20+ is required (running ${process.version}).`);
  }
  const target = resolve(flag(args, 'target', '.'));
  const agent = flag(args, 'agent', 'claude');
  if (!AGENTS.includes(agent)) {
    throw new Error(`Unknown --agent value: ${agent}. Use none, claude, cursor, antigravity or all.`);
  }

  const archrayDir = resolve(target, '.archray');
  const toolDir = resolve(archrayDir, 'tool');
  // Never follow a symlinked install path: rm/cp under it could touch files outside the project.
  for (const path of [archrayDir, toolDir]) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
      throw new Error(`Refusing symbolic-link install path: ${path}`);
    }
  }

  const cliPath = '.archray/tool/cli/bin/archray.mjs';
  const planned = planInit(target, agent, cliPath);
  for (const file of planned) guard(file.path, undefined, args);
  if (existsSync(toolDir) && !has(args, 'force')) {
    throw new Error(`${toolDir} already exists.\nRe-run with --force to update the vendored tool.`);
  }

  mkdirSync(archrayDir, { recursive: true });
  const stage = resolve(archrayDir, `.tool-stage-${process.pid}-${Date.now()}`);
  mkdirSync(stage, { recursive: true });
  try {
    for (const dir of ['cli', 'schema', 'skill', 'commands', 'knowledge', 'viewer']) {
      const source = resolve(root, dir);
      if (!existsSync(source)) throw new Error(`Missing package directory: ${source}`);
      cpSync(source, resolve(stage, dir), { recursive: true });
    }
    for (const file of planned) writeOutput(file.path, file.data, args);

    const backup = resolve(archrayDir, `.tool-old-${process.pid}-${Date.now()}`);
    const hadTool = existsSync(toolDir);
    if (hadTool) renameSync(toolDir, backup);
    try {
      renameSync(stage, toolDir);
    } catch (error) {
      if (hadTool) renameSync(backup, toolDir);
      throw error;
    }
    if (hadTool) rmSync(backup, { recursive: true, force: true });

    const ignore = resolve(archrayDir, '.gitignore');
    const existing = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
    const eol = existing.includes('\r\n') ? '\r\n' : '\n';
    if (!existing.split(/\r?\n/).some((line) => line.trim() === 'tool/')) {
      const prefix = existing.length === 0 || existing.endsWith('\n') ? existing : `${existing}${eol}`;
      writeFileSync(ignore, `${prefix}tool/${eol}`);
    }

    console.log(`Installed ArchRay into ${target}`);
    console.log(`Vendored CLI: ${toolDir}/cli/bin/archray.mjs`);
    console.log('Open the repository in your AI and type /archray');
  } finally {
    if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  }
}

function cmdMigrate(args: Args): void {
  const path = args.positional[0];
  if (!path) {
    throw new Error('migrate needs a v1 graph file.\nExample: archray migrate old.graph.json --output .archray/graph.v2.json');
  }
  const graph = assertValid(migrateV1(readJson(path)));
  writeOutput(flag(args, 'output', '.archray/graph.v2.json'), json(graph), args, path);
}

function cmdBuild(args: Args): void {
  const input = flag(args, 'input', args.positional[0] ?? '.archray/graph.json');
  const output = flag(args, 'output', '.archray/index.html');
  guard(output, input, args);

  const graph = assertValid(readJson(input)) as ArchGraph;
  const viewPath = has(args, 'view') ? flag(args, 'view', '') : undefined;
  const view = viewPath ? (assertValid(readJson(viewPath), true) as ViewState) : undefined;
  if (viewPath && identity(output) === identity(viewPath)) {
    throw new Error(`Refusing to write output over the view input: ${output}.\nChoose a different --output.`);
  }

  const layerArg = has(args, 'layers') ? flag(args, 'layers', '') : undefined;
  let layers: string[] = [];
  if (layerArg !== undefined) {
    const parsed = parseGraphLayers(graph, layerArg);
    if (parsed.unknown.length) {
      throw new Error(
        `Unknown layer: ${parsed.unknown.join(', ')}.\n` +
        `This graph has: ${graphLayers(graph).join(', ')}.\n` +
        `Omit --layers to show all layers; aliases such as 前端, 数据 also work.`,
      );
    }
    layers = parsed.layers;
    if (!layers.length) console.error('Layer filter is empty; showing all layers.');
  }
  const styleKey = has(args, 'style') ? flag(args, 'style', '').toLowerCase() : undefined;
  const STYLES: Record<string, string> = {
    tech: 'midnight', dark: 'midnight', midnight: 'midnight', blueprint: 'blueprint', glass: 'glass', paper: 'paper', light: 'paper',
  };
  const theme = styleKey === undefined ? undefined : STYLES[styleKey];
  if (styleKey !== undefined && !theme) {
    throw new Error(`Unknown style: ${styleKey}.\nUse tech, blueprint, glass or paper.`);
  }
  const langArg = has(args, 'lang') ? flag(args, 'lang', '') : undefined;
  let locale: string | undefined;
  if (langArg !== undefined) {
    if (!graph.meta.locales.includes(langArg)) {
      throw new Error(`Language ${langArg} is not in this graph (${graph.meta.locales.join(', ')}).`);
    }
    locale = langArg;
  }

  const motionArg = has(args, 'motion') ? flag(args, 'motion', '').toLowerCase() : undefined;
  const MOTIONS = ['full', 'calm', 'off'] as const;
  if (motionArg !== undefined && !(MOTIONS as readonly string[]).includes(motionArg)) {
    throw new Error(`Unknown motion: ${motionArg}.\nUse full, calm or off.`);
  }
  const motion = motionArg as ViewState['motion'] | undefined;

  const merged: ViewState | undefined = view || layerArg !== undefined || theme !== undefined || locale !== undefined || motion !== undefined
    ? {
        ...(view ?? { viewVersion: '1' as const }),
        ...(layerArg !== undefined ? { layers } : {}),
        ...(theme ? { theme: theme as ViewState['theme'] } : {}),
        ...(locale ? { locale } : {}),
        ...(motion ? { motion } : {}),
      }
    : undefined;
  if (merged) assertValid(merged, true);

  const viewerPath = resolve(root, 'viewer/dist/viewer.html');
  if (!existsSync(viewerPath)) {
    throw new Error(`Viewer build not found: ${viewerPath}.\nRun "npm run build" in the ArchRay checkout first.`);
  }
  let html = readFileSync(viewerPath, 'utf8');
  const embed = (value: unknown) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const name = graph.meta.name;
  const title = typeof name === 'string' ? name : Object.values(name)[0] ?? 'ArchRay';
  const escapedTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Replacement callbacks keep $&, $` and $' in user text literal instead of treating them as patterns.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapedTitle} — ArchRay</title>`);
  html = html.replace('</head>', () => `<script>window.__ARCHRAY_DATA__=${embed(graph)};${merged ? `window.__ARCHRAY_VIEW__=${embed(merged)};` : ''}</script></head>`);
  writeOutput(output, html, args, input);

  if (!has(args, 'no-open')) openInBrowser(resolve(output));
}

function openInBrowser(path: string): void {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  const child = spawn(opener, [path], { stdio: 'ignore', detached: true });
  child.on('error', (e) => console.error(`Open manually: ${path} (${e.message})`));
  child.unref();
}

function main(argv: string[]): void {
  const args = parseArgs(argv);
  switch (args.command) {
    case undefined:
    case 'version':
      cmdVersion();
      break;
    case 'doctor':
      cmdDoctor();
      break;
    case 'help':
    case '--help':
    case '-h':
      process.stdout.write(HELP);
      break;
    case 'validate':
      cmdValidate(args);
      break;
    case 'schema':
      cmdSchema(args);
      break;
    case 'init':
      cmdInit(args);
      break;
    case 'install':
      cmdInstall(args);
      break;
    case 'migrate':
      cmdMigrate(args);
      break;
    case 'build':
      cmdBuild(args);
      break;
    default:
      throw new Error(`Unknown command: ${args.command}.\nRun "archray help" to see available commands.`);
  }
}

try {
  main(process.argv.slice(2));
} catch (e: any) {
  console.error(e.message);
  process.exitCode = 1;
}
