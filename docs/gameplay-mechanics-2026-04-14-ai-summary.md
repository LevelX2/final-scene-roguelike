# Gameplay Mechanics

KI-Kurzzusammenfassung  
Stand: 2026-04-14

## Ziel dieses Dokuments

Diese Kurzfassung verdichtet die aktuell implementierten Spielmechaniken auf die Regeln und Designhebel, die für Gespräche über Ausbau, Balancing und neue Systeme am wichtigsten sind.

## Spielkern in einem Absatz

`The Final Scene` ist ein rundenbasiertes Rogue-like, in dem der Spieler prozedural erzeugte Studios erkundet, Ressourcen gegen Zeitdruck verwaltet und über Kampf, Loot, Hunger, Türen, Fallen und Positionskontrolle tiefer in den Run vordringt. Der Spielfortschritt entsteht aus dem Zusammenspiel von Studiotiefe, Gegnereskalation, Ausrüstungsqualität, XP-Leveln und lokaler Raumkontrolle.

## Die wichtigsten Systemachsen

### 1. Zeitdruck über Hunger

- Jede relevante Aktion kostet `1` Nahrung.
- Nahrung ist direkt an `Ausdauer` gekoppelt:
  - `nutritionMax = 700 + 100 * endurance`
  - `nutritionStart = 500 + 100 * endurance`
- Unter `10%` Nahrung tritt der Zustand `Verhungernd` ein.
- In `Verhungernd` verliert der Spieler nach jeder Aktion zusätzlich `1 HP`.

Funktion im Gesamtsystem:

- verhindert endloses Warten
- macht Erkundung, Umwege und Rückzug teuer
- koppelt Defensive indirekt an Tempo

### 2. Kampf über Treffer-, Krit- und Blockformeln

- Trefferchance:
  - `clamp(65 + (HitValue - DodgeValue), 10, 90)`
- Kritchance:
  - `clamp(Präzision + Präzisionsmodifikator + Waffen-Kritbonus + Bonus, 0, 50)`
- Basisschaden:
  - `max(1, Stärke + Waffenschaden + Zusatzschaden)`
- Kritischer Schaden:
  - `floor(Basisschaden * 1.5)`
- Schildblock:
  - `clamp(blockChance + Nerven + shieldBlockBonus, 5, 75)`
  - Schaden nach Block: `max(0, Schaden - blockValue)`

Funktion im Gesamtsystem:

- `Präzision`, `Reaktion` und `Nerven` sind für Kampfentscheidungen zentral
- Schilde machen `Nerven` deutlich wertvoller
- Kampf bleibt berechenbar, aber nicht deterministisch

### 3. Raumkontrolle über Sicht, Türen und Hindernisse

- Sichtweite ist standardmäßig `5`, plus möglichem Lichtbonus durch Waffen.
- Geschlossene Türen blockieren Bewegung und Sicht.
- Normale Türen öffnen automatisch beim Betreten.
- Verschlossene Türen brauchen farblich passende Schlüssel aus demselben Studio.
- Showcases blockieren Bewegung, dürfen aber keine Karte unspielbar machen.

Funktion im Gesamtsystem:

- Räume sind nicht nur Kulisse, sondern taktische Ressourcen
- Türen und Sichtlinien steuern Kontaktaufnahme, Flucht und Fernkampf
- Showcases erzeugen lokale Engstellen und sichere Zonen

### 4. Sichere Regeneration als Belohnung für Kontrolle

Der Spieler regeneriert nur außerhalb unmittelbarer Bedrohung:

- keine Gegner innerhalb Manhattan-Distanz `<= 3`
- Bewegung gibt `+0.5` Fortschritt
- Warten gibt `+1`
- an Showcase angrenzend gibt es zusätzlich `+0.5`
- bei `safeRestTurns >= 4` heilt der Spieler `1 HP`

Funktion im Gesamtsystem:

- Rückzug lohnt sich
- sichere Räume haben echten mechanischen Wert
- Showcases sind dadurch mehr als Hindernisse

### 5. Eskalation über Studiotiefe

Mit steigender Studiotiefe wachsen:

- Gegnerzahl
- Gegnerqualität
- Gegnerstats
- Ausrüstungsqualität
- Wahrscheinlichkeit auf bessere Lootquellen

Wichtige Regeln:

- Gegnerzahl steigt bis maximal `15`
- Gegner rangeln sich über `scale = max(0, floor - rank)` hoch
- frühe Studios deckeln Raritäten:
  - Studio `1`: max `uncommon`
  - Studio `2-3`: max `rare`
  - ab Studio `4`: `veryRare`

