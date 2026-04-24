---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../../index.html
  - ../../../styles.css
  - ../../../src/ai/enemy-turns.mjs
  - ../../../src/application/debug-enemy-trails.mjs
  - ../../../src/application/floor-transition-service.mjs
  - ../../../src/application/input-controller.mjs
  - ../../../src/application/ui-bindings.mjs
  - ../../../src/app/render-cycle.mjs
  - ../../../tests/navigation.spec.js
tags:
  - debug
  - ui
  - scheduler
  - bedienung
---

# Debugsteuerung in Toolbar statt Modal 2026-04-20

## Kurzfassung
Debug-Bedienung für Zeitvorschub und Studio-Navigation liegt im aktiven Spiel oben in der Studioleiste und nicht im Debug-Modal. Das Modal bleibt für reine Reproduktionsdaten zuständig. Optional kann die Leiste zusätzlich eine Heatmap für Gegnerbewegungen einblenden.

## Quellenbasis
- [[../../../index.html]]
- [[../../../styles.css]]
- [[../../../src/ai/enemy-turns.mjs]]
- [[../../../src/application/debug-enemy-trails.mjs]]
- [[../../../src/application/floor-transition-service.mjs]]
- [[../../../src/application/input-controller.mjs]]
- [[../../../src/application/ui-bindings.mjs]]
- [[../../../src/app/render-cycle.mjs]]
- [[../../../tests/navigation.spec.js]]

## Entscheidungsinhalt
- Nach `F8` erscheint in der oberen Studioleiste eine Debuggruppe mit `Debugdaten`, Rücksprung, Zeitfeld und `Vorspulen`.
- Das Debug-Modal zeigt weiter kopierbare Reproduktionsdaten, blockiert aber nicht mehr die eigentliche Debug-Bedienung.
- `F8` deckt das aktuelle Studio auf oder springt ins nächste Debug-Studio.
- `F7` springt im Debugmodus ein Studio zurück, solange der Run nicht auf Studio `1` steht.
- Taste `N` führt den eingestellten Zeitvorschub aus, ohne dass das Debug-Modal geöffnet sein muss.
- Die linke Toolbar-Beschriftung `Studiozoom` entfällt; die Zoom-Beschriftung sitzt direkt an den Zoom-Controls.
- Ein Häkchen `Gegnerspuren` schaltet eine Debug-Heatmap auf dem aktuellen Studio ein.
- Die Heatmap färbt nur die zuletzt von einem Gegner belegte Spur pro Feld ein; wiederholte Begehungen desselben Feldes durch denselben Gegner werden dunkler.
- Die Heatmap wird an echten Gegnerbewegungen im Scheduler aufgezeichnet und nicht bloß aus der finalen Position rekonstruiert.

## Wirkung
- Scheduler-, KI- und Off-Floor-Debugging bleibt sichtbar, während das Studio weiter beobachtet werden kann.
- Debug-Zeitvorschub und Debug-Studio-Navigation hängen an derselben Reveal-Logik wie `F8`.
- Die optionale Spur-Heatmap macht häufige Gegnerpfade beim Vorspulen sichtbar, ohne das Brett mit zusätzlichen Modals zu verdecken.
- Die Browser-Regression deckt jetzt ausdrücklich den Toolbar-Pfad, `F7` als Rücksprung und die sichtbare Heatmap mit ab.

## Offene Restspannung
- Der Debug-Rücksprung ist bewusst an Reveal/Debugsicht gekoppelt und kein normaler Spielbefehl.
- Weitere Debugfunktionen sollten dieselbe Leiste nur maßvoll erweitern, damit die obere Leiste nicht überfrachtet wird.

## Verwandte Seiten
- [[Aktiver Runtime-Pfad und Legacy-Abgrenzung]]
- [[../Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
