import type {ExternalTrack} from './model';
import type {Song} from '../music-types';

/** Two requests at a time; each request stays within the API's three-song limit. */
export async function matchPlaylist(tracks:ExternalTrack[],request:(tracks:ExternalTrack[],signal:AbortSignal)=>Promise<Song[]>,signal:AbortSignal,onProgress:(completed:number,total:number)=>void):Promise<Song[]>{
 const controller=new AbortController();
 const abort=()=>controller.abort(signal.reason);
 if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 const groups:{track:ExternalTrack;positions:number[]}[]=[],keys=new Map<string,number>();
 for(const [i,track] of tracks.entries()){
  const key=JSON.stringify([track.title,track.artist,track.album||'',track.durationMs||0]);
  const existing=keys.get(key);
  if(existing===undefined){keys.set(key,groups.length);groups.push({track,positions:[i]})}else groups[existing].positions.push(i);
 }
 const output=new Array<Song>(tracks.length);let next=0,completed=0;
 async function worker(){
  while(next<groups.length){
   controller.signal.throwIfAborted();const start=next;next+=3;const batch=groups.slice(start,start+3);
   const items=await request(batch.map(group=>group.track),controller.signal);
   controller.signal.throwIfAborted();
   if(!Array.isArray(items)||items.length!==batch.length||items.some(item=>!item||typeof item.id!=='string'||!['matched','unmatched'].includes(item.importStatus||'')))throw Error('匹配结果不完整，请重新导入');
   batch.forEach((group,i)=>{for(const position of group.positions)output[position]={...items[i]};completed+=group.positions.length});
   onProgress(completed,tracks.length);
  }
 }
 try{controller.signal.throwIfAborted();await Promise.all([worker(),worker()]);return output}
 catch(error){controller.abort();throw error}
 finally{signal.removeEventListener('abort',abort)}
}
