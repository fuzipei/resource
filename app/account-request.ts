import {fetchJsonWithTimeout} from './fetch-with-timeout';
const incomplete=()=>new Error('账号同步数据接收不完整，已保留当前歌单，请重新加载后重试。');
async function read(path:string,init:RequestInit,readOnly=false):Promise<any>{
 for(let attempt=0;;attempt++){
  try{const r=await fetchJsonWithTimeout(path,{...init,cache:'no-store',headers:{...init.headers,'x-resonance-data':'paged-v1','x-resonance-auth':'deferred-v1'}},30000);if(!r.ok)throw Error(r.data?.error||'账号同步暂时不可用，请稍后重试');return r.data}
  catch(error){if(error instanceof SyntaxError){if(readOnly&&attempt===0&&!init.signal?.aborted)continue;throw incomplete()}throw error}
 }
}
export async function accountRequest(body?:unknown,signal?:AbortSignal,sessionOnly=false):Promise<any>{
 const response=await read('/api/account'+(!body&&sessionOnly?'?session=1':''),body?{signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{signal},!body);
 if(!response?.transfer)return response;
 const {id,parts,bytes,sha256}=response.transfer;
 if(!/^[a-f0-9]{32}$/.test(id)||!Number.isSafeInteger(parts)||parts<1||!Number.isSafeInteger(bytes)||bytes<1||parts>bytes||!/^([a-f0-9]{64})$/.test(sha256))throw incomplete();
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)throw new DOMException('请求已取消。','AbortError');signal?.addEventListener('abort',abort,{once:true});
 const chunks=new Map<number,string>();let next=0;
 try{
  await Promise.all(Array.from({length:Math.min(3,parts)},async()=>{while(next<parts){const index=next++;const chunk=await read('/api/account?'+new URLSearchParams({transfer:id,part:String(index)}),{signal:controller.signal},true);if(chunk.part!==index||typeof chunk.text!=='string'||chunk.text.length>48000)throw incomplete();chunks.set(index,chunk.text)}}));
  if(signal?.aborted)throw new DOMException('请求已取消。','AbortError');
  const text=Array.from({length:parts},(_,i)=>chunks.get(i)||'').join('');chunks.clear();const encoded=new TextEncoder().encode(text);
  if(encoded.length!==bytes)throw incomplete();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoded))).map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==sha256)throw incomplete();
  try{return JSON.parse(text)}catch{throw incomplete()}
 }finally{controller.abort();signal?.removeEventListener('abort',abort);chunks.clear()}
}
