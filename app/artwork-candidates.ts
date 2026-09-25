import {artworkSize} from './artwork-size';

// Image bytes are requested by the visitor's browser. The server only supplies
// metadata; alternate public CDN hosts and the original URL remain available
// if a resized image or a particular host cannot be reached by that visitor.
export function artworkCandidates(value:string,size:number):string[]{
 if(!value)return [];
 const urls=[artworkSize(value,size)];
 try{
  const u=new URL(value);
  if(u.protocol==='https:'&&['y.qq.com','y.gtimg.cn'].includes(u.hostname)&&/\/T002R\d+x\d+M000/.test(u.pathname)){
   const alternate=new URL(u.href);alternate.hostname=u.hostname==='y.qq.com'?'y.gtimg.cn':'y.qq.com';
   urls.push(artworkSize(alternate.href,size),u.href,alternate.href);
  }else if(u.protocol==='https:'&&/^p[1-4]\.music\.126\.net$/.test(u.hostname)){
   const alternate=new URL(u.href);alternate.hostname=u.hostname==='p1.music.126.net'?'p2.music.126.net':'p1.music.126.net';
   urls.push(u.href,artworkSize(alternate.href,size),alternate.href);
  }else urls.push(u.href);
 }catch{}
 return [...new Set(urls)];
}
