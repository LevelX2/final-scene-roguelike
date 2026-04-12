# JS-Architekturbericht

## Ziel der Analyse

Dieses Dokument bewertet die aktuelle Struktur der JavaScript-Module und beschreibt ein Zielbild, das fuer deutlich mehr Features, mehr Tests und geringere Aenderungskosten ausgelegt ist. Es werden bewusst keine Produktivdateien geaendert; der Fokus liegt auf einer belastbaren, schrittweise umsetzbaren Architektur.

## Kurzfazit

Die Codebasis ist bereits in mehrere Module getrennt, aber die eigentliche Steuerung liegt noch zu stark in wenigen grossen Dateien. Besonders `src/main_v2.mjs`, `src/data.mjs` und `src/dungeon.mjs` sind aktuell zentrale Engpaesse. Fuer ein wachsendes Projekt ist das groesste Risiko nicht fehlende Funktionalitaet, sondern dass neue Features immer wieder an denselben "God Modules" andocken und dadurch Kopplung, Seiteneffekte und Testaufwand schnell steigen.

Das beste naechste Design ist kein kompletter Rewrite, sondern eine modulare Zielstruktur mit:

- einem kleinen App-Bootstrap
- einer zentralen Game-Engine bzw. Orchestrierung
- klar getrennten Domainen fuer `player`, `combat`, `dungeon`, `items`, `progression`, `traps`, `savegame`
- einer strikten Trennung zwischen `domain`, `application`, `ui` und `infrastructure`
- einem einzigen aktiven Runtime-Pfad ohne `*_v2`-Parallelwelt

## Beobachtungen im Ist-Zustand

### 1. `main_v2.mjs` ist zu gross und traegt zu viele Verantwortungen

`src/main_v2.mjs` ist mit rund 67 KB die dominante Datei und vereint derzeit unter anderem:

- Bootstrapping und Initialisierung
- globale Zustandskoordination
- Audio
- UI-Modalsteuerung
- Input-Handling
- Sichtlinien- und Sichtbarkeitslogik
- Floor-Wechsel
- Inventar- und Choice-Flow
- Speicherung/Laden-Ansteuerung
- Rendering-Orchestrierung
- Glue-Code fuer Tests

Das ist fuer einen Prototypen tragbar, fuer ein wachsendes Spiel aber der zentrale Skalierungsbremser. Jede neue Funktion landet mit hoher Wahrscheinlichkeit wieder in derselben Datei und vergroessert die implizite Kopplung weiter.

### 2. Es gibt weiterhin parallele Modulwelten

Im Repository existieren noch:

- `main.mjs` und `main_v2.mjs`
- `dom.mjs` und `dom_v2.mjs`
- `render.mjs` und `render_v2.mjs`
- `state.mjs` und `state_v2.mjs`

Die aktive Laufzeit nutzt bereits die `*_v2`-Dateien, die Legacy-Dateien liegen aber weiterhin direkt neben den aktiven Modulen. Das ist fuer Orientierung, Suche, Onboarding und Refactoring unguenstig. Je mehr Features dazukommen, desto hoeher ist die Gefahr, dass versehentlich am falschen Pfad gearbeitet wird.

### 3. `data.mjs` ist ein stark gekoppeltes Sammelbecken

`src/data.mjs` ist mit rund 53 KB sehr gross und enthaelt gemischt:

- technische Konstanten
- Spielfeld- und Tile-Konstanten
- Monsterkatalog
- Waffen- und Schilddaten
- Props/Ambience-Daten

Funktional ist das praktisch die gesamte statische Weltdefinition in einer Datei. Das erschwert:

- gezielte Erweiterungen pro Feature
- Wiederverwendung in isolierten Tests
- spaetere Datenmigration in JSON/Content-Dateien
- Ownership pro Domane

### 4. `dungeon.mjs` vermischt Generator, Spawning und Entitaetsfabriken

`src/dungeon.mjs` ist ebenfalls sehr gross und kombiniert mehrere Ebenen:

