import { writeFileSync } from 'node:fs';
import { Graph, ViewState } from '../core/src/schema';
const out = (p: string, s: unknown) => writeFileSync(new URL(p, import.meta.url), JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', ...(s as object) }, null, 2) + '\n');
out('../schema/graph.schema.json', Graph);
out('../schema/view.schema.json', ViewState);
console.log('✓ schema/graph.schema.json, schema/view.schema.json');
