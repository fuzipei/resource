'use client';
import {useEffect,useRef,useState} from 'react';
import {parseTrackFile,validateTracks,type ExternalPlaylist} from './playlist-import/model';
import {matchPlaylist} from './playlist-import/match';
import type {Song} from './music-types';
import './playlist-import/import.css';
type Phase='idle'|'reading'|'matching'|'ready'|'saving'|'cancelled'|'error';
export function PlaylistImport({owner,onSave}:{owner:string;onSave:(data:Record<string,unknown>)=>Promise<void>}){
 const [open,setOpen]=useState(false),[url,setUrl]=useState(''),[list,setList]=useState<ExternalPlaylist|null>(null),[songs,setSongs]=useState<Song[]>([]),[phase,setPhase]=useState<Phase>('idle'),[completed,setCompleted]=useState(0),[total,setTotal]=useState(0),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false);
 const run=useRef(0),abort=useRef<AbortController|null>(null),saving=useRef(false);
 const busy=phase==='reading'||phase==='matching'||phase==='saving';
 useEffect(()=>{setOpen(false);setUrl('');setList(null);setSongs([]);setPhase('idle');setError('');setCompleted(0);setTotal(0);saving.current=false;return()=>{run.current++;abort.current?.abort()}},[owner]);
 async function request(body:unknown,signal:AbortSignal){const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});const j:any=await r.json();if(!r.ok)throw Error(j.error||'导入失败，请稍后重试');return j}
 function cancel(){run.current++;abort.current?.abort();setList(null);setSongs([]);setPhase('cancelled');setError('')}
 async function prepare(file?:File){
  if(saving.current)return;
  const task=++run.current;abort.current?.abort();const controller=new AbortController();abort.current=controller;
  setPhase('reading');setError('');setList(null);setSongs([]);setConfirmed(false);setCompleted(0);setTotal(0);
  try{
   if(file&&file.size>500000)throw Error('文件不能超过 500KB');
   const data:ExternalPlaylist=file?{name:file.name.replace(/\.(csv|json)$/i,''),source:'文件导入',tracks:parseTrackFile(await file.text())}:await request({action:'import-read',url},controller.signal);
   if(task!==run.current)return;
   data.tracks=validateTracks(data.tracks);setTotal(data.tracks.length);setPhase('matching');
   const output=await matchPlaylist(data.tracks,async(tracks,signal)=>(await request({action:'import-match',tracks},signal)).items,controller.signal,count=>{if(task===run.current)setCompleted(count)});
   if(task!==run.current)return;
   setList(data);setSongs(output);setPhase('ready');
  }catch(e){if(task===run.current){setPhase('error');setError(e instanceof Error?e.message:'导入失败，请稍后重试')}}
 }
 async function save(){
  if(!list||busy||saving.current||songs.length!==list.tracks.length||!songs.length||list.warning&&!confirmed)return;
  const task=run.current;saving.current=true;setPhase('saving');setError('');
  try{await onSave({action:'import-save',name:list.name,source:list.source,songs});if(task===run.current){setOpen(false);setList(null);setSongs([]);setPhase('idle')}}
  catch(e){if(task===run.current){setError(e instanceof Error?e.message:'保存失败，请重试');setPhase('ready')}}
  finally{if(task===run.current)saving.current=false}
 }
 const percent=total?Math.floor(completed/total*100):0;
 const labels:Record<Phase,string>={idle:'',reading:'正在读取歌单…',matching:`正在匹配歌单 · ${percent}%`,ready:'匹配完成，请核对后保存',saving:'正在保存歌单…',cancelled:'已取消，可以重新导入',error:'导入未完成，请重试'};
 return <div className="playlist-import"><button className="primary-btn" disabled={phase==='saving'} onClick={()=>{if(open&&busy)cancel();setOpen(v=>!v)}}>导入外部歌单</button>{open&&<section className="import-panel" aria-busy={busy}>
  <h3>导入外部歌单</h3>
  {phase!=='idle'&&<div className="import-progress"><div className="import-progress-header"><span role="status">{labels[phase]}</span>{(phase==='reading'||phase==='matching')&&<button type="button" onClick={cancel}>取消导入</button>}</div><progress aria-label="歌单导入总进度" aria-valuetext={labels[phase]} max={100} value={phase==='reading'||phase==='saving'?undefined:percent}/></div>}
  <p>网易云 · QQ 音乐 · 酷狗 · YouTube Music · Spotify</p>
  <form onSubmit={e=>{e.preventDefault();if(!busy&&url.trim())void prepare()}}><input aria-label="外部歌单链接" placeholder="粘贴公开歌单的完整链接" value={url} disabled={busy} maxLength={2000} onChange={e=>setUrl(e.target.value)}/><button disabled={busy||!url.trim()} className="primary-btn">读取并匹配</button></form>
  <label className="import-file">或导入 CSV / JSON 文件<input type="file" accept=".csv,.json,text/csv,application/json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void prepare(f);e.target.value=''}}/></label>
  <p>文件包含 title（歌曲名称）与 artist（歌手），每次最多 500 首。短分享链接请先在原平台打开，复制完整歌单地址。</p>
  {error&&<p role="alert" className="import-error">{error}</p>}
  {list&&(phase==='ready'||phase==='saving')&&<><label>歌单名称<input disabled={busy} value={list.name} maxLength={60} onChange={e=>setList({...list,name:e.target.value})}/></label>
   {list.warning&&<label className="import-warning"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{list.warning} 我已核对并接受本次导入范围。</label>}
   <p>共 {songs.length} 首 · 已匹配 {songs.filter(s=>s.importStatus==='matched').length} 首 · 未匹配 {songs.filter(s=>s.importStatus==='unmatched').length} 首</p>
   <details className="import-result"><summary>查看导入结果</summary><div className="import-preview">{songs.map((s,i)=><div key={i} className={s.importStatus==='unmatched'?'unmatched-song':''}><b>{s.title}</b><span>{s.artist}</span><small>{s.importStatus==='unmatched'?'未找到歌曲资源':'已匹配'}</small></div>)}</div></details>
   <button className="primary-btn" disabled={busy||!!list.warning&&!confirmed} onClick={save}>保存到我的歌单</button>
  </>}
 </section>}</div>;
}
