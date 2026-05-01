---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-28
quellen:
  - ../../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-21.md
  - ../../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17.md
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-21.txt
  - ../../01 Rohquellen/docs/quality-report.md
tags:
  - status
  - verifikation
---

# Aktueller Projektstatus

## Kurzfassung
Am 2026-04-28 liegt der Workspace nach dem Umzug nach `C:\Projekte\final-scene-main` auf dem Arbeitsbranch `codex/umzug-verifikation`. Git, Build, Wissensbasis-Encoding, lokaler App-Server und `npm run verify` funktionieren nach der Korrektur zweier Zielmodus-E2E-Setups und zweier mehrstöckiger Navigationstest-Setups wieder vollständig.

## Quellenbasis
- [[Baseline-Analyse Anwendung 2026-04-21]]
- [[Baseline-Analyse Anwendung 2026-04-17]]
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-21]]
- [[../../01 Rohquellen/docs/quality-report]]

## Frische Verifikation am 2026-04-28 im neuen Verzeichnis
- Arbeitsverzeichnis: `C:\Projekte\final-scene-main`.
- `git status --short --branch`: sauberer `main`, abgeglichen mit `origin/main`.
- `git fetch --dry-run --verbose origin`: `main` ist auf dem Stand von `origin/main`.
- Letzter Commit: `e8bab53 Ignore Codex app workspace state`.
- Node/npm: Node `v24.15.0`, npm `11.12.1`, `node_modules/` und `package-lock.json` vorhanden.
- `npm run build`: erfolgreich, erzeugt `dist/game.bundle.js`.
- `npm run check:memory`: erfolgreich, 60 Dateien geprüft.
- Lokaler Server nach Build über `node ./server.mjs --port 4173`: antwortet mit HTTP 200, Seitentitel `The Final Scene`, Inhalt enthält `The Final Scene`.
- `npm run verify`: Quick-Anteil erfolgreich, Playwright-E2E rot mit 188 bestandenen und 2 fehlgeschlagenen Tests.
- Die zwei Playwright-Fehler sind isoliert reproduzierbar; auf `127.0.0.1:4173` war danach kein alter Listener sichtbar.

## Behebung der Zielmodus-E2E-Fehler am 2026-04-28
- Ursache: Beide roten E2E-Setups prüften Fernkampf-Targeting gegen Gegner, die nach der aktuellen FOV-Regel nicht als taktisch wahrnehmbar galten. Der Zielmodus verhielt sich damit korrekt und meldete `Kein Ziel`, während die Tests eigentlich Deckung beziehungsweise Chebyshev-Reichweite isoliert prüfen wollten.
- `tests/app.spec.js:1726`: Das Deckungssetup wurde auf eine sichtbare Eckdeckung umgestellt. Erwartung `Teildeckung` und `61%` bleibt erhalten.
- `tests/app.spec.js:2510`: Das Chebyshev-Setup wurde auf eine sichtbare freie Winkelposition mit Chebyshev-Distanz `4` und Manhattan-Distanz `5` umgestellt. Erwarteter Cursor ist nun `5,2`.
- `src/application/test-api-mutators.mjs` aktualisiert die Sicht nach `setupCombatScenario()` explizit, bevor das Testsetup gerendert wird.
- Im anschließenden Volltest wurden zusätzlich zwei mehrstöckige Navigationstests stabilisiert: `tests/navigation.spec.js:1001` und `tests/navigation.spec.js:1115` räumen vor Studioübergängen nun Floor-Entitäten weg, damit reine Layoutprüfungen keine Kampf- oder Todeszustände mitschleppen.
- `npm run verify`: erfolgreich; Quick-Anteil grün, Playwright `190 passed`.

## Verifizierter Stand am 2026-04-21
- `git status --short` ist leer; die Arbeitskopie ist sauber.
- `npm run verify:quick` scheitert bereits in `lint:strict`.
- `npm run build` scheitert wegen `src/ai/enemy-turns.mjs`.
- Der aktive Browser-Build ist damit aktuell blockiert.

## Zusätzlicher lokaler Arbeitsstand am 2026-04-21
- `git status --short` zeigt offene lokale Änderungen in Code, Tests und Wissensbasis.
- `npm run verify` läuft durch `lint:strict`, `check:js`, `test:modules`, Build und Playwright erfolgreich durch.
- Der Volltest ist lokal vollständig grün.

## Konkrete aktuelle Blocker
- Keine frisch beobachteten Build-, Lint-, Modul- oder E2E-Blocker im Verify-Lauf vom 2026-04-28 nach der Zielmodus-Testkorrektur.
- Die früheren Build- und Lint-Blocker aus `src/ai/enemy-turns.mjs` und `src/application/targeting-service.mjs` wurden am 2026-04-28 nicht erneut beobachtet; Build und Quick-Check laufen durch.
- README und historische Quality-/Baseline-Aussagen zur lokal erfolgreichen Verifikation gelten nur eingeschränkt und müssen gegen den jeweils gemeinten Workspace-Stand gelesen werden.
- Der grüne lokale Volltest vom 2026-04-21 wurde durch einen frischen grünen Verify-Lauf am 2026-04-28 ergänzt.

## Bedeutung für Release- und Arbeitsentscheidungen
- Ein Alpha-Release sollte nur auf einem klar benannten Workspace-Stand erzeugt werden.
- Für öffentliche Zwischenstände ist ein grüner Volltest `npm run verify` die verlässlichere Schwelle als nur ein grüner Build; diese Schwelle ist am 2026-04-28 im Arbeitsbranch `codex/umzug-verifikation` erreicht.
- Die Baseline vom 2026-04-17 bleibt nützlich, darf aber nicht mehr als heutiger Ist-Stand gelesen werden.

## Bedeutung für diese Wissensbasis
- Historische Dokumente bleiben wertvolle Primärquellen.
- Aussagen über den exakten Ist-Stand sollen zuerst [[Baseline-Analyse Anwendung 2026-04-21]] berücksichtigen.
- README-Aussagen zur erfolgreichen Verifikation sind aktuell nur als historischer oder beabsichtigter Zielstand zu lesen, nicht als pauschal frisch bestätigter Zustand.
- Ohne frische Verifikation soll kein veröffentlichungsreifer oder vollständig grüner Status behauptet werden.
- Bei offenen lokalen Änderungen muss die Wissensbasis sauber zwischen sauberem Snapshot und aktuellem Arbeitsstand unterscheiden.

## Verwandte Seiten
- [[Baseline-Analyse Anwendung 2026-04-21]]
- [[Projektueberblick]]
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
- [[../../03 Betrieb/Qualitaetspruefung]]
