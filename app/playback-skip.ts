import type {Song} from './music-types';
import type {PlayMode} from './playback-order';
const key=(song:Song)=>song.provider+':'+song.id;

// One traversal only. Failed entries must not be picked again in shuffle mode.
export function skipCandidates(queue:Song[],selected:Song|null,mode:PlayMode,step:number,automatic=false,random=Math.random){
 const index=selected?queue.findIndex(song=>key(song)===key(selected)):-1;
 const indices:number[]=[];
 if(mode==='shuffle'){
  for(let i=0;i<queue.length;i++)if(i!==index||queue.length===1)indices.push(i);
  for(let i=indices.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]]}
 }else{
  const direction=step<0?-1:1,start=index<0?(direction>0?-1:queue.length):index;
  for(let distance=1;distance<=queue.length;distance++){
   let next=start+direction*distance;
   if(automatic&&(next<0||next>=queue.length))break;
   next=(next%queue.length+queue.length)%queue.length;
   if(next===index&&queue.length>1)break;
   indices.push(next);
  }
 }
 const seen=new Set<string>();if(selected&&queue.length>1)seen.add(key(selected));
 return indices.flatMap(i=>{const song=queue[i],id=key(song);if(seen.has(id))return [];seen.add(id);return [song]});
}
export async function advanceThroughQueue(candidates:Song[],signal:AbortSignal,attempt:(song:Song)=>Promise<boolean|null>,onSkip:(song:Song)=>void,priority:()=>Song[]=()=>[]){
 const visited=new Set<string>();let cursor=0;
 for(;;){
  if(signal.aborted)return 'cancelled';
  while(cursor<candidates.length&&visited.has(key(candidates[cursor])))cursor++;
  const song=priority().find(item=>!visited.has(key(item)))||candidates[cursor];
  if(!song)break;
  visited.add(key(song));
  const result=await attempt(song);
  if(signal.aborted||result===null)return 'cancelled';
  if(result)return 'played';
  onSkip(song);
 }
 return signal.aborted?'cancelled':'exhausted';
}
