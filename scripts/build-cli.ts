import { build } from 'esbuild';
await build({ entryPoints: ['cli/src/main.ts'], outfile: 'cli/bin/archray.mjs', bundle: true, platform: 'node', format: 'esm', target: 'node20', banner: { js: '#!/usr/bin/env node' } });
