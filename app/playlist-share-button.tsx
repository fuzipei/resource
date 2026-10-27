'use client';
import {useEffect,useRef,useState} from 'react';
import {Share2,X,Copy,LoaderCircle} from 'lucide-react';
import {accountRequest} from './account-request';
import {playlistShareUrl} from './playlist-share-model';
import './playlist-share.css';
export function PlaylistShareButton({id,title,personal=false,disabled=false}:{id:string;title:string;personal?:boolean;disabled?:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[url,setUrl]=useState(''),[expires,setExpires]=useState(0),[status,setStatus]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close()},[open]);
 async function prepare(){setOpen(true);setStatus('');if(!personal){setUrl(playlistShareUrl(location.origin,id,true));return}
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setUrl('');
  try{const data=await accountRequest({action:'playlist-share',id},controller.signal);if(!controller.signal.aborted){setUrl(playlistShareUrl(location.origin,data.token));setExpires(data.expiresAt)}}catch(e){if(!controller.signal.aborted)setStatus((e as Error).message)}finally{if(!controller.signal.aborted)setBusy(false)}
 }
 async function copy(){try{await navigator.clipboard.writeText(url);setStatus('歌单链接已复制')}catch{input.current?.focus();input.current?.select();setStatus('请复制选中的歌单链接')}}
 async function revoke(){setBusy(true);setStatus('');try{await accountRequest({action:'playlist-share-revoke',id});setUrl('');setStatus('已取消分享，原链接立即失效')}catch(e){setStatus((e as Error).message)}finally{setBusy(false)}}
 return <><button type="button" disabled={disabled||busy} onClick={()=>void prepare()}><Share2 size={17}/>分享歌单</button><dialog className="playlist-share-dialog" ref={dialog} aria-labelledby={'share-title-'+id} onCancel={()=>setOpen(false)}><button type="button" className="playlist-share-close" aria-label="关闭歌单分享" onClick={()=>setOpen(false)}><X size={20}/></button><h2 id={'share-title-'+id}>分享歌单</h2><p className="playlist-share-name">{title}</p><p>{personal?'链接包含创建分享时的歌曲快照，任何持有链接的人均可查看和播放。':'任何持有链接的人均可查看和播放此公开歌单。'}</p>{busy&&<p role="status"><LoaderCircle className="spin" size={17}/>正在处理分享…</p>}{url&&<><label>歌单链接<input ref={input} readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>{personal&&<p className="secondary">有效期至 {new Date(expires).toLocaleDateString('zh-CN')}。已有分享沿用原快照；要分享最新内容，请取消后重新创建。</p>}<div className="playlist-share-actions"><button type="button" className="primary-btn" disabled={busy} onClick={()=>void copy()}><Copy size={17}/>复制链接</button>{personal&&<button type="button" disabled={busy} onClick={()=>void revoke()}>取消分享</button>}</div></>}{!url&&!busy&&personal&&<button type="button" onClick={()=>void prepare()}>创建分享链接</button>}<p role="status" aria-live="polite">{status}</p></dialog></>;
}
