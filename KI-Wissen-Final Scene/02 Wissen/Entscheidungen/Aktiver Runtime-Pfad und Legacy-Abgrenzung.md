---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/quality-report.md
tags:
  - architektur
  - entscheidung
---

# Aktiver Runtime-Pfad und Legacy-Abgrenzung

## Kurzfassung
Die aktive Produktivlinie läuft über `src/main.mjs` und die modularen Bereiche unter `src/app/`, `src/application/`, `src/ui/` und `src/content/`. Legacy-Dateien bleiben im Repository, sind aber nicht der bevorzugte Produktivpfad.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/quality-report]]

## Entscheidungsinhalt
- Aktiver Einstieg und Build sollen eindeutig dokumentiert sein.
- Legacy dient als Referenz oder Altpfad, nicht als gleichrangige Arbeitsbasis.

## Wirkung
- Neu Änderungen sollen gegen den aktiven Runtime-Pfad entwickelt werden.
- Dokumentation, Reviews und Wissenspflege müssen Legacy klar von aktivem Code trennen.

## Offene Restspannung
- Legacy liegt weiterhin im Repository und kann bei fehlender Disziplin wieder driften.

## Verwandte Seiten
- [[../00 Uebersichten/Systemlandkarte]]
- [[../Risiken und offene Punkte/Architektur und Wartbarkeit]]

