import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
await build({
  entryPoints: ['cli/src/main.ts'],
  outfile: 'cli/bin/archray.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },
  define: { __ARCHRAY_VERSION__: JSON.stringify(version) },
});
