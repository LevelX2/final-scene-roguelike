---
typ: begriff
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
  - ../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17.md
  - ../../../src/combat/combat-resolution.mjs
  - ../../../src/application/targeting-service.mjs
  - ../../../src/app/render-cycle.mjs
tags:
  - gameplay
  - systeme
---

# Spielsysteme im Überblick

## Kurzfassung
Das Spiel wird aktuell von vier großen Druckachsen bestimmt: Lebenspunkte, Nahrung/Hunger, Raumkontrolle durch Sicht/Türen/Fallen sowie Ausrüstungs- und Gegnerskalierung über die Studiotiefe.

## Quellenbasis
- [[../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]
- [[../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17]]

## Kernsysteme
- rundenbasierter Spieler- und Gegnerzug
- Hunger und sichere Regeneration
- Kampf mit Treffer, Krit, Block und Statuseffekten
- prozedurale Studios mit Raumrollen, Schlüsseln, Chests und Showcases
- Waffen- und Schildgenerierung mit Raritäten und Modifikatoren
- Gegnerfreischaltung, Floorskalierung und Variantentiers

## Systemischer Zusammenhang
- `endurance` wirkt zugleich auf Nahrungspuffer und Fallenschaden.
- `nerves` wirkt in Ausweich- und Blocklogik hinein.
- Showcases sind nicht nur Kulisse, sondern verbessern sichere Regeneration.
- Locked-Room-Chests sind lokale Risk/Reward-Spitzen.

## Aktueller Workspace-Stand 2026-04-20
- Fernkampf nutzt inzwischen freie Winkel mit Sichtlinie; Ziele, die nur knapp um eine Ecke sichtbar sind, können aber einen Treffer-Malus durch Deckung erhalten.
- Direkt an der Ecke entfällt dieser Malus bewusst. Erst wenn die Schusslinie eine spätere Eckkante nur streift, greift ein Distanz-abhängiger Deckungsmalus von `15` bis `30` Prozentpunkten auf die Trefferchance.
- Der Zielmodus zeigt für gültige Fernkampfziele nicht nur `Schuss frei`, sondern die aktuelle Trefferchance in Prozent. Bei Eck-Deckung wird diese Reduktion zusätzlich als `Teildeckung` oder `Starke Deckung` kenntlich gemacht.

## Neure Balancing-Richtung
Die neuere Balancing-Rationale betont, dass künftige Justierung auf klaren Ableitungsschichten, stabilen Runtime-Gruppen und möglichst kanonischen Wirkungsformen beruhen soll. Das verstärkt den Charakter des Spiels als gruppierbares System statt als Sammlung lose verknüpfter Einzelfälle.

## Verwandte Seiten
- [[Dungeon und Studio]]
- [[Balancing-Fundament und Vereinheitlichungsprinzipien]]
- [[../Personen und Rollen/Spielerklassen und Passiven]]
- [[../Risiken und offene Punkte/Offene Designrichtungen]]

