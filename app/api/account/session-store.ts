import type {createClient} from './redis';
type DB=ReturnType<typeof createClient>;
export async function sessionRecord(db:DB,key:string,prefix:string){
 if(!key)return [] as string[];
 return await db.eval(`-- account-session
 local uid=redis.call('GET',KEYS[1]);if not uid then return {} end
 return {uid,redis.call('GET',ARGV[1]..'user:'..uid) or '',redis.call('GET',ARGV[1]..'revoke:'..uid) or '0',redis.call('GET',KEYS[1]..':issued') or '0'}`,{keys:[key],arguments:[prefix]}) as string[];
}
export async function loginLimits(db:DB,ipKey:string,userKey:string){
 return await db.eval(`-- account-login-limits
 local ip=redis.call('INCR',KEYS[1]);if ip==1 then redis.call('EXPIRE',KEYS[1],600) end
 if ip>100 then return {ip,0} end
 local user=redis.call('INCR',KEYS[2]);if user==1 then redis.call('EXPIRE',KEYS[2],600) end
 return {ip,user}`,{keys:[ipKey,userKey],arguments:[]}) as number[];
}
export async function accountByName(db:DB,index:string,prefix:string){
 return await db.eval(`-- account-by-name
 local uid=redis.call('GET',KEYS[1]);if not uid then return {} end
 return {uid,redis.call('GET',ARGV[1]..uid) or ''}`,{keys:[index],arguments:[prefix+'user:']}) as string[];
}
export async function establishSession(db:DB,prefix:string,id:string,passwordHash:string,nextKey:string,oldKey:string,ttl:number){
 return Number(await db.eval(`-- account-establish-session
 local raw=redis.call('GET',KEYS[1]);if not raw then return 0 end
 local user=cjson.decode(raw);if user.disabled or user.password~=ARGV[4] then return 0 end
 user.lastLogin=tonumber(ARGV[2]);redis.call('SET',KEYS[1],cjson.encode(user))
 redis.call('SET',KEYS[2],ARGV[1],'EX',ARGV[3]);redis.call('SET',KEYS[3],ARGV[2],'EX',ARGV[3])
 if #KEYS>3 then redis.call('DEL',KEYS[4],KEYS[5]) end
 return 1`,{keys:[prefix+'user:'+id,nextKey,nextKey+':issued',...(oldKey?[oldKey,oldKey+':issued']:[])],arguments:[id,String(Date.now()),String(ttl),passwordHash]}))===1;
}
