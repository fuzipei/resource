export const dynamic='force-dynamic';
import {authConfig} from '../account/auth-config';
export async function GET(){try{const c=await authConfig();return Response.json({siteKey:c.siteKey,configured:!!(c.siteKey&&c.secretKey)},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({siteKey:'',configured:false,error:'验证配置暂时无法读取'},{status:503,headers:{'Cache-Control':'no-store'}})}}

