import {searchAt38} from './at38';

type Item={id:string;provider:'at38';title:string;artist:string;album:string;cover:string;duration:string};
type SearchResult={items:Item[];hasMore:boolean};
const numeric=(value:unknown)=>/^\d{1,18}$/.test(String(value||''));
const clean=(value:unknown,fallback:string)=>String(value||fallback).slice(0,200);
const cover=(value:unknown)=>{try{const u=new URL(String(value||'').replace(/^http:/,'https:'));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}};
const cache=new Map<string,{until:number;value:SearchResult}>();
async function data(url:string,signal:AbortSignal){const r=await fetch(url,{signal,headers:{Accept:'application/json'},redirect:'manual'});if(!r.ok)throw Error('Search source unavailable');const body=await r.text();if(body.length>1000000)throw Error('Search source response too large');return JSON.parse(body) as any}
async function coco(q:string,page:number,signal:AbortSignal):Promise<SearchResult>{
 const j=await data('https://cocodownloader.markqq.com/api/search?'+new URLSearchParams({q,provider:'netease',limit:'20',offset:String((page-1)*20)}),signal);
 const songs=Array.isArray(j.items)?j.items:[];
 return {items:songs.filter((s:any)=>numeric(s?.id)).map((s:any)=>({id:'wy_'+s.id,provider:'at38' as const,title:clean(s.title,'未命名歌曲'),artist:clean(s.artist,'未知艺人'),album:clean(s.album,'单曲'),cover:cover(s.cover),duration:clean(s.duration,'')})),hasMore:songs.length===20};
}
async function gd(q:string,page:number,signal:AbortSignal):Promise<SearchResult>{
 const j=await data('https://music-api.gdstudio.xyz/api.php?'+new URLSearchParams({types:'search',source:'netease',name:q,count:'20',pages:String(page)}),signal);
 const songs=Array.isArray(j)?j:[];
 return {items:songs.filter((s:any)=>numeric(s?.id)).map((s:any)=>({id:'wy_'+s.id,provider:'at38' as const,title:clean(s.name,'未命名歌曲'),artist:clean(Array.isArray(s.artist)?s.artist.join(' / '):s.artist,'未知艺人'),album:clean(s.album,'单曲'),cover:'',duration:''})),hasMore:songs.length===20};
}
async function netease(q:string,page:number,signal:AbortSignal):Promise<SearchResult>{
 const j=await data('https://music.163.com/api/search/get/web?'+new URLSearchParams({s:q,type:'1',limit:'20',offset:String((page-1)*20)}),signal);
 const songs=Array.isArray(j.result?.songs)?j.result.songs:[];
 return {items:songs.filter((s:any)=>numeric(s?.id)).map((s:any)=>({id:'wy_'+s.id,provider:'at38' as const,title:clean(s.name,'未命名歌曲'),artist:clean((s.artists||s.ar||[]).map((a:any)=>a.name).join(' / '),'未知艺人'),album:clean(s.album?.name||s.al?.name,'单曲'),cover:cover(s.album?.picUrl||s.al?.picUrl),duration:s.duration?`${Math.floor(s.duration/60000)}:${String(Math.floor(s.duration/1000)%60).padStart(2,'0')}`:''})),hasMore:songs.length===20};
}
export async function searchMulti(q:string,page:number,requestSignal?:AbortSignal):Promise<SearchResult>{
 const cacheKey=q.normalize('NFKC').toLowerCase()+':'+page,hit=cache.get(cacheKey);
 if(hit&&hit.until>Date.now())return hit.value;
 const controller=new AbortController();
 const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(4500),...(requestSignal?[requestSignal]:[])]);
 const completed:(SearchResult|null|undefined)[]=Array(4);
 const sources:(()=>Promise<SearchResult>)[]=[async()=>(await searchAt38(q,page,signal)) as SearchResult,()=>coco(q,page,signal),()=>gd(q,page,signal),()=>netease(q,page,signal)];
 const tasks=sources.map((source,i)=>source().then(value=>(completed[i]=value)).catch(()=>(completed[i]=null)));
 try{
  // Return as soon as one catalog has songs. Give 51 Music a short chance to
  // join a faster backup because it includes results from several platforms.
  let first=-1;
  try{first=await Promise.any(tasks.map((task,i)=>task.then(value=>{if(!value?.items.length)throw Error('Empty search');return i})))}catch{}
  if(first<0){if(completed.some(value=>value!==null))return {items:[],hasMore:false};throw Error('所有搜索来源暂时不可用')}
  if(first!==0&&completed[0]===undefined)await Promise.race([tasks[0],new Promise(resolve=>setTimeout(resolve,650))]);
  const available=completed.flatMap(value=>value?[value]:[]);
  const lists=available.map(result=>result.items);
 const seen=new Set<string>(),seenIds=new Set<string>(),items:Item[]=[];
 for(let offset=0;items.length<20&&lists.some(l=>offset<l.length);offset++)for(const list of lists){
  const item=list[offset];if(!item)continue;
  const key=(item.title+'|'+item.artist).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  if(seen.has(key)||seenIds.has(item.id))continue;seen.add(key);seenIds.add(item.id);items.push(item);if(items.length===20)break;
 }
  const value={items,hasMore:available.some(r=>r.hasMore)};
  if(cache.size>=80)cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,{value,until:Date.now()+(items.length?90000:30000)});
  return value;
 }finally{controller.abort()}
}
