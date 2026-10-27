import type {Song} from './music-types';
export type PlaylistShare={token:string;title:string;count:number;pages:number;expiresAt:number;songs:Song[]};
export const SHARE_TOKEN=/^[a-f0-9]{64}$/;
export function playlistShareUrl(origin:string,token:string,publicPlaylist=false){
 if(publicPlaylist?!/^\d{1,18}$/.test(token):!SHARE_TOKEN.test(token))throw Error('歌单分享信息无效');
 const url=new URL('/',origin);url.searchParams.set(publicPlaylist?'playlist':'p',token);return url.href;
}
export function playlistShareTarget(search:string){const p=new URLSearchParams(search);if(p.has('p')){const token=p.get('p')||'';return SHARE_TOKEN.test(token)?{token,publicPlaylist:false}:null}const token=p.get('playlist')||'';return /^\d{1,18}$/.test(token)?{token,publicPlaylist:true}:null}
