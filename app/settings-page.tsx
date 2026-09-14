'use client';
import {useEffect,useState} from 'react';
import {Sun,Moon,Monitor,Check} from 'lucide-react';
const guofengSkins=[
 {id:'guofeng-ink',name:'山水素雅',desc:'水墨留白，意境悠远',colors:['#52645b','#f1f1e9','#111f21']},
 {id:'guofeng-zen',name:'月下听禅',desc:'夜色静谧，月映清辉',colors:['#526b83','#e0e7ed','#0d192b']},
 {id:'guofeng-jade',name:'竹影清风',desc:'竹林疏影，清风徐来',colors:['#437463','#e5efe7','#102820']},
 {id:'guofeng-changan',name:'暮色长安',desc:'灯火如歌，长安夜色',colors:['#96533e','#f1dfcf','#30202b']},
 {id:'guofeng-porcelain',name:'玉雪琉璃',desc:'皎洁如玉，纯净通透',colors:['#4b7794','#e6f3f8','#142834']},
 {id:'guofeng-obsidian',name:'玄金雅黑',desc:'低调质感，简约隽永',colors:['#8c7037','#eee7d7','#151613']}
];
const skins=[...guofengSkins,
 {id:'forest',name:'自然森系',desc:'清新治愈，自然舒适',colors:['#16604a','#cfe7d5','#08261e']},
 {id:'blue',name:'星夜蓝',desc:'深邃优雅，沉浸聆听',colors:['#426dea','#dce8ff','#0c1833']},
 {id:'orange',name:'日落橙',desc:'温暖活力，充满情绪',colors:['#dc602a','#ffe5cc','#301b12']},
 {id:'gray',name:'极简灰',desc:'纯粹专注，百搭耐看',colors:['#555b60','#e9eaeb','#181a1c']},
 {id:'pink',name:'樱花粉',desc:'浪漫柔和，氛围感十足',colors:['#d34e89','#ffe0ed','#2d1823']},
 {id:'purple',name:'赛博紫',desc:'未来科技，个性酷炫',colors:['#7c42d9','#e9ddff','#201335']},
 {id:'bamboo',name:'墨竹青',desc:'东方意境，雅致沉稳',colors:['#32776c','#d9ebe5','#102923']},
 {id:'gold',name:'暮色金',desc:'质感高级，经典耐看',colors:['#947039','#f0e4ca','#282116']}
];
export function SettingsPage({visible}:{visible:boolean}){
 const [mode,setMode]=useState('system'),[skin,setSkin]=useState('forest'),[category,setCategory]=useState('scenic'),[blur,setBlur]=useState(8),[ready,setReady]=useState(false);
 useEffect(()=>{try{const savedBlur=localStorage.getItem('resonance-scenic-blur');if(savedBlur!==null&&Number.isFinite(Number(savedBlur)))setBlur(Math.min(32,Math.max(0,Number(savedBlur))));const m=localStorage.getItem('resonance-appearance'),s=localStorage.getItem('resonance-skin');const category=localStorage.getItem('resonance-skin-category');if(category==='solid'||category==='guofeng')setCategory(category);if(m&&['light','dark','system'].includes(m))setMode(m);if(skins.some(x=>x.id===s))setSkin(s!)}catch{}setReady(true)},[]);
 useEffect(()=>{if(!ready)return;const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{const theme=mode==='system'?(media.matches?'dark':'light'):mode;document.documentElement.dataset.theme=theme;document.documentElement.dataset.skin=skin;document.documentElement.dataset.skinCategory=category;document.documentElement.style.setProperty('--scenic-blur',blur+'px');document.documentElement.style.colorScheme=theme};apply();try{localStorage.setItem('resonance-appearance',mode);localStorage.setItem('resonance-skin',skin);localStorage.setItem('resonance-skin-category',category);localStorage.setItem('resonance-scenic-blur',String(blur))}catch{}media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply)},[mode,skin,category,blur,ready]);
 function changeCategory(next:string){setCategory(next);if(next==='guofeng'&&!skin.startsWith('guofeng-'))setSkin('guofeng-ink');if(next!=='guofeng'&&skin.startsWith('guofeng-'))setSkin('forest')}
 const visibleSkins=skins.filter(s=>category==='guofeng'?s.id.startsWith('guofeng-'):!s.id.startsWith('guofeng-'));
 if(!visible)return null;
 return <section className="settings-page" hidden={!visible} aria-label="设置"><div className="settings-heading"><h2>让共鸣，更像你</h2><p>选择喜欢的色彩，给音乐换一种心情。</p></div><section className="settings-block"><h3>显示模式</h3><p>独立搭配每一款皮肤，也可以跟随设备自动切换。</p><div className="appearance-segments" role="group" aria-label="显示模式">{[{id:'light',name:'浅色',Icon:Sun},{id:'dark',name:'深色',Icon:Moon},{id:'system',name:'跟随系统',Icon:Monitor}].map(({id,name,Icon})=><button key={id} aria-pressed={mode===id} onClick={()=>setMode(id)}><Icon size={20}/>{name}{mode===id&&<Check size={16}/>}</button>)}</div></section><section className="settings-block"><div className="skin-heading"><div><h3>主题皮肤</h3><p>随心选择配色与景致，均支持浅色与深色模式。</p></div><span>当前 · {category==='guofeng'?'国风':category==='solid'?'纯色':'沉浸'} · {skins.find(x=>x.id===skin)?.name}</span></div><div className="skin-categories" role="group" aria-label="皮肤类别"><button aria-pressed={category==='scenic'} onClick={()=>changeCategory('scenic')}>沉浸皮肤<span>景物与光影</span></button><button aria-pressed={category==='solid'} onClick={()=>changeCategory('solid')}>纯色皮肤<span>简洁与专注</span></button><button aria-pressed={category==='guofeng'} onClick={()=>changeCategory('guofeng')}>国风皮肤<span>山水与诗意</span></button></div><p className="skin-category-description">{category==='guofeng'?'六幅东方意境：水墨山川、月夜亭阁、竹影、长安灯火、青瓷与金线。':category==='solid'?'统一纯色底面，收起景物、渐变与玻璃效果。':'让景物与光影融入音乐，营造沉浸氛围。'}</p>{category==='scenic'&&<div className="scenic-blur-control"><div><label htmlFor="scenic-blur">背景模糊度</label><p>柔化背景景物，让歌曲和文字更突出。</p></div><div className="scenic-blur-slider"><span>清晰</span><input id="scenic-blur" type="range" min="0" max="32" step="1" value={blur} onChange={e=>setBlur(Number(e.target.value))} aria-valuetext={blur===0?'清晰':`${blur} 像素模糊`}/><span>柔和</span><output htmlFor="scenic-blur">{blur}px</output></div></div>}<div className={`skin-grid ${category==='guofeng'?'guofeng-grid':''}`}>{visibleSkins.map(s=><button className="skin-card" key={s.id} aria-pressed={skin===s.id} onClick={()=>setSkin(s.id)}><span className="skin-preview-pair">{['light','dark'].map(variant=><span key={variant} className={`skin-preview scene-preview ${variant}`} style={{backgroundColor:variant==='light'?s.colors[1]:s.colors[2],color:variant==='light'?s.colors[0]:s.colors[1],backgroundImage:category==='solid'?'none':`url(/skins/${s.id}${s.id.startsWith('guofeng-')&&variant==='dark'?'-dark':''}.svg)`}}><span className="skin-preview-nav"><b>♫ 共鸣</b><i/><i/><i className="chosen"/><i/></span><span className="skin-preview-content"><b>最近播放</b>{[1,2,3].map(i=><span className="preview-row" key={i}><i style={{background:s.colors[0]}}/><em/><small>▷</small></span>)}<span className="preview-player">▷ ━━━━━━━</span></span><span className="preview-night">{variant==='light'?'浅色':'深色'}</span></span>)}</span><span className="skin-card-title">{s.name}{skin===s.id?<Check size={19}/>:<span className="skin-swatches">{s.colors.map(c=><i key={c} style={{background:c}}/>)}</span>}</span><span className="skin-description">{s.desc}</span></button>)}</div></section><p className="settings-footnote">外观偏好自动保存在当前浏览器。</p></section>
}



