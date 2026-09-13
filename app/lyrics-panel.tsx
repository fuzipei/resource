'use client';
import {useCallback,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {AudioLines,MoreHorizontal,Check,ChevronLeft,ChevronRight} from 'lucide-react';
import './lyrics-controls.css';
import {lyricGlyphs,lyricPosition,lyricTime,audioTimeForLyric,clampLyricOffset,type LyricLine as Line} from './lyric-timing';
import {KaraokeText} from './karaoke-text';
export function LyricsPanel({lines,text,busy,time,onSeek,playing=false,duration=0,getPlaybackTime,trackKey,seekVersion=0}:{lines:Line[];text:string;busy:boolean;time:number;onSeek:(time:number)=>void;playing?:boolean;duration?:number;getPlaybackTime?:()=>number;trackKey?:string;seekVersion?:number}){
 const [fontSize,setFontSize]=useState(28);
 const [displayMode,setDisplayMode]=useState<'karaoke'|'scroll'>('karaoke');
 useEffect(()=>{try{if(localStorage.getItem('resonance-lyric-display-mode')==='scroll')setDisplayMode('scroll')}catch{}},[]);
 function changeDisplayMode(value:string){const mode=value==='scroll'?'scroll':'karaoke';setDisplayMode(mode);try{localStorage.setItem('resonance-lyric-display-mode',mode)}catch{}}
 const [menu,setMenu]=useState<'options'|'size'|'timing'|null>(null);const sizeOpen=menu==='size',timingOpen=menu==='timing';
 const [adjustment,setAdjustment]=useState({key:trackKey,value:0});
 const offset=adjustment.key===trackKey?adjustment.value:0;
 const offsetLabel=offset>0?`提前 ${offset.toFixed(1)} 秒`:offset<0?`延后 ${(-offset).toFixed(1)} 秒`:'与原歌词同步';
 const timingSlider=useRef<HTMLInputElement>(null);
 useEffect(()=>{let value=0;try{if(trackKey)value=clampLyricOffset(Number(localStorage.getItem('resonance-lyric-offset:'+trackKey)||0))}catch{}setAdjustment({key:trackKey,value});setMenu(null)},[trackKey]);
 function changeOffset(value:number){const next=clampLyricOffset(value);setAdjustment({key:trackKey,value:next});try{if(trackKey)localStorage.setItem('resonance-lyric-offset:'+trackKey,String(next))}catch{}}
 const getLyricTime=useCallback(()=>lyricTime(getPlaybackTime?.()??time,offset),[getPlaybackTime,time,offset]);
 const control=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),modeOption=useRef<HTMLButtonElement>(null),slider=useRef<HTMLInputElement>(null);
 const optionsId=useId(),sizeId=useId(),timingId=useId();
 useEffect(()=>{if(!menu)return;(menu==='options'?modeOption:sizeOpen?slider:timingSlider).current?.focus();
  const outside=(event:PointerEvent)=>{if(!control.current?.contains(event.target as Node))setMenu(null)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenu(null);trigger.current?.focus()}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
 },[menu,sizeOpen]);
 useEffect(()=>{try{const stored=localStorage.getItem('resonance-lyric-font-size');if(stored!==null&&Number.isFinite(Number(stored)))setFontSize(Math.min(48,Math.max(16,Number(stored))))}catch{}},[]);
 function changeSize(value:number){const size=Math.min(48,Math.max(16,value));setFontSize(size);try{localStorage.setItem('resonance-lyric-font-size',String(size))}catch{}}
 const [userScrolling,setUserScrolling]=useState(false),[scrollVersion,setScrollVersion]=useState(0);
 const forceAlign=useRef(false),lastClock=useRef<{time:number;wall:number}|null>(null),lastSeek=useRef(seekVersion);
 const resumeFollow=()=>{forceAlign.current=true;setUserScrolling(false);setScrollVersion(v=>v+1)};
 useLayoutEffect(()=>{if(lastSeek.current!==seekVersion){lastSeek.current=seekVersion;resumeFollow()}},[seekVersion]);
 const panel=useRef<HTMLDivElement>(null);const previous=useRef<Line[]|null>(null);
 const [position,setPosition]=useState(()=>lyricPosition(lines,lyricTime(time,offset),duration));
 const glyphs=useMemo(()=>lines.map((_,i)=>lyricGlyphs(lines,i,duration)),[lines,duration]);
 useLayoutEffect(()=>{let frame=0;
  const sync=()=>{const current=getLyricTime(),wall=performance.now(),last=lastClock.current;
   if(last&&Math.abs(current-last.time-(playing?(wall-last.wall)/1000:0))>.75)resumeFollow();
   lastClock.current={time:current,wall};const next=lyricPosition(lines,current,duration);setPosition(old=>old.cursor===next.cursor&&old.active===next.active?old:next);if(playing&&!busy)frame=requestAnimationFrame(sync)};
  sync();return()=>cancelAnimationFrame(frame);
 },[lines,time,duration,playing,busy,getLyricTime]);
 const {cursor,active}=position;
 const target=Math.max(0,cursor);
 useLayoutEffect(()=>{const el=panel.current;if(!el)return;if(!lines.length||busy){previous.current=null;el.scrollTop=0;return}if(userScrolling)return;
 const center=(smooth:boolean)=>{const buttons=el.querySelectorAll<HTMLButtonElement>('[data-lyric]');const row=buttons[target];if(!row)return;
 el.style.setProperty('--lyric-edge',el.clientHeight/2+'px');
 const box=row.getBoundingClientRect(),outer=el.getBoundingClientRect();const top=el.scrollTop+box.top-outer.top-el.clientTop+(box.height-el.clientHeight)/2;
 el.scrollTo({top,behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
 };
 center(previous.current===lines&&!forceAlign.current);forceAlign.current=false;previous.current=lines;
 let dimensions='';const observer=new ResizeObserver(()=>{const next=el.clientWidth+':'+el.clientHeight+':'+[...el.querySelectorAll('[data-lyric]')].map(row=>row.getBoundingClientRect().height).join();if(dimensions&&next!==dimensions)center(false);dimensions=next});observer.observe(el);el.querySelectorAll('[data-lyric]').forEach(row=>observer.observe(row));
 return()=>observer.disconnect();
 },[target,lines,busy,fontSize,userScrolling,scrollVersion,displayMode]);
 return <div className={`lyrics-region lyric-mode-${displayMode}`} style={{'--lyric-font-size':fontSize+'px'} as CSSProperties}><div ref={panel} tabIndex={0} onWheel={()=>setUserScrolling(true)} onTouchMove={()=>setUserScrolling(true)} onKeyDown={e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))setUserScrolling(true)}} className={`lyrics-panel ${lines.length&&!busy?'timed-lyrics':''}`} aria-label="歌词"><h3>歌词</h3>{lines.length>0&&!busy&&<div className="lyric-spacer" aria-hidden="true"/>}{busy?<p className="secondary">正在加载歌词…</p>:lines.length?lines.map((line,i)=><button data-lyric={i} key={i} aria-current={i===active?'true':undefined} className={i===active?'active-lyric':''} aria-label={line.text} onClick={()=>{resumeFollow();onSeek(audioTimeForLyric(line.time,offset,duration))}}>{displayMode==='karaoke'&&Math.abs(i-active)<=3?<KaraokeText glyphs={glyphs[i]} active={i===active} time={lyricTime(time,offset)} playing={playing} getPlaybackTime={getLyricTime}/>:<span className="scroll-lyric-text" aria-hidden="true">{line.text}</span>}</button>):text?<p className="plain-lyrics">{text}</p>:<div className="empty-state"><AudioLines/><p>这首歌暂未提供歌词，专心听一会儿。</p></div>}{lines.length>0&&!busy&&<div className="lyric-spacer" aria-hidden="true"/>}</div><div className="lyric-follow-status">{userScrolling&&<button type="button" onClick={resumeFollow}>回到当前歌词</button>}</div><div ref={control} className="lyric-size-control" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setMenu(null)}}><button ref={trigger} type="button" className="lyric-more-trigger" aria-label="歌词选项" title="歌词选项" aria-expanded={menu!==null} aria-controls={menu==='size'?sizeId:menu==='timing'?timingId:optionsId} onClick={()=>setMenu(menu?null:'options')}><MoreHorizontal size={20} aria-hidden="true"/></button>
 {menu==='options'&&<div id={optionsId} className="lyric-size-popover lyric-options-popover" role="group" aria-label="歌词选项"><div className="lyric-options-label">显示模式</div><button ref={modeOption} type="button" className="lyric-option" aria-pressed={displayMode==='karaoke'} onClick={()=>changeDisplayMode('karaoke')}><span>逐字扫亮</span>{displayMode==='karaoke'&&<Check size={16} aria-hidden="true"/>}</button><button type="button" className="lyric-option" aria-pressed={displayMode==='scroll'} onClick={()=>changeDisplayMode('scroll')}><span>仅歌词滚动</span>{displayMode==='scroll'&&<Check size={16} aria-hidden="true"/>}</button><div className="lyric-options-divider"/><button type="button" className="lyric-option" aria-label="调整歌词字号" onClick={()=>setMenu('size')}><span>字号</span><span className="lyric-option-value">{fontSize}px<ChevronRight size={14} aria-hidden="true"/></span></button><button type="button" className="lyric-option" aria-label="调整歌词时间" disabled={!lines.length||busy} onClick={()=>setMenu('timing')}><span>同步调整</span><span className="lyric-option-value">{offset!==0?`${offset>0?'+':''}${offset.toFixed(1)}s`:''}<ChevronRight size={14} aria-hidden="true"/></span></button></div>}
 {timingOpen&&<div id={timingId} className="lyric-size-popover lyric-timing-popover" role="group" aria-label="歌词时间校准"><button type="button" className="lyric-options-back" onClick={()=>setMenu('options')}><ChevronLeft size={14} aria-hidden="true"/>返回</button><div className="lyric-size-heading"><span>歌词时间校准</span><output aria-live="polite">{offsetLabel}</output></div><p>歌词慢了点「提前」，歌词快了点「延后」。</p><div className="lyric-timing-actions"><button type="button" aria-label="歌词提前 0.2 秒" disabled={offset>=10} onClick={()=>changeOffset(offset+.2)}>提前 0.2s</button><button type="button" aria-label="歌词延后 0.2 秒" disabled={offset<=-10} onClick={()=>changeOffset(offset-.2)}>延后 0.2s</button></div><label className="lyric-offset-range"><span>延后 10s</span><span>提前 10s</span><input ref={timingSlider} type="range" aria-label="歌词时间偏移" min="-10" max="10" step="0.1" value={offset} aria-valuetext={offsetLabel} onChange={e=>changeOffset(Number(e.target.value))}/></label><button type="button" className="lyric-size-reset" onClick={()=>changeOffset(0)}>恢复原始时间</button><small className="lyric-timing-note">仅调整歌词扫亮和滚动，不改变音乐播放。{trackKey?'此歌曲的设置会自动记住。':''}</small></div>}{sizeOpen&&<div id={sizeId} className="lyric-size-popover" role="group" aria-label="歌词字号设置"><button type="button" className="lyric-options-back" onClick={()=>setMenu('options')}><ChevronLeft size={14} aria-hidden="true"/>返回</button><div className="lyric-size-heading"><span>歌词字号</span><output aria-live="polite">{fontSize}px</output></div><div className="lyric-size-slider"><button type="button" aria-label="缩小歌词" disabled={fontSize<=16} onClick={()=>changeSize(fontSize-2)}>A−</button><input ref={slider} type="range" aria-label="歌词字号" min="16" max="48" step="1" value={fontSize} aria-valuetext={`${fontSize} 像素`} onChange={e=>changeSize(Number(e.target.value))}/><button type="button" aria-label="放大歌词" disabled={fontSize>=48} onClick={()=>changeSize(fontSize+2)}>A+</button></div><button type="button" className="lyric-size-reset" onClick={()=>changeSize(28)}>恢复默认</button></div>}</div></div>;
}