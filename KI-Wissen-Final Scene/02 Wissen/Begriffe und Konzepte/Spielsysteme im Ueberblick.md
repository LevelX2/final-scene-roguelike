---
typ: begriff
status: aktiv
letzte_aktualisierung: 2026-04-20
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
- Der Workspace-Stand wurde danach nachgeschärft: Deckung greift nicht nur bei perfekten Raster-Ecktangenten, sondern auch bei knappen Vorbeischüssen an einer späteren blockierenden Kante. Gerade flache Winkel aus zweiter Reihe hinter einer Ecke werden dadurch verlässlicher als `Teildeckung` erkannt.
- Der Zielmodus zeigt für gültige Fernkampfziele weiterhin die aktuelle Trefferchance in Prozent, auch ohne Deckung. Bei Eck-Deckung wird diese Reduktion zusätzlich als `Teildeckung` oder `Starke Deckung` kenntlich gemacht.
- Tooltip und Zielmarker halten die Anzeige kompakt: Bei Bedarf erklären sie die aktuelle Endchance, den Basiswert ohne Deckung und den konkreten Deckungsmalus.
- Die Komfortoption für automatisches Sofortfeuer bei genau einem Ziel greift nur noch ohne Eck-Deckung. Sobald ein sichtbares Einzelziel durch eine Ecke gedeckt ist, bleibt der Zielmodus offen, damit Umpositionierung oder bewusster Schuss möglich bleiben.
- Auch das Kampflog macht reduzierte Trefferchancen durch Eck-Deckung sichtbar. Bei gedeckten Fernkampfschüssen wird die verminderte Restchance jetzt in atmosphärischen Zusatzzeilen erwähnt, sowohl bei Treffern als auch bei Fehlschüssen.

- Gegnerloot wurde im aktiven Runtime-Pfad am `2026-04-20` deutlich angehoben und um geplante Misc-Drops erweitert.
- Getragene Waffen droppen jetzt bei nicht ikonischen Gegnern mit `48 %` auf `normal`, `64 %` auf `elite` und `80 %` auf `dire`; ikonische Gegner liegen bei `72 %`, `84 %` und `94 %`.
- Getragene Offhands droppen jetzt mit `18 %` auf `normal`, `30 %` auf `elite` und `42 %` auf `dire`. Im aktuellen Katalog tragen bereits drei Gegner ein Offhand.
- Wenn kein geplanter Nahrungsdrop vorliegt, kann ein Gegner stattdessen einen Misc-Drop mit `34 %`, `46 %` oder `58 %` nach Variantentier erhalten. Diese Zusatzdrops sind bevorzugt Heilverbrauchsgüter und sonstige Utility-Consumables, nicht primär weitere Waffen.
- Gegner mit `healingProfile = lurking` koppeln ihre Regeneration im Workspace-Stand jetzt an aktuellen Druck statt nur an eine noch gesetzte Aggro-Erinnerung.
- Konkret kann ein solcher Gegner wieder `1 HP` heilen, sobald seit `3` eigenen Zügen kein Treffer mehr einging und er den Spieler aktuell nicht mehr sauber unter Druck halten kann, auch wenn die Aggro-Flag noch nicht vollständig gefallen ist.

## Neure Balancing-Richtung
Die neuere Balancing-Rationale betont, dass künftige Justierung auf klaren Ableitungsschichten, stabilen Runtime-Gruppen und möglichst kanonischen Wirkungsformen beruhen soll. Das verstärkt den Charakter des Spiels als gruppierbares System statt als Sammlung lose verknüpfter Einzelfälle.

## Verwandte Seiten
- [[Dungeon und Studio]]
- [[Balancing-Fundament und Vereinheitlichungsprinzipien]]
- [[../Personen und Rollen/Spielerklassen und Passiven]]
- [[../Risiken und offene Punkte/Offene Designrichtungen]]
