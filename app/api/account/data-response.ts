import {createHash} from 'node:crypto';
import type {createClient} from './redis';
type DB=ReturnType<typeof createClient>;
const PREFIX='resonance:account:v1:response:';
export const usesPagedData=(request:Request)=>request.headers.get('x-resonance-data')==='paged-v1';
export class AccountDataError extends Error{constructor(message:string,public status=410){super(message)}}
export async function accountDataResponse(db:DB,request:Request,owner:string,payload:unknown,headers:Record<string,string>={}){
 const text=JSON.stringify(payload),bytes=new TextEncoder().encode(text);
 if(!usesPagedData(request)||bytes.length<=256000)return new Response(text,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
 // Immutable, short-lived snapshots prevent mixing chunks from concurrent library edits.
 const digest=createHash('sha256').update(bytes).digest('hex'),id=digest.slice(0,32),chunks:string[]=[];
 for(let i=0;i<text.length;i+=48000)chunks.push(text.slice(i,i+48000));
 await db.eval("for i=1,#ARGV do redis.call('HSET',KEYS[1],tostring(i-1),ARGV[i]) end redis.call('HSET',KEYS[1],'parts',tostring(#ARGV));redis.call('EXPIRE',KEYS[1],180);return 1",{keys:[PREFIX+owner+':'+id],arguments:chunks});
 return Response.json({transfer:{id,parts:chunks.length,bytes:bytes.length,sha256:digest}},{headers:{'Cache-Control':'no-store',...headers}});
}
export async function accountDataChunk(db:DB,request:Request,owner:string){
 const params=new URL(request.url).searchParams,id=params.get('transfer')||'',rawIndex=params.get('part')||'';
 if(!/^[a-f0-9]{32}$/.test(id)||!/^\d{1,8}$/.test(rawIndex))throw new AccountDataError('同步分页参数无效',400);
 const index=Number(rawIndex);
 const text=await db.eval("local count=tonumber(redis.call('HGET',KEYS[1],'parts'));if not count or tonumber(ARGV[1])>=count then return false end return redis.call('HGET',KEYS[1],ARGV[1])",{keys:[PREFIX+owner+':'+id],arguments:[String(index)]});
 if(typeof text!=='string')throw new AccountDataError('同步数据已过期，请重新加载后再试');
 return Response.json({part:index,text},{headers:{'Cache-Control':'no-store'}});
}
