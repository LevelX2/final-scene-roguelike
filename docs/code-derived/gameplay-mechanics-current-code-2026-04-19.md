# The Final Scene

## Gameplay-Mechaniken aus dem aktuellen Code abgelesen

Stand: 2026-04-19

## Zweck

Dieses Dokument beschreibt die aktuell implementierten Spielmechaniken direkt aus dem
aktuellen Codepfad unter `src/`.

Es ist als technische Fachreferenz gedacht fuer:

- Design- und Balancing-Diskussionen
- weitere Content-Planung
- Prompting fuer Entwickler-KI-Systeme
- Abgleich zwischen frueheren Gameplay-Dokumenten und dem jetzigen Runtime-Stand

Wichtig:

- Grundlage ist der aktive Produktivpfad, nicht `src/legacy/`.
- Wo aeltere `docs/` vom aktuellen Code abweichen, gilt dieses Dokument.
- Reine Darstellungsdetails werden nur aufgenommen, wenn sie spielrelevante Zustandsinformation transportieren.

## Primaere Codebasis

- `src/balance.mjs`
- `src/nutrition.mjs`
- `src/combat/combat-resolution.mjs`
- `src/combat/player-attack.mjs`
- `src/combat/combat-progression.mjs`
- `src/application/derived-actor-stats.mjs`
- `src/application/status-effect-service.mjs`
- `src/application/player-turn-controller.mjs`
- `src/application/visibility-service.mjs`
- `src/application/targeting-service.mjs`
- `src/application/door-service.mjs`
- `src/application/floor-transition-service.mjs`
- `src/application/item-*`
- `src/dungeon/branch-layout.mjs`
- `src/dungeon/enemy-factory.mjs`
- `src/dungeon/equipment-rolls.mjs`
- `src/traps.mjs`
- `src/content/start-loadouts.mjs`
- `src/content/food-balance.mjs`
- `src/content/catalogs/monsters.mjs`
- `src/content/catalogs/weapons.mjs`
- `src/content/catalogs/shields.mjs`
- `src/content/catalogs/consumables.mjs`

## Kurzbild

`The Final Scene` ist ein rundenbasiertes Rogue-like ueber einen prozedural erzeugten
Studiokomplex. Ein Run besteht aus:

1. Klassenwahl und Startausstattung
2. Erkundung eines Studios
3. Kampf, Loot, Hunger- und Inventarverwaltung
4. Wechsel in tiefere Studios
5. Progression ueber XP, Level-Ups, Gegner-Skalierung und Item-Raritaeten
6. Tod oder weiterer Abstieg

Die grossen Systemachsen sind:

- HP und Schadensdruck
- Hunger als Zeitdruck
- Raumkontrolle ueber Sicht, Tueren, Showcases und Fallen
- Progression ueber Klassen, Level, Raritaeten, Monster-Skalierung und Consumables

## 1. Start eines Runs

### Klassen

Die aktiven Klassen leben in `HERO_CLASSES` in `src/balance.mjs`.

| Klasse | HP | Str | Prae | Rea | Nerven | Int | Ausdauer | Passive |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Filmstar | 20 | 4 | 5 | 4 | 3 | 2 | 2 | erster Angriff gegen einen Gegner: `+6 Hit`, `+8 Krit` |
| Stuntman | 22 | 5 | 3 | 3 | 2 | 1 | 3 | `-1` Fallenschaden, `+5` Schild-Blockchance |
| Regisseur | 17 | 2 | 4 | 3 | 4 | 5 | 3 | `+20` Fallenentdeckung, `+15` Fallenvermeidung |

Alias-Mapping existiert noch fuer aeltere Begriffe:

- `lead` -> `filmstar`
- `survivor` -> `filmstar`
- `slayer` -> `stuntman`
- `medium` -> `director`

### Startausstattung

Der aktuelle Startpfad kommt aus `src/content/start-loadouts.mjs`.

Filmstar:

- feste Startwaffe: `expedition-revolver`
- Inventar:
  - `2x` `heal_set_medkit_standard`

Stuntman:

- Startwaffenpool:
  - `combat-knife`
  - `woodcutter-axe`
  - `breach-axe`
  - `bowie-knife`
- Inventar:
  - `1x` `heal_set_medkit_standard`
  - `1x` `sandwich`

Regisseur:

- Startwaffenpool:
  - `cane-blade`
  - `electro-scalpel`
- Inventar:
  - `1x` `heal_set_medkit_standard`
  - `2x` `energy_bar`

