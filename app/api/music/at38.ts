import {PlaybackError} from './playback-error';
import {htmlText, matchesRecording} from './recording-match';
const origin = 'https://www.at38.cn/';

async function loadSearch(keyword: string, signal?: AbortSignal, visitCookie = ''): Promise<{html:string; cookie:string}> {
  const r = await fetch(origin + '?' + new URLSearchParams({keyword}), {headers:visitCookie ? {Cookie:visitCookie} : undefined, signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), redirect:'manual'});
  if (!r.ok) throw Error('51 音乐暂时不可用');
  // The upstream keeps streaming its large message board after the song list.
  // Stop at the footer: all search cards precede it, and comments are irrelevant.
  const reader = r.body?.getReader();
  if (!reader) throw Error('音乐源未返回内容');
  const decoder = new TextDecoder();
  let html = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) { html += decoder.decode(); break; }
      html += decoder.decode(chunk.value, {stream:true});
      if (html.length > 2000000 || /<footer\b|id=["']msgBtn["']/i.test(html)) break;
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (html.length > 2000000) throw Error('音源响应过大');
  // The public landing page sometimes initializes a visit cookie before search.
  // Read only that literal value; never execute upstream scripts or loop retries.
  const visit = html.length < 2000 ? html.match(/document\.cookie=["'](mk_visit=[A-Za-z0-9_-]{1,200});/)?.[1] : undefined;
  if (visit && !visitCookie) return loadSearch(keyword, signal, visit);
  return {html, cookie:[visitCookie,r.headers.get('set-cookie')?.split(';')[0]].filter(Boolean).join('; ')};
}

function searchItems(html: string) {
  const cards = html.split(/<div\s+class=["']music-card["']/i).slice(1);
  const items = cards.flatMap(card => {
    const cover = card.match(/<img\b[^>]*\sdata-id=["'][^"']+["'][^>]*>/i)?.[0] || '';
    const id = cover.match(/\sdata-id=["']([a-zA-Z0-9_-]{1,100})["']/)?.[1];
    const type = cover.match(/\sdata-type=["']([a-z]+)["']/)?.[1];
    const title = card.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1];
    const info = htmlText(card.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
    if (!id || !type || !['wy','qq','kw','kg','mg'].includes(type) || !title) return [];
    return [{id:type+'_'+id,provider:'at38',title:htmlText(title),artist:info.match(/歌手[：:]\s*([^|]+)/)?.[1]?.trim() || '未知艺人',album:info.match(/专辑[：:]\s*([^|]+)/)?.[1]?.trim() || '单曲',cover:origin+'?'+new URLSearchParams({action:'getpic',id,type}),duration:''}];
  });
  if (!cards.length && !/没有|未找到|无结果|搜索结果/.test(html)) throw Error('51 音乐未返回可识别的搜索结果');
  return items;
}

export async function searchAt38(keyword: string, page: number, signal?: AbortSignal) {
  const {html}=await loadSearch(keyword,signal);
  const items=searchItems(html);
  return {items:items.slice((page-1)*20,page*20),hasMore:items.length>page*20};
}

type Recording = {title:string; artist:string; duration:number};

export async function playAt38(key: string, keyword: string, signal?: AbortSignal, recording?: Recording) {
  if (!/^(wy|qq|kw|kg|mg)_[a-zA-Z0-9_-]{1,100}$/.test(key) || !keyword.trim() || keyword.length > 100) throw Error('请重新搜索后播放');
  const queries = recording ? [(recording.title + ' ' + recording.artist).slice(0, 100), keyword] : [keyword];
  for (const query of new Set(queries)) {
    const {html, cookie} = await loadSearch(query, signal);
    const items = searchItems(html);
    let track = items.find(item => item.id === key);
    if (!track && recording) {
      const matches = items.filter(item => matchesRecording(recording.title, recording.artist, item.title, item.artist));
      if (matches.length === 1) track = matches[0];
    }
    if (track) return playResult(track.id, query, cookie, signal);
  }
  throw Error('搜索结果中没有匹配的版本');
}

async function playResult(key: string, keyword: string, cookie: string, signal?: AbortSignal) {
  const separator = key.indexOf('_');
  const params = new URLSearchParams({action:'play', id:key.slice(separator + 1), type:key.slice(0, separator)});
  const headers = new Headers({Referer:origin + '?' + new URLSearchParams({keyword})});
  if (cookie) headers.set('Cookie', cookie);
  const r=await fetch(origin+'?'+params,{headers,redirect:'manual',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
  const location=r.headers.get('location');
  await r.body?.cancel();
  if(r.status===404||r.status===410)throw new PlaybackError('AUDIO_NOT_FOUND','这首歌的音频文件已失效，暂时无法播放。',422);
  if(r.status===401||r.status===403)throw new PlaybackError('AUDIO_ACCESS_DENIED','这首歌的音频访问被拒绝，暂时无法播放。',422);
  if (![301,302,303,307,308].includes(r.status) || !location) throw new PlaybackError('NO_AUDIO_LINK','这首歌未返回有效音频，请稍后重试。');
  const url=new URL(location);
  if (url.protocol!=='https:' || url.username || url.password || url.port || url.hostname==='localhost' || url.hostname.endsWith('.local') || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw Error('音频链接无效');
  const ext=url.pathname.split('.').pop()?.toLowerCase() || '';
  const mime:Record<string,string>={mp3:'audio/mpeg',m4a:'audio/mp4',flac:'audio/flac',wav:'audio/wav',ogg:'audio/ogg'};
  return {qualities:[{id:'original',label:ext==='flac'||ext==='wav'?'无损':'原始音质',detail:'51 音乐'+(mime[ext]?' · '+ext.toUpperCase():''),url:url.href,mime:mime[ext]}]};
}