- Dungeon-Layout / Floor-Erzeugung
- Gegnererzeugung und Skalierung
- Drop-/Loot-Integration
- Tueren, Schluessel, Showcase-Objekte
- Waffen-/Offhand-/Food-Pickups

Das Modul ist damit gleichzeitig Generator, Factory, Balance-Konsument und Floor-Kompositionsschicht. Fuer spaetere Features wie neue Raumtypen, Sonderevents, Biome, Bossfloors oder skriptbare Raumregeln ist diese Zusammenlegung zu eng.

### 5. UI und Domain sind noch nicht sauber getrennt

Mehrere Module arbeiten direkt mit HTML, DOM oder UI-Texten, obwohl sie teilweise eher Fachlogik enthalten. Beispiele:

- `render_v2.mjs` enthaelt UI- und View-Logik, aber auch Teile der Statusberechnung fuer Topbar/Tooltips
- `items.mjs` baut HTML fuer Vergleichsfenster und enthaelt gleichzeitig Inventar- und Equip-Logik
- `main_v2.mjs` steuert Modals, Eingaben und Spiellogik in einem Fluss

Das fuehrt dazu, dass ein Fach-Feature oft automatisch auch ein UI-Refactoring braucht, obwohl das fachlich gar nicht noetig waere.

### 6. Der Context-Factory-Stil ist gut, aber aktuell zu zentral gesteuert

Positiv ist: mehrere Module folgen bereits dem Muster `createXApi(context)`. Das ist ein guter Ausgangspunkt fuer Modularisierung. Im Moment wird dieses Muster aber vor allem genutzt, um ein sehr grosses Orchestrator-Modul zusammenzuhalten. Das Ergebnis ist:

- viele implizite Abhaengigkeiten im `context`
- erschwerte Lesbarkeit, weil APIs nicht klar nach Schichten getrennt sind
- hoher Aufwand beim Nachvollziehen, wer wen wirklich braucht

Das Muster sollte behalten, aber strikter organisiert werden.

### 7. Testbarkeit ist vorhanden, aber stark an Runtime-Interna gekoppelt

`src/test-api.mjs` ist hilfreich fuer E2E-Tests. Gleichzeitig greift es tief in den Laufzeitzustand ein und haengt an vielen runtime-nahen Funktionen. Fuer langfristige Skalierung sollte Testbarkeit mehr ueber stabile Application-Services und weniger ueber eine grosse globale Test-API laufen.

## Hauptprobleme fuer zukuenftige Erweiterungen

Wenn das Projekt viele neue Funktionen bekommen soll, sind die groessten Risiken:

- neue Features werden immer wieder in `main_v2.mjs` eingebaut
- Feature-Code wird zugleich UI-Code, State-Mutation und Regelwerk enthalten
- Content-Wachstum landet weiter in `data.mjs`
- Erweiterungen im Dungeon-System erzeugen Querabhaengigkeiten zu Loot, Gegnern und Balance
- Testabdeckung wird schwerer, weil Fachlogik nicht isoliert genug ansprechbar ist

## Empfohlenes Zielbild

Empfohlen wird eine hybride Struktur aus Schichten und Features. Nicht rein technisch nach "utils/render/state", sondern mit fachlichen Grenzen.

### Zielstruktur

