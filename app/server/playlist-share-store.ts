import {createHash,randomBytes} from 'node:crypto';
import {ApiError,type DB} from './site-store';
import type {Song} from '../music-types';
const PREFIX='resonance:playlist-share:v1:',TTL=30*86400,PAGE=200;
const pointer=(owner:string,id:string)=>PREFIX+'owner:'+owner+':'+createHash('sha256').update(id).digest('hex');
const snapshot=(token:string)=>PREFIX+'snapshot:'+createHash('sha256').update(token).digest('hex');
function publicSong(s:Song):Song{
 if(!s||s.provider!=='at38'||typeof s.id!=='string'||!/^(?:wy|qq|kw|kg|mg|missing)_[a-zA-Z0-9_-]{1,150}$/.test(s.id)||typeof s.title!=='string'||typeof s.artist!=='string')throw new ApiError('歌单包含无效歌曲，请重新同步后分享');
 let cover='';try{const u=new URL(s.cover);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['music.126.net','gtimg.cn','kugou.com','at38.cn','kuwo.cn'].some(host=>u.hostname===host||u.hostname.endsWith('.'+host)))cover=u.href.slice(0,2000)}catch{}
 return {id:s.id,provider:'at38',title:s.title.slice(0,300),artist:s.artist.slice(0,300),album:String(s.album||'').slice(0,300),cover,duration:String(s.duration||'').slice(0,20),durationMs:Math.max(0,Math.min(86400000,Number(s.durationMs)||0)),...(s.importStatus==='unmatched'?{importStatus:'unmatched' as const}:{})};
}
export async function createPlaylistShare(db:DB,owner:string,playlist:{id:string;name:string;songs:Song[]},libraryRaw:string){
 if(!playlist.songs?.length)throw new ApiError('歌单还没有歌曲');
 const index=pointer(owner,playlist.id),old=await db.get(index);
 if(old){const meta=await db.eval("return redis.call('HGET',KEYS[1],'meta')",{keys:[snapshot(old)],arguments:[]});if(typeof meta==='string')return {token:old,...JSON.parse(meta)};await revokePlaylistShare(db,owner,playlist.id)}
 const songs=playlist.songs.map(publicSong),chunks:string[]=[];
 for(let i=0;i<songs.length;i+=PAGE)chunks.push(JSON.stringify(songs.slice(i,i+PAGE)));
 if(Buffer.byteLength(chunks.join(''))>20*1024*1024)throw new ApiError('歌单分享数据超过 20MB，请精简后再分享',413);
 const token=randomBytes(32).toString('hex'),meta={title:String(playlist.name).slice(0,60),count:songs.length,pages:chunks.length,expiresAt:Date.now()+TTL*1000};
 const chosen=await db.eval("if redis.call('GET',KEYS[3])~=ARGV[4] then return false end local old=redis.call('GET',KEYS[1]);if old then return old end redis.call('HSET',KEYS[2],'meta',ARGV[2]);for i=5,#ARGV do redis.call('HSET',KEYS[2],tostring(i-5),ARGV[i]) end redis.call('EXPIRE',KEYS[2],tonumber(ARGV[3]));redis.call('SET',KEYS[1],ARGV[1],'EX',tonumber(ARGV[3]));redis.call('SET',KEYS[4],KEYS[2],'EX',tonumber(ARGV[3]));return ARGV[1]",{keys:[index,snapshot(token),'resonance:account:v1:library:'+owner,index+':snapshot'],arguments:[token,JSON.stringify(meta),String(TTL),libraryRaw,...chunks]});
 if(chosen===token)return {token,...meta};
 const existing=typeof chosen==='string'?await db.eval("return redis.call('HGET',KEYS[1],'meta')",{keys:[snapshot(chosen)],arguments:[]}):null;if(typeof existing!=='string')throw new ApiError('分享状态已变化，请重试',409);
 return {token:chosen,...JSON.parse(existing)};
}
export async function revokePlaylistShare(db:DB,owner:string,id:string){
 const index=pointer(owner,id),token=await db.get(index);if(!token)return;
 await db.eval("if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1],KEYS[2],KEYS[3]);return 1 end return 0",{keys:[index,snapshot(token),index+':snapshot'],arguments:[token]});
}
export async function deletePlaylistWithShare(db:DB,owner:string,id:string,previous:string,next:string){
 const index=pointer(owner,id);
 return await db.eval("if (redis.call('GET',KEYS[1]) or '')~=ARGV[1] then return 0 end redis.call('SET',KEYS[1],ARGV[2]);local target=redis.call('GET',KEYS[3]);if target then redis.call('DEL',target) end redis.call('DEL',KEYS[2],KEYS[3]);return 1",{keys:['resonance:account:v1:library:'+owner,index,index+':snapshot'],arguments:[previous,next]});
}
export async function readPlaylistShare(db:DB,token:string,page:number){
 const values=await db.eval("return redis.call('HMGET',KEYS[1],'meta',ARGV[1])",{keys:[snapshot(token)],arguments:[String(page)]}) as [string|null,string|null],meta=values[0]?JSON.parse(values[0]):null;
 if(!meta||meta.expiresAt<=Date.now())throw new ApiError('分享链接已失效或已被取消',404);
 if(page>=meta.pages||!values[1])throw new ApiError('分享歌单分页无效',400);
 return {token,...meta,songs:JSON.parse(values[1])};
}
