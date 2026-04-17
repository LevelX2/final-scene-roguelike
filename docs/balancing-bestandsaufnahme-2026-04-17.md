# The Final Scene

## Bestandsaufnahme fuer ein zentrales Balancing- und Simulationssystem

Stand: 2026-04-17

Ziel dieses Dokuments ist keine Implementierung und kein Balancing-Vorschlag, sondern eine belastbare Bestandsaufnahme des aktuellen Programmstands. Der Fokus liegt auf allen bereits existierenden Mechanismen, Datenstrukturen und Regelzusammenhaengen, die fuer ein kuenftiges gruppenbasiertes Balancing- und Simulationssystem relevant sind.

Die Grundlage dieses Dokuments ist der aktuelle Codebestand im Workspace, nicht die bereits vorhandenen Design- oder Gameplay-Notizen. Wo vorhandene Dokumentation und Code voneinander abweichen, gilt hier der Code als massgeblich.

## 1. Aktuelle balancerelevante Systeme

### 1.1 Kampfwerte und Kampfaufloesung

Die zentrale Kampfaufloesung liegt in `src/combat/combat-resolution.mjs`.

Aktuelle Kernformeln:

- Trefferchance:
  `BASE_HIT_CHANCE + (hitValue - dodgeValue)`, geklemmt auf `10..90`
- `BASE_HIT_CHANCE = 65`
- `hitValue = (precision + Precision-Modifikator) * 2 + weapon.hitBonus + meleePenalty + openingStrikeBonus`
- `dodgeValue = (reaction + Reaktions-Modifikator) * 2 + nerves`
- Kritchance:
  `precision + Precision-Modifikator + weapon.critBonus + openingStrikeCritBonus`, geklemmt auf `0..50`
- Schaden:
  `strength + weapon.damage + conditionalDamage - rangedDamagePenalty`, mindestens `1`
- Krit-Multiplikator:
  Nahkampf `1.5`, Fernkampf `1.35`

Weitere Regeln:

- Fernkampf bekommt in fruehen Floors einen globalen Schadensmalus:
  Floors 1-2 `-2`, Floors 3-4 `-1`, danach `0`
- Fernkampf im Nahbereich kann einen `meleePenaltyHit` der Waffe erhalten
- Zielmodus fuer Fernkampf funktioniert nur mit:
  Fernkampfwaffe, Reichweite > 1, gerader Linie, Reichweite und Sichtlinie

Relevante Dateien:

- [combat-resolution.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/combat/combat-resolution.mjs:1)
- [player-attack.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/combat/player-attack.mjs:1)
- [targeting-service.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/targeting-service.mjs:1)
- [player-turn-controller.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/player-turn-controller.mjs:3)
- [balance.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/balance.mjs:8)

### 1.2 Block

Block ist aktuell ein klar abgegrenztes System fuer Schilde.

Aktuelle Formel:

- Blockchance:
  `offHand.blockChance + defender.nerves + defender.shieldBlockBonus`, geklemmt auf `5..75`
- Bei erfolgreichem Block:
  `reducedDamage = max(0, damage - offHand.blockValue)`

Weitere Regeln:

- Nur `offHand.subtype === "shield"` blockt
- Block ist voll zufallsbasiert, kein teilweiser Guard-State
- Schild-Modifikator `reflective` verursacht bei erfolgreichem Block `1` Rueckschaden
- Diese Reflexionslogik wird im Spielerangriff ausgewertet, nicht symmetrisch im gegnerischen Angriff

Relevante Dateien:

- [combat-resolution.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/combat/combat-resolution.mjs:19)
- [player-attack.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/combat/player-attack.mjs:96)
- [enemy-turns.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/ai/enemy-turns.mjs:1359)

### 1.3 Status-Effekte

Status-Effekte laufen zentral ueber `src/application/status-effect-service.mjs`.

Vorhandene Effektarten:

- `bleed`
- `poison`
- `precision_malus`
- `reaction_malus`
- `stun`
- `root`

Systemische Regeln:

- Effekte werden zentral appliziert, gespeichert und pro Runde verarbeitet
- DoT reduziert HP direkt in der Statusphase
- `precision_malus` und `reaction_malus` gehen direkt in Kampfberechnungen ein
- `root` und `stun` blockieren Bewegung
- Gegner mit `rank >= 9` sind implizit stun-immun
- `root` ist bei Monstern mit Variantentier `elite` oder `dire` um 1 Runde reduziert
- Effekte gleicher Art stacken nicht frei, sondern behalten je Feld den Maximalwert

