import {sceneCategories,moodCategories,genreCategories,type CuratedPlaylist} from './curated-types';

export const homeCategories={
 '随心精选':[...sceneCategories,...moodCategories,...genreCategories],
 '心情场景':[...sceneCategories,...moodCategories],
 '曲风流派':genreCategories,
};
export type HomeCategory=keyof typeof homeCategories;
export type RecommendationHistory={songs:string[];categories:Record<string,string[]>};
const emptyHistory=():RecommendationHistory=>({songs:[],categories:{}});
const oldestChoice=<T,>(items:T[],key:(item:T)=>string,history:string[],random:()=>number)=>{
 const oldest=Math.min(...items.map(item=>history.indexOf(key(item))));
 const pool=items.filter(item=>history.indexOf(key(item))===oldest);
 return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
};

/** Fill the row from available data, rotating both categories and playlists. */
export function chooseHomeRecommendations(groups:Record<string,CuratedPlaylist[]>,tab:HomeCategory,history:RecommendationHistory,random=Math.random){
 const result:CuratedPlaylist[]=[],used=new Set<string>(),usedCategories=new Set<string>();
 const preferred=new Set<string>(homeCategories[tab]);
 const candidates=Object.entries(groups).map(([category,rows])=>({category,rows:rows.filter(p=>p&&/^\d{1,18}$/.test(p.id)&&p.title?.trim()&&p.cover?.trim())}));
 while(result.length<6){
  const available=candidates.map(group=>({...group,rows:group.rows.filter(p=>!used.has(p.id))})).filter(group=>group.rows.length);
  if(!available.length)break;
  const different=available.filter(group=>!usedCategories.has(group.category));
  const diverse=different.length?different:available;
  const relevant=diverse.filter(group=>preferred.has(group.category));
  const group=oldestChoice(relevant.length?relevant:diverse,g=>g.category,history.categories[tab]||[],random);
  const playlist=oldestChoice(group.rows,p=>p.id,history.songs,random);
  result.push({...playlist,category:group.category});used.add(playlist.id);usedCategories.add(group.category);
 }
 return result;
}

const STORAGE='resonance-home-recommendations-v3';let last=emptyHistory();
export function nextHomeRecommendations(groups:Record<string,CuratedPlaylist[]>,tab:HomeCategory){
 try{
  const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(stored&&Array.isArray(stored.songs)&&stored.categories&&typeof stored.categories==='object'){
   last={songs:stored.songs.filter((id:unknown)=>typeof id==='string'&&/^\d{1,18}$/.test(id)).slice(-512),categories:{}};
   for(const key of Object.keys(homeCategories))if(Array.isArray(stored.categories[key]))last.categories[key]=stored.categories[key].filter((cat:unknown)=>typeof cat==='string').slice(-80);
  }
 }catch{}
 const selected=chooseHomeRecommendations(groups,tab,last);
 for(const p of selected){last.songs=[...last.songs.filter(id=>id!==p.id),p.id].slice(-512);last.categories[tab]=[...(last.categories[tab]||[]).filter(cat=>cat!==p.category),p.category].slice(-80)}
 try{localStorage.setItem(STORAGE,JSON.stringify(last))}catch{}
 return selected;
}
