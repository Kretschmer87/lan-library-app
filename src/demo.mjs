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
 ],ownership:[...['demo-cs','demo-pubg','demo-rocket','demo-kf'].flatMap(id=>[{game_id:id,user_id:'b',status:'yes',launchers:['Steam']},{game_id:id,user_id:'c',status:'yes',launchers:['Steam']}])],ratings:[],favorites:[],notes:[]});
let data;try{data=JSON.parse(localStorage.getItem(KEY))||create()}catch{data=create()}
export class DemoRepository{
 get user(){return {id:data.userId}}
 async restore(){return this.user}
 async groupForUser(){return {role:'admin',group_id:'demo',groups:{name:'LAN Library · Demo'}}}
 get membership(){return {role:'admin',group_id:'demo',groups:{name:data.groupName}}}
 async load(){return structuredClone(data)}
 save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{ /* private/opaque origin: changes last until tab closes */ }}
 async addGame(g){if((g.steam_app_id&&data.games.some(x=>x.steam_app_id===g.steam_app_id))||data.games.some(x=>x.title.trim().toLowerCase()===g.title.trim().toLowerCase()))throw Error('Dieses Spiel ist bereits im Katalog vorhanden.');let record={...g,id:demoId(),created_by:'a',created_at:new Date().toISOString()};data.games.push(record);this.save();return record}
 async setOwnership(gameId,targetId,status,launchers=[]){data.ownership=data.ownership.filter(o=>!(o.game_id===gameId&&o.user_id===targetId));data.ownership.push({game_id:gameId,user_id:targetId,status,launchers});this.save()}
 async setRating(gameId,rating){data.ratings=data.ratings.filter(o=>!(o.game_id===gameId&&o.user_id==='a'));if(rating)data.ratings.push({game_id:gameId,user_id:'a',rating});this.save()}
 async setFavorite(gameId,enabled){data.favorites=data.favorites.filter(o=>!(o.game_id===gameId&&o.user_id==='a'));if(enabled)data.favorites.push({game_id:gameId,user_id:'a'});this.save()}
 async addComment(gameId,category,body){data.notes.unshift({id:demoId(),game_id:gameId,user_id:'a',category,body,created_at:new Date().toISOString()});this.save()}
 async updateProfile(display_name,initials){Object.assign(data.profiles[0],{display_name,initials});this.save()}
 async createInvite(){throw Error('Einladungen funktionieren erst nach Supabase-Einrichtung.')}
 async uploadAvatar(blob){const file=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});data.profiles[0].avatar_path=file;this.save();return file}
 async avatarUrl(path){return path?.startsWith('data:')?path:null}
 async logout(){}
}
