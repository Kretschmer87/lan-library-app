# LAN Library – Zentraler Projektkontext

**Stand:** 21. November 2026  
**Status:** Bestandsaufnahme; bei Abweichungen haben aktueller Quellcode und Live-Datenbank Vorrang.

## Projekt und Architektur (verifiziert)

- GitHub: https://github.com/Kretschmer87/lan-library-app – Standardbranch `main`.
- In `index.html` hinterlegte Version: `1.9.4`, Steam-Import-Patch: `1.9.4b`.
- Letzte bei der Prüfung sichtbare Änderung: 17.11.2026 (Commit `3e6feb790a…`).
- Frontend als mobile Web-App/PWA: `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`.
- Code: `src/app.mjs` (App/Ansichten), `src/repository.mjs` (Datenzugriff), `src/score.mjs` (Bewertungslogik), `src/steam-import-fix.js` (Import-Patch), `src/demo.mjs` (Demo).
- Supabase-Projekt **LAN Library** (`bantixgbzbrfdamsknja`), Region Frankfurt, Projektstatus am Prüftag `ACTIVE_HEALTHY`.
- Die vorhandene `README.md` beschreibt teilweise noch den Stand vom 14.11.2026 und ist daher nicht durchgehend aktuell.

## Datenbestand in Supabase (Momentaufnahme vom 21.11.2026)

| Bereich | Datensätze |
|---|---:|
| Spiele (`games`) | 99 |
| Bewertungen (`game_ratings`) | 38 |
| Besitz (`game_ownership`) | 45 |
| Favoriten (`game_favorites`) | 14 |
| Katalogkandidaten (`catalog_candidates`) | 93 |

19 Tabellen im `public`-Schema wurden erkannt; bei allen ist Row Level Security (RLS) aktiv. Außerdem existieren unter anderem Gruppen-, Profil-, Einladungs-, Kalender-, Hardware- und Wunschlisten-Tabellen. Die Aktivierung von RLS bedeutet **keine** vollständige Sicherheitsüberprüfung. Zählwerte sind weder Datenexport noch Backup.

## Anforderungen und langfristige Entscheidungen

- Gemeinsame mobile Bibliothek für zunächst drei LAN-Mitglieder (MK, LH, JP), später erweiterbar.
- Primär für Mehrspieler-/LAN-/Online-Titel, Koop separat markieren; Spiele mit nur zwei Koop-Plätzen dürfen erkennbar sein, müssen aber passend eingeordnet werden.
- Übersicht als eine Liste mit großen Covers und standardmäßig alphabetischer Sortierung.
- Filter und Sortierung u. a. nach Genre, 3+-Spieler-Eignung, Koop, Plattform/Launcher, Preis, Besitzern, Bewertungen, Score und Hardware-Anforderungen.
- Details: Multiplayer-Modi, Spielerzahl, Steam-Verknüpfung, Crossplay/Store-Hinweise, Gameplay, Beschreibungen.
- Eigene Bewertungen von 1–10 je Person, gemeinsamer Durchschnitt, Besitz, Favoriten und Wünsche.
- LAN-Score berücksichtigt Besitz, Preis, Gruppentauglichkeit, Hardware und Bewertungen. **Aktuelle Gewichte unbedingt in `src/score.mjs` nachlesen**, statt aus Erinnerung übernehmen.
- Unveröffentlichte Spiele bleiben sichtbar, mit deutlicher Kennzeichnung des Status bzw. bekannten Erscheinungsdatums.
- Design: „Entwurf 3“ – modern, dunkle Gaming-Optik, abgerundete Bedienelemente, Glas-Effekt, übersichtlich und konsequent smartphonegerecht.
- Besonders wichtig: **Bestehende Spiele, individuelle Bewertungen, Besitzstände und Einstellungen nicht überschreiben oder zurücksetzen.**

## Fehlerstatus – Stand 21.11.2026

**Behoben (vom Nutzer ausdrücklich bestätigt am 21.11.2026):** Der früher gemeldete Steam-Import-Fehler bei **Void Crew** und **The Front** (Mehrspieler-Bestätigung wurde trotz Bestätigung verlangt). **Nicht erneut als offenen Fehler einordnen.**

**Historisch gemeldet, aktueller Status noch nicht bestätigt:**
1. Einzelne Detailseiten/Steam-Links, z. B. **Borderlands 2** und **Golf With Your Friends** (15.11.2026).
2. Ausbleibende Benachrichtigung über ein App-Update (15.11.2026).
3. Fehlende Cover oder Veröffentlichungskennzeichnungen. Vor Bearbeitung aktuellen Zustand ermitteln.

Nur tatsächlich erneut bestätigte oder reproduzierte Probleme als offen behandeln.

## Sichere Fortsetzung – Arbeitsregeln

1. Vor Änderungen den aktuellen GitHub-Stand und relevante Supabase-Struktur einlesen. Nicht blind ältere README-Anweisungen ausführen.
2. Fehler möglichst reproduzieren und über bestehende Funktionen beheben; auf Wechselwirkungen mit dem Service Worker, Browsercache und dem Import-Patch achten.
3. Bei erkanntem Steam-Multiplayer sollen bestätigte Steam-Metadaten die manuelle Bestätigung ersetzen; nur bei rein manuell hinzugefügten/ungeprüften Spielen ist sie erforderlich.
4. Änderungen erst testen, dann veröffentlichen; Regressionstests für Import, Detailseite, Bewertungen, Besitz, Zugriffsrechte und Smartphone-Ansichten.
5. GitHub ist Versionsverwaltung für Code, **kein Backup der Live-Datenbank**. Vor riskanten Eingriffen Daten und Schema unabhängig sichern.
6. Niemals geheime Schlüssel, Passwörter oder personenbezogene Benutzer-/Bewertungsdaten in diese öffentliche Projektdatei schreiben.
7. Diese Dokumentation nach größeren Entwicklungsabschnitten mit Datum, aktuellen Versionen, Entscheidungen und offenen Fehlern aktualisieren.

## Nächster Schritt

Den aktuellen Entwicklungsstand anhand des GitHub-Codes, der Live-Datenbank und der jüngsten Rückmeldungen gemeinsam abgleichen; anschließend neue Prioritäten festlegen. **Keinen behobenen Steam-Import-Fehler erneut untersuchen.** Ältere Fehlermeldungen erst auf aktuellen Fortbestand prüfen.

**Hinweis:** Der GitHub-Lesezugriff über ChatGPT wurde am 21.11.2026 erfolgreich getestet. Ein Schreibversuch auf `PROJECT_CONTEXT.md` schlug mit `403 Resource not accessible by integration` fehl. Änderungen im Repository müssen daher bis zur Klärung des Schreibzugriffs manuell oder über einen anderen autorisierten Entwicklungsweg übertragen werden.
