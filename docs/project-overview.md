# Project Overview

## Ziel dieses Dokuments

Diese Datei ist die Einstiegshilfe für neue Threads, neue Workspaces und spätere Wartung. Sie erklärt nicht nur, wie man das Projekt startet, sondern auch, wie die aktive Architektur aussieht und wo man bei Änderungen sinnvoll ansetzt.

## Was das Projekt ist

`The Final Scene` ist ein browserbasiertes Rogue-like mit Horrorfilm-Setting. Der Spieler bewegt sich rundenbasiert durch zufällig generierte Ebenen, sammelt Loot, verwaltet Hunger und Ausrüstung, bekämpft Gegner mit unterschiedlichen Verhaltensprofilen und versucht, möglichst tiefe Läufe für die lokale Highscore-Liste zu erreichen.

Technisch ist das Projekt eine kleine bis mittlere Vanilla-JS-App ohne Frontend-Framework:

- statisches HTML in `index.html`
- Styling in `styles.css`
- modulare Spiellogik in `src/*.mjs`
- Browser-Bundle via `esbuild`
- End-to-End-Tests via `Playwright`

## Aktiver Pfad vs. Legacy-Pfad

Der wichtigste Kontext für neue Mitarbeit:

- Aktiv ist die `_v2`-Linie
- Legacy ist die nicht-`_v2`-Linie

Aktive Dateien:

- `src/main_v2.mjs`
- `src/dom_v2.mjs`
- `src/render_v2.mjs`
- `src/state_v2.mjs`

Legacy-Dateien:

- `src/legacy/main.mjs`
- `src/legacy/dom.mjs`
- `src/legacy/render.mjs`
- `src/legacy/state.mjs`

Die Legacy-Dateien sind noch im Repository, aber nicht der produktive Einstieg. Wer Änderungen implementiert, sollte zuerst prüfen, ob er versehentlich im alten Pfad gelandet ist.

## Runtime-Architektur

### 1. Einstieg und Zusammensetzen der App

`src/main_v2.mjs` ist die Orchestrierungsdatei. Dort werden:

- Datenkataloge importiert
- die verschiedenen APIs erzeugt
- der globale Laufzustand verwaltet
- Event-Handler registriert
- Bewegungs-, Kampf- und Interaktionsflüsse zusammengeführt

Praktisch bedeutet das:

- Wenn eine Änderung mehrere Systeme berührt, landet ein Teil davon oft in `main_v2.mjs`.
- Wenn eine Änderung fachlich klar abgegrenzt ist, sollte sie eher im jeweiligen Fachmodul stattfinden.

### 2. Daten und Balancing

`src/data.mjs` enthält die großen statischen Kataloge:

- Monster
- Waffen
- Schilde
- Tiles
- Props/Showcases
- Storage Keys und andere Konstanten

`src/balance.mjs` definiert Regeln und Zahlenwerte:

- Raumgrößen
- Sichtweite
- Treffer- und Krit-Grenzen
- Spawnwahrscheinlichkeiten
- Skalierung über Dungeon-Tiefe
- Klassenwerte und Level-Up-Regeln

Faustregel:

- Inhaltsdefinitionen und Katalogeinträge nach `data.mjs`
- Tuning und Spawn-/Progressionslogik nach `balance.mjs`

### 3. Dungeon und Spiellogik

`src/dungeon.mjs` erzeugt Ebenen und verteilt Inhalte:

- Raum- und Ganglayout
- Treppen
- Türen und Schlüsseltüren
- Gegner
- Chests
- Boden-Loot
- Showcases/Props

Zusammen mit `src/traps.mjs`, `src/items.mjs`, `src/combat.mjs` und `src/ai.mjs` bildet das den Kern des Spiels.

Wichtige Verantwortlichkeiten:

- `combat.mjs`: Schaden, Treffer, Krits, Block und Tod
- `ai.mjs`: Gegnerentscheidungen und Verfolgung
- `items.mjs`: Inventar, Nutzung, Ausrüsten
- `loot.mjs`: Food-/Drop-Helfer
- `itemization.mjs`: Rarität und Modifier-System
- `traps.mjs`: Fallen und deren Auslösung
- `nutrition.mjs`: Hungerzustände und Nahrungswerte

### 4. State und Persistenz

`src/state_v2.mjs` kapselt:

- Frischstart eines Laufs
- Spielerprofil
- Optionen
- Savegame
- Highscores
- `localStorage`-Zugriffe

