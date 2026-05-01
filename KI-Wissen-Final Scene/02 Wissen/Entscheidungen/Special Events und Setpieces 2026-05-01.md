---
typ: entscheidung
status: aktiv
letzte_aktualisierung: 2026-05-01
quellen:
  - ../../../src/content/catalogs/special-events.mjs
  - ../../../src/dungeon/branch-layout.mjs
  - ../../../src/content/catalogs/monster-phase-one.mjs
  - ../../../src/application/studio-generation-report.mjs
tags:
  - gameplay
  - special-events
  - setpieces
---

# Special Events und Setpieces 2026-05-01

## Kurzfassung
Special Events sind als häufige filmische Studiomomente angelegt, nicht als extrem seltene Easter Eggs. Pro Studio kann höchstens ein Setpiece entstehen. Die erste Version nutzt vorhandene Systeme: Raumrollen, Gegner, Fallen, Hazards, Vitrinen, Chests, Nahrung und Verbrauchsgüter.

## Designentscheidung
- Eventgegner zählen nicht gegen das normale Gegnerbudget. Sie sind zusätzlicher Druck und dürfen ein Studio punktuell schwerer machen.
- Die Erkennung im Spiel bleibt diegetisch: ungewöhnliche Raumkomposition, einmalige Logzeile und kurzer Floating-Text beim ersten Betreten des Eventraums.
- Es gibt keine große Sonder-UI und keine neuen Kampfregeln.
- Eventhäufigkeit steigt mit der Studiotiefe:
  - Studio 1: 20 %
  - Studio 2-3: 55 %
  - Studio 4-6: 75 %
  - Studio 7+: 85 %

## Umgesetzte v1-Events
- `reactor_leak_stunt_course` / Reaktorleck: Hazard-/Fallenraum mit Utility-Belohnung und optionalem Zusatzgegner.
- `set_chaos_crew` / Chaoscrew am Set: mehrere kleine, flinke Eventmonster in Props-, Kantinen- oder Aggro-Räumen.
- `reliquary_guardian` / Reliquienschrein: Vitrinen-/Requisitenraum mit Wächtern und besserem Reward.

## Neue Eventmonster
Die Chaoscrew nutzt vier event-only Monster:
- Requisitenwusler
- Kabelbeißer
- Kulissenkrabbler
- Hektischer Setläufer

Diese Gegner liegen im Monsterkatalog mit `spawnGroup: special_event`, `eventOnly: true`, `noEquipment: true`, `allowVariants: false`, niedriger Trefferkraft und hoher Reaktion. Dadurch tauchen sie nicht im normalen Standardpool auf und bleiben als Setpiece-Bausteine erkennbar.

## Technische Einordnung
- Die Rezeptdaten liegen in `src/content/catalogs/special-events.mjs`.
- Die Platzierung erfolgt im Dungeon-Generator nach normalem World-Content, damit Eventinhalt zusätzlich entsteht und freie Tiles respektiert.
- `floorState.specialEvents` speichert Event-ID, Label, Intensität, Raumbezug, Ankündigungsstatus und Floating-Text-Position.
- Die Studio-Statistik zählt Special Events und wertet `special_event`-Gegner als Special-Gegner.

## Offene Folgepunkte
- Häufigkeit und Intensitätsverteilung sollten nach Spieltests oder Batch-Auswertung nachjustiert werden.
- Falls Setpieces visuell noch zu wenig auffallen, wäre ein späterer dezenter Raumakzent denkbar. V1 bleibt bewusst bei Logzeile, Floating-Text und Raumkomposition.

## Verwandte Seiten
- [[../Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- [[../Personen und Rollen/Spielerklassen und Passiven]]
- [[../Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
