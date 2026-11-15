/** LAN Library – LAN-Score v1.3. Nutzervorgaben, 15.11.2026. */
export const DEFAULT_WEIGHTS = Object.freeze({
  groupRating: 30,
  steamRating: 20,
  groupSuitability: 15,
  ownershipAndPrice: 20,
  playWishes: 15,
});
const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;

/** Katalogentscheidung, unabhaengig von der 3er-Eignung.
 * game.catalogKind = game | dlc | tool | software | soundtrack
 * game.multiplayerStatus = confirmed | none | unknown
 * game.modes[]: { type: coop_pve | team_pvp | versus | ffa | other_multi,
 *                 minHumans, maxHumans, sameTeamMax, botsCanFill,
 *                 privateSession }.
 */
export function checkCatalogAdmission(game) {
  if (!game || typeof game !== 'object') return {status:'needs_review', reason:'Keine Spieldaten'};
  if (game.catalogKind && game.catalogKind !== 'game') return {status:'excluded',reason:'Kein eigenständiges Spiel'};
  if (game.multiplayerStatus === 'none') return {status:'excluded', reason:'Ausschließlich Singleplayer'};
  if (game.multiplayerStatus !== 'confirmed' || !Array.isArray(game.modes) || !game.modes.length) {
    return {status:'needs_review',reason:'Multiplayer-Funktion nicht zuverlässig bestätigt'};
  }
  const max = Math.max(0,...game.modes.map(m => Number(m.maxHumans) || 0));
  if (max < 2) return {status:'needs_review',reason:'Mehrspielerzahl unklar'};
  return {status:'accepted',reason:max < 3?'Multiplayer vorhanden, höchstens zwei menschliche Spieler':'Multiplayer vorhanden'};
}

/** Eignung fuer eine private / gemeinsam gespielte Partie.
 * Kein hartes Ausschlusskriterium fuer die Bibliothek.
 */
export function groupFit(game, groupSize) {
  if (checkCatalogAdmission(game).status !== 'accepted') return {state:'unknown',score:null,explanation:'Spielmodus noch nicht geprüft'};
  const applicable = (game.modes || []).filter(m => Number(m.sameTeamMax ?? m.maxHumans) >= groupSize);
  if (!applicable.length) return {state:'too_few_slots',score:0,explanation:`Nicht alle ${groupSize} können im selben Team spielen`};
  const privateReady=applicable.some(m => m.privateSession === true && ((Number(m.minHumans)||0) <= groupSize || m.botsCanFill === true));
  if (privateReady) return {state:'private_group',score:1,explanation:'Gemeinsam ohne fremde Spieler möglich'};
  const canBeCompletedWithBots=applicable.some(m => m.botsCanFill === true);
  if (canBeCompletedWithBots) return {state:'bots_possible',score:.85,explanation:'Gemeinsam spielbar, zusätzliche Plätze durch Bots'};
  return {state:'public_group',score:.45,explanation:'Gemeinsam spielen, gegebenenfalls weitere menschliche Spieler nötig'};
}

/** Besitz: true|false|null/undefined, null -> UNBEKANNT, nicht false.
 * Preis in EUR als Momentaufnahme. Ein Preis von 0 ist kostenlos.
 * 'preisProKauf' ist der Preis fuer EINE zusaetzliche Lizenz.
 */
export function groupAcquisitionCost(game, memberIds) {
  const owners = game.ownership || {};
  const statuses = memberIds.map(id => owners[id] ?? null);
  if (statuses.some(s => typeof s !== 'boolean')) return {status:'unknown',total:null,missing:null};
  const missing=statuses.filter(s => !s).length;
  if (!missing) return {status:'known',total:0,missing:0};
  if (!Number.isFinite(game.priceEUR) || game.priceEUR < 0) return {status:'unknown',total:null,missing};
  return {status:'known',total:Math.round(missing*game.priceEUR*100)/100,missing};
}

const normalized = (value,max) => Number.isFinite(value) && value>=0 && value<=max ? value/max : null;
const ratingsFor = (game, memberIds) => memberIds.map(id=>game.memberRatings?.[id]).filter(n=>Number.isFinite(n)&&n>=1&&n<=10);

/**
 * Besitz + Preis: Bereits vorhandene Lizenzen zählen vollständig, fehlende Lizenzen
 * nach Erschwinglichkeit. Bei 30 EUR je fehlender Lizenz entspricht 0 EUR = 100%,
 * 15 EUR = 50%, ab 30 EUR = 0%. Der durch Besitz belegte Anteil bleibt erhalten.
 * Ergebnis für 3 Mitglieder: 3 Besitzer=100; 2 Besitzer/teuer=67; 1/teuer=33;
 * auch 0 Besitzer/kostenlos=100, weil keinerlei Kauf erforderlich ist.
 * Unbekannte Besitzstände werden nicht als "nein" gewertet. Falls das Spiel
 * kostenlos ist, ist die Gruppe jedoch unabhängig vom Besitz voll versorgt.
 */
export function ownershipAndPriceFactor(game,memberIds,{budgetPerMemberEUR=30,expectedGroupSize=3}={}){
  const price=game.priceEUR;
  if (price===0) return 1;
  const statuses=memberIds.map(id=>game.ownership?.[id]??null);
  // Members who have not joined yet must not be silently treated as owners.
  if (memberIds.length<expectedGroupSize || statuses.some(s=>typeof s!=='boolean'))return null;
  const owned=statuses.filter(Boolean).length;
  if (owned===memberIds.length) return 1;
  if (!Number.isFinite(price)||price<0)return null;
  const affordable=clamp(1-price/Math.max(1,budgetPerMemberEUR));
  return clamp((owned+(memberIds.length-owned)*affordable)/memberIds.length);
}

