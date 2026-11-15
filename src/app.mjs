import {CloudRepository} from './repository.mjs?v=1.6.0';
import {DemoRepository} from './demo.mjs?v=1.6.0';
import {calculateLanScore,checkCatalogAdmission,groupFit,groupAcquisitionCost} from './score.mjs?v=1.6.0';

const conf=window.LAN_CONFIG||{};
const DEMO=!(conf.supabaseUrl&&conf.supabaseAnonKey);
const repo=DEMO?new DemoRepository():new CloudRepository(conf);
const app=document.querySelector('#app');
const savedInvite=(()=>{try{return sessionStorage.getItem('lan-invite')}catch{return null}})();
const st={screen:'catalog',accountTab:'login',data:null,user:null,membership:null,search:'',sort:'name',desc:false,filtersOpen:false,openedChoice:null,viewMode:'rich',filters:{genres:[],mechanics:[],themes:[],modes:[],matchModes:{genres:'all',mechanics:'any',themes:'any',modes:'any'},owned:'',maxPrice:'',maxHardware:'',minScore:'',trio:false},gameId:null,profileId:null,menu:null,loading:false,toast:'',invite:savedInvite||new URLSearchParams(location.search).get('invite')||'',avatarUrls:{},commentCategory:'Kommentar',eventId:null,wishSearch:'',wishExpanded:false,steamResults:[],steamChoice:null,steamSearching:false,steamError:'',addMethod:'auto',addGenres:[],addClassification:{genres:[],mechanics:[],themes:[]},steamQuery:'',steamOwnershipMessage:'',releaseMine:false,releaseBusy:false,releaseError:''};
if(st.invite){try{sessionStorage.setItem('lan-invite',st.invite)}catch{}}
if(location.search.includes('invite='))history.replaceState(null,'',location.pathname+location.hash);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const euro=x=>x===null||x===undefined||x===''?'Preis offen':new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(+x);
const deviceOS=()=>/iPhone|iPad|iPod/i.test(navigator.userAgent)?'ios':/Android/i.test(navigator.userAgent)?'android':'other';
const asStandalone=()=>!!(window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone===true);
function installInstructions(){const os=deviceOS();if(asStandalone())return '<p class="hint">✓ LAN Library wird bereits als App ausgeführt.</p>';
 if(os==='ios')return '<p class="hint">Auf dem iPhone: Link in <b>Safari</b> öffnen → Teilen-Symbol → <b>Zum Home-Bildschirm</b> → <b>Als Web-App öffnen</b> aktivieren → Hinzufügen. Anschließend die App über das neue Symbol starten.</p>';
 if(os==='android')return '<p class="hint">Auf Android: In Chrome öffnen → Menü ⋮ → <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>. Danach das neue Symbol verwenden.</p>';
 return '<p class="hint">Auf Computer: Im Browser den Menüpunkt <b>Installieren</b> verwenden, falls angeboten, oder ein Lesezeichen setzen.</p>';
}
function ownTasks(){return (st.data?.tasks||[]).filter(t=>t.assigned_to===st.data.userId);}
function onboardingCard(){
 const my=theUser()||{},hardware=(st.data.hardware||[]).find(h=>h.user_id===st.data.userId),pending=ownTasks().filter(t=>t.status==='open');
 const steps=[['Profilbild',!!my.avatar_path,'open-profile'],['Steam-Bibliothek',!!my.steam_synced_at,'steam-start'],['PC-Hardware',!!(hardware?.cpu_model&&hardware?.gpu_model),'open-profile']];
 return `<div class="panel onboarding-panel"><h2>Dein Einstieg</h2><p class="hint">Die Einrichtung wird je Mitglied getrennt gespeichert. Nicht erledigte Punkte kannst du später ergänzen.</p>${steps.map(([label,done,action])=>`<button class="task-line" data-action="${action}" ${action==='open-profile'?`data-id="${st.data.userId}"`:''}><b>${done?'✓':'○'}</b><span>${label}</span><small>${done?'Erledigt':'Einrichten'} ›</small></button>`).join('')}${pending.length?`<h3>Aufgaben von der Gruppe</h3>${pending.map(t=>`<div class="task-line assigned-task"><span>${esc(t.title)}${t.note?`<small>${esc(t.note)}</small>`:''}</span><button class="task-done" data-action="task-done" data-id="${t.id}" aria-label="Aufgabe ${esc(t.title)} erledigt">Erledigt ✓</button></div>`).join('')}`:''}</div>`;
}
function steamConnectionCard(){const p=theUser()||{};const connected=!!p.steam_synced_at;return `<div class="panel"><h2>Meine Steam-Bibliothek</h2><p class="hint">Anders als Steam-Bewertungen ist die persönliche Besitzliste ein eigener Import. Verknüpfe dein öffentlich sichtbares Steam-Profil. Es werden nur vorhandene LAN-Spiele als „Steam“ markiert; andere bleiben unbekannt.</p>
 ${p.steam_id?`<p class="hint">SteamID64: ${esc(p.steam_id)}${connected?' · zuletzt synchronisiert: '+fmtDate(p.steam_synced_at):''}</p>`:''}
 <form id="steam-library-form"><label>Steam-Profillink oder SteamID64<input type="text" name="steamProfile" value="${esc(p.steam_id||'')}" placeholder="https://steamcommunity.com/id/DEINNAME/" maxlength="250" required></label><button class="btn primary full" type="submit">Steam-Spielebesitz importieren</button></form>
 <p class="hint">Voraussetzung: Steam → Profil bearbeiten → Privatsphäre → <b>Spieldetails: Öffentlich</b>. Für den Abruf muss der Gruppenadministrator einmalig einen Steam-Web-API-Schlüssel serverseitig einrichten. Steam-Passwörter werden niemals abgefragt.</p>${st.steamOwnershipMessage?`<p class="hint steam-import-status" role="status">${esc(st.steamOwnershipMessage)}</p>`:''}</div>`}
