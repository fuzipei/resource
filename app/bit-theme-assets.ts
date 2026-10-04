// Warm only the theme the user is about to choose; keep full image objects out of state.
const warming=new Set<string>();
export function warmBitTheme(id:string){
 if(id!=='bit'&&!id.startsWith('bit-'))return;
 const base=id==='bit'?'bit-city':id;
 const mobile=window.matchMedia('(max-width:600px)').matches;
 const url=`/skins/${base}${mobile?'-mobile':''}.webp`;
 if(warming.has(url))return;
 warming.add(url);
 const image=new Image();
 image.decoding='async';
 image.onerror=()=>{warming.delete(url);image.onerror=null};
 image.onload=()=>{image.onload=null;image.onerror=null};
 image.src=url;
}