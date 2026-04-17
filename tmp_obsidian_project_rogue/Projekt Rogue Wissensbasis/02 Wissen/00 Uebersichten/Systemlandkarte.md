---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/package.json
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/js-architecture-report.md
tags:
  - architektur
  - system
---

# Systemlandkarte

## Kurzfassung
Die aktive Anwendung besteht aus einem modularen Runtime-Pfad mit `src/main.mjs` als Composition Root, einem Schichtenzuschnitt über `src/app/`, `src/application/`, `src/ui/`, `src/content/` sowie mehreren fachlichen Kernmodulen für Dungeon, Kampf, KI, Items, Hunger und State.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/package.json]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/js-architecture-report]]

## Einstieg und Laufzeit
- Browser-Einstieg: `index.html`
- Runtime-Einstieg: `src/main.mjs`
- Build-Ausgabe: `dist/game.bundle.js`
- Lokaler Server: `server.mjs`

## Schichten und Verantwortungen
- `src/app/`: Bootstrap, Assemblies, Runtime-Kontext, Startflow, Render-Zyklus
- `src/application/`: Application-Services für Input, Floor-Wechsel, Savegame, Inventar, Sichtbarkeit, Audio
- `src/ui/`: Views und DOM-nahe Darstellung
- `src/content/`: Kataloge und inhaltliche Datenquellen
- Fachmodule wie `dungeon.mjs`, `combat.mjs`, `ai.mjs`, `itemization.mjs`, `nutrition.mjs`, `state.mjs`

## Test- und Betriebsseite
- `tests/*.spec.js`: E2E-Szenarien
- `tests/modules/*.test.mjs`: Modulnahe Tests
- Playwright wird über `npm run test:e2e` gestartet

## Architekturbeobachtung
Die Dokumentation beschreibt eine bereits fortgeschrittene Modularisierung, nennt aber weiterhin zentrale Engpässe in `main.mjs` und `dungeon.mjs`. Das Projekt ist also in einer Zwischenphase zwischen funktionierender Modularisierung und weiterem Strukturumbau.

## Verwandte Seiten
- [[Projektueberblick]]
- [[../Entscheidungen/Aktiver Runtime-Pfad und Legacy-Abgrenzung]]
- [[../Risiken und offene Punkte/Architektur und Wartbarkeit]]

