const CACHE='resonance-pwa-v1';
const OFFLINE='/offline.html';
const FILES=[OFFLINE,'/icons/app-192.png','/icons/app-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
// New workers activate after existing windows close, never interrupting playback.
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('resonance-pwa-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 // Never intercept account/API requests, audio, range requests, or framework data.
 if(req.mode==='navigate'&&url.pathname==='/'){event.respondWith(fetch(req).catch(async()=>await caches.match(OFFLINE)||Response.error()));return}
 if(FILES.includes(url.pathname)&&!url.search)event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
