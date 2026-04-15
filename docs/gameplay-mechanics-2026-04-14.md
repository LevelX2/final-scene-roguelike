# Gameplay Mechanics

Stand: 2026-04-14

## Zweck dieses Dokuments

Dieses Dokument beschreibt die aktuell implementierten Spielmechaniken von `The Final Scene` aus Sicht ihrer Wirkung im Spiel:

- Was ein System tut
- Nach welchen Regeln es arbeitet
- Welche festen Werte, Wahrscheinlichkeiten und Formeln gelten
- Welche konkreten Wechselwirkungen zwischen Systemen existieren

Es beschreibt bewusst nicht die technische Umsetzung. Die Zielgruppe ist eine KI-gestützte Design- und Ausbauarbeit: Das Dokument soll als belastbare Grundlage dienen, um über Balancing, Erweiterungen und neue Systeme zu sprechen.

## Scope

Dokumentiert werden nur Mechaniken, die den Spielablauf direkt beeinflussen. Reine Darstellungs- oder Komfortdetails sind nur dann enthalten, wenn sie spielrelevante Informationen sichtbar machen oder Regelzustände transportieren.

Begriffe in diesem Dokument:

- `Dungeon` meint den gesamten Studiokomplex eines Runs.
- `Studio` meint die einzelne bespielte Einheit; ältere Begriffe wie `Level` oder `Ebene` sind dafür hier nicht mehr der Standard.

## Kurzbild des Spiels

`The Final Scene` ist ein rundenbasiertes Rogue-like. Ein Run besteht aus:

1. Start mit Klasse und Startwaffe
2. Erkundung eines prozedural erzeugten Studios
3. Kampf, Loot, Fallen, Türen, Schlüssel und Ressourcenverwaltung
4. Wechsel in tiefere Studios
5. Skalierung über Level, Ausrüstung und Gegnervarianten
6. Tod oder fortgesetzter Abstieg

Die vier Hauptdruckachsen sind:

- Lebenspunkte
- Nahrung/Hunger
- Raumkontrolle durch Türen, Sicht und Fallen
- Qualitätsanstieg von Gegnern und Ausrüstung über die Tiefe des Runs

## Start eines Runs

Zu Beginn wählt der Spieler:

- einen Namen
- eine Klasse

Aktuell gibt es drei Klassen.

| Klasse | Max HP | Stärke | Präzision | Reaktion | Nerven | Intelligenz | Ausdauer | Passive |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Hauptrolle | 20 | 4 | 5 | 4 | 3 | 2 | 2 | Erster Angriff gegen einen Gegner: `+6 Trefferchance`, `+8 Krit-Chance` |
| Stuntman | 22 | 5 | 3 | 3 | 2 | 1 | 3 | `-1` Schaden durch Fallen/Gefahrenfelder, `+5%` Schild-Blockchance |
| Regisseur | 17 | 2 | 4 | 3 | 4 | 5 | 3 | `+20%` Fallenentdeckung, `+15%` Fallenvermeidung |

Zusätzliche Startregeln:

- Startlevel: `1`
- Start-XP: `0`
- Startwaffe: eine zufällige `gewöhnliche` Waffe aus einem klassenspezifischen Pool
- Offhand zu Beginn: keine
- Start-Nahrung und Maximalnahrung hängen direkt an `Ausdauer`

Startwaffenpools:

- Hauptrolle: `relic-dagger`, `rune-sword`, `service-pistol`, `expedition-revolver`
- Stuntman: `combat-knife`, `woodcutter-axe`, `breach-axe`, `bowie-knife`
- Regisseur: `pocket-revolver`, `cane-blade`, `electro-scalpel`, `serum-launcher`

## Rundenlogik

Das Spiel ist streng rundenbasiert. Relevante Spieleraktionen kosten Zeit. Der verdeckte Kernablauf einer normalen Runde ist:

1. Spieleraktion ausführen
2. `Turn` um `1` erhöhen
3. Nahrungskosten anwenden
4. Gegnerzug ausführen
5. Status-Effekte ticken
6. Dauergefahren auswerten
7. Sichere Regeneration auswerten

Diese Reihenfolge ist für viele Wechselwirkungen wichtig.

### Aktionen mit Rundenkosten

Eine Runde wird unter anderem verbraucht durch:

- Bewegung
- Angriff durch Hineinlaufen in einen Gegner
- Warten
- Tür schließen
- Essen, Tränke nutzen, Ausrüstung ausrüsten
- Studio-Wechsel nach Bestätigung

Wichtig:

- Das Betreten eines Übergangsfelds kostet noch keine Runde.
- Erst die bestätigte Entscheidung zum Studio-Wechsel löst eine Runde aus.
- Beim bestätigten Studio-Wechsel werden Gegnerzüge übersprungen, aber Nahrungskosten, Status-Effekte, Dauergefahren und sichere Regeneration laufen trotzdem.

## Nahrung und Hunger

Hunger ist ein harter Zeitdruckmechanismus.

Formeln:

- `nutritionMax = 700 + 100 * endurance`
- `nutritionStart = 500 + 100 * endurance`
- jede relevante Aktion kostet `1` Nahrung

Beispiele:

- Hauptrolle mit `Ausdauer 2`: `Start 700`, `Max 900`
- Stuntman mit `Ausdauer 3`: `Start 800`, `Max 1000`
- Regisseur mit `Ausdauer 3`: `Start 800`, `Max 1000`

Hungerzustände nach aktuellem Verhältnis `nutrition / nutritionMax`:

- `Satt`: `>= 0.80`
- `Normal`: `>= 0.55`
- `Hungrig`: `>= 0.30`
- `Ausgehungert`: `>= 0.10`
- `Verhungernd`: `< 0.10`

Zusatzregel im Zustand `Verhungernd`:

- Nach der Aktion wird zusätzlich `1` direkter HP-Schaden verursacht.

Wichtig für Balancing:

- Nahrung wird immer auf das Maximum gekappt.
- Auch Warten verbraucht Nahrung.
- Hungerschaden kommt nach dem eigentlichen Aktionsverbrauch.

