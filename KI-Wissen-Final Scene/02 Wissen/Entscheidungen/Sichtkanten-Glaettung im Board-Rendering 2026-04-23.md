---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-04-23
quellen:
  - ../../../src/application/visibility-service.mjs
  - ../../../src/application/targeting-service.mjs
  - ../../../src/application/player-turn-controller.mjs
  - ../../../src/ai/enemy-turns.mjs
  - ../../../src/ui/board-view.mjs
  - ../../../src/app/gameplay-assembly.mjs
  - ../../../styles.css
  - ../../../tests/modules/visibility-service.test.mjs
  - ../../../tests/modules/board-view.test.mjs
  - ../../../tests/modules/enemy-turns.test.mjs
tags:
  - sicht
  - fov
  - fog
  - rendering
  - board
  - ui
---

# Sichtkanten-Glättung im Board-Rendering 2026-04-23

## Kurzfassung
Die frühere Mischung aus lokalen Dreiecks- und Achsenmasken wurde verworfen. Sicht basiert jetzt spielmechanisch auf einer einheitlichen FOV-Maske, während das Board die Fog-Kante als organischen Canvas-Overlay aus dieser Sicht ableitet. Wahrnehmung und Projektilsicht sind außerdem getrennt: Ziele können sichtbar sein, ohne dass automatisch eine freie Schusslinie besteht.

## Entscheidungsinhalt
- `visibility-service.mjs` ist die einzige Quelle für Sichtzustände.
- `lineOfSightVisible` bedeutet jetzt rohe taktische Sicht:
  - kreisnahe Reichweite statt quadratischem Chebyshev-Feld
  - Shadowcasting/FOV statt einzelner kachelweiser Sichtstrahlen
  - sichtbare Rohziele sind Boden- und Freifelder, keine Strukturkacheln
- `visible` bleibt eine reine Anzeige-Maske:
  - `lineOfSightVisible`
  - plus genau ein orthogonaler Ring direkt angrenzender Strukturkacheln wie Wände und Türen
  - plus kontrollierte diagonale Strukturecken, wenn beide orthogonalen Stützkacheln bereits sichtbar sind
  - diese Struktur-Anzeige darf nicht ketten
  - diese Struktur-Anzeige darf die Reichweite auf der Spielerachse nicht nach außen verlängern
  - sie darf aber echte Außenecken von Räumen und Wandkanten direkt unter einer sichtbaren Türsilhouette mit anzeigen
  - die Stützkacheln können dabei sichtbarer Boden oder bereits sichtbare Struktur sein
  - diagonale Struktur-Ecken werden zusätzlich nur gesetzt, wenn die Ecke weiter vom Spieler entfernt ist als beide Stützkacheln
  - orthogonal aufgehellte Wände außerhalb der Spielerachsen brauchen mehr als einen Rohsicht-Nachbarn, damit isolierte Fernwände in großen Räumen dunkel bleiben
- Sichtbarkeit und Schusslinie wurden semantisch getrennt:
  - `canPerceive(...)` steht für Wahrnehmung über FOV
  - `hasProjectileLine(...)` steht für die strikte Projektil- oder Schusslinie
  - `hasLineOfSight(...)` bleibt nur als Kompatibilitätsalias auf `canPerceive(...)`
- Player-Targeting nutzt jetzt diese Trennung explizit:
  - Sichtbarkeit eines Gegners folgt `canPerceive(...)`
  - tatsächliche Schussfreigabe folgt `hasProjectileLine(...)`
- Dieselbe Trennung gilt auch für die Gegner-KI:
  - Gegner nehmen den Spieler über FOV wahr
  - Fernkampfschüsse der Gegner bleiben an die strikte Projektilsicht gebunden
  - Rückzugs- und Bedrohungsabschätzungen, die echte Schussfenster beurteilen, verwenden weiter Projektilsicht
