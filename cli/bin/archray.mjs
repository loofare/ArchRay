#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, '..', '..');

const VALID_KINDS = new Set([
  'client',
  'gateway',
  'service',
  'worker',
  'database',
  'cache',
  'queue',
  'storage',
  'external-api',
  'ai-model',
]);

const VALID_STATUSES = new Set([
  'healthy',
  'bottleneck',
  'high-complexity',
  'planned',
  'deprecated',
]);

const VALID_PROTOCOLS = new Set([
  'http',
  'grpc',
  'ws',
  'amqp',
  'sql',
  'redis',
  'ipc',
  'llm-stream',
]);

const VALID_EDGE_STATUSES = new Set(['active', 'bottleneck', 'planned']);
const VALID_BANDWIDTHS = new Set(['low', 'medium', 'high']);
const VALID_FLOW_CATEGORIES = new Set(['core', 'async', 'evolution']);

function printHelp() {
  console.log(`
ArchRay CLI — AI-Driven 2.5D Living System Architecture Engine

Usage:
  archray init [--target <dir>] [--agent all|antigravity|claude|cursor]
      Mount ArchRay SKILL.md and archray.schema.json into a project repository.

  archray validate [path]
      Validate an ArchRay graph JSON file (default: .archray/graph.json).

  archray build [--input <path>] [--output <path>] [--no-open]
      Inject graph.json into the prebuilt 2.5D viewer and output a single-file HTML.
      Defaults: --input .archray/graph.json --output .archray/index.html

  archray help
      Show this help message.
`);
}

function parseFlags(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i++;
      }
    } else {
      positionals.push(token);
    }
  }
  return { positionals, flags };
}

function validateNodeSet(nodes, layerIds, errors, scopeLabel) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    errors.push(`${scopeLabel}: "nodes" must be a non-empty array.`);
    return new Set();
  }

  const nodeIds = new Set();
  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      errors.push(`${scopeLabel}: node entry must be an object.`);
      continue;
    }
    const id = node.id;
    if (typeof id !== 'string' || id.length === 0) {
      errors.push(`${scopeLabel}: every node requires a non-empty string "id".`);
      continue;
    }
    if (nodeIds.has(id)) {
      errors.push(`${scopeLabel}: duplicate node id "${id}".`);
    }
    nodeIds.add(id);

    for (const reqField of ['label', 'layerId', 'kind', 'status', 'description']) {
      if (typeof node[reqField] !== 'string' || node[reqField].length === 0) {
        errors.push(`${scopeLabel}: node "${id}" is missing string field "${reqField}".`);
      }
    }
    if (typeof node.layerId === 'string' && !layerIds.has(node.layerId)) {
      errors.push(`${scopeLabel}: node "${id}" references unknown layerId "${node.layerId}".`);
    }
    if (typeof node.kind === 'string' && !VALID_KINDS.has(node.kind)) {
      errors.push(`${scopeLabel}: node "${id}" has invalid kind "${node.kind}".`);
    }
    if (typeof node.status === 'string' && !VALID_STATUSES.has(node.status)) {
      errors.push(`${scopeLabel}: node "${id}" has invalid status "${node.status}".`);
    }
    if (!Array.isArray(node.techStack)) {
      errors.push(`${scopeLabel}: node "${id}" requires array "techStack".`);
    }
    if (!Array.isArray(node.sourcePaths)) {
      errors.push(`${scopeLabel}: node "${id}" requires array "sourcePaths".`);
    }

    if (node.children !== undefined) {
      if (!node.children || typeof node.children !== 'object') {
        errors.push(`${scopeLabel}: node "${id}.children" must be an object.`);
      } else {
        const childIds = validateNodeSet(
          node.children.nodes,
          layerIds,
          errors,
          `${scopeLabel} -> ${id}.children`
        );
        validateEdgeSet(
          node.children.edges,
          childIds,
          errors,
          `${scopeLabel} -> ${id}.children`
        );
      }
    }
  }
  return nodeIds;
}

