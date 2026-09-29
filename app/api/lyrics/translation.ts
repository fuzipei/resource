import {parseLyrics,type Lyrics} from './parse';
import {isNonChineseLyricText} from '../../lyric-timing';

const hasHan=(text:string)=>/\p{Script=Han}/u.test(text);

/** Match provider-supplied Chinese subtitles to the original lyric timestamps. */
export function withTranslations(original:Lyrics,...candidates:string[]):Lyrics{
 if(!original.lines.length||!isNonChineseLyricText(original.lines.map(line=>line.text).join('')))return original;
 let bestResult=original,bestMatches=0;
 for(const raw of candidates){
  if(!raw)continue;
  const translations=parseLyrics(raw).lines.filter(line=>hasHan(line.text));
  if(!translations.length)continue;
  const used=new Set<number>();let matched=0;
  const lines=original.lines.map(line=>{
   let best=-1,distance=1.51;
   for(let i=0;i<translations.length;i++){
    const delta=Math.abs(translations[i].time-line.time);
    if(!used.has(i)&&delta<distance){best=i;distance=delta}
   }
   if(best<0)return line;
   used.add(best);
   const translation=translations[best].text.trim();
   if(!translation||translation===line.text.trim())return line;
   matched++;
   return {...line,translation};
  });
  if(matched>bestMatches){bestResult={...original,lines};bestMatches=matched}
 }
 return bestResult;
}