const theUser=()=>st.data?.profiles.find(p=>p.user_id===st.data.userId);
const groupMembers=()=>st.data?.members||[];
const allGames=()=>st.data?.games||[]; // All 93 entries, including upcoming and undecided editions.
const owner=(gid,uid)=>st.data.ownership.find(o=>o.game_id===gid&&o.user_id===uid);
const rating=(gid,uid)=>st.data.ratings.find(o=>o.game_id===gid&&o.user_id===uid)?.rating??null;
const confirmedOwner=(gid,uid)=>st.data.ownership.some(o=>o.game_id===gid&&o.user_id===uid&&o.status==='yes');
const usableRating=(gid,uid)=>confirmedOwner(gid,uid)?rating(gid,uid):null;
const ratingAllowed=g=>g?.release_status!=='upcoming'&&g?.release_status!=='unverified'&&confirmedOwner(g.id,st.data.userId);
const releaseTag=g=>{
 if(g.release_status==='upcoming')return `<span class="tag release-soon">⌛ Noch nicht verfügbar · ${esc(g.release_date?'Release: '+new Date(g.release_date+'T12:00:00').toLocaleDateString('de-DE'):(g.release_label||'Termin noch unbekannt'))}</span>`;
 if(g.release_status==='unverified')return `<span class="tag release-unknown">? ${esc(g.release_label||'Edition noch nicht geklärt')}</span>`;
 return '';
};
// RELEASE RADAR: only an exact YYYY-MM-DD may produce a countdown.
function releaseDay(raw){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(raw||'')))return null;
 const [y,m,d]=raw.split('-').map(Number),check=new Date(Date.UTC(y,m-1,d));
 return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d?check.getTime()/86400000:null;
}
function todayDay(now=new Date()){return Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000;}
function daysToRelease(game,now=new Date()){
 const target=releaseDay(game.release_date);return target===null?null:Math.round(target-todayDay(now));
}
function releaseSortValue(game){
 if(game.release_status!=='upcoming')return null;
 const exact=releaseDay(game.release_date);if(exact!==null)return exact;
 const label=String(game.release_label||'');
 const year=label.match(/\b20(?:2[6-9]|[3-9]\d)\b/);
 // Approximate year sorting only. Never present this derived date as a release day.
 if(year)return Date.UTC(Number(year[0]),11,31)/86400000+.5;
 return 100000000; // unknown date, after known years, before released titles
}
function upcomingGames(){return allGames().filter(g=>g.release_status==='upcoming').sort((a,b)=>releaseSortValue(a)-releaseSortValue(b)||a.title.localeCompare(b.title,'de'));}
function freshlyReleased(now=new Date()){
 return allGames().filter(g=>g.release_status==='available'&&g.released_at&&Number.isFinite(Date.parse(g.released_at))&&now-Date.parse(g.released_at)>=0&&now-Date.parse(g.released_at)<30*86400000).sort((a,b)=>Date.parse(b.released_at)-Date.parse(a.released_at));
}
function releaseDateText(g){
 const days=daysToRelease(g);
 if(days!==null){
  if(days>0)return `Noch ${days} ${days===1?'Tag':'Tage'}`;
  if(days===0)return 'Release heute geplant';
  return 'Angekündigter Termin überschritten · Status prüfen';
 }
 return g.release_label||'Termin noch nicht bekannt';
}
function exactReleaseDate(g){return releaseDay(g.release_date)!==null?new Date(g.release_date+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'}):null;}
function releaseWatched(g){return myPlayWish(g.id)||myFav(g.id);}
function releaseNoticeStorageKey(g,kind){return 'lan-release-v1:'+st.data.userId+':'+g.id+':'+kind;}
const dismissedReleaseNotices=new Set();
function releaseDismissed(g,kind){const key=releaseNoticeStorageKey(g,kind);if(dismissedReleaseNotices.has(key))return true;try{return localStorage.getItem(key)==='1';}catch{return false;}}
function releaseAlerts(){
 const releases=freshlyReleased().filter(g=>!releaseDismissed(g,'released'));
 if(releases.length)return {game:releases[0],kind:'released',label:'Jetzt auf Steam verfügbar',message:'Neu erschienen – der Titel steht jetzt zur Verfügung. Prüft, wer ihn bereits besitzt.'};
 const reminders=upcomingGames().filter(g=>releaseWatched(g)&&daysToRelease(g)!==null&&daysToRelease(g)>=0&&daysToRelease(g)<=7);
 for(const game of reminders){const days=daysToRelease(game),kind=days<=1?'day1':'day7';if(!releaseDismissed(game,game.release_date+':'+kind))return {game,kind:game.release_date+':'+kind,label:'Release-Erinnerung',message:releaseDateText(game)};}
 return null;
}
function releaseNotice(){const note=releaseAlerts();if(!note)return '';
 return `<aside class="release-notice" role="status"><span class="release-notice-icon">${note.kind==='released'?'✓':'◷'}</span><div><strong>${esc(note.label)}: ${esc(note.game.title)}</strong><p>${esc(note.message)}</p></div><button class="release-notice-open" data-action="open-game" data-id="${note.game.id}">Ansehen</button><button class="release-notice-close" data-action="dismiss-release" data-id="${note.game.id}" data-kind="${esc(note.kind)}" aria-label="Meldung schließen">×</button></aside>`;
}
function releaseSpotlight(){
 const coming=upcomingGames(),recent=freshlyReleased();
 if(!coming.length&&!recent.length)return '';
 const focus=coming[0],watched=coming.filter(releaseWatched).length;
 return `<section class="release-spotlight"><div class="release-spotlight-heading"><span class="release-radar-icon">◷</span><div><small>RELEASE RADAR</small><h2>Demnächst ${coming.length?`· ${coming.length} Spiele`:''}</h2><p>${watched?`${watched} von dir vorgemerkt · `:''}${focus?`Nächster bekannter Zeitraum: ${esc(focus.title)} · ${esc(releaseDateText(focus))}`:'Neue Spiele sind erschienen'}</p></div></div><button class="release-spotlight-go" data-action="go" data-screen="upcoming">Release-Liste ansehen ›</button></section>`;
}
function releaseRadarRow(g){
 const watching=releaseWatched(g),fav=myFav(g),date=exactReleaseDate(g),days=daysToRelease(g);
 const countdown=days!==null?`<strong class="release-countdown ${days<=7?'near':''}">${days>0?`<b>${days}</b><small>${days===1?'TAG':'TAGE'}</small>`:esc(releaseDateText(g))}</strong>`:`<div class="release-countdown no-date"><b>${esc(releaseDateText(g))}</b><small>${/20\d{2}/.test(g.release_label||'')?'ZEITRAUM':'TAG NOCH OFFEN'}</small></div>`;
 return `<article class="release-entry"><button class="release-art" data-action="open-game" data-id="${g.id}" aria-label="${esc(g.title)} ansehen">${cover(g,'hero')}</button><div class="release-entry-body"><small class="release-overline">${date?'VERÖFFENTLICHUNGSTERMIN':'ANGEKÜNDIGT · DATUM OFFEN'}</small><h3>${esc(g.title)}</h3><p>${date?esc(date):esc(releaseDateText(g))}</p><div class="release-entry-buttons"><button class="btn ${watching?'primary':'ghost'}" data-action="toggle-release-watch" data-id="${g.id}" aria-pressed="${watching}">${fav?'♥ Must-play vorgemerkt':watching?'✓ Vorgemerkt':'☆ Vormerken'}</button><button class="text-btn" data-action="open-game" data-id="${g.id}">Details ›</button></div>${st.data.role==='admin'?`<details class="release-editor"><summary>Termin eintragen / korrigieren</summary><form class="release-date-form" data-game="${g.id}"><label>Genaues Veröffentlichungsdatum (nur wenn bestätigt)<input type="date" name="date" value="${esc(g.release_date||'')}"></label><label>Alternativ: angekündigter Zeitraum<input name="label" maxlength="140" placeholder="z. B. 2027 oder Termin noch offen" value="${esc(g.release_label||'')}"></label><button type="submit" class="btn ghost">Termin speichern</button></form></details>`:''}</div>${countdown}</article>`;
}
function upcoming(){const all=upcomingGames(),shown=st.releaseMine?all.filter(releaseWatched):all,unknown=allGames().filter(g=>g.release_status==='unverified'),fresh=freshlyReleased();
 return pageShell(`<main class="release-radar-page"><button class="back" data-action="go" data-screen="catalog">‹ Zur Spieleübersicht</button><header class="release-radar-intro"><span class="release-overline">LAN LIBRARY · RELEASE RADAR</span><h1>Auf diese Spiele warten wir</h1><p>Alle angekündigten Spiele nach Veröffentlichung sortiert. Countdowns erscheinen nur für bestätigte Tagesdaten. Vormerkungen sind individuell; andere Mitglieder sehen weiterhin alle kommenden Spiele.</p></header>${releaseNotice()}<div class="release-radar-controls"><div><strong>${all.length} angekündigte Spiele</strong><small>${all.filter(g=>g.release_date).length} mit genauem Tagesdatum</small></div><div class="release-radar-actions"><button class="btn ${st.releaseMine?'primary':'ghost'}" data-action="release-mine" aria-pressed="${st.releaseMine}">${st.releaseMine?'✓ Nur meine Vormerkungen':'☆ Nur meine Vormerkungen'}</button>${st.data.role==='admin'?`<button class="btn ghost" data-action="refresh-release" ${st.releaseBusy?'disabled':''}>${st.releaseBusy?'Prüfe Steam …':'↻ Release-Status prüfen'}</button>`:''}</div></div>${st.releaseError?`<div class="panel"><p class="hint">${esc(st.releaseError)}</p></div>`:''}<div class="release-radar-list">${shown.length?shown.map(releaseRadarRow).join(''):`<div class="panel"><p>Keine vorgemerkten Spiele. Schalte den Filter aus oder merke dir ein angekündigtes Spiel vor.</p></div>`}</div>${fresh.length?`<section class="release-just-out"><h2>Neu auf Steam verfügbar</h2>${fresh.map(g=>`<button class="release-new-tile" data-action="open-game" data-id="${g.id}">${cover(g)}<span><strong>${esc(g.title)}</strong><small>Seit der letzten Release-Prüfung als verfügbar bestätigt</small></span><b>›</b></button>`).join('')}</section>`:''}${unknown.length?`<details class="panel release-unclear"><summary>${unknown.length} weitere Spiele mit noch ungeklärter Edition / Ankündigung</summary><p class="hint">Für diese Einträge ist nicht bestätigt, welcher konkrete Titel oder Release gemeint ist.</p>${unknown.map(g=>`<button data-action="open-game" data-id="${g.id}">${esc(g.title)} <small>${esc(g.release_label||'Noch ungeklärt')}</small></button>`).join('')}</details>`:''}<p class="release-radar-disclaimer">Release-Status wird bei Nutzung der App über Steam geprüft (maximal täglich). Erinnerungen erscheinen innerhalb der App; Push-Nachrichten bei geschlossener App sind noch nicht eingerichtet.</p></main>`);
}
const myFav=(gid)=>st.data.favorites.some(o=>o.game_id===gid&&o.user_id===st.data.userId);
const members=()=>groupMembers().map(m=>({...m,profile:st.data.profiles.find(p=>p.user_id===m.user_id)}));
const memberLabel=id=>st.data.profiles.find(p=>p.user_id===id)?.initials||'??';
const avg=g=>{const nums=st.data.ratings.filter(r=>r.game_id===g.id&&confirmedOwner(g.id,r.user_id)).map(r=>r.rating);return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null};
const ownedCount=g=>groupMembers().filter(m=>owner(g.id,m.user_id)?.status==='yes').length;
const steamBase=id=>`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/`;
function cover(g,variant='poster',priority=false){
 const tone=[...g.title].reduce((a,c)=>a+c.charCodeAt(0),0)%6;
 const safeURL=u=>/^https:\/\/[^\s"'<>]+$/i.test(u||'')?u:null;
 const specials={
 3124540:['https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3124540/2d55092d45b1784dcc7cb0ba6ad3f919e62eb5d0/header.jpg','https://gfn.am/en/games/media/images/art_image-far-far-w.original.format-webp.webpquality-50.webp'],
 2440760:['https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4586390/f2af34bac595780b9e9d8ffee92456bb83e6acad/header.jpg','https://games.gg/cdn-cgi/image/width%3D1920%2Cquality%3D75%2Cformat%3Dauto%2Cfit%3Dscale-down%2Cmetadata%3Dnone%2Conerror%3Dredirect/https%3A/assets.games.gg/maxresdefault_23_06a8c000fa.jpg']
 };
 const wide=g.steam_app_id&&`${steamBase(g.steam_app_id)}header.jpg`;
 const tall=g.steam_app_id&&`${steamBase(g.steam_app_id)}library_600x900.jpg`;
 const capsule=g.steam_app_id&&`${steamBase(g.steam_app_id)}capsule_616x353.jpg`;
 const titleSpecials={
  'StarCraft II':[
    'https://m.media-amazon.com/images/M/MV5BNDczMTIzODU5Nl5BMl5BanBnXkFtZTgwNzgwNjUwMTE%40._V1_.jpg',
    'https://www.mobygames.com/images/covers/l/250106-starcraft-ii-wings-of-liberty-macintosh-other.jpg'
  ],
  'Warcraft III: The Frozen Throne 1.8 (Offline)':[
    'https://i.pinimg.com/originals/2a/19/2f/2a192f5eb86ef573daf95e06c4b4751c.jpg',
    'https://cdn.thegamesdb.net/images/original/boxart/front/803-1.jpg'
  ],
  'Unreal Tournament 2004':[
    'https://i.ebayimg.com/images/g/t70AAOSw5Ipijh2v/s-l1200.png',
    'https://www.cdh.cz/galerie/6929-2.jpg'
  ]
 };
 const upcomingImageFallback={
  4687860:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4687860/e683d4a1be5443ea6fa44feb1a16dfcb5c5d9c04/header.jpg',
  4369620:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4369620/5fb12ed0a738c952cac29164efa28aa23c5f3744/header.jpg',
  4623290:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4623290/3c921ab3b4e6e7f4505a751d287ccae2639dc2ca/header.jpg',
  2340970:'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2340970/93fac97732b31fdb3dd1dcc14047eb7179eb0865/header.jpg'
 };
 const custom=[...(titleSpecials[g.title]||[]),...(upcomingImageFallback[g.steam_app_id]?[upcomingImageFallback[g.steam_app_id]]:[]),...(specials[g.steam_app_id]||[])];
 const urls=[...custom,g.cover_url,wide,capsule,tall].map(safeURL).filter(Boolean);
 const unique=[...new Set(urls)];const first=unique.shift();
 return `<div class="cover tone${tone} ${variant==='hero'?'cover-hero':''}"><span class="fallback-cover"><small>LAN LIBRARY</small>${esc(g.title)}</span>${first?`${variant==='hero'?`<img class="cover-background" src="${esc(first)}" alt="" aria-hidden="true" decoding="async" loading="${priority?'eager':'lazy'}" referrerpolicy="no-referrer">`:''}<img class="cover-foreground" src="${esc(first)}" data-fallbacks="${esc(unique.join('|'))}" alt="Cover: ${esc(g.title)}" decoding="async" loading="${priority?'eager':'lazy'}" referrerpolicy="no-referrer">`:''}</div>`;
}

const glyph=(name)=>{
 const shapes={
  gamepad:'<path d="M6 12h4m-2-2v4m6-2h.01M17 10h.01"/><path d="M7.3 6h9.4a5 5 0 0 1 4.9 4l.8 5.6a2.7 2.7 0 0 1-4.6 2.3L15.6 16H8.4l-2.2 1.9a2.7 2.7 0 0 1-4.6-2.3l.8-5.6A5 5 0 0 1 7.3 6Z"/>',
  people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  filter:'<path d="M4 4h16l-6.5 8v6l-3 2v-8L4 4Z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.9l.04.04-2.8 2.8-.04-.04a1.7 1.7 0 0 0-1.9-.34 1.7 1.7 0 0 0-1.04 1.58V21H10v-.06A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.9.34l-.04.04-2.8-2.8.04-.04A1.7 1.7 0 0 0 4.6 15.04 1.7 1.7 0 0 0 3 14H3v-4h.06A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.9l-.04-.04 2.8-2.8.04.04a1.7 1.7 0 0 0 1.9.34A1.7 1.7 0 0 0 10 3.06V3h4v.06a1.7 1.7 0 0 0 1.04 1.54 1.7 1.7 0 0 0 1.9-.34l.04-.04 2.8 2.8-.04.04a1.7 1.7 0 0 0-.34 1.9A1.7 1.7 0 0 0 20.94 10H21v4h-.06A1.7 1.7 0 0 0 19.4 15Z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01"/>',
  arrow:'<path d="M12 19V5m-6 6 6-6 6 6"/>'
 };
 return `<svg class="ui-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||''}</svg>`;
};

function playWishCount(gameId){return groupMembers().filter(m=>(st.data?.playWishes||[]).some(w=>w.game_id===gameId&&w.user_id===m.user_id)||(st.data?.favorites||[]).some(w=>w.game_id===gameId&&w.user_id===m.user_id)).length;}
function mustPlayCount(gameId){return (st.data?.favorites||[]).filter(w=>w.game_id===gameId&&groupMembers().some(m=>m.user_id===w.user_id)).length;}
function myPlayWish(gameId){return (st.data?.playWishes||[]).some(w=>w.game_id===gameId&&w.user_id===st.data.userId);}
function toCore(g){const ownership={},memberRatings={};for(const m of groupMembers()){const o=owner(g.id,m.user_id);ownership[m.user_id]=o?o.status==='yes'?true:o.status==='no'?false:null:null;const r=usableRating(g.id,m.user_id);if(r)memberRatings[m.user_id]=r;}
 const playWishes=(st.data?.playWishes||[]).filter(w=>w.game_id===g.id).map(w=>w.user_id);
 const mustPlays=(st.data?.favorites||[]).filter(w=>w.game_id===g.id).map(w=>w.user_id);
 return {name:g.title,catalogKind:'game',multiplayerStatus:g.multiplayer_status,modes:g.modes||[],priceEUR:g.price_eur==null?null:Number(g.price_eur),steamPositivePercent:g.steam_positive_percent,hardwareTier:g.hardware_tier,ownership,memberRatings,playWishes,mustPlays,releaseStatus:g.release_status||'available'};}
function scoreFor(g){
 const score=calculateLanScore(toCore(g),{memberIds:groupMembers().map(m=>m.user_id)});
 // Hardware darf den Score nicht verändern. Warnen nur bei klaren Anzeichen für
 // Engpässe anhand hinterlegter Hardwareprofile; ohne Profil keine Spekulation.
 const warnings=[];
 if(Number.isInteger(g.hardware_tier)&&g.hardware_tier>=3){
  for(const h of st.data?.hardware||[]){
   if(!groupMembers().some(m=>m.user_id===h.user_id))continue;
   const ram=Number(h.ram_gb),vram=Number(h.vram_gb);
   const ramLow=ram>0&&ram<8&&g.hardware_tier>=4;
   const vramLow=vram>0&&vram<4&&g.hardware_tier>=4;
   const integrated=/(?:intel (?:hd|uhd)|iris xe|radeon graphics|vega [0-9]+\b)/i.test(h.gpu_model||'');
   if(ramLow||vramLow||integrated){
    const initials=st.data?.profiles?.find(p=>p.user_id===h.user_id)?.initials||'Mitglied';
    warnings.push(`${initials}: Möglicher Hardware-Engpass (RAM / Grafikkarte). Spielleistung bitte prüfen.`);
   }
  }
 }
 if(warnings.length){score.hardwareWarnings.push(...warnings);score.warnings.push(...warnings);}
 return score;
}
const SCORE_PARTS=[
 ['groupRating','Eure Bewertungen'],['steamRating','Steam-Bewertungen'],['groupSuitability','LAN-Eignung'],
 ['ownershipAndPrice','Besitz + Preis'],['playWishes','Spielwünsche (Herz doppelt)']
];
function scoreExplanation(s){
 return `<details class="panel score-details"><summary>Wie wird der LAN-Score berechnet?</summary><p class="hint">Bis zu 100 Punkte. Die Gewichtung bleibt 30/20/15/20/15. Eure vorhandenen Bewertungen zählen mit ihrem tatsächlichen Durchschnitt – fehlende Stimmen werden nicht als fiktive 5/10-Stimmen gerechnet. Nur wenn noch niemand bewertet hat, gilt vorläufig 5/10 als neutral. Bei unbekanntem Besitz rechnet die Kostenprognose vorsichtig mit möglichen Neukäufen. Ein Stern (*) kennzeichnet einen vorläufigen Score.</p><div class="score-factor-list">${SCORE_PARTS.map(([key,label])=>{const f=s.factors[key];return `<div class="score-factor"><span>${label}</span><strong>${f?.weight??0} %</strong><span>${f?.partial?`${f.value??'?'} % · ${f.partial}`:f?.value!=null?`${f.value} % · ${f.points} Pkt.`:'noch offen'}</span></div>`}).join('')}</div>${s.hardwareWarnings?.length?`<p class="hint score-hardware-warning">⚠ ${esc(s.hardwareWarnings.join(' · '))}</p>`:''}<p class="hint">Aktuell bekannte Datengrundlage: ${s.coveragePercent} %. Ein hoher Steam-Wert allein rechtfertigt keinen Spitzenplatz. Die Kostenwertung zählt vorhandene Lizenzen voll; fehlende Lizenzen erhalten je nach Preis bis zu 100 % (Referenz: 30 € pro Lizenz). Kostenlose Spiele erreichen hier 100 %. Normale Wünsche zählen einfach, ♥ Must-play doppelt; bei drei Mitgliedern ergeben drei Herzen den vollen Wunsch-Faktor. Hardware zählt nicht als Punkt, sondern löst bei zu schwachen PCs nur eine Warnung aus.</p></details>`;
}
function fitFor(g){return groupFit(toCore(g),Math.max(3,groupMembers().length))}
function avatar(profile,size='small'){const src=st.avatarUrls[profile?.user_id];return `<span class="avatar ${size}" title="${esc(profile?.display_name||'Mitglied')}">${src?`<img src="${esc(src)}" alt="">`:`<span>${esc(profile?.initials||'?')}</span>`}</span>`}
function ownerStrip(g){const unknown=members().filter(m=>!owner(g.id,m.user_id)||owner(g.id,m.user_id).status==='unknown').length;const count=ownedCount(g),label=unknown?`${count} besitzen · ${unknown} offen`:`${count}/${groupMembers().length} besitzen`;return `<div class="owners">${members().map(m=>{const v=owner(g.id,m.user_id)?.status||'unknown';return `<span class="owner-tile" title="${esc(m.profile?.display_name)}: ${v==='yes'?'Besitzt':v==='no'?'Besitzt nicht':'Unbekannt'}">${avatar(m.profile)}<i class="state ${v}">${v==='yes'?'✓':v==='no'?'×':'?'}</i></span>`}).join('')}<span class="owner-count">${label}</span></div>`}
function scoreBadge(g){const sc=scoreFor(g);return sc.score==null?`<span class="badge subdued">Score offen</span>`:`<span class="badge score" title="${sc.provisional?'Vorläufiger Score · ':''}Datenabdeckung ${sc.coveragePercent}%">LAN ${sc.score}${sc.provisional?'*':''} <small>(${sc.coveragePercent}% Daten)</small></span>`}
function pageShell(body){
 const active = st.screen;
 const nav = [
  ['catalog','Spiele','gamepad'], ['calendar','LAN-Planer','calendar'], ['members','Mitglieder','people'], ['settings','Einstellungen','settings']
 ];
 const isActive = screen => screen===active || (screen==='members' && active==='profile');
 return `<div class="wrap"><header class="header"><div class="header-inner">
  <button class="brand" data-action="go" data-screen="catalog" aria-label="LAN Library Startseite">
    <span class="brand-icon">${glyph('gamepad')}</span>
    <span>LAN <em>Library</em><small>UNSERE SPIELESAMMLUNG</small></span>
  </button>
  <div class="head-actions"><button class="icon-btn" data-action="go" data-screen="calendar" aria-label="LAN-Planer">${glyph('calendar')}</button>
   <button class="icon-btn" data-action="go" data-screen="members" aria-label="Mitglieder">${glyph('people')}</button>
   <button class="icon-btn primary" data-action="go" data-screen="add" aria-label="Spiel hinzufügen">${glyph('plus')}</button>
  </div>
 </div></header>
 ${DEMO?`<div class="demo-banner">DEMO · Änderungen nur in diesem Browser.</div>`:''}
 ${body}
 <footer class="bottom" aria-label="Hauptnavigation">${nav.map(([screen,label,icon])=>`<button data-action="go" data-screen="${screen}" class="${isActive(screen)?'selected':''}" aria-label="${label}" ${isActive(screen)?'aria-current="page"':''}>${glyph(icon)}<span>${label}</span></button>`).join('')}</footer>
 </div>${st.toast?`<div class="toast">${esc(st.toast)}</div>`:''}`;
}

// Mehrfach-Genres: innerhalb der Genres UND (Shooter + RPG => Borderlands), zwischen den Filtern ebenfalls UND.
export const GENRE_GROUPS=[
 ['Action & Shooter',[['fps','Ego-Shooter (FPS)'],['tps','Third-Person-Shooter'],['extraction','Extraction-Shooter'],['battle-royale','Battle Royale'],['hack-slash','Hack & Slash'],['fighting','Kampfspiel']]],
 ['RPG & Abenteuer',[['rpg','Rollenspiel (RPG)'],['action-rpg','Action-RPG'],['open-world','Open World'],['exploration','Erkundung'],['story','Story-Abenteuer'],['horror','Horror']]],
 ['Aufbau & Strategie',[['building','Aufbau / Fabrikbau'],['survival','Survival'],['crafting','Crafting'],['sandbox','Sandbox'],['rts','Echtzeitstrategie (RTS)'],['turn-based','Rundenstrategie'],['tower-defense','Tower Defense'],['simulation','Simulation']]],
 ['Sonstiges',[['roguelike','Roguelike / Roguelite'],['racing','Rennspiel'],['sport','Sport'],['party','Partyspiel'],['puzzle','Rätsel'],['platformer','Platformer']]]
];
// Independent taxonomy dimensions. Only high-confidence Steam metadata is preselected;
// members can correct every classification from the game details.
export const TAXONOMY_GROUPS={
 genres:[
  ['Hauptgenres',[['shooter','Shooter'],['strategy','Strategie'],['rpg','RPG'],['racing','Rennspiel'],['sport','Sport'],['building','Aufbau'],['simulation','Simulation'],['adventure','Abenteuer']]]
 ],
 mechanics:[
  ['Vorlieben',[['survival','Survival'],['crafting','Crafting'],['zombies','Zombies'],['horror','Horror'],['tower-defense','Tower Defense'],['extraction','Extraction'],['loot','Looten'],['sandbox','Sandbox'],['open-world','Open World'],['roguelite','Roguelite'],['basebuilding','Basisbau']]]
 ],
 themes:[]
};
export const MODE_FILTERS=[
 ['coop','Koop / PvE'],['team','Gemeinsam im PvP-Team'],['pvp','PvP'],['versus','Gegeneinander'],['ffa','Jeder gegen jeden'],['bots','Mit Bots'],['private','Private Partie'],['public','Öffentliches Match'],['trio','3 gemeinsam im Team']
];
const tagLabels=Object.fromEntries(Object.values(TAXONOMY_GROUPS).flatMap(groups=>groups.flatMap(x=>x[1])));
const taxonomyName=k=>tagLabels[k]||MODE_FILTERS.find(x=>x[0]===k)?.[1]||k;
const genreName=key=>GENRE_GROUPS.flatMap(g=>g[1]).find(x=>x[0]===key)?.[1]||key;
// Compatibility with existing imported games in local demo and legacy records.
export function suggestTaxonomy(metadata={}){
 const legacy=new Set(metadata.genre_tags||metadata.genreTags||[]);
 const genres=new Set(),mechanics=new Set(),themes=new Set();
 const legacyGenres={fps:['shooter','fps'],tps:['shooter','tps'],rpg:['rpg'],'action-rpg':['action','rpg'],rts:['strategy','rts'],building:['building'],survival:['adventure'],simulation:['simulation'],racing:['racing'],sport:['sport'],party:['adventure'],puzzle:['adventure'],platformer:['adventure']};
 const legacyMechanics={survival:'survival',party:'party',extraction:'extraction','battle-royale':'battle-royale',crafting:'crafting','tower-defense':'tower-defense',roguelike:'roguelite',exploration:'exploration','open-world':'open-world',sandbox:'sandbox','hack-slash':'hack-slash'};
 for(const key of legacy){for(const g of legacyGenres[key]||[])genres.add(g);if(legacyMechanics[key])mechanics.add(legacyMechanics[key]);}
 // Do not infer Zombies/Extraction from free-text descriptions: marketing copy is not a reliable tag source.
 return {genres:[...genres],mechanics:[...mechanics],themes:[...themes]};
}
export function taxonomyFor(g,key){const own=g['category_'+key];return Array.isArray(own)?own:(suggestTaxonomy(g)[key]||[])}
export function matchTaxonomy(actual,selected,operator='any'){
 if(!selected?.length)return true;
 const set=new Set(actual||[]);
 return operator==='all'?selected.every(v=>set.has(v)):selected.some(v=>set.has(v));
}
const taxonomyLabel=g=>{
 const arr=taxonomyFor(g,'genres');
 const labels=arr.filter(x=>['shooter','strategy','rpg','racing','sport','building','simulation','adventure'].includes(x));
 return labels.slice(0,2).map(taxonomyName).join(' · ')||g.genre||'Genre noch offen';
};
const emptyClassification=()=>({genres:[],mechanics:[],themes:[]});
function taxonomyCheckRows(key,values=[]){return TAXONOMY_GROUPS[key].map(([heading,items])=>`<div class="multi-group"><strong>${esc(heading)}</strong><div class="edit-taxon-grid">${items.map(([tag,label])=>`<label class="taxon-check"><input type="checkbox" name="${key}" value="${esc(tag)}" ${values.includes(tag)?'checked':''}><span>${esc(label)}</span></label>`).join('')}</div></div>`).join('')}
function classificationEditor(g){if(st.data.role!=='admin')return '';
 return `<div class="panel"><details class="classification-editor"><summary>Spiel-Kategorien korrigieren</summary><p class="hint">Hauptgenre und Zusatz-Tags wählen. Nur überprüfte Eigenschaften zuordnen.</p><form id="classification-form" data-game="${esc(g.id)}">${[['genres','Genre / Spieltyp'],['mechanics','Vorlieben / Tags']].map(([key,label])=>`<section class="edit-taxon-section"><h3>${label}</h3>${taxonomyCheckRows(key,taxonomyFor(g,key))}</section>`).join('')}<button class="btn primary full" type="submit">Kategorien speichern</button></form></details></div>`;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function tagsFor(g){if(Array.isArray(g.genre_tags)&&g.genre_tags.length)return g.genre_tags;
 const str=norm(g.genre);const alias={fps:['fps','ego-shooter'],tps:['third-person','tps'],rpg:['rpg','rollenspiel'],building:['aufbau'],survival:['adventure'],rts:['rts','echtzeitstrategie'],sport:['sport'],racing:['renn'], 'tower-defense':['tower defense'], 'battle-royale':['battle royale']};
 return Object.entries(alias).filter(([k,terms])=>terms.some(x=>str.includes(x))).map(([k])=>k)
}
function hasMode(g,key){const ms=g.modes||[];const fit=fitFor(g);
 switch(key){case 'coop':return ms.some(m=>m.type==='coop_pve');case 'team':return ms.some(m=>m.type==='team_pvp');case 'pvp':return ms.some(m=>['team_pvp','versus','ffa'].includes(m.type));case 'versus':return ms.some(m=>m.type==='versus');case 'ffa':return ms.some(m=>m.type==='ffa');case 'bots':return ms.some(m=>m.botsCanFill===true);case 'private':return ms.some(m=>m.privateSession===true);case 'public':return ms.some(m=>m.privateSession===false);case 'trio':return ms.some(m=>Number(m.sameTeamMax||0)>=3 || (['versus','ffa'].includes(m.type)&&Number(m.maxHumans||0)>=3));default:return false}
}
function multiOpts(label,key,groups,hint){
 const selected=st.filters[key]||[],open=st.openedChoice===key,operator=st.filters.matchModes[key]||'any';
 const summary=selected.length?selected.length===1?taxonomyName(selected[0]):`${selected.length} gewählt · ${operator==='all'?'alle':'mindestens eins'}`:'Alle';
 const switcher=selected.length>1?`<div class="match-toggle" role="group" aria-label="Verknüpfung für ${esc(label)}"><span>Mehrfachauswahl:</span><button class="${operator==='any'?'on':''}" data-action="set-match-mode" data-key="${key}" data-mode="any" aria-pressed="${operator==='any'}">Mindestens eins (ODER)</button><button class="${operator==='all'?'on':''}" data-action="set-match-mode" data-key="${key}" data-mode="all" aria-pressed="${operator==='all'}">Alle (UND)</button></div>`:'';
 return `<section class="choice choice-multi"><button class="choice-head" data-action="toggle-choice" data-key="${key}" aria-expanded="${open}"><span>${esc(label)}</span><strong>${esc(summary)} <span aria-hidden="true">⌄</span></strong></button>${open?`<div class="multi-body"><p class="hint">${esc(hint)}</p>${groups.map(([heading,items])=>`<div class="multi-group"><strong>${esc(heading)}</strong><div class="multi-choices">${items.map(([tag,name])=>`<button type="button" data-action="toggle-multi" data-key="${key}" data-value="${tag}" class="multi-chip ${selected.includes(tag)?'active':''}" aria-pressed="${selected.includes(tag)}">${selected.includes(tag)?'✓ ':''}${esc(name)}</button>`).join('')}</div></div>`).join('')}${switcher}<button class="small-clear" data-action="clear-multi" data-key="${key}">Auswahl löschen</button></div>`:''}</section>`;
}
const activeFilterCount=f=>['genres','mechanics','themes','modes','owned','maxPrice','maxHardware','minScore','trio'].filter(k=>Array.isArray(f[k])?f[k].length>0:!!f[k]||f[k]===0).length;

function opts(label,key,vals){const v=st.filters[key],open=st.openedChoice===key,choice=vals.find(q=>String(q[0])===String(v))?.[1]||'Egal';return `<section class="choice"><button class="choice-head" data-action="toggle-choice" data-key="${key}" aria-expanded="${open}"><span>${esc(label)}</span><strong>${esc(choice)} <span aria-hidden="true">⌄</span></strong></button>${open?`<div class="choice-list">${vals.map(([value,name])=>`<button class="choice-item ${String(v)===String(value)?'active':''}" data-action="set-filter" data-key="${key}" data-value="${esc(value)}">${esc(name)} ${String(v)===String(value)?'✓':''}</button>`).join('')}</div>`:''}</section>`}
export function matchGenres(gameTags,selected){return selected.every(t=>gameTags.includes(t));}
// Rank by concrete selected attributes. Numerical constraints remain strict.
export function evaluateMatch(g,filterState){
 const f=filterState, matched=[],missing=[];let softMatched=0,softTotal=0,hardPassed=true;
 const soft=(ok,label)=>{softTotal++;(ok?matched:missing).push(label);if(ok)softMatched++};
 const hard=(active,ok,label)=>{if(!active)return;(ok?matched:missing).push(label);if(!ok)hardPassed=false};
 for(const key of ['genres','mechanics','themes']){
  const selected=f[key]||[],actual=taxonomyFor(g,key),op=f.matchModes?.[key]||'any';
  if(!selected.length)continue;
  if(op==='all')for(const tag of selected)soft(actual.includes(tag),taxonomyName(tag));
  else soft(selected.some(tag=>actual.includes(tag)),`${{genres:'Genre',mechanics:'Mechanik',themes:'Thema'}[key]}: ${selected.map(taxonomyName).join(' ODER ')}`);
 }
 const selectedModes=f.modes||[];
 if(selectedModes.length){
  if((f.matchModes?.modes||'any')==='all')for(const k of selectedModes)soft(hasMode(g,k),MODE_FILTERS.find(m=>m[0]===k)?.[1]||k);
  else soft(selectedModes.some(k=>hasMode(g,k)),`Multiplayer: ${selectedModes.map(k=>MODE_FILTERS.find(m=>m[0]===k)?.[1]||k).join(' ODER ')}`);
 }
 hard(!!f.owned,f.owned==='all'?ownedCount(g)===groupMembers().length:ownedCount(g)>=Number(f.owned),'Besitz: '+(f.owned==='all'?'alle':f.owned));
 hard(f.maxPrice!=='',g.price_eur!=null&&Number(g.price_eur)<=Number(f.maxPrice),g.price_eur==null?'Preis unbekannt':`Preis über ${f.maxPrice} €`);
 hard(!!f.maxHardware,g.hardware_tier!=null&&g.hardware_tier<=Number(f.maxHardware),g.hardware_tier==null?'Hardwarebedarf unbekannt':'Hardwarebedarf zu hoch');
 hard(!!f.minScore,scoreFor(g).score!==null&&scoreFor(g).score>=Number(f.minScore),'LAN-Score zu niedrig / offen');
 hard(f.trio,(g.modes||[]).some(m=>Number(m.sameTeamMax||0)>=3 || (['versus','ffa'].includes(m.type)&&Number(m.maxHumans||0)>=3)),'Zu dritt nicht bestätigt');
 return {matched:matched.length,missing,total:matched.length+missing.length,softMatched,softTotal,hardPassed,full:missing.length===0};
}
function candidates(g){return evaluateMatch(g,st.filters)}
// Shareable pure gate for tests; weak one-off matches are not shown for broad searches.
export function minimumSoftMatches(total){return total<=1?total:Math.max(1,Math.ceil(total/2));}
function displayGames(){
 const q=st.search.toLocaleLowerCase('de-DE').trim();
 const gs=allGames().filter(g=>{
  if(q&&!(g.title+' '+(g.genre||'')+' '+['genres','mechanics','themes'].flatMap(key=>taxonomyFor(g,key)).map(taxonomyName).join(' ')).toLocaleLowerCase('de-DE').includes(q))return false;
  const c=candidates(g);return c.hardPassed&&c.softMatched>=minimumSoftMatches(c.softTotal);
 });
 const key=g=>st.sort==='name'?g.title:st.sort==='release'?releaseSortValue(g):st.sort==='group'?avg(g):st.sort==='steam'?g.steam_positive_percent:st.sort==='price'?g.price_eur:st.sort==='owners'?ownedCount(g):scoreFor(g).score;
 gs.sort((a,b)=>{const aScore=candidates(a).softMatched,bScore=candidates(b).softMatched;if(aScore!==bScore)return bScore-aScore;
  let k1=key(a),k2=key(b);if(k1==null&&k2==null)return a.title.localeCompare(b.title,'de');if(k1==null)return 1;if(k2==null)return -1;let n=st.sort==='name'?String(k1).localeCompare(String(k2),'de'):Number(k1)-Number(k2);return (st.desc?-n:n)||a.title.localeCompare(b.title,'de')});return gs;
}
function gameCard(g){
 const fit=fitFor(g),c=candidates(g),modes=g.modes||[];
 const max=Math.max(0,...modes.map(m=>m.maxHumans||0));
 const team=Math.max(0,...modes.map(m=>m.sameTeamMax??m.maxHumans??0));
 const coop=modes.some(m=>m.type==='coop_pve'),teamPvp=modes.some(m=>m.type==='team_pvp');
 const mode=coop?'Koop / PvE':teamPvp?'Team-PvP':modes.some(m=>m.type==='versus')?'Versus':g.release_status==='upcoming'?'Modus folgt':'Mehrspieler prüfen';
 const versus=modes.some(m=>['versus','ffa'].includes(m.type));
 const privateKnown=modes.some(m=>m.privateSession===true&&Number(m.sameTeamMax||0)>=3);
 const othersRequired=modes.some(m=>Number(m.minHumans||0)>3&&!m.botsCanFill);
 const suitability=!modes.length?'Multiplayer noch unklar':othersRequired?'Weitere Spieler nötig':versus&&max>=3?'Zu dritt gegeneinander':team<3?`Nur ${team} im Team`:privateKnown?(coop?'3er-Koop':'3er-Team'):(coop?'3er-Koop · Lobby prüfen':teamPvp?'3er-Team · öffentlich':'Gemeinsam spielbar · Lobby prüfen');
 const warn=!modes.length||g.release_status!=='available'&&!!g.release_status||othersRequired || (!versus&&team<3) || (!privateKnown&&coop);
 const steam=g.steam_positive_percent,group=avg(g),fav=myFav(g.id),sc=scoreFor(g);
 const scKnown=sc.score!==null;
 const owners=members();
 const hasThreeOrMore=owners.length>=3;
 return `<article class="game-card" tabindex="0" role="button" data-action="open-game" data-id="${g.id}" aria-label="${esc(g.title)} öffnen">
  <div class="game-top">
   <div class="game-image">${cover(g,'hero')}</div>
   <div class="game-content">
    <div class="card-title-line"><h3>${esc(g.title)}</h3><button class="card-heart ${fav?'on':''}" data-action="fav-card" data-id="${g.id}" aria-label="${fav?'Must-play für nächste LAN entfernen':'Must-play für nächste LAN markieren'}" title="${fav?'Must-play entfernen':'Must-play für nächste LAN (zählt doppelt)'}">${fav?'♥':'♡'}</button></div>
    <div class="game-tags">${releaseTag(g)}<span class="tag genre">${esc(taxonomyLabel(g))}</span><span class="tag mode">${esc(mode)}</span><span class="tag ${warn?'warn':'ok'}">${warn?'!':'✓'} ${suitability}</span><span class="tag player-tag">${glyph('people')} ${max>0?'1–'+max:'?'} Spieler</span></div>
    <div class="game-ratings">
     <span class="rating-steam"><span class="rating-icon">S</span><span class="rating-copy"><small>STEAM</small><b class="${steam===null?'empty-rating':''}">${steam===null?'–':steam+' %'}</b></span></span>
     <span class="rating-group"><span class="rating-icon rating-people">${glyph('people')}</span><span class="rating-copy"><small>UNSERE WERTUNG</small><b class="${group===null?'empty-rating':''}">${group===null?'–':group.toFixed(1).replace('.',',')}${group===null?'':'<em>/10</em>'}</b></span><span class="rating-star" aria-hidden="true">★</span></span>
    </div>
    <div class="game-bottomline"><div class="owner-line" aria-label="Besitzstatus in eurer Gruppe">${owners.map(m=>{const status=owner(g.id,m.user_id)?.status||'unknown';return `<span class="owner-person" title="${esc(m.profile?.display_name||'Mitglied')}: ${status==='yes'?'Besitzt':status==='no'?'Besitzt nicht':'Besitz offen'}"><span class="owner-tile ${status}">${avatar(m.profile)}<i class="state ${status}">${status==='yes'?'✓':status==='no'?'×':'?'}</i></span><span class="owner-initials">${esc(m.profile?.initials||'?')}</span></span>`}).join('')}</div><span class="owners-count" aria-label="${ownedCount(g)} von ${owners.length} besitzen dieses Spiel">${ownedCount(g)} / ${owners.length}</span>${playWishCount(g.id)?`<span class="wish-amount" title="${playWishCount(g.id)} von ${owners.length} möchten dieses Spiel spielen">✦ ${playWishCount(g.id)}</span>`:''}${scKnown?`<span class="lan-score-tag" title="${sc.provisional?'Vorläufiger ':''}LAN-Score ${sc.score}">${sc.score}${sc.provisional?'*':''}</span>`:''}</div>
   </div>
  </div>${c.total&&c.missing.length?`<div class="mismatch">${c.matched}/${c.total} Filterkriterien · ${esc(c.missing.slice(0,2).join(' · '))}</div>`:''}
 </article>`;
}

function listRow(g){const fav=myFav(g.id),sc=scoreFor(g),gr=avg(g),max=Math.max(0,...(g.modes||[]).map(m=>m.maxHumans||0));const matches=candidates(g);
 const gt=taxonomyLabel(g);
 return `<article class="game-list-row" role="button" tabindex="0" data-action="open-game" data-id="${g.id}" aria-label="${esc(g.title)} öffnen">
 <div class="list-cover">${cover(g,'hero')}</div><div class="list-main"><strong class="list-title">${esc(g.title)}</strong>${releaseTag(g)}<span class="list-sub">${esc(gt||g.genre||'Genre offen')} · ${max||'?'} Spieler</span>${matches.total&&matches.missing.length?`<span class="list-mismatch">${esc(matches.missing[0])}</span>`:''}</div>
 <div class="list-metrics"><span title="Steam-Bewertung">S <b>${g.steam_positive_percent==null?'–':g.steam_positive_percent+' %'}</b></span><span title="Gruppenwertung">★ <b>${gr==null?'–':gr.toFixed(1).replace('.',',')+'/10'}</b></span></div>
 <div class="list-ownership" title="Besitz in eurer Gruppe">${ownedCount(g)}/${groupMembers().length} <small>Besitz</small></div>
 <div class="list-lan">${sc.score!=null?`<b>${sc.score}${sc.provisional?'*':''}</b><small>LAN</small>`:'<small>LAN-Score<br>offen</small>'}</div>
 <button class="list-heart ${fav?'on':''}" data-action="fav-card" data-id="${g.id}" title="Favorit">${fav?'♥':'♡'}</button>${myPlayWish(g.id)?`<span class="list-wish-marker" title="Du möchtest dieses Spiel spielen">✦</span>`:''}</article>`;
}

function sortMenu(){
 const values=[['name','Alphabet'],['score','LAN-Score'],['group','Gruppenwertung'],['steam','Steam-Wertung'],['price','Preis'],['owners','Besitz'],['release','Demnächst erscheinend']];
 return `<div class="sort-pop"><strong class="sort-menu-heading">Sortieren nach</strong>${values.map(([v,label])=>`<button data-action="sort" data-value="${v}" class="${st.sort===v?'on':''}">${label}${st.sort===v?' ✓':''}</button>`).join('')}<div class="sort-menu-heading">Reihenfolge</div><div class="sort-order-row"><button data-action="set-sort-direction" data-value="asc" class="${!st.desc?'on':''}">↑ Aufsteigend</button><button data-action="set-sort-direction" data-value="desc" class="${st.desc?'on':''}">↓ Absteigend</button></div></div>`;
}
function catalog(){
 const gs=displayGames(),f=st.filters,count=activeFilterCount(f);
 const full=gs.length;
 return pageShell(`<main class="catalog-page">
  <section class="catalog-controls">
   <div class="searchline"><div class="search">${glyph('search')}<input id="search" type="search" value="${esc(st.search)}" placeholder="Spiele durchsuchen …" autocomplete="off" aria-label="Spiele durchsuchen"></div></div>
   <div class="bar"><div class="sort-box"><button class="menu-btn" data-action="toggle-sort">${glyph('arrow')} <span>${st.desc?'↓':'↑'} ${{name:'Alphabet',score:'LAN-Score',group:'Gruppenwertung',steam:'Steam-Wertung',price:'Preis',owners:'Besitz',release:'Nächster Release'}[st.sort]}</span> <b>⌄</b></button>${st.menu==='sort'?sortMenu():''}</div><button class="menu-btn filter-btn ${st.filtersOpen?'selected':''}" data-action="toggle-filters">${glyph('filter')} <span>Filter</span><span class="pill">${count}</span></button></div>
  ${st.filtersOpen?`<div class="filter-panel"><h2>Filter <button class="close-btn" data-action="toggle-filters" aria-label="Filter schließen">×</button></h2><p>Alle Kriterien zuerst. Ähnliche Spiele folgen nach Anzahl erfüllter Wünsche. Preis, Besitz und Hardware bleiben verbindlich.</p>${multiOpts('Genre / Spieltyp','genres',TAXONOMY_GROUPS.genres,'Was für eine Art Spiel ist es? Beispiele: Shooter, RPG, Strategie.')}${multiOpts('Vorlieben / Tags','mechanics',TAXONOMY_GROUPS.mechanics,'Zusätzliche Eigenschaften: z. B. Zombies, Survival oder Tower Defense.')}${multiOpts('Multiplayer','modes',[['Spielmodi & Lobby',MODE_FILTERS]],'Welche Art gemeinsames Spiel ist möglich?')}${opts('Anzahl Besitzer','owned',[['','Egal'],['1','Mindestens einer'],['2','Mindestens zwei'],['all','Alle']])}${opts('Preisgrenze','maxPrice',[['','Egal'],['0','Kostenlos'],['10','Bis 10 €'],['20','Bis 20 €'],['30','Bis 30 €'],['40','Bis 40 €']])}${opts('Hardware-Anforderung','maxHardware',[['','Alle'],['2','Niedrig · einfache PCs'],['3','Mittel · Gaming-PC'],['4','Hoch · leistungsstarker PC']])}${opts('LAN-Score','minScore',[['','Egal'],['60','Ab 60'],['70','Ab 70'],['80','Ab 80'],['90','Ab 90']])}<p class="filter-help">Hardware: nur ein vorläufiges Bedarfsniveau, keine FPS-Prognose. Nicht bewertete Spiele werden als unbekannt angezeigt.</p><label class="check-row"><input type="checkbox" data-filter-check="trio" ${f.trio?'checked':''}> Für drei gemeinsam geeignet</label><div class="row gap"><button class="btn ghost" data-action="reset-filters">Zurücksetzen</button><button class="btn primary" data-action="toggle-filters">Treffer anzeigen</button></div></div>`:''}
  </section>
  ${releaseNotice()}${!st.search&&!count?releaseSpotlight():''}
  <div class="list-heading"><h2>${glyph('gamepad')} Spieleübersicht <span class="result-pill" id="result-count">${count?`${full} Treffer`:`${gs.length} Spiele · ${gs.filter(g=>g.release_status==='upcoming').length} angekündigt · ${gs.filter(g=>g.release_status==='unverified').length} offen`}</span></h2><div class="view-controls" role="group" aria-label="Katalogdarstellung"><button class="view-icon ${st.viewMode==='rich'?'selected':''}" data-action="set-view" data-value="rich" aria-label="Große Spielekarten" aria-pressed="${st.viewMode==='rich'}">${glyph('grid')}</button><button class="view-icon ${st.viewMode==='compact'?'selected':''}" data-action="set-view" data-value="compact" aria-label="Kompakte Liste" aria-pressed="${st.viewMode==='compact'}">${glyph('list')}</button></div></div>
  <div id="cards">${(()=>{
    if(!gs.length)return '<div class="empty">Keine passenden Spiele. Bitte die Filter anpassen oder zurücksetzen.</div>';
    const facets=candidates(gs[0]).softTotal,renderer=st.viewMode==='compact'?listRow:gameCard;
    if(!facets)return `<div class="cards ${st.viewMode==='compact'?'compact':''}">${gs.map(renderer).join('')}</div>`;
    const sets=new Map();for(const g of gs){const n=candidates(g).softMatched;if(!sets.has(n))sets.set(n,[]);sets.get(n).push(g)}
    const parts=[];if(!sets.has(facets))parts.push(`<div class="match-section-head"><strong>Keine Volltreffer</strong><small>Teiltreffer nach Übereinstimmung sortiert</small></div>`);
    for(const [n,games] of [...sets].sort((a,b)=>b[0]-a[0])){
      parts.push(`<section class="match-section"><div class="match-section-head"><strong>${n===facets?'Volltreffer':'Teiltreffer'} · ${n} von ${facets} Merkmalen</strong><span>${games.length} ${games.length===1?'Spiel':'Spiele'}</span></div><div class="cards ${st.viewMode==='compact'?'compact':''}">${games.map(renderer).join('')}</div></section>`);
    }return parts.join('');
  })()}</div>
  ${!st.search&&!count&&st.data?.candidates?.filter(c=>c.review_status==='needs_review'&&!c.linked_game_id).length?`<details class="pending-games"><summary>${st.data.candidates.length} weitere Listeneinträge · geplant / Editionswahl offen</summary><p>Deine Ursprungsliste hat insgesamt ${gs.length} Einträge. Geplante Titel und noch nicht festgelegte Editionen erscheinen separat und werden nicht fälschlich als spielbar gezählt.</p>${st.data.candidates.map(c=>`<div class="pending-item"><strong>${esc(c.original_title)}</strong>${c.review_note?`<small>${esc(c.review_note)}</small>`:''}</div>`).join('')}</details>`:''}
 </main>`);
}

function gameById(){return st.data.games.find(g=>g.id===st.gameId)}
function detail(){const g=gameById();if(!g){st.screen='catalog';return catalog()}const fit=fitFor(g),c=toCore(g),s=scoreFor(g),r=rating(g.id,st.data.userId),fav=myFav(g.id);const isAdmin=st.data.role==='admin';const eligible=fit.score>=.8;
 const currentNotes=st.data.notes.filter(n=>n.game_id===g.id);const privateCoop=(g.modes||[]).some(m=>m.type==='coop_pve'&&m.privateSession===true&&Number(m.sameTeamMax||0)>=3);const lobbyNote=privateCoop?'✓ Private Koop-Partie mit drei Personen bestätigt':(g.modes||[]).some(m=>m.type==='coop_pve'&&Number(m.sameTeamMax||0)>=3)?'Koop mit drei Personen möglich; private Lobby noch nicht geprüft':fit.explanation;
 return pageShell(`<main class="detail"><button class="back" data-action="go" data-screen="catalog">‹ Zurück zur Bibliothek</button>${g.release_status==='upcoming'?`<button class="back release-back" data-action="go" data-screen="upcoming">◷ Release-Radar ansehen</button>`:''}<div class="hero">${cover(g,'hero',true)}<div class="hero-title"><h1>${esc(g.title)}</h1><span>${esc(taxonomyLabel(g))}</span></div></div><div class="detail-chips">${releaseTag(g)}<span class="tag ${eligible?'ok':'warn'}">${privateCoop?'✓ 3er-Koop ohne Fremdspieler':eligible?'✓ Zu dritt spielbar':'⚠ Lobby/3er-Eignung prüfen'}</span><span class="tag">${Math.max(0,...(g.modes||[]).map(m=>m.maxHumans||0))||'?'} Spieler max.</span>${g.hardware_tier?`<span class="tag">Hardware ${g.hardware_tier}/5</span>`:''}</div><div class="stats"><div><small>STEAM</small><strong class="teal">${g.steam_positive_percent==null?'–':g.steam_positive_percent+' %'}</strong></div><div><small>UNS</small><strong class="gold">${avg(g)==null?'–':avg(g).toFixed(1).replace('.',',')+'/10'}</strong></div><div><small>LAN-SCORE</small><strong>${s.score!=null?s.score+'/100'+(s.provisional?'*':''):'offen'}</strong></div></div><div class="panel wish-panel"><div class="wish-intro"><h2>Wünsche für die nächste LAN</h2><p class="hint">${playWishCount(g.id)} Mitglieder interessiert · davon ${mustPlayCount(g.id)} Must-play. Wunschfaktor: ${((s.factors.playWishes.value??0)*.15).toFixed(1).replace('.',',')} von 15 möglichen Punkten (3er-LAN). Je Person zählt nur die stärkste Auswahl.</p></div><div class="wish-actions"><button class="btn ${myPlayWish(g.id)?'primary':'ghost'} wish-toggle" data-action="toggle-play-wish" data-id="${g.id}" aria-pressed="${myPlayWish(g.id)?'true':'false'}">${myPlayWish(g.id)?'✓ Möchte ich spielen':'✦ Möchte ich spielen'}</button><button class="btn ${fav?'primary':'ghost'} wish-toggle must-play-toggle" data-action="fav" aria-pressed="${fav?'true':'false'}">${fav?'♥ Must-play gewählt':'♡ Must-play · zählt doppelt'}</button></div></div>${s.hardwareWarnings?.length?`<div class="panel hardware-alert"><strong>⚠ Hardware-Hinweis</strong><p>${esc(s.hardwareWarnings.join(' · '))}</p></div>`:''}${scoreExplanation(s)}<div class="panel"><h2>Spielinformationen</h2><p>${esc(g.description||'Noch keine Beschreibung hinterlegt.')}</p><div class="info-pairs"><span>Preis</span><strong>${euro(g.price_eur)}</strong>${g.release_status&&g.release_status!=='available'?`<span>Status</span><strong>${esc(g.release_label||'Noch nicht geklärt')}</strong>`:''}<span>Multiplayer</span><strong>${esc(lobbyNote)}</strong><span>Quelle</span><strong>${esc(g.source_label||'Unbekannt')}</strong><span>Datenqualität</span><strong>${s.coveragePercent}% für LAN-Score verfügbar</strong></div><div class="row gap">${g.steam_app_id?`<a href="https://store.steampowered.com/app/${g.steam_app_id}/" class="btn primary" target="_blank" rel="noopener noreferrer">Steam öffnen ↗</a>`:''}<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(g.title+' gameplay')}" class="btn ghost" target="_blank" rel="noopener noreferrer">Gameplay auf YouTube ↗</a></div></div>${classificationEditor(g)}<div class="panel"><h2>Besitz der Mitglieder</h2>${members().map(m=>{const own=owner(g.id,m.user_id),editable=st.data.role==='admin'||m.user_id===st.data.userId;return `<div class="person-row">${avatar(m.profile,'medium')}<div class="person-name"><strong>${esc(m.profile?.display_name||'Mitglied')}</strong><span>${own?.status==='yes'?own.launchers.join(' + '):own?.status==='no'?'Besitzt nicht':'Noch unbekannt'}</span></div>${editable?`<button class="owner-pick" data-action="toggle-owner" data-user="${m.user_id}">${own?.status==='yes'?'✓':own?.status==='no'?'×':'?'} Ändern ⌄</button>`:''}</div>${st.menu==='owner:'+m.user_id?`<div class="choice-list inline-owner">${[['unknown','Unbekannt'],['no','Besitzt nicht'],['Steam','Steam'],['Epic','Epic Games'],['Steam + Epic','Steam + Epic'],['Battle.net','Battle.net'],['GOG','GOG'],['Offline','Ohne Launcher']].map(([v,t])=>`<button class="choice-item" data-action="save-owner" data-user="${m.user_id}" data-value="${v}">${t}</button>`).join('')}</div>`:''}`}).join('')}</div><div class="panel"><h2>Unsere Bewertungen</h2>${members().map(m=>`<div class="person-row">${avatar(m.profile,'medium')}<strong class="person-name">${esc(m.profile?.display_name)}</strong><strong class="rating-mark">${rating(g.id,m.user_id)==null?'–':rating(g.id,m.user_id)+'/10'}${rating(g.id,m.user_id)!=null&&!confirmedOwner(g.id,m.user_id)?' · Besitz prüfen':''}</strong></div>`).join('')}<p class="hint">${ratingAllowed(g)?'Wie gefällt dir das Spiel? 1 = überhaupt nicht, 10 = absolutes Lieblingsspiel.':g.release_status!=='available'&&g.release_status?'Bewerten ist nach Veröffentlichung und bestätigtem Besitz möglich.':'Du kannst das Spiel erst bewerten, wenn dein Besitz bestätigt ist. Bereits gespeicherte Bewertungen bleiben erhalten.'}</p><div class="rating-buttons">${Array.from({length:10},(_,i)=>i+1).map(n=>`<button class="rate rate-${n} ${r===n?'picked':''}" data-action="rate" data-value="${n}" ${ratingAllowed(g)?'':'disabled aria-disabled="true"'} title="Bewertung ${n} von 10">${n}</button>`).join('')}</div>${r!=null?`<button class="text-btn" data-action="clear-rating">Bewertung entfernen</button>`:''}</div><div class="panel"><h2>Kommentare & technische Hinweise</h2>${currentNotes.length?currentNotes.map(n=>`<div class="comment"><strong>${esc(st.data.profiles.find(p=>p.user_id===n.user_id)?.initials||'?')} · ${esc(n.category)}</strong><p>${esc(n.body)}</p></div>`).join(''):`<p class="hint">Noch keine Kommentare vorhanden.</p>`}<form id="comment-form"><div class="tag-picker">${['Kommentar','Hinweis','Technik'].map(c=>`<button type="button" class="tag ${st.commentCategory===c?'active':''}" data-action="comment-type" data-value="${c}">${c}</button>`).join('')}</div><textarea name="body" maxlength="2000" required placeholder="Deine Erfahrung, Grafikeinstellung oder Server-Tipp …"></textarea><button class="btn primary full" type="submit">Kommentar speichern</button></form></div></main>`)}
function authScreen(){return `<div class="auth-wrap"><div class="auth-card"><div class="brand auth-brand"><span class="brand-icon">⌘</span><span>LAN <em>Library</em><small>EURE GEMEINSAME SPIELEBIBLIOTHEK</small></span></div><h1>${st.accountTab==='signup'?'Konto erstellen':'Willkommen zurück'}</h1><p>Privater Spielekatalog für deine LAN-Gruppe.</p><div class="tabs"><button data-action="account-tab" data-value="login" class="${st.accountTab==='login'?'active':''}">Anmelden</button><button data-action="account-tab" data-value="signup" class="${st.accountTab==='signup'?'active':''}">Registrieren</button></div><form id="auth-form"><label>E-Mail<input type="email" name="email" required autocomplete="email" placeholder="mail@beispiel.de"></label><label>Passwort<input type="password" name="password" minlength="8" required autocomplete="${st.accountTab==='signup'?'new-password':'current-password'}" placeholder="Mindestens 8 Zeichen"></label><button class="btn primary full" type="submit">${st.accountTab==='signup'?'Konto erstellen':'Anmelden'}</button></form><p class="hint">${st.invite?'Einladung erkannt: Nach der Anmeldung kannst du der Gruppe beitreten.':'Der Zugang zur Gruppe erfolgt nur per Einladung.'}</p><div class="install-guide">${installInstructions()}</div></div></div>`}
function joinScreen(){return `<div class="auth-wrap"><div class="auth-card"><h1>Gruppe einrichten</h1><p>${st.invite?'Du hast einen Einladungslink erhalten.':'Erstelle eure Gruppe oder gib einen Einladungscode ein.'}</p><form id="join-form"><label>Dein Anzeigename<input name="name" required minlength="2" maxlength="60" placeholder="z. B. Martin Kretschmer"></label><label>Kürzel<input name="initials" required maxlength="3" placeholder="MK"></label><label>Einladungscode<input name="invite" value="${esc(st.invite)}" placeholder="Code vom Admin (leer = neue Gruppe)"></label><label>Gruppenname (nur beim Erstellen)<input name="groupName" value="LAN Library" placeholder="LAN Library"></label><button class="btn primary full" type="submit">${st.invite?'Gruppe beitreten':'Weiter'}</button></form><p class="hint">Für die erste Gruppe wird das anlegende Konto Administrator. Andere Mitglieder treten mit einem zeitlich begrenzten Link bei.</p><div class="install-guide"><strong>LAN Library auf deinem Gerät</strong>${installInstructions()}</div><button class="text-btn" data-action="logout">Abmelden</button></div></div>`}
function steamResults(){return (st.steamResults||[]).map(g=>`<button type="button" class="steam-result" data-action="steam-pick" data-id="${g.id}">${g.image?`<img src="${esc(g.image)}" alt="">`:''}<span><strong>${esc(g.name)}</strong><small>Steam-App ${g.id}${g.priceEUR!=null?' · '+euro(g.priceEUR):''}</small></span><b>Übernehmen</b></button>`).join('');}
function add(){return pageShell(`<main class="detail"><button class="back" data-action="go" data-screen="catalog">‹ Zurück zur Bibliothek</button><div class="intro"><h1>Spiel hinzufügen</h1><p>Steam-Suche mit Übernahme von Spieldaten oder manuell eintragen.</p></div>
 <div class="panel steam-import"><h2>Automatisch aus Steam übernehmen</h2><p class="hint">Spielname oder Steam-Link eingeben, Treffer auswählen, Daten prüfen. Der Multiplayer-Modus muss vor dem Speichern bestätigt werden.</p><div class="steam-search-row"><input id="steam-search" type="search" value="${esc(st.steamQuery||'')}" autocomplete="off" placeholder="Spiel suchen, z. B. Borderlands 2"><button class="btn primary" type="button" data-action="steam-search">Suchen</button></div><div id="steam-search-feedback">${st.steamSearching?'Suche läuft …':esc(st.steamError||'')}</div><div id="steam-results">${steamResults()}</div>${st.steamChoice?`<div class="steam-selected"><strong>Ausgewählt: ${esc(st.steamChoice.name)}</strong><span>App-ID: ${esc(st.steamChoice.id)} · verfügbare Informationen werden ins Formular übernommen.</span><button type="button" class="btn ghost" data-action="steam-clear">Auswahl zurücksetzen</button></div>`:''}</div>
 <div class="panel" id="manual-entry"><h2>Spieldaten prüfen und ergänzen</h2><p class="hint">Veröffentlichte Spiele benötigen einen bestätigten Mehrspielermodus. Für angekündigte Titel können Multiplayer-Details bis zum Release offen bleiben.</p><form id="game-form"><label>Spielname<input name="title" value="${esc(st.steamChoice?.name||'')}" minlength="2" maxlength="130" required placeholder="z. B. Dungeon Defenders"></label><label>Steam-App-ID oder Steam-Link (optional)<input name="steam" value="${st.steamChoice?esc(st.steamChoice.id):''}" placeholder="https://store.steampowered.com/app/..."></label><div class="form-two"><label>Verfügbarkeit<select name="releaseStatus"><option value="available">Bereits erhältlich</option><option value="upcoming" ${st.steamChoice?.comingSoon?'selected':''}>Noch nicht veröffentlicht</option></select></label><label>Genaues Release-Datum (optional)<input name="releaseDate" type="date" value="${esc(st.steamChoice?.releaseDate||'')}"></label></div><label>Angekündigter Zeitraum (optional)<input name="releaseLabel" maxlength="140" value="${esc(st.steamChoice?.releaseLabel||'')}" placeholder="z. B. Sommer 2027 / Termin offen"></label><label>Genre<input name="genre" value="${esc(st.steamChoice?.genre||'')}" placeholder="z. B. RPG · Koop"></label><details class="add-genres"><summary>Hauptgenre und Zusatz-Tags festlegen</summary><p class="hint">Überprüfe die automatisch vorgeschlagenen Genres und Tags; sie lassen sich später ändern.</p>${[['genres','Genre / Spieltyp'],['mechanics','Vorlieben / Tags']].map(([key,label])=>`<section class="edit-taxon-section"><h3>${label}</h3>${TAXONOMY_GROUPS[key].map(([heading,items])=>`<div class="multi-group"><strong>${esc(heading)}</strong><div class="multi-choices">${items.map(([tag,name])=>`<button type="button" data-action="add-classification" data-key="${key}" data-value="${tag}" class="multi-chip ${(st.addClassification[key]||[]).includes(tag)?'active':''}" aria-pressed="${(st.addClassification[key]||[]).includes(tag)}">${esc(name)}</button>`).join('')}</div></div>`).join('')}</section>`).join('')}</details><label>Spielmodus <span class="hint">Bitte eine zutreffende Spielart wählen</span></label><div class="tag-picker game-modes">${[['coop_pve','Echter Koop / PvE'],['team_pvp','Team-PvP'],['versus','Versus'],['ffa','Free-for-All']].map(([v,t])=>`<button type="button" data-action="mode" data-value="${v}" class="mode-btn">${t}</button>`).join('')}</div><input id="mode-value" name="mode" type="hidden" value=""><div class="form-two"><label>Max. menschliche Spieler<input name="maxPlayers" type="number" min="2" max="100" value="4" required></label><label>Max. im selben Team<input name="teamPlayers" type="number" min="1" max="100" value="4" required></label></div><label class="check-row"><input type="checkbox" name="privateSession" checked> Mit eurer Gruppe ohne Fremdspieler möglich</label><label class="check-row"><input type="checkbox" name="bots"> Zusätzliche Spieler durch Bots ersetzbar</label><div class="form-two"><label>Preis (€), optional<input name="price" value="${st.steamChoice?.priceEUR??''}" type="number" min="0" step=".01" placeholder="Unbekannt"></label><label>Hardware-Stufe, optional<input name="hardware" type="number" min="1" max="5" placeholder="1–5"></label></div><label>Beschreibung (optional)<textarea name="description" placeholder="Was macht das Spiel aus?">${esc(st.steamChoice?.description||'')}</textarea></label><label class="check-row confirm"><input type="checkbox" name="confirmed"> Ich habe geprüft, dass das Spiel einen echten Mehrspielermodus besitzt.</label><button class="btn primary full" type="submit">＋ Zur gemeinsamen Bibliothek hinzufügen</button></form></div></main>`)}
function membersPage(){return pageShell(`<main><div class="intro"><h1>Mitglieder</h1><p>Private Gruppe · ${members().length} Mitglieder</p></div><div class="panel"><h2>Eure Gruppe</h2>${members().map(m=>`<button class="member-link" data-action="open-profile" data-id="${m.user_id}">${avatar(m.profile,'medium')}<span><strong>${esc(m.profile?.display_name||'Mitglied')}</strong><small>${esc(m.profile?.initials)} · ${m.role==='admin'?'Administrator':'Mitglied'}</small></span><b>›</b></button>`).join('')}</div>${st.data.role==='admin'?`<div class="panel"><h2>Aufgaben zuweisen</h2><p class="hint">Die Empfänger sehen diese Aufgaben unter Einstellungen → Dein Einstieg.</p><form id="assign-task-form"><label>Mitglied<select name="userId" required>${members().map(m=>`<option value="${m.user_id}">${esc(m.profile?.display_name||'Mitglied')}</option>`).join('')}</select></label><label>Aufgabe<select name="taskType"><option value="steam_library">Steam-Bibliothek freigeben</option><option value="hardware">PC-Hardware eintragen</option><option value="profile">Profilbild ergänzen</option><option value="custom">Eigene Aufgabe</option></select></label><label>Zusatzinfo (optional)<input name="note" maxlength="650" placeholder="z. B. vor der nächsten LAN"></label><label>Eigener Titel (bei eigener Aufgabe)<input name="customTitle" maxlength="150" placeholder="z. B. Mikrofon testen"></label><button class="btn ghost full" type="submit">Aufgabe zuweisen</button></form><div class="task-list-admin">${(st.data.tasks||[]).map(t=>`<div class="task-line"><span>${esc(st.data.profiles.find(p=>p.user_id===t.assigned_to)?.initials||'?')} · ${esc(t.title)}</span><small>${t.status==='done'?'✓ Erledigt':'Offen'}</small></div>`).join('')}</div></div>`:''}${st.data.role==='admin'?`<div class="panel"><h2>Mitglied einladen</h2><p class="hint">Einladungscode 7 Tage gültig, maximal 3 Verwendungen. Nur eingeloggte Benutzer können beitreten.</p><button class="btn primary full" data-action="invite">Einladungslink erstellen</button><div id="invite-result"></div></div>`:''}<div class="panel"><h2>Mein Konto</h2><button class="btn ghost full" data-action="logout">Abmelden</button></div></main>`)}
function profilePage(){const profile=st.data.profiles.find(p=>p.user_id===st.profileId);if(!profile){st.screen='members';return membersPage()}const its=st.data.ownership.filter(o=>o.user_id===st.profileId&&o.status==='yes').map(o=>st.data.games.find(g=>g.id===o.game_id)).filter(Boolean);const my=st.data.ownership.filter(o=>o.user_id===st.data.userId&&o.status==='yes').map(o=>o.game_id);const overlap=its.filter(g=>my.includes(g.id));const ratings=st.data.ratings.filter(r=>r.user_id===st.profileId);const mine=st.profileId===st.data.userId;
 return pageShell(`<main class="detail"><button class="back" data-action="go" data-screen="members">‹ Zurück zu Mitglieder</button><div class="profile-head">${avatar(profile,'large')}<div><h1>${esc(profile.display_name)}</h1><span class="tag">${esc(profile.initials)}</span></div></div>${hardwarePanel(profile.user_id,mine)}${mine?`<div class="panel"><h2>Mein Profil bearbeiten</h2><form id="profile-form"><label>Name<input name="displayName" value="${esc(profile.display_name)}" minlength="2" maxlength="60" required></label><label>Kürzel<input name="initials" value="${esc(profile.initials)}" maxlength="3" required></label><button type="submit" class="btn ghost full">Änderungen speichern</button></form><form id="avatar-form"><label>Profilbild auswählen<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required></label><button class="btn ghost full" type="submit">Profilbild hochladen</button></form></div>`:''}<div class="panel"><h2>Spiele von ${esc(profile.initials)} <span class="muted">(${its.length})</span></h2>${its.length?`<div class="tile-grid">${its.slice(0,16).map(g=>`<button class="tile" data-action="open-game" data-id="${g.id}">${cover(g)}<strong>${esc(g.title)}</strong></button>`).join('')}</div>`:`<p class="hint">Noch keine bestätigten Besitztitel.</p>`}</div>${!mine?`<div class="panel"><h2>Gemeinsam mit mir (${overlap.length})</h2><p class="hint">Besitz-Schnittmenge, keine automatische Garantie für Crossplay.</p>${overlap.map(g=>`<button class="line-item" data-action="open-game" data-id="${g.id}">${esc(g.title)} ›</button>`).join('')||'<p class="hint">Noch keine bestätigte Überschneidung.</p>'}</div>`:''}<div class="panel"><h2>Bewertungen (${ratings.length})</h2>${ratings.length?ratings.map(r=>{const g=st.data.games.find(g=>g.id===r.game_id);return g?`<button class="line-item" data-action="open-game" data-id="${g.id}">${esc(g.title)} <strong>${r.rating}/10</strong></button>`:''}).join(''):'<p class="hint">Noch keine Bewertungen.</p>'}</div></main>`)}
function settingsPage(){return pageShell(`<main class="detail"><h1>Einstellungen</h1>${onboardingCard()}<div class="panel"><h2>Auf iPhone / Android installieren</h2>${installInstructions()}</div>${steamConnectionCard()}<div class="panel"><h2>Mein Konto</h2><p class="hint">Profilbild, Anzeigename und Kürzel bearbeiten.</p><button class="btn primary full" data-action="open-profile" data-id="${st.data.userId}">Mein Profil bearbeiten</button></div><div class="panel"><h2>Mitglieder</h2><button class="btn ghost full" data-action="go" data-screen="members">Gruppenmitglieder ansehen</button></div><div class="panel"><h2>Steam-Preise & Bewertungen</h2><p class="hint">Steam-Wertungen werden als positive Stimmen in Prozent und Preise als aktuelle Momentaufnahme gespeichert. Beide Daten werden automatisch abgeglichen. Spiele außerhalb von Steam haben möglicherweise keine Wertung.</p>${st.data.role==='admin'?`<button class="btn ghost full" data-action="sync-reviews">Steam-Preise und Bewertungen aktualisieren</button>${st.steamLastResult?`<p class=\"hint\" style=\"overflow-wrap:anywhere\">${esc(st.steamLastResult)}</p>`:''}`:''}</div><div class="panel"><h2>Anmeldung</h2><button class="btn ghost full" data-action="logout">Abmelden</button></div></main>`)}
function hardwarePanel(userId,mine){
 const h=(st.data.hardware||[]).find(x=>x.user_id===userId);
 const val=(name)=>esc(h?.[name]??'');
 const complete=!!(h?.cpu_model&&h?.gpu_model&&h?.ram_gb);
 return `<div class="panel hardware-panel"><h2>PC-Hardware ${complete?'<span class="tag ok">Hinterlegt</span>':'<span class="tag warn">Angaben fehlen</span>'}</h2>
 ${h?`<div class="info-pairs"><span>CPU</span><strong>${esc(h.cpu_model||'Unbekannt')}</strong><span>Grafikkarte</span><strong>${esc(h.gpu_model||'Unbekannt')}</strong><span>RAM</span><strong>${h.ram_gb?esc(h.ram_gb)+' GB':'Unbekannt'}</strong><span>Ziel</span><strong>${esc(h.resolution_width||1920)} × ${esc(h.resolution_height||1080)}, ${esc(h.target_fps||60)} FPS · ${esc(h.preset||'medium')}</strong></div>`:'<p class="hint">Noch kein PC-Profil vorhanden. Die spätere Performance-Einschätzung bleibt zunächst offen.</p>'}
 ${mine?`<form id="hardware-form"><div class="form-two"><label>Prozessor<input name="cpu" placeholder="z. B. Ryzen 5 5600" maxlength="150" value="${val('cpu_model')}" required></label><label>Grafikkarte<input name="gpu" placeholder="z. B. RTX 3060" maxlength="150" value="${val('gpu_model')}" required></label></div><div class="form-two"><label>Arbeitsspeicher (GB)<input name="ram" type="number" min="1" max="2048" value="${val('ram_gb')}" required></label><label>Grafikspeicher (GB, optional)<input name="vram" type="number" min="1" max="256" value="${val('vram_gb')}"></label></div><div class="form-two"><label>Auflösung Breite<input name="width" type="number" min="640" max="10000" value="${val('resolution_width')||1920}"></label><label>Auflösung Höhe<input name="height" type="number" min="480" max="10000" value="${val('resolution_height')||1080}"></label></div><div class="form-two"><label>Ziel-FPS<input name="fps" type="number" min="24" max="360" value="${val('target_fps')||60}"></label><label>Grafikdetails<select name="preset">${[['low','Niedrig'],['medium','Mittel'],['high','Hoch'],['ultra','Ultra']].map(([v,n])=>`<option value="${v}" ${h?.preset===v||!h&&v==='medium'?'selected':''}>${n}</option>`).join('')}</select></label></div><button class="btn primary full" type="submit">Hardware speichern</button></form>`:''}
 <p class="hint">Hardware-Eignung ist eine Einschätzung, keine FPS-Garantie. Ohne konkrete Leistungsdaten wird kein positiver Kompatibilitätswert erfunden.</p></div>`;
}
const fmtDate=x=>!x?'–':new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(x));
function calendar(){
 const events=(st.data.events||[]),ev=events.find(e=>e.id===st.eventId)||events[0]||null;
 const options=(st.data.dateOptions||[]).filter(o=>o.event_id===ev?.id).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const attendance=(st.data.attendance||[]).filter(x=>x.event_id===ev?.id);
 const attendanceMine=attendance.find(x=>x.user_id===st.data.userId)?.response;
 const votes=st.data.dateVotes||[], wishes=st.data.wishes||[], selections=st.data.selections||[];
 const details=ev?`<div class="panel event-panel"><h2>${esc(ev.name)} <span class="tag ${ev.status==='confirmed'?'ok':'warn'}">${ev.status==='confirmed'?'Bestätigt':ev.status==='polling'?'Abstimmung':'Abgeschlossen'}</span></h2><p class="hint">${esc(ev.location_note||'Ort noch offen')}${ev.starts_at?' · '+fmtDate(ev.starts_at):''}</p>
 <div class="person-row"><div class="person-name"><strong>Meine Teilnahme</strong><span>${attendanceMine==='yes'?'Dabei':attendanceMine==='maybe'?'Vielleicht':attendanceMine==='no'?'Nicht dabei':'Noch offen'}</span></div>${['yes','maybe','no'].map(x=>`<button class="vote-btn ${attendanceMine===x?'on':''}" data-action="rsvp" data-value="${x}" data-id="${ev.id}">${x==='yes'?'Ja':x==='maybe'?'Vielleicht':'Nein'}</button>`).join('')}</div>
 <h3>Terminvorschläge</h3>${options.length?options.map(o=>{const v=votes.filter(x=>x.option_id===o.id),mine=v.find(x=>x.user_id===st.data.userId)?.response;return `<div class="date-option"><div class="date-caption"><strong>${fmtDate(o.starts_at)}</strong><span>bis ${fmtDate(o.ends_at)} · Ja ${v.filter(x=>x.response==='yes').length} · Vielleicht ${v.filter(x=>x.response==='maybe').length} · Nein ${v.filter(x=>x.response==='no').length}</span></div><div class="vote-actions">${['yes','maybe','no'].map(x=>`<button class="vote-btn ${mine===x?'on':''}" data-action="date-vote" data-id="${o.id}" data-value="${x}">${x==='yes'?'Ja':x==='maybe'?'Vielleicht':'Nein'}</button>`).join('')}${st.data.role==='admin'&&ev.status==='polling'?`<button class="vote-btn confirm-date" data-action="confirm-date" data-id="${o.id}">Termin bestätigen</button>`:''}</div></div>`}).join(''):'<p class="hint">Noch keine Termine vorgeschlagen.</p>'}
 ${ev.status==='polling'?`<form id="option-form"><div class="form-two"><label>Neuer Vorschlag: Beginn<input name="start" type="datetime-local" required></label><label>Ende<input name="end" type="datetime-local" required></label></div><button type="submit" class="btn ghost full">Weiteren Termin vorschlagen</button></form>`:''}
 </div><div class="panel"><h2>Spielewünsche für diese LAN</h2><p class="hint">Jedes Mitglied kann mehrere Spiele wählen. ♥ Must-play aus der Spieleübersicht wird hier zuerst angezeigt (im LAN-Score doppelt gewichtet). Die Auswahl durch den Admin bleibt separat.</p><label>Spiel suchen<input id="wish-search" placeholder="Spielnamen eingeben …" value="${esc(st.wishSearch)}" autocomplete="off"></label><div id="wish-games">${wishRows(ev.id)}</div></div>`:'';
 return pageShell(`<main class="detail plan-page"><div class="intro"><h1>LAN-Planer</h1><p>Termine, Zusagen und Spiele für eure nächste LAN</p></div>
 ${events.length?`<div class="event-tabs">${events.map(e=>`<button class="quick-chip ${e.id===ev?.id?'selected':''}" data-action="select-event" data-id="${e.id}">${esc(e.name)}</button>`).join('')}</div>`:'<div class="panel"><p class="hint">Noch keine LAN geplant. Du kannst jetzt eine erstellen.</p></div>'}
 ${details}
 <div class="panel"><h2>Neue LAN planen</h2><form id="event-form"><label>Name<input name="name" placeholder="z. B. Winter-LAN" minlength="2" maxlength="100" required></label><label>Ort (optional)<input name="location" maxlength="500" placeholder="z. B. bei MK"></label><button class="btn primary full" type="submit">LAN-Abstimmung starten</button></form></div>
 </main>`);
}
function wishRows(eventId){
 const all=allGames().filter(g=>g.title.toLowerCase().includes(st.wishSearch.toLowerCase())).sort((a,b)=>mustPlayCount(b.id)-mustPlayCount(a.id)||playWishCount(b.id)-playWishCount(a.id)||a.title.localeCompare(b.title,'de'));
 const counts=st.data.wishes||[], selections=st.data.selections||[];
 return all.length?all.map(g=>{const own=counts.some(x=>x.event_id===eventId&&x.game_id===g.id&&x.user_id===st.data.userId),cnt=counts.filter(x=>x.event_id===eventId&&x.game_id===g.id).length,selected=selections.some(x=>x.event_id===eventId&&x.game_id===g.id);return `<div class="wish-row"><span>${esc(g.title)}${mustPlayCount(g.id)?` <small>♥ ${mustPlayCount(g.id)} Must-play</small>`:''}${selected?' <small>✓ Eingeplant</small>':''}</span><button class="vote-btn ${own?'on':''}" data-action="wish" data-id="${g.id}" data-value="${own?'remove':'add'}">♡ ${cnt}</button>${st.data.role==='admin'?`<button class="vote-btn ${selected?'on':''}" data-action="select-game" data-id="${g.id}" data-value="${selected?'remove':'add'}">${selected?'✓':'+'}</button>`:''}</div>`}).join(''):'<p class="hint">Keine passenden Spiele.</p>';
}

function showToast(msg){
 document.querySelector('.toast')?.remove();
 const node=document.createElement('div');node.className='toast';node.textContent=String(msg);
 document.body.append(node);setTimeout(()=>node.remove(),3500);
}
function render(){if(st.loading){app.innerHTML='<main class="boot">LAN Library lädt …</main>';return}if(!DEMO&&!st.user){app.innerHTML=authScreen();return}if(!DEMO&&!st.membership){app.innerHTML=joinScreen();return}if(!st.data){app.innerHTML='<main class="boot">Daten werden geladen …</main>';return}app.innerHTML=({catalog,upcoming,detail,members:membersPage,profile:profilePage,calendar,add,settings:settingsPage}[st.screen]||catalog)();}
async function load(){st.data=await repo.load();st.membership=repo.membership||null;st.user=repo.user;await loadAvatars();render()}
let releaseCheckRunning=false;
async function syncUpcoming(manual=false){
 if(DEMO||!st.data||releaseCheckRunning)return;
 releaseCheckRunning=true;st.releaseBusy=manual;
 if(manual)render();
 try{
  const result=await repo.syncReleaseRadar(manual);
  st.releaseError=(result.failed||[]).length?`${result.failed.length} Steam-Einträge konnten nicht geprüft werden.`:'';
  if((result.updated||[]).length){await load();showToast(`${result.updated.map(x=>x.title).join(', ')}: Jetzt auf Steam verfügbar!`);}
  else if(manual)showToast(result.checked?`${result.checked} Spiele geprüft · noch kein neuer Release.`:'Keine neuen Release-Daten vorhanden.');
 }catch(e){if(manual){st.releaseError=e.message;showToast(e.message)}}
 finally{releaseCheckRunning=false;st.releaseBusy=false;if(manual)render()}
}
let reviewSyncRunning=false;
async function syncSteamReviews(manual=false){
 if(DEMO||!st.data||st.data.role!=='admin'||reviewSyncRunning)return;
 reviewSyncRunning=true;
 let successes=0,attempted=0,errors=0;const errorDetails=[];
 try{
  for(let pass=0;pass<8;pass++){
   if(document.hidden && !manual)break;
   const result=await repo.syncSteamReviews();
   const changed=result.updated||[];
   attempted+=(result.processed||0);successes+=changed.filter(x=>x.score!=null||x.priceEUR!=null).length;errors+=(result.failed||[]).length;for(const e of result.failed||[]){if(errorDetails.length<4&&!errorDetails.includes(e.error||''))errorDetails.push(e.error||'Unbekannter Datenfehler');}
   for(const r of changed){const g=st.data?.games.find(g=>g.id===r.id);if(g){if(r.score!==undefined)g.steam_positive_percent=r.score;if(r.priceEUR!==undefined && r.priceEUR!==null)g.price_eur=r.priceEUR;}}
   if(changed.length && ['catalog','detail'].includes(st.screen) && !document.querySelector('input:focus,textarea:focus'))render();
   if(!result.remainingPossible||!changed.length)break;
   await new Promise(ok=>setTimeout(ok,1200));
  }
  if(manual){st.steamLastResult=`${successes} Daten aktualisiert · ${errors} Fehler · ${attempted} Spiele geprüft. ${errorDetails.length?errorDetails.join(' | '):''}`;render();showToast(successes?`${successes} Steam-Daten aktualisiert.`:errors?`Steam-Fehler: ${errorDetails[0]||'Details unter Einstellungen'}`:'Keine neuen Preise oder Bewertungen verfügbar.');}
 }catch(e){if(manual)showToast('Steam-Synchronisierung fehlgeschlagen: '+e.message)}
 finally{reviewSyncRunning=false}
}
async function loadAvatars(){const profiles=st.data?.profiles||[];await Promise.all(profiles.filter(x=>x.avatar_path).map(async p=>{const url=await repo.avatarUrl(p.avatar_path);if(url)st.avatarUrls[p.user_id]=url}))}
async function execute(a,el){switch(a){
 case 'select-event':st.eventId=el.dataset.id;st.wishSearch='';render();return;
 case 'date-vote':await repo.setDateVote(el.dataset.id,el.dataset.value);await load();showToast('Stimme gespeichert.');return;
 case 'rsvp':await repo.setAttendance(el.dataset.id,el.dataset.value);await load();showToast('Teilnahme gespeichert.');return;
 case 'wish':{const ev=(st.data.events||[]).find(e=>e.id===st.eventId)||st.data.events?.[0];if(!ev)throw Error('Bitte zuerst eine LAN erstellen');await repo.setWish(ev.id,el.dataset.id,el.dataset.value==='add');await load();return}
 case 'select-game':{const ev=(st.data.events||[]).find(e=>e.id===st.eventId)||st.data.events?.[0];if(!ev)throw Error('Keine LAN gewählt');await repo.setSelection(ev.id,el.dataset.id,el.dataset.value==='add');await load();return}
 case 'confirm-date':{const option=st.data.dateOptions.find(o=>o.id===el.dataset.id),ev=st.data.events.find(e=>e.id===option?.event_id);if(!option||!ev||ev.status!=='polling')throw Error('Terminvorschlag nicht gefunden');await repo.confirmEvent(ev.id,option);await load();showToast('LAN-Termin bestätigt.');return}
 case 'reload':location.reload();return;
 case 'sync-reviews':await syncSteamReviews(true);return;
 case 'go':st.screen=el.dataset.screen;st.menu=null;st.openedChoice=null;render();scrollTo(0,0);return;
 case 'release-mine':st.releaseMine=!st.releaseMine;render();return;
 case 'dismiss-release':{const g=st.data.games.find(x=>x.id===el.dataset.id);if(g){const key=releaseNoticeStorageKey(g,el.dataset.kind);dismissedReleaseNotices.add(key);try{localStorage.setItem(key,'1')}catch{}}render();return;}
 case 'toggle-release-watch':{const g=st.data.games.find(x=>x.id===el.dataset.id);if(!g||g.release_status!=='upcoming')return;
   if(myFav(g.id))await repo.setFavorite(g.id,false);else await repo.setPlayWish(g.id,!myPlayWish(g.id));
   await load();showToast(releaseWatched(g)?'Spiel vorgemerkt.':'Vormerkung aufgehoben.');return;}
 case 'refresh-release':await syncUpcoming(true);return;
 case 'open-game':st.gameId=el.dataset.id;st.screen='detail';st.menu=null;render();scrollTo(0,0);return;
 case 'open-profile':st.profileId=el.dataset.id;st.screen='profile';render();scrollTo(0,0);return;
 case 'set-view':st.viewMode=el.dataset.value==='compact'?'compact':'rich';render();return;
 case 'toggle-sort':st.menu=st.menu==='sort'?null:'sort';render();return;
 case 'sort':st.sort=el.dataset.value;st.desc=['steam','score','group','owners'].includes(st.sort);st.menu=null;render();return;
 case 'set-sort-direction':st.desc=el.dataset.value==='desc';st.menu=null;render();return;
 case 'steam-start':document.querySelector('[data-screen="settings"]')?.click();st.screen='settings';render();scrollTo(0,0);return;
 case 'task-done':await repo.finishTask(el.dataset.id);await load();showToast('Aufgabe als erledigt markiert.');return;
 case 'direction':st.desc=!st.desc;render();return;
 case 'toggle-filters':st.filtersOpen=!st.filtersOpen;st.menu=null;st.openedChoice=null;render();return;
 case 'toggle-choice':st.openedChoice=st.openedChoice===el.dataset.key?null:el.dataset.key;render();return;
 case 'set-filter':st.filters[el.dataset.key]=el.dataset.value;st.openedChoice=null;render();return;
 case 'set-match-mode':st.filters.matchModes[el.dataset.key]=el.dataset.mode==='all'?'all':'any';render();return;
 case 'toggle-multi':{const key=el.dataset.key,value=el.dataset.value;const sel=st.filters[key]||[];st.filters[key]=sel.includes(value)?sel.filter(x=>x!==value):[...sel,value];render();return;}
 case 'clear-multi':st.filters[el.dataset.key]=[];render();return;
 case 'reset-filters':st.filters={genres:[],mechanics:[],themes:[],modes:[],matchModes:{genres:'all',mechanics:'any',themes:'any',modes:'any'},owned:'',maxPrice:'',maxHardware:'',minScore:'',trio:false};st.openedChoice=null;render();return;
 case 'toggle-owner':st.menu=st.menu==='owner:'+el.dataset.user?null:'owner:'+el.dataset.user;render();return;
 case 'save-owner':{const v=el.dataset.value;await repo.setOwnership(st.gameId,el.dataset.user,v==='unknown'?'unknown':v==='no'?'no':'yes',v==='unknown'||v==='no'?[]:v.split(' + '));st.menu=null;await load();showToast('Besitzstand gespeichert.');return}
 case 'rate':if(!ratingAllowed(gameById()))throw Error('Bewertung erst bei veröffentlichtem Spiel und bestätigtem Besitz möglich.');await repo.setRating(st.gameId,Number(el.dataset.value));await load();return;
 case 'clear-rating':await repo.setRating(st.gameId,null);await load();return;
 case 'toggle-play-wish':{const id=el.dataset.id||st.gameId;const enable=!myPlayWish(id);await repo.setPlayWish(id,enable);await load();showToast(enable?'Spielwunsch gespeichert.':'Spielwunsch entfernt.');return;}
 case 'fav':{const enabled=!myFav(st.gameId);await repo.setFavorite(st.gameId,enabled);await load();showToast(enabled?'Must-play für nächste LAN gespeichert.':'Must-play entfernt.');return;}
 case 'fav-card':{const enabled=!myFav(el.dataset.id);await repo.setFavorite(el.dataset.id,enabled);await load();return;}
 case 'quick-filter':{const v=el.dataset.value;st.filters.modes=v==='coop'?['coop']:v==='team'?['team']:[];st.filters.trio=v==='trio';st.filters.owned=v==='owned'?'1':'';render();return;}
 case 'comment-type':st.commentCategory=el.dataset.value;render();return;
 case 'mode':document.querySelector('#mode-value').value=el.dataset.value;document.querySelectorAll('.mode-btn').forEach(x=>x.classList.toggle('selected',x===el));return;
 case 'steam-search':{const input=document.querySelector('#steam-search');const term=input?.value.trim()||'';if(term.length<2)throw Error('Bitte mindestens zwei Zeichen eingeben.');st.steamQuery=term;st.steamSearching=true;st.steamResults=[];st.steamError='';render();try{st.steamResults=await repo.searchSteam(term);if(!st.steamResults.length)st.steamError='Keine Steam-Treffer gefunden. Bitte alternativ manuell erfassen.';}catch(e){st.steamError='Steam-Suche nicht erreichbar: '+e.message;}st.steamSearching=false;render();return;}
 case 'steam-pick':{const id=Number(el.dataset.id);st.steamSearching=true;render();try{st.steamChoice=await repo.steamDetails(id);st.addGenres=[...(st.steamChoice.genreTags||[])];st.addClassification=suggestTaxonomy(st.steamChoice);st.steamError='';}catch(e){st.steamError='Details konnten nicht geladen werden: '+e.message;}st.steamSearching=false;render();return;}
 case 'steam-clear':st.steamChoice=null;st.steamResults=[];st.steamError='';st.steamQuery='';st.addGenres=[];st.addClassification=emptyClassification();render();return;
 case 'add-classification':{const key=el.dataset.key,tag=el.dataset.value;const current=st.addClassification[key]||[];st.addClassification[key]=current.includes(tag)?current.filter(x=>x!==tag):[...current,tag];el.classList.toggle('active',st.addClassification[key].includes(tag));el.setAttribute('aria-pressed',String(st.addClassification[key].includes(tag)));return;}
 case 'add-genre':{const tag=el.dataset.value;st.addGenres=st.addGenres.includes(tag)?st.addGenres.filter(x=>x!==tag):[...st.addGenres,tag];el.classList.toggle('active',st.addGenres.includes(tag));el.setAttribute('aria-pressed',String(st.addGenres.includes(tag)));return;}
 case 'account-tab':st.accountTab=el.dataset.value;render();return;
 case 'invite':{const token=await repo.createInvite();const url=new URL(location.href);url.searchParams.set('invite',token);const node=document.querySelector('#invite-result');if(node){node.innerHTML=`<p class="hint">Einladung nur an gewünschte Teilnehmer weitergeben:</p><div class="invite-box"><input readonly value="${esc(url.href)}"><button class="btn primary" data-action="copy-invite" data-invite="${esc(url.href)}">Kopieren</button></div>`;}return}
 case 'copy-invite':await navigator.clipboard.writeText(el.dataset.invite);showToast('Einladungslink kopiert.');return;
 case 'logout':await repo.logout();st.user=null;st.membership=null;st.data=null;st.screen='catalog';render();return;
 }}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();try{await execute(b.dataset.action,b)}catch(err){showToast(err.message)}});
document.addEventListener('load',e=>{const img=e.target;if(img instanceof HTMLImageElement&&img.classList.contains('cover-foreground')){const bg=img.parentElement?.querySelector('img.cover-background');if(bg)bg.src=img.currentSrc||img.src;}},true);
document.addEventListener('error',e=>{
 const img=e.target;if(!(img instanceof HTMLImageElement))return;
 if(img.classList.contains('cover-foreground')){
   const list=(img.dataset.fallbacks||'').split('|').filter(Boolean);
   const next=list.shift();
   if(next){img.dataset.fallbacks=list.join('|');img.src=next;return}
   img.remove();return;
 }
},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='steam-search'){e.preventDefault();execute('steam-search',e.target);return;}if((e.key==='Enter'||e.key===' ')&&['game-card','game-list-row'].some(c=>e.target.classList?.contains(c))){e.preventDefault();execute('open-game',e.target)}});
document.addEventListener('input',e=>{if(e.target.id==='steam-search'){st.steamQuery=e.target.value;return;}if(e.target.id==='wish-search'){st.wishSearch=e.target.value;const ev=(st.data.events||[]).find(x=>x.id===st.eventId)||st.data.events?.[0];const node=document.getElementById('wish-games');if(ev&&node)node.innerHTML=wishRows(ev.id);return;}if(e.target.id==='search'){st.search=e.target.value;const gs=displayGames();const cards=document.querySelector('#cards');if(cards)cards.innerHTML=gs.map(st.viewMode==='compact'?listRow:gameCard).join('')||'<div class="empty">Keine passenden Spiele. Filter anpassen oder zurücksetzen.</div>';const count=document.querySelector('#result-count');if(count)count.textContent=gs.length+(activeFilterCount(st.filters)>0?' Treffer':' Spiele')}});
document.addEventListener('change',e=>{if(e.target.dataset.filterCheck){st.filters[e.target.dataset.filterCheck]=e.target.checked;render()}});
document.addEventListener('submit',async e=>{const f=e.target;if(!['auth-form','join-form','game-form','comment-form','profile-form','avatar-form','hardware-form','event-form','option-form','classification-form','steam-library-form','assign-task-form'].includes(f.id)&&!f.classList.contains('release-date-form'))return;e.preventDefault();const d=Object.fromEntries(new FormData(f));try{
 if(f.id==='steam-library-form'){st.steamOwnershipMessage='Steam-Besitz wird abgefragt …';render();try{const result=await repo.importSteamLibrary(String(d.steamProfile||''));st.steamOwnershipMessage=`${result.updated} deiner Spiele bestätigt · ${result.libraryCount} Steam-Titel geprüft. Nicht gefundene Spiele bleiben unbekannt.`;await load();showToast('Steam-Bibliothek importiert.');}catch(e){st.steamOwnershipMessage=e.message;render();}return;}
 if(f.classList.contains('release-date-form')){
  const game=st.data.games.find(g=>g.id===f.dataset.game);
  if(!game||game.release_status!=='upcoming')throw Error('Spiel nicht mehr als angekündigt markiert.');
  const date=String(d.date||'').trim(),label=String(d.label||'').trim().slice(0,140);
  if(date&&releaseDay(date)===null)throw Error('Bitte ein gültiges genaues Datum wählen.');
  await repo.updateGameRelease(game.id,{release_date:date||null,release_label:label||'Termin noch unbekannt'});
  await load();showToast('Release-Termin gespeichert.');return;
 }
 if(f.id==='assign-task-form'){const taskType=String(d.taskType),labels={steam_library:'Steam-Bibliothek freigeben',hardware:'PC-Hardware eintragen',profile:'Profilbild ergänzen'};const title=taskType==='custom'?String(d.customTitle||'').trim():labels[taskType];if(title.length<3)throw Error('Bitte einen aussagekräftigen Aufgabentitel angeben.');await repo.assignTask(d.userId,taskType,title,String(d.note||'').trim());await load();showToast('Aufgabe zugewiesen.');return;}
 if(f.id==='classification-form'){const fd=new FormData(f),fields={category_genres:fd.getAll('genres').map(String),category_mechanics:fd.getAll('mechanics').map(String),category_themes:(st.data?.games.find(g=>g.id===f.dataset.game)?.category_themes||[])};await repo.updateGameClassification(f.dataset.game,fields);await load();showToast('Spiel-Kategorien gespeichert.');return;}
 if(f.id==='hardware-form'){
   await repo.setHardware({cpu_model:d.cpu.trim(),gpu_model:d.gpu.trim(),ram_gb:Number(d.ram),vram_gb:d.vram?Number(d.vram):null,resolution_width:Number(d.width),resolution_height:Number(d.height),target_fps:Number(d.fps),preset:d.preset});
   await load();showToast('Hardwareprofil gespeichert.');return;
 }
 if(f.id==='event-form'){
   const ev=await repo.createEvent(d.name.trim(),d.location.trim());st.eventId=ev.id;await load();showToast('LAN-Abstimmung erstellt.');return;
 }
 if(f.id==='option-form'){
   const ev=(st.data.events||[]).find(x=>x.id===st.eventId)||st.data.events?.[0];if(!ev)throw Error('Erstelle zuerst eine LAN.');
   const from=new Date(d.start),to=new Date(d.end);if(!Number.isFinite(+from)||!Number.isFinite(+to)||to<=from)throw Error('Bitte gültigen Beginn und ein späteres Ende angeben.');
   await repo.addDateOption(ev.id,from.toISOString(),to.toISOString());await load();showToast('Terminvorschlag gespeichert.');return;
 }
 if(f.id==='auth-form'){if(st.accountTab==='login'){await repo.signIn(d.email,d.password);st.user=repo.user;st.membership=await repo.groupForUser();await load();}else{const out=await repo.signup(d.email,d.password);if(out.access_token){repo.saveSession(out);st.user=repo.user;st.membership=await repo.groupForUser();await load()}else showToast('Konto erstellt. Bestätige zuerst deine E-Mail und melde dich an.')}return}
 if(f.id==='join-form'){if(d.invite){await repo.joinGroup(d.invite,d.name,d.initials);try{sessionStorage.removeItem('lan-invite')}catch{}st.invite='';}else{await repo.createGroup(d.groupName,d.name,d.initials)}await load();return}
 if(f.id==='game-form'){const raw=d.steam.trim();let appId=null;if(raw){let m=raw.match(/(?:\/app\/)?(\d{2,10})(?:\/|$)/);if(!m)throw Error('Bitte eine gültige Steam-App-ID oder einen Steam-Link eingeben.');appId=Number(m[1])}
 const isUpcoming=d.releaseStatus==='upcoming';const max=Number(d.maxPlayers),team=Number(d.teamPlayers);
 if(!isUpcoming&&(!d.mode||!d.confirmed))throw Error('Für erhältliche Spiele ist ein bestätigter Multiplayer-Modus nötig.');
 if(d.confirmed&&d.mode&&team>max)throw Error('Teamgröße darf nicht größer als die Gesamtspielerzahl sein.');
 const modes=d.confirmed&&d.mode?[{type:d.mode,maxHumans:max,sameTeamMax:team,minHumans:1,botsCanFill:!!d.bots,privateSession:!!d.privateSession}]:[];
 const date=String(d.releaseDate||'');if(date&&releaseDay(date)===null)throw Error('Bitte ein gültiges Release-Datum wählen.');
 const entry={release_status:isUpcoming?'upcoming':'available',release_date:isUpcoming&&date?date:null,release_label:isUpcoming?String(d.releaseLabel||'Termin noch offen').slice(0,140):null,title:d.title.trim(),steam_app_id:appId,genre:d.genre.trim()||null,genre_tags:[...st.addGenres],category_genres:[...st.addClassification.genres],category_mechanics:[...st.addClassification.mechanics],category_themes:[...st.addClassification.themes],cover_url:st.steamChoice?.cover||null,description:d.description.trim()||null,multiplayer_status:modes.length?'confirmed':'unknown',modes,price_eur:d.price!==''?Number(d.price):null,hardware_tier:d.hardware!==''?Number(d.hardware):null,steam_positive_percent:null,source_label:st.steamChoice?'Steam-Metadaten übernommen; Multiplayer manuell bestätigt':'Manuell durch Gruppenmitglied eingetragen'};
 if(st.data.games.some(x=>x.title.toLocaleLowerCase('de')===entry.title.toLocaleLowerCase('de')||appId&&x.steam_app_id===appId))throw Error('Dieses Spiel ist bereits im Katalog vorhanden.');if(!isUpcoming){const admit=checkCatalogAdmission({name:entry.title,catalogKind:'game',multiplayerStatus:'confirmed',modes});if(admit.status!=='accepted')throw Error(admit.reason);}const g=await repo.addGame(entry);await load();st.gameId=g.id;st.screen='detail';st.steamChoice=null;st.steamResults=[];st.steamQuery='';st.addGenres=[];st.addClassification=emptyClassification();render();scrollTo(0,0);showToast('Spiel zur Bibliothek hinzugefügt.');return}
 if(f.id==='comment-form'){const body=d.body.trim();if(!body)throw Error('Bitte zuerst Text eingeben.');await repo.addComment(st.gameId,st.commentCategory,body);await load();showToast('Kommentar gespeichert.');return}
 if(f.id==='profile-form'){await repo.updateProfile(d.displayName.trim(),d.initials.trim().toUpperCase());await load();showToast('Profil gespeichert.');return}
 if(f.id==='avatar-form'){const file=f.querySelector('input[type=file]').files?.[0];if(!file)throw Error('Bitte ein Bild auswählen.');if(file.size>8*1024*1024)throw Error('Bild zu groß. Maximal 8 MB.');const img=await createImageBitmap(file);const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');const side=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,256,256);img.close?.();const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.82));await repo.uploadAvatar(blob);st.avatarUrls={};await load();showToast('Profilbild gespeichert.');return}
 }catch(err){showToast(err.message)}});
async function init(){try{st.loading=true;render();if(DEMO){st.user=repo.user;st.membership=repo.membership;st.data=await repo.load();}else{st.user=await repo.restore();if(st.user){st.membership=await repo.groupForUser();if(st.membership){st.data=await repo.load();await loadAvatars();}}}st.loading=false;render();if(!DEMO){if(st.data?.role==='admin')setTimeout(()=>syncSteamReviews(false),1700);setTimeout(()=>syncUpcoming(false),2100);setInterval(()=>{if(!document.hidden&&st.data)syncUpcoming(false)},3600000);setInterval(async()=>{if(document.hidden||!st.user||!st.membership)return;try{const saved=st.screen;st.data=await repo.load();if(['catalog','upcoming','detail','members','profile','settings','calendar'].includes(saved)&&!document.querySelector('input:focus, textarea:focus'))render()}catch{}},15000)}}catch(err){st.loading=false;app.innerHTML=`<div class="auth-wrap"><div class="auth-card"><h2>Start fehlgeschlagen</h2><p>${esc(err.message)}</p><button class="btn" data-action="reload">Erneut versuchen</button></div></div>`}}
if('serviceWorker' in navigator&&['https:','http:'].includes(location.protocol)){
 let hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(hadController&&!document.querySelector('.update-notice')){
     const n=document.createElement('aside');n.className='update-notice';n.innerHTML='<span>Eine neue App-Version ist verfügbar.</span><button type="button">Jetzt aktualisieren</button>';
     n.querySelector('button').addEventListener('click',()=>location.reload());document.body.appendChild(n);
   }
   hadController=true;
 });
 navigator.serviceWorker.register('./sw.js').then(reg=>{
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{});});
 }).catch(()=>{});
}
init();
