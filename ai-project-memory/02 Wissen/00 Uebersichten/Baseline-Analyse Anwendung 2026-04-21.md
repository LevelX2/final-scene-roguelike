---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/package.json
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-21.txt
  - ../../01 Rohquellen/docs/project-overview.md
tags:
  - baseline
  - analyse
  - verifikation
---

# Baseline-Analyse Anwendung 2026-04-21

## Kurzfassung
Diese Seite hält zwei am 2026-04-21 verifizierte Stände auseinander: den früheren sauberen Snapshot mit Build-Bruch und den späteren lokalen Arbeitsstand mit offenen Änderungen. Im aktuellen Workspace läuft `npm run verify` nach gezielter Test- und Test-API-Korrektur vollständig grün.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/package.json]]
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-21]]
- [[../../01 Rohquellen/docs/project-overview]]

## Beobachtete Verifikation am 2026-04-21
- `git status --short`: keine Ausgabe; die Arbeitskopie ist sauber.
- `npm run verify:quick`: fehlgeschlagen bereits in `lint:strict`.
- `npm run build`: fehlgeschlagen.

## Konkrete Fehlerbilder
- `src/ai/enemy-turns.mjs`: Parsing-Fehler `Unexpected token` in der ESLint-Prüfung und `Unexpected end of file` im Build. Der aktive Browser-Build ist dadurch aktuell blockiert.
- `src/application/targeting-service.mjs`: ESLint-Fehler `no-extra-boolean-cast` in Zeile `108`.

## Zusätzliche Verifikation am 2026-04-21 auf lokalem Arbeitsstand
- `git status --short`: Arbeitskopie nicht sauber; unter anderem Änderungen in Runtime, Tests und Wissensbasis.
- `npm run verify`: erfolgreich.
- `test:modules`: 212 von 212 Tests grün.
- `test:e2e`: 189 von 189 Tests grün.

## Verifizierte Ursachen und Korrekturen im lokalen Arbeitsstand
- Die beiden zuvor roten E2E-Kampftests prüften einen Gegner mit Fernkampfwaffe im Nahkontakt oder auf nicht deterministischem Kartenlayout. Dadurch wich die KI aus oder verlor die Sichtlinie, statt den erwarteten Angriff auszuführen.
- `tests/combat.spec.js` prüft diese Fälle jetzt auf freigeräumtem Testfeld und mit Distanz-Setup für einen echten Fernkampfangriff.
- `src/application/test-api-mutators.mjs` behandelt explizite `null`-Werte für Haupt- und Nebenhand nun korrekt, sodass Testaufbauten Ausrüstung zuverlässig entfernen können.

## Release-Einordnung
- Das Repository beschreibt sich im README weiterhin als Vorabversion `0.1.0-alpha.1`.
- Der saubere Snapshot vom selben Tag bleibt nicht releasefähig, solange der Build des aktiven Runtime-Pfads dort scheitert.
- Der aktuelle lokale Arbeitsstand ist nach dem vollständigen grünen Verify-Lauf deutlich näher an einem belastbaren Alpha-Stand.
- Für einen belastbaren Alpha-Stand sollte mindestens `npm run verify` auf einem bewusst gewählten, nachvollziehbaren Workspace-Stand vollständig grün sein.

## Verhältnis zu älteren Statusseiten
- [[Baseline-Analyse Anwendung 2026-04-17]] bleibt ein historisch nützlicher Snapshot.
- Die ältere Baseline ist für heutige Ist-Aussagen überholt.
- Die heutige Referenz muss zwischen sauberem Snapshot mit Build-Bruch und lokalem Arbeitsstand mit offenen Änderungen unterscheiden.
- Das README ist für die Versionseinordnung weiterhin nützlich, aber sein Abschnitt zur lokal erfolgreichen Verifikation ist weder für den sauberen Snapshot noch für den aktuellen lokalen Volltest vollständig bestätigt.

## Verwandte Seiten
- [[Index]]
- [[Aktueller Projektstatus]]
- [[Quellenlage und Aktualitaet]]
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
