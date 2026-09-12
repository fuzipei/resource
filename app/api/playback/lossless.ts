// The lossless providers resolve NetEase recordings to these public audio CDNs.
// Validate the container bytes instead of trusting a requested quality or bitrate.
export function losslessMime(bytes:Uint8Array){
 const tag=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
 if(tag(0,4)==='fLaC')return 'audio/flac';
 if((tag(0,4)==='RIFF'||tag(0,4)==='RF64')&&tag(8,12)==='WAVE')return 'audio/wav';
 return '';
}
export async function verifyLossless(url:string,signal:AbortSignal){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.port||u.username||u.password||!u.hostname.endsWith('.music.126.net'))throw Error('Unsupported lossless host');
 const r=await fetch(u,{signal,redirect:'manual',headers:{Range:'bytes=0-63'}});
 if(!r.ok||!r.body)throw Error('Lossless audio unavailable');
 const reader=r.body.getReader(),header=new Uint8Array(12);let length=0;
 try{while(length<header.length){const chunk=await reader.read();if(chunk.done)break;const part=chunk.value.subarray(0,header.length-length);header.set(part,length);length+=part.length;}}
 finally{await reader.cancel().catch(()=>{});}
 const mime=losslessMime(header.subarray(0,length));if(!mime)throw Error('Not a lossless container');return mime;
}