function validateEdgeSet(edges, nodeIds, errors, scopeLabel) {
  if (!Array.isArray(edges)) {
    errors.push(`${scopeLabel}: "edges" must be an array.`);
    return new Set();
  }
  const edgeIds = new Set();
  for (const edge of edges) {
    if (!edge || typeof edge !== 'object') {
      errors.push(`${scopeLabel}: edge entry must be an object.`);
      continue;
    }
    if (typeof edge.id !== 'string' || edge.id.length === 0) {
      errors.push(`${scopeLabel}: every edge requires a non-empty string "id".`);
      continue;
    }
    if (edgeIds.has(edge.id)) {
      errors.push(`${scopeLabel}: duplicate edge id "${edge.id}".`);
    }
    edgeIds.add(edge.id);

    if (!nodeIds.has(edge.source)) {
      errors.push(`${scopeLabel}: edge "${edge.id}" references unknown source "${edge.source}".`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`${scopeLabel}: edge "${edge.id}" references unknown target "${edge.target}".`);
    }
    if (edge.protocol !== undefined && !VALID_PROTOCOLS.has(edge.protocol)) {
      errors.push(`${scopeLabel}: edge "${edge.id}" has invalid protocol "${edge.protocol}".`);
    }
    if (edge.status !== undefined && !VALID_EDGE_STATUSES.has(edge.status)) {
      errors.push(`${scopeLabel}: edge "${edge.id}" has invalid status "${edge.status}".`);
    }
    if (edge.bandwidth !== undefined && !VALID_BANDWIDTHS.has(edge.bandwidth)) {
      errors.push(`${scopeLabel}: edge "${edge.id}" has invalid bandwidth "${edge.bandwidth}".`);
    }
  }
  return edgeIds;
}

function validateGraph(graph) {
  const errors = [];
  if (!graph || typeof graph !== 'object') {
    return ['Root document must be a JSON object.'];
  }
  if (graph.version !== '1.0') {
    errors.push(`"version" must be "1.0" (received ${JSON.stringify(graph.version)}).`);
  }
  if (!graph.meta || typeof graph.meta !== 'object') {
    errors.push('"meta" object is required.');
  } else {
    if (typeof graph.meta.name !== 'string' || graph.meta.name.length === 0) {
      errors.push('"meta.name" must be a non-empty string.');
    }
    if (typeof graph.meta.description !== 'string') {
      errors.push('"meta.description" must be a string.');
    }
    if (typeof graph.meta.generatedAt !== 'string' || graph.meta.generatedAt.length === 0) {
      errors.push('"meta.generatedAt" must be an ISO-8601 timestamp string.');
    }
  }

  const layerIds = new Set();
  if (!Array.isArray(graph.layers) || graph.layers.length === 0) {
    errors.push('"layers" must be a non-empty array.');
  } else {
    for (const layer of graph.layers) {
      if (!layer || typeof layer !== 'object') {
        errors.push('Every layer must be an object.');
        continue;
      }
      if (typeof layer.id !== 'string' || layer.id.length === 0) {
        errors.push('Every layer requires a non-empty string "id".');
        continue;
      }
      if (layerIds.has(layer.id)) {
        errors.push(`Duplicate layer id "${layer.id}".`);
      }
      layerIds.add(layer.id);
      if (typeof layer.label !== 'string' || layer.label.length === 0) {
        errors.push(`Layer "${layer.id}" requires a non-empty string "label".`);
      }
      if (typeof layer.order !== 'number' || !Number.isInteger(layer.order) || layer.order < 0) {
        errors.push(`Layer "${layer.id}" requires a non-negative integer "order".`);
      }
    }
  }

  const nodeIds = validateNodeSet(graph.nodes, layerIds, errors, 'root');
  const edgeIds = validateEdgeSet(graph.edges, nodeIds, errors, 'root');

  if (!Array.isArray(graph.flows)) {
    errors.push('"flows" must be an array.');
  } else {
    const flowIds = new Set();
    for (const flow of graph.flows) {
      if (!flow || typeof flow !== 'object') {
        errors.push('Every flow must be an object.');
        continue;
      }
      if (typeof flow.id !== 'string' || flow.id.length === 0) {
        errors.push('Every flow requires a non-empty string "id".');
        continue;
      }
      if (flowIds.has(flow.id)) {
        errors.push(`Duplicate flow id "${flow.id}".`);
      }
      flowIds.add(flow.id);
      if (typeof flow.name !== 'string' || flow.name.length === 0) {
        errors.push(`Flow "${flow.id}" requires a non-empty string "name".`);
      }
      if (flow.category !== undefined && !VALID_FLOW_CATEGORIES.has(flow.category)) {
        errors.push(`Flow "${flow.id}" has invalid category "${flow.category}".`);
      }
      if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
        errors.push(`Flow "${flow.id}" must contain at least 1 step.`);
      } else {
        for (const st of flow.steps) {
          if (!st || typeof st !== 'object') {
            errors.push(`Flow "${flow.id}" has a non-object step.`);
            continue;
          }
          if (typeof st.step !== 'number' || !Number.isInteger(st.step) || st.step < 1) {
            errors.push(`Flow "${flow.id}" has invalid step number ${st.step}.`);
          }
          if (!nodeIds.has(st.from)) {
            errors.push(`Flow "${flow.id}" step ${st.step} references unknown "from" node "${st.from}".`);
          }
          if (!nodeIds.has(st.to)) {
            errors.push(`Flow "${flow.id}" step ${st.step} references unknown "to" node "${st.to}".`);
          }
          if (st.edgeId !== undefined && !edgeIds.has(st.edgeId)) {
            errors.push(`Flow "${flow.id}" step ${st.step} references unknown edgeId "${st.edgeId}".`);
          }
          if (typeof st.action !== 'string' || st.action.length === 0) {
            errors.push(`Flow "${flow.id}" step ${st.step} requires a non-empty "action".`);
          }
          if (typeof st.payload !== 'string') {
            errors.push(`Flow "${flow.id}" step ${st.step} requires a string "payload".`);
          }
        }
      }
    }
  }

  return errors;
}

