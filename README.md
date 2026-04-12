# The Final Scene

Fight Through a Dying Movieverse

Browserbasiertes Rogue-like mit Horrorfilm-Thema, zufällig generierten Dungeon-Ebenen, zustandsbasiertem Kampf, Loot, Hunger-System, Save/Load und einer recht großen Playwright-E2E-Suite.

## Kurzüberblick

Dieses Repository enthält ein lauffähiges Einzelspieler-Browserspiel ohne Framework. Die App besteht aus statischem HTML/CSS und modularisiertem JavaScript im `src/`-Ordner. Für den Browser wird der aktive Einstieg `src/main.mjs` per `esbuild` nach `dist/game.bundle.js` gebündelt. `index.html` lädt genau dieses Bundle.

Wenn du neu in das Projekt kommst, ist die wichtigste Orientierung:

- Aktiver Runtime-Pfad: `src/main.mjs`
- Aktive Hilfsmodule: `src/*_v2.mjs` plus fachliche Module wie `dungeon.mjs`, `combat.mjs`, `ai.mjs`, `items.mjs`
- Browser-Einstieg: `index.html`
- Build-Artefakt: `dist/game.bundle.js`
- E2E-Tests: `tests/*.spec.js`
- Legacy-Referenzen: `src/legacy/main.mjs`, `src/legacy/dom.mjs`, `src/legacy/render.mjs`, `src/legacy/state.mjs`

Die Dateien ohne `_v2` sind nicht der aktive Pfad. Sie liegen noch als Referenz im Repository und sollten nicht versehentlich als Quelle der Wahrheit behandelt werden.

## Projektstatus

Stand jetzt ist das Projekt spielbar und die vorhandene Verifikation läuft lokal sauber:

- `npm run check:js`
- `npm run build`
- `npm run test:e2e`

Die Playwright-Suite deckt Startflow, Navigation, Kampf, Loot, Hunger, Persistenz, Türen/Schlüssel, Fallen, Showcase-Objekte und mehrere Smoke-Checks gegen den produktiven Laufzeitpfad ab.

## Schnellstart

1. Abhängigkeiten installieren: `npm install`
2. Browser-Bundle bauen: `npm run build`
3. `index.html` im Browser öffnen

Für E2E-Tests:

1. `npm run test:e2e`

Das Test-Setup startet selbst einen lokalen Server auf Port `4173`.

## Wichtige Skripte

- `npm run build`
  Bündelt `src/main.mjs` nach `dist/game.bundle.js`.
- `npm run check:js`
  Führt Syntax-Prüfungen für den aktuell konfigurierten Satz an Kernmodulen aus.
- `npm run start:test`
  Startet einen einfachen statischen Server für die Testumgebung auf Port `4173`.
- `npm run test:e2e`
  Baut das Projekt und startet danach die Playwright-Suite.

## So ist das Projekt aufgebaut

### Laufzeit

- `index.html`
  Definiert die komplette UI-Struktur, Modals und Mount-Punkte.
- `styles.css`
  Gesamtes visuelles Styling der App.
- `src/main.mjs`
  Orchestriert die Anwendung. Hier laufen Initialisierung, Event-Handling, Zusammensetzen der APIs und große Teile der Spiellogik zusammen.

### Fachmodule

- `src/data.mjs`
  Zentrale Kataloge und Stammdaten: Tiles, Monster, Waffen, Schilde, Props und weitere Konstanten.
- `src/balance.mjs`
  Balancing-Konstanten und Progressions-/Spawn-Regeln.
- `src/dungeon.mjs`
  Levelgenerierung, Türen, Schlüsselräume, Chests, Gegner- und Item-Platzierung.
- `src/combat.mjs`
  Treffer, Krits, Blocken, Schaden, Tod und kampfbezogene Hilfslogik.
- `src/ai.mjs`
  Gegnerverhalten und Verfolgungslogik.
- `src/items.mjs`
  Aufheben, Ausrüsten, Inventarlogik und Item-Verwendung.
- `src/loot.mjs`
  Food-/Loot-spezifische Erzeugung.