## Sichere Regeneration

Neben Tränken gibt es passive Heilung in sicheren Phasen.

Bedingungen:

- Spieler HP unter Max HP
- kein Gegner innerhalb Manhattan-Distanz `<= 3`

Fortschritt pro Aktion:

- Bewegung: `+0.5`
- Warten: `+1`
- zusätzlich `+0.5`, wenn der Spieler direkt an eine Showcase-Vitrine angrenzt

Sobald `safeRestTurns >= 4` gilt:

- der Spieler heilt `1 HP`
- der Fortschrittszähler wird auf `0` zurückgesetzt

Beispiele:

- viermal Warten in Sicherheit heilt `1 HP`
- acht sichere Bewegungen heilen `1 HP`
- vier sichere Bewegungen neben einer Vitrine heilen bereits `1 HP`

## Sicht, Entdeckung und Informationsmodell

Das Spiel verwendet kein vollständig offenes Informationsmodell.

### Sichtweite

- Basis-Sichtweite: `5`
- zusätzliche Sichtweite: `+lightBonus` der ausgerüsteten Hauptwaffe

Aktuell existiert `lightBonus` nur über passive Waffeneffekte.

### Sichtblocker

Sicht wird blockiert durch:

- Wände
- geschlossene Türen

### Sichtlinienregel

Eine Kachel ist sichtbar, wenn:

- sie innerhalb der Sichtweite liegt
- eine Sichtlinie zwischen Spieler und Zielkachel besteht

Für die Sichtweitenprüfung wird aktuell die Chebyshev-Distanz verwendet:

- `max(abs(dx), abs(dy)) <= Sichtweite`

Sicht ist nicht auf Kardinalrichtungen beschränkt, aber diagonale Sicht scheitert, wenn beide Eckkacheln eines Diagonalschnitts opak sind.

### Zusätzliche Wandaufdeckung

Sobald ein sichtbares Bodentile vorliegt, werden angrenzende Wände und Wand-Ecken ebenfalls sichtbar gemacht. Dadurch wirken Räume lesbarer, ohne dass die eigentliche Sichtlogik aufgeweicht wird.

### Gegnerwissen

Ein Gegnertyp wird erst nach der ersten echten Kampfszene als „bekannt“ markiert. Bis dahin zeigt das Spiel weniger Detailinformationen. Das ist keine reine UI-Entscheidung, sondern Teil des Informationsmodells.

## Struktur von Studiokomplex und Studios

### Studiofolge im Run

Ein Run erzeugt eine zufällig gemischte Reihenfolge aus 10 Film-Archetypen. Die Studios folgen dieser Reihenfolge zyklisch.

Regel:

- Studio `n` verwendet den Archetyp an Position `((n - 1) mod 10)` der Run-Sequenz.

Folgen:

- derselbe Run hat eine feste, wiederkehrende Studio-Reihenfolge
- beim Zurückkehren in ein bereits besuchtes Studio bleibt dessen Archetyp stabil
- nach 10 Studios beginnt die Sequenz wieder von vorn

### Studio-Topologie und Übergänge

Zusätzlich zur Archetypenfolge verwaltet jeder Run eine Studio-Topologie. Jedes Studio ist ein Knoten in einem 3D-Gitter mit Position `x/y/z` und kennt:

- die Richtung, aus der man das Studio betritt
- die Richtung, in die es weitergeht
- den Übergangsstil dieses Ein- oder Ausgangs

Aktuelle Richtungen:

- `left`
- `right`
- `front`
- `back`
- `up`
- `down`

Aktuelle Übergangsstile:

- horizontale Richtungen verwenden `passage`
- vertikale Richtungen verwenden zufällig `stairs` oder `lift`

Folgen:

- Ein- und Ausgang eines Studios werden nicht mehr losgelöst gewürfelt, sondern aus dem Topologie-Knoten abgeleitet
- vertikale Studio-Wechsel können als Treppe oder Lift im Studio auftauchen
- Übergangs-Hinweise werden beim Erzeugen benachbarter Studios synchronisiert, damit Anschlusspositionen über Studio-Grenzen konsistent bleiben

### Allgemeiner Studioaufbau

Jedes Studio nutzt aktuell primär das Layout `branch`. Der Generator baut dabei ein prozedural erzeugtes Netzwerk aus:

- einem 2 bis 3 Felder breiten Hauptkorridor
- Ankerpunkten für Ein- und Ausgang
- Räumen und Seitenarmen
- offenen Nebenverbindungen zwischen passenden Nebenräumen
- Türen
- Durchgängen, Treppen oder Liften
- Gegnern
- Loot
- Showcases
- Fallen

Typischer Ablauf:

- Zuerst entsteht ein horizontal dominanter Hauptkorridor innerhalb einer zufälligen Bounding Box.
- Danach werden Ein- und Ausgang an diesem Backbone verankert.
- Horizontale Übergänge bevorzugen Rand-/Eingangsräume; vertikale Übergänge sitzen in kurzen Nischen neben dem Korridor.
- Anschließend setzt der Generator zuerst offene Connector-Räume, dann Themenräume und danach weitere Connectoren oder zusätzliche Seitenschleifen.

Aktuelle Raumrollen:

- `entry_room`: äußerer Ein-/Ausgangsraum am Kartenrand
- `connector_room`: offener Zwischenraum ohne Tür, der weitere Äste tragen kann
- Themenräume: `weapon_room`, `aggro_room`, `calm_room`, `canteen`, `props_room`, `costume_room`, `hazard_room`, `trap_room`, `showcase_room`

Zusätzliche Strukturregeln:

- der Generator versucht mindestens `3` Themenräume; die Zielzahl steigt mit der Länge des Hauptkorridors bis maximal `8`
- `showcase_room` ist exklusiv für Vitrinen vorgesehen
- zusätzliche Schleifen verbinden nur geeignete Nebenräume oder Connector-Räume, nicht aber Ein-/Ausgangsräume oder bereits überlagerte Locked-Räume
- falls das branch-Layout nach `120` Versuchen kein gültiges Studio liefert, wird ein einfacherer `branch_fallback` gebaut, damit die Studio-Erzeugung nicht abbricht

