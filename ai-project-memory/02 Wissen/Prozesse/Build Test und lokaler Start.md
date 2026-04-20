---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-17
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
Das Projekt nutzt einen einfachen lokalen Ablauf aus Build, App-Server und Playwright-Tests. Quellcodeänderungen in `src/` werden erst nach neuem Build in `dist/game.bundle.js` sichtbar.

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
- `npm run start:test`: lokaler Server
- `npm run test:e2e`: Build plus Playwright-Suite
- `npm run test:modules`: modulnahe Tests

## Betriebsregel
- Nach Runtime-Änderungen mindestens neu baün.
- Bei Gameplay- oder UI-Änderungen möglichst die Test-Suite oder geeignete Teiltests mitlaufen lassen.

- Wenn `npm run test:e2e` unerwartet alte Laufzeitartefakte oder Smoke-Fehler zeigt, pruefen, ob auf `127.0.0.1:4173` noch ein alter Listener laeuft. Ein bereits belegter Port kann dazu fuehren, dass Playwright gegen einen veralteten Testserver laeuft.
- Lange E2E-Laeufe ueber viele Ebenen sollten keine unbeabsichtigten Kampf- oder Todeszustaende mitschleppen, wenn eigentlich nur Generierung oder Zustandserhalt geprueft wird. Solche Tests bei Bedarf vor dem Ebenenwechsel gezielt von Floor-Entitaeten bereinigen.

## Verwandte Seiten
- [[../00 Uebersichten/Aktueller Projektstatus]]
- [[../../03 Betrieb/Qualitaetspruefung]]

