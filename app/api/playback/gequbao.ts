import {htmlText, matchesRecording} from '../music/recording-match';
import {verifiedKuwoAudio} from './kuwo-audio';

const origin = 'https://www.gequbao.com';

async function readPage(path: string, signal: AbortSignal, init?: RequestInit) {
  const response = await fetch(origin + path, {...init, signal, redirect:'manual', cache:'no-store'});
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw Error('歌曲宝暂不可用');
  }
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > 512000) throw Error('歌曲宝响应过大');
      text += decoder.decode(chunk.value, {stream:true});
    }
  } finally { await reader.cancel().catch(() => {}); }
}

function matchingId(html: string, title: string, artist: string) {
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    const id = tag.match(/\shref=["']\/music\/(\d{1,18})["']/i)?.[1];
    const label = tag.match(/\stitle=(["'])(.*?)\1/i)?.[2];
    if (!id || !label) continue;
    const parts = htmlText(label).split(' - ');
    for (let i = 1; i < parts.length; i++) {
      if (matchesRecording(title, artist, parts.slice(0, i).join(' - '), parts.slice(i).join(' - '))) return id;
    }
  }
  throw Error('歌曲宝没有匹配的版本');
}

export async function resolveGequbao(title: string, artist: string, expected: number, signal: AbortSignal) {
  const query = title + ' ' + artist.split(/[/、;&,，]/)[0].trim();
  const search = await readPage('/s/' + encodeURIComponent(query), signal);
  const id = matchingId(search, title, artist);
  const page = await readPage('/music/' + id, signal);
  // The public player embeds JSON inside a quoted JS string. Decode data only.
  const encoded = page.match(/window\.appData\s*=\s*JSON\.parse\('((?:\\.|[^'\\])*)'\)/)?.[1];
  if (!encoded) throw Error('歌曲宝未提供播放信息');
  const quoted = encoded.replace(/\\([\s\S])|"/g, (match, escaped: string | undefined) =>
    escaped === "'" ? "'" : escaped === undefined ? '\\"' : match);
  const data = JSON.parse(JSON.parse('"' + quoted + '"'));
  if (String(data.mp3_id) !== id || typeof data.mp3_title !== 'string' || typeof data.mp3_author !== 'string' ||
      !matchesRecording(title, artist, data.mp3_title, data.mp3_author)) throw Error('歌曲宝版本不匹配');
  const clock = /^(\d{1,3}):([0-5]\d)$/.exec(String(data.mp3_duration));
  const duration = clock ? Number(clock[1]) * 60 + Number(clock[2]) : 0;
  if (expected > 0 && duration > 0 && Math.abs(expected - duration) > Math.max(3, expected * .02)) throw Error('歌曲宝版本时长不符');
  if (typeof data.play_id !== 'string' || !data.play_id || data.play_id.length > 4096) throw Error('歌曲宝未提供播放信息');
  const result = JSON.parse(await readPage('/member/common-play-url', signal, {
    method:'POST', headers:{Accept:'application/json'}, body:new URLSearchParams({id:data.play_id, purpose:'play'})
  }));
  // Guest playback can require verification or exhaust its daily allowance.
  if (result.code !== 1 || !result.data?.url) throw Error('歌曲宝暂未提供公开音频');
  return {...await verifiedKuwoAudio(result.data.url, signal), duration};
}
