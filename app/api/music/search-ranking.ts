export type SearchItem={id:string;provider:'at38';title:string;artist:string;album:string;cover:string;duration:string;durationMs?:number};
export type SearchResult={items:SearchItem[];hasMore:boolean};
const titleKey=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
// Preserve punctuation in artist identities: “周杰伦.” is not “周杰伦”.
const artistKey=(value:string)=>value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const artists=(value:string)=>value.split(/\s+\/\s+|[、,，;&]/).map(artistKey).filter(Boolean);
const alternate=/\b(?:live|remix|cover|instrumental|sped|dj)\b|翻唱|伴奏|现场|演奏|古筝|二胡|改编|加速|慢速|慢四|女生版|男生版|女版|男版|治愈版|抖音|片段/i;
function score(query:string,item:SearchItem){
 const q=titleKey(query),title=titleKey(item.title),names=artists(item.artist),a=artistKey(query);
 const exactArtist=names.includes(a),both=title&&q.includes(title)&&names.some(name=>name.length>1&&a.includes(name));
 let value=exactArtist?(names.length===1?1200:1100):both?1150:title===q?1000:title.includes(q)||q.includes(title)?700:names.some(name=>name.includes(a))?600:100;
 if(!alternate.test(query)&&alternate.test(item.title))value-=160;
 const requestedVersions=query.match(new RegExp(alternate.source,'gi'))||[];
 if(!exactArtist&&requestedVersions.some(version=>!title.includes(titleKey(version))))value-=350;
 const seconds=(item.durationMs||0)/1000||item.duration.split(':').reduce((n,v)=>n*60+(Number(v)||0),0);
 if(seconds>0&&seconds<90&&!/片段|短版|铃声|snippet|short/i.test(query))value-=60;
 return value;
}
export function rankSearchResults(query:string,sources:SearchResult[],limit=20):SearchItem[]{
 const rows=sources.flatMap((source,priority)=>source.items.map((item,index)=>({item,priority,index,score:score(query,item)})));
 rows.sort((a,b)=>b.score-a.score||a.priority-b.priority||a.index-b.index);
 const ids=new Set<string>(),recordings=new Set<string>(),items:SearchItem[]=[];
 for(const {item} of rows){
  const identity=titleKey(item.title)+'|'+artists(item.artist).sort().join('|');
  if(ids.has(item.id)||recordings.has(identity))continue;
  ids.add(item.id);recordings.add(identity);items.push(item);if(items.length===limit)break;
 }
 return items;
}
