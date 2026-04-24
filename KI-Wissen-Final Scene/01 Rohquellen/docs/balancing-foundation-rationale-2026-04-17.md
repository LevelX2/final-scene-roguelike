# The Final Scene: Leitgedanke hinter den Vereinheitlichungen fuer zentrales Balancing

## Zweck dieses Dokuments

Dieses Dokument beschreibt nicht im Detail jede einzelne Codeaenderung, sondern den
Grundgedanken, der die juengsten Umbauten am Kampf-, Gegner-, Item- und
Progressionssystem geleitet hat.

Es soll als gemeinsame Bezugsgrundlage dienen fuer die weitere Diskussion ueber:

- einen spaeteren zentralen Balancing-Bereich
- einen Simulations- und Testscreen
- gruppenbasierte globale oder partielle Regler

Der Kernpunkt war dabei nie, sofort ein Balancing-UI zu bauen, sondern zuerst den
Unterbau so zu ordnen, dass Balancing ueberhaupt systemisch und belastbar moeglich
wird.

## Ausgangsproblem

Der vorherige Stand hatte bereits viele gute Inhalte und zahlreiche brauchbare Daten,
aber die fuer Balancing relevanten Werte und Regeln waren an mehreren Stellen zu stark
vermischt.

Typische Probleme waren:

- wichtige Werte wurden an verschiedenen Stellen direkt gelesen oder direkt veraendert
- dieselbe Art von Wirkung existierte teilweise in mehreren Repräsentationen
- Gegner und Items waren zwar teilweise gruppierbar, aber diese Gruppen waren nicht
  ueberall explizit im Runtime-Modell vorhanden
- einige Systeme waren datengetrieben, andere durch verstreute Sonderregeln gepraegt
- Progression, Equipment, Status und situative Einfluesse waren nicht sauber
  getrennt

Das fuehrt bei spaeterem Balancing fast immer zu demselben Problem:

Eine Aenderung an einem Wert ist nicht automatisch eine Aenderung am System.
Stattdessen muss man erraten, welche weiteren Stellen davon noch betroffen sind oder
welche anderen Pfade denselben Wert auf andere Weise erzeugen.

## Grundannahme der Umbauschritte

Die leitende Annahme hinter den Umbauten war:

Zentrales Balancing funktioniert nur dann gut, wenn relevante Kampfkraft,
Progression, Itemwirkung und Gegnerverhalten aus moeglichst wenigen klaren
Ableitungsschichten hervorgehen.

Anders gesagt:

Nicht der Balancing-Regler ist der erste wichtige Schritt, sondern die Frage, ob das
Spiel bereits in einer Form beschrieben ist, in der man Gruppen und Werte konsistent
ansprechen kann.

## Der eigentliche Leitgedanke

Die Umbauten folgten vier einfachen Prinzipien.

### 1. Werte sollen abgeleitet werden, nicht zufaellig anfallen

Spielrelevante Werte sollen moeglichst nicht mehr als verstreute Rohdaten mit
gelegentlichen Direktmutationen existieren, sondern als Ergebnis nachvollziehbarer
Schichten.

Die relevante Trennung ist:

- Basiswerte
- Progression
- Equipment
- Status
- situative Modifikationen
- abgeleitete Endwerte

Der Gedanke dahinter:

Wenn zwei Systeme denselben Begriff benutzen, zum Beispiel `Praezision`,
`Blockchance` oder `maxHp`, dann sollten sie auch dieselbe abgeleitete Quelle meinen.

### 2. Gruppen muessen Runtime-Eigenschaften sein, nicht nur implizite Kategorien

Fuer spaeteres gruppenbasiertes Balancing reicht es nicht, dass man theoretisch sagen
kann "das hier ist ein Hunter" oder "das ist eine Rare-Waffe".

Diese Gruppenzugehoerigkeit muss im aktiven Modell selbst sichtbar und stabil sein.

Deshalb war ein zentraler Leitgedanke:

- Gegner sollen klare Profilgruppen tragen
- Items sollen klare Balancegruppen tragen
- Snapshots und Testpfade sollen dieselbe Gruppensprache sprechen wie die Runtime

Nur dann kann ein spaeterer Regler wirklich sagen:

- alle `behavior:hunter`
- alle `variant:elite`
- alle `weapon-mod:control`
- alle `drop-source:locked-room-chest`
- alle `weapon:bare-hands`

ohne diese Gruppen jedes Mal neu aus Rohdaten herzuleiten.

### 3. Eine Wirkung braucht moeglichst nur eine kanonische Runtime-Form

Ein grosses Hindernis fuer spaeteres Balancing ist doppelte oder halb doppelte
Repräsentation.

Darum war ein wichtiger Umbaugedanke:

Wenn eine Waffenwirkung aktiv im Spiel existiert, dann soll sie moeglichst ueber eine
kanonische Runtime-Form lesbar sein und nicht parallel ueber mehrere lose
Nebenspuren.

Das gilt nicht nur fuer Waffenwirkungen, sondern ganz allgemein fuer:

- Status
- Modifier
- Proc-Effekte
- Blocksonderfaelle
- Progressionsboni

Das Ziel ist nicht absolute theoretische Reinheit, sondern praktische Eindeutigkeit:

Wenn man wissen will, warum etwas einen bestimmten Wert oder Effekt hat, soll diese
Antwort aus einer klaren Pipeline kommen.

### 4. Sonderfaelle sollen erkennbar begrenzt bleiben

Nicht jeder Sonderfall ist schlecht. Einige ikonische oder inhaltlich gewollte
Ausnahmen gehoeren zum Spiel.

Problematisch sind Sonderfaelle erst dann, wenn sie still in normale Systeme
eingreifen und dort globale Justierbarkeit unterlaufen.

Deshalb war der Leitgedanke nicht:

"Alle Sonderfaelle entfernen."

Sondern:

"Sonderfaelle nur dort behalten, wo sie bewusst erkennbar und systemisch eingehegt
sind."

Das war unter anderem der Gedanke hinter:

- studioabhaengigen Legacy-Sonderpools statt unsichtbarer Mischstruktur
- expliziten Gegnerprofilen statt verstreuten Hartschaltern
- expliziten Itemgruppen statt nur losem Templatewissen

## Was die Umbauten deshalb konkret erreichen sollten

Aus diesem Leitgedanken ergaben sich vier praktische Zielbilder.

### A. Ein spaeterer Balancing-Regler soll auf Gruppen statt auf Einzelfaelle gehen koennen

Die Umbauten sollten die Grundlage dafuer schaffen, dass ein spaeteres System nicht
nur ein einzelnes Monster oder eine einzelne Waffe anfassen kann, sondern ganze
Gruppen.

Beispiele:

- Gegner nach Verhalten
- Gegner nach Variantentier
- Gegner nach Rangband
- Waffen nach Profil oder Handedness
- Schilde nach Mod-Cluster
- Loot nach Quelle

### B. Simulationsdaten sollen dieselbe Sprache sprechen wie das Spiel selbst

Ein Test- oder Simulationsscreen bringt wenig, wenn er sich seine Gruppen und Werte
anders zusammensuchen muss als die eigentliche Runtime.

Darum war ein wichtiges Ziel:

Die Test- und Snapshotseite soll dieselben Gruppen und dieselben abgeleiteten
Grundlagen sehen wie das aktive Spiel.

### C. Justierungen sollen moeglichst additiv oder prozentual an klaren Stellen ansetzen

Ein spaeteres Balancing-System wird viel einfacher, wenn Aenderungen an plausiblen
Achsen andocken koennen, zum Beispiel:

- Trefferwert
- Kritchance
- Blockchance
- Heilprofil
- Aggroreichweite
- Dropgewichte
- Rarity-Gewichte
- Progressionsboni

Damit das moeglich ist, mussten diese Achsen erst einmal in der Logik als
zusammenhaengende Achsen erkennbar werden.

### D. Inhalte sollen erhalten bleiben, auch wenn ihre technische Einbindung sauberer wird

Ein wichtiger inhaltlicher Leitgedanke war auch, ikonische Inhalte nicht einfach
wegzurationalisieren.

Das ist besonders bei den Legacy-Gegnern relevant:

Das Ziel war nicht, alte Inhalte zu verwerfen, sondern sie in eine sauberere,
studioabhaengige und spaeter besser justierbare Struktur einzubinden.

## Warum diese Richtung wichtig ist

Ohne diese Vereinheitlichung laeuft ein spaeteres Balancing fast immer in drei
Probleme:

- Regler wirken nicht zuverlaessig global
- dieselbe Aenderung muss an mehreren Stellen nachgezogen werden
- Simulation und Runtime driften auseinander

Mit der jetzigen Richtung wird stattdessen angestrebt:

- ein gemeinsames Vokabular fuer Werte
- ein gemeinsames Vokabular fuer Gruppen
- eine moeglichst nachvollziehbare Runtime-Ableitung
- klarere Grenzen zwischen Inhalt, Regel und Justierung

## Zusammenfassung in einem Satz

Der Grundgedanke hinter den Aenderungen war, `The Final Scene` von einer Sammlung
vieler einzelner, teils guten, aber teils verstreuten Spielregeln in Richtung eines
sauber gruppierbaren und aus wenigen Pipelines ableitbaren Systems zu verschieben,
damit spaeteres zentrales Balancing und Simulation nicht nur moeglich, sondern
zuverlaessig und praktisch wartbar werden.

