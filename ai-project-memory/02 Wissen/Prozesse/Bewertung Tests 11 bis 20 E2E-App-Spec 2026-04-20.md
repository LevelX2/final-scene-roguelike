---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17.md
  - ../00 Uebersichten/Aktueller Projektstatus.md
  - ../../../README.md
  - ../../../tests/app.spec.js
  - ../../../src/content/start-loadouts.mjs
  - ../../../src/app/start-flow.mjs
tags:
  - tests
  - e2e
  - inventory
  - startflow
  - container
---

# Bewertung Tests 11 bis 20 E2E-App-Spec 2026-04-20

## Kurzfassung
Die Testfälle 11 bis 20 in `tests/app.spec.js` sind fachlich überwiegend sinnvoll und decken wichtige Integrationen zwischen Klassen-Startausstattung, Startflow, Highscore-Anzeige, Inventar, Container-Interaktion und Heal-Overlay ab. Beim Review liefen 10 von 10 grün. Mehrere Tests sind jedoch unnötig eng an Asset-Dateinamen oder Pixel-Geometrie gekoppelt.

## Verifikation am 2026-04-20
- Die konkreten Testfälle 11 bis 20 aus `tests/app.spec.js` wurden gezielt ausgeführt.
- Ergebnis: 10 von 10 grün.

## Bereich 1: Klassen-Startausstattung und Startflow
- `each hero class starts with its configured opening weapon setup` bleibt fachlich sehr sinnvoll.
- `hero classes receive their configured starting loadouts` bleibt ebenfalls sinnvoll, weil Startinventar ein echter Produktbaustein ist.
- `starting from the modal reuses the already prepared first studio` schützt eine wichtige Integrationsannahme im Startflow und vermeidet stille Re-Rolls.

### Einordnung
- Diese drei Tests sind für laufende Weiterentwicklung wertvoll.
- Sie sichern nicht nur UI, sondern Produktlogik.
- Der Bereich könnte später noch um Offhand-, Schlüssel- oder Klassenpassiven-Starts erweitert werden.

## Bereich 2: Highscores und visuelle Klassenzuordnung
- `highscores render class icons for stored runs` ist als Integrationsidee sinnvoll.
- Die aktuelle Assertion auf eine konkrete Asset-Datei ist jedoch spröde.
- Fachlich wichtiger wäre, dass gespeicherte Klassen einer sichtbaren Badge- oder Icon-Repräsentation korrekt zugeordnet werden.

## Bereich 3: Inventar- und Heldendetails-UI
- `inventory modal toggles with keyboard controls` deckt sinnvolle Nutzerwege ab, mischt aber Tastatursteuerung, Listenlayout, Overflow und Tab-Umschaltung in einem einzigen großen Test.
- `player sidebar stays compact and opens hero details in the inventory modal` bleibt sinnvoll, weil er die beabsichtigte Informationsverdichtung zwischen Sidebar und Detailmodal schützt.
- Für diesen Bereich fehlt eher noch gezielte Trennung in kleinere Verantwortlichkeiten als grundsätzliche Relevanz.

## Bereich 4: Container- und Loot-Flow
- `containers open a loot list with multiple items and keep remaining contents until emptied` ist ein starker Fachtest.
- `stepping onto a container opens the loot modal without hanging the application` schützt einen realen Interaktionspfad und ist grundsätzlich wertvoll.
- `empty containers show an empty state and disappear after closing` ist ebenfalls sinnvoll.

### Einordnung
- Die Container-Tests decken positive und leere Zustände bereits gut ab.
- Spröde wird der Bereich dort, wo statt Verhaltensschutz konkrete Render-Assets oder Pfadfragmente geprüft werden.

## Bereich 5: Heal-Overlay
- `heal overlay covers the studio and anchors the healing choices at the lower center` ist aus UI-Sicht legitim, weil er ein bewusstes Layoutverhalten schützt.
- Gleichzeitig ist er naturgemäß empfindlicher gegenüber legitimen Layout-Anpassungen als reine Fachtests.
- Für Weiterentwicklung wäre eine Ergänzung um kleinere Verhaltens-Checks pro Verantwortung oft robuster als zusätzliche Pixel-Assertions.

## Empfehlung
- Beibehalten:
  - Tests 11, 12, 13, 16, 18 und 20 weitgehend unverändert
- Mit Vorsicht weiterführen:
  - Test 19 als gezielten Layoutschutz, aber sparsam mit weiteren geometrischen Feinschwellen
- Robuster machen:
  - Test 14 nicht auf konkrete Icon-Datei festnageln
  - Test 15 in kleinere Tests für Tastaturtoggle, Tabzustand und Scrolllayout trennen
  - Test 17 nicht an `assets/containers` koppeln, sondern an Containerzustand und Modalfluss

## Verwandte Seiten
- [[Bewertung erste 10 E2E-Startflow-Tests 2026-04-20]]
- [[Build Test und lokaler Start]]
- [[../../03 Betrieb/Log]]
