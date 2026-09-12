import type {LyricLine} from '../../lyric-timing';
export type {LyricLine} from '../../lyric-timing';
export type Lyrics={lines:LyricLine[];text:string};
export function parseLyrics(raw:string):Lyrics{
 const source=raw.replace(/^\uFEFF/,'').replace(/\r/g,'').trim();const lines:LyricLine[]=[];const gaps:number[]=[];
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
 return {lines,text:lines.length?lines.map(l=>l.text).join('\n'):source.split('\n').filter(s=>!/^\[(?:ti|ar|al|by|offset|length|re|ve):/i.test(s)).map(clean).join('\n').trim()};
}
