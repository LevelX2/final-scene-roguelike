---
typ: risiko
status: offen
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
tags:
  - design
  - container
  - schluessel
  - loot
---

# Verschlossene Container und Schlüsseltruhen

## Kurzfassung
Als offene Designidee könnten zusätzlich zu verschlossenen Türen auch einzelne Container oder Truhen einen passenden Schlüssel verlangen. Das würde die bestehende Schlüsselmechanik auf die Loot-Ebene ausweiten, ohne zwangsläufig den Raumzugang selbst zu blockieren.

## Quellenbasis
- [[../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]

## Einordnung
- Der dokumentierte Ist-Stand kennt derzeit verschlossene Türen, Locked Bonus Rooms und Truhen mit Sonderbeute, aber keine separat schlüsselgebundenen Container.
- Die hier beschriebene Mechanik ist eine neue Projektidee aus der Projektarbeit vom `2026-04-20` und weder beschlossen noch umgesetzt.

## Möglicher Nutzen
- Schlüssel würden nicht nur Wege freischalten, sondern auch gezielte Bonusbeute strukturieren.
- Normale Räume könnten zugänglich bleiben, während Premium-Loot als optionale Belohnung verschlossen ist.
- Container- und Schlüsselspiel bekäme mehr Varianz, ohne dass jede Belohnung an einen ganzen Locked Room gebunden sein muss.

## Mögliche Ausprägungen
- Eine Truhe nutzt denselben Studioschlüssel wie ein benachbarter Locked Room.
- Einzelne Container tragen einen eigenen kleinen Behälterschlüssel als neue Loot-Unterkategorie.
- Verschlossene Truhen stehen sichtbar im Raum und telegraphieren ihre Belohnung früh.
- Elite-, Schatz- oder Showcase-nahe Räume könnten bevorzugt solche Behälter tragen.

## Offene Designfragen
- Ob Tür- und Container-Schlüssel dieselbe Ökonomie teilen oder getrennt bleiben sollten.
- Ob ein Schlüssel beim Öffnen verbraucht wird oder mehrere Behälter desselben Studios bedienen darf.
- Wie Frust vermieden wird, wenn ein Schlüssel früh ausgegeben und später eine wertvollere Truhe gefunden wird.
- Ob verschlossene Container nur Bonusloot enthalten oder auch Kernressourcen wie Nahrung und Heilung.

## Risiken und Auswirkungen
- Zusätzliche Schlüsselsenken könnten die bestehende Locked-Room-Balance entwerten oder unnötig verkomplizieren.
- UI, Tooltip, Log und Container-Modal müssten den Schließzustand klar anzeigen, damit die Mechanik fair lesbar bleibt.
- Die Studio-Statistik und spätere Balancing-Auswertung müssten verschlossene Behälter getrennt von normalen Truhen erfassen.

## Verwandte Seiten
- [[Offene Designrichtungen]]
- [[../Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- [[../Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
