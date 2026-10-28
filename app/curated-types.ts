export type CuratedPlaylist={id:string;title:string;cover:string;count:number;plays:number;category:string;updated:number};
export const sceneCategories=['地铁','夜晚','清晨','下午茶','运动','学习','旅行','工作','驾车','散步'];
export const moodCategories=['快乐','伤感','放松','治愈','孤独','浪漫'];
export const genreCategories=['华语','摇滚','电子','爵士','民谣','说唱','怀旧','影视原声','轻音乐','流行','欧美','日语','韩语','古典','R&B/Soul','乡村','ACG','古风','蓝调'];
export type CuratedFeed={groups:Record<string,CuratedPlaylist[]>;newest:CuratedPlaylist[];updated:number;stale?:boolean;missing?:string[]};

