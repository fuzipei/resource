export async function verifiedKuwoAudio(value:unknown,signal:AbortSignal){
 if(typeof value!=='string')throw Error('No audio URL');
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.endsWith('.kuwo.cn'))throw Error('Unsupported audio host');
 const response=await fetch(url,{signal,redirect:'manual',headers:{Range:'bytes=0-63'}});
 if(!response.ok||!response.body)throw Error('Audio unavailable');
 const reader=response.body.getReader(),first=new Uint8Array(16);
 let length=0;
 try{while(length<4){const part=await reader.read();if(part.done)break;const bytes=part.value.subarray(0,first.length-length);first.set(bytes,length);length+=bytes.length;}}
 finally{await reader.cancel().catch(()=>{});}
 if(length>=4&&String.fromCharCode(...first.subarray(0,4))==='fLaC')return {url:url.href,mime:'audio/flac'};
 if(length>=3&&String.fromCharCode(...first.subarray(0,3))==='ID3')return {url:url.href,mime:'audio/mpeg'};
 if(length>=2&&first[0]===0xff&&(first[1]&0xe0)===0xe0)return {url:url.href,mime:'audio/mpeg'};
 throw Error('Unsupported audio format');
}