- `board-view.mjs` rendert keine `tile-fog-edge`-Elemente mehr.
- Die frühere Heuristik mit diagonalen oder axialen CSS-Masken wurde vollständig entfernt.
- Das Board nutzt stattdessen einen einzigen Fog-Canvas zwischen Basis-Layer und Vordergrund:
  - sichtbare Gameplay-Kacheln bilden die Zieloberfläche
  - erkundete, aber aktuell nicht sichtbare Kacheln liefern einen `memory`-Kanal
  - nie erkundete Kacheln liefern einen `unknown`-Kanal
  - beide Kanäle werden auf einem Subtile-Raster aufgebaut und anschließend weichgezeichnet
  - das Ergebnis wird als organischer Overlay über das ganze Brett gelegt
- Struktur-Silhouetten speisen die organische Kontur nicht:
  - sichtbar aufgehellte Wände und Türen bleiben lesbar
  - sie erzeugen aber keine eigene Fog-Geometrie
  - damit bleibt die Kante an der wirklichen Gameplay-Sicht orientiert statt an Anzeige-Sonderfällen
- `styles.css` enthält keine `fog-edge-diagonal-*`, `fog-edge-axial-*` oder `.tile-fog-edge`-Regeln mehr.
- Stattdessen gibt es nur noch den globalen `.board-fog-overlay`.

## Wirkung
- Sichtkanten wirken als zusammenhängende, organische Kontur statt als Sammlung lokaler Dreiecke oder Polygonspitzen.
- Die früheren Spezialfälle für Achsenspitzen, Pferdesprünge und falsch orientierte Eckkeile entfallen als eigene Rendering-Regeln.
- `memory` und `unknown` unterscheiden sich weiter farblich, teilen sich aber dieselbe geometrische Übergangslogik.
- Sichtbare Figuren, Items und Interaktionsobjekte werden nicht mehr halb abgeschnitten, weil der Fog-Overlay zwischen Boden/Basis und Vordergrund liegt.
- Die Struktur-Sonderregel bleibt als Lesbarkeitshilfe erhalten, verfälscht aber weder taktische Sicht noch Fog-Kontur.
- Außenkanten von Räumen bleiben als sichtbare Struktur-Silhouette lesbar, auch wenn nur die angrenzende Bodenkante im FOV liegt.
- Unter einer sichtbar aufgehellten Tür kann die zugehörige Wandkante ebenfalls als Struktur-Silhouette erscheinen, sofern sie über eine echte Stützecke mitgetragen wird.
- Zielmodus und Gegnerwahrnehmung wirken konsistenter:
  - „sichtbar“ folgt FOV
  - „Schuss frei“ folgt weiterhin der harten Schusslinie

## Verifikation
- `node --test tests/modules/board-view.test.mjs`: grün
- `node --test tests/modules/visibility-service.test.mjs`: grün
- `node --test tests/modules/enemy-turns.test.mjs`: grün
- `npm run test:modules`: grün
- `npm run build`: grün
- `npm run check:memory`: nach Wissenspflege erneut ausführen
- Zusätzliche Modultests decken jetzt insbesondere ab:
  - organische Fog-Kanäle für `memory` und `unknown`
  - Ignorieren bloßer Struktur-Silhouetten als Fog-Quelle
  - Renderpfad ohne `tile-fog-edge`-Elemente
  - orthogonalen Struktur-Reveal ohne Kettenbildung
  - diagonale Struktur-Ecken für echte Raumaußenecken mit sichtbaren Bodenstützen
  - Wandkante unter einer sichtbaren Türsilhouette
  - keine seitliche Fernwand-Aufhellung aus nur einer einzelnen entfernten Rohsicht-Kachel
  - taktische Wahrnehmung getrennt von Projektilsicht

## Verwandte Seiten
- [[../Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- [[../00 Uebersichten/Systemlandkarte]]
- [[../Prozesse/Build Test und lokaler Start]]
