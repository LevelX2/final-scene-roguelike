---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/package.json
  - ../../01 Rohquellen/docs/project-overview.md
tags:
  - build
  - test
  - betrieb
---

# Build Test und lokaler Start

## Kurzfassung
Das Projekt nutzt einen einfachen lokalen Ablauf aus Build, statischer JavaScript-Prüfung, Modultests, App-Server und Playwright-Tests. Für einen gemeinsamen Qualitätslauf gibt es jetzt `npm run verify`, wobei bereits ESLint-Warnungen den Schnelllauf blockieren.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/package.json]]
- [[../../01 Rohquellen/docs/project-overview]]

## Standardablauf
1. `npm install`
2. `npm run build`
3. `npm run start:app`
4. Browser auf `http://127.0.0.1:4173`

## Wichtige Skripte
- `npm run build`: bundle nach `dist/game.bundle.js`
- `npm run check:js`: Syntaxprüfung auf Kernmodulen
- `npm run lint`: statische JavaScript-Prüfung über den aktiven Projektpfad
- `npm run lint:strict`: ESLint mit Fehler bei Warnungen
- `npm run verify:quick`: `lint:strict`, `check:js` und `test:modules`
- `npm run verify`: vollständiger Sammellauf aus `verify:quick` plus `test:e2e`
- `npm run start:test`: lokaler Server
- `npm run test:e2e`: Build plus Playwright-Suite
- `npm run test:modules`: modulnahe Tests

## Betriebsregel
- Nach Runtime-Änderungen mindestens neu bauen.
- Für einen vollständigen lokalen Qualitätslauf bevorzugt `npm run verify` verwenden.
- Für schnelle Vorprüfung vor größeren Änderungen oder Commits ist `npm run verify:quick` der passende Einstieg.
- `check:js` läuft über ein eigenes Skript und gibt deshalb nur noch eine kurze lesbare Statusmeldung statt einer sehr langen Shell-Kette aus.
- Bei Gameplay- oder UI-Änderungen möglichst die Test-Suite oder geeignete Teiltests mitlaufen lassen.
- Wenn `npm run test:e2e` unerwartet alte Laufzeitartefakte oder Smoke-Fehler zeigt, prüfen, ob auf `127.0.0.1:4173` noch ein alter Listener läuft. Ein bereits belegter Port kann dazu führen, dass Playwright gegen einen veralteten Testserver läuft.
- Lange E2E-Läufe über viele Ebenen sollten keine unbeabsichtigten Kampf- oder Todeszustände mitschleppen, wenn eigentlich nur Generierung oder Zustandserhalt geprüft wird. Solche Tests bei Bedarf vor dem Ebenenwechsel gezielt von Floor-Entitäten bereinigen.

## Verwandte Seiten
- [[../00 Uebersichten/Aktueller Projektstatus]]
- [[../../03 Betrieb/Qualitaetspruefung]]