Funktion im Gesamtsystem:

- Fortschritt ist nicht nur horizontal
- frühe Studios bleiben kontrollierbar
- gute Beute wird schrittweise freigeschaltet

## Klassenprofil in Kurzform

### Filmstar

- bester Auftaktkämpfer
- erster Angriff gegen jeden Gegner erhält `+6 Trefferchance` und `+8 Krit-Chance`
- der Bonus wird auch bei einem Fehlschlag verbraucht

### Stuntman

- robusteste Klasse
- `-1` Schaden durch Fallen und Dauergefahren
- `+5%` Schild-Blockchance

### Regisseur

- stärkste Klasse für Informationskontrolle
- `+20%` Fallenentdeckung
- `+15%` Fallenvermeidung

## Gegnerlogik in Kurzform

Gegner unterscheiden sich durch:

- Verhalten
- Mobilität
- Türverhalten
- Rückzug
- Regeneration

Wichtige aktive Regeln:

- `local`-Gegner sind an ihren Ursprungsraumbereich gebunden
- `relentless`-Gegner jagen praktisch unbegrenzt
- Gegner ohne `canOpenDoors` scheitern an geschlossenen Türen
- intelligente, verwundete Gegner können Abstand suchen statt anzugreifen
- viele Gegner regenerieren aktuell implizit langsam, weil `slow` ihr Standard-Heilprofil ist

Wichtige versteckte Realität:

- der Katalog nutzt oft implizite Defaults
- `stalker` ist als Katalogverhalten angelegt, hat aber aktuell keine eigene Sonder-KI und fällt auf die Defaultlogik zurück

## Loot- und Progressionslogik in Kurzform

Loot verbessert nicht nur Zahlen, sondern Profil und Handlungsoptionen.

Wichtige Regeln:

- Bodenwaffen ab Studio `2` mit `25%` Spawnchance
- Bodenschilde früh einmalig wahrscheinlicher, später selten
- Chests werden mit steigender Tiefe häufiger
- Locked-Room-Chests sind besonders wertvoll, weil sie wie Loot aus einem tieferen Studio würfeln
- Waffen und Schilde folgen Raritäten, Modifikatoren und Studio-Archetypen

Wichtige Auswirkung:

- der Run wächst über drei Progressionspfade gleichzeitig:
  - Level
  - Ausrüstung
  - Raum-/Ressourcenkontrolle

## Fallen in Kurzform

Es gibt aktuell drei funktionale Gruppen:

- einmalige Bodenfallen
- Alarmfallen
- persistente Gefahrenfelder

Wichtige Regeln:

- Fallen können verborgen sein
- Entdeckung und Vermeidung benutzen Prozentformeln
- Alarmfallen setzen Gegner im Umkreis von `8` Feldern auf Aggro
- Gefahrenfelder treffen jeden Actor, der auf ihnen stehen bleibt

Wichtige Ausbauoffenheit:

- einige Effektfelder wie `slow` sind bereits angelegt, aber noch nicht zu vollständigen Status- oder Bewegungsregeln ausgebaut

## Was das Spiel aktuell am stärksten prägt

Die prägendsten mechanischen Aussagen des aktuellen Spiels sind:

- Zeit ist eine Ressource, weil Hunger jede Aktion bepreist.
- Sicherheit ist räumlich und nicht global: Türen, Sicht und Hindernisse entscheiden, wann Regeneration möglich ist.
- Kampf hängt stark an Attributsdifferenzen und Ausrüstung, bleibt aber innerhalb klarer Prozentgrenzen.
- Studiotiefe ist die zentrale Eskalationsachse für Gegner und Loot.
- Locked Rooms und Showcases sind wichtige lokale Spannungs- und Belohnungspunkte.

## Wichtigste Ausbauhebel

Für künftige Erweiterungen sind diese Punkte besonders ergiebig:

- `stalker` als echtes, eigenes KI-Verhalten ausformulieren
- angelegte, aber noch schwache Mod-/Trap-Hooks (`final`, `slow`, `nerveDebuff`, `charm`) mechanisch schließen
- mehr echte Unterschiede zwischen Gegner-Heilprofilen und Rückzugsprofilen schaffen
- Locked Rooms stärker als bewusstes Risiko-/Belohnungssystem ausbauen
- Showcase-Nähe nicht nur für Regeneration, sondern eventuell auch für andere Raumvorteile nutzbar machen