function cmdInit(flags) {
  const targetRoot = resolve(process.cwd(), typeof flags.target === 'string' ? flags.target : '.');
  const agent = typeof flags.agent === 'string' ? flags.agent : 'antigravity';

  const skillSrc = resolve(PACKAGE_ROOT, 'skill', 'SKILL.md');
  const schemaSrc = resolve(PACKAGE_ROOT, 'schema', 'archray.schema.json');

  if (!existsSync(skillSrc) || !existsSync(schemaSrc)) {
    console.error('Error: ArchRay skill/schema templates not found inside package:', PACKAGE_ROOT);
    process.exit(1);
  }

  const archrayDir = resolve(targetRoot, '.archray');
  mkdirSync(archrayDir, { recursive: true });
  const schemaDest = resolve(archrayDir, 'archray.schema.json');
  copyFileSync(schemaSrc, schemaDest);

  const mountedPaths = [schemaDest];

  if (agent === 'all' || agent === 'antigravity') {
    const agySkillDir = resolve(targetRoot, '.agent', 'skills', 'archray');
    mkdirSync(agySkillDir, { recursive: true });
    const dest = resolve(agySkillDir, 'SKILL.md');
    copyFileSync(skillSrc, dest);
    mountedPaths.push(dest);
  }

  if (agent === 'all' || agent === 'claude') {
    const claudeSkillDir = resolve(targetRoot, '.claude', 'skills', 'archray');
    mkdirSync(claudeSkillDir, { recursive: true });
    const dest = resolve(claudeSkillDir, 'SKILL.md');
    copyFileSync(skillSrc, dest);
    mountedPaths.push(dest);
  }

  if (agent === 'all' || agent === 'cursor') {
    const cursorDir = resolve(targetRoot, '.cursor', 'rules');
    mkdirSync(cursorDir, { recursive: true });
    const dest = resolve(cursorDir, 'archray.mdc');
    copyFileSync(skillSrc, dest);
    mountedPaths.push(dest);
  }

  console.log('✓ ArchRay Skill & Schema mounted successfully:');
  for (const p of mountedPaths) {
    console.log(`  - ${p}`);
  }
  console.log('\nNext step: Ask your AI agent:');
  console.log('  "Use the ArchRay skill to analyze this repository and generate .archray/graph.json"');
}

