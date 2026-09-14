import {useLayoutEffect,useRef,useState} from 'react';
export const PLAYLIST_ROW_HEIGHT=58;
export function usePlaylistWindow(count:number,enabled:boolean,resetKey:string){
 const table=useRef<HTMLTableElement>(null),[range,setRange]=useState({start:0,end:40});
 useLayoutEffect(()=>{if(!enabled||count<=100)return;let frame=0;
  const update=()=>{frame=0;const el=table.current;if(!el)return;const top=el.getBoundingClientRect().top+(el.tHead?.getBoundingClientRect().height||0);
   const first=Math.max(0,Math.floor(-top/PLAYLIST_ROW_HEIGHT));const size=Math.ceil(window.innerHeight/PLAYLIST_ROW_HEIGHT)+24;
   const start=Math.min(Math.max(0,count-size),Math.max(0,first-12)),end=Math.min(count,start+size);
   setRange(old=>old.start===start&&old.end===end?old:{start,end});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};update();
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  const observer=new ResizeObserver(schedule);if(table.current?.parentElement)observer.observe(table.current.parentElement);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
 },[count,enabled,resetKey]);
 const start=count<=100?0:Math.min(range.start,Math.max(0,count-1)),end=count<=100?count:Math.min(count,Math.max(start+1,range.end));
 return {table,start,end,top:start*PLAYLIST_ROW_HEIGHT,bottom:(count-end)*PLAYLIST_ROW_HEIGHT};
}
