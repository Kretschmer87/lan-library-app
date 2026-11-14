/* Local-only DEMO. No fabricated personal ratings, Steam review scores or MK ownership. */
const KEY='lan-library-mvp-demo-v1';
const demoId=()=>('d-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const create=()=>({groupName:'LAN Library · Demo',role:'admin',userId:'a',members:[{user_id:'a',role:'admin'},{user_id:'b',role:'member'},{user_id:'c',role:'member'}],profiles:[{user_id:'a',display_name:'Spieler A (Demo)',initials:'A',avatar_path:null},{user_id:'b',display_name:'Spieler B (Demo)',initials:'B',avatar_path:null},{user_id:'c',display_name:'Spieler C (Demo)',initials:'C',avatar_path:null}],games:[
  {id:'demo-cs',title:'Counter-Strike: Source',steam_app_id:240,genre:'FPS · Team-PvP',multiplayer_status:'confirmed',modes:[{type:'team_pvp',maxHumans:16,sameTeamMax:8,minHumans:2,botsCanFill:true,privateSession:true}],source_label:'Beispiel – Koop/Bots manuell prüfen',created_by:'a',created_at:'2026-11-14',price_eur:null,steam_positive_percent:null,hardware_tier:1},
  {id:'demo-pubg',title:'PUBG: BATTLEGROUNDS',steam_app_id:578080,genre:'Battle Royale · Squad',multiplayer_status:'confirmed',modes:[{type:'team_pvp',maxHumans:100,sameTeamMax:4,minHumans:1,botsCanFill:false,privateSession:false}],source_label:'Beispiel – Spielmodi prüfen',created_by:'a',created_at:'2026-11-14',price_eur:0,steam_positive_percent:null,hardware_tier:3},
  {id:'demo-rocket',title:'Rocket League',steam_app_id:252950,genre:'Sport · Team-PvP',multiplayer_status:'confirmed',modes:[{type:'team_pvp',maxHumans:8,sameTeamMax:4,minHumans:1,botsCanFill:true,privateSession:true}],source_label:'Beispiel – Spielmodi prüfen',created_by:'a',created_at:'2026-11-14',price_eur:0,steam_positive_percent:null,hardware_tier:2},
  {id:'demo-kf',title:'Killing Floor 2',steam_app_id:232090,genre:'FPS · Horde-Koop',multiplayer_status:'confirmed',modes:[{type:'coop_pve',maxHumans:6,sameTeamMax:6,minHumans:1,botsCanFill:false,privateSession:true}],source_label:'Beispiel – Spielmodi prüfen',created_by:'a',created_at:'2026-11-14',price_eur:null,steam_positive_percent:null,hardware_tier:2},
  {id:'demo-sat',title:'Satisfactory',steam_app_id:526870,genre:'Aufbau · Koop',multiplayer_status:'confirmed',modes:[{type:'coop_pve',maxHumans:4,sameTeamMax:4,minHumans:1,botsCanFill:false,privateSession:true}],source_label:'Nutzer-Kandidatenliste · Spieldaten prüfen',created_by:'a',created_at:'2026-11-14',price_eur:null,steam_positive_percent:null,hardware_tier:3},
  {id:'demo-duo',title:'Orcs Must Die! 3',steam_app_id:1522820,genre:'Tower Defense · Koop',multiplayer_status:'confirmed',modes:[{type:'coop_pve',maxHumans:2,sameTeamMax:2,minHumans:1,botsCanFill:false,privateSession:true}],source_label:'Beispiel für 2er-Koop',created_by:'a',created_at:'2026-11-14',price_eur:null,steam_positive_percent:null,hardware_tier:3}
 ],ownership:[...['demo-cs','demo-pubg','demo-rocket','demo-kf'].flatMap(id=>[{game_id:id,user_id:'b',status:'yes',launchers:['Steam']},{game_id:id,user_id:'c',status:'yes',launchers:['Steam']}])],ratings:[],favorites:[],notes:[],hardware:[],events:[],dateOptions:[],dateVotes:[],attendance:[],wishes:[],selections:[]});