Relevante Dateien:

- [status-effect-service.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/status-effect-service.mjs:4)
- [weapon-effects.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/weapon-effects.mjs:24)

### 1.4 Spielerattribute, Klassenpassiven und Level-Ups

Die drei Klassen sind zentral in `HERO_CLASSES` definiert.

Aktuelle Klassen:

- `lead`
- `stuntman`
- `director`

Vorhandene Klassenpassiven:

- Hauptrolle:
  erster Angriff gegen einen Gegner mit `+6 Hit`, `+8 Krit`
- Stuntman:
  `-1` Fallenschaden, `+5` Schildblockchance
- Regisseur:
  `+20` Fallenentdeckung, `+15` Fallenvermeidung

Spielerattribute:

- `maxHp`
- `strength`
- `precision`
- `reaction`
- `nerves`
- `intelligence`
- `endurance`

Level-Up-System:

- XP-Kurve:
  `40 + (level - 1) * 28 + floor((level - 1)^2 * 6)`
- Jede Stufe:
  `+3 maxHp`
- Gerade Stufen:
  `+1 strength`
- Ungerade Stufen:
  `+1 precision`, `+1 nerves`
- Alle 3 Stufen:
  `+1 reaction`
- Alle 4 Stufen:
  `+1 intelligence`
- Immer Vollheilung

Wichtig:

- `intelligence` ist aktuell spielmechanisch nur sehr begrenzt angeschlossen
- Startstats kommen aus `HERO_CLASSES`
- Startausruestung kommt aus den separaten Start-Loadouts

Relevante Dateien:

- [balance.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/balance.mjs:125)
- [combat-progression.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/combat/combat-progression.mjs:1)
- [state-blueprint.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/state-blueprint.mjs:282)
- [start-loadouts.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/start-loadouts.mjs:11)

### 1.5 Gegnerattribute, Floorskalierung, Variantentiers und Gegner-KI

#### Gegnerdatenbasis

Der aktuelle `MONSTER_CATALOG` besteht aus zwei Schichten:

- `100` aktive `standard`-Monster aus `monster-phase-one.mjs`
- `33` Legacy-Gegner ohne `spawnGroup` und meist ohne `archetypeId`

Die aktive Phase-One-Schicht ist stark systematisiert:

- `10` Archetypen
- je `10` Rangknoten pro Archetyp
- zusaetzliche Role-Baselines
- AI-Profile
- Weapon-Rollenpraeferenzen

#### Grundattribute

Monster haben aktuell:

- `rank`
- `hp`
- `strength`
- `precision`
- `reaction`
- `nerves`
- `intelligence`
- `xpReward`
- `aggroRadius`
- `behavior`
- `mobility`
- `retreatProfile`
- `healingProfile`
- `allowedTemperaments`
- `canOpenDoors`
- `canChangeFloors`
- optional `preferredWeaponRoles`

#### Floorskalierung

Die Laufzeitwerte entstehen in `enemy-factory.mjs`.

Aktuelle Skalierung:

- `scale = max(0, floor - monster.rank)`
- `hp += scale * 5 + random(0..2)`
- `xp += scale * 5`
- `strength += floor((scale + 1) / 1)`
- `precision += floor(scale / 2)`
- `reaction += floor(scale / 2)`
- `nerves += floor(scale / 2)`
- `intelligence += floor(scale / 3)`
- `aggroRadius += min(4, floor(scale / 3))`

Wichtig:

- Strength waechst bereits bei `scale = 0` effektiv um `+1`
- Floorskalierung ist damit nicht rein additiv zum Basiswert, sondern teils implizit verschoben

#### Variantentiers

Aktuelle Variantentiers:

- `normal`
- `elite`
- `dire`

Varianteneffekte:

- unterschiedliche `modCount`
- HP-Multiplikatoren
- XP-Multiplikatoren
- Weapon- und Offhand-Dropchancen
- zusaetzliche zufaellige Variantmods mit Stat-Aenderungen

Vorhandene Variantmods:

- `hulking`
- `brutal`
- `keen`
- `swift`
- `unyielding`
- `cunning`

#### KI

Die KI benutzt bereits mehrere systemische Achsen:

- `behavior`:
  `dormant`, `wanderer`, `trickster`, `stalker`, `hunter`, `juggernaut`
- `mobility`:
  `local`, `roaming`, `relentless`
