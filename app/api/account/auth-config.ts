import {database,settings} from '../../server/site-store';

import type {AuthConfig} from './auth-security';
export async function authConfig():Promise<AuthConfig>{const e=process.env;let db;let saved;try{db=await database();saved=(await settings(db)).turnstile}catch{/* Keep environment keys available when the settings store is offline. */}finally{db?.destroy()}return {siteKey:(saved?.siteKey||e.TURNSTILE_SITE_KEY||process.env.TURNSTILE_SITE_KEY||'').trim(),secretKey:(saved?.secretKey||e.TURNSTILE_SECRET_KEY||process.env.TURNSTILE_SECRET_KEY||'').trim(),inviteCode:e.REGISTRATION_INVITE_CODE||process.env.REGISTRATION_INVITE_CODE||''}}