Strukturelle Regeln:

- Spieler und Gegner teilen keinen Starttile
- Startposition und tatsächliche Übergangsposition können auseinanderfallen, wenn ein Ein-/Ausgangsraum oder eine Nische zwischen Korridor und Übergang liegt
- Showcases blockieren Bewegung
- Showcases liegen nicht auf Türen oder Treppen
- Showcases dürfen keine zuvor erreichbaren Flächen abtrennen
- verschlossene Räume werden so gebaut, dass kein alternativer Eingang offen bleibt
- verschlossene Türen erscheinen nur, wenn ein passender Schlüssel im selben Studio erreichbar ist

### Spawnmengen pro Studio

- Gegner pro Studio: `min(15, floor == 1 ? 5 : 5 + ceil(floor * 1.05))`
- Heiltränke pro Studio: `2 + floor(floor / 2)`

### Waffen-, Schild- und Chest-Spawns

- Bodenwaffe: ab Studio `2`, Chance `25%`
- Anzahl Bodenwaffen:
  - Studio `1-2`: immer `1`, falls Spawn stattfindet
  - Studio `3-7`: `35%` auf `2`, sonst `1`
  - Studio `8+`: `60%` auf `2`, sonst `1`
- Bodenschild:
  - Studio `2`: `35%`
  - Studio `5+`: `8%`
- Chest-Spawn: `min(0.55, 0.2 + floor * 0.06)`
- Chest-Anzahl:
  - ab Studio `4`: `35%` auf `2`, sonst `1`
  - davor: `1`

### Chest-Inhalt

Wenn eine normale Chest Ausrüstung erzeugt:

- ab Studio `2` zuerst `10%` Chance auf Schild
- sonst Waffe

Verschlossene Räume können zusätzlich eine Bonus-Chest enthalten.

- Chance auf Locked-Room-Chest: `80%`
- diese Chest würfelt mit `floorNumber + 1`
- zusätzlich wird die Sonderwaffen-Neigung erhöht

## Türen, Schlösser und Schlüssel

### Normale Türen

- geschlossene normale Türen öffnen sich automatisch, wenn der Spieler hineinläuft
- Gegner mit `canOpenDoors = true` können normale Türen ebenfalls öffnen
- geschlossene Türen blockieren Bewegung und Sicht
- offene Türen können mit `C` wieder geschlossen werden, wenn das Türfeld leer ist

### Verschlossene Türen

Eine verschlossene Tür:

- braucht einen farblich passenden Schlüssel
- akzeptiert nur Schlüssel aus dem aktuellen Studio
- wird beim Öffnen sofort zu einer normalen offenen Tür
- verbraucht den Schlüssel

Aktuelle Schlüsselfarben:

- `green`
- `blue`

### Anzahl verschlossener Türen pro Studio

Studio `< 3`:

- keine verschlossenen Türen

Studio `3-4`:

- `22%` für `2`
- `58%` für `1`
- `20%` für `0`

Studio `5-7`:

- `10%` für `3`
- `38%` für `2`
- `42%` für `1`
- `10%` für `0`

Studio `8+`:

- `18%` für `3`
- `44%` für `2`
- `33%` für `1`
- `5%` für `0`

Zusatzregeln:

- maximal `3` verschlossene Türen pro Studio
- genau `1` Schlüssel pro verschlossener Tür
- Locked-Bonus-Räume werden nur auf isolierten Seitenarmen mit genau einer Tür angelegt; Entry-, Connector- und Showcase-Räume sind davon ausgenommen
- Schlüssel bleiben im Inventar, wenn sie aus einem anderen Studio stammen, funktionieren dort aber nicht

## Showcases

Showcases sind feste Hindernisse mit leichter Systemwirkung.

Konkrete Regeln:

- sie blockieren Bewegung
- sie werden nur im `showcase_room` auf freien Bodentiles platziert
- sie schneiden keine erreichbaren Flächen ab
- sie reservieren ihre benachbarten Triggerfelder so, dass mehrere Vitrinen sich nicht gegenseitig entwerten
- sie können thematische Raumtexte auslösen
- pro Vitrinenraum werden höchstens `3` Showcases platziert
- archetypspezifische Props werden vor globalen Props bevorzugt
- direkte Nachbarschaft zu ihnen verbessert die sichere Regeneration um `+0.5` Fortschritt pro geeigneter Aktion

## Heiltränke

Heiltränke sind eine feste Sofortressource.

Regeln:

- Heilwert: `8 HP`
- ein Trank kann direkt getrunken oder eingelagert werden
- Nutzung aus Inventar kostet eine Runde
- Heilung wird auf `maxHp` gekappt

## Nahrung

Nahrung kann direkt gegessen oder eingelagert werden.

Aktuelle Nahrungswerte:

- Süßigkeit: `15`
- Chips: `30`
- Popcorn: `50`
- Softdrink: `60`
- Sandwich: `75`
- Burgerreste: `95`
- Bohnenkonserve: `110`
- Energieriegel: `125`
- Räucherfleisch: `150`
- Jagdration: `190`

### Welt-Nahrungsbudget

Jedes Studio würfelt eine Versorgungsklasse und skaliert deren Budget mit dem Faktor `0.35`.

Versorgungsklassen:

- `SCARCE`: Gewicht `28`, Rohbudget `90-160`
- `LOW`: Gewicht `34`, Rohbudget `161-240`
- `NORMAL`: Gewicht `24`, Rohbudget `241-320`
- `HIGH`: Gewicht `10`, Rohbudget `321-420`
- `ABUNDANT`: Gewicht `4`, Rohbudget `421-520`

Das Budget wird aufgeteilt in:

- `78%` Weltspawns
- `14%` Container
- `8%` Monsterdrops

Welt-Nahrung wird über gewichtete Itempicks aufgebaut:

- Süßigkeit `18`
- Chips `18`
- Popcorn `18`
- Softdrink `16`
- Sandwich `12`
- Burgerreste `8`
- Bohnenkonserve `8`
- Energieriegel `8`
- Räucherfleisch `4`
- Jagdration `2`

