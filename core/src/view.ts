import { validateView } from './validate';
import type { ArchGraph,ViewState } from './schema';
/** Recover supported view fields independently so one stale value cannot hide the graph. */
export function parseView(input:unknown, graph:ArchGraph):{view:ViewState;warnings:string[]} {
 const view:ViewState={viewVersion:'1'};const warnings:string[]=[];
 if(!input || typeof input!=='object' || Array.isArray(input)) return {view,warnings:['invalid:view']};
 const source=input as Record<string,unknown>;
 for(const key of ['locale','theme','projection','lens','focus','collapsed','scenario','camera'] as const) {
  if(source[key]===undefined)continue;
  const test={viewVersion:'1',[key]:source[key]};
  if(!validateView(test).ok){warnings.push(`invalid:${key}`);continue;}
  (view as any)[key]=source[key];
 }
 const ids=new Set(graph.nodes.map(n=>n.id));
 if(view.locale && !graph.meta.locales.includes(view.locale)){delete view.locale;warnings.push('stale:locale');}
 if(view.focus && !ids.has(view.focus)){delete view.focus;warnings.push('stale:focus');}
 if(view.scenario && !graph.scenarios?.some(s=>s.id===view.scenario)){delete view.scenario;warnings.push('stale:scenario');}
 if(view.collapsed){const kept=view.collapsed.filter(id=>ids.has(id));if(kept.length!==view.collapsed.length)warnings.push('stale:collapsed');view.collapsed=kept;}
 if(['hidden','pinned'].some(k=>source[k]!==undefined))warnings.push('reserved:view');
 return {view,warnings};
}
