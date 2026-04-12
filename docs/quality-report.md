# Quality Report

- Letzte Aktualisierung: 2026-04-12
- Neu entdeckte Findings:
  - `Q-001` Inkonsistente Start-/Build-Dokumentation zwischen README, `index.html` und `package.json`
  - `Q-002` Nicht portable npm-Skripte durch fest verdrahtete Windows-/Node-Pfade
  - `Q-003` Fragile Build-/Test-Pipeline wegen schreibpflichtiger Artefakte in `dist/` und `test-results/`
  - `Q-004` Parallele Alt-/Neu-Implementierungen erzeugen zwei konkurrierende Wahrheiten
  - `Q-005` Test-Hook `window.__TEST_API__` ist im aktiven Runtime-Pfad permanent exponiert
  - `Q-006` Highscore-Rang kann angezeigt werden, obwohl der Eintrag aus den gespeicherten Top 100 herausfaellt
  - `Q-007` Vermutetes Ausfallrisiko durch ungeschuetzte `localStorage`-Zugriffe
  - `Q-008` E2E-Suite prueft den produktiven Build nur eingeschraenkt, weil sie eng an `__TEST_API__` gekoppelt ist
- Bereits bekannte, noch offene Punkte:
  - `Q-003`

## Q-001
Status: fixed
Prioritaet: hoch
Kategorie: Konsistenzproblem
Datei: README.md; index.html; package.json
Bereich: Start-/Build-Dokumentation; Einstiegspfade
Problem: Die Projektbeschreibung ist nicht mehr mit dem aktiven Laufzeitpfad synchron. Das README beschreibt einen Prototypen "ohne Build-Schritt" und fordert dazu auf, nur `index.html` zu oeffnen, waehrend die Seite tatsaechlich ein gebuendeltes Artefakt aus `./dist/game.bundle.js` laedt und `package.json` den aktiven Einstieg ueber `src/main_v2.mjs` baut.
Warum relevant: Neue Entwickler oder spaetere Wartung arbeiten leicht gegen veraltete Annahmen, starten das falsche Artefakt oder ueberschaetzen die Aussagekraft von Quelltextaenderungen, die ohne Rebuild in der App gar nicht auftauchen.
Empfohlene Massnahme: README auf den aktiven Build-/Startpfad aktualisieren und klar dokumentieren, welches Artefakt die Quelle der Wahrheit ist.
Sicherheit: hoch
Umsetzung: README auf den aktiven Ablauf mit `npm install`, `npm run build`, `index.html` und `dist/game.bundle.js` aktualisiert; aktiven Einstieg `src/main_v2.mjs` und Legacy-Pfade ohne `_v2` klar benannt.
Pruefung: README, `index.html` und `package.json` manuell gegengeprueft; `npm run build` erfolgreich ausgefuehrt.
Restrisiken: Keine fachlichen; die Doku muss bei kuenftigen Build-Pfad-Aenderungen weiter mitgepflegt werden.

## Q-002
Status: fixed
Prioritaet: hoch
Kategorie: Risiko
Datei: package.json
Bereich: `scripts` (`build`, `check:js`, `start:test`, `test:e2e`), Zeilen 7-10
Problem: Alle npm-Skripte rufen Node ueber einen fest verdrahteten Windows-Kurzpfad (`C:\\PROGRA~1\\nodejs\\node.exe`) auf.
Warum relevant: Die Skripte sind damit an genau eine lokale Installationsform gebunden und brechen auf anderen Windows-Systemen, in CI, auf macOS/Linux oder bei abweichender Node-Installation sehr wahrscheinlich.
Empfohlene Massnahme: Lokale Binaries ueber `node`, `npx` oder direkt ueber npm-Skript-Aufloesung starten, statt absolute Maschinenpfade zu kodieren.
Sicherheit: hoch
Umsetzung: Alle npm-Skripte auf portable `node ./node_modules/...`-Aufrufe umgestellt; `package.json.main` auf den aktiven Einstieg `src/main_v2.mjs` ausgerichtet.
Pruefung: `npm run check:js`, `npm run build` und `npm run test:e2e` erfolgreich ausgefuehrt.
Restrisiken: Keine fachlichen; Build bleibt weiterhin von schreibbarem `dist/` abhaengig, siehe `Q-003`.