Zusätzliche Regel:

- der Food-Budget-Builder darf leicht über das Ziel hinausschießen, bricht aber ab, sobald das Budget mehr als `80` Punkte überzogen wäre

## Ausrüstung

### Fäuste als Minimalwaffe

Wenn keine andere Waffe vorhanden ist, gilt:

- Schaden `1`
- Trefferbonus `0`
- Kritbonus `0`
- Nahkampf
- Reichweite `1`

### Zweihand-Regel

Wird eine zweihändige Waffe ausgerüstet:

- die Nebenhand wird freigeräumt
- ein ausgerüstetes Schild wandert ins Inventar

Ein Schild kann nicht ausgerüstet werden, solange eine zweihändige Hauptwaffe getragen wird.

## Kampfmodell

Das Spiel verwendet ein deterministisches Attributsmodell mit Prozentwürfen.

### Trefferchance

Formel:

`Trefferchance = clamp(65 + (HitValue - DodgeValue), 10, 90)`

mit

- `HitValue = (Präzision + Präzisionsmodifikator) * 2 + Waffen-Hitbonus + Nahkampf-Malus der Fernwaffe + Eröffnungsbonus`
- `DodgeValue = (Reaktion + Reaktionsmodifikator) * 2 + Nerven des Verteidigers`

### Kritchance

Formel:

`Kritchance = clamp(Präzision + Präzisionsmodifikator + Waffen-Kritbonus + Eröffnungsbonus, 0, 50)`

### Schaden

Basisschaden:

`Basisschaden = max(1, Stärke + Waffenschaden + bedingter Zusatzschaden)`

Kritischer Schaden:

`floor(Basisschaden * 1.5)`

Wichtig:

- der aktuell vorhandene bedingte Zusatzschaden ist im Live-Regelwerk derzeit effektiv `0`

### Schildblock

Blockchance:

`clamp(Schild-Blockchance + Nerven + shieldBlockBonus, 5, 75)`

Geblockter Schaden:

`max(0, eingehender Schaden - blockValue)`

Schildblock wirkt nur, wenn tatsächlich ein Schild in der Nebenhand ausgerüstet ist.

### Eröffnungsbonus der Hauptrolle

Der Bonus gilt für den ersten Angriff gegen einen konkreten Gegner.

Wichtig:

- der Bonus wird schon beim ersten Angriffsversuch verbraucht
- auch ein Verfehlen verbraucht diesen einmaligen Bonus gegen genau diesen Gegner

## Fernkampf

Fernkampf ist an klare Bedingungen gebunden.

Ein Spieler kann nur in den Zielmodus wechseln, wenn:

- die ausgerüstete Waffe `attackMode = ranged` hat
- die Waffe `range > 1` besitzt

Ein Fernkampfangriff auf ein Ziel ist nur erlaubt, wenn:

- das Ziel sichtbar ist
- es innerhalb der Reichweite liegt
- es in gerader Linie liegt
- eine freie Sichtlinie besteht

Nahkampf-Malus für Fernwaffen:

- viele Fernwaffen tragen einen negativen `meleePenaltyHit`, wenn auf Distanz `<= 1` angegriffen wird

Gegner mit Fernwaffen nutzen dieselbe Grundlogik:

- nur auf Distanz `> 1`
- nur innerhalb ihrer Reichweite
- nur in gerader Linie
- nur mit Sichtlinie

## Status-Effekte

Status-Effekte greifen nur, wenn:

- ein Angriff trifft
- tatsächlicher Schaden nach Block übrig bleibt
- der Proc-Wurf gelingt

Sie ticken in der Status-Phase jeder Runde.

### Aktuelle Effekte

| Effekt | Trigger | Basis-Proc | Dauer Tier 1/2/3 | Wirkung |
| --- | --- | ---: | --- | --- |
| Blutung | Hit | `22%` | `2 / 3 / 4` | DoT `1 / 2 / 3` |
| Gift | Hit | `20%` | `2 / 3 / 4` | DoT `1 / 1 / 2` |
| Präzisionsmalus | Hit | `24%` | `2 / 3 / 4` | `-1 / -2 / -3 Präzision` |
| Reaktionsmalus | Hit | `20%` | `2 / 3 / 4` | `-1 / -2 / -3 Reaktion` |
| Betäubung | Hit | `12%` | `1 / 1 / 2` | keine Aktion/Bewegung |
| Gefesselt | Hit | `14%` | `1 / 2 / 3` | keine Bewegung |
| Lichtbonus | Passiv | - | `1 / 2 / 3` | `+1 / +2 / +3 Sichtweite` |
| Krit-Bonus | Passiv | - | `1 / 2 / 3` | `+1 / +2 / +3 Krit` |

### Floor-Procbuff für Waffeneffekte

Zusätzlicher Proc-Bonus nach Studio-Slot innerhalb des 10er-Zyklus:

- Slot `1-2`: `+0`
- Slot `3-4`: `+2`
- Slot `5-6`: `+4`
- Slot `7-8`: `+6`
- Slot `9-10`: `+8`

Für High-Impact-Effekte (`stun`, `root`) gilt nur die Hälfte dieses Bonus.

### Harte Sonderregeln

- Gegner mit `rank >= 9` sind immun gegen `stun`
- `root` wird bei `elite`- und `dire`-Gegnern um `1` Dauer reduziert, mindestens aber auf `1`

## Waffen- und Schildgenerierung

### Waffen: Grundskalierung

Jede Waffenbasis erhält studioabhängige Skalierung nach Slot im 10er-Zyklus.

Slot-Tabelle:

- `1`: Schaden `0`, Treffer `0`, Krit `0`
- `2`: Schaden `1`, Treffer `0`, Krit `0`
- `3`: Schaden `1`, Treffer `1`, Krit `0`
- `4`: Schaden `2`, Treffer `1`, Krit `0`
- `5`: Schaden `2`, Treffer `1`, Krit `1`
- `6`: Schaden `3`, Treffer `1`, Krit `1`
- `7`: Schaden `3`, Treffer `2`, Krit `1`
- `8`: Schaden `4`, Treffer `2`, Krit `1`
- `9`: Schaden `4`, Treffer `2`, Krit `2`
- `10`: Schaden `5`, Treffer `3`, Krit `2`

