import type {Quality} from './music-types';

export type AudioFormat='MP3'|'FLAC';

export function audioFormat(quality:Quality):AudioFormat|''{
 if(quality.mime==='audio/mpeg')return 'MP3';
 if(quality.mime==='audio/flac')return 'FLAC';
 return '';
}

// Only list resolved audio URLs. Keep at most two distinct recordings per format.
export function audioQualityOptions(qualities:Quality[]):Quality[]{
 const seen=new Set<string>(),counts:{MP3:number;FLAC:number}={MP3:0,FLAC:0};
 return qualities.flatMap(quality=>{
  const format=audioFormat(quality);
  if(!format||!quality.url||seen.has(quality.url)||counts[format]>=2)return [];
  seen.add(quality.url);
  counts[format]++;
  return [{...quality,label:`${format==='FLAC'?'flac':'MP3'}-${counts[format]}`}];
 }).sort((a,b)=>audioFormat(a)==='MP3'&&audioFormat(b)==='FLAC'?-1:audioFormat(a)==='FLAC'&&audioFormat(b)==='MP3'?1:0);
}