function loadAndValidateJson(inputPath) {
  const absInput = resolve(process.cwd(), inputPath);
  if (!existsSync(absInput)) {
    console.error(`Error: Input graph file not found: ${absInput}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absInput, 'utf8'));
  } catch (err) {
    console.error(`Error: Failed to parse JSON at ${absInput}:`, err.message);
    process.exit(1);
  }

  const errors = validateGraph(parsed);
  if (errors.length > 0) {
    console.error(`Validation failed for ${absInput} (${errors.length} error${errors.length > 1 ? 's' : ''}):`);
    for (const msg of errors) {
      console.error(`  ✗ ${msg}`);
    }
    process.exit(1);
  }

  return { absInput, graph: parsed };
}

function cmdValidate(positionals) {
  const targetPath = positionals[0] ?? '.archray/graph.json';
  const { absInput, graph } = loadAndValidateJson(targetPath);
  console.log(
    `✓ Valid ArchRay graph: ${absInput} (${graph.layers.length} layers, ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.flows.length} flows)`
  );
}

function openBrowser(filePath) {
  const platform = process.platform;
  if (platform === 'darwin') {
    const child = spawn('open', [filePath], { detached: true, stdio: 'ignore' });
    child.unref();
  } else if (platform === 'win32') {
    const child = spawn('cmd', ['/c', 'start', '', filePath], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const child = spawn('xdg-open', [filePath], { detached: true, stdio: 'ignore' });
    child.unref();
  }
}

function cmdBuild(flags) {
  const inputPath = typeof flags.input === 'string' ? flags.input : '.archray/graph.json';
  const outputPath = typeof flags.output === 'string' ? flags.output : '.archray/index.html';
  const noOpen = Boolean(flags['no-open']);

  const { graph } = loadAndValidateJson(inputPath);

  const viewerCandidates = [
    resolve(PACKAGE_ROOT, 'viewer', 'dist', 'viewer.html'),
    resolve(PACKAGE_ROOT, 'viewer', 'dist', 'index.html'),
  ];
  const viewerHtmlPath = viewerCandidates.find((p) => existsSync(p));

  if (!viewerHtmlPath) {
    console.error(
      'Error: Pre-built viewer bundle not found at viewer/dist/viewer.html.\nRun `npm run build:viewer` first.'
    );
    process.exit(1);
  }

  const templateHtml = readFileSync(viewerHtmlPath, 'utf8');
  const safeSerializedJson = JSON.stringify(graph)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  const injectionScript = `<script>window.__ARCHRAY_DATA__ = ${safeSerializedJson};</script>`;
  const safeTitle = String(graph.meta.name)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let finalHtml = templateHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${safeTitle} — ArchRay 2.5D Architecture</title>`
  );

  if (finalHtml.includes('</head>')) {
    finalHtml = finalHtml.replace('</head>', `${injectionScript}\n</head>`);
  } else if (finalHtml.includes('<script')) {
    finalHtml = finalHtml.replace('<script', `${injectionScript}\n<script`);
  } else {
    finalHtml = `${injectionScript}\n${finalHtml}`;
  }

  const absOutput = resolve(process.cwd(), outputPath);
  mkdirSync(dirname(absOutput), { recursive: true });
  writeFileSync(absOutput, finalHtml, 'utf8');

  console.log(`✓ Built self-contained ArchRay sandbox: ${absOutput}`);
  console.log(
    `  Project: ${graph.meta.name} | Layers: ${graph.layers.length} | Nodes: ${graph.nodes.length} | Flows: ${graph.flows.length}`
  );

  if (!noOpen) {
    openBrowser(absOutput);
    console.log('✓ Opened in default browser.');
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  const { positionals, flags } = parseFlags(args.slice(1));

  switch (command) {
    case 'init':
      cmdInit(flags);
      break;
    case 'validate':
      cmdValidate(positionals);
      break;
    case 'build':
      cmdBuild(flags);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main();
