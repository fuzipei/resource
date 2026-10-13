const ids=new Set(['guofeng-ink','guofeng-zen','guofeng-jade','guofeng-changan','guofeng-porcelain','guofeng-obsidian']);
export function guofengScene(id:string,theme:string,mobile=false){return `/skins/${id}${theme==='dark'?'-dark':''}${mobile?'-mobile':''}-v2.svg`}
const warmed=new Set<string>();
export function warmGuofengTheme(id:string){
 if(!ids.has(id)||typeof window==='undefined')return;
 const url=guofengScene(id,document.documentElement.dataset.theme||'light',matchMedia('(max-width:767px)').matches);
 if(warmed.has(url))return;if(warmed.size>=8)warmed.delete(warmed.values().next().value!);warmed.add(url);
 const image=new Image();image.decoding='async';image.onload=()=>{image.onload=null;image.onerror=null};image.onerror=()=>{warmed.delete(url);image.onload=null;image.onerror=null};image.src=url;
}
