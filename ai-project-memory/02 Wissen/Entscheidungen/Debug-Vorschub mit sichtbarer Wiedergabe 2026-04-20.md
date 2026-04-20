---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../../index.html
  - ../../../styles.css
  - ../../../src/application/debug-advance.mjs
  - ../../../src/application/debug-enemy-trails.mjs
  - ../../../src/application/modal-controller.mjs
  - ../../../src/application/player-turn-controller.mjs
  - ../../../src/application/state-blueprint.mjs
  - ../../../src/application/state-persistence.mjs
  - ../../../src/app/render-cycle.mjs
  - ../../../tests/modules/debug-enemy-trails.test.mjs
  - ../../../tests/modules/player-turn-controller.test.mjs
  - ../../../tests/navigation.spec.js
tags:
  - debug
  - scheduler
  - playback
  - visualisierung
---

# Debug-Vorschub mit sichtbarer Wiedergabe 2026-04-20

## Kurzfassung
Der Debug-Zeitvorschub kann nicht nur Weltzeit simulieren, sondern die einzelnen Scheduler-Schritte bei Bedarf sichtbar abspielen. Ein Temporegler in der Toolbar bestimmt, ob der Vorschub sofort oder verlangsamt läuft.

## Entscheidungsinhalt
- Die Toolbar enthält neben Zeitbudget und `Vorspulen` nun auch einen Temporegler.
- Der Vorschub arbeitet weiter mit Weltzeit-Budget, rendert bei verlangsamter Wiedergabe aber nach jedem einzelnen Akteurzug neu.
- Während eines laufenden Vorschubs werden die Debug-Steuerungen in der Toolbar vorübergehend gesperrt, damit keine konkurrierenden Starts entstehen.
- Reveal-Debug darf die Scheduler-Simulation auch nach `gameOver` sichtbar weiterlaufen lassen. Der normale Spielzustand bleibt beendet; nur die Debugbeobachtung läuft weiter.
- Die Gegnerspur-Heatmap bleibt pro Feld immer auf den zuletzt gelaufenen Gegner ausgerichtet. Wenn ein früherer Gegner später erneut über dasselbe Feld läuft, überschreibt seine Farbe den vorherigen Stand wieder.

## Wirkung
- Sichtbare Gegnerbewegungen beim Vorspulen sind jetzt auch nach dem Tod des Spielers nachvollziehbar.
- Schedulerfehler lassen sich besser erkennen, weil der Vorschub nicht mehr nur als sofortiges Endergebnis erscheint.
- Die Heatmap bleibt aussagekräftig für Laufwege, auch wenn sich mehrere Gegner dieselben Felder teilen.

## Verwandte Seiten
- [[Debugsteuerung in Toolbar statt Modal 2026-04-20]]
