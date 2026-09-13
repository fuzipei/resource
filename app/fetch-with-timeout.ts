// Keep cancellation and the deadline active while the response body is consumed.
async function request<T>(input:RequestInfo|URL,init:RequestInit,milliseconds:number,read:(response:Response)=>Promise<T>):Promise<T>{
 const controller=new AbortController(),parent=init.signal;
 const abort=()=>controller.abort();
 if(parent?.aborted)abort();else parent?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,milliseconds);
 try{return await read(await fetch(input,{...init,signal:controller.signal}))}
 finally{clearTimeout(timer);parent?.removeEventListener('abort',abort)}
}
export function fetchWithTimeout(input:RequestInfo|URL,init:RequestInit={},milliseconds=18000):Promise<Response>{return request(input,init,milliseconds,async response=>response)}
export function fetchJsonWithTimeout<T=any>(input:RequestInfo|URL,init:RequestInit={},milliseconds=18000){return request(input,init,milliseconds,async response=>({ok:response.ok,status:response.status,data:await response.json() as T}))}
