# LAN Library auf GitHub Pages

1. GitHub-Repository `lan-library-app` erstellen (für GitHub Free öffentlich).
2. App-Dateien dieses Ordners auf `main` hochladen oder durch ChatGPT/GitHub-Connector einspielen lassen.
3. Repository → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
4. GitHub Actions führt `.github/workflows/deploy.yml` aus und veröffentlicht nur die statischen App-Dateien (ohne private Datenimporte, SQL oder Tests).
5. In Supabase Authentication → URL Configuration die tatsächlich ausgegebene Pages-URL als Site URL und Redirect URL eintragen. Anschließend mit neuem MK-Konto registrieren und die Gruppe erstellen.

Wichtig: Öffentlich sind nur HTML, CSS, Client-JavaScript, App-Icons und der **öffentliche** Supabase Publishable Key. Keine Geheimnisse oder private Besitzer-/Profildaten hochladen. Diese verbleiben durch RLS geschützt in Supabase.

Vor dem Einladen von Mitspielern echte Benutzer-/Berechtigungstests durchführen.
