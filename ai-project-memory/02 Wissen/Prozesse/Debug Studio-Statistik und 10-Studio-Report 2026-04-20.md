---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-20
quellen:
  - ../../../src/application/studio-generation-report.mjs
  - ../../../src/application/studio-generation-batch-report.mjs
  - ../../../src/application/modal-controller.mjs
  - ../../../src/application/test-api-snapshots.mjs
  - ../../../src/app/interface-assembly.mjs
  - ../../../src/app/gameplay-assembly.mjs
  - ../../../src/dungeon/branch-layout.mjs
  - ../../../scripts/studio-stats.mjs
  - ../../../tests/modules/branch-layout.test.mjs
  - ../../../tests/modules/studio-generation-batch-report.test.mjs
  - ../../../tests/modules/studio-generation-report.test.mjs
tags:
  - debug
  - balancing
  - studio-generator
  - statistik
---

# Debug Studio-Statistik und 10-Studio-Report 2026-04-20

## Kurzfassung
Der aktive Runtime-Pfad besitzt jetzt eine wiederverwendbare Studio-Generierungsstatistik für Debug, Test-API und Terminal. Sie zählt für bis zu 10 Studios pro Run unter anderem Gegner, Sondergegner, Elite-/Dire-Varianten, Boss-Gegner, Schlüssel, verschlossene Türen, Nahrung, Verbrauchbares, Bodenloot, Truheninhalte, Fallen und Vitrinen. Zusätzlich existiert eine Batch-Auswertung über beliebig viele Seeds, und der Locked-Room-Pfad wurde so korrigiert, dass Schlüsselräume wieder in der erwarteten Häufigkeit auftreten.

## Quellenbasis
- [[../../../src/application/studio-generation-report.mjs]]
- [[../../../src/application/studio-generation-batch-report.mjs]]
- [[../../../src/application/modal-controller.mjs]]
- [[../../../src/application/test-api-snapshots.mjs]]
- [[../../../src/app/interface-assembly.mjs]]
- [[../../../src/app/gameplay-assembly.mjs]]
- [[../../../src/dungeon/branch-layout.mjs]]
- [[../../../scripts/studio-stats.mjs]]
- [[../../../tests/modules/branch-layout.test.mjs]]
- [[../../../tests/modules/studio-generation-batch-report.test.mjs]]
- [[../../../tests/modules/studio-generation-report.test.mjs]]

## Nutzbare Zugänge
- Im Spiel: Der bestehende Debug-Dialog `Debugdaten` ergänzt seine Kopieransicht jetzt um einen 10-Studio-Block mit Gesamtwerten und einer Zeile pro Studio.
- Test-API: `window.__TEST_API__.getStudioGenerationReport({ studioCount: 10 })` liefert die Statistik strukturiert als Objekt.
- Test-API: `window.__TEST_API__.getStudioGenerationReportText({ studioCount: 10 })` liefert denselben Inhalt als kopierbaren Textblock.
- Terminal: `npm run report:studios -- --runs 100 --studios 10` erzeugt eine Batch-Auswertung über mehrere Runs.
- Terminal: `npm run report:studios -- --runs 100 --studios 10 --json` liefert dieselbe Auswertung plus Rohreports als JSON.
- Terminal: Während des Batch-Laufs zeigt die CLI nun einen Fortschrittszähler `Statistiklauf x/y`, damit längere Läufe nicht wie ein Hänger wirken.

## Inhalt der Statistik
- Gegner gesamt
- Gegner Standard gegen `legacy_special`
- Elite- und Dire-Varianten
- Boss-Gegner ab Rangband `boss`
- Schlüssel und verschlossene Türen
- Nahrung als Anzahl plus Nährwertsumme und durchschnittlicher Nährwert pro Nahrungspickup
- Verbrauchbares gesamt sowie Heilung gegen Utility
- Bodenwaffen und Bodenschilde
- Truhen und Truheninhalte nach Typ
- Fallen
- Vitrinen
- Räume gesamt sowie Raumrollen pro Studio im strukturierten Report

