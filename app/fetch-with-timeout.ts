function timeoutError(){const error=new Error('请求超时，请稍后重试。');error.name='TimeoutError';return error}
function cancellationReason(reason:unknown){
 return reason&&typeof reason==='object'&&'name' in reason&&reason.name==='TimeoutError'
  ?timeoutError():new DOMException('请求已取消。','AbortError');
}
// Distinguish a request deadline from deliberate cancellation, including response-body reads.
async function request<T>(input:RequestInfo|URL,init:RequestInit,milliseconds:number,read:(response:Response)=>Promise<T>):Promise<T>{
 const controller=new AbortController(),parent=init.signal;
 if(parent?.aborted)throw cancellationReason(parent.reason);
 const abort=()=>{if(!controller.signal.aborted)controller.abort(cancellationReason(parent?.reason))};
 parent?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>{if(!controller.signal.aborted)controller.abort(timeoutError())},milliseconds);
 try{return await read(await fetch(input,{...init,signal:controller.signal}))}
 catch(error){if(controller.signal.aborted)throw controller.signal.reason;throw error}
 finally{clearTimeout(timer);parent?.removeEventListener('abort',abort)}
}
export function fetchWithTimeout(input:RequestInfo|URL,init:RequestInit={},milliseconds=18000):Promise<Response>{return request(input,init,milliseconds,async response=>response)}
export function fetchJsonWithTimeout<T=any>(input:RequestInfo|URL,init:RequestInit={},milliseconds=18000){return request(input,init,milliseconds,async response=>({ok:response.ok,status:response.status,data:await response.json() as T}))}