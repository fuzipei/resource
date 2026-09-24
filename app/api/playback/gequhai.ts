const ORIGIN='https://www.gequhai.com';
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
function decode(s:string){return s.replace(/<[^>]*>/g,'').replace(/&(?:amp|quot|apos|lt|gt|nbsp|#39|#\d+|#x[\da-f]+);/gi,entity=>{const named:Record<string,string>={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' ','&#39;':"'"};const value=named[entity.toLowerCase()];if(value!==undefined)return value;const hex=/^&#x/i.test(entity),number=parseInt(entity.slice(hex?3:2),hex?16:10);return Number.isInteger(number)&&number<=0x10ffff?String.fromCodePoint(number):entity}).trim()}
function matches(title:string,artist:string,candidateTitle:string,candidateArtist:string){const requested=artist.split(/[/、;&,]/).map(norm).filter(Boolean),found=candidateArtist.split(/[/、;&,]/).map(norm).filter(Boolean);return norm(title)===norm(candidateTitle)&&requested.length>0&&requested.every(name=>found.includes(name))}
async function get(url:string,signal:AbortSignal){const response=await fetch(url,{signal});if(!response.ok||new URL(response.url).origin!==ORIGIN)throw Error('歌曲海暂时无法响应');const text=await response.text();if(text.length>500000)throw Error('歌曲海响应过大');return {text,cookie:response.headers.get('set-cookie')?.split(';')[0]||''}}
function findTrack(html:string,title:string,artist:string){for(const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[]){const link=row.match(/href=["']\/play\/(\d+)["'][^>]*>([\s\S]*?)<\/a>/i);if(!link)continue;const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(part=>decode(part[1]));if(matches(title,artist,decode(link[2]),cells[2]||''))return link[1]}return ''}
function field(html:string,name:string){const match=html.match(new RegExp('window\\.'+name+'\\s*=\\s*(["\\x27])([\\s\\S]*?)\\1','i'));return decode(match?.[2]||'')}
export async function resolveGequhai(title:string,artist:string,signal:AbortSignal){
 const primaryArtist=artist.split(/[/、;&,]/)[0].trim();
 const queries=[title+' '+primaryArtist,title].map(query=>query.trim()).filter((query,index,list)=>query&&list.indexOf(query)===index);
 let track='';for(const query of queries){const search=await get(ORIGIN+'/s/'+encodeURIComponent(query),signal);track=findTrack(search.text,title,artist);if(track)break}
 if(!track)throw Error('歌曲海没有匹配的版本');
 const pageUrl=ORIGIN+'/play/'+track,page=await get(pageUrl,signal);
 if(!matches(title,artist,field(page.text,'mp3_title'),field(page.text,'mp3_author')))throw Error('歌曲海版本信息不匹配');
 const token=field(page.text,'play_id');if(!/^[a-f0-9]{32}$/i.test(token))throw Error('歌曲海播放凭据无效');
 const response=await fetch(ORIGIN+'/api/music',{method:'POST',signal,headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'Http','X-Custom-Header':'Key',Referer:pageUrl,Cookie:page.cookie},body:new URLSearchParams({id:token,type:'0'})});
 if(!response.ok||new URL(response.url).origin!==ORIGIN)throw Error('歌曲海未返回播放链接');const raw=await response.text();if(raw.length>500000)throw Error('歌曲海响应过大');const result=JSON.parse(raw) as {code?:number;data?:{url?:string}};
 if(result.code!==200||!result.data?.url)throw Error('歌曲海未返回播放链接');return {url:result.data.url,mime:'audio/mpeg'};
}
