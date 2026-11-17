/* LAN Library 1.9.4b — confirmed Steam multiplayer => form is valid at submit.
 * Does NOT change database, ownership, ratings, or data of existing games.
 * Uses Steam Store categories from the existing authenticated steam-catalog function.
 */
(() => {
  'use strict';
  const PATCH = '1.9.4b';
  const app = document.getElementById('app');
  if (!app) return;
  let selectedId = 0;
  let selectedMode = null;
  let modeManuallyChosen = false;
  let pending = 0;
  let queued = false;
  const cache = new Map();

  function evidence(form) {
    const selected = document.querySelector('.steam-selected');
    if (!selected || !form) return null;
    const id = Number(form.elements.namedItem('steam')?.value);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    const known = !!document.querySelector('.steam-mode-evidence.supported');
    const solo = !!document.querySelector('.steam-mode-evidence.solo');
    return {id, known, solo};
  }
  function infer(categories) {
    const values = Array.isArray(categories) ? categories.map(x => String(x).toLowerCase()) : [];
    if (values.some(x => /\bco[ -]?op\b|\bkoop\b|cooperative|kooperativ/.test(x))) return 'coop_pve';
    if (values.some(x => /\bpvp\b|player versus player|\bversus\b|\bdeathmatch\b/.test(x))) return 'other_multi';
    if (values.some(x => /multi.?player|mehrspieler|online play|\bmmo\b/.test(x))) return 'other_multi';
    return null;
  }
  async function getMode(id) {
    if (cache.has(id)) return cache.get(id);
    try {
      const conf = window.LAN_CONFIG || {};
      const session = JSON.parse(localStorage.getItem('lan-library-v1-session') || 'null');
      if (!conf.supabaseUrl || !conf.supabaseAnonKey || !session?.access_token) return null;
      const url = conf.supabaseUrl.replace(/\/$/, '') + '/functions/v1/steam-catalog?' + new URLSearchParams({action:'details', id:String(id)});
      const r = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(15000), headers: {apikey:conf.supabaseAnonKey, Authorization:'Bearer ' + session.access_token}});
      if (!r.ok) return null;
      const info = await r.json();
      if (Number(info?.id) !== id) return null;
      const mode = infer(info.steamCategories);
      if (mode) cache.set(id, mode);
      return mode;
    } catch { return null; }
  }
  function chooseMode(form, mode) {
    if (!mode) return;
    const input = form.querySelector('input[name="mode"]');
    if (!input) return;
    let btn = form.querySelector('.game-modes [data-value="' + mode + '"]');
    if (!btn && mode === 'other_multi') {
      const wrap = form.querySelector('.game-modes');
      if (wrap) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.action = 'mode';
        btn.dataset.value = 'other_multi';
        btn.className = 'mode-btn';
        btn.textContent = 'Mehrspieler (Modus offen)';
        wrap.append(btn);
      }
    }
    input.value = mode;
    for (const b of form.querySelectorAll('.game-modes .mode-btn')) b.classList.toggle('selected', b.dataset.value === mode);
  }
  function validSteamChoice(form) {
    const x = evidence(form);
    return !!(x && x.known && !x.solo);
  }
  function completeSteamFields(form) {
    if (!validSteamChoice(form)) return false;
    // Critical: complete the two fields BEFORE app.mjs's FormData(form) is called.
    const mode = (modeManuallyChosen ? (form.elements.namedItem('mode')?.value || selectedMode) : selectedMode) || 'other_multi';
    chooseMode(form, mode);
    const confirmed = form.elements.namedItem('confirmed');
    if (confirmed) confirmed.checked = true;
    return true;
  }
  function showBadge(form, known) {
    let status = form.querySelector('#steam-import-v194b');
    if (!status) {
      status = document.createElement('p');
      status.id = 'steam-import-v194b';
      status.style.cssText = 'border:1px solid rgba(34,209,208,.48);padding:10px 12px;border-radius:12px;font-size:.92em;line-height:1.5;';
      form.querySelector('.game-modes')?.before(status);
    }
    const message = known
      ? '✓ Steam-Import-Automatik ' + PATCH + ' aktiv. Mehrspielermodus wird beim Speichern automatisch bestätigt. Spielerzahl und private Lobbys bitte bei Bedarf korrigieren.'
      : 'Steam-Import-Automatik ' + PATCH + ' aktiv. Für manuelle oder unklare Steam-Einträge bitte Spielmodus auswählen und selbst bestätigen.';
    if (status.textContent !== message) status.textContent = message;
  }
  function adjust() {
    // Visible marker: distinguishes cached old index/app from this new correction.
    for (const b of app.querySelectorAll('.steam-result b')) if (b.textContent === 'Übernehmen') b.textContent = 'Daten auswählen';
    const installed = app.querySelector('[aria-label="Installierte App-Version"]');
    if (installed && !installed.textContent.includes(PATCH)) installed.textContent += ' · Steam-Fix ' + PATCH;
    const form = document.getElementById('game-form');
    const x = evidence(form);
    if (!form || !x) {
      if (selectedId) {selectedId = 0; ++pending; selectedMode = null; modeManuallyChosen = false;}
      if (form) showBadge(form, false);
      return;
    }
    if (x.id !== selectedId) {
      selectedId = x.id;
      selectedMode = null;
      modeManuallyChosen = false;
      const request = ++pending;
      if (x.known && !x.solo) getMode(x.id).then(mode => {
        if (request !== pending || selectedId !== x.id || modeManuallyChosen) return;
        if (mode) selectedMode = mode;
        queue();
      });
    }
    const title = app.querySelector('.steam-selected span');
    if (title && !title.textContent.includes('noch nicht gespeichert')) title.textContent = 'Steam-Daten ausgewählt – noch nicht gespeichert. Bitte unten auf „Zur gemeinsamen Bibliothek hinzufügen“ tippen.';
    const isAuto = x.known && !x.solo;
    if (isAuto) {
      completeSteamFields(form);
      const confirmRow = form.querySelector('label.confirm');
      if (confirmRow) confirmRow.style.display = 'none';
    } else {
      const confirmRow = form.querySelector('label.confirm');
      if (confirmRow) confirmRow.style.display = '';
    }
    showBadge(form, isAuto);
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {queued = false; adjust();});
  }
  app.addEventListener('click', event => {
    const btn = event.target.closest?.('.game-modes [data-action="mode"]');
    if (btn && evidence(btn.closest('form'))) {
      modeManuallyChosen = true;
      selectedMode = btn.dataset.value;
    }
  }, true);
  // Capture phase on DOCUMENT, *before* app.mjs's bubble-phase document listener.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (form?.id !== 'game-form') return;
    completeSteamFields(form);
  }, true);
  // Native form validation won't block the event: the checkbox is not required in HTML.
  // But this extra capture handles devices that submit through a click in another path.
  document.addEventListener('click', event => {
    const btn = event.target.closest?.('#game-form button[type="submit"]');
    if (btn) completeSteamFields(btn.closest('form'));
  }, true);
  const observer = new MutationObserver(queue);
  observer.observe(app, {childList:true, subtree:true});
  queue();
})();
