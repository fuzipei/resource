"use client";
import {useEffect,useRef} from 'react';
import {Info,ArrowRight} from 'lucide-react';
export const SERVICE_NOTICE='本网站仅提供音乐搜索服务，所有内容均来自第三方网站。本站不存储任何资源，不对任何内容的准确性、合法性、完整性负责。';
const cookieName=(id:string)=>'resonance_notice_v1_'+encodeURIComponent(id);
export function ServiceNotice({ready,userId}:{ready:boolean;userId?:string}){
 const dialog=useRef<HTMLDialogElement>(null);const acknowledged=useRef(new Set<string>());
 useEffect(()=>{
  const el=dialog.current;if(!el)return;if(!ready){el.close();return}
  const identity=userId||'guest';let seen=acknowledged.current.has(identity);
  if(userId)try{seen=seen||document.cookie.split(';').some(item=>item.trim()===cookieName(userId)+'=1')}catch{}
  if(seen)el.close();else if(!el.open)el.showModal();
  return()=>el.close();
 },[ready,userId]);
 function accept(){if(!ready)return;acknowledged.current.add(userId||'guest');if(userId)try{document.cookie=cookieName(userId)+'=1; Path=/; Max-Age=34560000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')}catch{}dialog.current?.close()}
 return <dialog ref={dialog} className="service-notice" aria-labelledby="service-notice-title" aria-describedby="service-notice-body" onCancel={e=>{e.preventDefault();accept()}}><header className="service-notice-heading"><span className="service-notice-icon" aria-hidden="true"><Info size={24}/></span><div><h2 id="service-notice-title">网站公告</h2><small>使用前，请阅读以下说明</small></div></header><p id="service-notice-body">{SERVICE_NOTICE}</p><button type="button" className="primary-btn notice-accept" onClick={accept}><span>同意并继续</span><ArrowRight size={17} aria-hidden="true"/></button></dialog>;
}