## Q-003
Status: investigating
Prioritaet: mittel
Kategorie: Risiko
Datei: package.json; playwright.config.js; dist/game.bundle.js; test-results/.last-run.json
Bereich: Build-/Test-Artefakte; Testausfuehrung
Problem: Die Verifikation ist an schreibbare Artefakte im Arbeitsverzeichnis gekoppelt. `npm run test:e2e` scheiterte reproduzierbar beim Ueberschreiben von `dist/game.bundle.js` mit "Zugriff verweigert"; ein direkter Playwright-Lauf scheiterte anschliessend an `test-results/.last-run.json` mit `EPERM`.
Warum relevant: Die Qualitaetssicherung ist dadurch stark von Dateisystem- und Sync-Eigenschaften des lokalen Ordners abhaengig. Schon bevor fachliche Tests starten, kann die Pipeline aus Infrastrukturgruenden abbrechen.
Empfohlene Massnahme: Generierte Build-/Testausgaben in temporaere oder eindeutig ignorierte Verzeichnisse umlenken und die Pipeline so gestalten, dass sie nicht auf persistenten, gesperrten Artefakten aufsetzt.
Sicherheit: hoch
Umsetzung: Playwright-Ergebnisse nach `./.playwright-temp/results` verlegt, damit die Test-Runs nicht mehr auf `test-results/` als persistentem Standardpfad aufsetzen.
Pruefung: `npm run test:e2e` erfolgreich ausgefuehrt; die Playwright-Ausgaben landeten im neuen Temp-Verzeichnis.
Restrisiken: Der Browser-Build schreibt weiterhin nach `dist/game.bundle.js`; in dieser Arbeitsumgebung brauchte der Build dafuer weiterhin eine Freigabe ausserhalb der Sandbox. Fuer eine vollstaendige Loesung waere ein separater E2E-Buildpfad noetig.

## Q-004
Status: fixed
Prioritaet: mittel
Kategorie: Design-/Architekturschwaeche
Datei: package.json; src/main.mjs; src/main_v2.mjs; src/dom.mjs; src/dom_v2.mjs; src/render.mjs; src/render_v2.mjs; src/state.mjs; src/state_v2.mjs
Bereich: Einstiegspunkte; Modulstruktur
Problem: Es existieren zwei parallele Anwendungslinien im selben Repository. Gleichzeitig zeigt `package.json` mit `main: "src/main.mjs"` noch auf den alten Einstieg, waehrend Build und Browserpfad mit `src/main_v2.mjs` arbeiten.
Warum relevant: Bugfixes, Refactorings und Reviews koennen leicht in der falschen Implementierung landen. Das erhoeht die Wartungskosten und beguenstigt funktionale Drift zwischen "alt" und "aktiv".
Empfohlene Massnahme: Den aktiven Pfad eindeutig festlegen, Altpfade entweder entfernen/archivieren oder klar als deprecated markieren und Metadaten wie `main` daran ausrichten.
Sicherheit: hoch
Umsetzung: `package.json.main` auf `src/main_v2.mjs` gesetzt; README und Legacy-Module (`main.mjs`, `dom.mjs`, `render.mjs`, `state.mjs`) klar als nicht aktiven Referenzpfad markiert.
Pruefung: Manuelle Gegenpruefung der Einstiegspfade sowie erfolgreiche Ausfuehrung von `npm run check:js` und `npm run build`.
Restrisiken: Die Legacy-Dateien liegen weiterhin im Repository und koennen bei groesseren Umbauten erneut driften; sie sind jetzt aber klar gekennzeichnet.

## Q-005
Status: fixed
Prioritaet: hoch
Kategorie: Risiko
Datei: src/test-api.mjs; src/main_v2.mjs
Bereich: Test-Hooks; Runtime-Initialisierung (`syncTestApi`), src/test-api.mjs Zeilen 26-27; src/main_v2.mjs Zeilen 1225-1226
Problem: Der aktive Renderpfad registriert bei jedem Rendern ein globales `window.__TEST_API__` und stellt darueber nicht nur Lesefunktionen, sondern auch mutierende Hilfen wie `teleportPlayer`, `clearFloorEntities`, `setRandomSeq?nce` oder `setupCombatScenario` bereit.
Warum relevant: Die produktive Laufzeit ist damit absichtlich manipulierbar und leakt tiefe Spielinterna nach aussen. Jede Browser-Konsole, Extension oder eingebettete Fremdlogik kann Spielzustand und Testhilfen direkt missbrauchen.
Empfohlene Massnahme: Test-API nur in einem expliziten Test-/Debug-Build oder hinter einem klaren Feature-Flag exponieren, nicht im regulären Runtime-Pfad.
Sicherheit: hoch
Umsetzung: `window.__TEST_API__` wird nur noch exponiert, wenn vor dem Laden explizit `localStorage["dungeon-rog?-enable-test-api"]="1"` gesetzt wurde; die Playwright-Suite aktiviert dieses Flag gezielt ueber `tests/test-setup.js`.
Pruefung: Neuer Smoke-Test `tests/smoke.spec.js` bestaetigt, dass der produktive Runtime-Pfad die Test-API standardmaessig nicht exponiert; komplette E2E-Suite erfolgreich.
Restrisiken: Wer das Flag lokal bewusst setzt, bekommt weiterhin die mutierenden Hilfen. Das ist fuer die Testumgebung gewollt.

