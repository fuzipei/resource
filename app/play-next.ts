import type {Song} from './music-types';
export const songKey=(song:Song)=>song.provider+':'+song.id;

// The last explicit "play next" choice goes first, without duplicating a track.
export function insertPlayNext(queue:Song[],pending:Song[],current:Song|null,song:Song){
 const id=songKey(song);
 if(song.importStatus==='unmatched'||current&&songKey(current)===id)return {queue,pending};
 const remaining=queue.filter(item=>songKey(item)!==id);
 if(current&&!remaining.some(item=>songKey(item)===songKey(current)))remaining.unshift(current);
 const index=current?remaining.findIndex(item=>songKey(item)===songKey(current)):-1;
 remaining.splice(index+1,0,song);
 return {queue:remaining,pending:[song,...pending.filter(item=>songKey(item)!==id)]};
}
