const HOP='x-resonance-playback-hop';
const MAX_BODY=65536;
type RelayQuality={id:string;label:string;detail:string;url:string;mime?:string};

function publicHttps(raw:string){
 const u=new URL(raw);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||u.hostname.endsWith('.local')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':'))throw Error('Invalid playback relay URL');
 return u;
}

/** Only the Vercel deployment uses the existing Cloudflare resolver by default. */
export function playbackRelayOrigin(request:Request){
 if(request.headers.has(HOP))return '';
 const configured=process.env.PLAYBACK_RELAY_ORIGIN??(process.env.VERCEL==='1'?'https://gm.zzhye.com':'');
 if(!configured)return '';
 try{const origin=publicHttps(configured).origin;return origin===new URL(request.url).origin?'':origin}catch{return ''}
}

export async function relayPlayback(params:URLSearchParams,origin:string,signal:AbortSignal){
 const query=new URLSearchParams();
 for(const key of ['source','id','title','artist','duration','q','level']){const value=params.get(key);if(value!==null)query.set(key,value)}
 const response=await fetch(origin+'/api/playback?'+query,{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)]),redirect:'manual',cache:'no-store',headers:{Accept:'application/json','User-Agent':'Mozilla/5.0',[HOP]:'1'}});
 if(!response.ok){await response.body?.cancel();throw Error('Playback relay unavailable')}
 const reader=response.body?.getReader();if(!reader)throw Error('Empty playback relay');
 const decoder=new TextDecoder();let body='',size=0;
 try{while(true){const {done,value}=await reader.read();if(done){body+=decoder.decode();break}size+=value.length;if(size>MAX_BODY)throw Error('Playback relay response too large');body+=decoder.decode(value,{stream:true})}}finally{await reader.cancel().catch(()=>{})}
 const data=JSON.parse(body);
 if(data.freeTrialInfo||data.trialInfo||data.isPreview||!Array.isArray(data.qualities))throw Error('Invalid playback relay response');
 const qualities:RelayQuality[]=data.qualities.slice(0,6).flatMap((item:unknown)=>{
  if(!item||typeof item!=='object')return [];
  const q=item as Record<string,unknown>;
  if(typeof q.id!=='string'||typeof q.url!=='string'||q.url.length>8192)return [];
  try{publicHttps(q.url)}catch{return []}
  if(/(?:\/preview\/|preview=1)/i.test(q.url))return [];
  return [{id:q.id.slice(0,100),label:typeof q.label==='string'?q.label.slice(0,100):'音源',detail:typeof q.detail==='string'?q.detail.slice(0,200):'',url:q.url,...(typeof q.mime==='string'&&/^audio\/[a-z0-9.+-]+$/i.test(q.mime)?{mime:q.mime}:{})}];
 });
 if(!qualities.length)throw Error('Playback relay returned no audio');
 const expectedDuration=Number(data.expectedDuration)||Number(params.get('duration'))||0;
 if(!Number.isFinite(expectedDuration)||expectedDuration<0||expectedDuration>86400)throw Error('Invalid playback relay duration');
 return {qualities,expectedDuration};
}