- `retreatProfile`:
  `none`, `cautious`, `cowardly`
- `healingProfile`:
  `none`, `slow`, `steady`, `lurking`
- `temperament`:
  `stoic`, `patrol`, `restless`, `erratic`

Aktuelle wichtige KI-Regeln:

- Aggro wird je nach Behavior/Mobility unterschiedlich getriggert
- `local` verliert Aggro wieder, wenn das Ziel weit genug weg ist
- `relentless` haelt Aggro leichter
- Retreat haengt an Intelligenz, Distanz, HP-Verhaeltnis und Kill-Potenzial
- Regeneration hat feste Cooldowns je Healing-Profil
- Fernkampf nutzt nur gerade Linie, Range und Sichtlinie
- Viele Gegner koennen Tueren oeffnen, aber nicht schliessen
- Nur `terminator` kann aktuell Floors verfolgen

Relevante Dateien:

- [monsters.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/monsters.mjs:139)
- [monsters.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/monsters.mjs:981)
- [monster-phase-one-config.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/monster-phase-one-config.mjs:26)
- [monster-phase-one.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/monster-phase-one.mjs:159)
- [enemy-factory.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/dungeon/enemy-factory.mjs:14)
- [enemy-turns.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/ai/enemy-turns.mjs:24)

### 1.6 Waffen, Schilde, Raritaeten, Modifikatoren und Ausruestungsprofile

#### Waffen

Es gibt aktuell `50` Weapon-Templates.

Zentrale Achsen:

- `archetypeId`
- `weaponRole`
- `handedness`
- `attackMode`
- `profileId`
- `range`
- `meleePenaltyHit`
- `signatureEffect`

Zentrale Waffenprofile:

- `light_melee`
- `heavy_melee`
- `precise_ranged`
- `special_improv`

Waffengeneration:

- Floor-Scaling ueber `getFloorScalingBonus()`
- Rarity-Roll
- Numeric Mods
- Signature Effects
- zusaetzliche Effect-Rolls

Wichtig:

- Viele Waffenprofile sind sehr klar gruppiert
- Zweihaender und Fernkampf sind strukturell gut identifizierbar
- Fernkampf ist regeltechnisch staerker eingeschraenkt als Nahkampf

#### Schilde

Es gibt aktuell `18` Shield-Templates.

Zentrale Achsen:

- `archetypeId`
- `blockChance`
- `blockValue`
- `statMods`
- `minFloor`

Shield-Modifikatoren:

- `sturdy`
- `reflective`
- `calming`
- `reactive`
- `fortified`
- `cursedGuard`

Wichtig:

- Shields sind deutlich kleiner und konservativer als das Waffensystem
- Die groessten natuerlichen Cluster sind Blockprofil und Statmod-Profil
- `minFloor` ist definiert, im aktuellen Generator aber nicht sichtbar wirksam

#### Raritaeten

Zentrale Raritaeten:

- `common`
- `uncommon`
- `rare`
- `veryRare`

Rarity wirkt aktuell auf:

- Anzahl von Shield-Mods
- Anzahl von Numeric Weapon Mods
- Anzahl und Art zusaetzlicher Weapon Effects
- Dropgewicht je Quelle

Relevante Dateien:

- [weapon-templates.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/weapon-templates.mjs:3)
- [shields.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/shields.mjs:25)
- [itemization.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/itemization.mjs:51)
- [item-modifiers.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/item-modifiers.mjs:8)
- [weapon-effects.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/weapon-effects.mjs:24)

### 1.7 Hunger, Heilung, sichere Regeneration und weitere Ressourcenachsen

#### Hunger

Aktuelle Formeln:

- `nutritionMax = 700 + 100 * endurance`
- `nutritionStart = 501 + 100 * endurance`
- `NUTRITION_COST_PER_ACTION = 1`

Hungerzustaende:

- `SATED`
- `NORMAL`
- `HUNGRY`
- `STARVING`
- `DYING`

Folge im Zustand `DYING`:

- pro Aktion `1` direkter HP-Schaden

#### Aktive Heilung

- Heiltraenke stellen aktuell `8 HP` her

#### Sichere Regeneration

Aktuelle Regeln:

- nur wenn kein Gegner innerhalb Manhattan-Distanz `<= 3`
- `+0.5` Fortschritt bei Bewegung
- `+1` Fortschritt bei Warten
- `+0.5` Zusatzbonus neben Showcase
- bei `safeRestTurns >= 4`:
  `1 HP` Heilung

