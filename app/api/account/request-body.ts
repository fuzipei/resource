export class RequestBodyError extends Error{constructor(message:string,public status=400){super(message)}}
export async function readRequestBody(request:Request,limit=600000){
 if(Number(request.headers.get('content-length')||0)>limit)throw new RequestBodyError('请求过大',413);
 const reader=request.body?.getReader();if(!reader)throw new RequestBodyError('请求为空');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new RequestBodyError('请求过大',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new RequestBodyError('请求格式无效')}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestBodyError('请求格式无效');return body;
}
