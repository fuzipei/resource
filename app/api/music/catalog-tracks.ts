// Recover catalog metadata without discarding valid tracks on partial upstream failures.
export async function catalogTracks(ids:string[],signal?:AbortSignal):Promise<any[]>{
 const wanted=[...new Set(ids)].filter(id=>/^\d{1,18}$/.test(id)).slice(0,200),found=new Map<string,any>();
 if(!wanted.length)return [];
 const timeout=AbortSignal.timeout(10000),requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
 for(const version of ['v3','legacy']){
  const missing=wanted.filter(id=>!found.has(id));if(!missing.length||requestSignal.aborted)break;
  const path=version==='v3'?'/api/v3/song/detail?'+new URLSearchParams({c:JSON.stringify(missing.map(id=>({id:Number(id)})))}):'/api/song/detail/?'+new URLSearchParams({ids:JSON.stringify(missing.map(Number))});
  try{const response=await fetch('https://music.163.com'+path,{signal:requestSignal,redirect:'manual'});if(!response.ok)continue;
   const data=await response.json();if(data.code!==200||!Array.isArray(data.songs))continue;
   for(const track of data.songs)if(wanted.includes(String(track.id))&&typeof track.name==='string')found.set(String(track.id),track);
  }catch{if(requestSignal.aborted)break}
 }
 return wanted.flatMap(id=>found.has(id)?[found.get(id)]:[]);
}
