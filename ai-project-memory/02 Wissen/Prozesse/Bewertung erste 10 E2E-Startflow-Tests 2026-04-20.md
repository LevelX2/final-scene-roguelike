---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17.md
  - ../00 Uebersichten/Aktueller Projektstatus.md
  - ../../../README.md
  - ../../../playwright.config.js
  - ../../../tests/app.spec.js
tags:
  - tests
  - e2e
  - startflow
  - qualitaet
---

# Bewertung erste 10 E2E-Startflow-Tests 2026-04-20

## Kurzfassung
Die ersten 10 konkreten Playwright-Tests in `tests/app.spec.js` sind im aktuellen Weiterentwicklungsstand überwiegend weiterhin sinnvoll. Sie schützen vor allem den Startflow, Tastaturbedienung, Fokusführung und Persistenz des Heldennamens. Drei Stellen sind jedoch unnötig spröde und koppeln Tests an Marketing-Text, Tooltip-Formulierungen oder konkrete Asset-Dateinamen statt an fachliches Verhalten.

## Quellenbasis
- [[../00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17]]
- [[../00 Uebersichten/Aktueller Projektstatus]]
- `README.md`
- `playwright.config.js`
- `tests/app.spec.js`

## Verifikation am 2026-04-20
- Die ersten 10 Playwright-Testfälle aus `tests/app.spec.js` wurden gezielt ausgeführt.
- Ergebnis: 10 von 10 grün.
- Abgedeckte Bereiche:
  - Startscreen-Grundzustand
  - Lore-Tooltips
  - Tastatur-Navigation im Landing-Menü
  - Fokus- und Highlight-Konsistenz
  - Persistenz des Heldennamens
  - Klassenwahl im Startmodal
  - Start per Doppelklick
  - reine Auswahl per Einzelklick
  - Tastatur-Navigation im Klassenbereich
  - Fokusübergabe vom Landing-Menü ins Modal

## Sinnvolle und weiterhin wertvolle Tests
- Die Tastatur- und Fokus-Tests bleiben hoch relevant, weil der Startflow mehrere interaktive Ebenen mit potenziell konkurrierender Navigation enthält.
- Der Persistenztest für den Heldennamen bleibt sinnvoll, weil lokale Speicherung laut Produktbild ein echter Teil des Startflows ist.
- Die Tests zur Klassenwahl, zum Einzelklick und zur Fokusübernahme ins Modal schützen reale UX-Regeln und frühere Regressionsklassen, nicht nur kosmetische Details.

## Spröde Stellen
### Startscreen-Marketingsätze
- Der Test `start screen renders the new title` prüft neben Titel und Startzustand vier vollständige Fließtextsätze.
- Das schützt weniger Verhalten als konkrete Formulierung.
- Für laufende Weiterentwicklung ist das zu eng, wenn Copy, Tonalität oder Dramaturgie angepasst werden.

### Tooltip-Wording und feste Lore-Term-Anzahl
- Der Test `landing and start modal lore terms show compact tooltips` koppelt an exakte Tooltip-Sätze und an genau `5` Lore-Begriffe im Modal.
- Für die Produktfunktion ist wichtiger, dass relevante Begriffe Tooltip-Inhalte öffnen, nicht dass Wortlaut und Gesamtanzahl unverändert bleiben.

### Asset-Dateinamen statt Klassenwirkung
- Der Test `hero class cards can be selected from the start screen` prüft nach dem Start konkrete Dateinamen wie `sprite-stuntman.svg` und `class-stuntman.svg`.
- Das ist als Integrationsschutz brauchbar, aber für Weiterentwicklung unnötig fragil, wenn Art-Pipeline, Dateibenennung oder Asset-Mapping refaktoriert werden.
- Fachlich wichtiger ist, dass die gewählte Klasse korrekt im State landet und die zugehörigen visuellen Slots überhaupt befüllt werden.

## Empfehlung
- Beibehalten:
  - Tests 3, 4, 5, 7, 8, 9 und 10 weitgehend unverändert
- Abschwächen oder umformulieren:
  - Test 1 auf Titel, Startbutton, sichtbaren Startscreen und verstecktes `gameShell`
  - Test 2 auf Tooltip-Verhalten für ausgewählte Kernbegriffe ohne feste Volltext-Sätze und ohne starre Gesamtanzahl
  - Test 6 auf Klassenzustand und vorhandene visuelle Bindung statt auf konkrete Asset-Dateinamen

## Einordnung
- Die frühen E2E-Tests sind also nicht grundsätzlich veraltet.
- Sie prüfen einen weiterhin produktrelevanten Teil des Spiels: den Einstieg in den Run.
- Der Hauptverbesserungsbedarf liegt nicht in fehlender Relevanz, sondern in zu enger Kopplung an Text- und Präsentationsdetails.

## Verwandte Seiten
- [[Build Test und lokaler Start]]
- [[../00 Uebersichten/Aktueller Projektstatus]]
- [[../../03 Betrieb/Log]]