- `src/itemization.mjs`
  Raritäten, Affixe/Modifier und Equipment-Rolls.
- `src/traps.mjs`
  Fallenaufbau und Trap-Effekte.
- `src/nutrition.mjs`
  Hunger-/Nahrungsmodell.
- `src/state.mjs`
  Persistenz, Save/Load, Optionen, Highscores und State-Erzeugung.
- `src/render.mjs`
  DOM-Rendering für Board, Log, HUD, Inventar, Gegneransicht und Listen.
- `src/dom.mjs`
  DOM-Bindings für `index.html`.
- `src/test-api.mjs`
  Test-Hooks für Playwright. Die globale API wird nur aktiviert, wenn `localStorage["dungeon-rogue-enable-test-api"] === "1"` gesetzt ist.
- `src/utils.mjs`
  Kleine generische Hilfsfunktionen.

### Tests

- `tests/*.spec.js`
  Fachliche E2E-Szenarien.
- `tests/helpers.js`
  Test-Helfer für Setup, Teleports, Combat-Szenarien und gezielte Platzierung von Objekten.
- `tests/test-setup.js`
  Aktiviert die Test-API explizit für Testläufe.
- `playwright.config.js`
  Konfiguration für Webserver, Base-URL und Output-Verzeichnis.

### Sonstiges

- `assets/`
  SVG-Assets für Monster, Waffen, Schilde, Props, Nahrung und Umgebung.
- `docs/quality-report.md`
  Bisherige Qualitätsanalyse, Findings und Maßnahmen.

## Spielmechaniken in Kürze

- Rundenbasiertes Bewegen per Tastatur
- Zufällig generierte Ebenen mit Räumen, Gängen, Türen, Treppen und Sonderobjekten
- Gegner mit unterschiedlichen Verhaltensprofilen
- Waffen, Schilde, Nahrung, Heiltränke, Schlüssel und Truhen
- Hunger-/Nutrition-System mit negativen Folgen bei Vernachlässigung
- Save/Load über `localStorage`
- Highscores ebenfalls über `localStorage`

## Steuerung

- `WASD` oder Pfeiltasten: bewegen
- `Leertaste`: warten
- `H`: Heiltrank aus dem Inventar trinken
- `C`: benachbarte offene Tür schließen
- `I`: Inventar öffnen
- `O`: Optionen öffnen
- `R`: neuen Lauf starten
- `Enter`: Fund- oder Treppenwahl bestätigen
- `Esc`: offenes Fenster schließen

## Hinweise für neue Threads oder Workspaces

- Lies zuerst diese README und danach [docs/project-overview.md](docs/project-overview.md).
- Arbeite standardmäßig gegen `src/main.mjs`, `src/dom.mjs`, `src/render.mjs` und `src/state.mjs`, nicht gegen die Legacy-Dateien.
- Nach Änderungen am Runtime-Code immer mindestens `npm run build` ausführen.
- Bei Spiellogik oder UI-Verhalten möglichst `npm run test:e2e` mitlaufen lassen.
- Wenn etwas im Browser nicht sichtbar wird, ist oft schlicht das Bundle in `dist/` nicht neu gebaut worden.
- Die Tests nutzen überwiegend die explizit freigeschaltete `__TEST_API__`; der normale Produktivpfad soll diese API nicht offenlegen.

## Bekannte strukturelle Realitäten

- Die Codebasis ist modular, aber einige Kernmodule sind groß geworden, vor allem `main.mjs`, `dungeon.mjs`, `data.mjs` und `render.mjs`.
- Es existiert bewusst noch eine Legacy-Linie parallel zur aktiven `_v2`-Linie.
- Es gibt bereits gute E2E-Abdeckung, aber nur leichtes Build-/Syntax-Tooling. Linting, Formatting und CI sind naheliegende nächste Ausbaustufen.

## Weiterführende Doku

- Architektur- und Arbeitsüberblick: [docs/project-overview.md](docs/project-overview.md)
- Qualitätsanalyse: [docs/quality-report.md](docs/quality-report.md)
