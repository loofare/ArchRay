import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'archray-cli-'));const cli=resolve('cli/bin/archray.mjs');
const run=(args,ok=true)=>{const r=spawnSync(process.execPath,[cli,...args],{cwd:dir,encoding:'utf8'});assert.equal(r.status,ok?0:1,r.stderr);return r;};
run(['init']);assert.deepEqual(readdirSync(dir),['.archray']);const skill=readFileSync(join(dir,'.archray/SKILL.md'),'utf8');run(['init'],false);assert.equal(readFileSync(join(dir,'.archray/SKILL.md'),'utf8'),skill);
const g=JSON.parse(readFileSync('examples/freshmart.graph.json'));g.meta.name="literal $& $` $' </script><script>globalThis.INJECTED=true</script>";writeFileSync(join(dir,'graph.json'),JSON.stringify(g));run(['validate','graph.json']);run(['build','graph.json','--no-open']);const html=readFileSync(join(dir,'.archray/index.html'),'utf8');assert.ok(html.includes('literal $&amp; $`'));const data=html.match(/window\.__ARCHRAY_DATA__=(.*?);<\/script>/);assert.ok(data);assert.deepEqual(JSON.parse(data[1]),g);run(['build','graph.json','--no-open'],false);run(['build','graph.json','--output','graph.json','--force','--no-open'],false);symlinkSync(join(dir,'graph.json'),join(dir,'alias.json'));run(['build','graph.json','--output','alias.json','--force','--no-open'],false);assert.deepEqual(JSON.parse(readFileSync(join(dir,'graph.json'))),g);run(['schema','view']);run(['build','graph.json','--force','--no-open']);console.log('CLI regression passed:',dir);