Jeder volle 10er-Zyklus darüber addiert:

- `+5` Schaden
- `+3` Treffer
- `+2` Krit

Diese Basisskalierung wird je nach Waffenprofil gewichtet:

- `light_melee`: Schaden `0.8`, Treffer `1.25`, Krit `1.25`
- `heavy_melee`: Schaden `1.25`, Treffer `0.75`, Krit `0.75`
- `precise_ranged`: Schaden `1.0`, Treffer `1.25`, Krit `1.0`
- `special_improv`: Schaden `0.9`, Treffer `1.0`, Krit `0.75`

### Waffenraritäten nach Quelle

Waffen verwenden eigene Quellenprofile:

| Quelle | Gewöhnlich | Ungewöhnlich | Selten | Sehr selten |
| --- | ---: | ---: | ---: | ---: |
| Boden | 70 | 24 | 5 | 1 |
| Chest | 50 | 35 | 12 | 3 |
| Monster | 40 | 40 | 16 | 4 |
| Locked-Room-Chest | 30 | 45 | 20 | 5 |

Raritätsobergrenzen:

- Studio `1`: maximal `uncommon`
- Studio `2-3`: maximal `rare`
- ab Studio `4`: maximal `veryRare`

### Waffenmods

Aktuell erhalten Waffen:

- bei `uncommon`: `1` numerischen Mod
- bei `rare`: `2` numerische Mods
- bei `veryRare`: `2` numerische Mods

Numerische Mod-Pools:

- Schaden `+1`
- Treffer `+1`
- Krit `+1`

Zusätzlich:

- `rare`: `45%` Chance auf einen garantierten Standardeffekt
- `veryRare`: immer ein Standardeffekt und `24%` Chance auf einen zusätzlichen High-Impact-Effekt
- maximal `2` Effekte pro Waffe

### Schilde: Rarität und Modifikatoren

Schilde verwenden die allgemeine Ausrüstungsrarität.

Basisgewichte:

- `common 70`
- `uncommon 22`
- `rare 7`
- `veryRare 1`

Anpassungen:

- ab Studio `4`: `common -6`, `uncommon +4`, `rare +2`
- ab Studio `7`: zusätzlich `common -6`, `uncommon +3`, `rare +2`, `veryRare +1`
- `chest`: `common -4`, `uncommon +2`, `rare +1`, `veryRare +1`
- `locked-room-chest`: `common -18`, `uncommon +10`, `rare +6`, `veryRare +2`
- Monsterdrops drücken Schilde eher nach unten
- `elite`- und `dire`-Drops heben Raritäten wieder an

Anzahl Schild-Modifikatoren:

- `common`: `0`
- `uncommon`: `1`
- `rare`: `2`
- `veryRare`: `3`

Aktuelle Schildmods:

- `sturdy`: `+1 Blockwert`
- `reflective`: `+4 Blockchance`, reflektiert bei Block `1` Schaden
- `calming`: `+3 Blockchance`, `+1 Blockwert`
- `reactive`: `+5 Blockchance`
- `fortified`: `+2 Blockchance`, `+2 Blockwert`
- `cursedGuard`: `+6 Blockchance`, `+2 Blockwert`

## Loot-Archetypen

Ausrüstung richtet sich nicht nur nach Studiotiefe, sondern auch nach Studio-Archetypen.

Wenn kein fester Archetyp vorgegeben ist, würfelt Loot aus:

- aktuellem Studio-Archetyp
- direkten Nachbar-Archetypen in der Run-Sequenz
- Archetypen in Distanz zwei

Quellengewichte:

| Quelle | Aktuell | Nachbar gesamt | Distanz zwei gesamt |
| --- | ---: | ---: | ---: |
| Boden | 72 | 20 | 8 |
| Chest | 68 | 22 | 10 |
| Monster | 80 | 16 | 4 |
| Locked-Room-Chest | 62 | 24 | 14 |

Die Nachbar- und Distanz-zwei-Werte werden intern auf beide Seiten verteilt. Dadurch bleibt Loot archetypnah, streut aber kontrolliert.

## Gegnerfreischaltung und Skalierung

### Freischaltung nach Studio

- Studio `1`: nur Rang `1`
- ab Studio `2`: maximal Rang `floor + 1`
- oberes Limit: höchster Rang im Katalog

### Skalierung

`scale = max(0, floorNumber - monsterRank)`

Darauf basieren:

- HP: `monster.hp + scale * 5 + Zufall 0-2`
- XP: `monster.xpReward + scale * 5`
- Präzision: `+ floor(scale / 2)`
- Reaktion: `+ floor(scale / 2)`
- Nerven: `+ floor(scale / 2)`
- Intelligenz: `+ floor(scale / 3)`
- Aggro-Radius: `+ min(4, floor(scale / 3))`

Wichtig:

- Stärke verwendet aktuell `monster.strength + floor((scale + 1) / 1)`, also effektiv immer mindestens `+1`

Zusätzliche Aggro-Erhöhung aus Mobilität:

- `roaming`: `+1`
- `relentless`: `+2`
- `local`: `+0`

## Gegnervarianten

Jeder Gegner würfelt zusätzlich eine Variantentier-Stufe.

### Variantengewichte

| Studio | Normal | Elite | Dire |
| --- | ---: | ---: | ---: |
| 1-2 | 100 | 5 | 1 |
| 3 | 100 | 8 | 1 |
| 4 | 100 | 8 | 2 |
| 5 | 100 | 12 | 2 |
| 6-7 | 100 | 12 | 3 |
| 8 | 100 | 16 | 3 |
| 9+ | 100 | 16 | 4 |

### Varianteneffekte

| Tier | HP-Multiplikator | XP-Multiplikator | Mod-Anzahl |
| --- | ---: | ---: | ---: |
| Normal | `1.00` | `1.00` | 0 |
| Elite | `1.18` | `1.35` | 1 |
| Dire | `1.32` | `1.65` | 2 |