Wichtig:

- sichere Regeneration ist eng mit Raumkontrolle, Sicht und Gegnernaehe verknuepft
- Showcases sind hier Teil einer echten Ressourcenachse

Relevante Dateien:

- [nutrition.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/nutrition.mjs:1)
- [runtime-support.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/app/runtime-support.mjs:1)
- [ai/awareness.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/ai/awareness.mjs:1)
- [item-defs.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/item-defs.mjs:1)

### 1.8 Fallen, Gefahrenfelder, Sicht, Tueren, Schluessel, Raumkontrolle

#### Sicht

Aktuelle Sichtregeln:

- Basisradius `5`
- plus `lightBonus` der Hauptwaffe
- Wande, geschlossene Tueren und Showcases blocken Sicht
- Sichtpruefung nutzt Chebyshev-Distanz
- LoS benutzt eine eigene Gitterlinie mit diagonaler Eckblock-Regel

#### Fallen und Hazard-Zonen

Trap-Typen:

- `floor`
- `alarm`
- `hazard`

Trap-Mechaniken:

- versteckte Fallen mit Entdeckungs- und Reaktionswurf
- kontinuierliche Gefahrenfelder
- Schaden
- Alarm-Aggro
- Slow-Meldung

Formeln:

- Detection:
  `25 + (precision - detectDifficulty) * 15 + trapDetectionBonus`, Clamp `5..95`
- Avoid:
  `20 + (reaction - reactDifficulty) * 15 + visibleBonus + trapAvoidBonus`, Clamp `5..95`

Schadensminderung:

- durch `endurance`
- zusaetzlich durch `trapDamageReduction`

#### Tueren und Schluessel

Tueren:

- `NORMAL`
- `LOCKED`

Schluessel:

- farbgebunden
- floorgebunden
- Verbrauch beim Oeffnen

Tueren sind fuer Raumkontrolle relevant, weil sie:

- LoS blocken
- Bewegung stoppen
- manuell geschlossen werden koennen
- von vielen Gegnern geoeffnet werden koennen

Relevante Dateien:

- [visibility-service.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/visibility-service.mjs:1)
- [traps.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/traps.mjs:235)
- [door-service.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/door-service.mjs:3)
- [player-turn-controller.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/player-turn-controller.mjs:40)

### 1.9 Loot-Spawns, Chest-Regeln, Locked-Room-Belohnungen und Progressionskurven

#### Globale Spawnfunktionen

Global in `balance.mjs`:

- Gegneranzahl pro Floor
- Potionanzahl pro Floor
- Floor-Weapon-Spawn
- Floor-Shield-Spawn
- Chest-Spawn
- Chest-Anzahl
- Locked-Door-Anzahl
- Locked-Room-Chest ja/nein
- Equipment-Rarity-Gewichte nach Quelle/Floor

#### Raumrollen im Layout

Die Verteilung von Enemies, Items, Food und Fallen haengt stark an `ROOM_TYPE_SPECS`.

Wichtige Faktoren:

- `enemyFactor`
- `itemFactor`
- `foodFactor`
- `trapFactor`
- `doorChance`

Wichtige Raumrollen:

- `weapon_room`
- `aggro_room`
- `calm_room`
- `canteen`
- `props_room`
- `costume_room`
- `hazard_room`
- `trap_room`
- `showcase_room`

#### Chests

Chest-Content:

- meistens Weapon
- selten Shield
- zusaetzlich Container-Food-Chests

Locked-Room-Bonus:

- Locked Room bekommt optional Bonus-Chest
- nutzt `dropSourceTag = "locked-room-chest"`
- rollt mit `floor + 1`
- nutzt `boostSpecial = true`

#### Food-Loot

Food-System:

- globales Budget
- Aufteilung in `world`, `containers`, `monsters`
- World- und Container-Food werden aktiv genutzt
- Monster-Food-Drops sind an Legacy-Gegner-IDs gebunden

Wichtig:

- Da der aktive Spawn primÃ¤r die `standard`-Monster nutzt, ist der Monster-Food-Budgetpfad aktuell praktisch ungenutzt

#### Archetypensequenz

Jeder Run hat eine gemischte Sequenz aus `10` Studio-Archetypen.

Loot-Archetypen werden nicht nur aus dem aktuellen Studio gezogen, sondern auch aus benachbarten Archetypen in dieser Sequenz, mit quellenabhaengigen Gewichten.

