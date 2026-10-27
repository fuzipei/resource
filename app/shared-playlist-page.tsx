'use client';
import {useEffect,useMemo,useState} from 'react';
import {Play,Search,LoaderCircle} from 'lucide-react';
import {fetchJsonWithTimeout} from './fetch-with-timeout';
import type {Song,Mix} from './music-types';
import type {PlaylistShare} from './playlist-share-model';
import {usePlaylistWindow} from './playlist-window';
import {Artwork} from './artwork';
import {PlaylistShareButton} from './playlist-share-button';
export function SharedPlaylistPage({target,play}:{target:{token:string;publicPlaylist:boolean};play:(song:Song,songs:Song[])=>void}){
 const [data,setData]=useState<PlaylistShare|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[query,setQuery]=useState('');
 useEffect(()=>{const c=new AbortController();setBusy(true);setError('');setData(null);setQuery('');
  (async()=>{
   if(target.publicPlaylist){const r=await fetchJsonWithTimeout<Mix&{error?:string}>('/api/curated?id='+target.token,{signal:c.signal,cache:'no-store'},25000);if(!r.ok||!r.data.songs?.length)throw Error(r.data.error||'公开歌单暂时无法加载');return {token:target.token,title:r.data.title,songs:r.data.songs,count:r.data.songs.length,pages:1,expiresAt:0}}
   const load=async(page:number)=>{const r=await fetchJsonWithTimeout<PlaylistShare&{error?:string}>('/api/playlist-share?'+new URLSearchParams({id:target.token,page:String(page)}),{signal:c.signal,cache:'no-store'},20000);if(!r.ok)throw Error(r.data.error||'分享歌单暂时无法加载');if(!Array.isArray(r.data.songs)||!Number.isInteger(r.data.pages)||r.data.pages<1||r.data.pages>10000)throw Error('分享歌单数据不完整');return r.data};
   const first=await load(0),parts:Song[][]=Array(first.pages);parts[0]=first.songs;let next=1;
   await Promise.all(Array.from({length:Math.min(3,first.pages-1)},async()=>{while(next<first.pages){const page=next++,part=await load(page);if(part.count!==first.count||part.expiresAt!==first.expiresAt)throw Error('分享状态已变化，请重新加载');parts[page]=part.songs}}));
   const songs=parts.flat();if(songs.length!==first.count)throw Error('分享歌单未完整读取，请重试');return {...first,songs};
  })().then(result=>{if(!c.signal.aborted)setData(result)}).catch(e=>{if(!c.signal.aborted){setError((e as Error).message);setBusy(false);c.abort()}}).finally(()=>{if(!c.signal.aborted)setBusy(false)});
  return()=>c.abort();
 },[target.token,target.publicPlaylist,retry]);
 const rows=useMemo(()=>data?.songs.filter(s=>!query||`${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(query.toLowerCase()))||[],[data,query]);
 const playable=useMemo(()=>rows.filter(s=>s.importStatus!=='unmatched'),[rows]);
 const windowed=usePlaylistWindow(rows.length,!!data,target.token+query);
 if(error)return <div className="empty-state" role="alert"><h2>分享歌单暂时无法打开</h2><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>重新加载</button></div>;
 if(busy||!data)return <div className="loading-text" role="status"><LoaderCircle className="spin"/>正在读取分享歌单…</div>;
 return <section className="shared-playlist"><header className="playlist-hero"><div className="playlist-art"><Artwork song={data.songs[0]}/></div><div className="playlist-hero-info"><span className="playlist-eyebrow">分享歌单</span><h2>{data.title}</h2><p>{data.count} 首歌曲{data.expiresAt?' · 分享时的歌曲快照':''}</p><div className="playlist-actions"><button className="primary-btn" disabled={!playable.length} onClick={()=>play(playable[0],playable)}><Play size={17}/>播放全部</button>{target.publicPlaylist&&<PlaylistShareButton id={target.token} title={data.title}/>}</div></div></header><label className="playlist-search"><Search size={16}/><input aria-label="搜索分享歌单内歌曲" placeholder="搜索歌单内歌曲" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className="playlist-table-wrap"><table ref={windowed.table} className="playlist-table" aria-rowcount={rows.length+1}><thead><tr><th>#</th><th>歌曲</th><th className="playlist-artist-column">歌手</th><th className="playlist-duration">时长</th></tr></thead><tbody>{windowed.top>0&&<tr aria-hidden="true" className="virtual-spacer"><td colSpan={4} style={{height:windowed.top,padding:0,border:0}}/></tr>}{rows.slice(windowed.start,windowed.end).map((song,index)=><tr key={song.id+':'+(windowed.start+index)} aria-rowindex={windowed.start+index+2}><td className="playlist-number">{windowed.start+index+1}</td><td><button className="playlist-track" disabled={song.importStatus==='unmatched'} onClick={()=>play(song,playable)}><Artwork song={song}/><span><b>{song.title}</b><small>{song.artist}{song.importStatus==='unmatched'?' · 暂无音源':''}</small></span></button></td><td className="playlist-artist-column">{song.artist}</td><td className="playlist-duration">{song.duration||'—'}</td></tr>)}{windowed.bottom>0&&<tr aria-hidden="true" className="virtual-spacer"><td colSpan={4} style={{height:windowed.bottom,padding:0,border:0}}/></tr>}</tbody></table>{!rows.length&&<p className="empty-state">没有匹配的歌曲</p>}</div></section>;
}
