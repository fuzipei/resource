import type {Song} from './music-types';

const SONG_ID=/^(?:wy|qq|kw|kg|mg)_[a-zA-Z0-9_-]{1,100}$/;

export function songShareUrl(song:Song,origin:string):string{
 const url=new URL('/',origin);
 url.searchParams.set('song',song.id);
 url.searchParams.set('title',song.title);
 url.searchParams.set('artist',song.artist);
 if(song.album)url.searchParams.set('album',song.album);
 const durationMs=song.durationMs||(/^\d{1,3}:\d{2}$/.test(song.duration)?song.duration.split(':').reduce((total,part)=>total*60+Number(part),0)*1000:0);
 if(durationMs>0)url.searchParams.set('duration',String(Math.round(durationMs)));
 return url.toString();
}

export function songFromShare(search:string):Song|null{
 if(search.length>2500)return null;
 const p=new URLSearchParams(search);
 const id=p.get('song')||'',title=p.get('title')?.trim()||'',artist=p.get('artist')?.trim()||'',album=p.get('album')?.trim()||'';
 if(!SONG_ID.test(id)||!title||title.length>300||!artist||artist.length>300||album.length>200)return null;
 const rawDuration=p.get('duration')||'';
 if(rawDuration&&!/^\d{1,8}$/.test(rawDuration))return null;
 const durationMs=Number(rawDuration)||0;
 if(durationMs>24*60*60*1000)return null;
 const seconds=Math.floor(durationMs/1000);
 return {id,provider:'at38',title,artist,album,cover:'',duration:seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'',...(durationMs?{durationMs}:{})};
}
