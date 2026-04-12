# Gameplay Mechanics

## Zweck dieses Dokuments

Diese Datei beschreibt den aktuellen spielerischen Stand von `The Final Scene`. Sie ist bewusst systemorientiert geschrieben: nicht als Marketing-Text, sondern als Arbeitsdokument für neue Threads, spätere Balancing-Pässe und Feature-Erweiterungen.

## Grundidee

`The Final Scene` ist ein rundenbasiertes Browser-Rogue-like mit Horrorfilm-Setting. Der Spieler erkundet prozedural erzeugte Dungeon-Ebenen, sammelt Ausrüstung und Verbrauchsgüter, verwaltet Hunger und Gesundheit, bekämpft Gegner mit unterschiedlichen Verhaltensmustern und versucht, möglichst tief zu kommen und einen guten Highscore zu erreichen.

Ein Lauf ist riskenbasiert:

- Jede Aktion kostet eine Runde
- Gegner reagieren innerhalb desselben Systemtakts
- Ressourcen wie Heilung, Nahrung, Schlüssel und gutes Equipment sind begrenzt
- Persistenz existiert, aber der eigentliche Spielfortschritt ist als Run gedacht

## Start eines Laufs

Zu Beginn wählt der Spieler:

- einen Heldennamen
- eine Heldenklasse

Aktuell gibt es drei Klassen:

- `Hauptrolle`
  Kämpft über Timing, Präsenz und einen starken ersten Schlag gegen neue Gegner.
- `Stuntman`
  Frontkämpfer mit viel Leben, gutem Durchhaltevermögen und weniger Schaden durch Set-Gefahren.
- `Regisseur`
  Kontrolliert die Szene über hohe Nerven-/Intelligenzwerte und entdeckt Fallen zuverlässiger.

Die Klasse beeinflusst Startwerte wie:

- `maxHp`
- `strength`
- `precision`
- `reaction`
- `nerves`
- `intelligence`
- `endurance`

Der Heldenname und die Klassenwahl werden lokal gespeichert und beim nächsten Start wieder angeboten.

Jede Klasse besitzt im aktuellen Stand genau eine kleine Passive, die auf bestehende Systeme aufsetzt:

- `Hauptrolle`: erster Angriff gegen einen frischen Gegner erhält Bonus auf Treffer und Krit
- `Stuntman`: erleidet weniger Schaden durch Fallen/Gefahrenfelder und blockt etwas sicherer mit Schilden
- `Regisseur`: entdeckt Fallen früher und reagiert besser auf sie

## Core Loop

Der normale Spielfluss ist:

1. Lauf starten
2. Dungeon-Ebene erkunden
3. Gegner bekämpfen oder umgehen
4. Loot, Nahrung, Waffen, Schilde und Schlüssel einsammeln
5. Ressourcenverbrauch gegen Fortschritt abwägen
6. Treppe erreichen und nächste Ebene betreten
7. Wiederholen, bis der Spieler stirbt

Daraus ergeben sich die wichtigsten Spannungsachsen:

- Lebenspunkte vs. Risiko
- Hunger vs. Tempo
- Inventarwert vs. Sofortnutzung
- Tiefer gehen vs. vorher noch Ebene absichern

## Runden und Eingaben

Das Spiel ist rundenbasiert. Jede relevante Spieleraktion verbraucht Zeit und löst Folgeprozesse aus.

Wichtige Eingaben:

- `WASD` oder Pfeiltasten: Bewegung
- `Leertaste`: warten
- `H`: Heiltrank-Schnellnutzung
- `C`: benachbarte offene Tür schließen
- `I`: Inventar öffnen
- `O`: Optionen öffnen
- `R`: Run neu starten
- `Enter`: primäre Modal-Aktion bestätigen
- `Esc`: Fenster schließen

Warten ist kein neutraler Zustand:

- es kostet Hunger
- es kann Gegneraktionen auslösen
- es kann situationsabhängige Heilung beschleunigen

## Dungeon-Struktur

Jede Ebene wird prozedural erzeugt und besteht aus:

- Räumen
- Korridoren
- Wänden
- Treppen
- Türen
- Gegnern
- Loot
- Sonderobjekten wie Showcases und Fallen

Wichtige Strukturregeln:

- Der Spieler startet nicht auf einem Gegnertile
- Räume und Gänge sollen erreichbar bleiben
- Showcases blockieren Bewegung und dürfen keine wichtigen Übergänge unspielbar machen
- Türen werden an sinnvollen Choke-Points platziert

Es gibt mindestens:

- eine Abwärtstreppe für den Fortschritt
- auf tieferen Ebenen je nach Kontext auch Aufwärtstreppen bzw. Rückkehrpunkte im Floorsystem