let data;try{data=JSON.parse(localStorage.getItem(KEY))||create()}catch{data=create()}
export class DemoRepository{
 get user(){return {id:data.userId}}
 async restore(){return this.user}
 async groupForUser(){return {role:'admin',group_id:'demo',groups:{name:'LAN Library · Demo'}}}
 get membership(){return {role:'admin',group_id:'demo',groups:{name:data.groupName}}}
 async load(){for(const k of ['hardware','events','dateOptions','dateVotes','attendance','wishes','selections']) data[k] ||= []; return structuredClone(data)}
 save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{ /* private/opaque origin: changes last until tab closes */ }}
 async searchSteam(query){const q=String(query).toLowerCase();return data.games.filter(g=>g.title.toLowerCase().includes(q)&&g.steam_app_id).slice(0,8).map(g=>({id:g.steam_app_id,name:g.title,image:`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.steam_app_id}/header.jpg`,priceEUR:g.price_eur}));}
 async steamDetails(id){const g=data.games.find(x=>x.steam_app_id===Number(id));if(!g)throw Error('Nicht im Demo-Katalog enthalten.');return {id:g.steam_app_id,name:g.title,genre:g.genre||'',genreTags:g.genre_tags||[],description:g.description||'',priceEUR:g.price_eur,cover:`https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.steam_app_id}/header.jpg`};}
 async addGame(g){if((g.steam_app_id&&data.games.some(x=>x.steam_app_id===g.steam_app_id))||data.games.some(x=>x.title.trim().toLowerCase()===g.title.trim().toLowerCase()))throw Error('Dieses Spiel ist bereits im Katalog vorhanden.');let record={...g,id:demoId(),created_by:'a',created_at:new Date().toISOString()};data.games.push(record);this.save();return record}
 async setOwnership(gameId,targetId,status,launchers=[]){data.ownership=data.ownership.filter(o=>!(o.game_id===gameId&&o.user_id===targetId));data.ownership.push({game_id:gameId,user_id:targetId,status,launchers});this.save()}
 async setRating(gameId,rating){data.ratings=data.ratings.filter(o=>!(o.game_id===gameId&&o.user_id==='a'));if(rating)data.ratings.push({game_id:gameId,user_id:'a',rating});this.save()}
 async setFavorite(gameId,enabled){data.favorites=data.favorites.filter(o=>!(o.game_id===gameId&&o.user_id==='a'));if(enabled)data.favorites.push({game_id:gameId,user_id:'a'});this.save()}
 async addComment(gameId,category,body){data.notes.unshift({id:demoId(),game_id:gameId,user_id:'a',category,body,created_at:new Date().toISOString()});this.save()}
 async updateProfile(display_name,initials){Object.assign(data.profiles[0],{display_name,initials});this.save()}
 async createInvite(){throw Error('Einladungen funktionieren erst nach Supabase-Einrichtung.')}
 async uploadAvatar(blob){const file=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});data.profiles[0].avatar_path=file;this.save();return file}
 async avatarUrl(path){return path?.startsWith('data:')?path:null}
 async setHardware(fields){data.hardware=data.hardware.filter(x=>x.user_id!=='a');data.hardware.push({...fields,user_id:'a',group_id:'demo'});this.save()}
 async createEvent(name,location_note){const e={id:demoId(),group_id:'demo',name,location_note,status:'polling',created_by:'a',created_at:new Date().toISOString(),starts_at:null,ends_at:null};data.events.unshift(e);this.save();return e}
 async addDateOption(event_id,starts_at,ends_at){const x={id:demoId(),event_id,starts_at,ends_at,proposed_by:'a'};data.dateOptions.push(x);this.save();return [x]}
 async setDateVote(option_id,response){data.dateVotes=data.dateVotes.filter(x=>!(x.option_id===option_id&&x.user_id==='a'));data.dateVotes.push({option_id,user_id:'a',response});this.save()}
 async setAttendance(event_id,response){data.attendance=data.attendance.filter(x=>!(x.event_id===event_id&&x.user_id==='a'));data.attendance.push({event_id,user_id:'a',response});this.save()}
 async setWish(event_id,game_id,enabled){data.wishes=data.wishes.filter(x=>!(x.event_id===event_id&&x.game_id===game_id&&x.user_id==='a'));if(enabled)data.wishes.push({event_id,game_id,user_id:'a'});this.save()}
 async confirmEvent(id,o){Object.assign(data.events.find(e=>e.id===id),{status:'confirmed',starts_at:o.starts_at,ends_at:o.ends_at});this.save()}
 async setSelection(event_id,game_id,enabled){data.selections=data.selections.filter(x=>!(x.event_id===event_id&&x.game_id===game_id));if(enabled)data.selections.push({event_id,game_id,selected_by:'a'});this.save()}
 async logout(){}
}