## Nachtrag Nahrungsauswertung vom 2026-04-20
- Die Studio-Statistik zeigt Nahrung nicht mehr nur als reine Pickup-Anzahl, sondern zusätzlich als aufsummierten Nährwert und als Durchschnitt pro Nahrungspickup.
- Der strukturierte Report liefert dafür pro Studio und in der Gesamtsumme das Objekt `foodNutrition` mit `count`, `totalNutrition` und `averageNutrition`.
- Die Textausgabe in Debug-Dialog und Test-API nutzt jetzt das Format `Nahrung X (Nährwert Y, Schnitt Z)`.
- Die Batch-CLI aggregiert diese Werte zusätzlich als eigene Metriken `Nahrung Nährwert` und `Nahrung Schnitt`, jeweils mit Mittelwert, Minimum und Maximum über alle Runs.
- Damit lässt sich nun unterscheiden, ob ein Run wenig Nahrung wegen geringer Pickup-Zahl oder wegen schwacher Einzelwerte erzeugt.

## Nachtrag Heilungsauswertung vom 2026-04-20
- Die Studio-Statistik wertet Heilverbrauchsgüter jetzt nicht mehr nur als Anzahl aus, sondern zusätzlich als aufsummierten Heilwert und als Durchschnitt pro Heilitem.
- Der strukturierte Report führt diese Daten unter `consumables.healingValue` mit `count`, `totalHeal` und `averageHeal`.
- Die Textausgabe in Debug-Dialog und Test-API nutzt dafür jetzt das Format `Verbrauchbar X (Heilung Y, Heilwert Z, Schnitt W)`.
- Die Batch-CLI aggregiert dazu die Zusatzmetriken `Verbrauchbar Heilwert` und `Verbrauchbar Heilschnitt`, jeweils als Mittelwert, Minimum und Maximum über alle Runs.
- Dadurch lässt sich unterscheiden, ob Heilung in einem Run knapp ist, weil zu wenige Heilitems spawnen, oder weil die einzelnen Heilitems schwache Werte tragen.

## Einordnung für Balancing und Prüfung
- Die Statistik ist absichtlich generatornah und zählt den Zustand direkt auf dem erzeugten Studiozustand, nicht erst indirekt über UI-Renderpfade.
- Für schnelle Balancing-Checks ist der strukturierte Test-API-Report der robusteste Einstieg, weil er numerisch weiterverarbeitet werden kann.
- Der Debug-Dialog ist der schnellste manuelle Einstieg im Spiel, weil die Zahlen dort direkt sichtbar und kopierbar sind.
- Das Erzeugen der 10-Studio-Statistik materialisiert in Debug/Test bei Bedarf künftige Studios desselben Runs vorab. Das ändert den deterministischen Verlauf des Runs nicht, lädt aber die Studios früher in den State.
- Die Batch-CLI ist der richtige Weg für Balancing-Aussagen, weil sie Mittelwerte, Minima und Maxima über viele Seeds statt nur über einen Beispielrun liefert.

## Analyse der niedrigen Schlüsselrate
- Der frühere Batch-Befund von nur `1.22` Schlüsseln pro `100 x 10`-Auswertung war kein reines Balanceproblem, sondern vor allem ein Platzierungsproblem im Generator.
- Ursache 1: Der Locked-Room-Pfad betrachtete nur die ersten `desiredLockedCount` Kandidaten. Wenn einer davon bei Erreichbarkeits- oder Sealing-Prüfung herausfiel, rückten spätere gültige Kandidaten nicht nach.
- Ursache 2: Die Kandidatenmenge war unnötig eng auf `attachmentType === "sidearm_main"` begrenzt, obwohl andere abgeschlossene Blatträume mit genau einer Tür dieselbe Funktion erfüllen können.
- Der Fix erweitert die Kandidaten auf geeignete Blatträume mit genau einer Tür, iteriert über alle Kandidaten bis zur Zielmenge und behält die Reachability-/Sealing-Prüfungen als Sicherheitsnetz bei.

## Locked Bonus Room Mindestbeute
- Ein erfolgreicher Locked Bonus Room garantiert jetzt mindestens:
  - `2` Nahrungspickups im Raum
  - `2` Heilverbrauchsgüter im Raum
  - `1` Truhe mit mindestens `3` Inhalten
