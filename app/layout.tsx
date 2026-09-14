import {PwaProvider} from './pwa';
﻿import type {Metadata} from 'next';
import './globals.css';
import './guofeng.css';
export const metadata:Metadata={manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'共鸣',statusBarStyle:'default'},icons:{apple:'/icons/apple-touch-icon.png'},title:'共鸣 Resonance · 现在就听',description:'发现正在流行的旋律，随机遇见喜欢的歌，分享你的音乐感受。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" suppressHydrationWarning><head><meta name="theme-color" content="#16604a"/><script dangerouslySetInnerHTML={{__html:`try{var b=localStorage.getItem("resonance-scenic-blur");document.documentElement.style.setProperty("--scenic-blur",(b!==null&&Number.isFinite(Number(b))?Math.min(32,Math.max(0,Number(b))):8)+"px");document.documentElement.dataset.skinCategory=["solid","guofeng"].includes(localStorage.getItem("resonance-skin-category"))?localStorage.getItem("resonance-skin-category"):"scenic";var s=localStorage.getItem("resonance-skin");document.documentElement.dataset.skin=["forest","blue","orange","gray","pink","purple","bamboo","gold","guofeng-ink","guofeng-zen","guofeng-jade","guofeng-changan","guofeng-porcelain","guofeng-obsidian"].includes(s)?s:"forest";var p=localStorage.getItem("resonance-appearance");var t=p==="dark"||p==="light"?p:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}`}}/></head><body><PwaProvider>{children}</PwaProvider></body></html>}



