'use client';
import {memo,useLayoutEffect,useRef} from 'react';
import {glyphProgress,type Glyph} from './lyric-timing';
export const KaraokeText=memo(function KaraokeText({glyphs,active,time,playing,getPlaybackTime}:{glyphs:Glyph[];active:boolean;time:number;playing:boolean;getPlaybackTime?:()=>number}){
 const root=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;let frame=0;const characters=el.querySelectorAll<HTMLElement>('[data-glyph]');
  function paint(){const current=getPlaybackTime?.()??time;characters.forEach(char=>{const progress=active?glyphProgress(glyphs[Number(char.dataset.glyph)],current):0;char.style.setProperty('--word-fill',`${progress*100}%`)});if(active&&playing)frame=requestAnimationFrame(paint)}
  paint();return()=>cancelAnimationFrame(frame);
 },[glyphs,active,time,playing,getPlaybackTime]);
 return <span ref={root} className="karaoke-text" aria-hidden="true">{glyphs.map((glyph,i)=>glyph.text==='\n'?<br key={i}/>:<span className="karaoke-character" key={i} data-glyph={i} data-text={glyph.text}>{glyph.text}</span>)}</span>;
});
