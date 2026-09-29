import {verifiedKuwoAudio} from './kuwo-audio';

const ORIGIN='https://www.buguyy.top';
const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const artists=(value:string)=>value.split(/[/、&,，]/).map(normalize).filter(Boolean);

async function getJson(path:string,signal:AbortSignal){
 const response=await fetch(ORIGIN+path,{signal,redirect:'manual',headers:{Accept:'application/json','User-Agent':'Resonance/1.0'}});
 if(!response.ok||new URL(response.url).origin!==ORIGIN)throw Error('Buguyy unavailable');
 const size=Number(response.headers.get('content-length'));
 if(size>1024000)throw Error('Buguyy response too large');
 const body=await response.text();
 if(body.length>1024000)throw Error('Buguyy response too large');
 return JSON.parse(body) as Record<string,unknown>;
}

export async function resolveBuguyy(title:string,artist:string,signal:AbortSignal){
 const search=await getJson('/api/search?'+new URLSearchParams({keyword:title}),signal);
 const requested=artists(artist),list=Array.isArray(search.data)?search.data:[];
 const track=list.find((item:unknown)=>{
  if(!item||typeof item!=='object')return false;
  const candidate=item as Record<string,unknown>;
  return typeof candidate.title==='string'&&typeof candidate.singer==='string'&&normalize(candidate.title)===normalize(title)&&requested.length>0&&requested.every(value=>artists(candidate.singer as string).includes(value));
 }) as Record<string,unknown>|undefined;
 const id=String(track?.id||'');
 if(!/^[A-Za-z0-9+/=]{4,100}$/.test(id))throw Error('No matching recording');
 const result=await getJson('/api/geturl?'+new URLSearchParams({id}),signal);
 if(result.success!==true)throw Error('Buguyy did not resolve audio');
 return verifiedKuwoAudio(result.url,signal);
}
