import type {CuratedPlaylist} from './curated-types';
// Prefer unseen playlists, then the least recently shown, with bounded local history.
export function chooseRecommendations(groups:Record<string,CuratedPlaylist[]>,previous:Record<string,string|string[]>,random= Math.random){
 const result:Record<string,CuratedPlaylist>={};const used=new Set<string>();
 for(const [category,rows] of Object.entries(groups)){
  if(!rows.length)continue;
  const old=previous[category],history=Array.isArray(old)?old:old?[old]:[];
  const unique=rows.filter(p=>!used.has(p.id)),available=unique.length?unique:rows;
  const oldest=Math.min(...available.map(p=>history.indexOf(p.id)));
  const pool=available.filter(p=>history.indexOf(p.id)===oldest);const choice=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];result[category]=choice;used.add(choice.id);
 }return result;
}
const STORAGE='resonance-home-recommendations-v2';let last:Record<string,string[]>={};
export function nextRecommendations(groups:Record<string,CuratedPlaylist[]>){
 try{const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored))last=Object.fromEntries(Object.entries(stored).filter(([,v])=>Array.isArray(v)).slice(0,80).map(([cat,v])=>[cat,(v as unknown[]).filter((id):id is string=>typeof id==='string'&&/^\d{1,18}$/.test(id)).slice(-64)]))}catch{}
 const selected=chooseRecommendations(groups,last);for(const [cat,p] of Object.entries(selected))last[cat]=[...(last[cat]||[]).filter(id=>id!==p.id),p.id].slice(-64);
 try{localStorage.setItem(STORAGE,JSON.stringify(last))}catch{}return selected;
}