Relevante Dateien:

- [balance.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/balance.mjs:253)
- [branch-layout.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/dungeon/branch-layout.mjs:2958)
- [branch-layout.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/dungeon/branch-layout.mjs:3180)
- [equipment-rolls.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/dungeon/equipment-rolls.mjs:1)
- [food-balance.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/food-balance.mjs:1)
- [food-loot-pipeline.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/food-loot-pipeline.mjs:11)
- [studio-archetypes.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/content/catalogs/studio-archetypes.mjs:1)
- [archetype-loot-service.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/application/archetype-loot-service.mjs:11)

## 2. EinschÃ¤tzung: Was ist bereits zentral und gruppierbar, was nicht?

### 2.1 Bereits zentral, formelbasiert oder gut gruppierbar

Gut anschlussfaehig fuer globale oder gruppenbezogene Regler sind aktuell:

- Kampf-Grundwerte:
  Hit, Krit, Schaden, Block
- XP- und Levelkurve
- Klassenbasiswerte und Klassenpassiven
- Gegner-Floorskalierung
- Variantentiers und Variantmods
- Weapon-Templates und Weapon-Profile
- Shield-Templates und Shield-Modifikatoren
- Rarity-Gewichte nach Quelle
- AI-Profilfelder:
  Behavior, Mobility, Retreat, Healing, Temperament
- Raumrollenfaktoren:
  Enemy, Item, Food, Trap
- Hungerformeln
- sichere Regeneration
- globale Spawnfunktionen fuer Chests, Potions, Floor-Weapons, Locks

Diese Bereiche sind bereits so organisiert, dass spaetere globale Prozent- oder Additivregler plausibel sind.

### 2.2 Eher hart verdrahtet, diskret oder schwer global justierbar

Schwieriger fuer eine spaetere saubere Balancing-Schicht sind aktuell:

- viele KI-Schwellen und Prozentwerte direkt im Turn-Code
- asymmetrische Sonderfaelle wie Reflective-Block
- Geometrie-Mix aus Chebyshev, Manhattan und geraden Fernkampflinien
- verteilte Trap-Logik mit separater Budget- und Platzierungsphase
- implizite Fruehfloor-Fernkampfstrafe direkt in der Kampfaufloesung
- Legacy-Monster und aktive Standard-Monster parallel im selben Katalog
- inaktive oder halbverdrahtete Weapon-Modifier-Logik
- tote oder kaum angeschlossene Werte wie `charm`, `nerveDebuff`, Teile von `intelligence`

## 3. TatsÃ¤chlich aus dem Code ableitbare Gruppierungsmoeglichkeiten

### 3.1 Gegnerrollen oder Kampffunktion

Basis:

- `behavior`
- `roleProfile` in der Phase-One-Generierung
- `preferredWeaponRoles`

Aktuelle sinnvolle Gruppen:

- `hunter`
- `stalker`
- `trickster`
- `juggernaut`
- `wanderer`
- `dormant`

Plausible Regler:

- Aggro-Reichweite
- Chase-Haeufigkeit
- Retreat-Schwelle
- Fernkampfpraeferenz
- Spezialwaffenpraeferenz
- Regenerationsprofil

Einschaetzung:

- sehr stabil
- systemisch sinnvoll
- fuer UI und Simulation gut geeignet

### 3.2 Gegnerverhalten / KI-Profil

Basis:

- `behavior`
- `mobility`
- `retreatProfile`
- `healingProfile`
- `temperament`

Aktuelle Inhalte:

- alle aktiven Standardmonster
- auch Legacy-Monster sind groesstenteils auf diesen Achsen beschrieben

Plausible Regler:

- Aggro-Trigger
- Re-Aggro
- Aggro-Verlust
- Healing-Cooldown
- Heal pro Tick
- Retreat-HP-Schwellen
- Wahrnehmungsradius
- Door-Interaktion

Einschaetzung:

- sehr wertvoll als spaetere Reglergruppen
- aber erst voll wirksam, wenn die diskreten KI-Sonderregeln staerker zentralisiert werden

### 3.3 Mobilitaet

Basis:

- `local`
- `roaming`
- `relentless`

Aktuelle Inhalte:

- `local`: 37 Monster
- `roaming`: 72 Monster
- `relentless`: 24 Monster

Plausible Regler:

- Leash-Distanz
- Aggro-Verlust
- Suchradius
- Fernverfolgung

Einschaetzung:

- sehr stabile Gruppe
- besonders geeignet fuer globale Mobilitaetsregler

### 3.4 Heilprofil

Basis:

- `none`
- `slow`
- `steady`
- `lurking`

Aktuelle Inhalte:

- `slow`: 46
- `steady`: 42
- `lurking`: 26
- `none`: 19

Plausible Regler:

- Cooldown
- Heal-Menge
- Calm-Bedingung
- Sichtbarkeit des Healevents

Einschaetzung:

- sehr gute systemische Gruppe

### 3.5 Variantentier

Basis:

- `normal`
- `elite`
- `dire`

Aktuelle Inhalte:

- alle generierten Gegner

Plausible Regler:

- HP%
- XP%
- Weapon-Drop
- Offhand-Drop
- Variantmod-Anzahl
- evtl. Statusresistenzen

Einschaetzung:

- sehr stabil
- hervorragender Kandidat fuer globale Multiplikatoren

### 3.6 Rangband / Floorband

Basis:

- `rank`
- `floor`
- `scale = floor - rank`

Aktuelle Inhalte:

- Monsterraenge 1-11
- aktive Archetypen meist 1-10
- 3 Legacy-Rang-11-Gegner

Plausible Regler:

- Basisstat-Band
- XP-Band
- Spawngewichte
- Floorscaling-Staerke
- Variantentier-Wahrscheinlichkeiten

Einschaetzung:

- sehr sinnvoll
- besonders fuer Simulationen wichtig

### 3.7 Tuerverhalten / Aggro / Rueckzug

Basis:

- `canOpenDoors`
- `aggroRadius`
- `retreatProfile`
- `canChangeFloors`

Aktuelle Inhalte:

- `79` aktive Standardmonster koennen Tueren oeffnen
- `21` koennen es nicht
- Floorwechsel aktuell nur `terminator`

Plausible Regler:

- Door-Use
- Door-Hearing-Reichweite
- Aggro-Radius
- Retreat-Distanz
- Floor-Follow-Regel

Einschaetzung:

- Tueroeffner als Gruppe: sinnvoll
- Floor-Follower als Gruppe: zu klein, aktuell Sonderfall

### 3.8 Nahkampf / Fernkampf / Spezialangriff

Basis:

- `preferredWeaponRoles`
- Template-Achsen `attackMode`, `weaponRole`, `range`

Aktuelle Inhalte:

- `35` aktive Standardmonster sind ranged-capable
- `37` sind special-capable
- `19` haben keine explizite Waffenpraeferenz
- `7` sind pure-ranged

Plausible Regler:

- Waffenauswahlgewichte
- Ranged-Spawnbias
- Range
- Melee-Penalty
- Proc-Chancen fuer Spezialwaffen

Einschaetzung:

- sinnvoll
- stark genug fuer Gruppenregler
- aber kein harter Klassenersatz, da es zunaechst nur ein Bias-System ist

### 3.9 Waffenprofile

Basis:

- `weaponRole`
- `handedness`
- `attackMode`
- `profileId`
- `signatureEffect`

Aktuelle Inhalte:

- `oneHanded`: 14 Templates
- `twoHanded`: 12
- `ranged`: 11
- `special`: 13

Plausible Regler:

- Base Damage
- Base Hit
- Base Crit
- Floor-Scaling pro Profil
- Reichweite
- Nahkampf-Malus
- Signatur-Proc

Einschaetzung:

- eine der besten Gruppen fuer spaetere Balancing-Regler

### 3.10 Einhand / Zweihand

Basis:

- `handedness`

Aktuelle Inhalte:

- `35` one-handed
- `15` two-handed

Plausible Regler:

- Schaden
- Hit
- Schildkompatibilitaet
- Spawngewicht

Einschaetzung:

- stabile Untergruppe
- besonders fuer Equipment-Vergleiche hilfreich

### 3.11 Schildtyp / Schildmod-Cluster

Basis:

- `blockChance`
- `blockValue`
- `statMods`
- Shield-Modifikatoren

Aktuelle Inhalte:

- kleine, aber klar erkennbare Cluster:
  `nerves+1`, `reaction+1`, `precision+1`, `endurance+1`, schwere `reaction-1`-Schilde

Plausible Regler:

- Blockchance
- Blockwert
- Statmod-Staerke
- Modifier-Gewichte

Einschaetzung:

- brauchbar
- aber kleiner und weniger universell als Waffenprofile

### 3.12 Raritaet

