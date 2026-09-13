import type {Song} from '../music-types';
// Whitelist and bound metadata before JSON encoding, not after it reaches the API.
const text=(value:unknown,max:number)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max);
export function importBatch(body:Record<string,unknown>,songs:Song[],offset:number){
 const batch=songs.slice(offset,offset+50).map(s=>({
  id:text(s.id,200),provider:s.provider,title:text(s.title,300),artist:text(s.artist,300),album:text(s.album,300),
  cover:typeof s.cover==='string'&&s.cover.startsWith('https://')?text(s.cover,2000):'',duration:text(s.duration,20),
  durationMs:Number.isFinite(s.durationMs)?s.durationMs:0,keyword:text(s.keyword,100),
  ...(s.importStatus==='matched'||s.importStatus==='unmatched'?{importStatus:s.importStatus}:{})
 }));
 return {action:'import-save',importId:text(body.importId,80),name:text(body.name,60),source:text(body.source,40),songs:batch,offset,total:songs.length};
}