Wichtige Abweichung zu aelteren Doku-Staenden:

- Filmstar startet nicht mehr aus einem Waffenpool, sondern fest mit `expedition-revolver`.
- Regisseur nutzt aktuell nur noch einen 2er-Pool, nicht mehr Revolver-/Launcher-Starts.

### Startwerte

Beim Erzeugen des Spielers in `state-blueprint.mjs`:

- `level = 1`
- `xp = 0`
- `xpToNext = xpForNextLevel(1)`
- `statusEffects = []`
- `consumableBonuses = {}`
- `activeConsumableBuffs = []`

## 2. Rundenablauf

Die zentrale Turn-Reihenfolge liegt in `player-turn-controller.mjs`.

`endTurn()` macht in dieser Reihenfolge:

1. `state.turn += 1`
2. `applyPlayerNutritionTurnCost()`
3. `moveEnemies()` falls nicht `skipEnemyMove`
4. `processRoundStatusEffects()`
5. `processContinuousTraps()`
6. `processSafeRegeneration(actionType)`
7. `processConsumableBuffs()`
8. `renderSelf()`

Das ist die aktuell wichtigste verdeckte Sequenz.

### Spieleraktionen mit Rundeneffekt

Durch den Controller oder angrenzende Services verbrauchen u.a. eine Runde:

- Bewegung
- Nahkampfangriff durch Hineinlaufen in Gegner
- Warten
- Tuer schliessen
- Schiessen im Zielmodus
- Item-Nutzung aus Modal/Inventar
- Ausruesten
- bestaetigter Studio-Wechsel

### Studio-Wechsel

Beim bestaetigten Wechsel wird `endTurn({ skipEnemyMove: true })` genutzt.

Das bedeutet:

- Turn zaehlt hoch
- Nahrung, Status, Dauergefahren, Regeneration und Consumable-Ticks laufen
- Gegnerzug wird uebersprungen

## 3. Hunger und Nahrung

Codebasis: `src/nutrition.mjs`

Formeln:

- `nutritionMax = 700 + endurance * 100`
- `nutritionStart = 501 + endurance * 100`
- `NUTRITION_COST_PER_ACTION = 1`
- `DAMAGE_PER_ACTION_WHILE_DYING = 1`

Wichtiger Detailpunkt:

- Der aktuelle Code nutzt `501`, nicht `500`, als Startbasis.

Hungerzustands-Schwellen:

- `SATED >= 0.80`
- `NORMAL >= 0.55`
- `HUNGRY >= 0.30`
- `STARVING >= 0.10`
- darunter `DYING`

Labels:

- `Satt`
- `Normal`
- `Hungrig`
- `Ausgehungert`
- `Verhungernd`

Effekt bei `DYING`:

- pro Aktion `1` direkter HP-Schaden

Ueberfuellung:

- Nahrung wird auf `nutritionMax` gekappt.
- Zuviel gegessene Nahrung kann Erbrechenstexte ausloesen.

## 4. Sichere Regeneration

Der Codepfad haengt an `processSafeRegeneration(...)` und den sichtbaren Anbindungen in
Turn-Controller, Awareness und Consumables.

Aktueller Regelstand:

- nur wenn kein Gegner innerhalb Manhattan-Distanz `<= 3`
- nur wenn Spieler nicht auf Max-HP
- Progress:
  - Bewegung: `+0.5`
  - Warten: `+1`
  - zusaetzlich `+0.5` neben Showcase
  - zusaetzlich moeglicher Consumable-Bonus `safeRestProgressBonus`
- bei `safeRestTurns >= 4`:
  - `1 HP` Heilung
  - Reset des Fortschrittszaehlers

Systemisch wichtig:

- Showcases wirken nicht nur als Hindernisse, sondern direkt auf Regeneration.
- `safe_rest_boost`-Consumables docken exakt an dieselbe Achse an.

## 5. Sicht, Sichtlinie und Informationsmodell

Codebasis: `visibility-service.mjs`

### Sichtweite

- Basisradius: `5`
- plus `lightBonus` der Hauptwaffe

### Opake Kacheln

LoS blockieren aktuell:

- Wande
- geschlossene Tueren
- Showcases

### Sichtgeometrie

- Reichweitenpruefung fuer Sicht: Chebyshev
- LoS: Bresenham-artige Gitterlinie mit diagonaler Eckblock-Regel

### Zusatzaufdeckung

Wenn eine sichtbare Bodenkachel gefunden wurde, werden angrenzende Wandkacheln
zusatzlich als sichtbar/explored markiert. Das verbessert Lesbarkeit, ohne die LoS
faktisch aufzuweichen.

