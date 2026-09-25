import type {Song} from './music-types';

const SONG_ID=/^(?:wy|qq|kw|kg|mg)_[a-zA-Z0-9_-]{1,100}$/;

export function songShareUrl(song:Song,origin:string):string{
 const url=new URL('/',origin);
 const durationMs=song.durationMs||(/^\d{1,3}:\d{2}$/.test(song.duration)?song.duration.split(':').reduce((total,part)=>total*60+Number(part),0)*1000:0);
 const bytes=new TextEncoder().encode(JSON.stringify([song.id,song.title,song.artist,song.album||'',durationMs>0?Math.round(durationMs):0]));
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 url.searchParams.set('s',btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''));
 return url.toString();
}

export function songFromShare(search:string):Song|null{
 if(search.length>2500)return null;
 const p=new URLSearchParams(search);
 let id='',title='',artist='',album='',rawDuration:string|number='';
 const compact=p.get('s');
 if(compact){
  if(!/^[A-Za-z0-9_-]{1,1800}$/.test(compact))return null;
  try{
   const binary=atob(compact.replace(/-/g,'+').replace(/_/g,'/'));
   const values=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
   if(!Array.isArray(values)||values.length!==5||typeof values[0]!=='string'||typeof values[1]!=='string'||typeof values[2]!=='string'||typeof values[3]!=='string'||typeof values[4]!=='number')return null;
   [id,title,artist,album,rawDuration]=values;
  }catch{return null}
 }else{
  id=p.get('song')||'';title=p.get('title')||'';artist=p.get('artist')||'';album=p.get('album')||'';rawDuration=p.get('duration')||'';
 }
 title=title.trim();artist=artist.trim();album=album.trim();
 if(!SONG_ID.test(id)||!title||title.length>300||!artist||artist.length>300||album.length>200)return null;
 if(typeof rawDuration==='string'&&rawDuration&&!/^\d{1,8}$/.test(rawDuration))return null;
 const durationMs=Number(rawDuration)||0;
 if(!Number.isInteger(durationMs)||durationMs<0||durationMs>24*60*60*1000)return null;
 const seconds=Math.floor(durationMs/1000);
 return {id,provider:'at38',title,artist,album,cover:'',duration:seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'',...(durationMs?{durationMs}:{})};
}