Das Wechseln einer Ebene erfolgt nicht sofort, sondern über ein Bestätigungs-Modal.

## Sicht und Informationsmodell

Der Dungeon ist kein vollständig offenes Informationssystem. Sichtbarkeit spielt eine Rolle:

- Räume und Korridore werden erst beim Erkunden sichtbar
- Geschlossene Türen blockieren Sicht
- Gegnerdetails sind anfangs eingeschränkt

Das Gegnerpanel zeigt zunächst nur begrenzte Informationen. Erst nach dem ersten echten Kampf gegen einen Gegnertyp werden zusätzliche Detailwerte sichtbar. Das unterstützt das Horror-/Entdeckungsgefühl und hält Wissen teilweise an Spielererfahrung gebunden.

## Gegner

Die Gegner stammen aus einem Horrorfilm-inspirierten Katalog. Jeder Gegnertyp besitzt feste Basiswerte und Verhaltensmerkmale, zum Beispiel:

- Lebenspunkte
- Stärke
- Präzision
- Reaktion
- Nerven
- Intelligenz
- Aggro-Radius
- Türverhalten
- Spezialbeschreibung

Die Freischaltung stärkerer Gegner ist an die erreichte Ebene gekoppelt.

Zusätzlich kann ein Gegner über Varianten und Skalierung verschärft werden:

- höhere Stats auf tieferen Ebenen
- Variantentypen wie `elite` oder `dire`
- zusätzliche Modifikatoren

## Gegnerverhalten

Gegner verhalten sich nicht alle gleich. Relevante Achsen sind:

- Mobilität
- Aggro-Verhalten
- Türinteraktion
- Rückzugsverhalten
- Regeneration

Beobachtbare Verhaltenslogiken im aktuellen Stand:

- lokale Gegner verfolgen nicht grenzenlos über die ganze Ebene
- relentless Gegner können dauerhaft jagen
- manche Gegner können Türen öffnen, andere bleiben an geschlossenen Türen hängen
- Gegner können um Hindernisse herumlaufen statt stumpf zu blockieren
- verletzte, intelligente Gegner können sich zeitweise zurückziehen
- manche Gegner regenerieren außerhalb direkter Nahkampfnähe
- Alarmfallen können Gegner aggressiv schalten

## Kampfmodell

Kampf entsteht hauptsächlich durch Bewegungsinteraktion im Nahbereich. Läuft der Spieler in einen Gegner oder endet eine Kampfrunde in Bedrohungsreichweite, werden Treffer- und Schadensregeln ausgewertet.

Wichtige Kampfgrößen:

- `strength`
- `precision`
- `reaction`
- `nerves`
- Waffenschaden
- Hit-Bonus
- Crit-Bonus
- Blockchance
- Blockwert

Das aktuelle Modell umfasst:

- Treffer oder Verfehlen
- kritische Treffer
- gegnerisches Ausweichen bzw. eigenes Ausweichen
- Schaden durch Waffenbasis plus Modifikatoren
- Schildblock gegen eingehenden Schaden

Das Topbar-HUD zeigt verdichtete Kampfwerte, während Tooltips eine detailliertere Herleitung behalten.

## Waffen

Der Spieler startet faktisch mit bloßen Händen als Minimalwaffe. Im Lauf können bessere Waffen gefunden oder direkt aus Loot-Situationen ausgerüstet werden.

Waffen besitzen unter anderem:

- Name
- Schaden
- Trefferbonus
- Kritbonus
- Handedness
- Seltenheit
- Quelle
- Beschreibung

Waffen können:

- direkt vom Boden/aus dem Loot-Modal ausgerüstet werden
- ins Inventar gelegt werden
- mit Seltenheitsstufen generiert werden
- über Modifier/Affixe zusätzliche Eigenschaften erhalten

## Schilde und Nebenhand

Neben Waffen existiert eine Offhand-/Schild-Logik. Schilde liefern:

- Blockchance
- Blockwert
- optionale Modifier
- teils zusätzliche Spezialeffekte

Auch Schilde können direkt aus Loot ausgerüstet oder ins Inventar gelegt werden.

## Item-Rarität und Modifier

Equipment ist nicht rein statisch. Das Spiel kennt ein Raritäts- und Modifier-System:

- `common`
- `uncommon`
- `rare`
- `veryRare`

Höhere Seltenheit erhöht die Zahl möglicher Modifier. Dadurch entstehen Equipment-Varianten mit unterschiedlichen Profilen, zum Beispiel:

- mehr Schaden
- mehr Trefferchance
- mehr Krit
- stärkere Blockwerte
- spezielle Tags wie Reflex-/Final-/Curse-Effekte

