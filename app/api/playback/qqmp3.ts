import {verifiedKuwoAudio} from './kuwo-audio';

const ORIGIN='https://www.qqmp3.vip';
const REFERER=ORIGIN+'/';

const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const artists=(value:string)=>value.split(/[/、&,，]/).map(normalize).filter(Boolean);

function sameRecording(title:string,artist:string,name:unknown,performer:unknown){
 if(typeof name!=='string'||typeof performer!=='string'||normalize(title)!==normalize(name))return false;
 const requested=artists(artist),found=artists(performer);
 return requested.length>0&&requested.every(value=>found.includes(value));
}

async function getJson(path:string,signal:AbortSignal){
 const response=await fetch(ORIGIN+path,{signal,redirect:'manual',headers:{Referer:REFERER,Accept:'application/json'}});
 if(!response.ok||new URL(response.url).origin!==ORIGIN)throw Error('QQMP3 unavailable');
 const size=Number(response.headers.get('content-length'));
 if(size>512000)throw Error('QQMP3 response too large');
 const body=await response.text();
 if(body.length>512000)throw Error('QQMP3 response too large');
 return JSON.parse(body) as Record<string,unknown>;
}

export async function resolveQqmp3(title:string,artist:string,signal:AbortSignal){
 const primary=artist.split(/[/、&,，]/)[0].trim();
 const query=(title+' '+primary).trim();
 const search=await getJson('/api/songs.php?'+new URLSearchParams({type:'search',keyword:query}),signal);
 const list=Array.isArray(search.data)?search.data:[];
 const track=list.find((item:unknown)=>item&&typeof item==='object'&&sameRecording(title,artist,(item as Record<string,unknown>).name,(item as Record<string,unknown>).artist)) as Record<string,unknown>|undefined;
 const rid=String(track?.rid||'');
 if(!/^\d{1,20}$/.test(rid))throw Error('No matching recording');
 const result=await getJson('/api/kw.php?'+new URLSearchParams({rid,type:'json',level:'exhigh',lrc:'false'}),signal);
 if(result.code!==200&&result.code!==0)throw Error('QQMP3 did not resolve audio');
 const data=result.data&&typeof result.data==='object'?result.data as Record<string,unknown>:{};
 return verifiedKuwoAudio(data.url||result.url,signal);
}
