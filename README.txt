LAN Library — Steam-Import-Fix 1.9.4b

Bisherige Ursache: 1.9.4a war nur ein zusätzliches Skript. Die eigentliche App prüft in app.mjs nach wie vor, ob die Felder "mode" UND "confirmed" gesetzt sind. Außerdem hatte die vorherige Korrektur dieselbe interne App-Version wie 1.9.4, wodurch die Update-Erkennung kein neues Haupt-Release erkennen konnte.

Dieses Paket behebt die Steam-Import-Validierung durch einen robusteren, vor der App-Speicherprüfung ausgeführten Capture-Handler. Steam-bestätigter Mehrspielermodus führt automatisch zu "confirmed=on" und einem gültigen Spielmodus. Online-Koop wird, wenn aus Steam-Metadaten erkennbar, als "coop_pve" eingetragen. Nur allgemeiner Multiplayer wird zunächst als "other_multi" gespeichert — nicht fälschlich als Koop. Unbekannte oder rein manuelle Einträge brauchen weiterhin den manuellen Nachweis.

Installation (3 Dateien, jeweils vorhandene Dateien überschreiben):
  Hauptordner GitHub: index.html, sw.js
  Unterordner src: steam-import-fix.js
Die Datei app.mjs NICHT überschreiben; sie enthält alle bisherigen Funktionen. Auch keine Supabase-Daten ändern.

WICHTIG: Nach dem Upload die LAN Library bewusst in Chrome unter
https://kretschmer87.github.io/lan-library-app/?import-fix=1.9.4b
neu öffnen und in der Ansicht "Spiel hinzufügen" nach dem Hinweis
"Steam-Import-Automatik 1.9.4b aktiv" schauen.
Wenn dieser Hinweis NICHT sichtbar ist, läuft noch alter Code. In diesem Fall bitte noch nicht von einem fehlgeschlagenen Fix sprechen; zuerst ist der App-/Service-Worker-Cache oder die Veröffentlichung zu prüfen.

Sicherheit:
- Keine Datenbankmigration.
- Bewertungen, Besitzstände und bisherige Spiele bleiben unverändert.
- Browser-Tests mit synthetischen Daten für The Front, Void Crew, generischen Multiplayer und manuelle Einträge auf 3 Bildschirmgrößen erfolgreich.
- Eine echte produktive Speicherung über GitHub Pages/Supabase muss nach Veröffentlichung getestet werden.
