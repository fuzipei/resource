import {database,ApiError,result,type DB} from '../../server/site-store';
import {readPlaylistShare} from '../../server/playlist-share-store';
import {SHARE_TOKEN} from '../../playlist-share-model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 let db:DB|undefined;
 try{const params=new URL(request.url).searchParams,token=params.get('id')||'',page=params.get('page')||'0';
  if(!SHARE_TOKEN.test(token)||!/^\d{1,5}$/.test(page))return result({error:'歌单分享链接无效'},400);
  db=await database();return result(await readPlaylistShare(db,token,Number(page)));
 }catch(e){return result({error:e instanceof ApiError?e.message:'分享歌单暂时无法读取，请重试'},e instanceof ApiError?e.status:503)}finally{if(db?.isOpen)db.destroy()}
}
