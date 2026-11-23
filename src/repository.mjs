/* LAN Library MVP — cloud adapter using Supabase HTTP APIs.
 * No service_role key, no secrets; publishable/anon project key only.
 * Group/member/ownership security is enforced by SQL RLS, never by UI alone.
 */
const SESSION_KEY='lan-library-v1-session';
const API_TIMEOUT_MS=18000;
function ensure(ok,msg){if(!ok)throw new Error(msg)}

export class CloudRepository {
  constructor({supabaseUrl,supabaseAnonKey}){
    ensure(/^https:\/\//.test(supabaseUrl)||/^http:\/\/localhost(?::\d+)?$/.test(supabaseUrl),'Ungültige Supabase-URL');
    ensure(typeof supabaseAnonKey==='string'&&supabaseAnonKey.length>8,'Supabase Publishable-/Anon-Key fehlt');
    this.url=supabaseUrl.replace(/\/$/,'');this.key=supabaseAnonKey;
    try{this.session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{this.session=null}
    this.avatarCache=new Map();this.membership=null;
  }
  get user(){return this.session?.user||null}
  async request(path,{method='GET',body,headers={},auth=true,retry=true,raw=false,timeout=API_TIMEOUT_MS}={}){
    const h={'apikey':this.key,...headers};
    if(auth)h.Authorization=`Bearer ${this.session?.access_token||this.key}`;
    if(body!==undefined && !(body instanceof Blob) && !(body instanceof FormData))h['Content-Type']='application/json';
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
    let res;
    try{res=await fetch(this.url+path,{method,headers:h,body:body===undefined?undefined:body instanceof Blob||body instanceof FormData?body:JSON.stringify(body),signal:ctrl.signal,cache:'no-store'});}catch(e){throw new Error(e.name==='AbortError'?'Netzwerkanfrage abgelaufen. Verbindung prüfen.':'Verbindung fehlgeschlagen: '+e.message)}finally{clearTimeout(timer)}
    if(res.status===401 && retry && auth && this.session?.refresh_token && !path.includes('/token?')){
      await this.refreshSession();return this.request(path,{method,body,headers,auth,retry:false,raw,timeout});
    }
    if(!res.ok){let txt=await res.text();try{const j=JSON.parse(txt);txt=j.message||j.msg||j.error_description||j.error||j.details||txt}catch{}throw new Error(`${txt||res.statusText} (${res.status})`)}
    if(raw)return res;
    const t=await res.text();if(!t)return null;
    try{return JSON.parse(t)}catch{return t}
  }
  saveSession(data){this.session=data;localStorage.setItem(SESSION_KEY,JSON.stringify(data))}
  async signup(email,password){return this.request('/auth/v1/signup',{method:'POST',auth:false,body:{email,password}})}
  async signIn(email,password){const s=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}});ensure(s.access_token&&s.user,'Anmeldung fehlgeschlagen');this.saveSession(s);return s}
  async refreshSession(){const refresh_token=this.session?.refresh_token;ensure(refresh_token,'Bitte erneut anmelden');
    const s=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,retry:false,body:{refresh_token}});this.saveSession(s);return s;
  }
  async restore(){if(!this.session?.access_token)return null;
    try{
      if(Date.now()/1000>(this.session.expires_at||0)-60) await this.refreshSession();
      const u=await this.request('/auth/v1/user');
      this.session.user=u;this.saveSession(this.session);return u;
    }catch(error){
      // Invalid credentials require login, but an offline request, timeout or
      // temporary Supabase outage must NOT silently erase the stored session.
      const reason=String(error?.message||error);
      const invalid=/\((?:400|401)\)\s*$/.test(reason)||/invalid[_ -]?grant|refresh token not found|invalid refresh token/i.test(reason);
      if(invalid){this.session=null;localStorage.removeItem(SESSION_KEY);return null;}
      throw error;
    }
  }
  async logout(){try{await this.request('/auth/v1/logout',{method:'POST'})}catch{}this.session=null;this.membership=null;localStorage.removeItem(SESSION_KEY);this.avatarCache.forEach(v=>URL.revokeObjectURL(v));this.avatarCache.clear()}
  async rest(table,params='',opts={}){return this.request('/rest/v1/'+table+(params?'?'+params:''),opts)}
  async rpc(name,args){return this.request('/rest/v1/rpc/'+name,{method:'POST',body:args})}
  async groupForUser(){ensure(this.user,'Nicht angemeldet');const a=await this.rest('group_members','select=group_id,role,groups(id,name)&user_id=eq.'+this.user.id);this.membership=a?.[0]||null;return this.membership}
  async createGroup(groupName,displayName,initials){const id=await this.rpc('create_lan_group',{p_group_name:groupName,p_name:displayName,p_initials:initials});await this.groupForUser();return id}
  async joinGroup(token,displayName,initials){const id=await this.rpc('join_lan_group',{p_invite:token,p_name:displayName,p_initials:initials});await this.groupForUser();return id}
  async createInvite(){ensure(this.membership?.role==='admin','Adminrechte erforderlich');return this.rpc('create_lan_invite',{p_group_id:this.membership.group_id})}
  async load(){if(!this.membership)await this.groupForUser();if(!this.membership)return null;const groupId=this.membership.group_id;
    const [members,games,ownership,ratings,favorites,playWishes,notes,hardware,events,dateOptions,dateVotes,attendance,wishes,selections,candidates,tasks]=await Promise.all([
      this.rest('group_members','select=group_id,user_id,role,joined_at&group_id=eq.'+groupId),
      this.rest('games','select=*&group_id=eq.'+groupId+'&order=title.asc'),
      this.rest('game_ownership','select=*&limit=5000'),this.rest('game_ratings','select=*&limit=5000'),
      this.rest('game_favorites','select=*&limit=5000'),this.rest('game_play_wishes','select=game_id,user_id,created_at&limit=5000'),this.rest('game_comments','select=*&order=created_at.desc&limit=1000'),
      this.rest('member_hardware','select=*&group_id=eq.'+groupId),
      this.rest('lan_events','select=*&group_id=eq.'+groupId+'&order=created_at.desc'),
      this.rest('lan_date_options','select=*&limit=1000'),
      this.rest('lan_date_votes','select=*&limit=2000'),
      this.rest('lan_attendance','select=*&limit=1000'),
      this.rest('lan_game_wishes','select=*&limit=3000'),
      this.rest('lan_game_selections','select=*&limit=1000'),
      this.rest('catalog_candidates','select=original_title,review_note,review_status&group_id=eq.'+groupId+'&review_status=eq.needs_review&order=source_position.asc'),
      this.rest('member_tasks','select=*&group_id=eq.'+groupId+'&order=created_at.desc&limit=100')
    ]);
    const ids=members.map(m=>m.user_id).join(',');const profiles=ids?await this.rest('profiles','select=user_id,display_name,initials,avatar_path,steam_id,steam_synced_at&user_id=in.('+ids+')'):[];
    return {groupId,groupName:this.membership.groups?.name||'LAN Library',role:this.membership.role,userId:this.user.id,members,profiles,games,ownership,ratings,favorites,playWishes,notes,hardware,events,dateOptions,dateVotes,attendance,wishes,selections,candidates,tasks};
  }
  async syncSteamReviews(){
    ensure(this.membership?.role==='admin','Adminrechte erforderlich');
    const qs='?'+new URLSearchParams({group:this.membership.group_id});
    const responses=await Promise.allSettled([
      this.request('/functions/v1/steam-reviews'+qs,{timeout:60000}),
      this.request('/functions/v1/steam-prices'+qs,{timeout:60000})
    ]);
    const errors=responses.filter(x=>x.status==='rejected').map(x=>String(x.reason?.message||x.reason));
    if(responses.every(x=>x.status==='rejected'))throw new Error('Steam-Abgleich fehlgeschlagen: '+errors.join('; '));
    const merged=new Map(),failed=[];let processed=0,remainingPossible=false;
    for(const r of responses){
      if(r.status!=='fulfilled')continue;
      const x=r.value||{};
      processed=Math.max(processed,Number(x.processed||0));
      remainingPossible=remainingPossible||!!x.remainingPossible;
      failed.push(...(x.failed||[]));
      for(const entry of x.updated||[]){merged.set(entry.id,{...(merged.get(entry.id)||{}),...entry});}
    }
    for(const error of errors)failed.push({id:'service',error});
    return {updated:[...merged.values()],failed,processed,remainingPossible};
  }
  async syncReleaseRadar(manual=false){
    ensure(this.user&&this.membership,'Bitte zuerst anmelden');
    if(manual)ensure(this.membership.role==='admin','Manuelles Release-Update nur für Admins');
    return this.request('/functions/v1/steam-releases'+(manual?'?force=1':''),{timeout:85000});
  }
  async updateGameRelease(gameId,fields){
    ensure(this.membership?.role==='admin','Nur Admins können Termine ändern');
    const body={release_date:fields.release_date||null,release_label:String(fields.release_label||'Termin offen').slice(0,140)};
    return this.rest('games',`id=eq.${gameId}&group_id=eq.${this.membership.group_id}&release_status=eq.upcoming`,{method:'PATCH',headers:{Prefer:'return=representation'},body});
  }
  async importSteamLibrary(steamProfile){
    ensure(this.user&&this.membership,'Bitte zuerst anmelden');
    return this.request('/functions/v1/steam-owned',{method:'POST',body:{steamProfile},timeout:90000});
  }
  async assignTask(targetId,taskType,title,note=''){
    ensure(this.membership?.role==='admin','Nur Admins können Aufgaben zuweisen');
    ensure(['steam_library','hardware','profile','custom'].includes(taskType),'Ungültiger Aufgabentyp');
    const body={group_id:this.membership.group_id,assigned_to:targetId,created_by:this.user.id,task_type:taskType,title,note:note||null};
    return this.rest('member_tasks','',{method:'POST',headers:{Prefer:'return=representation'},body});
  }
  async finishTask(taskId){
    ensure(this.user,'Bitte anmelden');
    return this.rest('member_tasks','id=eq.'+encodeURIComponent(taskId)+'&assigned_to=eq.'+this.user.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'done',completed_at:new Date().toISOString()}});
  }
  async searchSteam(query){const term=String(query||'').trim().slice(0,100);ensure(term.length>=2,'Suchbegriff zu kurz');return this.request('/functions/v1/steam-catalog?'+new URLSearchParams({action:'search',q:term}));}
  async steamDetails(appId){ensure(Number.isInteger(+appId)&&+appId>0,'Ungültige Steam-App-ID');return this.request('/functions/v1/steam-catalog?'+new URLSearchParams({action:'details',id:String(appId)}));}
  async addGame(g){const record={...g,group_id:this.membership.group_id,created_by:this.user.id};
    const a=await this.rest('games','select=*',{method:'POST',headers:{Prefer:'return=representation'},body:record});return a[0];
  }
  async setGameArchived(gameId,archived){
    ensure(this.membership?.role==='admin','Nur Administratoren können Spiele archivieren.');
    return this.rest('games',`id=eq.${gameId}&group_id=eq.${this.membership.group_id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{archived_at:archived?new Date().toISOString():null,archived_by:archived?this.user.id:null}});
  }
  async updateGameClassification(gameId,fields){ensure(this.membership?.role==='admin','Nur Admins können Kategorien bearbeiten');return this.rest('games',`id=eq.${gameId}&group_id=eq.${this.membership.group_id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:fields})}
   async updateGameMetadata(gameId,fields){
     ensure(this.membership?.role==='admin','Nur Admins können Spieldaten bearbeiten');
     const allowed=['title','steam_app_id','description','genre','hardware_tier','hardware_tier_source','hardware_tier_checked_at','reference_url','release_status','release_label','modes','multiplayer_status'];
     const body=Object.fromEntries(Object.entries(fields).filter(([key])=>allowed.includes(key)));
     return this.rest('games',`id=eq.${gameId}&group_id=eq.${this.membership.group_id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body});
   }
  async setOwnership(gameId,targetId,status,launchers=[]){return this.rest('game_ownership','on_conflict=game_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{game_id:gameId,user_id:targetId,status,launchers:status==='yes'?launchers:[],source:'manual',changed_by:this.user.id}})}
  async setRating(gameId,rating){if(rating==null)return this.rest('game_ratings',`game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    return this.rest('game_ratings','on_conflict=game_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{game_id:gameId,user_id:this.user.id,rating}})
  }
  // Herz = doppelt gewichtetes Must-play für die nächste LAN.
  // Es ist nur eine der beiden Stufen aktiv; bei Updates wird die andere gelöscht.
  async setFavorite(gameId,enabled){
    if(!enabled)return this.rest('game_favorites',`game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    await this.rest('game_play_wishes',`game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    return this.rest('game_favorites','on_conflict=game_id,user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{game_id:gameId,user_id:this.user.id}});
  }
  async setPlayWish(gameId,enabled){
    if(!enabled)return this.rest('game_play_wishes',`game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    await this.rest('game_favorites',`game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    return this.rest('game_play_wishes','on_conflict=game_id,user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{game_id:gameId,user_id:this.user.id}});
  }
  async addComment(gameId,category,body){return this.rest('game_comments','',{method:'POST',headers:{Prefer:'return=representation'},body:{game_id:gameId,user_id:this.user.id,category,body}})}
  async updateProfile(display_name,initials){return this.rest('profiles',`user_id=eq.${this.user.id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:{display_name,initials}})}
  async setHardware(fields){
    ensure(this.membership?.group_id,'Keine Gruppe zugeordnet');
    const body={...fields,user_id:this.user.id,group_id:this.membership.group_id};
    return this.rest('member_hardware','on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body});
  }
  async createEvent(name,locationNote){
    const rows=await this.rest('lan_events','',{method:'POST',headers:{Prefer:'return=representation'},body:{group_id:this.membership.group_id,created_by:this.user.id,name,location_note:locationNote||null,status:'polling'}});
    return rows[0];
  }
  async addDateOption(eventId,startIso,endIso){
    return this.rest('lan_date_options','',{method:'POST',headers:{Prefer:'return=representation'},body:{event_id:eventId,proposed_by:this.user.id,starts_at:startIso,ends_at:endIso}});
  }
  async setDateVote(optionId,response){return this.rest('lan_date_votes','on_conflict=option_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{option_id:optionId,user_id:this.user.id,response}})}
  async setAttendance(eventId,response){return this.rest('lan_attendance','on_conflict=event_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:{event_id:eventId,user_id:this.user.id,response}})}
  async setWish(eventId,gameId,enabled){
    if(!enabled)return this.rest('lan_game_wishes',`event_id=eq.${eventId}&game_id=eq.${gameId}&user_id=eq.${this.user.id}`,{method:'DELETE'});
    return this.rest('lan_game_wishes','on_conflict=event_id,game_id,user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{event_id:eventId,game_id:gameId,user_id:this.user.id}});
  }
  async confirmEvent(eventId,option){ensure(this.membership?.role==='admin','Nur der Admin kann Termine bestätigen');
    return this.rest('lan_events',`id=eq.${eventId}`,{method:'PATCH',body:{status:'confirmed',starts_at:option.starts_at,ends_at:option.ends_at}});
  }
  async setSelection(eventId,gameId,enabled){ensure(this.membership?.role==='admin','Nur der Admin kann Spiele festlegen');
    if(!enabled)return this.rest('lan_game_selections',`event_id=eq.${eventId}&game_id=eq.${gameId}`,{method:'DELETE'});
    return this.rest('lan_game_selections','on_conflict=event_id,game_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:{event_id:eventId,game_id:gameId,selected_by:this.user.id}});
  }
  async uploadAvatar(blob){const path=this.user.id+'/avatar.jpg';await this.request('/storage/v1/object/lan-avatars/'+path,{method:'POST',body:blob,headers:{'Content-Type':'image/jpeg','x-upsert':'true'}});
    await this.rest('profiles',`user_id=eq.${this.user.id}`,{method:'PATCH',body:{avatar_path:path}});
    const old=this.avatarCache.get(path);if(old)URL.revokeObjectURL(old);this.avatarCache.delete(path);return path;
  }
  async avatarUrl(path){if(!path)return null;if(this.avatarCache.has(path))return this.avatarCache.get(path);
    try{const res=await this.request('/storage/v1/object/authenticated/lan-avatars/'+path,{raw:true});const obj=URL.createObjectURL(await res.blob());this.avatarCache.set(path,obj);return obj}catch{return null}
  }
}
