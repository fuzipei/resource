import {searchAt38} from '../music/at38';
import {entityName,splitArtists,type MusicEntity} from '../../music-entity-types';
import type {Song} from '../../music-types';

const same=(a:unknown,b:string)=>entityName(String(a||''))===entityName(b);
const number=(v:unknown)=>Number(v)||0;
const duration=(seconds:number)=>seconds?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'';
const https=(value:unknown)=>{try{const u=new URL(String(value||'').replace(/^http:/,'https:').replace('{size}','300'));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!['localhost','127.0.0.1'].includes(u.hostname)?u.href:''}catch{return ''}};
const clean=(value:unknown)=>String(value||'').replace(/<[^>]*>/g,'').slice(0,3000);
async function json(url:string,signal:AbortSignal,headers:Record<string,string>={}){
 const r=await fetch(url,{signal,redirect:'manual',headers:{Accept:'application/json',...headers}});
 if(!r.ok)throw Error('Artist source unavailable');
 const body=await r.text();if(body.length>2400000)throw Error('Artist source response too large');
 return JSON.parse(body) as any;
}
const base=(source:string,id:string,name:string,cover:string,description:string,songs:Song[],total:number):MusicEntity=>({kind:'artist',id:source+'_'+id,name,cover,description,artists:[],albums:[],songs,total:total||songs.length});

