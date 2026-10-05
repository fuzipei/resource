import {after} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {databaseUrl} from '../../server/site-store';
import {createClient} from '../account/redis';
import {processSyncQueue} from '../../playlist-import/sync-service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,header=request.headers.get('authorization')||'',expected='Bearer '+secret;
 if(!secret||header.length!==expected.length||!timingSafeEqual(Buffer.from(header),Buffer.from(expected)))return Response.json({error:'定时任务未授权'},{status:401});
 const db=createClient({url:databaseUrl(),socket:{connectTimeout:8000,reconnectStrategy:false}});
 try{await db.connect();const result=await processSyncQueue(db);
 // Continue durable batches after responding; only the configured deployment can call this URL.
 if(result.pending&&!result.busy)after(async()=>{const response=await fetch(new URL('/api/playlist-sync',request.url),{headers:{authorization:expected},signal:AbortSignal.timeout(55000)});await response.body?.cancel()});
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'歌单更新服务暂时不可用，进度已保留'},{status:503})}finally{if(db.isOpen)db.destroy()}
}