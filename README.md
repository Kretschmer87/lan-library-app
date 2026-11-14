# LAN Library – Online-MVP 0.1

**Stand: 14.11.2026 · Entwicklungsstand, kein öffentlich gestarteter Dienst.**

Die Phase der separaten HTML-Alphas ist beendet. Dieser Ordner ist ein zusammenhängendes Web-App-Projekt mit separater Datenbankschicht, Authentifizierung, Benutzerrechten und installierbarer PWA-Grundlage. Es gibt eine funktionsfähige lokale Demo und einen vorbereiteten Supabase-Cloud-Modus. **Das Supabase-Projekt wurde am 14.11.2026 angelegt und die initiale Datenbankmigration erfolgreich ausgeführt. Der Echte-Konten-End-to-End-Test sowie die App-Veröffentlichung stehen noch aus.**

## 1. Was bereits implementiert wurde

- Mobile-first-Katalog im freigegebenen dunklen 70-%-Gaming-Design; Suchfeld, In-App-Filter mit Teiltreffern, Sortierung inklusive LAN-Score
- Detailseite mit Koop-/Team-Eignung, getrennten Gruppen-/Steam-Wertungen, Hardware-Stufe, Preis, Besitz, Steam- und YouTube-Suchlink
- 1–10-Bewertungsskala, persönliche Favoriten, Kommentare und technische Hinweise
- Manuelles Hinzufügen von bestätigten Multiplayer-Spielen (auch nur 2er-Koop); reine Singleplayer-Spiele werden nicht als normale Einträge akzeptiert
- Demo-Modus ohne Zugangsdaten; Beispielinhalte sind klar als Demo markiert
- Supabase Auth (E-Mail/Passwort), Gruppe erstellen, beitreten und zeitlich begrenzte Admin-Einladungen
- PostgreSQL mit gruppenbasierter **Row Level Security (RLS)**; Gruppenmitglieder dürfen nur gruppenbezogene Daten lesen; Admin darf Besitz anderer korrigieren, Noten bleiben personenbezogen
- Einzeln bearbeitbare Mitgliederprofile mit privaten Profilbildern (Cloud-Storage-Policy)
- Gruppenübergreifende Datenspeicherung und periodischer Abgleich der aktuellen Gruppendaten (15 Sekunden bei aktiver App)
- PWA-Manifest, App-Icons, Service Worker mit Offline-App-Shell
- Transparenter vorläufiger LAN-Score aus dem bestehenden Funktionenkern mit Angabe der Datenabdeckung

**Noch nicht live integriert:** Steam-Katalogsuche/Steam-Besitz-Synchronisierung und automatische Preise/Reviews, bestätigte 61 Kandidaten als reguläre Spiele, Kalenderabstimmungen, Event-Wünsche, Hardware-Komponentenvergleich und automatische Aktivitäten. Die entsprechenden Bereiche werden schrittweise ergänzt; der LAN-Kalender zeigt derzeit ausdrücklich einen Platzhalter.

## 2. Sofort ausprobieren, ohne Supabase

Die separat gelieferte Datei **`LAN_Library_Online_MVP_Demo.html`** ist die eigenständig öffnende Testversion. Sie benötigt keine Installation. Sie verwendet sechs **anonymisierte Beispieltitel und Besitzdaten**, keine echten Bewertungen. Je nach Browser werden ihre Änderungen lokal gespeichert oder nur für die aktuelle Seite behalten.

Die Cloud-Dateien im ZIP werden nicht benötigt, um diese Demo anzusehen.

## 3. Gemeinsame Online-Version einrichten (durch den Projektinhaber)

1. **Bereits erledigt:** Supabase-Projekt „LAN Library“ ist angelegt (Frankfurt).
2. **Bereits erledigt:** Datenbanktabellen, RLS und Einladungsfunktionen sind eingerichtet. Nicht erneut ausführen. Die Datei richtet Tabellen, Mitgliedschaften, Einladungsfunktionen, Zugriffsregeln und privaten Avatar-Speicher ein. Nicht unbedacht ein zweites Mal ausführen, da die Migration für ein neues Projekt gedacht ist.
3. Unter **Authentication** E-Mail/Passwort aktivieren und E-Mail-Bestätigung sowie erlaubte Redirect-URLs passend zur späteren Website einstellen. Eventuell muss für den realen Mehrbenutzerbetrieb ein eigener SMTP-Dienst eingerichtet werden.
4. **Bereits erledigt:** `config.js` enthält die öffentliche Projekt-URL und den Publishable Key. Diese sind als öffentliche Client-Konfiguration vorgesehen. **Niemals `service_role`, Secret Keys oder Datenbank-Passwörter hier hinterlegen oder an ChatGPT schicken.**
5. Den **vollständigen Inhalt des Projektordners** (ohne private Importlisten, Beispielbilder oder Secrets) bei einem statischen HTTPS-Host bereitstellen, etwa Cloudflare Pages, Netlify oder GitHub Pages. Der Cloud-Modus startet automatisch, wenn `config.js` beide Angaben enthält.
6. Als erstes Mitglied registrieren, Bestätigungs-E-Mail öffnen, anmelden und eine Gruppe „LAN Library“ erstellen. Das erste Mitglied wird Admin.
7. Unter **Mitglieder → Mitglied einladen** einen Link erstellen und gezielt an die zwei Mitspieler schicken. Diese registrieren sich eigenständig und treten anschließend bei.
8. Jeder pflegt sein eigenes Profilbild, seine Besitzstände und Bewertungen. Die Gruppe sieht danach denselben Katalog.

