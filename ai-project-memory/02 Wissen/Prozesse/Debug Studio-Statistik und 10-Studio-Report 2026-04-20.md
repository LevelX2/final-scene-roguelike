---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../../src/application/studio-generation-report.mjs
  - ../../../src/application/modal-controller.mjs
  - ../../../src/application/test-api-snapshots.mjs
  - ../../../src/app/interface-assembly.mjs
  - ../../../src/app/gameplay-assembly.mjs
  - ../../../tests/modules/studio-generation-report.test.mjs
tags:
  - debug
  - balancing
  - studio-generator
  - statistik
---

# Debug Studio-Statistik und 10-Studio-Report 2026-04-20

## Kurzfassung
Der aktive Runtime-Pfad besitzt jetzt eine wiederverwendbare Studio-Generierungsstatistik. Sie zählt für bis zu 10 Studios pro Run unter anderem Gegner, Sondergegner, Elite-/Dire-Varianten, Boss-Gegner, Schlüssel, verschlossene Türen, Nahrung, Verbrauchbares, Bodenloot, Truheninhalte, Fallen und Vitrinen.

## Quellenbasis
- [[../../../src/application/studio-generation-report.mjs]]
- [[../../../src/application/modal-controller.mjs]]
- [[../../../src/application/test-api-snapshots.mjs]]
- [[../../../src/app/interface-assembly.mjs]]
- [[../../../src/app/gameplay-assembly.mjs]]
- [[../../../tests/modules/studio-generation-report.test.mjs]]

## Nutzbare Zugänge
- Im Spiel: Der bestehende Debug-Dialog `Debugdaten` ergänzt seine Kopieransicht jetzt um einen 10-Studio-Block mit Gesamtwerten und einer Zeile pro Studio.
- Test-API: `window.__TEST_API__.getStudioGenerationReport({ studioCount: 10 })` liefert die Statistik strukturiert als Objekt.
- Test-API: `window.__TEST_API__.getStudioGenerationReportText({ studioCount: 10 })` liefert denselben Inhalt als kopierbaren Textblock.

## Inhalt der Statistik
- Gegner gesamt
- Gegner Standard gegen `legacy_special`
- Elite- und Dire-Varianten
- Boss-Gegner ab Rangband `boss`
- Schlüssel und verschlossene Türen
- Nahrung
- Verbrauchbares gesamt sowie Heilung gegen Utility
- Bodenwaffen und Bodenschilde
- Truhen und Truheninhalte nach Typ
- Fallen
- Vitrinen
- Räume gesamt sowie Raumrollen pro Studio im strukturierten Report

## Einordnung für Balancing und Prüfung
- Die Statistik ist absichtlich generatornah und zählt den Zustand direkt auf dem erzeugten Studiozustand, nicht erst indirekt über UI-Renderpfade.
- Für schnelle Balancing-Checks ist der strukturierte Test-API-Report der robusteste Einstieg, weil er numerisch weiterverarbeitet werden kann.
- Der Debug-Dialog ist der schnellste manuelle Einstieg im Spiel, weil die Zahlen dort direkt sichtbar und kopierbar sind.
- Das Erzeugen der 10-Studio-Statistik materialisiert in Debug/Test bei Bedarf künftige Studios desselben Runs vorab. Das ändert den deterministischen Verlauf des Runs nicht, lädt aber die Studios früher in den State.

## Verifizierte Beispielauswertung vom 2026-04-20
Lokal verifiziert im Testmodus mit Run-Seed `1709173870`.

Gesamtsumme über 10 Studios:
- Räume: `159`
- Gegner: `112`
- davon Standard: `111`
- davon `legacy_special`: `1`
- Elite: `8`
- Dire: `3`
- Boss: `5`
- Schlüssel: `4`
- Verschlossene Türen: `4`
- Nahrung: `18`
- Verbrauchbares: `59`
- Bodenwaffen: `4`
- Bodenschilde: `1`
- Truhen: `11`
- Truheninhalte: `17`
- Fallen: `76`
- Vitrinen: `26`
- Weltloot ohne Truhen: `82`
- Loot gesamt inklusive Truheninhalten: `99`

Auffälligkeiten aus dieser Beispielsequenz:
- In diesem verifizierten Lauf tauchten Schlüssel und Locked Doors tatsächlich auf, vor allem in Studio `3`, `4` und `6`.
- Sondergegner aus `legacy_special` waren in diesem Beispiel selten; die Abweichung nach oben kam eher über Elite-, Dire- und Boss-Varianten.
- Der Lootanstieg wirkt vor allem über Heilverbrauchsgüter und Truheninhalte, weniger über offene Bodenwaffen oder Schilde.

## Offene Punkte
- Für breitere Balancing-Aussagen reicht ein einzelner 10-Studio-Lauf nicht; dafür wären mehrere Seeds oder eine Batch-Auswertung sinnvoll.
- Falls spätere Balancing-Runden mehr Differenzierung brauchen, wäre eine zusätzliche Trennung nach Raumrollen oder Archetyp-Lootquellen naheliegend.

## Verwandte Seiten
- [[../00 Uebersichten/Index]]
- [[Build Test und lokaler Start]]
- [[Arbeitsworkflow Wissenspflege und Projektanfragen]]
- [[../Begriffe und Konzepte/Dungeon und Studio]]
