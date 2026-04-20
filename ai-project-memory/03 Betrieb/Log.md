# Log

## Format
- Datum
- Anlass oder Quelle
- Neu angelegte Seiten
- Geänderte Seiten
- Kern der inhaltlichen Anpassung

## Einträge

## [2026-04-17] create | Initiale Projekt-Wissensbasis
- Anlass oder Quelle: Initiale projektbezogene Wissensbasis für `Projekt Rogue`
- Neu angelegte Seiten:
  - [[../00 Projektstart]]
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Projektueberblick]]
  - [[../02 Wissen/00 Uebersichten/Systemlandkarte]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - weitere verlinkte Begriffs-, Prozess-, Risiko- und Quellenbewertungsseiten
- Geänderte Seiten:
  - keine
- Kern der inhaltlichen Anpassung:
  - Rohquellen aus dem Repository unverändert kopiert.
  - Projektwissen aus README, Architekturdoku, Gameplay-Doku, Balancing-Bestandsaufnahme, Quality Report und Design Notes strukturiert verdichtet.
  - Unterschied zwischen dokumentiertem Projektstand und aktuellem Workspace-Snapshot explizit festgehalten.

## [2026-04-17] ingest | Karpathy LLM Wiki Gist
- Anlass oder Quelle: externe Referenz [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist]]
  - [[../02 Wissen/Quellenbewertungen/Karpathy LLM Wiki Bewertung]]
  - [[../02 Wissen/Prozesse/Wiki-first Query und Linting]]
  - [[../02 Wissen/Risiken und offene Punkte/Anpassungen aus dem LLM Wiki Pattern]]
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - `wiki-first` als explizite Antwortreihenfolge verankert.
  - Index auf Katalogcharakter mit Kurzbeschreibungen geschärft.
  - Parsebares Log-Format und stärkere Lint-Regeln festgelegt.

## [2026-04-17] create | Workflowbeschreibung für Projektarbeit
- Anlass oder Quelle: Bedarf nach einer praktischen Anleitung für die Nutzung und Pflege der Projekt-Wissensbasis
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Alltäglichen Workflow für Quellenaufnahme, wiki-first Antworten, Rückführung von Erkenntnissen und Health-Checks als eigene Prozessseite dokumentiert.

## [2026-04-17] ingest | Balancing Foundation Rationale
- Anlass oder Quelle: neu Projektquelle `docs/balancing-foundation-rationale-2026-04-17.md`
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Balancing-Fundament und Vereinheitlichungsprinzipien]]
  - [[../02 Wissen/Quellenbewertungen/Balancing Foundation Rationale Bewertung]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Spielsysteme im Ueberblick]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Konzeptionelle Rationale hinter den jüngsten Balancing-Vereinheitlichungen als eigenes Wissenselement aufgenommen.
  - Bestehende Balancing-Bestandsaufnahme um die Begründungsebene ergänzt.

## [2026-04-17] curate | Quellenstatus der docs-Dateien
- Anlass oder Quelle: Bedarf nach kuratierter Einordnung der übernommenen `docs/`-Quellen
- Neu angelegte Seiten:
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/Quellenbewertungen/JS-Architekturbericht Bewertung]]
- Geänderte Seiten:
  - [[../00 Projektstart]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - mehrere bestehende Quellenbewertungen
- Kern der inhaltlichen Anpassung:
  - `docs/`-Quellen nach operativer Brauchbarkeit, Snapshot-Charakter, historischem Status und Designrichtungscharakter eingeordnet.
  - Menschlicher Lesepfad für den Einstieg in die Wissensbasis verbessert.

## [2026-04-17] update | Sprachregel für Umlaute und ß
- Anlass oder Quelle: neu Vorgabe für sichtbare deutsche Texte in UI und Wissensbasis
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
- Kern der inhaltlichen Anpassung:
  - Für normale deutsche Texte echte Umlaute und `ß` als Standard festgelegt.
  - Ausnahmen für Dateinamen, Pfade, Code-Symbole, IDs und originale technische Bezeichnungen dokumentiert.

## [2026-04-17] fix | Umlaut-Normalisierung und Sprachregeln bereinigt
- Anlass oder Quelle: fehlerhafte automatische Ersetzung bei der Umstellung auf echte Umlaute
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - [[../02 Wissen/Quellenbewertungen/Karpathy LLM Wiki Bewertung]]
  - weitere Wissensseiten mit bereinigten Schreibweisen
- Kern der inhaltlichen Anpassung:
  - Falsche Ersetzungen wie `Qülle`, `aktülle` oder `Projekt Rogü` rückgängig gemacht.
  - Fließtexte in der Wissensbasis sprachlich normalisiert und auf echte Umlaute bzw. `ß` ausgerichtet.
  - Technische Dateinamen, Pfade und bestehende Links bewusst unverändert gelassen.

## [2026-04-17] analyse | Baseline-Anwendung als primäre aktuelle Referenz
- Anlass oder Quelle: Bedarf nach einer frischen Komplettanalyse statt alleiniger Nutzung älterer `docs/`
- Neu angelegte Seiten:
  - [[../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17]]
- Geänderte Seiten:
  - [[../00 Projektstart]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Frische Baseline aus aktuellem Workspace, Build, Syntax-Check und Modultest-Stand als neue Hauptreferenz aufgenommen.
  - Ältere `docs/` nicht verworfen, sondern gegenüber der Baseline als Kontext-, Snapshot- oder Rationale-Quellen eingeordnet.
  - Aktuelle rote Modultest-Bereiche und laufende Umbauzonen explizit sichtbar gemacht.