Basis:

- `common`
- `uncommon`
- `rare`
- `veryRare`

Aktuelle Inhalte:

- alle generierten Weapons und Shields

Plausible Regler:

- Modifier-Anzahl
- Effektanzahl
- High-Impact-Effektchancen
- Drop-Wahrscheinlichkeiten je Quelle

Einschaetzung:

- sehr stabile globale Gruppe

### 3.13 Lootquelle

Basis:

- `dropSourceTag`

Aktuelle Inhalte:

- `floor`
- `chest`
- `locked-room-chest`
- `monster:*`

Plausible Regler:

- Rarity-Verteilung
- Archetype-Bias
- Weapon-vs-Shield-Verhaeltnis
- Special-Bias
- Floor-Caps

Einschaetzung:

- sehr starke Gruppe fuer kuenftige globale Regler

### 3.14 Spielerklasse

Basis:

- `lead`
- `stuntman`
- `director`

Aktuelle Inhalte:

- 3 voll definierte Klassen

Plausible Regler:

- Startstats
- Passivstaerke
- Startinventar
- Startwaffenpool
- Nutrition-Start indirekt ueber `endurance`

Einschaetzung:

- stabil
- klein
- sehr gut fuer zielgerichtete Balance-Regler

### 3.15 Globale Progressionssysteme

Basis:

- XP-Kurve
- Level-Up-Rewards
- Enemy-Count
- Potion-Count
- Chest-/Lock-Count
- Floorscaling
- Hunger
- sichere Regeneration

Plausible Regler:

- globale Prozentmodifikatoren
- additive Growth-Werte
- Spawn-Multiplikatoren

Einschaetzung:

- ideal fuer spaetere globale Justierung

## 4. Bewertung der wichtigsten Gruppen

### 4.1 Besonders systemisch und stabil

Diese Gruppen sind aus dem aktuellen Stand besonders sinnvoll:

- Standardgegner nach `archetypeId + rank`
- Gegner nach `behavior`
- Gegner nach `mobility`
- Gegner nach `retreatProfile`
- Gegner nach `healingProfile`
- Gegner nach `variantTier`
- Waffen nach `weaponRole + attackMode + handedness + profileId`
- Schilde nach Blockcluster
- Loot nach `dropSourceTag`
- Raumrollen nach `ROOM_TYPE_SPECS`
- Spielerklassen
- globale Progressionsparameter

### 4.2 Sinnvoll, aber mit Einschraenkungen

- Gegner nach `preferredWeaponRoles`
  nur Bias, kein hard lock
- Gegner nach `temperament`
  systemisch interessant, aber tiefer im KI-Code verzweigt
- Schildgruppen nach `minFloor`
  aktuell nicht sauber an den Generator angeschlossen

### 4.3 Aktuell zu speziell oder zu klein

- Gegner mit Offhand
  praktisch nur 3 Legacy-Gegner
- Gegner mit Floorwechsel
  praktisch nur `terminator`
- Sondergruppen ueber einzelne `special`-Textbeschreibungen
  nicht systemisch genug

## 5. Explizite Erschwernisse fuer eine kuenftige Balancing-Schicht

### 5.1 Implizite Defaultwerte

- viele KI-Felder werden zur Laufzeit mit Defaults nachgezogen
- Gegner ohne definierte Werte landen implizit bei:
  `mobility = roaming`, `retreat = none`, `healing = slow`, `temperament = stoic`
- Weapon-/Shield-Clonepfade setzen ebenfalls viele Fallbacks implizit

Relevante Dateien:

- [enemy-turns.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/ai/enemy-turns.mjs:177)
- [equipment-helpers.mjs](C:/Users/Lui/OneDrive/Documents/final-scene-main/src/equipment-helpers.mjs:18)

### 5.2 Versteckte Abhaengigkeiten

- fruehe Fernkampfschwaeche haengt direkt an `floorNumber` im Kampfcode
- sichere Regeneration haengt implizit an Showcase-Naehe
- Loot-Archetypen haengen an der Run-Sequenz benachbarter Studio-Archetypen
- Monsterpool fuellt fruehe Archetypen-Pools implizit auf mindestens 3 Kandidaten auf

### 5.3 Hart codierte Sonderregeln

- Stun-Immunitaet fuer `rank >= 9`
- Root-Dauerreduktion fuer `elite/dire`
- nur `terminator` darf Floors folgen
- Reflective-Block nur in einer Angriffsrichtung ausgewertet
- Chest-Shield-Chance als harter `0.1`-Roll im Chest-Service statt ueber die globale Konstante