- Die Truhe nutzt weiterhin den bestehenden Locked-Room-Lootpfad mit erhöhtem Spezialfokus, wird aber bei schwachen Rolls auf mindestens drei Inhalte aufgefüllt.
- Damit ist der verschlossene Nebenraum nicht nur ein Tür-Key-Ereignis, sondern ein klar lesbarer Schatzraum.

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

## Verifizierte Batch-Auswertung nach Generator-Fix vom 2026-04-20
Lokal verifiziert mit `npm run report:studios -- --runs 100 --studios 10`.

Mittel pro 10-Studio-Run:
- Schlüssel: `11.64`
- Verschlossene Türen: `11.64`
- Nahrung: `39.9`
- Heilverbrauchsgüter und sonstige Verbrauchsgüter: `81.9`
- Truhen: `17.71`
- Truheninhalte: `45.85`
- Loot gesamt inklusive Truheninhalten: `171.68`

Einordnung:
- Gegenüber dem früheren Batch-Befund von `1.22` Schlüsseln pro Run ist die Schlüsselrate wieder auf dem erwartbaren Niveau für die dokumentierten Locked-Door-Wahrscheinlichkeiten.
- Die Beute pro Run steigt deutlich, weil verschlossene Bonusräume jetzt eine garantierte Schatzraum-Mindestbeute tragen.
- Studio `1` und `2` bleiben bewusst schlüsselfrei; die Locked-Room-Mechanik beginnt faktisch erst ab Studio `3`, was mit den Floor-Regeln in `src/balance.mjs` zusammenpasst.

## Nachtrag Utility-Verbrauchbares vom 2026-04-20
- Ein zusätzlicher Fehler lag im Spawnpfad für normale Boden-Consumables: Utility-Gegenstände wurden zwar korrekt aus dem Consumable-Katalog gerollt, aber beim Platzieren über `createPotionPickup(...)` normalisiert.
- Dadurch erhielten Utility-Drops fälschlich ein `heal`-Feld und wurden im Report vollständig als Heilverbrauchsgüter gezählt.
- Der Fix nutzt für diese Lootquelle jetzt `createConsumablePickup(...)`, sodass Utility im Batch-Report wieder sichtbar wird.
- Verifiziert ist der Fix über Modultests und einen kurzen CLI-Lauf; dabei tauchte `Verbrauchbar Utility` wieder mit Werten größer `0` auf.

## Nachtrag Bodenschilde vom 2026-04-20
- Die niedrige Schildzahl im Batch-Report war in diesem Fall vor allem eine direkte Folge der Spawn-Regeln für Bodenschilde.
- Vor dem Fix galt:
  - Studio `1`: `18 %`
  - Studio `2`: `35 %`
  - Studio `3` und `4`: `0 %`
  - Studio `5+`: `8 %`
- Dadurch lag `Bodenschilde` in der Batch-Auswertung deutlich unter der gefühlten Erwartung.
- Der Fix hebt die Rate moderat an:
  - Studio `1`: `25 %`
  - Studio `2`: `40 %`
  - Studio `3` und `4`: `20 %`
  - Studio `5+`: `16 %`
- Ein verifizierter `20 x 10`-Lauf zeigte danach `1.5` Bodenschilde pro 10-Studio-Run statt zuvor ungefähr `0.65`.

## Offene Punkte
- Die aktuelle Batch-Auswertung arbeitet pro Studioslot. Wenn später archetypspezifische Mittelwerte wichtiger werden, braucht es zusätzliche Gruppierung nach `studioArchetypeId`.
- Der Lootanstieg in Locked Rooms ist jetzt bewusst stark. Falls sich das im Spiel zu groß anfühlt, sollte der nächste Regler eher bei Raumfrequenz oder Chest-Inhalten ansetzen als wieder bei der Existenz der Schlüsselräume.

## Verwandte Seiten
- [[../00 Uebersichten/Index]]
- [[Build Test und lokaler Start]]
- [[Arbeitsworkflow Wissenspflege und Projektanfragen]]
- [[../Begriffe und Konzepte/Dungeon und Studio]]
