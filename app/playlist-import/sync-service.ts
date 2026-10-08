import {randomBytes,createHash} from 'node:crypto';
import {readExternal,readNeteaseTracks} from './sources';
import {sourceTrackKey,managedSongKey,nextSyncTime,reconcile,type SyncedPlaylist} from './sync-model';
import {exactTrack,type ExternalTrack} from './model';
import {searchAt38} from '../api/music/at38';
import type {Song} from '../music-types';
import {createClient} from '../api/account/redis';
export const SYNC_QUEUE='resonance:playlist-sync:v1:queue';
const PREFIX='resonance:account:v1:';
type DB=ReturnType<typeof createClient>;
type Job={url:string;tracks:ExternalTrack[];remaining:string[];total:number;cursor:number;resolved:Song[];base:string[]};
export async function enqueueSync(db:DB,uid:string,id:string,due=nextSyncTime()){await db.eval("redis.call('ZADD',KEYS[1],ARGV[1],ARGV[2]);return 1",{keys:[SYNC_QUEUE],arguments:[String(due),uid+':'+id]})}
async function persist(db:DB,uid:string,id:string,url:string,change:(p:SyncedPlaylist)=>SyncedPlaylist){
 for(let n=0;n<8;n++){const key=PREFIX+'library:'+uid,raw=await db.get(key);if(!raw)return false;const library=JSON.parse(raw),p=library.playlists.find((p:SyncedPlaylist)=>p.id===id);if(!p||p.sync?.url!==url)return false;library.playlists=library.playlists.map((p:SyncedPlaylist)=>p.id===id?change(p):p);if(await db.eval("if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2]);return 1",{keys:[key],arguments:[raw,JSON.stringify(library)]}))return true}throw Error('歌单正在编辑，将稍后重试');
}
async function resolveTrack(t:ExternalTrack):Promise<Song>{
 if(t.catalogId){const ms=t.durationMs||0;return {id:t.catalogId,provider:'at38',title:t.title,artist:t.artist,album:t.album||'',cover:'',durationMs:ms,duration:ms?Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0'):'',importStatus:'matched'}}
 const candidate=(await searchAt38((t.title+' '+t.artist).slice(0,100),1)).items.find(s=>exactTrack(t,s));
 const ms=t.durationMs||0;
 const duration=ms?Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0'):candidate?.duration||'';
 return candidate?{...candidate,title:t.title,artist:t.artist,album:t.album||candidate.album,durationMs:ms,duration,importStatus:'matched'}:{id:'missing_'+createHash('sha256').update(sourceTrackKey(t)).digest('hex').slice(0,24),provider:'at38',title:t.title,artist:t.artist,album:t.album||'',cover:'',durationMs:ms,duration,importStatus:'unmatched'};
}
// Persist each page and matching batch. A large playlist resumes in subsequent invocations.
export async function syncStep(db:DB,member:string){
 const split=member.indexOf(':'),uid=member.slice(0,split),id=member.slice(split+1),jobKey='resonance:playlist-sync:v1:job:'+member;
 const raw=await db.get(PREFIX+'library:'+uid),p:SyncedPlaylist|undefined=raw?JSON.parse(raw).playlists.find((p:SyncedPlaylist)=>p.id===id):undefined;
 if(!p?.sync?.url){await db.eval("redis.call('ZREM',KEYS[1],ARGV[1]);return 1",{keys:[SYNC_QUEUE],arguments:[member]});await db.del(jobKey);return 'gone'}
 let job:Job|undefined;const stored=await db.get(jobKey);if(stored)job=JSON.parse(stored);
 try{
  if(!job||job.url!==p.sync.url||JSON.stringify(job.base)!==JSON.stringify(p.sync.keys)){
   const source=await readExternal(p.sync.url);
   if(source.warning)throw Error('平台返回的歌单可能不完整，本次保留原歌曲');
   job={url:p.sync.url,tracks:source.tracks,remaining:source.remainingIds||[],total:source.totalCount||source.tracks.length,cursor:0,resolved:[],base:p.sync.keys};
  }else if(job.remaining.length){const ids=job.remaining.slice(0,200),tracks=await readNeteaseTracks(ids);if(tracks.length!==ids.length)throw Error('部分歌曲资料未返回，本次保留原歌曲');job.tracks.push(...tracks);job.remaining=job.remaining.slice(200)}
  if(!job.remaining.length){
   if(job.tracks.length!==job.total)throw Error('返回数量与原歌单不一致，本次保留原歌曲');
   const unique=[...new Map(job.tracks.map(t=>[sourceTrackKey(t),t])).values()],previous=new Set(job.base);
   const additions=p.sync.baseline?[]:unique.filter(t=>!previous.has(sourceTrackKey(t)));
   if(job.cursor<additions.length){const batch=additions.slice(job.cursor,job.cursor+3);job.resolved.push(...await Promise.all(batch.map(resolveTrack)));job.cursor+=batch.length}
   if(job.cursor>=additions.length){
    const done=job;
    await persist(db,uid,id,done.url,current=>{
     if(JSON.stringify(current.sync?.keys)!==JSON.stringify(done.base))throw Error('同步设置已变更，请重试');
     if(current.sync?.baseline)return {...current,sync:{...current.sync,keys:unique.map(sourceTrackKey),managed:current.songs.filter(s=>unique.some(t=>t.catalogId===s.id)).map(managedSongKey),baseline:false,lastSuccess:Date.now(),status:'ready',error:'',added:0,removed:0}};
     return reconcile(current,done.tracks,done.resolved);
    });await db.del(jobKey);await enqueueSync(db,uid,id);return 'complete';
   }
  }
  await db.set(jobKey,JSON.stringify(job),{EX:172800});await persist(db,uid,id,job.url,current=>({...current,sync:{...current.sync!,status:'pending',error:''}}));return 'pending';
 }catch(e){await db.del(jobKey);await persist(db,uid,id,p.sync.url,current=>({...current,sync:{...current.sync!,checkedAt:Date.now(),status:'error',error:e instanceof Error&&e.message.startsWith('平台')||e instanceof Error&&e.message.startsWith('部分')||e instanceof Error&&e.message.startsWith('返回')?e.message:'原歌单暂时无法读取，已保留现有歌曲，将在下次重试'}}));await enqueueSync(db,uid,id);return 'error'}
}
export async function processSyncQueue(db:DB){
 const token=randomBytes(16).toString('hex'),lock='resonance:playlist-sync:v1:lock';
 const acquired=await db.eval("if redis.call('SET',KEYS[1],ARGV[1],'NX','EX',55) then return 1 end return 0",{keys:[lock],arguments:[token]});if(!acquired)return {pending:true,busy:true};
 try{const members=await db.eval("return redis.call('ZRANGEBYSCORE',KEYS[1],'-inf',ARGV[1],'LIMIT',0,1)",{keys:[SYNC_QUEUE],arguments:[String(Date.now())]}) as string[];
 if(!members.length)return {pending:false};const result=await syncStep(db,members[0]);const rest=await db.eval("return redis.call('ZCOUNT',KEYS[1],'-inf',ARGV[1])",{keys:[SYNC_QUEUE],arguments:[String(Date.now())]});return {pending:Number(rest)>0,result};
 }finally{await db.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",{keys:[lock],arguments:[token]})}
}