Persistiert wird lokal im Browser. Wichtig:

- Savegames und Optionen hängen an `localStorage`
- Highscores ebenfalls
- In restriktiven Browserumgebungen kann Persistenz ausfallen; der Code ist aber bereits auf defensive Storage-Zugriffe ausgelegt

### 5. Rendering und DOM

`src/dom_v2.mjs` ist eine reine DOM-Binding-Datei. Dort werden HTML-Elemente anhand ihrer IDs selektiert und exportiert.

`src/render_v2.mjs` rendert:

- das Board
- HUD/Topbar
- Player Sheet
- Enemy Sheet
- Log
- Highscores
- Inventarlisten
- Tooltips

Wenn sich eine Änderung nur auf Darstellung oder DOM-Ausgabe bezieht, ist `render_v2.mjs` meist die richtige Stelle.

## Build- und Laufmodell

### Entwicklung

1. `npm install`
2. `npm run build`
3. `index.html` im Browser öffnen

Die Seite lädt `dist/game.bundle.js`. Änderungen in `src/` werden also erst nach einem neuen Build sichtbar.

### Tests

`npm run test:e2e` macht:

1. Build
2. Start eines lokalen statischen Servers
3. Ausführung der Playwright-Suite

Die Tests sind aktuell der stärkste Qualitätsanker des Projekts.

## Teststrategie

Die Tests liegen in `tests/*.spec.js` und decken viele Bereiche ab:

- Startscreen und UI-Flows
- Navigation und Raumregeln
- Kampf
- Loot und Inventar
- Nahrung/Hunger
- Persistenz
- Smoke-Checks des Produktivpfads

Ein wichtiger Sonderfall ist `src/test-api.mjs`:

- Im normalen Runtime-Pfad ist `window.__TEST_API__` standardmäßig nicht verfügbar
- Die Tests aktivieren sie explizit über `tests/test-setup.js`
- Dadurch können Playwright-Tests gezielt Szenarien aufbauen, ohne die Produktionsgrenze dauerhaft zu öffnen

## Arbeitsregeln für Änderungen

Wenn du neu an dem Projekt arbeitest, sind diese Regeln hilfreich:

1. Prüfe zuerst, ob du im aktiven `_v2`-Pfad bist.
2. Trenne möglichst zwischen Inhaltsdaten, Balancing, Fachlogik und Rendering.
3. Nach jeder Runtime-Änderung `npm run build` ausführen.
4. Bei relevanten Änderungen `npm run test:e2e` laufen lassen.
5. Wenn ein Test sehr gezielte Spielsituationen braucht, orientiere dich an `tests/helpers.js` und `src/test-api.mjs`.

## Wo man typischerweise etwas ändert

Neue Monster, Waffen, Props:

- `src/data.mjs`

Spawnraten, Klassenwerte, Progression:

- `src/balance.mjs`

Levelgenerierung oder Schlüssel-/Tür-Logik:

- `src/dungeon.mjs`

Kampfregeln:

- `src/combat.mjs`

Gegnerverhalten:

- `src/ai.mjs`

Inventar, Ausrüsten, Benutzen:

- `src/items.mjs`

Raritäten und Affixe:

- `src/itemization.mjs`

Hunger/Nahrung:

- `src/nutrition.mjs`

Speichern, Optionen, Highscores:

- `src/state_v2.mjs`

DOM-Struktur:

- `index.html`

Darstellung:

- `styles.css`
- `src/render_v2.mjs`

## Aktuelle Stärken

- Klare Trennung zwischen HTML, CSS und Spiellogik
- Solide E2E-Abdeckung
- Aktiver Runtime-Pfad ist dokumentiert
- Test-API ist nicht mehr standardmäßig im Produktivpfad exponiert
- Build ist klein und unkompliziert

## Aktuelle Schwächen

- Einige Kernmodule sind sehr groß
- Legacy- und Aktivpfad leben parallel im selben `src`-Verzeichnis
- Kein Linter, Formatter oder CI im Repository
- `check:js` ist nützlich, aber kein vollständiger Qualitätsersatz

## Sinnvolle nächste Ausbaustufen

- `ESLint` oder `Biome` ergänzen
- Formatting standardisieren
- einfachen `dev`-Workflow ergänzen
- CI für Build/Test einrichten
- große Module schrittweise weiter zerlegen, vor allem `main_v2.mjs`