```text
src/
  app/
    bootstrap.mjs
    game-app.mjs
    service-registry.mjs

  application/
    game-loop/
      game-loop-service.mjs
      turn-service.mjs
      input-controller.mjs
    run/
      start-run-service.mjs
      restart-run-service.mjs
      floor-transition-service.mjs
    savegame/
      savegame-service.mjs
      profile-service.mjs
      highscore-service.mjs

  domain/
    player/
      player-model.mjs
      player-rules.mjs
      hunger-rules.mjs
      progression-rules.mjs
    combat/
      combat-service.mjs
      hit-rules.mjs
      block-rules.mjs
    dungeon/
      dungeon-generator.mjs
      floor-factory.mjs
      room-generator.mjs
      visibility-service.mjs
      door-service.mjs
    enemies/
      enemy-factory.mjs
      ai-service.mjs
      enemy-balance.mjs
    items/
      item-factory.mjs
      equipment-service.mjs
      loot-service.mjs
      itemization-service.mjs
    traps/
      trap-factory.mjs
      trap-service.mjs
    shared/
      random-service.mjs
      grid-utils.mjs
      math-utils.mjs

  content/
    balance/
      combat-balance.mjs
      progression-balance.mjs
      dungeon-balance.mjs
    catalogs/
      monsters.mjs
      weapons.mjs
      shields.mjs
      props.mjs
      hero-classes.mjs

  ui/
    dom/
      dom-refs.mjs
      dom-query.mjs
    views/
      board-view.mjs
      hud-view.mjs
      inventory-view.mjs
      modal-view.mjs
      log-view.mjs
      run-stats-view.mjs
    presenters/
      player-presenter.mjs
      enemy-presenter.mjs
      inventory-presenter.mjs
      tooltip-presenter.mjs

  infrastructure/
    storage/
      local-storage-adapter.mjs
    audio/
      audio-service.mjs
    test/
      test-api.mjs
```

## Architekturprinzipien fuer dieses Projekt

### 1. Ein Feature soll genau einen primaeren Einstieg haben

Beispiel: "Schluessel und verschlossene Tueren" sollte nicht gleichzeitig in `main`, `dungeon`, `render`, `state` und `ai` lose verteilt wachsen. Stattdessen ein klares Zuhause, z. B. `domain/dungeon/door-service.mjs`, plus UI-Darstellung in `ui/views/...`.

### 2. Domain-Logik darf kein HTML erzeugen

HTML-Strings, `document.createElement`, Tooltip-Markup und Modal-Textzusammenbau sollten in die UI-Schicht. Domain-Module sollten Datenmodelle oder View-Model-Daten liefern, keine Markup-Fragmente.

### 3. Content und Regeln trennen

Aktuell sind Balancing, Content und Laufzeitregeln teilweise eng gekoppelt. Besser:

- Content: Was existiert? Monster, Waffen, Props, Klassen
- Rules: Wie verhaelt es sich? Schaden, XP, Hunger, Block, Spawnregeln
- Application: Wann wird welche Regel im Spielfluss aufgerufen?

### 4. State-Mutationen zentralisieren

Statt dass viele Module frei auf den State schreiben, sollte es klare Services fuer:

- Turn-Fortschritt
- Inventar- und Equip-Aenderungen
- Floor-Wechsel
- Save/Load
- Modal-/UI-State

geben. Das senkt Seiteneffekte und macht Tests deutlich robuster.

### 5. Einen klaren aktiven Codepfad herstellen

Die Legacy-Varianten sollten nicht dauerhaft gleichrangig im aktiven `src/` liegen bleiben. Fuer langfristige Pflege ist besser:

- nur ein aktiver Einstieg
- Legacy-Dateien entweder in `src/legacy/` verschieben oder spaeter entfernen
- keine neuen Features mehr in Legacy-Dateien

## Konkrete Modulzuschnitte

### App-/Bootstrap-Schicht

`bootstrap.mjs` sollte nur:

- Services instanziieren
- Abhaengigkeiten verdrahten
- UI-Controller starten
- den ersten Render ausloesen

Diese Datei sollte klein bleiben. Zielgroesse: eher 100-250 Zeilen statt mehrere tausend.

### Application-Schicht

Hier liegt der Spielfluss:

- Start eines Laufs
- Laden/Speichern
- Ende eines Zugs
- Wechsel zwischen Etagen
- Reaktion auf Input-Events

Die Application-Schicht darf Domain-Services aufrufen, aber keine grossen HTML-Details kennen.

### Domain-Schicht

Hier liegt die eigentliche Spiellogik:

- Kampfregeln
- Hunger/Nahrung
- Loot- und Item-Regeln
- Gegnerverhalten
- Dungeon-Erzeugung
- Fallenverhalten

Diese Schicht sollte browserarm oder browserfrei sein. Das verbessert Testbarkeit massiv.

### UI-Schicht