Aktuelle Variantenmods:

- `hulking`: `hpFlat +4`, `strength +1`
- `brutal`: `strength +2`
- `keen`: `precision +2`
- `swift`: `reaction +2`, `aggroRadius +1`
- `unyielding`: `nerves +2`, `hpFlat +2`
- `cunning`: `intelligence +2`, `precision +1`

### Monsterdrop-Sonderregel

Waffendrops von Gegnern werden zusätzlich über ikonisch/nicht ikonisch gewichtet:

- nicht ikonische Monster haben bei der Auswahl eine Gewichtung `* 1.45`
- ikonische Monster eine Gewichtung `* 0.72`

## Gegner-KI

### Verdeckte Standardwerte

Falls ein Gegnerprofil keinen expliziten Wert setzt, gelten aktuell:

- `mobility = roaming`
- `retreatProfile = none`
- `healingProfile = slow`

Das ist für den aktuellen Spielstand wichtig, weil viele Monster im Katalog diese Felder nicht explizit setzen.

### Mobilität

- `local`: Gegner darf sich höchstens `6` Felder Manhattan-Distanz von seinem Ursprungsort entfernen
- `roaming`: keine Leine
- `relentless`: keine Leine

Aggro-Regeln:

- `local`: verliert Aggro wieder, wenn Distanz `> aggroRadius + 4`
- `roaming`: wird aggressiv bei Distanz `<= aggroRadius + 1`
- `relentless`: wird aggressiv bei Distanz `<= aggroRadius + 2` oder bleibt aggressiv, sobald Aggro einmal aktiv war

### Bewegungslogik

Gegner pfaden um Hindernisse herum, solange ein legaler Weg existiert. Sie respektieren:

- Wände
- Showcases
- andere Gegner
- den Spieler
- verschlossene Türen, wenn sie sie nicht öffnen dürfen
- lokale Mobilitätsgrenzen

### Türverhalten von Gegnern

- normale geschlossene Türen blockieren Gegner ohne `canOpenDoors`
- Gegner mit `canOpenDoors` öffnen normale Türen beim Durchschreiten
- verschlossene Türen bleiben für Gegner geschlossen

### Rückzug

Ein Gegner versucht aktiv zu fliehen, wenn alle Bedingungen erfüllt sind:

- `retreatProfile` ist nicht `none`
- Gegner ist bereits aggressiv
- `intelligence >= 4`
- Distanz zum Spieler ist klein genug
- eigener HP-Anteil ist niedrig genug
- Spieler ist selbst nicht stark angeschlagen
- der Spieler hat noch einen klaren HP-Vorteil

Konkret:

- `cautious`: Distanz `<= 3`, eigener HP-Anteil `<= 0.28`, Spieler-HP-Anteil `>= 0.45`, Spieler-HP `> Gegner-HP + 2`
- `cowardly`: Distanz `<= 4`, eigener HP-Anteil `<= 0.45`, Spieler-HP-Anteil `>= 0.45`, Spieler-HP `> Gegner-HP`

Wenn ein Gegner im Nahkontakt flieht:

- versucht er zuerst Abstand statt anzugreifen

Ranged-Gegner verhalten sich ähnlich:

- wenn sie auf Distanz `<= 2` gedrängt werden, weichen sie zurück

### Gegneregeneration

Gegner heilen nur, wenn:

- sie nicht auf Max HP sind
- sie nicht direkt angrenzend zum Spieler stehen
- genügend Züge seit dem letzten Treffer vergangen sind

Profile:

- `slow`: nach `6` Zügen `+1 HP`
- `steady`: nach `4` Zügen `+1 HP`
- `lurking`: nach `3` Zügen `+1 HP`, aber nur ohne Aggro

Da der Default aktuell `slow` ist, regenerieren viele Gegner langfristig, wenn man sie nach Treffern lange aus dem direkten Kampf herauslöst.

### Verhaltensprofile

`dormant`:

- wird bei Distanz `<= aggroRadius` mit `55%` aggressiv
- jagt nur unter Aggro
- wandert sonst mit `28%` Wahrscheinlichkeit

`wanderer`:

- wird bei Distanz `<= aggroRadius + 1` als `roaming` oder `<= aggroRadius` sonst mit `68%` aggressiv
- verfolgt unter Aggro mit `78%`
- wandert sonst

`trickster`:

- wird bei Distanz `<= aggroRadius + 1` aggressiv
- verfolgt unter Aggro mit `80%`
- wandert sonst

`hunter`:

- wird bei Distanz `<= aggroRadius + 1`, bzw. `+2` bei `relentless`, aggressiv
- verfolgt unter Aggro zuverlässig
- kann ohne Aggro mit `25%` wieder in Richtung Ursprungsort arbeiten

`juggernaut`:

- wird bei Distanz `<= aggroRadius`, bzw. `+1` bei `relentless`, aggressiv
- verfolgt unter Aggro zuverlässig
- wandert sonst nur mit `15%`

Wichtig:

- der im Katalog häufig verwendete Typ `stalker` besitzt aktuell keine eigene Sonderlogik und fällt auf die allgemeine Default-Logik zurück
- diese Default-Logik verfolgt bei Distanz `<= aggroRadius`, wandert sonst mit `25%`

## Fallen und Gefahrenfelder

### Spawnmengen

Die Trap-Menge wird nicht mehr linear pro Studiotiefe vergeben, sondern als variables Trap-Budget gerollt.

Grundprofile pro Studio:

- Studio `1`: immer `0`
- Studio `2`: meist `2-3`, selten `0`
- Studio `3`: stark schwankend zwischen `0`, `2`, `4`, `5`
- Studio `4`: stark schwankend zwischen `1`, `3`, `5`, `7`
- Studio `5`: stark schwankend zwischen `1`, `4`, `6`, `8`
- Studio `6+`: stark schwankend zwischen `2`, `5`, `7`, `9`, `11`

Zusätzlich kommt ein kleiner Bonus aus der erreichbaren begehbaren Flaeche:

- ab `120` erreichbaren Bodenfeldern: `+1`
- ab `170`: `+2`
- ab `220`: `+3`

Wenn ein Studio das Profil `0` rollt, bleibt es trotz Flaechenbonus komplett fallenfrei.

Trap-Typen werden danach aus dem Budget gezogen:

- Studio `2`: nur `floor`
- Studio `3`: vor allem `floor`, erste `alarm`- und `hazard`-Anteile
- Studio `4-5`: ausgeglichener Mix
- Studio `6+`: weiter gemischter Mix aus `floor`, `alarm`, `hazard`

### Platzierung im Layout

Die globale Trap-Menge wird zuerst als Budget gerollt. Die eigentliche Platzierung passiert danach ueber einen gemeinsamen Tile-Pool aus:

- Raum-Innenfeldern
- Hauptkorridorfeldern
- Nebenkorridorfeldern

Jedes freie Kandidatenfeld traegt ein Gewicht. Bei Raumfeldern ist das der `trapFactor` des Raumtyps, bei Korridoren ein eigener Korridorfaktor.

Nicht verwendet werden:

- Starttile des Spielers
- Ein- und Ausgangsfelder
- Tuerfelder
- bereits fuer andere Spawnobjekte reservierte Tiles
- Locked-Bonus-Raeume

Aktuelle `trapFactor`-Werte der Raumrollen:

| Raumrolle | trapFactor |
| --- | ---: |
| `entry_room` | `0` |
| `connector_room` | `1.8` |
| `weapon_room` | `0.6` |
| `aggro_room` | `2.2` |
| `calm_room` | `0` |
| `canteen` | `0` |
| `props_room` | `1.1` |
| `costume_room` | `0.6` |
| `hazard_room` | `2.8` |
| `trap_room` | `6.0` |
| `showcase_room` | `0` |

Korridorfaktoren:

- Hauptkorridor: `1.2`
- Nebenkorridore: `1.6`

Wichtig: `trapFactor = 0` bedeutet jetzt tatsaechlich, dass dieser Raumtyp keine Fallen bekommen darf. Dadurch koennen ruhige oder kuratierte Studiosegmente gezielt fallenfrei gehalten werden.

Das bedeutet: Die gefuehlte Trap-Dichte wird nicht nur von der Anzahl, sondern stark von Raumtyp und Gangtyp geformt. Besonders `trap_room`, `hazard_room`, `aggro_room`, Connectoren und Nebenkorridore ziehen Fallen deutlich haeufiger an als ruhige oder kuratierte Raeume.


### Typen

`floor`:

- verborgen
- Trigger beim Betreten
- einmalig
- betrifft Spieler und Gegner

`alarm`:

- verborgen
- Trigger beim Betreten
- einmalig
- betrifft als Auslöser den Spieler

`hazard`:

- sichtbar
- kontinuierlich aktiv
- persistent
- betrifft Spieler und Gegner

### Fallenentdeckung

Verborgene Fallen können entdeckt werden, wenn:

- sie aktiv sind
- sie verborgen sind
- sie in Manhattan-Distanz `1` zum Spieler liegen
- der Spieler eine Entdeckungsprobe besteht

Formel:

`Entdeckungschance = clamp(25 + (precision - detectDifficulty) * 15 + trapDetectionBonus, 5, 95)`

### Fallenvermeidung beim Auslösen

Bei `on_enter`-Fallen gilt:

`Vermeidungschance = clamp(20 + (reaction - reactDifficulty) * 15 + Sichtbarkeitsbonus + trapAvoidBonus, 5, 95)`

mit

- Sichtbarkeitsbonus `+15`, wenn die Falle vor dem Auslösen bereits sichtbar war

Auch eine vermiedene `single_use`-Falle wird danach verbraucht.

### Fallschaden

Wenn eine Falle Schaden verursacht, wird der Endschaden so berechnet:

Für den Spieler:

`max(1, trapDamage - floor(endurance / 3 oder / 2 bei Dauergefahr) - trapDamageReduction)`

Für Gegner:

`max(1, trapDamage - floor(endurance / 4))`

Der Stuntman reduziert darüber hinaus zusätzlich den eingehenden Fallenschaden durch `trapDamageReduction = 1`.

### Alarmfallen

Wenn eine Alarmfalle den Spieler auslöst:

- alle Gegner innerhalb Manhattan-Distanz `<= 8` werden aggressiv

### Aktuelle Teilimplementierungen

Einige Fallen tragen schon weitere Effekte, die nur teilweise mechanisch weitergeführt sind:

- `slow` erzeugt derzeit nur eine Meldung, aber keinen separaten persistenten Bewegungsmalus
- `nerveDebuff` ist als Effektfeld angelegt, wird aktuell aber nicht weiter verarbeitet

### Einflusswerte auf Fallen

Direkt oder indirekt auf Fallen wirken aktuell:

- Trap-Budget-Profil des Studios: bestimmt die grobe Mengenklasse von ruhig bis vermint
- erreichbare begehbare Flaeche: gibt einen kleinen Bonus auf das Trap-Budget grosser Studios
- `trapFactor` und Korridorfaktoren: bestimmen, auf welchen Raum- und Gangtypen Fallen wahrscheinlicher landen
- `detectDifficulty`: Gegenspieler fuer die Entdeckungsprobe
- `reactDifficulty`: Gegenspieler fuer die Vermeidungsprobe beim Betreten
- `effect.damage`, `effect.alarm`, `effect.slow`, `effect.nerveDebuff`: bestimmen die konkrete Falle selbst
- `precision`: erhoeht die Entdeckungswahrscheinlichkeit
- `reaction`: erhoeht die Vermeidungswahrscheinlichkeit
- `endurance`: reduziert den erlittenen Fallenschaden
- `trapDetectionBonus`: Klassenbonus des Regisseurs auf Entdeckung
- `trapAvoidBonus`: Klassenbonus des Regisseurs auf Vermeidung
- `trapDamageReduction`: Klassenbonus des Stuntman auf Schaden
- Ausruestung mit `statMods` auf `precision`, `reaction` oder `endurance`: wirkt indirekt auch auf Trap-Proben
- Level-Ups: erhoehen langfristig vor allem `precision` und `reaction`, damit auch Trap-Sicherheit
- Gegnerwerte: Gegner nutzen beim Ausloesen ihre eigenen `reaction`-/`endurance`-Werte

