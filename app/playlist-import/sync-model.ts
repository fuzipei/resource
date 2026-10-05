import {normalize,type ExternalTrack} from './model';
import type {Song} from '../music-types';
export const sourceTrackKey=(s:{title:string;artist:string;id?:string;catalogId?:string})=>s.catalogId||(/^(wy_\d+|qq_[a-zA-Z0-9]+)$/.test(s.id||'')?s.id!:normalize(s.title)+'|'+normalize(s.artist));
export const managedSongKey=(s:{provider:string;id:string})=>s.provider+':'+s.id;
export function nextSyncTime(now=Date.now()){const shifted=now+8*3600000,day=Math.floor(shifted/86400000);const today=day*86400000+4*3600000-8*3600000;return today>now?today:today+86400000}
export function sourceUrl(input:unknown){
 if(typeof input!=='string')return '';
 const raw=input.match(/https?:\/\/[^\s<>"，。]+/)?.[0];if(!raw)return '';
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port)return '';if(!['music.163.com','y.music.163.com','y.qq.com','i.y.qq.com','www.kugou.com','m.kugou.com','open.spotify.com','music.youtube.com','www.youtube.com','youtube.com'].includes(u.hostname))return '';return u.href.slice(0,2000)}catch{return ''}
}
export type PlaylistSync={url:string;keys:string[];managed?:string[];ignored?:string[];lastSuccess?:number;checkedAt?:number;added?:number;removed?:number;status?:string;error?:string;baseline?:boolean};
export type SyncedPlaylist={id:string;name:string;songs:Song[];sync?:PlaylistSync};
// Reconcile changes against the previous remote snapshot, preserving local edits.
export function reconcile(playlist:SyncedPlaylist,tracks:ExternalTrack[],resolved:Song[]){
 const sync=playlist.sync!;const latest=new Set(tracks.map(sourceTrackKey)),previous=new Set(sync.keys),existing=new Set(playlist.songs.map(sourceTrackKey));
 const managed=new Set(sync.managed||playlist.songs.map(managedSongKey)),ignored=new Set(sync.ignored||[]);
 const removed=new Set([...previous].filter(k=>!latest.has(k)));
 const additions=resolved.filter(s=>!previous.has(sourceTrackKey(s))&&!existing.has(sourceTrackKey(s))&&!ignored.has(sourceTrackKey(s)));
 const kept=playlist.songs.filter(s=>!(managed.has(managedSongKey(s))&&removed.has(sourceTrackKey(s))));
 return {...playlist,songs:[...kept,...additions],sync:{...sync,keys:[...latest],managed:[...kept.filter(s=>managed.has(managedSongKey(s))),...additions].map(managedSongKey),lastSuccess:Date.now(),checkedAt:Date.now(),added:additions.length,removed:playlist.songs.length-kept.length,status:'ready',error:'',baseline:false}};
}