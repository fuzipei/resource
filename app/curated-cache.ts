import {fetchJsonWithTimeout} from './fetch-with-timeout';
import {sceneCategories,moodCategories,genreCategories,type CuratedFeed,type CuratedPlaylist} from './curated-types';
const categories=[...new Set([...sceneCategories,...moodCategories,...genreCategories])];
const STORAGE='resonance-curated-public-v2';
let cached:{until:number;data:CuratedFeed}|undefined;
function validRows(rows:unknown):rows is CuratedPlaylist[]{return Array.isArray(rows)&&rows.length>0&&rows.every(p=>p&&typeof p.id==='string'&&/^\d{1,18}$/.test(p.id)&&typeof p.title==='string'&&typeof p.cover==='string')}
function merge(current:CuratedFeed|undefined,next:CuratedFeed):CuratedFeed{
 const groups:CuratedFeed['groups']={};
 for(const category of categories){const rows=next.groups[category],previous=current?.groups[category];groups[category]=validRows(rows)?rows.slice(0,8):validRows(previous)?previous.slice(0,8):[]}
 const missing=categories.filter(category=>!groups[category].length);
 return {...next,groups,missing,stale:!!next.stale||missing.length>0};
}
function saved():CuratedFeed|undefined{
 try{const value=JSON.parse(sessionStorage.getItem(STORAGE)||'null');if(value&&Date.now()-value.at<86400000&&value.data?.groups&&Array.isArray(value.data.newest))return merge(undefined,value.data)}catch{}
}
export const cachedCurated=()=>{
 if(!cached){const data=saved();if(data)cached={until:Date.now(),data}}
 return cached?.data||null;
};
export async function getCuratedCatalog(signal?:AbortSignal,refresh=false):Promise<CuratedFeed>{
 if(signal?.aborted)throw Error('Cancelled');const hit=cachedCurated();if(cached&&cached.until>Date.now()&&!refresh)return cached.data;
 const response=await fetchJsonWithTimeout<CuratedFeed>('/api/curated'+(refresh?'?refresh=1':''),{signal,cache:'no-store'},30000);
 if(!response.ok||!response.data?.groups||!Array.isArray(response.data.newest))throw Error('推荐歌单暂时未能加载');
 let data=merge(hit||undefined,response.data);
 // Repair only missing categories. A partial response must never erase useful public metadata.
 if(data.missing?.length){
  const pending=[...data.missing],deadline=AbortSignal.timeout(9000),repairSignal=signal?AbortSignal.any([signal,deadline]):deadline;
  await Promise.all(Array.from({length:Math.min(4,pending.length)},async()=>{while(pending.length&&!repairSignal.aborted){
   const category=pending.shift()!;
   try{const r=await fetchJsonWithTimeout<CuratedFeed>('/api/curated?category='+encodeURIComponent(category),{signal:repairSignal,cache:'no-store'},8000);if(r.ok&&validRows(r.data?.groups?.[category]))data={...data,groups:{...data.groups,[category]:r.data.groups[category]}}}catch{/* Other categories can still recover. */}
  }}));
  const missing=categories.filter(category=>!data.groups[category]?.length);
  data={...data,missing,stale:missing.length>0};
 }
 if(signal?.aborted)throw Error('Cancelled');
 // Concurrent callers merge against the latest result as well as their initial snapshot.
 data=merge(cached?.data,data);
 cached={until:Date.now()+(data.stale||data.missing?.length?15000:300000),data};
 try{sessionStorage.setItem(STORAGE,JSON.stringify({at:Date.now(),data}))}catch{}
 return data;
}
