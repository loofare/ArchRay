import { existsSync, readFileSync, mkdirSync, realpathSync, statSync, lstatSync, openSync, closeSync, writeFileSync, renameSync, unlinkSync, linkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { validateGraph, validateView } from '../../core/src/validate';
import { migrateV1 } from '../../core/src/migrate';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), command = args.shift();
const flags: Record<string,string|boolean> = {}; const positional: string[] = [];
while (args.length) { const a = args.shift()!; if (a.startsWith('--')) { const k=a.slice(2); flags[k]=args[0] && !args[0].startsWith('--') ? args.shift()! : true; } else positional.push(a); }
const flag = (k:string,d:string) => typeof flags[k]==='string' ? flags[k] as string : d;
const read = (p:string) => JSON.parse(readFileSync(p,'utf8'));
function valid(g:unknown, view=false) { const r=(view?validateView:validateGraph)(g); if(!r.ok) throw Error(r.errors.map(e=>`${e.path}: ${e.message}`).join('\n')); return g as any; }
function identity(p:string):string { const a=resolve(p); if(existsSync(a)) return realpathSync(a); return resolve(identity(dirname(a)),a.slice(dirname(a).length+1)); }
function guard(p:string, input?:string) {
 if(input && (identity(p)===identity(input) || (existsSync(p)&&existsSync(input)&&statSync(p).ino===statSync(input).ino&&statSync(p).dev===statSync(input).dev))) throw Error('Input and output must be different files');
 let present=false; try { const s=lstatSync(p); present=true; if(s.isSymbolicLink()) throw Error(`Refusing symbolic-link output: ${p}`); } catch(e:any) { if(e.code!=='ENOENT') throw e; }
 if(present && !flags.force) throw Error(`File exists: ${p}; use --force to replace it`);
}
function write(p:string, data:string, input?:string) { p=resolve(p); guard(p,input); mkdirSync(dirname(p),{recursive:true}); const tmp=`${p}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`; try { const fd=openSync(tmp,'wx'); try{writeFileSync(fd,data);}finally{closeSync(fd);} if(flags.force) { guard(p,input); renameSync(tmp,p); } else { linkSync(tmp,p); unlinkSync(tmp); } } finally { if(existsSync(tmp)) unlinkSync(tmp); } console.log(p); }
const json = (g:unknown)=>JSON.stringify(g,null,2)+'\n';
try {
 switch(command) {
 case undefined: case 'help': case '--help': case '-h': console.log('ArchRay v2 (source trial)\nvalidate [graph]\nbuild [graph] [--input graph] [--output .archray/index.html] [--view view.json] [--no-open] [--force]\nmigrate <v1.json> [--output .archray/graph.v2.json] [--force]\nschema [graph|view] [--output file] [--force]\ninit [--target directory] [--agent claude|cursor|antigravity|all] [--force]'); break;
 case 'validate': {const p=positional[0]??'.archray/graph.json';valid(read(p));console.log(`Valid v2 graph: ${p}`);break;}
 case 'schema': {const p=resolve(root,`schema/${positional[0]==='view'?'view':'graph'}.schema.json`);const data=readFileSync(p,'utf8');if(flags.output)write(flag('output',''),data);else process.stdout.write(data);break;}
 case 'init': {const target=resolve(flag('target','.'));const files=[['schema/graph.schema.json','.archray/graph.schema.json'],['schema/view.schema.json','.archray/view.schema.json'],['skill/SKILL.md','.archray/SKILL.md']];const agent=flag('agent','none');if(!['none','claude','cursor','antigravity','all'].includes(agent))throw Error('Unknown agent');for(const [a,d] of [['claude','.claude/skills/archray/SKILL.md'],['cursor','.cursor/rules/archray.mdc'],['antigravity','.agent/skills/archray/SKILL.md']])if(agent===a||agent==='all')files.push(['skill/SKILL.md',d]);const planned=files.map(([src,dst])=>({path:resolve(target,dst),data:readFileSync(resolve(root,src),'utf8')}));for(const f of planned)guard(f.path);for(const f of planned)write(f.path,f.data);break;}
 case 'migrate': {const p=positional[0];if(!p)throw Error('migrate requires a v1 file');const g=migrateV1(read(p));valid(g);write(flag('output','.archray/graph.v2.json'),json(g),p);break;}
 case 'build': {const p=flag('input',positional[0]??'.archray/graph.json');const out=flag('output','.archray/index.html');guard(out,p);const g=valid(read(p));const view=flags.view?valid(read(flag('view','')),true):undefined;if(flags.view&&identity(out)===identity(flag('view','')))throw Error('Output must differ from view input');let html=readFileSync(resolve(root,'viewer/dist/viewer.html'),'utf8');const safe=(v:unknown)=>JSON.stringify(v).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');const title=typeof g.meta.name==='string'?g.meta.name:Object.values(g.meta.name)[0];const escaped=String(title).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');html=html.replace(/<title>[\s\S]*?<\/title>/i,()=>`<title>${escaped} — ArchRay</title>`);html=html.replace('</head>',()=>`<script>window.__ARCHRAY_DATA__=${safe(g)};${view?`window.__ARCHRAY_VIEW__=${safe(view)};`:''}</script></head>`);write(out,html,p);if(!flags['no-open']){const c=spawn(process.platform==='darwin'?'open':process.platform==='win32'?'explorer':'xdg-open',[resolve(out)],{stdio:'ignore',detached:true});c.on('error',e=>console.error(`Open manually: ${out} (${e.message})`));c.unref();}break;}
 default: throw Error(`Unknown command: ${command}`);
 }
} catch(e:any) { console.error(e.message); process.exitCode=1; }
