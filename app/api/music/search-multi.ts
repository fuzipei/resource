import {searchAt38} from './at38';
import {rankSearchResults,type SearchResult,type SearchItem as Item} from './search-ranking';

const numeric=(value:unknown)=>/^\d{1,18}$/.test(String(value||''));
const clean=(value:unknown,fallback:string)=>String(value||fallback).slice(0,200);
const cover=(value:unknown)=>{try{const u=new URL(String(value||'').replace(/^http:/,'https:'));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}};
const cache=new Map<string,{until:number;value:SearchResult}>();
async function data(url:string,signal:AbortSignal){const r=await fetch(url,{signal,headers:{Accept:'application/json'},redirect:'manual'});if(!r.ok)throw Error('Search source unavailable');const body=await r.text();if(body.length>1000000)throw Error('Search source response too large');return JSON.parse(body) as any}
async function qq(q:string,page:number,signal:AbortSignal):Promise<SearchResult>{
 const j=await data('https://c.y.qq.com/soso/fcgi-bin/client_search_cp?'+new URLSearchParams({format:'json',p:String(page),n:'20',w:q,perpage:'20',ct:'24'}),signal);
 if(j.code!==0||!Array.isArray(j.data?.song?.list))throw Error('QQ search unavailable');
 const songs=j.data.song.list;
 return {items:songs.filter((s:any)=>/^[a-zA-Z0-9]{8,32}$/.test(String(s.songmid||''))&&s.songname).map((s:any):Item=>{const seconds=Number(s.interval)||0;return {id:'qq_'+s.songmid,provider:'at38',title:clean(s.songname,'未命名歌曲'),artist:clean((s.singer||[]).map((a:any)=>a.name).join(' / '),'未知艺人'),album:clean(s.albumname,'单曲'),cover:/^[a-zA-Z0-9]{8,32}$/.test(String(s.albummid||''))?'https://y.gtimg.cn/music/photo_new/T002R300x300M000'+s.albummid+'.jpg':'',durationMs:seconds*1000,duration:seconds?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:''}}),hasMore:Number(j.data.song.totalnum)>page*20};
}
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
 const completed:(SearchResult|null|undefined)[]=Array(5);
 const sources:(()=>Promise<SearchResult>)[]=[()=>qq(q,page,signal),async()=>(await searchAt38(q,page,signal)) as SearchResult,()=>coco(q,page,signal),()=>gd(q,page,signal),()=>netease(q,page,signal)];
 const tasks=sources.map((source,i)=>source().then(value=>(completed[i]=value)).catch(()=>(completed[i]=null)));
 try{
  // A fast NetEase response alone can contain only covers. Let the independent
  // QQ catalog finish within the same 4.5-second deadline before ranking.
  let first=-1;
  try{first=await Promise.any(tasks.map((task,i)=>task.then(value=>{if(!value?.items.length)throw Error('Empty search');return i})))}catch{}
  if(first<0){if(completed.some(value=>value!==null))return {items:[],hasMore:false};throw Error('所有搜索来源暂时不可用')}
  if(first!==0&&completed[0]===undefined)await tasks[0];
  const available=completed.flatMap(value=>value?[value]:[]);
  if(requestSignal?.aborted)throw Error('Search cancelled');
  const items=rankSearchResults(q,available);
  const value={items,hasMore:available.some(r=>r.hasMore)};
  if(cache.size>=80)cache.delete(cache.keys().next().value!);
  cache.set(cacheKey,{value,until:Date.now()+(completed[0]===null?10000:items.length?90000:30000)});
  return value;
 }finally{controller.abort()}
}
