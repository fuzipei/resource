"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
const Context=createContext({available:false,installed:false,ios:false,message:'',install:async()=>{}});
export function PwaProvider({children}:{children:ReactNode}){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(false),[ios,setIos]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const display=matchMedia('(display-mode: standalone)');const check=()=>setInstalled(display.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);check();
  setIos(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));
  const offer=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent)};const done=()=>{setInstalled(true);setPrompt(null)};
  window.addEventListener('beforeinstallprompt',offer);window.addEventListener('appinstalled',done);display.addEventListener('change',check);
  if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});}
  return()=>{window.removeEventListener('beforeinstallprompt',offer);window.removeEventListener('appinstalled',done);display.removeEventListener('change',check)};
 },[]);
 async function install(){if(!prompt)return;setMessage('');try{await prompt.prompt();const choice=await prompt.userChoice;setMessage(choice.outcome==='accepted'?'已提交安装，请查看系统提示。':'已取消安装，可稍后从浏览器菜单安装。')}catch{setMessage('暂时无法打开安装提示，请使用浏览器菜单安装。')}finally{setPrompt(null)}}
 return <Context.Provider value={{available:!!prompt,installed,ios,message,install}}>{children}</Context.Provider>;
}
export function PwaInstall(){const p=useContext(Context);return <section className="settings-block" aria-label="安装共鸣"><h3>安装共鸣</h3><p>添加到桌面，使用独立窗口听音乐。</p>{p.installed?<p>正在应用模式中运行</p>:p.available?<button className="primary-btn" onClick={()=>void p.install()}>安装到设备</button>:<p>{p.ios?'在 Safari 中打开，点击分享，再选择「添加到主屏幕」。':'打开浏览器菜单，选择「安装共鸣」或「安装此网站为应用」。若未显示，请使用支持安装的浏览器。'}</p>}{p.message&&<p role="status">{p.message}</p>}<p>播放、搜索和账号同步需要网络；断网时会显示重连提示。</p></section>}
