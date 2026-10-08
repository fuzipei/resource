'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {lookupArtwork} from './artwork';
import {artworkCandidates} from './artwork-candidates';
import type {Song} from './music-types';

type Options={audio:RefObject<HTMLAudioElement|null>;song:Song|null;source?:string;playing:boolean;canSkip:boolean;play:()=>void;pause:()=>void;previous:()=>void;next:()=>void;seek:(time:number)=>void};
function loadImage(src:string,signal:AbortSignal):Promise<boolean>{
 return new Promise(resolve=>{
  if(signal.aborted){resolve(false);return}
  const image=new Image();let finished=false;
  const finish=(ok:boolean)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',abort);image.onload=null;image.onerror=null;image.removeAttribute('src');resolve(ok)};
  const abort=()=>finish(false),timer=setTimeout(abort,4000);
  signal.addEventListener('abort',abort,{once:true});image.onload=()=>finish(image.naturalWidth>0);image.onerror=abort;image.src=src;
 });
}
async function mediaArtwork(song:Song,signal:AbortSignal){
 const tried=new Set<string>();
 async function find(value:string){for(const src of artworkCandidates(value,512).slice(0,3)){if(signal.aborted)return '';if(tried.has(src))continue;tried.add(src);if(await loadImage(src,signal))return src}return ''}
 const direct=await find(song.cover&&!song.cover.includes('at38.cn')?song.cover:'');if(direct||signal.aborted)return direct;
 const params=new URLSearchParams({v:'2',id:song.id,title:song.title,artist:song.artist,album:song.album||''}).toString();
 return find(await lookupArtwork(params,signal));
}

export function useMediaSession(options:Options){
 const latest=useRef(options);useEffect(()=>{latest.current=options},[options]);
 const {audio,song,source,playing,canSkip}=options;
 useEffect(()=>{
  if(!song||!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
  const session=navigator.mediaSession,controller=new AbortController();
  const metadata=new MediaMetadata({title:song.title,artist:song.artist,album:song.album||'',artwork:[]});session.metadata=metadata;
  const originalTitle=document.title,title=[song.title,song.artist].filter(Boolean).join(' · ')+' - 共鸣';document.title=title;
  void mediaArtwork(song,controller.signal).then(src=>{if(src&&!controller.signal.aborted&&session.metadata===metadata)metadata.artwork=[{src}]}).catch(()=>{/* Text remains useful when artwork is unavailable. */});
  return()=>{controller.abort();if(session.metadata===metadata)session.metadata=null;if(document.title===title)document.title=originalTitle};
 },[song?.provider,song?.id,song?.title,song?.artist,song?.album,song?.cover]);

 useEffect(()=>{
  if(!('mediaSession' in navigator))return;
  const session=navigator.mediaSession;
  const set=(action:MediaSessionAction,handler:MediaSessionActionHandler|null)=>{try{session.setActionHandler(action,handler)}catch{/* Each browser supports a different subset of controls. */}};
  const seekTo=(time:number)=>{const element=audio.current;if(element&&Number.isFinite(element.duration)&&element.duration>0&&Number.isFinite(time))latest.current.seek(Math.max(0,Math.min(element.duration,time)))};
  const handlers:Partial<Record<MediaSessionAction,MediaSessionActionHandler|null>>={
   play:()=>latest.current.play(),pause:()=>latest.current.pause(),
   previoustrack:canSkip?()=>latest.current.previous():null,nexttrack:canSkip?()=>latest.current.next():null,
   seekto:details=>{if(details.seekTime!==undefined)seekTo(details.seekTime)},
   seekbackward:details=>seekTo((audio.current?.currentTime||0)-(details.seekOffset??10)),
   seekforward:details=>seekTo((audio.current?.currentTime||0)+(details.seekOffset??10)),
  };
  for(const [action,handler] of Object.entries(handlers))set(action as MediaSessionAction,song?handler!:null);
  return()=>{for(const action of Object.keys(handlers))set(action as MediaSessionAction,null)};
 },[audio,!!song,canSkip]);

 useEffect(()=>{
  if(!('mediaSession' in navigator))return;
  const session=navigator.mediaSession;session.playbackState=!song?'none':playing?'playing':'paused';
 },[!!song,playing]);
 useEffect(()=>{
  if(!('mediaSession' in navigator))return;
  const element=audio.current,session=navigator.mediaSession;let last=0;
  const update=()=>{try{if(!song||!element||element.readyState===0||!Number.isFinite(element.duration)||element.duration<=0){session.setPositionState?.();return}session.setPositionState?.({duration:element.duration,playbackRate:element.playbackRate||1,position:Math.max(0,Math.min(element.currentTime,element.duration))})}catch{/* Some system media controls do not expose a seek bar. */}};
  const tick=()=>{const now=Date.now();if(now-last>=1000){last=now;update()}};
  const events=['loadedmetadata','durationchange','seeked','ratechange','play','pause','ended','emptied'];
  events.forEach(event=>element?.addEventListener(event,update));element?.addEventListener('timeupdate',tick);update();
  return()=>{events.forEach(event=>element?.removeEventListener(event,update));element?.removeEventListener('timeupdate',tick);try{session.setPositionState?.()}catch{}};
 },[audio,song?.provider,song?.id,source]);
 useEffect(()=>()=>{if('mediaSession' in navigator)navigator.mediaSession.playbackState='none'},[]);
}
