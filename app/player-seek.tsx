"use client";
import {useEffect,useState,type RefObject} from 'react';
const fmt=(n:number)=>`${Math.floor((n||0)/60)}:${String(Math.floor((n||0)%60)).padStart(2,'0')}`;
// Audio ticks update this small control, not the page containing every channel.
export function PlayerSeek({audio,duration,onSeek}:{audio:RefObject<HTMLAudioElement|null>;duration:number;onSeek:(value:number)=>void}){
 const [time,setTime]=useState(0);
 useEffect(()=>{const el=audio.current;if(!el)return;const update=()=>setTime(Number.isFinite(el.currentTime)?el.currentTime:0);const events=['timeupdate','seeking','loadedmetadata','emptied'];update();events.forEach(e=>el.addEventListener(e,update));return()=>events.forEach(e=>el.removeEventListener(e,update))},[audio]);
 return <div className="player-seek"><span>{fmt(time)}</span><input type="range" aria-label="播放进度" min="0" max={duration||1} step=".1" value={Math.min(time,duration||1)} disabled={!duration} onChange={e=>{const value=Number(e.target.value);setTime(value);onSeek(value)}}/><span>{fmt(duration)}</span></div>;
}