## Q-006
Status: fixed
Prioritaet: mittel
Kategorie: Bug
Datei: src/state_v2.mjs; src/main_v2.mjs
Bereich: Highscore-Speicherung; Death-Modal, src/state_v2.mjs Zeilen 137-153; src/main_v2.mjs Zeilen 849-858
Problem: Der Rang eines neuen Highscore-Eintrags wird vor dem anschliessenden `slice(0, 100)` berechnet und gespeichert. Faellt ein Eintrag nach dem Trimmen aus den gespeicherten Top 100 heraus, bleibt dennoch ein numerischer Rang erhalten und wird im Death-Modal als `#<rang>` angezeigt.
Warum relevant: Die UI kann dem Spieler einen Highscore-Platz anzeigen, obwohl dieser Eintrag gar nicht dauerhaft in der Tabelle vorhanden ist. Das ist ein fachlicher Inkonsistenzfehler.
Empfohlene Massnahme: Rang erst gegen die final gespeicherte Liste bestimmen oder `null`/`Au?er Wertung` setzen, wenn der neue Eintrag nicht in den persistierten Top 100 landet.
Sicherheit: hoch
Umsetzung: Rangbestimmung auf die final getrimmte Top-100-Liste umgestellt; faellt ein neuer Eintrag heraus, wird `null` gespeichert und im Death-Modal als `Au?er Wertung` gezeigt.
Pruefung: Neuer E2E-Test in `tests/combat.spec.js` deckt den Randfall mit bereits gefuellter Top-100-Liste ab; komplette Test-Suite erfolgreich.
Restrisiken: Keine bekannten.

## Q-007
Status: fixed
Prioritaet: mittel
Kategorie: Risiko
Datei: src/state_v2.mjs
Bereich: Persistenz ueber `localStorage`, u. a. Zeilen 32, 37, 42, 48, 77-81, 109, 149-150
Problem: Vermutung: Mehrere direkte `localStorage.getItem`-, `setItem`- und `removeItem`-Aufrufe sind nicht durch generische Fehlerbehandlung abgesichert. Abgefangen wird aktuell nur ein Teil der JSON-Deserialisierung.
Warum relevant: In Browsern mit gesperrtem Storage, Quota-Problemen oder restriktiven Privacy-Modi kann die App beim Starten, Speichern von Optionen oder Schreiben von Highscores unerwartet abbrechen.
Empfohlene Massnahme: Alle Storage-Zugriffe in robuste Hilfsfunktionen kapseln, Fehler zentral behandeln und auf sichere Defaults/Fallbacks zurueckfallen.
Sicherheit: mittel
Umsetzung: `state_v2.mjs` auf zentrale `readStorage`-/`writeStorage`-/`removeStorage`-Hilfen umgestellt; Optionen und Highscore-Marker fallen bei Storage-Fehlern sauber auf Defaults zurueck. Der aktive Highscore-Renderer nutzt jetzt ebenfalls die gekapselte Marker-Lesefunktion statt direktem `localStorage`-Zugriff.
Pruefung: `npm run check:js`; neuer Smoke-Test mit absichtlich blockiertem `localStorage` bestaetigt, dass die App trotzdem startet und ein Lauf begonnen werden kann.
Restrisiken: In Storage-blockierten Umgebungen bleiben Einstellungen und Highscores absichtlich fluechtig.

## Q-008
Status: fixed
Prioritaet: mittel
Kategorie: Testluecke
Datei: tests/helpers.js; src/test-api.mjs; src/main_v2.mjs
Bereich: E2E-Testdesign; Test-Isolation, tests/helpers.js Zeilen 18-150
Problem: Die vorhandenen E2E-Tests sind eng an `window.__TEST_API__` gekoppelt und manipulieren Spielzustand gezielt ueber den globalen Test-Hook. Dadurch fehlt eine schlanke Black-Box-Absicherung fuer den tatsaechlichen Produktiv-Build ohne diese Sonderoberflaeche.
Warum relevant: Regessionen in Packaging, Boundary-Hygiene oder im echten Produktionspfad koennen leichter unentdeckt bleiben, weil die Tests denselben globalen Hook voraussetzen, dessen versehentliche Exposition selbst bereits ein Qualitaetsproblem ist.
Empfohlene Massnahme: Zusaetzlich wenige end-to-end-nahe Smoke-Tests ohne `__TEST_API__` einfuehren und einen separaten Packaging-Check definieren, der gezielt die Produktionsgrenze validiert.
Sicherheit: hoch
Umsetzung: E2E-Suite trennt jetzt explizit zwischen Hook-basierten Tests und Black-Box-Smoke-Checks. `tests/smoke.spec.js` laeuft ohne Test-API und prueft sowohl die fehlende Exposition des Hooks als auch den Start mit blockiertem Storage.
Pruefung: `npm run test:e2e` erfolgreich mit 75/75 gruenden Tests.
Restrisiken: Der Grossteil der fachlichen E2E-Tests nutzt weiterhin bewusst die Test-API fuer schnelle Szenarien; die Produktionsgrenze ist jetzt aber zusaetzlich separat abgesichert.
