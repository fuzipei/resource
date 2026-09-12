import type {Lyrics,LyricLine} from './parse';
/** Public YRC timing: [line start,duration](absolute word start,duration,flag)text. Milliseconds. */
export function parseYrc(raw:string):Lyrics{
 const lines:LyricLine[]=[];
 for(const row of raw.split(/\r?\n/)){
  const head=row.match(/^\[(\d+),(\d+)\]/);if(!head)continue;
  const start=Number(head[1]),stop=start+Number(head[2]);if(stop<=start||stop>86400000)continue;
  const marks=[...row.matchAll(/\((\d+),(\d+),\d+\)/g)];if(!marks.length)continue;
  const words=marks.map((mark,i)=>({time:Number(mark[1])/1000,end:(Number(mark[1])+Number(mark[2]))/1000,text:row.slice(mark.index!+mark[0].length,marks[i+1]?.index??row.length)})).filter(w=>w.text.length>0);
  if(!words.length||words.some((w,i)=>w.time<start/1000||w.end>w.time+86400||w.end>stop/1000+.05||(i>0&&w.time<words[i-1].time)))continue;
  lines.push({time:start/1000,end:stop/1000,text:words.map(w=>w.text).join(''),words});
 }
 lines.sort((a,b)=>a.time-b.time);return {lines,text:lines.map(line=>line.text).join('\n')};
}
