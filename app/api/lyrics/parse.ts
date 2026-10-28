import type {LyricLine} from '../../lyric-timing';
export type {LyricLine} from '../../lyric-timing';
export type Lyrics={lines:LyricLine[];text:string};
const unavailable=/^(?:暂无歌词|暂无滚动歌词|未找到歌词|无歌词|此歌曲暂无歌词|该歌曲暂无歌词|纯音乐(?:[，,。\s]*请欣赏)?|纯音乐(?:[，,。\s]*敬请欣赏)?|instrumental|no lyrics(?: available)?|lyrics not available)[。.!！\s]*$/i;
const metadata=/^[-–—•\s]*(?:风格|曲风|BPM|KEY|音名|调号|调式|Beat\s*(?:说明|Maker)|购买(?:伴奏|授权)|伴奏(?:说明|购买)|使用说明)\s*[:：]/i;
const credit=/^(?:作词|作曲|词|曲|编曲|制作人|制作|混音|母带|录音|监制|出品|发行|版权|策划|封面|词曲|演唱|和声|吉他|贝斯|鼓|钢琴|Lyrics?\s+by|Compos(?:er|ed\s+by)|Arrang(?:er|ed\s+by)|Produc(?:er|ed\s+by)|Written\s+by|Mix(?:ed\s+by)?|Master(?:ed\s+by)?)\s*[:：]/i;
const providerData=/(?:"(?:c|tx|li|or|t)"\s*:|orpheus:\/\/|https?:\/\/\S*music\.126\.net\/)/i;
const visibleText=(text:string)=>text.replace(/\[[^\]]*\]|<[^>]*>|\(\d+,\d+,\d+\)/g,'').trim();
/** Provider notices, beat specifications and credit JSON are not song lyrics. */
export function cleanLyrics(value:Lyrics):Lyrics{
 const usable=(text:string)=>{const t=visibleText(text);return !!t&&!unavailable.test(t)&&!metadata.test(t)&&!providerData.test(t)};
 const lines=value.lines.filter(line=>usable(line.text));
 const text=(lines.length?lines.map(line=>line.text):value.text.split('\n').filter(usable)).join('\n').trim();
 if(!text||text.split('\n').every(row=>credit.test(row.trim())))return {lines:[],text:''};
 return {lines,text};
}
export function parseLyrics(raw:string):Lyrics{
 const source=raw.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').filter(row=>!providerData.test(row)).join('\n').trim();const lines:LyricLine[]=[];const gaps:number[]=[];
 const clean=(s:string)=>s.replace(/<[^>]+>/g,'').trim();
 const seconds=(h:string,m:string,s:string,ms:string)=>Number(h)*3600+Number(m)*60+Number(s)+Number(ms.padEnd(3,'0'))/1000;
 if(/\d+:\d{2}:\d{2}[,.]\d+\s*-->/.test(source)){
 for(const block of source.split(/\n\s*\n/)){const match=block.match(/(\d+):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d+):(\d{2}):(\d{2})[,.](\d{1,3})[^\n]*\n([\s\S]*)/);if(!match)continue;const text=clean(match[9]);const time=seconds(...match.slice(1,5) as [string,string,string,string]);const end=seconds(...match.slice(5,9) as [string,string,string,string]);if(text&&end>time)lines.push({time,end,text})}
 }else{
 const offset=Number(source.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000;
 for(const row of source.split('\n')){
  const stamps=[...row.matchAll(/\[(\d+):(\d{2}(?:\.\d+)?)\]/g)];const text=clean(row.replace(/\[[^\]]*\]/g,''));if(!text){for(const stamp of stamps)gaps.push(Number(stamp[1])*60+Number(stamp[2])+offset);continue}
  const tags=[...row.matchAll(/<(\d+):(\d{2}(?:\.\d+)?)>/g)];
  const wordParts=tags.map((tag,i)=>({time:Number(tag[1])*60+Number(tag[2])+offset,text:row.slice(tag.index!+tag[0].length,tags[i+1]?.index??row.length).replace(/<[^>]+>/g,'')}));
  if(wordParts.length){wordParts[0].text=wordParts[0].text.trimStart();wordParts[wordParts.length-1].text=wordParts[wordParts.length-1].text.trimEnd()}
  for(const stamp of stamps){
   const time=Number(stamp[1])*60+Number(stamp[2])+offset,shift=Number(stamp[1])*60+Number(stamp[2])-(Number(stamps[0][1])*60+Number(stamps[0][2]));
   const line:LyricLine={time,text};
   if(wordParts.length&&wordParts.map(w=>w.text).join('')===text&&wordParts.every((w,i)=>Number.isFinite(w.time)&&(!i||w.time>=wordParts[i-1].time))){
    line.words=wordParts.map((w,i)=>({time:Math.max(time,w.time+shift),end:wordParts[i+1]?Math.max(time,wordParts[i+1].time+shift):undefined,text:w.text})).filter(w=>w.text.length>0);
    const last=wordParts[wordParts.length-1];if(!last.text&&last.time+shift>time)line.end=last.time+shift;
   }
   lines.push(line);
  }
 }
 }
 lines.sort((a,b)=>a.time-b.time);
 gaps.sort((a,b)=>a-b);for(let i=0;i<lines.length;i++){const line=lines[i],gap=gaps.find(time=>time>line.time&&time<(lines[i+1]?.time??Infinity));if(gap!==undefined)line.end=Math.min(line.end??Infinity,gap)}
 return cleanLyrics({lines,text:lines.length?lines.map(l=>l.text).join('\n'):source.split('\n').filter(s=>!/^\[(?:ti|ar|al|by|offset|length|re|ve):/i.test(s)).map(clean).join('\n').trim()});
}
