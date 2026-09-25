import {catalogTracks} from '../music/catalog-tracks';
import {entityName,splitArtists,type MusicEntity,type EntityKind} from '../../music-entity-types';
import type {Song} from '../../music-types';
class EntityError extends Error{constructor(message:string,public status=503){super(message)}}
const cache=new Map<string,{until:number;value:MusicEntity}>();
const numeric=(id:unknown)=>/^\d{1,18}$/.test(String(id||''));
const picture=(value:unknown)=>{try{const u=new URL(String(value||''));if(!/^p\d+\.music\.126\.net$/.test(u.hostname)||!['http:','https:'].includes(u.protocol))return '';u.protocol='https:';return u.href}catch{return ''}};
async function json(path:string,signal:AbortSignal){const r=await fetch('https://music.163.com'+path,{signal,headers:{Accept:'application/json'}});if(!r.ok)throw new EntityError('音乐资料暂时无法加载，请稍后重试');const j=await r.json() as any;if(j.code&&j.code!==200)throw new EntityError('资料来源暂时无法访问，请稍后重试',j.code===404?404:503);return j}
const artists=(s:any)=>s.artists||s.ar||[];
const album=(s:any)=>s.album||s.al||{};
function song(s:any):Song{const a=album(s),ms=Number(s.duration||s.dt)||0;return {id:'wy_'+s.id,provider:'at38',title:String(s.name||''),artist:artists(s).map((a:any)=>a.name).join(' / '),album:String(a.name||''),cover:picture(a.picUrl),durationMs:ms,duration:ms?Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0'):''}}
async function resolve(p:URLSearchParams,kind:EntityKind,signal:AbortSignal){
 const direct=p.get('id');if(direct){if(!numeric(direct))throw new EntityError('音乐资料编号无效',400);return direct}
 const source=p.get('songId')||'',title=p.get('title')||'',artist=p.get('artist')||'',albumName=p.get('album')||'',name=p.get('name')||'';
 if(!title||!artist||!name||[source,title,artist,albumName,name].some(v=>v.length>300))throw new EntityError('缺少歌曲资料',400);
 // A song search can rank covers above the original recording. Resolve an artist
 // by the clicked name first, then use the song as a fallback for ambiguous names.
 if(kind==='artist'){
  try{
   const j=await json('/api/search/get/web?'+new URLSearchParams({s:name,type:'100',limit:'30'}),signal);
   const exact=(j.result?.artists||[]).find((a:any)=>entityName(a.name||'')===entityName(name)&&numeric(a.id));
   if(exact)return String(exact.id);
  }catch{/* The track lookup below can still resolve this artist. */}
 }
 let tracks:any[]=[];
 if(/^wy_\d{1,18}$/.test(source)){tracks=await catalogTracks([source.slice(3)],signal)}
 else{const j=await json('/api/search/get/web?'+new URLSearchParams({s:title+' '+artist,type:'1',limit:'100'}),signal);tracks=j.result?.songs||[]}
 const matches=tracks.filter(t=>entityName(t.name||'')===entityName(title)&&splitArtists(artist).every(a=>artists(t).some((b:any)=>entityName(b.name||'')===entityName(a))));
 matches.sort((a,b)=>Number(entityName(album(b).name||'')===entityName(albumName))-Number(entityName(album(a).name||'')===entityName(albumName)));
 for(const t of matches){const entity=kind==='album'?(entityName(album(t).name||'')===entityName(name)?album(t):null):artists(t).find((a:any)=>entityName(a.name||'')===entityName(name));if(entity&&numeric(entity.id))return String(entity.id)}
 throw new EntityError('未找到与这首歌对应的'+(kind==='artist'?'歌手':'专辑')+'资料',404);
}
export async function GET(request:Request){
 try{const p=new URL(request.url).searchParams,kind=p.get('kind');if(kind!=='artist'&&kind!=='album')throw new EntityError('资料类型无效',400);
  const queryKey='query:'+p.toString(),queryHit=cache.get(queryKey);if(queryHit&&queryHit.until>Date.now())return Response.json(queryHit.value);
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(18000)]),id=await resolve(p,kind,signal),key=kind+':'+id,hit=cache.get(key);if(hit&&hit.until>Date.now())return Response.json(hit.value);
  const data=await json(kind==='album'?'/api/v1/album/'+id:'/api/artist/'+id,signal),entity=data[kind];if(!entity)throw new EntityError('资料不存在或暂时不可访问',404);
  const tracks=(kind==='artist'?data.hotSongs:data.songs||entity.songs)||[];
  const valid=tracks.filter((s:any)=>numeric(s.id)&&s.name),seen=new Set<string>();
  const result:MusicEntity={kind,id,name:String(entity.name||''),cover:picture(entity.picUrl||entity.img1v1Url||entity.blurPicUrl),description:String(entity.briefDesc||entity.description||'').replace(/<[^>]*>/g,'').slice(0,3000),published:kind==='album'?entity.publishTime:undefined,artists:kind==='album'?(entity.artists||[entity.artist]).filter((a:any)=>a&&numeric(a.id)).map((a:any)=>({id:String(a.id),name:String(a.name||'')})):[],albums:[],songs:valid.slice(0,500).map(song),total:Number(kind==='album'?entity.size:entity.musicSize)||valid.length};
  if(kind==='artist')result.albums=valid.flatMap((s:any)=>{const a=album(s),id=String(a.id||'');if(!numeric(id)||seen.has(id))return [];seen.add(id);return [{id,name:String(a.name||''),cover:picture(a.picUrl)}]}).slice(0,12);
  while(cache.size>=99)cache.delete(cache.keys().next().value!);const entry={value:result,until:Date.now()+300000};cache.set(key,entry);cache.set(queryKey,entry);return Response.json(result);
 }catch(e){return Response.json({error:e instanceof EntityError?e.message:'音乐资料加载失败，请稍后重试'},{status:e instanceof EntityError?e.status:503})}
}
