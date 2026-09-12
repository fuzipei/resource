export type LyricWord={time:number;end?:number;text:string};
export type LyricLine={time:number;end?:number;text:string;words?:LyricWord[]};
export type Glyph={text:string;time:number;end:number};
const segmenter=new Intl.Segmenter('zh',{granularity:'grapheme'});
const split=(text:string)=>Array.from(segmenter.segment(text),part=>part.segment);
export const clampLyricOffset=(value:number)=>Number.isFinite(value)?Math.round(Math.max(-10,Math.min(10,value))*10)/10:0;
/** Positive offset makes the lyrics appear earlier; audio itself is unchanged. */
export const lyricTime=(audioTime:number,offset:number)=>audioTime+clampLyricOffset(offset);
export const audioTimeForLyric=(time:number,offset:number,duration=0)=>Math.max(0,Math.min(duration>0?duration:Infinity,time-clampLyricOffset(offset)));
const voiced=(text:string)=>/[\p{L}\p{N}\p{S}]/u.test(text);
function estimatedSweepEnd(lines:LyricLine[],index:number,end:number){
 const row=lines[index];if(row.end!==undefined)return end;
 const count=Math.max(1,split(row.text).filter(voiced).length),span=end-row.time;
 if(span<=Math.max(8,count*.8))return end;
 // Only shorten abnormally long un-timed gaps; learn the local line tempo when available.
 const rates=lines.slice(Math.max(0,index-3),index).flatMap((line,i,near)=>{
  const next=near[i+1]??row,seconds=next.time-line.time,chars=split(line.text).filter(voiced).length;
  return chars&&seconds>0&&seconds<=12?[seconds/chars]:[];
 }).sort((a,b)=>a-b);
 const rate=Math.max(.15,Math.min(.6,rates.length?rates[Math.floor(rates.length/2)]:.35));
 return Math.min(end,row.time+Math.max(2,Math.min(8,count*rate)));
}
export function lineEnd(lines:LyricLine[],index:number,duration=0){
 const line=lines[index];const next=lines.slice(index+1).find(row=>row.time>line.time)?.time;
 const end=line.end??next??(duration>line.time?duration:line.time+Math.min(8,Math.max(2,split(line.text).length*.3)));
 return Math.max(line.time+.001,Math.min(end,next??Infinity));
}
export function lyricPosition(lines:LyricLine[],time:number,duration=0){
 let cursor=-1;for(let i=0;i<lines.length;i++){if(lines[i].time<=time)cursor=i;else break}
 return {cursor,active:cursor>=0&&time<lineEnd(lines,cursor,duration)?cursor:-1};
}
export function lyricGlyphs(line:LyricLine[],index:number,duration=0):Glyph[]{
 const row=line[index],end=lineEnd(line,index,duration);
 const words=row.words?.length&&row.words.map(w=>w.text).join('')===row.text?row.words:[{time:row.time,end:estimatedSweepEnd(line,index,end),text:row.text}];
 return words.flatMap((word,i)=>{const chars=split(word.text),start=Math.max(row.time,word.time),stop=Math.min(end,word.end??words[i+1]?.time??end),length=Math.max(.001,stop-start);
  const weights=chars.map(text=>voiced(text)?1:0),total=weights.reduce<number>((a,b)=>a+b,0)||chars.length;let used=0;
  return chars.map((text,j)=>{const time=start+length*used/total;used+=weights[j];return {text,time,end:start+length*used/total}});
 });
}
export function glyphProgress(glyph:Glyph,time:number){if(glyph.end<=glyph.time)return time>=glyph.time?1:0;return Math.max(0,Math.min(1,(time-glyph.time)/(glyph.end-glyph.time)))}
