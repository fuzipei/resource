import {fetchJsonWithTimeout} from './fetch-with-timeout';
import type {CuratedFeed} from './curated-types';
let cached:{until:number;data:CuratedFeed}|undefined;
export const cachedCurated=()=>cached&&cached.until>Date.now()?cached.data:null;
export async function getCuratedCatalog(signal?:AbortSignal,refresh=false):Promise<CuratedFeed>{
 if(signal?.aborted)throw Error('Cancelled');const hit=cachedCurated();if(hit&&!refresh)return hit;
 const response=await fetchJsonWithTimeout<CuratedFeed>('/api/curated',{signal},60000);
 if(!response.ok||!response.data?.groups||!Array.isArray(response.data.newest))throw Error('推荐歌单暂时未能加载');
 if(signal?.aborted)throw Error('Cancelled');cached={until:Date.now()+300000,data:response.data};return response.data;
}
