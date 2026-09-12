'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowLeft,Disc3,Play,UserRound,LoaderCircle} from 'lucide-react';
import type {Song} from './music-types';
import {splitArtists,type EntityTarget,type MusicEntity} from './music-entity-types';
import './music-entity.css';
export function SongMetadata({song,onOpen,album=true}:{song:Song;onOpen:(target:EntityTarget)=>void;album?:boolean}){
 const names=splitArtists(song.artist);
 return <span className="song-metadata">{names.map((name,i)=><span key={name}>{i>0&&<span className="metadata-separator"> / </span>}{['未知歌手','未知艺人','unknown'].includes(name.toLowerCase())?<span>{name}</span>:<button type="button" aria-label={'查看歌手 '+name} onClick={()=>onOpen({kind:'artist',name,song})}>{name}</button>}</span>)}{album&&song.album?.trim()&&<><span className="metadata-separator"> · </span><button type="button" aria-label={'查看专辑 '+song.album} onClick={()=>onOpen({kind:'album',name:song.album,song})}>{song.album}</button></>}</span>;
}
export function MusicEntityPage({target,onBack,onPlayer,onOpen,play,renderSongs}:{target:EntityTarget;onBack:()=>void;onPlayer:()=>void;onOpen:(target:EntityTarget)=>void;play:(song:Song,list:Song[])=>void;renderSongs:(songs:Song[])=>ReactNode}){
 const [data,setData]=useState<MusicEntity|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();setLoading(true);setError('');setData(null);const p=new URLSearchParams({kind:target.kind,name:target.name});if(target.id)p.set('id',target.id);else if(target.song){p.set('songId',target.song.id);p.set('title',target.song.title);p.set('artist',target.song.artist);p.set('album',target.song.album||'')}
  fetch('/api/music-entity?'+p,{signal:c.signal}).then(async r=>{const j=await r.json() as MusicEntity&{error?:string};if(!r.ok)throw Error(j.error||'资料加载失败');if(!c.signal.aborted)setData(j)}).catch(e=>{if(!c.signal.aborted)setError(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort();
 },[target,retry]);
 return <section className="entity-page"><nav className="entity-nav" aria-label="音乐资料导航"><button onClick={onBack}><ArrowLeft size={16}/>返回</button><button onClick={onPlayer}>回到正在播放</button></nav>
 {loading?<div className="entity-loading" role="status"><LoaderCircle className="spin" size={22}/>正在加载{target.kind==='artist'?'歌手':'专辑'}资料…</div>:error?<div className="empty-state"><p role="alert">{error}</p><button className="primary-btn" onClick={()=>setRetry(n=>n+1)}>重新加载</button></div>:data&&<>
 <header className={'entity-hero entity-'+data.kind}><div className="entity-art">{data.cover?<img src={data.cover} alt={data.name} onError={e=>{e.currentTarget.hidden=true}}/>:data.kind==='artist'?<UserRound size={64}/>:<Disc3 size={64}/>}</div><div><small>{data.kind==='artist'?'艺人':'专辑'}</small><h2>{data.name}</h2>{data.artists.length>0&&<p>{data.artists.map((a,i)=><span key={a.id}>{i>0&&' / '}<button className="entity-text-link" onClick={()=>onOpen({kind:'artist',id:a.id,name:a.name})}>{a.name}</button></span>)}</p>}<p>{data.kind==='artist'?`热门歌曲 ${data.songs.length} 首`:`${data.songs.length} 首歌曲`}{data.published&&data.published>0?' · '+new Date(data.published).getFullYear():''}</p><button className="primary-btn" disabled={!data.songs.length} onClick={()=>play(data.songs[0],data.songs)}><Play size={16}/>播放{data.kind==='artist'?'热门歌曲':'专辑'}</button></div></header>
 {data.description&&<details className="entity-description"><summary>{data.kind==='artist'?'歌手简介':'专辑介绍'}</summary><p>{data.description}</p></details>}
 <div className="music-section-title"><h2>{data.kind==='artist'?'热门歌曲':'专辑曲目'}</h2>{data.kind==='album'&&data.total>data.songs.length&&<span>当前显示 {data.songs.length} / {data.total} 首</span>}</div>{data.songs.length?renderSongs(data.songs):<p className="empty-state">暂未提供可读取的歌曲</p>}
 {data.albums.length>0&&<section className="entity-albums"><div className="music-section-title"><h2>热门歌曲收录专辑</h2></div><div className="entity-album-grid">{data.albums.map(a=><button key={a.id} onClick={()=>onOpen({kind:'album',id:a.id,name:a.name})}><div>{a.cover?<img src={a.cover} loading="lazy" alt="" onError={e=>{e.currentTarget.hidden=true}}/>:<Disc3/>}</div><b>{a.name}</b></button>)}</div></section>}
 </>}
 </section>;
}
