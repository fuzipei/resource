import {htmlText, matchesRecording} from '../music/recording-match';
import {verifiedKuwoAudio} from './kuwo-audio';

const ORIGIN = 'https://www.gequhai.com';

async function requestPage(path: string, signal: AbortSignal, init?: RequestInit) {
  const response = await fetch(ORIGIN + path, {...init, signal, redirect:'manual', cache:'no-store'});
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw Error('歌曲海暂时无法响应');
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let text = '', bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) { text += decoder.decode(); break; }
      bytes += chunk.value.byteLength;
      if (bytes > 500000) throw Error('歌曲海响应过大');
      text += decoder.decode(chunk.value, {stream:true});
    }
  } finally { await reader.cancel().catch(() => {}); }
  return {text, cookie:response.headers.get('set-cookie')?.split(';')[0] || ''};
}

function findTrack(html: string, title: string, artist: string) {
  for (const row of html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) || []) {
    const link = row.match(/href=["']\/play\/(\d{1,18})["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(part => htmlText(part[1]));
    if (matchesRecording(title, artist, htmlText(link[2]), cells[2] || '')) return link[1];
  }
  return '';
}

export async function resolveGequhai(title: string, artist: string, signal: AbortSignal) {
  const primaryArtist = artist.split(/[/、;&,，]/)[0].trim();
  const queries = new Set([title + ' ' + primaryArtist, title]);
  let track = '';
  for (const query of queries) {
    const search = await requestPage('/search?' + new URLSearchParams({s:query.trim()}), signal);
    track = findTrack(search.text, title, artist);
    if (track) break;
  }
  if (!track) throw Error('歌曲海没有匹配的版本');
  const pagePath = '/play/' + track, page = await requestPage(pagePath, signal);
  // Parse the public player's JSON metadata without executing upstream scripts.
  const metadata = page.text.match(/window\.appData\s*=\s*(\{[^\r\n]*\})\s*;/)?.[1];
  const data = metadata ? JSON.parse(metadata) : null;
  if (!data || String(data.mp3_id) !== track || typeof data.mp3_title !== 'string' ||
      typeof data.mp3_author !== 'string' || !matchesRecording(title, artist, data.mp3_title, data.mp3_author)) {
    throw Error('歌曲海版本信息不匹配');
  }
  const token = page.text.match(/window\.play_id\s*=\s*["']([a-f0-9]{32})["']/i)?.[1];
  if (!token) throw Error('歌曲海播放凭据无效');
  const response = await requestPage('/api/music', signal, {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded',
      'X-Requested-With':'Http', 'X-Custom-Header':'Key', Referer:ORIGIN + pagePath, Cookie:page.cookie},
    body:new URLSearchParams({id:token, type:'0'})
  });
  const result = JSON.parse(response.text);
  if (result.code !== 200 || !result.data?.url) throw Error('歌曲海未返回播放链接');
  // Current public audio is served by Kuwo. Detect its container, not its suffix.
  return verifiedKuwoAudio(result.data.url, signal);
}
