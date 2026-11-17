/* LAN Library Steam-Import-Fix 1.9.4a.
 * Incremental compatibility patch for app.mjs 1.9.4 until Github write access is restored.
 * No application data is sent to third parties beyond the existing Supabase Steam catalog API.
 */
(() => {
  'use strict';
  const PREFIX='Steam-Import-Korrektur 1.9.4a';
  let selectedId=null;
  let currentMode=null;
  let userChangedMode=false;
  let requestIndex=0;
  let scheduled=false;
  const infoCache=new Map();
  const app=document.querySelector('#app');
  if(!app)return;

  function state(){
    const form=document.getElementById('game-form');
    const selected=document.querySelector('.steam-selected');
    if(!form||!selected)return null;
    const id=Number(form.querySelector('[name="steam"]')?.value);
    if(!Number.isSafeInteger(id)||id<=0)return null;
    const note=selected.querySelector('strong')?.textContent||'';
    if(!note)return null;
    return {form,selected,id,supported:!!document.querySelector('.steam-mode-evidence.supported'),solo:!!document.querySelector('.steam-mode-evidence.solo')};
  }
  function classified(cats){
    const arr=Array.isArray(cats)?cats.map(x=>String(x||'').toLowerCase()):[];
    const matches=(pattern)=>arr.some(x=>pattern.test(x));
    if(matches(/(?:\bco[ -]?op\b|\bkoop\b|kooperativ|cooperative)/i))return 'coop_pve';
    if(matches(/(?:\bpvp\b|player versus player)/i))return 'other_multi';
    if(matches(/(?:multiplayer|multi.player|mehrspieler|mmo|versus|ffa|deathmatch|local.*together)/i))return 'other_multi';
    return null;
  }
  function setMode(form,mode){
    const input=form.querySelector('#mode-value');
    if(!input||!mode)return;
    let btn=form.querySelector('.game-modes [data-value="'+mode+'"]');
    if(!btn && mode==='other_multi'){
      const wrap=form.querySelector('.game-modes');
      if(wrap){
        btn=document.createElement('button');
        btn.type='button';btn.className='mode-btn';btn.dataset.action='mode';btn.dataset.value='other_multi';
        btn.textContent='Mehrspieler (Modus offen)';
        wrap.append(btn);
      }
    }
    input.value=mode;
    for(const el of form.querySelectorAll('.mode-btn'))el.classList.toggle('selected',el.dataset.value===mode);
  }
  function addHint(form,msg,positive){
    let tip=form.querySelector('#steam-auto-import-hint');
    if(!tip){
      tip=document.createElement('p');tip.id='steam-auto-import-hint';
      tip.style.cssText='border:1px solid rgba(53,204,198,.38);border-radius:12px;padding:12px 14px;margin:12px 0;line-height:1.45;font-size:.94em;';
      const label=form.querySelector('.tag-picker.game-modes');
      if(label)label.parentNode.insertBefore(tip,label);
      else form.prepend(tip);
    }
    if(tip.textContent!==msg)tip.textContent=msg;
    tip.style.borderColor=positive?'rgba(53,204,198,.38)':'rgba(230,176,89,.4)';
  }
  function adjust(){
    const buttons=app.querySelectorAll('.steam-result b');
    for(const b of buttons)if(b.textContent==='Übernehmen')b.textContent='Daten auswählen';
    const label=app.querySelector('[aria-label="Installierte App-Version"]');
    if(label&&!label.textContent.includes(PREFIX))label.textContent+=' · '+PREFIX;
    const view=state();
    if(!view){selectedId=null;currentMode=null;userChangedMode=false;return;}
    const {form,selected,id,supported,solo}=view;
    if(id!==selectedId){
      selectedId=id;currentMode=null;userChangedMode=false;
      const index=++requestIndex;
      if(supported)fetchCategories(id).then(mode=>{
        if(index!==requestIndex||selectedId!==id)return;
        // Don't override an explicit choice made by the user while metadata is loading.
        if(mode&&!userChangedMode){currentMode=mode;queueAdjust()}
      });
    }
    const desc=selected.querySelector('span');
    if(desc&&desc.textContent.includes('werden ins Formular übernommen'))desc.textContent='Steam-Daten ausgewählt – noch NICHT gespeichert. Unten auf „Zur gemeinsamen Bibliothek hinzufügen“ tippen.';
    const originalIntro=app.querySelector('.steam-import > p.hint');
    if(originalIntro&&originalIntro.textContent.includes('Multiplayer-Modus muss vor dem Speichern bestätigt werden'))originalIntro.textContent='Spiel suchen, Steam-Daten auswählen und unten speichern. Einen von Steam bestätigten Mehrspielermodus übernimmt die App automatisch.';
    const confirmed=form.querySelector('[name="confirmed"]');
    const confirmationRow=confirmed?.closest('label');
    const checkboxHasSteamEvidence=supported&&!solo;
    if(checkboxHasSteamEvidence){
      const choice=userChangedMode?(form.querySelector('#mode-value')?.value||currentMode):(currentMode||'other_multi');
      if(choice)setMode(form,choice);
      if(confirmed){confirmed.checked=true;}
      if(confirmationRow){confirmationRow.hidden=true;confirmationRow.style.display='none';}
      const label=choice==='coop_pve'?'Online-Koop':'Mehrspieler';
      addHint(form,'✓ Steam bestätigt '+label+'. Die Bestätigung wird automatisch übernommen. Die vorausgefüllten Spielerzahlen und privaten Lobbys sind nicht durch Steam verifiziert und können bei Bedarf angepasst werden.',true);
    }else{
      if(confirmationRow){confirmationRow.hidden=false;confirmationRow.style.display='';}
      addHint(form,solo?'Steam meldet keinen bestätigten Mehrspielermodus. Nur mit tatsächlich geprüftem Multiplayer-Mod manuell freigeben.':'Steam liefert keinen eindeutigen Mehrspieler-Nachweis. Bitte Modus auswählen und manuell bestätigen.',false);
    }
  }
  function queueAdjust(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;adjust()})}
  async function fetchCategories(id){
    if(infoCache.has(id))return infoCache.get(id);
    try{
      const config=window.LAN_CONFIG||{};
      const stored=JSON.parse(localStorage.getItem('lan-library-v1-session')||'null');
      if(!stored?.access_token||!config.supabaseUrl||!config.supabaseAnonKey)return null;
      const url=config.supabaseUrl.replace(/\/$/,'')+'/functions/v1/steam-catalog?'+new URLSearchParams({action:'details',id:String(id)});
      const res=await fetch(url,{headers:{apikey:config.supabaseAnonKey,Authorization:'Bearer '+stored.access_token},cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!res.ok)return null;
      const result=await res.json();
      if(Number(result?.id)!==id)return null;
      const mode=classified(result.steamCategories);
      if(mode)infoCache.set(id,mode);
      return mode;
    }catch{return null}
  }
  app.addEventListener('click',evt=>{
    const btn=evt.target.closest?.('.game-modes [data-action="mode"]');
    if(btn&&state()){
      userChangedMode=true;currentMode=btn.dataset.value;
    }
  },true);
  document.addEventListener('submit',evt=>{
    const form=evt.target;
    if(form?.id!=='game-form')return;
    const view=state();
    if(!view||!view.supported||view.solo)return;
    // In a Steam-certified multiplayer game no manual checkbox is required.
    const checkbox=form.querySelector('[name="confirmed"]');
    if(checkbox)checkbox.checked=true;
    if(!form.querySelector('#mode-value')?.value)setMode(form,currentMode||'other_multi');
  },true);
  app.addEventListener('click',evt=>{
    if(evt.target.closest?.('[data-action="steam-clear"]')){
      requestIndex++;selectedId=null;currentMode=null;userChangedMode=false;
    }
  },true);
  const observer=new MutationObserver(queueAdjust);
  observer.observe(app,{childList:true,subtree:true});
  queueAdjust();
})();
