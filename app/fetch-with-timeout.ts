// Use basic AbortController APIs so older browsers can still play music.
export async function fetchWithTimeout(input:RequestInfo|URL,init:RequestInit={},milliseconds=18000):Promise<Response>{
 const controller=new AbortController(),parent=init.signal;
 const abort=()=>controller.abort();
 if(parent?.aborted)abort();else parent?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,milliseconds);
 try{return await fetch(input,{...init,signal:controller.signal})}
 finally{clearTimeout(timer);parent?.removeEventListener('abort',abort)}
}
