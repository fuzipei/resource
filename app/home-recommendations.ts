import type {CuratedPlaylist} from './curated-types';
// Keep one previous choice per category, not a growing browsing history.
export function chooseRecommendations(groups:Record<string,CuratedPlaylist[]>,previous:Record<string,string>,random= Math.random){
 const result:Record<string,CuratedPlaylist>={};const used=new Set<string>();const old=new Set(Object.values(previous));
 for(const [category,rows] of Object.entries(groups)){
  if(!rows.length)continue;
  const pools=[rows.filter(p=>!used.has(p.id)&&!old.has(p.id)),rows.filter(p=>!used.has(p.id)&&p.id!==previous[category]),rows.filter(p=>p.id!==previous[category]),rows];
  const pool=pools.find(p=>p.length)!;const choice=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];result[category]=choice;used.add(choice.id);
 }return result;
}
const STORAGE='resonance-home-recommendations-v1';let last:Record<string,string>={};
export function nextRecommendations(groups:Record<string,CuratedPlaylist[]>){
 try{const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored))last=Object.fromEntries(Object.entries(stored).filter(([,v])=>typeof v==='string').slice(0,80)) as Record<string,string>}catch{}
 const selected=chooseRecommendations(groups,last);last=Object.fromEntries(Object.entries(selected).map(([cat,p])=>[cat,p.id]));
 try{localStorage.setItem(STORAGE,JSON.stringify(last))}catch{}return selected;
}