Die UI-Schicht soll nur praesentieren:

- DOM-Refs
- Event-Bindings
- Rendern
- Modals
- Tooltips
- Formatierung fuer den Bildschirm

Die UI sollte moeglichst View-Models konsumieren, nicht rohe Spiellogik neu berechnen.

### Infrastructure-Schicht

Alles mit externen APIs oder Umgebungsdetails:

- `localStorage`
- AudioContext
- globale `window`-Test-Hooks

So bleibt der Rest der Codebasis sauberer und einfacher ersetzbar.

## Empfohlene erste Bereinigungen

Diese Schritte bringen viel Nutzen bei relativ wenig Risiko:

1. `main_v2.mjs` in kleinere Application- und UI-Module aufteilen.
2. `data.mjs` in mehrere Katalog- und Balance-Dateien aufspalten.
3. `dungeon.mjs` trennen in Generator, Enemy-Factory, Pickup-Factory und Door-/Floor-Services.
4. `items.mjs` aufspalten in Fachlogik und UI-Praesentation.
5. `render_v2.mjs` in mehrere Views/Presenter zerlegen.
6. Legacy-Dateien in einen klar markierten `legacy`-Pfad verschieben.

## Sinnvolle Migrationsreihenfolge

### Phase 1: Strukturelle Entlastung ohne Gameplay-Aenderung

- neuen Ordnerzuschnitt anlegen
- `main_v2.mjs` nur organisatorisch zerlegen
- `audio`, `input`, `modals`, `save/load`, `visibility` auslagern
- `data.mjs` in kleinere Dateien zerlegen, Exporte kompatibel halten

### Phase 2: Domain sauber schneiden

- Kampfregeln aus `combat.mjs` und Teilen von `main_v2.mjs` zusammenziehen
- Inventar-/Equip-Regeln aus `items.mjs` von UI entkoppeln
- Dungeon-Erzeugung in Fabriken und Generatoren aufteilen
- Trap- und Door-Logik als eigenstaendige Services stabilisieren

### Phase 3: UI entkoppeln

- `render_v2.mjs` in mehrere Views zerlegen
- Presenters einfuehren, damit UI nur formatierte Daten anzeigt
- Modals und Tooltip-System standardisieren

### Phase 4: Teststrategie verbessern

- Domain-Services mit gezielten Unit-Tests testen
- E2E-Tests fuer echte User-Flows behalten
- `test-api.mjs` kleiner und stabiler machen, eher ueber Services als ueber rohe State-Manipulation

## Designentscheidung: Feature-first oder Layer-first?

Fuer dieses Projekt empfehle ich eine hybride Struktur, aber mit fachlicher Prioritaet. Rein technische Ordner wie nur `utils`, `render`, `state`, `helpers` skalieren bei Spielen meist schlechter, weil Features ueberall verteilt werden. Reine Feature-Ordner koennen dagegen gemeinsame Infrastruktur zu sehr duplizieren. Die vorgeschlagene Mischung loest das:

- Fachlogik unter `domain/`
- Spielfluss unter `application/`
- Darstellung unter `ui/`
- externe Adapter unter `infrastructure/`
- statische Spielinhalte unter `content/`

Das ist fuer ein wachsendes Spiel meist der beste Kompromiss aus Klarheit, Testbarkeit und Erweiterbarkeit.

## Was ich nicht empfehlen wuerde

- kein kompletter Rewrite auf einmal
- keine weitere dauerhafte Pflege von Alt- und Neu-Pfad parallel
- keine neuen Sammeldateien wie `game-utils.mjs` oder `game-data.mjs`
- keine Vermischung von HTML-Erzeugung mit Inventar-, Kampf- oder Dungeon-Regeln
- keine "globale Kontextobjekt"-Ausweitung ohne klare Schnittstellen pro Schicht

## Priorisierte Empfehlung

Wenn nur eine einzige grobe Richtung umgesetzt werden soll, dann diese:

`main_v2.mjs` zu einem kleinen Bootstrap machen und den Rest in klar geschnittene Services und Views verschieben.