/**
 * Dauerhafte Spielewünsche: normal=1 Stimme, Herz/Must-play=2 Stimmen.
 * Pro Mitglied zählt höchstens die stärkste Auswahl. Die Bezugsgroesse ist
 * die Zielgruppe von drei Personen, auch wenn noch nicht alle eingeladen sind.
 */
export function wishFactor(game,memberIds,{expectedGroupSize=3}={}){
  if (!Array.isArray(game.playWishes)||!Array.isArray(game.mustPlays))return null;
  const hearts=new Set(game.mustPlays),normal=new Set(game.playWishes);
  const total=memberIds.reduce((sum,id)=>sum+(hearts.has(id)?2:normal.has(id)?1:0),0);
  return clamp(total/(2*Math.max(1,memberIds.length,expectedGroupSize)));
}

/**
 * Alle Faktoren summieren sich auf 100%. Unbekanntes wird nicht als 0 gewertet:
 * Die bekannten Faktoren werden proportional hochgerechnet; die Abdeckung
 * bleibt sichtbar. Hardware kann einen Warnhinweis auslösen, hat aber 0 Gewicht.
 */
export function calculateLanScore(game, {memberIds,memberHardware={},weights=DEFAULT_WEIGHTS,budgetPerMemberEUR=30,expectedGroupSize=3}={}) {
  if (!Array.isArray(memberIds)||!memberIds.length)throw new Error('memberIds erforderlich');
  const allWeight=Object.values(weights).reduce((a,b)=>a+b,0);
  if(allWeight<=0||Object.values(weights).some(w=>!Number.isFinite(w)||w<0))throw new Error('Gewichte ungueltig');
  const groupSize=Math.max(expectedGroupSize,memberIds.length);
  const ratings=ratingsFor(game,memberIds);
  const fit=groupFit(game,groupSize);
  const acquisition=groupAcquisitionCost(game,memberIds);
  const hardwareTier=game.hardwareTier;
  const hardwareWarnings=[];
  if(Number.isInteger(hardwareTier)&&hardwareTier>=1&&hardwareTier<=5){
    const atRisk=memberIds.filter(id=>Number.isInteger(memberHardware[id])&&memberHardware[id]>=1&&memberHardware[id]<=5&&memberHardware[id]<hardwareTier);
    if(atRisk.length)hardwareWarnings.push(`Hardware-Warnung: Bei ${atRisk.length} Mitglied${atRisk.length===1?'':'ern'} könnte das Spiel schlecht laufen`);
  }
  const factors={
    groupRating:ratings.length?mean(ratings)/10:null,
    steamRating:normalized(game.steamPositivePercent,100),
    groupSuitability:fit.score,
    ownershipAndPrice:ownershipAndPriceFactor(game,memberIds,{budgetPerMemberEUR,expectedGroupSize}),
    playWishes:wishFactor(game,memberIds,{expectedGroupSize}),
  };
  let numerator=0,knownWeight=0;
  for(const [key,weight] of Object.entries(weights)){
    const value=factors[key];
    if(value!=null){numerator+=value*weight;knownWeight+=weight;}
  }
  const coverage=knownWeight/allWeight;
  return {
    score:knownWeight>0?Math.round(numerator/knownWeight*100):null,
    provisional:coverage<.999||memberIds.length<expectedGroupSize,
    coveragePercent:Math.round(coverage*100),
    factors:Object.fromEntries(Object.entries(factors).map(([key,value])=>[key,{value:value==null?null:Math.round(value*100),weight:weights[key]??0,known:value!=null}])),
    warnings:[
      ...(memberIds.length<expectedGroupSize?[`Noch ${expectedGroupSize-memberIds.length} LAN-Mitglied${expectedGroupSize-memberIds.length===1?'':'er'} nicht beigetreten`]:[]),
      ...(factors.ownershipAndPrice===null?['Besitz oder Preis noch nicht vollständig bekannt']:[]),
      ...hardwareWarnings,
      ...(fit.state!=='private_group'?[fit.explanation]:[])
    ],
    acquisitionCostEUR:acquisition.total,
    groupFit:fit.state,
    hardwareWarnings,
  };
}

/** Harte Filter: Spieltitel-Suche + Zulassung zur Bibliothek.
 * Optionale Filter sind WEICH und liefern Volltreffer zuerst, danach Teiltreffer.
 * criteria[]: {label, check(game):boolean, describeMismatch(game):string}
 */
export function rankGames(games, {query='',criteria=[],secondarySort=null}={}) {
  const q=query.trim().toLocaleLowerCase('de-DE');
  return games.filter(g=>checkCatalogAdmission(g).status==='accepted' && g.name.toLocaleLowerCase('de-DE').includes(q))
  .map(g=>{
    const missing=criteria.filter(c=>!c.check(g)).map(c=>c.describeMismatch?.(g)||c.label);
    return {game:g,matched:criteria.length-missing.length,total:criteria.length,missing};
  }).sort((a,b)=>(b.matched-a.matched)||(secondarySort?secondarySort(a.game,b.game):a.game.name.localeCompare(b.game.name,'de-DE')));
}
