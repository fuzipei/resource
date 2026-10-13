const ids=new Set(['guofeng-ink','guofeng-zen','guofeng-jade','guofeng-changan','guofeng-porcelain','guofeng-obsidian']);
export function guofengScene(id:string,theme:string){return `/skins/${id}${theme==='dark'?'-dark':''}-clear-v4.avif`}
const warmed=new Set<string>();
export function warmGuofengTheme(id:string){
 if(!ids.has(id)||typeof window==='undefined')return;
 const url=guofengScene(id,document.documentElement.dataset.theme||'light');
 if(warmed.has(url))return;if(warmed.size>=8)warmed.delete(warmed.values().next().value!);warmed.add(url);
 const image=new Image();image.decoding='async';image.onload=()=>{image.onload=null;image.onerror=null};image.onerror=()=>{warmed.delete(url);image.onload=null;image.onerror=null};image.src=url;
}