Das haette den groessten langfristigen Hebel, weil dadurch neue Features nicht mehr automatisch in einem zentralen Monster-Modul landen. Direkt danach ist die Zerlegung von `data.mjs` der zweitgroesste Gewinn.

## Erwarteter Nutzen nach der Bereinigung

- neue Features lassen sich mit geringerem Kollisionsrisiko ergaenzen
- Verantwortlichkeiten pro Datei werden klarer
- Onboarding wird einfacher
- Refactorings werden billiger
- Unit-Tests fuer Spiellogik werden realistischer
- UI-Aenderungen greifen seltener in Fachlogik ein
- Content-Wachstum bleibt beherrschbar

## Abschlussbewertung

Die aktuelle Basis ist fuer den vorhandenen Umfang bereits ordentlich modularisiert, aber sie steht an einem typischen Kipppunkt: Das Projekt ist zu gross fuer einen starken Zentralfile-Ansatz, aber noch klein genug, um mit einer kontrollierten Umstrukturierung sehr gut in eine skalierbare Architektur ueberfuehrt zu werden.

Die sinnvollste Strategie ist deshalb keine radikale Neuerfindung, sondern eine schrittweise Entkopplung entlang fachlicher Grenzen, bis `main_v2.mjs`, `data.mjs` und `dungeon.mjs` nur noch koordinieren statt dominieren.

## Konkrete erste Schritte als Empfehlung

Die ersten Schritte sollten so gewaehlt werden, dass sie die Struktur verbessern, aber moeglichst wenig Gameplay-Risiko erzeugen. Sinnvoll ist daher, zuerst organisatorische Grenzen zu schaerfen, bevor Kernregeln umgebaut werden.

### Empfehlung 1: Einen eindeutigen aktiven Pfad festlegen

Als erstes sollte die aktive Codebasis klar abgegrenzt werden. Solange Legacy-Dateien und aktive Dateien direkt nebeneinander liegen, bleibt jede weitere Modularisierung unnoetig verwirrend.

Empfohlene erste Aktion:

- die Dateien `main.mjs`, `dom.mjs`, `render.mjs` und `state.mjs` in einen klar markierten `src/legacy/`-Ordner verschieben oder zumindest fuer die naechste Refactoring-Phase logisch aus dem Hauptpfad herausnehmen
- im aktiven Code nur noch `*_v2` als Arbeitsbasis behandeln
- danach mittelfristig die `*_v2`-Namen selbst wieder auf normale Modulnamen zurueckfuehren

Warum zuerst:

- sofort bessere Orientierung
- geringes fachliches Risiko
- verhindert, dass neue Features versehentlich im falschen Pfad landen

### Empfehlung 2: `main_v2.mjs` zuerst nur organisatorisch entlasten

Der wichtigste praktische Start ist nicht sofort ein tiefer Domain-Umbau, sondern das Herausziehen offensichtlicher Verantwortungsbloecke aus `main_v2.mjs`.

Als erste Extraktionen eignen sich besonders:

- `audio-service.mjs`
- `input-controller.mjs`
- `modal-controller.mjs`
- `visibility-service.mjs`
- `floor-transition-service.mjs`

Warum genau diese Reihenfolge:

- sie sind funktional gut erkennbar
- sie haben relativ klare Ein- und Ausgaenge
- sie reduzieren die Groesse von `main_v2.mjs` schnell
- sie veraendern das Balancing und Kern-Gameplay kaum

Ziel fuer diesen Schritt:

- `main_v2.mjs` wird zum Orchestrator
- es bleibt sichtbar, welche Subsysteme es gibt
- neue Features muessen nicht mehr automatisch in die Hauptdatei

### Empfehlung 3: `data.mjs` als naechstes aufteilen

Wenn das Projekt wachsen soll, wird `data.mjs` sonst sehr schnell zum zweiten Engpass. Die Datei sollte frueh in fachliche Datenquellen zerlegt werden.

Sinnvolle erste Aufteilung:

