---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/repo-root/package.json
  - ../../01 Rohquellen/web/PHP_CodeSniffer Referenz 2026-04-20.md
tags:
  - tests
  - tooling
  - qa
---

# Einordnung PHP CodeSniffer für dieses Projekt 2026-04-20

## Kurzfassung
Wenn mit `Codesnif` das verbreitete Tool `PHP_CodeSniffer` gemeint ist, ist es für `The Final Scene` nicht das richtige Hauptwerkzeug zum Testen. Das Repository ist aktuell auf JavaScript- und Playwright-Verifikation ausgelegt, während PHP_CodeSniffer ein PHP-Tool für Coding-Standards ist.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/package.json]]
- [[../../01 Rohquellen/web/PHP_CodeSniffer Referenz 2026-04-20]]

## Projektbezug
- `package.json` zeigt für dieses Repository `npm run check:js`, `npm run test:modules` und `npm run test:e2e`.
- Die bestehende Verifikation deckt Syntax, modulnahe Logik und Browser-E2E ab.
- Ein PHP-basierter Linter passt weder sprachlich noch operativ zum dokumentierten Hauptstack.

## Wofür PHP CodeSniffer taugt
- Stil- und Standardprüfung in PHP-Codebasen
- teilautomatische Korrektur von Regelverletzungen

## Wofür es hier nicht taugt
- keine Ausführung der vorhandenen Node-Modultests
- keine Ausführung der Playwright-E2E-Tests
- keine fachliche Verifikation des Spielverhaltens im Browser

## Empfehlung für dieses Projekt
- Vorhandenen Testpfad beibehalten: `npm run check:js`, `npm run test:modules`, `npm run test:e2e`
- Wenn zusätzliche automatische Codequalität gewünscht ist, eher JavaScript-passende Werkzeuge wie ESLint oder spätere statische Regeln für die aktiven Runtime-Pfade prüfen
- Externe KI- oder Review-Tools nur als Ergänzung nutzen, nicht als Ersatz für die bestehende Testpyramide