Das macht Loot nicht nur zu einer linearen Zahlensteigerung, sondern auch zu einer Quelle für Build-Tendenzen.

## Loot-Arten

Aktuell relevante Loot-Typen sind:

- Heiltränke
- Nahrung
- Waffen
- Schilde / Offhand-Items
- Schlüssel
- Truheninhalte

Wenn der Spieler ein Loot-Tile betritt, öffnet sich in vielen Fällen ein Entscheidungs-Modal. Je nach Typ sind typische Optionen:

- sofort benutzen / konsumieren / ausrüsten
- ins Inventar legen
- liegen lassen

Damit ist Loot nicht nur ein Pickup, sondern häufig eine unmittelbare Priorisierungsentscheidung.

## Inventar

Das Inventar ist ein eigenes Overlay und verwaltet gesammelte Gegenstände. Es unterstützt aktuell:

- Nutzung von Tränken
- Nutzung von Nahrung
- Ausrüsten von Waffen
- Ausrüsten von Offhand-Items
- Kategorisierung und Filterung

Die Darstellung ist gruppiert, unter anderem nach:

- Waffen
- Tränke
- Essen
- Schlüssel

Icons werden nach Möglichkeit aus dedizierten SVG-Assets geladen.

## Heiltränke

Heiltränke sind eine der wichtigsten Sofortressourcen.

Aktuelles Verhalten:

- Beim Betreten eines Trank-Tiles öffnet sich ein Loot-Modal
- Der Trank kann direkt getrunken oder eingelagert werden
- Eingelagerte Tränke können später aus dem Inventar oder per Schnellzugriff genutzt werden
- Heilung ist auf sinnvolle Maximalwerte begrenzt

Tränke sind damit zugleich Notfallwerkzeug und Vorratsressource.

## Nahrung und Hunger

Neben HP ist Hunger eine zweite Kernressource. Nahrung stellt Nutrition wieder her, während jede Aktion Nutrition verbraucht.

Wichtige Eigenschaften:

- Nutrition hat einen Maximalwert
- der Startwert hängt an der Klasse bzw. am Endurance-Profil
- Nahrung erhöht Nutrition nur bis zum Maximum
- Warten verbraucht ebenfalls Nutrition

Hungerzustände eskalieren:

- satt / normal / hungrig je nach Schwellenwert
- `STARVING`
- `DYING`

Wenn der Spieler in den schlimmsten Bereich fällt:

- entstehen Warnmeldungen
- spätere Aktionen verursachen direkten Lebensverlust

Hunger ist also nicht nur Flavor, sondern ein echter Zeitdruck- und Anti-Stall-Mechanismus.

## Türen

Türen sind ein aktives Taktiksystem, nicht nur Dekoration.

Aktuell gibt es:

- normale Türen
- verschlossene Farbtüren

Normale Türen:

- öffnen sich beim Hineinlaufen automatisch
- können unter bestimmten Bedingungen wieder geschlossen werden

Geschlossene Türen beeinflussen:

- Bewegung
- Sicht
- Wegführung
- Verfolgung durch Gegner

Das erlaubt Mikro-Entscheidungen im Raumkampf und bei Flucht-/Kontrollsituationen.

## Schlüssel und verschlossene Türen

Schlüssel sind farbcodiert und an die aktuelle Ebene gebunden.

Logik:

- ein passender Schlüssel kann eine verschlossene Tür beim Kontakt öffnen
- die Tür wird danach zu einer normalen offenen Tür
- der Schlüssel wird verbraucht
- ein Schlüssel von einer anderen Ebene bleibt zwar im Inventar, öffnet die Tür aber nicht

Das verhindert triviales Horten über mehrere Floors und hält verschlossene Räume als lokale Belohnungsstruktur relevant.

## Truhen

Truhen sind ein zusätzlicher Loot-Kanal. Sie können nutzbare Belohnungen enthalten, etwa:

- Waffen
- Schilde
- sonstige wertige Items

Sie erhöhen die Attraktivität von Nebenräumen und verstärken die Entscheidung zwischen sicherem Fortschritt und zusätzlichem Risiko.

## Fallen

Das Spiel enthält mehrere Fallenarten, die räumliche Unsicherheit erzeugen. Relevante Eigenschaften sind:

- Sichtbarkeit
- Trigger-Typ
- Reset-/Verbrauchsverhalten
- Effekt auf Spieler und/oder Gegner

Beispiele aus der aktuellen Logik:

