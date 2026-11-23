export function htmlText(value: string) {
  const named: Record<string, string> = {amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' '};
  return value.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const hex = name[1].toLowerCase() === 'x';
    const code = parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }).trim();
}

const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const artists = (s: string) => [...new Set(s.split(/\s*[/、;&,，]\s*/).map(normalize).filter(Boolean))].sort();

export function matchesRecording(title: string, artist: string, name: string, performer: string) {
  if (!normalize(title) || normalize(title) !== normalize(name)) return false;
  const wanted = artists(artist), found = artists(performer);
  return wanted.length > 0 && wanted.length === found.length && wanted.every((value, i) => value === found[i]);
}
