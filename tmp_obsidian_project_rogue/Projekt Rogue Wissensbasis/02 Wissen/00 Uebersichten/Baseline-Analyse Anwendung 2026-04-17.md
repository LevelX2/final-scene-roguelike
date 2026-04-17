---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/package.json
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-17.txt
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
  - ../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17.md
tags:
  - baseline
  - analyse
  - verifikation
---

# Baseline-Analyse Anwendung 2026-04-17

## Kurzfassung
Diese Seite ist die primäre aktuelle Referenz für den heutigen Anwendungsstand. Am 2026-04-17 sind `npm run check:js` und `npm run build` erfolgreich gelaufen. Die Modultests laufen grundsätzlich, zeigen aber 5 echte rote Tests bei insgesamt 116 Fällen. Gleichzeitig ist die Arbeitskopie stark in Bewegung und enthält viele offene Änderungen.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/package.json]]
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-17]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]
- [[../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17]]

## Beobachtete Verifikation am 2026-04-17
- `npm run check:js`: erfolgreich
- `npm run build`: erfolgreich; `dist/game.bundle.js` wurde neu erzeugt
- `npm run test:modules`: 111 von 116 Tests grün, 5 Tests rot

## Aktive Produktivlinie
- Aktiver Einstieg bleibt `src/main.mjs`.
- Die Hauptstruktur läuft über `src/app/`, `src/application/`, `src/ui/`, `src/content/` und fachliche Kernmodule wie `src/dungeon.mjs`, `src/combat.mjs`, `src/ai.mjs`, `src/itemization.mjs`, `src/state.mjs` und `src/nutrition.mjs`.
- `src/legacy/` ist weiterhin als getrennte Altlinie vorhanden und nicht die primäre Arbeitsbasis.

## Auffällige Änderungsbereiche im heutigen Workspace
- KI und Gegnerlogik: `src/ai/`, `src/content/catalogs/monsters.mjs`, `src/content/catalogs/monster-phase-one.mjs`
- Balancing und Runtime-Gruppen: `src/balance.mjs`, `src/enemy-balance-groups.mjs`, `src/item-balance-groups.mjs`, `src/weapon-runtime-effects.mjs`
- State und Persistenz: `src/application/state-blueprint.mjs`, `src/application/state-persistence.mjs`, `src/application/derived-actor-stats.mjs`
- Dungeon- und Spawnlogik: `src/dungeon.mjs`, `src/dungeon/branch-layout.mjs`, `src/dungeon/enemy-factory.mjs`, `src/dungeon/pickup-factory.mjs`
- UI: `src/ui/board-view.mjs`, `src/ui/hud-view.mjs`, `src/ui/inventory-view.mjs`, `src/ui/tooltip-view.mjs`
- Tests: `tests/app.spec.js`, `tests/modules/branch-layout.test.mjs`, `tests/modules/monster-special-pools.test.mjs`

## Aktuelle rote Modultests
- `tests/modules/branch-layout.test.mjs`: erwartet für Slasher auf Floor 1 eine engere Standard-Monsterliste als aktuell geliefert
- `tests/modules/state-blueprint-loadouts.test.mjs`: feste Offhand-/Loadout-Erwartung schlägt fehl
- `tests/modules/state-persistence-keys.test.mjs`: Schlüssel-Normalisierung stimmt nicht mit der Erwartung überein
- `tests/modules/state-persistence-shields.test.mjs`: Schild-Normalisierung stimmt nicht mit der Erwartung überein
- `tests/modules/state-persistence.test.mjs`: transiente Modalzustände werden beim Laden nicht wie erwartet normalisiert

## Einordnung der älteren Dokumente relativ zur Baseline
- `README.md` und `docs/project-overview.md` bleiben gute operative Einstiege, sind aber nicht allein maßgeblich für den heutigen Detailstand.
- `docs/gameplay-mechanics-2026-04-14.md` und `docs/balancing-bestandsaufnahme-2026-04-17.md` bleiben starke Snapshot-Quellen.
- `docs/balancing-foundation-rationale-2026-04-17.md` erklärt die Richtung und den Umbaugrund, nicht den exakten Laufzeitstatus.
- `docs/quality-report.md` bleibt historisch wertvoll, aber nicht die primäre aktuelle Referenz.

## Bedeutung für die Wissensbasis
- Für Fragen zum aktuellen Ist-Stand zuerst diese Seite und [[Aktueller Projektstatus]] lesen.
- Für Architektur- und Änderungsorientierung danach [[Systemlandkarte]] und [[Projektueberblick]] nutzen.
- Für Designbegründungen, Balancing-Richtung und Historie gezielt die älteren Quellenbewertungen ergänzend hinzuziehen.
- Die älteren `docs/` bleiben also nicht verworfen, sondern werden von dieser Baseline überlagert und kontextualisiert.

## Verwandte Seiten
- [[Index]]
- [[Aktueller Projektstatus]]
- [[Quellenlage und Aktualitaet]]
- [[Systemlandkarte]]
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