- `content/catalogs/monsters.mjs`
- `content/catalogs/weapons.mjs`
- `content/catalogs/shields.mjs`
- `content/catalogs/props.mjs`
- `content/catalogs/hero-classes.mjs`
- `content/balance/combat-balance.mjs`
- `content/balance/dungeon-balance.mjs`
- `content/balance/progression-balance.mjs`

Warum frueh:

- kuenftige Content-Erweiterungen werden leichter
- Merge-Konflikte sinken
- Tests koennen gezielter nur Teilbereiche importieren

### Empfehlung 4: Inventar- und Equip-Logik von UI trennen

`items.mjs` ist ein guter Kandidat fuer den ersten echten Domänenschnitt, weil dort Fachlogik und Darstellung aktuell eng zusammenliegen. Gerade bei kuenftigen Features wie mehr Itemtypen, Crafting, Sets, Effekten oder Shops wuerde diese Kopplung schnell teuer werden.

Sinnvolle Trennung:

- Fachlogik in z. B. `equipment-service.mjs` oder `inventory-service.mjs`
- UI-Formatierung und Vergleichsdarstellung in `inventory-view.mjs` oder `item-presenter.mjs`

Warum das ein guter frueher Schritt ist:

- klarer Nutzen fuer Erweiterbarkeit
- relativ begrenzter Ausschnitt
- gute Vorarbeit fuer spaetere neue Itemsysteme

### Empfehlung 5: Rendering nicht als einen Block weiterwachsen lassen

`render_v2.mjs` sollte nicht der naechste grosse Sammelpunkt werden. Noch bevor neue groessere UI-Features dazukommen, sollte das Rendering in mehrere Views zerlegt werden.

Sinnvolle erste Zerlegung:

- `board-view.mjs`
- `hud-view.mjs`
- `inventory-view.mjs`
- `log-view.mjs`
- `modal-view.mjs`
- `tooltip-view.mjs`

Warum wichtig:

- UI-Aenderungen bleiben lokal
- neue Fenster, Panels und Widgets lassen sich sauber ergaenzen
- Rendering-Fehler werden einfacher zu isolieren

### Empfehlung 6: Danach erst `dungeon.mjs` fachlich schneiden

`dungeon.mjs` ist zwar einer der groessten Brocken, aber nicht der beste allererste Umbau. Wenn vorher `main_v2.mjs` und die Daten-/UI-Struktur entlastet wurden, wird die Zerlegung von `dungeon.mjs` deutlich sauberer.

Empfohlene Zieltrennung:

- `dungeon-generator.mjs`
- `floor-factory.mjs`
- `enemy-factory.mjs`
- `pickup-factory.mjs`
- `door-service.mjs`

Warum nicht als Schritt 1:

- die Datei haengt fachlich an vielen Systemen
- ein zu frueher Umbau erzeugt hohes Regressionsrisiko
- nach den ersten Strukturverbesserungen ist klarer, welche Grenzen wirklich stabil sind

## Empfohlene Reihenfolge fuer die ersten 4-6 Arbeitspakete

Wenn man daraus einen realistischen Startplan ableitet, waere diese Reihenfolge am sinnvollsten:

1. Legacy-Pfad sauber abtrennen und aktiven Pfad dokumentieren.
2. `main_v2.mjs` in organisatorische Submodule zerlegen, ohne Gameplay zu aendern.
3. `data.mjs` in Katalog- und Balance-Dateien aufteilen.
4. `render_v2.mjs` in mehrere Views/Presenter zerlegen.
5. `items.mjs` in Fachlogik und UI trennen.
6. `dungeon.mjs` in Generatoren, Factories und Services aufspalten.

## Kleinster sinnvoller Start

Falls nur ein sehr kleiner erster Umbau gemacht werden soll, dann waere diese Kombination am wirkungsvollsten:

- Legacy-Dateien aus dem aktiven Pfad herausziehen
- `main_v2.mjs` um `audio`, `input` und `modals` erleichtern

Das ist wahrscheinlich der beste Einstieg, weil er sofort Struktur verbessert, ohne dass das Spielsystem selbst bereits tief umgebaut werden muss.
