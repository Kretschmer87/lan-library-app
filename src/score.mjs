/**
 * LAN Library - testbarer, datenunabhaengiger Funktionenkern (Vorschlag 0.1).
 * Alle Gewichte / Schwellenwerte sind vorlaeufig, nicht final freigegeben.
 * Keine Steam-Daten oder personenbezogenen Daten in diesem Modul.
 */
export const DEFAULT_WEIGHTS = Object.freeze({
  groupRating: 22,
  steamRating: 8,
  acquisitionCost: 25,
  groupSuitability: 20,
  hardwareCompatibility: 15,
  currentEventWishes: 10,
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

/** Score-Ergebnis umfasst immer Transparenz/Abdeckung, keine erfundene 0 fuer unbekannte Werte.
 * score=null falls alle Faktoren fehlen. score != Qualitaetsgarantie.
 */
export function calculateLanScore(game, {memberIds, memberHardware={},eventId=null,weights=DEFAULT_WEIGHTS,budgetPerMemberEUR=30}={}) {
  if (!Array.isArray(memberIds) || memberIds.length===0) throw new Error('memberIds erforderlich');
  const allWeight=Object.values(weights).reduce((a,b)=>a+b,0);
  if (allWeight<=0 || Object.values(weights).some(w=>!Number.isFinite(w)||w<0)) throw new Error('Gewichte ungueltig');
  const ratings=ratingsFor(game,memberIds);
  const cost=groupAcquisitionCost(game,memberIds);
  const fit=groupFit(game,memberIds.length);
  const hardwareTier=game.hardwareTier;
  const allHwKnown=Number.isInteger(hardwareTier) && hardwareTier>=1 && hardwareTier<=5 && memberIds.every(id=>Number.isInteger(memberHardware[id])&&memberHardware[id]>=1&&memberHardware[id]<=5);
  const hwScore=allHwKnown ? clamp(1 - Math.max(0,hardwareTier-Math.min(...memberIds.map(id=>memberHardware[id])))*.5) : null;
  const wishesKnown=eventId!=null && game.eventWishes && Array.isArray(game.eventWishes[eventId]);
  const wished=wishesKnown?game.eventWishes[eventId].filter(id=>memberIds.includes(id)).length:0;
  const factors={
    groupRating: ratings.length?mean(ratings)/10:null,
    steamRating:normalized(game.steamPositivePercent,100),
    acquisitionCost:cost.status==='known'?clamp(1-cost.total/Math.max(1,budgetPerMemberEUR*memberIds.length)):null,
    groupSuitability:fit.score,
    hardwareCompatibility:hwScore,
    currentEventWishes:wishesKnown?clamp(wished/memberIds.length):null,
  };
  let numerator=0,knownWeight=0;
  for (const [key,weight] of Object.entries(weights)) {
    const value=factors[key];
    if (value!=null) {numerator += value*weight;knownWeight+=weight;}
  }
  const coverage=knownWeight/allWeight;
  const score=knownWeight>0?Math.round(numerator/knownWeight*100):null;
  return {
    score, provisional: coverage < .999,
    coveragePercent:Math.round(coverage*100),
    factors:Object.fromEntries(Object.entries(factors).map(([key,value])=>[key,{value:value==null?null:Math.round(value*100),weight:weights[key]??0,known:value!=null}])),
    warnings:[...(cost.status==='unknown'?['Besitz oder Preis unbekannt']:[]),...(!allHwKnown?['Hardwarevergleich noch nicht vollständig']:[]),...(fit.state!=='private_group'? [fit.explanation]:[])],
    acquisitionCostEUR:cost.total,
    groupFit:fit.state,
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