Für die PWA-Installation auf Android im Browser **„App installieren“** beziehungsweise „Zum Startbildschirm“ auswählen. Auf iOS in Safari **Teilen → Zum Home-Bildschirm**. Die lokalen HTML- oder ZIP-Dateien sind nicht automatisch online installiert.

## 4. Datenimporte: bewusst getrennt

Die Original- und Screenshot-Listen von JP/LH enthalten auch Einzelspieler-Titel und Testserver. Sie sind als **private Importkandidaten** separat archiviert und werden **nicht** in den öffentlich deploybaren Website-Ordner gelegt. Sie sind **keine automatisch bestätigten Besitz- oder LAN-Katalogeinträge**.

Die Demo enthält außerdem ausschließlich anonymisierte Teilnehmer, damit persönliche Daten und Besitzstände nicht versehentlich über öffentliche HTML-/JavaScript-Dateien auslesbar werden.

Die echte Übernahme erfolgt nach Multiplayer-/Produkttypprüfung und Zuordnung der echten Mitgliederkonten.

## 5. Entwicklungsdateien

- `index.html`, `styles.css`, `assets/`: mobile Oberfläche und PWA-Icons
- `src/app.mjs`: App, Ansichten und Bedienabläufe
- `src/repository.mjs`: GoTrue/PostgREST/Storage-Anbindung
- `src/demo.mjs`: anonymisierte lokale Demo-Daten (nicht die echten Besitzlisten)
- `src/score.mjs`: unabhängige Score- und Multiplayer-Regeln
- `sql/001_initial.sql`: Supabase-DB-Migration einschließlich RLS und Einladung-RPCs
- `config.js`: öffentlich zulässige Projektwerte (anfangs leer)
- `sw.js`, `manifest.webmanifest`: installierbare PWA
- `tests/`: automatisierte Node- und Browser-Smoke-Tests

## 6. Tests

Node.js 20+:

```bash
node --test tests/score.test.mjs tests/repository.test.mjs
```

Das sind **22 bestandene automatisierte Logik- und API-Adaptertests** im Entwicklungscontainer.

Der Browser-Smoke-Test kann mit Python, Playwright und Chromium ausgeführt werden:

```bash
python tests/make_preview.py
python tests/ui_smoke.py
```

Er überprüft sechs Demo-Titel auf fünf Smartphone-/Tablet-Breiten und den Ablauf: Filter, 2er-Koop-Warnung, Bewertung, Besitzänderung, Kommentare, Profile und manuelle Spielanlage.

### Vor Freigabe zwingend noch am echten Backend prüfen

- Zwei angemeldete Geräte erhalten dieselben Spiel-/Besitz-/Bewertungsänderungen.
- Ein Außenstehender kann auch mit erratenen IDs keine Gruppe, Personenbilder, Noten oder Besitzstände abrufen.
- Ein normales Mitglied darf keine Besitzstände anderer ändern, keine Admin-Rolle setzen und keinen Link erstellen.
- Der Admin darf fremden Besitz, aber keine fremden Bewertungen überschreiben.
- Einladungen verfallen, lassen sich nur begrenzt einlösen und schaffen keine Einsicht vor erfolgreicher Anmeldung.
- Login-/Token-Erneuerung, Browser-Neuladen, privater Foto-Upload und mobile PWA-Installation funktionieren.

Die SQL-Migration ist **entworfen und statisch geprüft, aber noch nicht in einer echten Supabase-Datenbank ausgeführt**. Deshalb sind die Rechte nicht als unabhängig verifiziert zu betrachten.

## 7. Weitere Schritte

1. Echte Supabase-Instanz einrichten und Sicherheits- sowie Zwei-Geräte-Tests bestehen.
2. Die 61 privaten Importkandidaten nachvollziehbar prüfen, Dubletten und Nicht-Multiplayer aussondern, Besitz MK/LH/JP zuordnen.
3. Steam-Suche, öffentliche Bibliotheksabfragen und Reviews über sicheres Backend ergänzen (nie private Steam-API-Schlüssel im Browser).
4. LAN-Planer, Wünsche, Hardwareprofile, Aktivitäten und detaillierte Score-Einstellungen implementieren.
5. Smartphone-Feinschliff und Freigabetests.

## Cloud-Status (14.11.2026)

- Projekt: bantixgbzbrfdamsknja (Frankfurt, laut Supabase 0 €/Monat).
- 9 private Gruppentabellen mit aktiver Row Level Security, private Avatar-Bucket und Einladungs-RPCs vorhanden.
- Sicherheitshinweis des Supabase-Advisors: Drei bewusst exponierte, authentifizierte SECURITY-DEFINER-RPCs für Gruppenanlage, Einladung und Beitritt. Deren Nutzer- und Gruppenchecks sind implementiert; ein echter Rechte-/Penetrationstest ist noch offen.
- Kein Nutzerkonto und keine Gruppe angelegt, da keine Nutzeranmeldedaten verwendet werden.
- **Nächster Schritt:** vollständigen Webordner bei HTTPS-Host bereitstellen; danach registriert sich MK direkt in der App und legt die Gruppe an.
