import 'server-only';
import {createClient} from '../api/account/redis';
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const PREFIX='resonance:account:v1:';
export const SETTINGS=PREFIX+'site-settings';
export const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export const variables=()=>(process.env as Record<string,string>);
export type DB=ReturnType<typeof createClient>;
export class ApiError extends Error{constructor(message:string,public status=400){super(message)}}
export const result=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export function databaseUrl(){const value=(variables().REDIS_URL||'').trim();if(!value)throw new ApiError('数据库尚未配置，请设置 REDIS_URL',503);let parsed:URL;try{parsed=new URL(value)}catch{throw new ApiError('REDIS_URL 格式无效',503)}if(!['redis:','rediss:'].includes(parsed.protocol))throw new ApiError('REDIS_URL 必须使用 redis:// 或 rediss:// 连接地址',503);return parsed.protocol==='redis:'&&parsed.hostname.endsWith('.upstash.io')?value.replace(/^redis:/i,'rediss:'):value}
export async function database(){const url=databaseUrl();const db=createClient({url,socket:{connectTimeout:8000,reconnectStrategy:false}});await db.connect();return db}
export function origin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new ApiError('请求来源不匹配',403)}
export async function body(r:Request,limit=200000){if(Number(r.headers.get('content-length')||0)>limit)throw new ApiError('请求过大',413);const reader=r.body?.getReader();if(!reader)throw new ApiError('请求为空');let size=0;const chunks:Uint8Array[]=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new ApiError('请求过大',413)}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{throw new ApiError('数据格式无效')}}
export const secureCookie=(r:Request,name:string,value:string,ttl:number)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${new URL(r.url).protocol==='https:'?'; Secure':''}`;
export function readCookie(r:Request,name:string){return r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||''}
export async function limit(db:DB,r:Request,label:string,max=10){const ip=r.headers.get('cf-connecting-ip')||r.headers.get('x-forwarded-for')?.split(',')[0]||'local';const key=PREFIX+'security-limit:'+digest(ip+label);const n=await db.incr(key);if(n===1)await db.expire(key,600);if(n>max)throw new ApiError('操作过于频繁，请十分钟后重试',429)}
export const same=(a:string,b:string)=>timingSafeEqual(Buffer.from(digest(a)),Buffer.from(digest(b)));
export const nonce=()=>randomBytes(32).toString('hex');
export type Provider={enabled:boolean;clientId:string;clientSecret:string;issuer?:string};
export type SiteSettings={announcement:{enabled:boolean;text:string};turnstile:{siteKey:string;secretKey:string};sso:Record<string,Provider>};
export async function settings(db:DB):Promise<SiteSettings>{const v=JSON.parse(await db.get(SETTINGS)||'{}');return {announcement:{enabled:false,text:'',...v.announcement},turnstile:{siteKey:'',secretKey:'',...v.turnstile},sso:v.sso||{}}}