### Gegnerwissen

Das Detailwissen ueber Monster haengt an `noteMonsterEncounter(...)` und wird erst
nach echter Kampfszene deutlich erweitert. Vorher zeigt die UI nur reduzierte Infos.

## 6. Bewegung, Zielmodus und Fernkampfgeometrie

### Bewegung

Der Controller erlaubt 8-Richtungs-Bewegung.

Wichtige Regeln:

- diagonale Bewegung ist blockiert, wenn beide orthogonalen Nachbarfelder blocken
- diagonales Oeffnen von Tueren ist verboten
- Wande, geschlossene Tueren und Showcases blocken Bewegung

### Zielmodus

Codebasis: `targeting-service.mjs`, `player-turn-controller.mjs`

Ein Zielmodus ist nur moeglich, wenn:

- `weapon.attackMode === 'ranged'`
- `weapon.range > 1`

Aktueller Ziel-Check:

- Entfernung: Chebyshev
- Reichweite: `distance <= weapon.range`
- gueltiges Ziel braucht Sichtlinie ueber `hasLineOfSight(...)`

Wichtige Abweichung zu aelteren Doku-Staenden:

- Es gibt aktuell keinen Geradeaus-Zwang mehr fuer den Spieler-Zielmodus.
- Die aeltere Aussage "nur Zeile/Spalte" ist im aktiven Code nicht mehr richtig.
- `isStraightShot()` existiert in `visibility-service.mjs` noch, ist aber im aktuellen
  Spieler-Targeting nicht mehr der Gatekeeper.

### Fernkampf-Schaden

Fruehe Floors haben noch einen direkten globalen Fernkampf-Schadensmalus:

- Floors `1-2`: `-2`
- Floors `3-4`: `-1`
- danach `0`

Der Malus wirkt sowohl fuer Spieler als auch Gegner ueber die Combat-Snapshots.

## 7. Kampfaufloesung

Codebasis:

- `combat-resolution.mjs`
- `derived-actor-stats.mjs`
- `player-attack.mjs`

### Trefferchance

`hitChance = clamp(65 + (hitValue - dodgeValue), 10, 90)`

mit:

- `hitValue = precision * 2 + weapon.hitBonus + meleePenalty + openingHitBonus`
- `dodgeValue = reaction * 2 + nerves`

### Kritchance

`critChance = clamp(precision + weapon.critBonus + openingCritBonus, 0, 50)`

### Basisschaden

`baseDamage = max(1, strength + weapon.damage + conditionalDamage - rangedDamagePenalty)`

### Kritischer Schaden

- Nahkampf-Multiplikator: `1.5`
- Fernkampf-Multiplikator: `1.35`
- Implementiert als:
  - `max(baseDamage + 1, floor(baseDamage * critMultiplier))`

### Nahkampf-Malus von Fernwaffen

Wenn `weapon.attackMode === 'ranged'` und `distance <= 1`:

- `meleePenalty = weapon.meleePenaltyHit ?? 0`

### Filmstar-Erster-Angriff

Wenn Spieler angreift und `defender.openingStrikeSpent` noch `false` ist:

- `+6 Hit`
- `+8 Krit`
- der Bonus wird schon beim ersten Angriffsversuch verbraucht, auch bei Miss

## 8. Block

Codebasis:

- `combat-resolution.mjs`
- `derived-actor-stats.mjs`

Regel:

- nur `offHand.subtype === 'shield'` blockt

Blockchance:

`clamp(offHand.blockChance + nerves + shieldBlockBonus, 5, 75)`

Schadensreduktion:

`max(0, damage - offHand.blockValue)`

Sonderregel:

- Modifier `reflective` reflektiert bei erfolgreichem Block `1` Schaden

## 9. Abgeleitete Werte

Codebasis: `derived-actor-stats.mjs`

Der aktuelle Runtime-Pfad trennt:

- Basisstats
- Progression
- Equipment
- Status
- Consumables

Abgeleitete Kernstats:

- `strength`
- `precision`
- `reaction`
- `nerves`
- `intelligence`
- `endurance`

`maxHp` ist teilweise separat behandelt:

- `getActorDerivedMaxHp(actor)` addiert nur Progressionsbonus auf `maxHp`

Status-Mali fliessen aktuell nur fuer:

- `precision_malus`
- `reaction_malus`

Consumables speisen dieselbe Derived-Stat-Pipeline fuer:

- `precision`
- `reaction`
- `nerves`
- und weitere nicht-statistische Bonusachsen wie Trap-/Rest-/Aggro-Mods

## 10. Status-Effekte

Codebasis: `status-effect-service.mjs`

Aktive Runtime-Typen:

- `bleed`
- `poison`
- `precision_malus`
- `reaction_malus`
- `stun`
- `root`

### Anwendung

Weapon-On-Hit-Effekte werden nur versucht, wenn:

- Angriff trifft
- `result.damage > 0`
- Proc-Wurf gelingt

### Boss-/Elite-Sonderregeln

- Gegner mit `rank >= 9` sind stun-immun
- `root` verliert bei `elite` und `dire` Monstern `1` Dauer, Minimum `1`

### Stack-Regel

Gleicher Effekt stackt nicht frei:

- Dauer, `penalty`, `dotDamage`, `healPerTurn` werden jeweils auf den Maximalwert gezogen

### Tick-Verarbeitung

Pro Statusrunde:

- `healPerTurn` zuerst
- `dotDamage` danach
- dann Dauer herunterzaehlen
- Tod kann direkt aus Statustick entstehen

## 11. Waffen

Codebasis:

- `content/catalogs/weapons.mjs`
- `itemization.mjs`
- `weapon-runtime-effects.mjs`

Achsen:

- `weaponRole`
- `handedness`
- `attackMode`
- `profileId`
- `range`
- `meleePenaltyHit`
- `signatureEffect`
- `archetypeId`

Waffenprofile:

- `light_melee`
- `heavy_melee`
- `precise_ranged`
- `special_improv`

Faeuste als Fallback:

- Schaden `1`
- Hit `0`
- Krit `0`
- Reichweite `1`
- Nahkampf

### Floorskalierung

Floor-Slot-Boni ueber 10er-Zyklen:

| Slot | Dmg | Hit | Krit |
| --- | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 |
| 2 | 1 | 0 | 0 |
| 3 | 1 | 1 | 0 |
| 4 | 2 | 1 | 0 |
| 5 | 2 | 1 | 1 |
| 6 | 3 | 1 | 1 |
| 7 | 3 | 2 | 1 |
| 8 | 4 | 2 | 1 |
| 9 | 4 | 2 | 2 |
| 10 | 5 | 3 | 2 |

Jeder volle weitere Zyklus:

- `+5` Schaden
- `+3` Hit
- `+2` Krit

Profil-Gewichtung:

- `light_melee`: Dmg `0.8`, Hit `1.25`, Krit `1.25`
- `heavy_melee`: Dmg `1.25`, Hit `0.75`, Krit `0.75`
- `precise_ranged`: Dmg `1.0`, Hit `1.0`, Krit `1.0`
- `special_improv`: Dmg `0.9`, Hit `1.0`, Krit `0.75`

Wichtiger Unterschied zu aelteren Staenden:

- `precise_ranged` skaliert Hit nicht mehr mit `1.25`, sondern aktuell neutral mit `1.0`.

## 12. Schilde

Codebasis: `content/catalogs/shields.mjs`, `itemization.mjs`

Grundachsen:

- `blockChance`
- `blockValue`
- `statMods`
- `archetypeId`
- `minFloor`

Shield-Mods:

- `sturdy`
- `reflective`
- `calming`
- `reactive`
- `fortified`
- `cursedGuard`

Hinweis:

- `minFloor` existiert im Datenmodell, ist aber im Generator weiterhin nicht die
  dominante harte Spawn-Schranke.

## 13. Item-Raritaeten und Itemisierung

Codebasis: `itemization.mjs`, `balance.mjs`

Raritaeten:

- `common`
- `uncommon`
- `rare`
- `veryRare`

### Allgemeine Equipment-Rarity-Gewichte

Basis:

- `common 70`
- `uncommon 22`
- `rare 7`
- `veryRare 1`

Modifikationen:

- ab Floor `4`: `common -6`, `uncommon +4`, `rare +2`
- ab Floor `7`: nochmal `common -6`, `uncommon +3`, `rare +2`, `veryRare +1`
- `chest`: `common -4`, `uncommon +2`, `rare +1`, `veryRare +1`
- `locked-room-chest`: `common -18`, `uncommon +10`, `rare +6`, `veryRare +2`
- `monster:*`: `common +4`, `uncommon -2`, `rare -1`, `veryRare -1`
- `:elite`: `common -6`, `uncommon +4`, `rare +2`
- `:dire`: `common -10`, `uncommon +5`, `rare +3`, `veryRare +2`

