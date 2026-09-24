import {neteaseDurations} from '../durations/catalog';
import {verifyLossless} from './lossless';
import {playAt38} from '../music/at38';
import {resolveGequhai} from './gequhai';
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function same(title:string,artist:string,t:string,a:string){return norm(title)===norm(t)&&artist.split(/[/、;&,]/).map(norm).filter(Boolean).every(name=>a.split(/[/、;&,]/).map(norm).includes(name))}
async function json(url:string,signal:AbortSignal){const r=await fetch(url,{signal});if(!r.ok)throw Error('Unavailable');return r.json() as Promise<any>}
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,source=p.get('source')||'',id=p.get('id')||'',title=p.get('title')||'',artist=p.get('artist')||'';
 if(!['at38','coco','gd','gequhai'].includes(source)||!/^(wy|qq|kw|kg|mg)_[a-zA-Z0-9_-]{1,100}$/.test(id)||!title||!artist||title.length>300||artist.length>300)return Response.json({error:'歌曲信息无效'},{status:400});
 const level=p.get('level')||'standard';
 if(!['standard','lossless'].includes(level)||(level==='lossless'&&!['coco','gd'].includes(source)))return Response.json({error:'音质选项无效'},{status:400});
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(16000)]);
 try{
 let url='',mime='',expectedDuration=Number(p.get('duration'))||0;
 if(source==='at38'){const j=await playAt38(id,(p.get('q')||title+' '+artist).slice(0,100));return Response.json({...j,expectedDuration},{headers:{'Cache-Control':'no-store'}})}
 if(source==='gequhai'){
 const audio=await resolveGequhai(title,artist,signal);url=audio.url;mime=audio.mime;
 }else{
 let neteaseId=id.startsWith('wy_')?id.slice(3):'';
 if(!neteaseId){const j=await json('https://music-api.gdstudio.xyz/api.php?'+new URLSearchParams({types:'search',source:'netease',name:title+' '+artist,count:'20',pages:'1'}),signal);const match=Array.isArray(j)&&j.find((s:any)=>same(title,artist,s.name,(s.artist||[]).join('/')));if(!match)throw Error('No matching version');neteaseId=String(match.id)}
 // Resolve the exact platform ID; only use search when converting another platform's ID.
 if(expectedDuration<=0){const catalog=await neteaseDurations([neteaseId]);expectedDuration=catalog[neteaseId]/1000||0}
 const j=await json(source==='coco'?'https://cocodownloader.markqq.com/api/url?'+new URLSearchParams({id:neteaseId,provider:'netease',extra:JSON.stringify({selectedLevel:level})}):'https://music-api.gdstudio.xyz/api.php?'+new URLSearchParams({types:'url',source:'netease',id:neteaseId,br:level==='lossless'?'999':'320'}),signal);
 if(j.freeTrialInfo||j.trialInfo||j.isPreview)throw Error('Preview only');url=j.url;mime=({mp3:'audio/mpeg',flac:'audio/flac',wav:'audio/wav',m4a:'audio/mp4'} as Record<string,string>)[j.type]||'';
 }
 const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))throw Error('Invalid audio URL');if(/(?:\/preview\/|preview=1)/i.test(url))throw Error('Preview only');
 if(level==='lossless')mime=await verifyLossless(url,signal);
 if(!mime)mime=u.pathname.endsWith('.flac')?'audio/flac':u.pathname.endsWith('.wav')?'audio/wav':u.pathname.endsWith('.m4a')?'audio/mp4':'audio/mpeg';
 return Response.json({qualities:[{id:source+'-'+level,label:(mime==='audio/flac'?'FLAC':mime==='audio/wav'?'WAV':'MP3')+' · '+(source==='gd'?'GD':source==='coco'?'Coco':'歌曲海'),detail:source,url,mime}],expectedDuration},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'此线路暂不可用'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
