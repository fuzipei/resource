'use client';
import {fetchJsonWithTimeout} from './fetch-with-timeout';
import {useEffect,useState,useRef} from 'react';
import {artworkCandidates} from './artwork-candidates';
import {Music2} from 'lucide-react';
import type {Song} from './music-types';
const cache=new Map<string,{until:number;url:string}>();
type Job={controller:AbortController;promise:Promise<string>;users:number};
const pending=new Map<string,Job>();
let running=0;const waiting:(()=>void)[]=[];
function slot(signal:AbortSignal):Promise<()=>void>{return new Promise((resolve,reject)=>{
 const abort=()=>{const index=waiting.indexOf(start);if(index>=0)waiting.splice(index,1);reject(Error('Cancelled'))};
 const start=()=>{signal.removeEventListener('abort',abort);if(signal.aborted){reject(Error('Cancelled'));return}running++;let released=false;resolve(()=>{if(released)return;released=true;running--;waiting.shift()?.()})};
 if(signal.aborted){reject(Error('Cancelled'));return}if(running<4)start();else if(waiting.length<48){waiting.push(start);signal.addEventListener('abort',abort,{once:true})}else reject(Error('Artwork queue full'));
})}
async function requestCover(params:string,signal:AbortSignal){const release=await slot(signal);try{const r=await fetchJsonWithTimeout<{url?:string}>('/api/artwork?'+params,{signal},25000);if(!r.ok)throw Error('Artwork unavailable');return String(r.data.url||'')}finally{release()}}
function lookup(params:string,signal:AbortSignal):Promise<string>{
 if(signal.aborted)return Promise.reject(Error('Cancelled'));
 const hit=cache.get(params);if(hit&&hit.until>Date.now())return Promise.resolve(hit.url);
 let job=pending.get(params);
 if(!job){const controller=new AbortController();const entry:Job={controller,users:0,promise:Promise.resolve('')};
  entry.promise=requestCover(params,controller.signal).then(url=>{if(!controller.signal.aborted){if(cache.size>=120)cache.delete(cache.keys().next().value!);cache.set(params,{url,until:Date.now()+(url?1800000:30000)})}return url}).finally(()=>{if(pending.get(params)===entry)pending.delete(params)});
  pending.set(params,entry);job=entry;
 }
 const entry=job;entry.users++;
 return new Promise((resolve,reject)=>{let finished=false;
  const finish=(error:unknown,url='')=>{if(finished)return;finished=true;signal.removeEventListener('abort',abort);entry.users--;if(!entry.users&&pending.get(params)===entry){pending.delete(params);entry.controller.abort()}if(error)reject(error);else resolve(url)};
  const abort=()=>finish(Error('Cancelled'));signal.addEventListener('abort',abort,{once:true});
  entry.promise.then(url=>finish(null,url),error=>finish(error));
 });
}
export function Artwork({song,large=false}:{song?:Song;large?:boolean}){
 const container=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(large);
 useEffect(()=>{const element=container.current;if(!element)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return}const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting),{rootMargin:'160px'});observer.observe(element);return()=>observer.disconnect()},[]);
 const [failed,setFailed]=useState<string[]>([]),[matched,setMatched]=useState<{key:string;url:string}|null>(null);
 const params=song?new URLSearchParams({v:'2',id:song.id,title:song.title,artist:song.artist,album:song.album||''}).toString():'';
 useEffect(()=>setFailed([]),[params]);
 const original=song?.cover&&!song.cover.includes('at38.cn')?song.cover:'';
 const replacement=matched?.key===params?matched.url:'';
 const size=large?800:160;
 const direct=artworkCandidates(original,size),backup=artworkCandidates(replacement,size);
 const directRemaining=direct.some(src=>!failed.includes(src));
 const url=[...new Set([...direct,...backup])].find(src=>!failed.includes(src))||'';
 useEffect(()=>{if(!visible||!params||directRemaining)return;const controller=new AbortController();lookup(params,controller.signal).then(url=>{if(!controller.signal.aborted)setMatched({key:params,url})}).catch(()=>{});return()=>controller.abort()},[params,directRemaining,visible]);
 return <div ref={container} className={`song-art ${large?'large-art':''}`}>{visible&&url?<img key={url} src={url} alt="" loading={large?'eager':'lazy'} decoding="async" onError={()=>setFailed(list=>list.includes(url)?list:[...list.slice(-11),url])}/>:<><span className="art-sun"/><Music2 aria-hidden="true"/></>}</div>;
}