Wichtig: Temporaere Kampf-Debuffs wie `precision_malus` und `reaction_malus` fliessen derzeit nicht in die Trap-Formeln ein, weil Fallen direkt auf den rohen Actor-Stats rechnen.

### Balanceeinschaetzung und Tuning-Hebel

Der aktuelle Stand wirkt nun deutlich lebendiger und besser auf grosse Studios abgestimmt:

- Studios koennen jetzt bewusst ruhig oder ploetzlich stark vermint ausfallen, statt nur linear immer voller zu werden.
- Groessere erreichbare Studios ziehen moderat mehr Fallen an, ohne dass die Flaeche die Mengenlogik komplett dominiert.
- Fallen koennen jetzt auch in Haupt- und Nebenkorridoren liegen, also genau auf Wegen, die der Spieler real oft nutzt.
- Raumtypen mit `trapFactor = 0` bleiben bewusst fallenfrei; gefaehrliche Raumtypen und Korridore koennen dafuer klar betont werden.
- Dauergefahren sind weiterhin der weichste Teil des Systems: eine Variante verursacht nur `2` Basisschaden und faellt beim Spieler wegen `endurance` fast immer auf `1`, die andere Variante meldet nur `slow`, ohne echten Folgeschritt.

Empfohlene Tuning-Reihenfolge:

1. Erst Wirkung schaerfen. Am meisten bringt aktuell, `slow`/`nerveDebuff` mechanisch fertigzubauen oder `sparking-cable` von `2` auf `3` Basisschaden anzuheben.
2. Wenn Fallen noch oefter auf dem Hauptweg liegen sollen, zuerst `MAIN_CORRIDOR_TRAP_FACTOR`, `SIDE_CORRIDOR_TRAP_FACTOR`, `connector_room`, `aggro_room`, `hazard_room` und `trap_room` justieren.
3. Wenn die Gesamtmenge weiter steigen soll, zunaechst die Budget-Profile pro Studiotiefe anheben statt wieder in ein starres lineares Spawn-Schema zurueckzufallen.

## Erfahrung und Levelaufstieg

XP-Anforderung für das nächste Level:

`40 + (level - 1) * 28 + floor((level - 1)^2 * 6)`

Level-Up-Belohnungen:

- immer `+3 maxHp`
- volle Heilung
- auf geraden Levels `+1 Stärke`
- auf ungeraden Levels `+1 Präzision` und `+1 Nerven`
- auf jedem dritten Level `+1 Reaktion`
- auf jedem vierten Level `+1 Intelligenz`

Ein Level-Up erhöht also nicht nur das Durchhaltevermögen, sondern verschiebt auch Treffer-, Krit- und Verteidigungsformeln.

## Monsterdrops

### Ausrüstung

Wenn ein Gegner besiegt wird, können seine aktuell generierten Ausrüstungsstücke fallen gelassen werden.

Waffendropchance:

- ikonisch, normal `25%`
- ikonisch, elite `34%`
- ikonisch, dire `45%`
- nicht ikonisch, normal `8%`
- nicht ikonisch, elite `16%`
- nicht ikonisch, dire `24%`

Offhand-Dropchance:

- normal `6%`
- elite `12%`
- dire `18%`

### Nahrung

Ein Teil der Monster kann zusätzlich geplante Nahrung fallen lassen. Die Einzeldropchance liegt je nach Monster aktuell grob zwischen `6%` und `15%`.

## Highscore- und Runwertung

Beim Tod wird genau ein Highscore-Eintrag erzeugt, falls der Run noch nicht gespeichert wurde.

Sortierung:

1. tiefstes erreichtes Studio
2. höheres Level
3. mehr Kills
4. weniger Züge

Zusatzregeln:

- es werden nur die besten `100` Einträge behalten
- ein neuer Eintrag außerhalb der Top 100 gilt als `Außer Wertung`

## Aktuelle Ausbaupunkte und latent angelegte Regeln

Diese Punkte sind im Regelwerk bereits sichtbar, aber noch nicht voll ausgeschöpft:

- Der Waffenmodifikator `final` ist angelegt, aber der dazugehörige bedingte Schadensbonus ist aktuell effektiv `0`.
- `stalker` ist als Gegnerverhalten im Katalog vorhanden, besitzt aber derzeit keine eigene KI-Abzweigung.
- `slow` und einzelne weitere Trap-Effektfelder erzeugen aktuell eher Signale als vollwertige Folgeregeln.
- Der Wert `charm` kann auf manchen Schilden auftauchen, ist im aktuellen sichtbaren Kernregelwerk aber an keine weitere Kampfformel angeschlossen.
- Viele Gegner nutzen implizit die Default-Profile `roaming`, `none`, `slow`, weil diese Werte im Katalog oft nicht explizit gesetzt sind.

## Systemische Hauptzusammenhänge

Die wichtigsten klaren Wechselwirkungen im aktuellen Spielstand sind:

- `Ausdauer` beeinflusst gleichzeitig Nahrungspuffer und Fallenschadenminderung.
- `Nerven` wirken sowohl in der Trefferabwehr als auch direkt in die Schildblockchance hinein.
- `Lichtbonus` erhöht Sichtweite und verbessert damit indirekt Fernkampfoptionen und sichere Bewegung.
- `Showcases` sind nicht nur Hindernisse, sondern beschleunigen sichere Regeneration.
- `Treppenwechsel` spart gegnerische Bewegung, kostet aber trotzdem Nahrung und lässt Status-/Umfeldeffekte weiterlaufen.
- `Elite`- und `Dire`-Varianten erhöhen zugleich Haltbarkeit, XP und Dropqualität.
- Locked-Room-Chests würfeln effektive Belohnungen aus einem tieferen Studio und sind damit eine lokale Risk/Reward-Spitze.
