/* Cache only the app shell, never cached authenticated API responses or uploads. */
const CACHE='lan-lib-online-0.7.0';
const SHELL=['./','./index.html','./config.js','./styles.css','./src/app.mjs','./src/demo.mjs','./src/repository.mjs','./src/score.mjs','./manifest.webmanifest','./assets/night-summit.svg','./assets/header-ribbon.svg','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return; e.respondWith(fetch(e.request).then(res=>{if(res.ok&&SHELL.some(path=>u.pathname.endsWith(path.slice(1)))){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone));}return res;}).catch(()=>caches.match(e.request).then(x=>x||caches.match('./index.html'))));});
