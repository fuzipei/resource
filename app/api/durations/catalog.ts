const cache=new Map<string,{ms:number;until:number}>();
const pending=new Map<string,Promise<void>>();
// Share catalog requests between the duration endpoint and parallel audio sources.
export async function neteaseDurations(ids:string[]):Promise<Record<string,number>>{
 const unique=[...new Set(ids)].filter(id=>/^\d{1,16}$/.test(id));
 const missing=unique.filter(id=>!pending.has(id)&&!(cache.get(id)?.until!>Date.now()));
 if(missing.length){
  const task=(async()=>{
   const signal=AbortSignal.timeout(6500);
   const urls=[
    'https://music.163.com/api/v3/song/detail?'+new URLSearchParams({c:JSON.stringify(missing.map(id=>({id:Number(id)})))}),
    'https://music.163.com/api/song/detail/?'+new URLSearchParams({ids:JSON.stringify(missing.map(Number))})
   ];
   for(const url of urls){
    try{const r=await fetch(url,{signal});if(!r.ok)continue;const j=await r.json() as {code?:number;songs?:{id:number;dt?:number;duration?:number}[]};
     if(j.code!==200||!Array.isArray(j.songs))continue;
     for(const song of j.songs){const id=String(song.id),ms=Number(song.dt||song.duration);if(missing.includes(id)&&Number.isFinite(ms)&&ms>0){if(cache.size>=2000)cache.delete(cache.keys().next().value!);cache.set(id,{ms,until:Date.now()+86400000})}}
     if(missing.every(id=>cache.get(id)?.until!>Date.now()))break;
    }catch{if(signal.aborted)break;}
   }
  })().finally(()=>{for(const id of missing)pending.delete(id)});
  for(const id of missing)pending.set(id,task);
 }
 await Promise.all(unique.map(id=>pending.get(id)));
 return Object.fromEntries(unique.flatMap(id=>{const hit=cache.get(id);return hit&&hit.until>Date.now()?[[id,hit.ms]]:[]}));
}
