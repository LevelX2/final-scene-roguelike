---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-21
quellen:
  - ../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist.md
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
tags:
  - prozess
  - query
  - lint
---

# Wiki-first Query und Linting

## Kurzfassung
Fragen zum Projekt sollen zuerst gegen den bestehenden Wiki-Bestand beantwortet werden. Rohquellen und externe Recherche kommen danach nur als Vertiefung oder Verifikation. Parallel dazu braucht die Wissensbasis wiederkehrende Health-Checks.

## Quellenbasis
- [[../../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist]]
- [[../../00 Steuerung/Regeldatei KI-Wissenspflege]]

## Query-Reihenfolge
1. [[../00 Uebersichten/Index]] lesen.
2. Relevante Wissensseiten im Zusammenhang lesen.
3. Nur bei Lücken, Konflikten oder frischem Bedarf in Rohquellen oder externe Quellen gehen.
4. Antwort mit klarer Sicherheitseinstufung formulieren.
5. Wiederverwendbare Erkenntnisse in die Wissensbasis zurückführen.

## Lint-Checks
- Widersprüche zwischen Seiten
- veraltete Aussagen nach neuen Quellen
- Orphan-Seiten ohne sinnvolle Verlinkung
- wichtige Begriffe ohne eigene Seite
- fehlende Querverweise
- defekte Links
- fehlende Pflichtabschnitte wie Kurzfassung, Quellenbasis oder Verwandte Seiten
- Kodierungsfehler wie ungültiges UTF-8, sichtbare Ersatzzeichen oder falsch decodierte Umlaute und Sonderzeichen

## Technischer Check
- Für den technischen Health-Check der Wissensbasis `npm run check:memory` nutzen.
- Der Lauf prüft `ai-project-memory/` auf striktes UTF-8 in `md`, `json` und `txt`.
- Zusätzlich meldet er typische Fehlmuster aus falsch decodierten Umlauten oder Sonderzeichen, bevor solche Stellen in weiteren Threads weiterkopiert werden.

## Betriebsnutzen
- Antworten werden schneller und konsistenter.
- Wissen verschwindet nicht in Chats.
- Pflege wird zu einem expliziten Arbeitsgang statt zu einer impliziten Hoffnung.

## Verwandte Seiten
- [[Quellenverarbeitung in dieser Wissensbasis]]
- [[../Quellenbewertungen/Karpathy LLM Wiki Bewertung]]
- [[../../03 Betrieb/Qualitaetspruefung]]