- Bodenfallen verursachen Schaden beim Betreten
- Alarmfallen alarmieren Gegner in der Nähe
- sichtbare Gefahren können Schaden verursachen, solange eine Figur darauf verbleibt
- verbrauchte Single-Use-Fallen wechseln in einen konsumierten Zustand

Fallen treffen nicht nur den Spieler; je nach Konfiguration können auch Gegner betroffen sein.

## Showcases und Props

Showcases sind thematische Raumobjekte mit mechanischer Bedeutung.

Sie:

- blockieren Bewegung
- dürfen keine unlösbaren Karten erzeugen
- erzeugen beim Betreten des Raums gelegentlich Ambience-Text
- können sichere Heilungssituationen beeinflussen bzw. beschleunigen

Damit sind sie sowohl Weltgestaltung als auch leichtes Systemobjekt.

## Regeneration und sichere Phasen

Das Spiel kennt neben Heiltränken auch passive Heilungslogiken.

Aktueller Stand:

- der Spieler kann in sicheren Situationen langsam regenerieren
- Warten oder Bewegung kann Heilung auslösen, wenn keine unmittelbare Bedrohung besteht
- bestimmte Raum-/Showcase-Kontexte können diese sichere Heilung verstärken

Diese Mechanik sorgt dafür, dass Rückzug und Positionskontrolle relevant bleiben, ohne Tränke vollständig zu ersetzen.

## Erfahrung und Level-Ups

Gegner geben Erfahrung. Mit genug XP steigt der Spieler im Level.

Level-Ups gewähren aktuell:

- mehr maximales Leben
- je nach Level zusätzliche Attributssteigerungen
- vollständige Heilung

Damit ist Fortschritt nicht rein itembasiert. Ein guter Lauf skaliert über:

- Charakterwerte
- besseres Equipment
- bessere Ressourcenlage

## Run-Statistiken und Tod

Während und nach dem Lauf werden verschiedene Werte verfolgt, darunter:

- aktuelle und tiefste Ebene
- Kills
- Schaden ausgeteilt / erhalten
- XP
- konsumierte Tränke und Nahrung
- geöffnete Truhen

Beim Tod:

- öffnet sich ein Todes-Modal
- die Todesursache wird angezeigt
- besiegte Gegner können separat eingesehen werden
- ein Highscore-Eintrag kann gespeichert werden

## Highscores

Highscores werden lokal gespeichert. Der Score ist an die Leistung des Laufs gekoppelt, insbesondere an Fortschritt und Überleben.

Wichtige Eigenschaften:

- Speicherung in `localStorage`
- Top-Liste mit Begrenzung
- neuer Eintrag kann auch außerhalb der finalen Wertung landen
- letzter Eintrag wird markiert, sofern er in der Wertung verbleibt

Die Highscore-Tabelle ist damit eher ein lokales Archiv als ein globales Online-System.

## Save/Load

Zusätzlich zur Run-Logik gibt es ein manuelles Save/Load-System.

Aktuelles Verhalten:

- Spielstand kann aus den Optionen gespeichert werden
- kompatible Saves können vom Startscreen wieder geladen werden
- inkompatible Save-Versionen werden abgefangen und mit klarer Meldung abgelehnt

Das unterstützt längere Test- und Spielsessions, ohne den Rogue-like-Charakter als Grundstruktur aufzugeben.

## Audio- und Komfortoptionen

Es gibt bereits einfache Optionen, unter anderem:

- Schrittgeräusche an/aus
- Todesgeräusch an/aus

Diese Einstellungen werden lokal persistiert.

## Testlogik und Gameplay-Grenze

Für die E2E-Suite existiert eine Test-API. Sie kann Dinge wie:

- Gegner setzen
- Items platzieren
- Spieler teleportieren
- Zufallssequenzen kontrollieren

Wichtig für das Designverständnis:

- Diese API gehört zur Testinfrastruktur
- sie soll im normalen Produktivpfad standardmäßig nicht offen sichtbar sein
- Tests aktivieren sie gezielt per lokalem Flag

## Zusammenfassung des aktuellen Design-Schwerpunkts

Die aktuelle Spielmechanik kombiniert vier Hauptachsen:

- taktische Nahkampfentscheidungen
- Ressourcendruck über HP, Nahrung und Inventar
- räumliche Kontrolle über Türen, Schlüssel, Fallen und Sicht
- Run-Fortschritt über tiefer werdende Ebenen, XP und stärkeres Equipment

Der Charakter des Spiels ist damit momentan weniger ein klassischer reiner Brawler und mehr ein System-Rogue-like mit Fokus auf:

- Positionierung
- Risikoabwägung
- kontrollierten Power-Spikes durch Loot
- stetigem Druck durch Hunger und Dungeon-Fortschritt