Rarity-Caps:

- Floor `1`: max `uncommon`
- Floors `2-3`: max `rare`
- ab `4`: max `veryRare`

### Waffen-spezifische Rarity-Profile

- Floor:
  - `70 / 24 / 5 / 1`
- Chest:
  - `50 / 35 / 12 / 3`
- Monster:
  - `40 / 40 / 16 / 4`
- Locked room chest:
  - `30 / 45 / 20 / 5`

### Mod-Logik

Numerische Weapon-Mods:

- `damage +1`
- `hit +1`
- `crit +1`

Mengen:

- `uncommon`: `1`
- `rare`: `2`
- `veryRare`: `2`

Effekt-Logik:

- `rare`: `45%` Chance auf 1 Standardeffekt
- `veryRare`: immer 1 Standardeffekt, `24%` Chance auf zusaetzlichen High-Impact-Effekt
- max `2` Effekte

Conditional Mod:

- Modifier `final` kann zusaetzlich gerollt werden
- aber `getWeaponConditionalDamageBonus()` ist im Livesystem weiterhin effektiv `0`

## 14. Consumables

Codebasis:

- `content/catalogs/consumables.mjs`
- `application/item-loot.mjs`
- `application/item-choice-configs.mjs`

Das aktuelle Spiel besitzt jetzt eine echte Consumable-Schicht jenseits der alten
reinen Heiltrank-Logik.

### Laufzeitform

- aktive Buffs liegen in `state.activeConsumableBuffs`
- aggregierte Boni landen in `player.consumableBonuses`
- gleiche Effektfamilien stacken nicht frei; staerkere/laengere Varianten ersetzen
  oder erneuern vorhandene Buffs

### Umgesetzte Familien

Phase 1:

- `vision_boost`
- `precision_boost`
- `reaction_boost`
- `nerves_boost`
- `trap_focus`
- `trap_resist`
- `safe_rest_boost`

Phase 2:

- `blink_teleport`
- `stealth_window`

Phase 3:

- `retreat_floorwarp`
- `advance_floorwarp`

### Konkrete Wirkungen

- `vision_boost`: `+lightBonus`
- `precision_boost`: `+precision`
- `reaction_boost`: `+reaction`
- `nerves_boost`: `+nerves`
- `trap_focus`: Trap-Detection- und Trap-Avoid-Bonus
- `trap_resist`: Trap-Damage-Reduction
- `safe_rest_boost`: zusaetzlicher Rest-Fortschritt
- `stealth_window`: reduziert effektiven Gegner-Aggro-Radius gegen den Spieler
- `blink_teleport`: Teleport auf derselben Ebene
- `retreat_floorwarp` / `advance_floorwarp`: kontrollierte Ebenenspruenge

### Healing und Food

Die alte Healing-Consumable-Linie wurde in den generischen Consumable-Pfad integriert.

Das bedeutet aktuell:

- Heilung bleibt als eigener UI-/Quick-Use-Typ sichtbar
- Essen bleibt separat ueber `food`
- aber die Laufzeit- und Inventarlogik benutzt denselben uebergreifenden
  Consumable-Rahmen

## 15. Loot und Pickup-Regeln

Codebasis:

- `branch-layout.mjs`
- `equipment-rolls.mjs`
- `item-loot.mjs`
- `food-balance.mjs`

### Floor-Spawns

Aktueller Code:

- Floor-Weapon:
  - Floor `1`: `55%`
  - ab `2`: `25%`
- Floor-Shield:
  - Floor `1`: `18%`
  - Floor `2`: `35%`
  - ab `5`: `8%`

Wichtige Abweichung zu aelteren Dokumenten:

- Floor 1 kann inzwischen sowohl Bodenwaffen als auch Bodenschilde erzeugen.

### Chest-Spawn

- `min(0.55, 0.2 + floor * 0.06)`

Chest-Anzahl:

- ab Floor `4`: `35%` auf `2`
- sonst `1`

### Chest-Inhalt

Aktueller Chest-Roll in `equipment-rolls.mjs`:

1. `30%` Chance auf Consumable
2. wenn Floor `>= 2` und Roll `< 0.38`: Shield
3. sonst Weapon

Wichtige Abweichung zu aelteren Dokumenten:

- Consumables sind jetzt direkt im Chest-Pool.
- Die Shield-Chance in Chests laeuft aktuell ueber den dortigen Rollpfad und nicht
  nur ueber die alte globale `0.1`-Lesart.

### Food-System

Versorgungsklassen:

- `SCARCE`: Gewicht `28`, Budget `90-160`
- `LOW`: Gewicht `34`, Budget `161-240`
- `NORMAL`: Gewicht `24`, Budget `241-320`
- `HIGH`: Gewicht `10`, Budget `321-420`
- `ABUNDANT`: Gewicht `4`, Budget `421-520`

Danach:

- Budget * `0.35`
- Verteilung:
  - `78%` Welt
  - `14%` Container
  - `8%` Monster

Wichtiger Praxispunkt:

- Monster-Food-Drops sind weiterhin eher Legacy-gebunden und dadurch fuer den aktiven
  Standardmonster-Pool untergenutzt.

## 16. Dungeon-/Studio-Struktur

Codebasis:

- `studio-topology.mjs`
- `floor-transition-service.mjs`
- `branch-layout.mjs`

### Archetypenfolge

Ein Run erzeugt eine gemischte Sequenz aus `10` Studio-Archetypen.

`floor n` nutzt:

- `((n - 1) mod 10)` innerhalb der Run-Sequenz

### Topologie

Die Studios liegen in einer 3D-Topologie mit:

- `x/y/z`-Position
- `entryDirection`
- `exitDirection`
- `entryTransitionStyle`
- `exitTransitionStyle`

Richtungen:

- `left`
- `right`
- `front`
- `back`
- `up`
- `down`

Transition-Stile:

- horizontal: `passage`
- vertikal: `stairs` oder `lift`

### Layout-Typ

Aktiv ist primaer `branch`.

Aufbau:

- 2-3 Tiles breiter Hauptkorridor
- Entry-/Exit-Anker
- Connector-Raeume
- Themenraeume
- Seitenarme
- optionale Schleifen

Raumrollen:

- `entry_room`
- `connector_room`
- `weapon_room`
- `aggro_room`
- `calm_room`
- `canteen`
- `props_room`
- `costume_room`
- `hazard_room`
- `trap_room`
- `showcase_room`

Fallback:

- nach `120` Fehlversuchen `branch_fallback`

## 17. Tueren, Schluessel und Showcases

### Normale Tueren

Codebasis: `door-service.mjs`

- blocken Bewegung und Sicht, solange geschlossen
- oeffnen automatisch beim Betreten
- koennen mit `C` wieder geschlossen werden
- Gegner mit `canOpenDoors` koennen sie ebenfalls oeffnen

### Verschlossene Tueren

- brauchen passenden Schluessel
- Schluessel muessen dieselbe Farbe und dasselbe Floor-/Studio-Level haben
- beim Oeffnen wird der Schluessel verbraucht
- Tuer wird danach zu normaler offener Tuer

Farben:

- `green`
- `blue`

Anzahl pro Floor:

- `< 3`: `0`
- `3-4`: `22%` auf `2`, `58%` auf `1`, sonst `0`
- `5-7`: `10%` auf `3`, `38%` auf `2`, `42%` auf `1`, sonst `0`
- `8+`: `18%` auf `3`, `44%` auf `2`, `33%` auf `1`, sonst `0`

### Showcases

- blocken Bewegung
- blocken Sicht
- verbessern sichere Regeneration
- werden nur in `showcase_room` gesetzt
- schneiden keine Erreichbarkeit ab
- halten Tuer- und Oeffnungsbereiche frei
- max `3` pro Vitrinenraum

## 18. Fallen und Gefahrenfelder

Codebasis:

- `traps.mjs`
- `branch-layout.mjs`

### Trap-Typen

- `floor`
- `alarm`
- `hazard`

### Spawnprofil

Floor `1`:

- immer `0`

Floor `2`:

- meist `2-3`, selten `0`

Floor `3`:

- `0 / 2 / 4 / 5`

Floor `4`:

- `1 / 3 / 5 / 7`

Floor `5`:

- `1 / 4 / 6 / 8`

Floor `6+`:

- `2 / 5 / 7 / 9 / 11`

Flaechenbonus:

- ab `120` begehbaren Tiles: `+1`
- ab `170`: `+2`
- ab `220`: `+3`

Wenn das Floor-Profil `0` rollt:

- bleiben trotz Flaechenbonus alle Fallen aus

### Platzierungsgewichte

Raumrollen:

- `entry_room`: `0`
- `connector_room`: `1.8`
- `weapon_room`: `0.6`
- `aggro_room`: `2.2`
- `calm_room`: `0`
- `canteen`: `0`
- `props_room`: `1.1`
- `costume_room`: `0.6`
- `hazard_room`: `2.8`
- `trap_room`: `6.0`
- `showcase_room`: `0`

