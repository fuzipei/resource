// Public recommendation data only: never cache account responses or audio here.
const edge=()=> (globalThis as unknown as {caches?:{default?:Cache}}).caches?.default;
const cacheKey=(name:string)=>new Request('https://resonance-cache.invalid/recommendations/v2/'+name);
export async function readRecommendationCache<T>(name:string):Promise<T|undefined>{
 try{return await (await edge()?.match(cacheKey(name)))?.json() as T|undefined}catch{return undefined}
}
export async function saveRecommendationCache(name:string,value:unknown){
 try{await edge()?.put(cacheKey(name),Response.json(value,{headers:{'Cache-Control':'public, max-age=86400'}}))}catch{/* Cache availability must not block recommendations. */}
}
export async function recommendationJson(paths:string[],valid:(data:any)=>boolean,signal?:AbortSignal):Promise<any>{
 for(const path of paths){
  if(signal?.aborted)throw signal.reason;
  const controller=new AbortController(),abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,3500);
  try{
   const response=await fetch('https://music.163.com'+path,{signal:controller.signal,redirect:'manual',headers:{Accept:'application/json',Referer:'https://music.163.com/'}});
   if(!response.ok){await response.body?.cancel();continue}
   const data=await response.json();if(valid(data))return data;
  }catch{if(signal?.aborted)throw signal.reason}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
 }
 throw Error('推荐来源暂时无法响应，请稍后重试');
}
export async function recommendationPlaylist(id:string,limit:number,signal?:AbortSignal){
 if(!/^\d{1,18}$/.test(id))throw Error('歌单编号无效');
 const params=new URLSearchParams({id,n:String(limit),s:'0'});
 const data=await recommendationJson(['/api/v6/playlist/detail?'+params,'/api/v3/playlist/detail?'+params,'/api/playlist/detail?'+params],j=>{
  const p=j.playlist||j.result;
  return j.code===200&&p&&((Array.isArray(p.tracks)&&p.tracks.length>0)||(Array.isArray(p.trackIds)&&p.trackIds.length>0)||p.trackCount===0);
 },signal);
 const p=data.playlist||data.result;
 // Legacy responses use artists/album/duration. Keep one shape for charts, curated and imports.
 return {...data,playlist:{...p,tracks:(p.tracks||[]).map((t:any)=>({...t,ar:t.ar||t.artists||[],al:t.al||t.album||{},dt:t.dt||t.duration||0}))}};
}
