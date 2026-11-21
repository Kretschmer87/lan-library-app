/* LAN Library 1.9.4b: same application build, additional Steam import correction. */
const CACHE='lan-lib-online-1.9.5';
const ROOT=new URL(self.registration.scope).pathname;
const ASSETS=['','index.html','config.js','styles.css','src/app.mjs','src/steam-import-fix.js','src/demo.mjs','src/repository.mjs','src/score.mjs','manifest.webmanifest','assets/night-summit.svg','assets/header-ribbon.svg','assets/icon.svg','assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async path=>{
  const url=new URL(path,self.registration.scope);
  const response=await fetch(url,{cache:'no-store'});
  if(response.ok)await cache.put(url,response);
 }));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const names=await caches.keys();
 await Promise.all(names.filter(name=>name.startsWith('lan-lib-online-')&&name!==CACHE).map(name=>caches.delete(name)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT))return;
 const rel=url.pathname.slice(ROOT.length);
 if(request.mode!=='navigate'&&!ASSETS.includes(rel))return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{}));}
   return response;
  }catch{
   const cache=await caches.open(CACHE);
   return (await cache.match(request))||(request.mode==='navigate'?await cache.match(new URL('index.html',self.registration.scope)):undefined)||Response.error();
  }
 })());
});
