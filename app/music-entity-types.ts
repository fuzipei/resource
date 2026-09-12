import type {Song} from './music-types';
export type EntityKind='artist'|'album';
export type EntityTarget={kind:EntityKind;name:string;id?:string;song?:Song};
export type EntityRef={id:string;name:string;cover?:string};
export type MusicEntity={kind:EntityKind;id:string;name:string;cover:string;description:string;published?:number;artists:EntityRef[];albums:EntityRef[];songs:Song[];total:number};
export const entityName=(name:string)=>name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export const splitArtists=(artist:string)=>[...new Set(artist.split(/\s+\/\s+|、/).map(name=>name.trim()).filter(Boolean))];