Korridore:

- Hauptkorridor: `1.2`
- Nebenkorridor: `1.6`

### Formeln

Entdeckung:

`clamp(25 + (precision - detectDifficulty) * 15 + trapDetectionBonus + consumableTrapDetectionBonus, 5, 95)`

Vermeidung:

`clamp(20 + (reaction - reactDifficulty) * 15 + visibleBonus + trapAvoidBonus + consumableTrapAvoidBonus, 5, 95)`

Sichtbarkeitsbonus:

- `+15`, wenn die Falle schon vor dem Trigger sichtbar war

Spieler-Schaden:

`max(1, trapDamage - enduranceMitigation - classMitigation - reducedFlag)`

dabei:

- normale Fallen: `floor(endurance / 3)`
- Dauergefahren: `floor(endurance / 2)`
- Stuntman: `+1` weitere Reduktion
- Consumables koennen weitere `trapDamageReduction` geben

Gegner-Schaden:

- `max(1, trapDamage - floor(endurance / 4))`

### Alarm

Wenn der Spieler eine Alarmfalle ausloest:

- alle Gegner in Manhattan-Distanz `<= 8` werden aggressiv

### Halbverdrahtete Felder

Noch nicht voll mechanisch fertig:

- `slow`
- `nerveDebuff`

Beide existieren als Daten-/Textsignale, aber nicht als gleichwertig ausmodellierte
Langzeitregeln.

## 19. Gegner: Freischaltung, Varianten, Skalierung

Codebasis:

- `content/catalogs/monsters.mjs`
- `dungeon/enemy-factory.mjs`
- `balance.mjs`

### Freischaltung

- Floor `1`: nur Rank `1`
- danach: max `floor + 1`
- gedeckelt auf hoechsten Katalograng

### Grundskalierung

`scale = max(0, floor - monster.rank)`

Dann:

- `hp += scale * 5 + random(0..2)`
- `xp += scale * 5`
- `strength += floor((scale + 1) / 1)`
- `precision += floor(scale / 2)`
- `reaction += floor(scale / 2)`
- `nerves += floor(scale / 2)`
- `intelligence += floor(scale / 3)`
- `aggroRadius += min(4, floor(scale / 3))`

Wichtiger Detailpunkt:

- `strength` bekommt effektiv schon bei `scale = 0` ein `+1`

### Mobilitaets-Aggro-Bonus

- `local`: `+0`
- `roaming`: `+1`
- `relentless`: `+2`

### Variantentiers

`normal`:

- `hpMultiplier = 1.00`
- `xpMultiplier = 1.00`
- `modCount = 0`
- `weaponDropChance = 0.08`
- `offHandDropChance = 0.06`
- `iconicWeaponDropChance = 0.25`

`elite`:

- `1.18`
- `1.35`
- `1`
- `0.16`
- `0.12`
- `0.34`

`dire`:

- `1.32`
- `1.65`
- `2`
- `0.24`
- `0.18`
- `0.45`

Variantengewichte:

- Elite:
  - Floor `1-2`: `5`
  - `3-4`: `8`
  - `5-7`: `12`
  - `8+`: `16`
- Dire:
  - `1-3`: `1`
  - `4-5`: `2`
  - `6-8`: `3`
  - `9+`: `4`

Variantmods:

- `hulking`
- `brutal`
- `keen`
- `swift`
- `unyielding`
- `cunning`

## 20. Gegner-KI

Codebasis:

- `ai/enemy-turns.mjs`
- `ai/enemy-profile-helpers.mjs`

### Default-Profile

Wenn nicht explizit gesetzt:

- `mobility = roaming`
- `retreatProfile = none`
- `healingProfile = slow`

### Mobility

`local`:

- darf sich nur bis Manhattan `6` vom Ursprung entfernen
- Aggro-Abbruch bei `> aggroRadius + 4`

`roaming`:

- keine Leine
- Aggro bei `<= aggroRadius + 1`

`relentless`:

- keine Leine
- Aggro bei `<= aggroRadius + 2`
- haelt Aggro stabiler

Spezialfall:

- `lurking` auf `roaming` bekommt ueber `enemy-profile-helpers.mjs` einen endlichen
  Aggro-Abbruch bei `aggroRadius + 6`, damit das Healing-Profil ueberhaupt erreichbar
  bleibt

### Retreat

`cautious`:

- Distanz `<= 3`
- eigener HP-Anteil `<= 0.28`
- Spieler-HP-Anteil `>= 0.45`
- Spieler-HP `> enemy HP + 2`