### 5.4 Diskrete Verhaltensumschaltungen

- Aggro-Spruenge nach Behavior/Mobility
- Retreat an festen Schwellen
- Regeneration an festen Cooldowns
- lokale Gegner verlieren Aggro bei fester Distanz
- `erratic` replanned zufaellig

### 5.5 Nicht sauber aus zentraler Pipeline ableitbare Werte

- `WEAPON_MODIFIER_DEFS` sind vorhanden, aber nicht die aktive Weapon-Statpipeline
- `getWeaponConditionalDamageBonus()` ist aktuell immer `0`
- `final`-Modifier ist im Livesystem nicht wirksam
- `charm` existiert auf Schilden, aber ohne sichtbare Spielwirkung
- `trap.effect.nerveDebuff` wird angekuendigt, aber nicht mechanisch angewendet
- `trap.effect.slow` erzeugt nur Meldung
- `monster`-Food-Budget ist vorbereitet, aber fuer aktive Monsterkataloge tot

## 6. Zusammenfassende Empfehlung fuer einen spaeteren Justierungsschirm

### 6.1 Sinnvollste Balancing-Gruppen aus dem aktuellen Stand

Die sinnvollsten Gruppen fuer einen ersten echten Balancing-Layer sind:

- Gegner:
  `archetypeId`, `rank`, `behavior`, `mobility`, `retreatProfile`, `healingProfile`, `variantTier`
- Waffen:
  `weaponRole`, `attackMode`, `handedness`, `profileId`, `signatureEffect`
- Schilde:
  Blockcluster und Modifier-Cluster
- Loot:
  `dropSourceTag`
- Raumsystem:
  `ROOM_TYPE_SPECS`
- Spieler:
  Klassen
- Global:
  XP, Level-Ups, Hunger, sichere Regeneration, Spawnmengen

### 6.2 Parameter, die sich besonders gut fuer globale Prozent- oder additive Gruppenregler eignen

Sehr gut geeignet:

- Hitchance-Basis
- Kritchance-Basis
- Schadensbasis
- Blockchance
- Blockwert
- XP-Multiplikatoren
- HP-Multiplikatoren
- Floorscaling-Zuwachs
- Variant-Gewichte
- Rarity-Gewichte
- Proc-Chancen
- Aggro-Radius
- Retreat-Schwellen
- Regen-Cooldowns und Heal-Werte
- Enemy-/Item-/Food-/Trap-Faktoren pro Raumrolle
- Nutrition-Max/Start/Turn-Cost
- Safe-Regeneration-Progress und Heal-Wert

### 6.3 Systeme, die vor einer spaeteren Balancing-Schicht zuerst vereinheitlicht oder refaktoriert werden sollten

Prioritaet fuer Vereinheitlichung:

- aktiver Standard-Monsterkatalog vs. Legacy-Katalog
- Weapon-Modifier- und Conditional-Damage-Pipeline
- tote oder halbverdrahtete Stats und Effektfelder:
  `charm`, `nerveDebuff`, `slow`, Teile von `intelligence`
- Shield-`minFloor`
- Food-Drops fuer aktive Monster
- asymmetrische Reflective-Block-Regel
- verteilte Trap-Budget-/Platzierungslogik
- KI-Schwellenwerte in eine staerker zentrale Datenschicht
- klare Trennung von Geometrieachsen:
  Sicht, Aggro, Targeting, Gefahrendistanz

## 7. Kurzfazit

Der aktuelle Stand von `The Final Scene` ist bereits deutlich gruppierbarer, als es ein rein individuell gebautes Roguelike waere. Besonders Gegnerprofile, Waffenprofile, Variantentiers, Lootquellen, Raumrollen und Klassen sind schon heute brauchbare Anknuepfungspunkte fuer ein spaeteres zentrales Balancing-System.

Gleichzeitig gibt es mehrere Stellen, an denen verstreute Logik, implizite Defaults, tote Felder und Legacy-Ueberhaenge eine spaetere globale Justierung erschweren wuerden. Fuer einen kuenftigen Justierungsschirm und einen Simulations-/Testscreen ist daher vor allem wichtig, zunaechst die bereits vorhandenen systemischen Gruppen zu nutzen und die heute noch halbverdrahteten oder asymmetrischen Sonderfaelle sichtbar zu isolieren.

