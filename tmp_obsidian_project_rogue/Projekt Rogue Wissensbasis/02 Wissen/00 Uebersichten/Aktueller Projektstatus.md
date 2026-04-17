---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17.md
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-17.txt
  - ../../01 Rohquellen/docs/quality-report.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
  - ../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17.md
tags:
  - status
  - verifikation
---

# Aktueller Projektstatus

## Kurzfassung
Das Projekt ist aktuell syntaxsauber und baubar. Die heutige Baseline zeigt aber 5 rote Modultests sowie viele offene Workspace-Änderungen. Damit ist der Stand belastbarer als reine Altdoku, aber noch nicht vollständig grün oder stabil konsolidiert.

## Quellenbasis
- [[Baseline-Analyse Anwendung 2026-04-17]]
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-17]]
- [[../../01 Rohquellen/docs/quality-report]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]
- [[../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17]]

## Verifizierter Stand am 2026-04-17
- `npm run check:js` ist erfolgreich gelaufen.
- `npm run build` ist erfolgreich gelaufen.
- `npm run test:modules` zeigt 111 grüne und 5 rote Tests.
- Die Anwendung befindet sich also nicht in einem generellen Build-Bruch, aber auch nicht in einem vollständig grünen Modulzustand.

## Beobachteter Workspace-Stand am 2026-04-17
- Die Arbeitskopie ist nicht sauber.
- Offene Änderungen betreffen unter anderem KI, App-Assembly, State, Dungeon, Balance, UI und Tests.
- Neue Dateien wie `src/enemy-balance-groups.mjs`, `src/item-balance-groups.mjs`, `src/weapon-runtime-effects.mjs` und `src/application/derived-actor-stats.mjs` zeigen eine laufende strukturelle Weiterentwicklung.

## Aktuelle rote Bereiche
- Branch-Layout / frühe Slasher-Monsterauswahl
- State-Blueprint / Loadouts
- State-Persistenz für Schlüssel
- State-Persistenz für Schilde
- State-Persistenz für transiente Modalzustände

## Bedeutung für diese Wissensbasis
- Historische Dokumente bleiben wertvolle Primärquellen.
- Aussagen über den exakten Ist-Stand sollen zuerst die Baseline berücksichtigen und erst danach ältere Doku ergänzend heranziehen.
- Ohne frische Verifikation soll kein vollständig konsolidierter "alles ist grün"-Status behauptet werden.
- Konzeptionelle Quellen wie die Balancing-Rationale erklären den Umbaugrund, ersetzen aber keine Laufzeit- oder Testverifikation.

## Verwandte Seiten
- [[Baseline-Analyse Anwendung 2026-04-17]]
- [[Projektueberblick]]
- [[../Begriffe und Konzepte/Balancing-Fundament und Vereinheitlichungsprinzipien]]
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
- [[../../03 Betrieb/Qualitaetspruefung]]

