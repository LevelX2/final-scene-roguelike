---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-21.txt
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/js-architecture-report.md
  - ../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
  - ../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17.md
  - ../../01 Rohquellen/docs/quality-report.md
  - ../../01 Rohquellen/docs/design-notes.md
tags:
  - quellen
  - aktualität
  - orientierung
---

# Quellenlage und Aktualität

## Kurzfassung
Die `docs/`-Dateien wurden bewusst als Rohquellen übernommen, aber nicht alle davon beschreiben denselben Wahrheitsstatus. Diese Seite hilft dabei, zwischen operativ brauchbaren Quellen, historischen Schnappschüssen, offenen Designnotizen und konzeptionellen Rationale-Texten zu unterscheiden.

## Primäre aktuelle Referenz
- [[Baseline-Analyse Anwendung 2026-04-21]] ist die bevorzugte aktuelle Referenz für den heute verifizierten Workspace-, Build- und Schnellverifikationsstand.
- [[Baseline-Analyse Anwendung 2026-04-17]] bleibt als älterer Snapshot nützlich, ist für heutige Ist-Aussagen aber nachgeordnet.
- Die älteren `docs/` bleiben wichtige Kontextquellen, werden für Ist-Aussagen aber dieser Baseline untergeordnet.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-21]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/js-architecture-report]]
- [[../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]
- [[../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17]]
- [[../../01 Rohquellen/docs/quality-report]]
- [[../../01 Rohquellen/docs/design-notes]]

## Einordnung nach praktischer Nutzung
- `README.md`: guter operativer Einstieg, aber nicht alleinige Wahrheit für den exakten Live-Stand; Aussagen zur lokal sauberen Verifikation müssen derzeit gegen die 2026-04-21-Baseline gegengehalten werden.
- `project-overview.md`: gute Architektur- und Arbeitsorientierung, tendenziell brauchbar, aber driftgefährdet.
- `js-architecture-report.md`: Mischung aus Analyse und Zielbild; für heutige Fakten nur mit Vorsicht direkt verwenden.
- `gameplay-mechanics-2026-04-14.md`: starke fachliche Quelle für Regelwirkung, aber zeitlich snapshot-gebunden.
- `balancing-bestandsaufnahme-2026-04-17.md`: sehr wertvoller Code-Snapshot für Balanceachsen und Systemstruktur.
- `balancing-foundation-rationale-2026-04-17.md`: konzeptionelle Begründung, keine Live-Verifikation.
- `quality-report.md`: historisierte Qualitätsquelle mit Statusstand zum Dokumentdatum.
- `design-notes.md`: offene Designrichtungen, explizit kein Ist-Zustand.

## Empfohlene Statusstufen
- `operativ brauchbar`: guter Einstieg für aktuelle Arbeit, aber bei Bedarf gegen Workspace oder Code prüfen
- `snapshot-gebunden`: stark für einen dokumentierten Stand, aber nicht automatisch live-aktuell
- `historisch / statusgebunden`: als Verlauf oder Kontext wichtig, nicht als aktuelle Wahrheit
- `zielbild / rationale`: erklärt Richtung oder Begründung, nicht den exakten Ist-Zustand
- `offene designrichtung`: Idee oder Option, nicht implementierte Funktion

## Empfohlener Lesepfad für Menschen
1. [[Projektueberblick]]
2. [[Baseline-Analyse Anwendung 2026-04-21]]
3. [[Aktueller Projektstatus]]
4. diese Seite hier
5. danach je nach Frage eine passende Wissensseite oder Quellenbewertung

## Verwandte Seiten
- [[Index]]
- [[Baseline-Analyse Anwendung 2026-04-21]]
- [[Aktueller Projektstatus]]
- [[../Quellenbewertungen/README Bewertung]]
- [[../Quellenbewertungen/Project Overview Bewertung]]
- [[../Quellenbewertungen/JS-Architekturbericht Bewertung]]
