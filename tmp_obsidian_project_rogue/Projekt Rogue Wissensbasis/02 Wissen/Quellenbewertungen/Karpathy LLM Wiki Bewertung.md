---
typ: quellenbewertung
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist.md
tags:
  - quelle
  - extern
---

# Karpathy LLM Wiki Bewertung

## Quelle
- [[../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist]]

## Kurzfassung
Der Gist bestätigt das Grundmodell unserer Wissensbasis fast vollständig: Rohquellen, Wiki-Schicht und Schema-Datei. Den größten Zusatznutzen liefert er bei der expliziten Betriebslogik für `ingest`, `query`, `lint`, beim Katalogcharakter des Index und beim parsebaren Append-only-Log.

## Relevante Aussagen
- Die Kernidee ist eine persistente, kompoundierende Wiki-Schicht zwischen Rohquellen und späteren Antworten.
- Bei neuen Quellen soll die KI nicht nur indexieren, sondern das bestehende Wiki aktiv aktualisieren.
- Gute Antworten sollen wieder als Wissen in die Wissensbasis zurückfließen.
- `index.md` soll ein inhaltsorientierter Katalog mit Link und Ein-Zeilen-Beschreibung sein.
- `log.md` soll chronologisch, append-only und parsebar sein.
- Regelmäßiges `lint` soll Widersprüche, Orphans, fehlende Verlinkungen und Datenlücken sichtbar machen.

## Zusätzlich wertvolle Umsetzungsbeobachtung
Die Kommentare unter dem Gist stärken zwei Punkte:
- Widerspruchserkennung ist oft einer der größten praktischen Mehrwerte.
- `answer from wiki first` funktioniert besser, wenn die Regel direkt in der Schema-Datei steht.

## Einschränkung
- Die Quelle beschreibt bewusst ein allgemeines Muster und keine projektspezifische Implementierung.
- Einige optionale Hinweise wie Web-Clipper, Dataview oder Such-CLI sind für unser Projekt nützlich, aber nicht zwingend.

## Betroffene Wissensseiten
- [[../Prozesse/Wiki-first Query und Linting]]
- [[../Risiken und offene Punkte/Anpassungen aus dem LLM Wiki Pattern]]
- [[../00 Uebersichten/Index]]
- [[../../00 Steuerung/Regeldatei KI-Wissenspflege]]