`cowardly`:

- Distanz `<= 4`
- eigener HP-Anteil `<= 0.45`
- Spieler-HP-Anteil `>= 0.45`
- Spieler-HP `> enemy HP`

### Regeneration

Profile:

- `none`
- `slow`: Cooldown `6`, Heal `1`
- `steady`: Cooldown `4`, Heal `1`
- `lurking`: Cooldown `3`, Heal `1`, braucht Ruhe

Zusaetzliche Regeln:

- nicht auf Max-HP
- Mindestabstand zum Spieler `>= 2`
- fuer `lurking` zusaetzlich Calm-Bedingung

### Fernkampf-KI

Aktueller Schuss-Check:

- `weapon.attackMode === 'ranged'`
- Distanz `> 1`
- Distanz `<= weapon.range`
- `hasLineOfSight(...)`

Wichtige Abweichung zu aelteren Doku-Staenden:

- Auch Gegner-Fernkampf haengt aktuell nicht mehr an strikter Zeile/Spalte, sondern an
  Reichweite plus Sichtlinie.

### Floor-Follower

Nur Gegner mit `canChangeFloors` koennen ueber Ebenen folgen.

Transferbedingung:

- Gegner ist aggressiv
- Gegner steht innerhalb Manhattan `<= 2` am genutzten Uebergang

## 21. Progression

Codebasis: `balance.mjs`, `combat-progression.mjs`

XP-Kurve:

`40 + (level - 1) * 28 + floor((level - 1)^2 * 6)`

Level-Up-Rewards:

- immer `+3 maxHp`
- volle Heilung
- gerade Levels: `+1 strength`
- ungerade Levels: `+1 precision`, `+1 nerves`
- jedes 3. Level: `+1 reaction`
- jedes 4. Level: `+1 intelligence`

## 22. Meta und Persistenz

Codebasis: `state-blueprint.mjs`, `state-persistence.mjs`

Persistiert in `localStorage`:

- Heldendaten
- Optionen
- Savegames
- Highscores

Highscore-Sortierung:

1. tiefstes erreichtes Studio
2. hoeheres Level
3. mehr Kills
4. weniger Zuege

Zusatzregeln:

- Top `100`
- ausserhalb davon `Ausser Wertung`

## 23. Wichtigste Abweichungen zu aelteren Gameplay-Dokumenten

Diese Punkte sind fuer Folgearbeit besonders wichtig:

1. Spieler- und Gegner-Fernkampf sind aktuell nicht mehr an Geradeausschuesse gebunden, sondern an Reichweite plus Sichtlinie.
2. `nutritionStart` ist aktuell `501 + endurance * 100`, nicht `500 + ...`.
3. Filmstar startet jetzt fest mit `expedition-revolver`.
4. Floor 1 kann inzwischen Bodenwaffen (`55%`) und Bodenschilde (`18%`) spawnen.
5. Chests haben jetzt einen direkten `30%`-Consumable-Pfad.
6. Das neue Consumable-System ist reale Runtime-Mechanik und nicht nur Designvorbereitung.
7. `precise_ranged` skaliert Hit aktuell neutral statt mit einem frueher dokumentierten Bonusfaktor.

## 24. Noch sichtbar halbverdrahtete oder tote Systeme

Aktuell weiter auffaellig:

- Weapon-Conditional-Damage ueber `final` ist effektiv `0`
- `slow`-Trap-Effekt ist nicht voll als Bewegungsdebuff umgesetzt
- `nerveDebuff` aus Fallen ist noch kein voll integrierter Runtime-Effekt
- `charm` auf Schilden ist im sichtbaren Kampfkern nicht angeschlossen
- `minFloor` bei Schilden ist nicht der dominante Generator-Filter
- Legacy- und Standardmonster leben weiter parallel im Katalog

## Kurzfazit

Der aktuelle Codezustand ist deutlich systemischer als ein reines Einzelregel-Spiel:

- abgeleitete Kampfwerte laufen ueber eine gemeinsame Pipeline
- Gegner und Items tragen klarere Gruppenachsen
- Loot, Rarity, Consumables, Fallen und KI sind weitgehend datengetrieben

Die groessten noch offenen Brueche liegen nicht mehr in den Hauptformeln, sondern in:

- einzelnen Legacy-Ueberhaengen
- halbverdrahteten Sondereffekten
- verstreuten KI-Schwellen
- Resten alter Sonderlogik neben den neuen datengetriebenen Pipelines