async function qq(name:string,signal:AbortSignal):Promise<MusicEntity>{
 const search={'music.search.SearchCgiService':{method:'DoSearchForQQMusicDesktop',module:'music.search.SearchCgiService',param:{num_per_page:10,page_num:1,query:name,search_type:1}}};
 const found=await json('https://u.y.qq.com/cgi-bin/musicu.fcg?'+new URLSearchParams({data:JSON.stringify(search)}),signal,{Referer:'https://y.qq.com/'});
 const artist=(found['music.search.SearchCgiService']?.data?.body?.singer?.list||[]).find((s:any)=>same(s.singerName,name)&&/^[a-zA-Z0-9]{8,32}$/.test(String(s.singerMID||'')));
 if(!artist)throw Error('QQ artist not found');
 const mid=String(artist.singerMID);
 const request={comm:{ct:24,cv:0},singerSongList:{method:'GetSingerSongList',module:'musichall.song_list_server',param:{order:1,singerMid:mid,begin:0,num:50}}};
 const result=await json('https://u.y.qq.com/cgi-bin/musicu.fcg?'+new URLSearchParams({data:JSON.stringify(request)}),signal,{Referer:'https://y.qq.com/'});
 const data=result.singerSongList?.data||{};
 const songs:Song[]=(data.songList||[]).map((item:any)=>item.songInfo||item).filter((s:any)=>/^[a-zA-Z0-9]{8,32}$/.test(String(s.mid||''))&&s.name).map((s:any)=>{const seconds=number(s.interval),album=s.album||{};return {id:'qq_'+s.mid,provider:'at38',title:String(s.name),artist:(s.singer||[]).map((a:any)=>a.name).join(' / ')||name,album:String(album.name||''),cover:https(album.mid?'https://y.qq.com/music/photo_new/T002R300x300M000'+album.mid+'.jpg':''),duration:duration(seconds),durationMs:seconds*1000}});
 if(!songs.length)throw Error('QQ artist songs unavailable');
 return base('qq',mid,String(artist.singerName),https(artist.singerPic||'https://y.qq.com/music/photo_new/T001R300x300M000'+mid+'.jpg'),'',songs,number(data.totalNum||artist.songNum));
}
async function netease(name:string,signal:AbortSignal):Promise<MusicEntity>{
 const found=await json('https://music.163.com/api/search/get/web?'+new URLSearchParams({s:name,type:'100',limit:'20'}),signal);
 const artist=(found.result?.artists||[]).find((a:any)=>same(a.name,name)&&/^\d{1,18}$/.test(String(a.id||'')));
 if(!artist)throw Error('NetEase artist not found');
 const id=String(artist.id),data=await json('https://music.163.com/api/artist/'+id,signal);
 if(data.code!==200||!data.artist)throw Error('NetEase artist unavailable');
 const songs:Song[]=(data.hotSongs||[]).filter((s:any)=>/^\d{1,18}$/.test(String(s.id||''))&&s.name).map((s:any)=>{const a=s.album||s.al||{},ms=number(s.duration||s.dt);return {id:'wy_'+s.id,provider:'at38',title:String(s.name),artist:(s.artists||s.ar||[]).map((a:any)=>a.name).join(' / ')||name,album:String(a.name||''),cover:https(a.picUrl),duration:duration(ms/1000),durationMs:ms}});
 if(!songs.length)throw Error('NetEase artist songs unavailable');
 const entity=base('wy',id,String(data.artist.name),https(data.artist.picUrl||data.artist.img1v1Url||artist.picUrl),clean(data.artist.briefDesc),songs,number(data.artist.musicSize));
 entity.id=id;
 const seen=new Set<string>();entity.albums=(data.hotSongs||[]).flatMap((s:any)=>{const a=s.album||s.al||{},id=String(a.id||'');if(!/^\d{1,18}$/.test(id)||seen.has(id))return [];seen.add(id);return [{id,name:String(a.name||''),cover:https(a.picUrl)}]}).slice(0,12);
 return entity;
}
async function kugou(name:string,signal:AbortSignal):Promise<MusicEntity>{
 const search=await json('https://songsearch.kugou.com/song_search_v2?'+new URLSearchParams({keyword:name,page:'1',pagesize:'20',platform:'WebFilter',filter:'2',iscorrection:'1'}),signal);
 const match=(search.data?.lists||[]).find((s:any)=>same(s.SingerName,name)&&/^\d{1,18}$/.test(String(s.SingerId?.[0]||'')));
 if(!match)throw Error('Kugou artist not found');
 const id=String(match.SingerId[0]);
 const data=await json('https://m.kugou.com/singer/info/'+id+'?json=true',signal,{'User-Agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
 if(!same(data.info?.singername,name))throw Error('Kugou artist mismatch');
 const songs:Song[]=(data.songs?.list||[]).filter((s:any)=>/^[A-F0-9]{32}$/i.test(String(s.audio_info?.hash_128||s.audio_info?.hash||''))&&s.audio_name).map((s:any)=>{const ms=number(s.audio_info?.duration),hash=s.audio_info.hash_128||s.audio_info.hash;return {id:'kg_'+hash,provider:'at38',title:String(s.audio_name),artist:String(s.author_name||name),album:String(s.album_info?.album_name||''),cover:https(s.album_info?.cover),duration:duration(ms/1000),durationMs:ms}});
 if(!songs.length)throw Error('Kugou artist songs unavailable');
 return base('kg',id,String(data.info.singername),https(data.info.imgurl),clean(data.info.intro||data.info.profile),songs,number(data.info.songcount));
}
async function kuwo(name:string,signal:AbortSignal):Promise<MusicEntity>{
 const url='https://search.kuwo.cn/r.s?';
 const found=await json(url+new URLSearchParams({pn:'0',rn:'10',all:name,ft:'artist',newsearch:'1',itemset:'artist_2015',client:'kt',cluster:'0',rformat:'json',encoding:'utf8',pcjson:'1'}),signal);
 const artist=(found.abslist||[]).find((a:any)=>same(a.ARTIST,name)&&/^\d{1,18}$/.test(String(a.ARTISTID||'')));
 if(!artist)throw Error('Kuwo artist not found');
 const id=String(artist.ARTISTID);
 const [info,listing]=await Promise.all([json(url+new URLSearchParams({stype:'artistinfo',artistid:id,encoding:'utf8',pcjson:'1'}),signal),json(url+new URLSearchParams({pn:'0',rn:'50',artistid:id,stype:'artist2music',sortby:'0',encoding:'utf8',pcjson:'1'}),signal)]);
 if(!same(info.name,name))throw Error('Kuwo artist mismatch');
 const songs:Song[]=(listing.musiclist||[]).filter((s:any)=>/^\d{1,18}$/.test(String(s.musicrid||''))&&s.name).map((s:any)=>{const seconds=number(s.duration);return {id:'kw_'+s.musicrid,provider:'at38',title:String(s.name),artist:String(s.artist||name),album:String(s.album||''),cover:https(s.img),duration:duration(seconds),durationMs:seconds*1000}});
 if(!songs.length)throw Error('Kuwo artist songs unavailable');
 return base('kw',id,String(info.name),https(info.hts_pic),clean(info.desc),songs,number(info.musicnum||listing.total));
}
export async function artistFromSources(name:string,songId:string,requestSignal:AbortSignal):Promise<MusicEntity|null>{
 const controller=new AbortController(),signal=AbortSignal.any([controller.signal,requestSignal,AbortSignal.timeout(8000)]);
 const providers={qq,wy:netease,kg:kugou,kw:kuwo},prefix=songId.split('_')[0] as keyof typeof providers;
 const ordered=([prefix,...Object.keys(providers)] as (keyof typeof providers)[]).filter((key,i,all)=>key in providers&&all.indexOf(key)===i);
 try{
  const result=await Promise.any(ordered.map(key=>providers[key](name,signal)));
  return result;
 }catch{
  try{
   const found=await searchAt38(name,1,signal),songs=found.items.filter(s=>splitArtists(s.artist).some(a=>same(a,name)));
   if(songs.length)return base('search',entityName(name),name,https(songs[0].cover),'',songs, songs.length);
  }catch{}
  return null;
 }finally{controller.abort()}
}
