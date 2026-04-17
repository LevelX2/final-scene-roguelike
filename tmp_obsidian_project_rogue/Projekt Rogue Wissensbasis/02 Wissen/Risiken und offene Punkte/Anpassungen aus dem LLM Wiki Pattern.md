---
typ: risiko
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist.md
  - ../../02 Wissen/Quellenbewertungen/Karpathy LLM Wiki Bewertung.md
tags:
  - risiko
  - anpassung
---

# Anpassungen aus dem LLM Wiki Pattern

## Kurzfassung
Die bisherige Wissensbasis passt bereits gut zum beschriebenen LLM-Wiki-Muster. Anpassungsbedarf besteht vor allem nicht im Grundaufbau, sondern in der Strenge des Betriebsmodells.

## Quellenbasis
- [[../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist]]
- [[../Quellenbewertungen/Karpathy LLM Wiki Bewertung]]

## Bereits gut abgedeckt
- Trennung von Rohquellen, Wissensbereich und Steuerungsdatei
- Index- und Log-Datei vorhanden
- Quellenbewertungen und Unsicherheitsmarkierung vorhanden
- projektbezogene Abgrenzung vorhanden

## Sinnvolle Anpassungen
- `wiki-first` als feste Antwortregel explizit verankern
- Index nicht nur als Navigation, sondern als Katalog mit Kurzbeschreibung pflegen
- Log parsebar und append-only führen
- Linting um Orphans, fehlende Pflichtabschnitte und defekte Links erweitern
- externe Webquellen disziplinierter als Rohquellen-Referenz oder lokaler Snapshot ablegen
- wiederverwendbare Analyseantworten stärker als eigene Wissensseiten zurückführen

## Kein unmittelbarer Muss-Punkt
- Such-CLI, Dataview oder Git-Workflow sind nützliche Ausbaustufen, aber aktuell nicht notwendig, solange die Wissensbasis noch moderat groß ist.

## Verwandte Seiten
- [[../Prozesse/Wiki-first Query und Linting]]
- [[Dokumentationsstand und Verifikationsluecken]]

