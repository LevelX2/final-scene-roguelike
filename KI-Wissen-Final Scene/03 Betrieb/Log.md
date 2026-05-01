# Log

## [2026-04-24] fix | Client-Startskript oeffnet vorhandenen lokalen Server statt mit EADDRINUSE zu scheitern
- Anlass oder Quelle: Nutzerwunsch, den lokalen Client ueber eine Run-Aktion starten zu koennen, ohne bei bereits laufendem App-Server auf Port `4173` sofort in `EADDRINUSE` zu laufen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
  - `README.md`
  - `package.json`
  - `scripts/start-client.mjs`
- Kern der inhaltlichen Anpassung:
  - Neues Skript `npm run start:client` eingefuehrt, das zuerst prueft, ob `The Final Scene` bereits auf `127.0.0.1:4173` antwortet.
  - Wenn der passende Server schon laeuft, wird nur die Client-URL ausgegeben statt erneut `start:app` zu starten.
  - Wenn noch kein passender Server laeuft, startet das Skript `npm run start:app`, wartet auf Erreichbarkeit und gibt danach die Client-URL aus.
  - Ein explizites `--open` oeffnet bei Bedarf weiterhin den Systembrowser, ist aber nicht mehr der Standardpfad fuer die Codex-App.
  - Wenn zwar ein Dienst auf `4173` antwortet, aber nicht `The Final Scene`, bricht das Skript mit einem klaren Port-Konflikt-Hinweis ab.

## [2026-04-24] update | Branch- und PR-Workflow fuer Mehrgeraetearbeit dokumentiert
- Anlass oder Quelle: Nutzerfrage nach der sinnvollen GitHub-Arbeitsweise für viele Kleinfixes und parallele Arbeit auf zwei Rechnern
- Neu angelegte Seiten:
  - [[../01 Rohquellen/repo-root/workspace-status-2026-04-24-branching]]
  - [[../02 Wissen/Prozesse/Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
- Kern der inhaltlichen Anpassung:
  - Einen verifizierten Git-Snapshot des Workspace- und Branch-Zustands vom 2026-04-24 als Rohquelle aufgenommen.
  - Als Prozesswissen festgehalten, dass neue Arbeit standardmäßig auf thematischen Branches entsteht und erst per Pull Request nach `main` gemerged wird.
  - Ergänzt, wie dieselbe Branch-Arbeit über GitHub zwischen zwei Rechnern synchronisiert werden soll und wie ein divergentes lokales `main` sicher zurückgeführt werden kann.
  - Den allgemeinen Arbeitsworkflow um einen direkten Verweis auf die neue Prozessseite ergänzt.

## [2026-04-23] fix | Struktur-Silhouetten decken wieder Raumaußenecken und Tür-Unterkanten ab
- Anlass oder Quelle: Nutzerfeedback, dass nach der Umstellung auf organisches FOV/Fog einzelne Strukturdetails optisch verschwinden, insbesondere eine Wandkante direkt unter einer sichtbaren Tür sowie sichtbare Außenecken von Räumen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Entscheidungen/Sichtkanten-Glaettung im Board-Rendering 2026-04-23]]
  - `src/application/visibility-service.mjs`
  - `tests/modules/visibility-service.test.mjs`
- Kern der inhaltlichen Anpassung:
  - Die Anzeige-Sicht `visible` erhält zusätzlich zu den orthogonal angrenzenden Strukturkacheln jetzt auch kontrollierte diagonale Strukturecken, wenn beide orthogonalen Stützkacheln ebenfalls Struktur sind.
  - Dadurch können echte Raumaußenecken im Sichtsaum wieder als Silhouette erscheinen, ohne dass daraus Gameplay-Sicht oder Fog-Geometrie wird.
  - Sichtbare Türsilhouetten dürfen ihre darunter oder darüber liegende Wandkante wieder mit anzeigen, sofern diese über eine echte Stützecke an die sichtbare Struktur angebunden ist.
  - Die Regel bleibt bewusst auf direkte Stützecken begrenzt und kettet nicht über bereits nur zur Anzeige aufgehellte Struktur weiter.
  - Verifiziert über neue Modultests für diagonale Struktur-Ecken und für die Wandkante unter einer sichtbaren Türsilhouette sowie über grünen Build- und Modul-Gesamtlauf.
  - Nachgeschärft, dass für echte Raumaußenecken auch bereits sichtbare Bodenkacheln als Stützkacheln genügen; zwei reine Strukturstützen sind dafür nicht zwingend.
  - Weiter nachgeschärft, dass diagonale Strukturecken nur dann erscheinen, wenn sie wirklich spielerabgewandt liegen; dadurch verschwinden seitliche Fernwand-Aufhellungen, die nur über bereits sichtbare Stützkacheln verkettet wirkten.
  - Ergänzt, dass orthogonal aufgehellte Wände außerhalb der Spielerachsen mehr als einen Rohsicht-Nachbarn benötigen, damit in großen Räumen keine isolierten Seitenwände wegen einer einzelnen entfernten Sichtinsel hell werden.

## [2026-04-23] update | Organisches FOV- und Fog-System ersetzt die alten Kachelmasken
- Anlass oder Quelle: Nutzerwunsch, die Sichtbereiche nicht weiter heuristisch mit Dreiecken und Achsenmasken zu glätten, sondern auf ein einheitliches organisches Sicht- und Fog-Modell umzustellen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/Entscheidungen/Sichtkanten-Glaettung im Board-Rendering 2026-04-23]]
  - `src/application/visibility-service.mjs`
  - `src/application/targeting-service.mjs`
  - `src/application/player-turn-controller.mjs`
  - `src/ai/enemy-turns.mjs`
  - `src/app/gameplay-assembly.mjs`
  - `src/ui/board-view.mjs`
  - `styles.css`
  - `tests/modules/visibility-service.test.mjs`
  - `tests/modules/board-view.test.mjs`
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass `lineOfSightVisible` jetzt die rohe taktische FOV-Sicht beschreibt und `visible` nur noch die Anzeige-Sicht inklusive genau eines orthogonalen Struktur-Rings ist.
  - Dokumentiert, dass Wahrnehmung und Projektilsicht getrennt wurden: `canPerceive(...)` für Sichtbarkeit, `hasProjectileLine(...)` für echte Schusslinie.
  - Ergänzt, dass Player-Targeting und Gegner-KI diese Trennung jetzt explizit nutzen, sodass sichtbare Ziele nicht automatisch freie Schüsse bedeuten.
  - Sichtbar gemacht, dass das Board keine `tile-fog-edge`-DOM-Elemente mehr rendert und die gesamte Fog-Kante stattdessen über einen einzigen Canvas-Overlay aus Subtile-Raster plus Weichzeichnung erzeugt.
  - Dokumentiert, dass `memory` und `unknown` weiter farblich getrennt bleiben, aber dieselbe organische Übergangslogik verwenden.
  - Festgehalten, dass sichtbare Struktur-Silhouetten wie Wände oder Türen die Kontur nicht mehr als eigene Fog-Geometrie treiben.
  - Verifiziert über grüne Modultests für Board-Overlay, Sichtservice und Gegner-KI sowie über erfolgreichen Modul-Gesamtlauf und Build.

## [2026-04-23] update | Sichtkanten-Glättung an lokale Sicht-Elbows gebunden
- Anlass oder Quelle: Nutzerfeedback, dass die bisherige diagonale Fog-Glättung dekorative Muster und falsche Abdunkelungen statt echter Sichtkanten erzeugte
- Neu angelegte Seiten:
  - [[../02 Wissen/Entscheidungen/Sichtkanten-Glaettung im Board-Rendering 2026-04-23]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
  - `src/ui/board-view.mjs`
  - `tests/modules/board-view.test.mjs`
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die partielle Fog-Abdunkelung rein visuell bleibt und keine Sichtregeln verändert.
  - Dokumentiert, dass diagonale Teilabdunkelung jetzt aus lokalen dunklen Eck-Nachbarschaften der Sichtgrenze kommt und dabei auch nicht sichtbare Wände als dunkle Nachbarn mitzählt.
  - Ergänzt, dass sichtbar aufgehellte Wände oder andere sichtbare opake Strukturkacheln eine Ecke ebenfalls stützen dürfen, ohne dass sie die Farbquelle der Abdunkelung bestimmen.
  - Sichtbar gemacht, dass Schwarz nur bei vollständig `unknown`-Ecken verwendet wird und gemischte `unknown`-/`memory`-Ecken als `memory` erscheinen.
  - Sichtbar gemacht, dass die Farbquelle weiter aus echten verdeckten Kacheln stammt und dass der Fog-Layer für saubere Kanten dieselbe 1px-Nahtkorrektur wie die Basiskacheln nutzt.
  - Ergänzt, dass die Dreiecksorientierung jetzt explizit über die zwei gegenüberliegenden Tile-Ecken relativ zur Spielerposition entschieden wird, damit spielerzugewandte Keile auch bei mehrdeutigen lokalen Mustern verworfen werden.
  - Nachgeschärft, dass die Fog-Entscheidung jetzt auf einer separaten rohen LoS-Sicht `lineOfSightVisible` basiert, während `visible` weiter die zusätzliche Wand-/Tür-Aufhellung für die Anzeige enthält.
  - Festgehalten, dass die Sichtweite im freien Raum jetzt eine kreisnahe euklidische Distanz mit Grundwert `5` nutzt und dadurch die diagonalen Ecken des früheren Chebyshev-Quadrats wegfallen.
  - Ergänzt, dass die Struktur-Aufhellung für Wände und Türen nur noch orthogonal zu sichtbaren Bodenfeldern greift und reine Diagonal-Nachbarschaft nicht mehr ausreicht.
  - Ergänzt, dass die Struktur-Aufhellung auf der horizontalen und vertikalen Spielerachse nicht mehr über die eigentliche Sichtweite hinaus eine „sechste Kachel“ sichtbar machen darf; off-axis Struktur-Aufhellung bleibt erlaubt.
  - Ergänzt, dass die rohe Sicht nicht mehr kachelweise über einzelne Bresenham-Sichtstrahlen entsteht, sondern über ein Shadowcasting-FOV mit kreisnaher Reichweite. Dadurch werden schmale Eck-Einsichten auf Bodenfelder natürlicher sichtbar, während direkt zugestopfte Diagonalen und reine Strukturziele weiter geschützt bleiben.
  - Nachgeschärft, dass die Struktur-Aufhellung nicht über bereits nur per Sonderregel sichtbare Türen oder Wände weiterketten darf.
  - Ergänzt, dass für Pferdesprung-Bodenfelder eine relaxierte diagonale Fog-Kante erlaubt ist, wenn genau eine orthogonale Stützkachel dunkel bleibt und die andere sichtbar-spielernäher ist; solche Kandidaten verdrängen an derselben Zielkachel die axiale Rundungsmaske.
  - Ergänzt, dass die rohe FOV-Sicht selbst nur noch Boden- und Freifeldsicht markiert, während sichtbare Struktur vollständig aus dem getrennten orthogonalen Reveal-Pfad kommt.
  - Nachgeschärft, dass die Pferdesprung-Variante auch gegenüber anderen diagonalen Kandidaten derselben Zielkachel Priorität erhält, damit nicht wieder eine generische Ecke die lokale Ecksicht überdeckt.
  - Verifiziert über gezielte Board-View-Modultests, vollständigen Modultestlauf und grüne Build-Prüfung.

  - Ergänzt, dass axiale Sichtspitzen der kreisnahen Sicht jetzt eigene Nord-/Ost-/Süd-/West-Masken mit Priorität vor diagonalen Dreiecken erhalten, damit die letzten Radiusspitzen nicht fälschlich als schiefe 45-Grad-Keile erscheinen.

## [2026-04-23] update | Wissensbasis-Ordner auf KI-Wissen Final Scene umgestellt
- Anlass oder Quelle: Abschluss der bereits begonnenen Umbenennung der Projekt-Wissensbasis im Repository
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `AGENTS.md`
  - `README.md`
  - `LICENSE-assets.md`
  - `eslint.config.js`
  - `package.json`
  - `scripts/check-memory.mjs`
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Wiki-first Query und Linting]]
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
- Kern der inhaltlichen Anpassung:
  - Den aktiven Wissensordner im Repository konsistent auf `KI-Wissen-Final Scene/` umgestellt und die Agentenhinweise dazu passend nachgezogen.
  - Den Encoding-Check unter `npm run check:memory` auf den neuen Ordnerpfad umgestellt und das zugrunde liegende Skript neutral auf `scripts/check-memory.mjs` umbenannt.
  - Operative Hinweise in README, Lizenzhinweis und Wissenspflege-Prozessen auf den neuen Ordnernamen ausgerichtet.

## [2026-04-23] update | Finito-Sequenz als Abschlussworkflow dokumentiert
- Anlass oder Quelle: Nutzerwunsch, `Finito` beziehungsweise `Ende` als verbindliche Abschlusssequenz für aktuelle Threads in `AGENTS.md` zu verankern
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `AGENTS.md`
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
- Kern der inhaltlichen Anpassung:
  - In `AGENTS.md` festgehalten, dass `Finito` oder `Ende` Änderungen in sinnvolle Commit-Blöcke überführt, nur abgeschlossene Teile committet und offene Fragen danach kompakt benennt.
  - Dokumentiert, dass nötige Wissenspflege Teil dieser Abschlusssequenz ist und ebenfalls commitfähig nachgezogen werden soll.
  - Den bestehenden Arbeitsworkflow um einen eigenen Fall für den Thread-Abschluss ergänzt, damit die Regel nicht nur im Agentenprompt, sondern auch im Projektwissen auffindbar bleibt.

## [2026-04-21] fix | Wissensbasis auf UTF-8-Check abgesichert und Log-Kodierung repariert
- Anlass oder Quelle: Analyse wiederkehrender Kodierungsprobleme in der Projekt-Wissensbasis
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
  - [[../02 Wissen/Prozesse/Wiki-first Query und Linting]]
  - [[../03 Betrieb/Qualitaetspruefung]]
  - `package.json`
  - `README.md`
  - `scripts/check-ai-project-memory.mjs`
- Kern der inhaltlichen Anpassung:
  - Gemischt kodierte Stellen in `[[../03 Betrieb/Log]]` auf konsistentes UTF-8 normalisiert.
  - Ein Repo-Skript `npm run check:memory` ergänzt, das `ai-project-memory/` auf ungültiges UTF-8 und typische Mojibake-Muster prüft.
  - Die Wissenspflege-Prozesse so nachgeschärft, dass Kodierungschecks bei künftigen Health-Checks und größeren Pflegearbeiten explizit dazugehören.

## [2026-04-20] update | Sichtbarer Debug-Vorschub mit Temporegler und stabiler Heatmap
- Anlass oder Quelle: Nutzerfeedback zu zu schnellem Vorspulen, unsichtbaren Gegnerzügen nach `gameOver` und gewünschter Klärung des Heatmap-Verhaltens bei überlagerten Laufwegen
- Neu angelegte Seiten:
  - [[../02 Wissen/Entscheidungen/Debug-Vorschub mit sichtbarer Wiedergabe 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass der Debug-Vorschub in der Toolbar jetzt einen Temporegler besitzt und bei verlangsamter Wiedergabe einzelne Scheduler-Schritte sichtbar rendert.
  - Dokumentiert, dass Reveal-Debug die Scheduler-Simulation auch nach `gameOver` weiter sichtbar abspielen darf.
  - Sichtbar gemacht, dass die Gegnerspur-Heatmap pro Feld immer den zuletzt gelaufenen Gegner zeigt und bei späterer Rückkehr desselben Gegners wieder dessen Farbton übernimmt.

## [2026-04-20] update | Kopfbereich und Studioleiste nach Spielnähe gruppiert
- Anlass oder Quelle: Nutzerwunsch, spielfeldnahe Aktionen direkt über dem Studio und allgemeinere Punkte getrennt im Kopfbereich zu bündeln
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `index.html`
  - `styles.css`
- Kern der inhaltlichen Anpassung:
  - Zielen, Schießen, Inventar, Spielverlauf und Karte liegen nun gesammelt in der Studioleiste links vom Zoombereich.
  - Der Kopfbereich trennt jetzt sichtbarer zwischen laufbezogenen Aktionen wie Speichern und Optionen sowie allgemeinen Menüpunkten wie neuem Spiel, Bestenliste und Hilfe.
  - Die neue Gruppierung bleibt responsiv und nutzt dieselben Button-IDs weiter, damit bestehende UI-Bindings unverändert funktionieren.

## [2026-04-20] update | Debug-Heatmap für Gegnerspuren in der Toolbar ergänzt
- Anlass oder Quelle: Nutzerwunsch nach sichtbaren Laufwegen beim schnellen Vorspulen im Debugmodus
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Entscheidungen/Debugsteuerung in Toolbar statt Modal 2026-04-20]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die Debugleiste nun ein Häkchen `Gegnerspuren` enthält.
  - Dokumentiert, dass die Heatmap echte Gegnerbewegungen pro Feld aufzeichnet, den letzten Gegnerfarbton pro Feld zeigt und wiederholte Begehung dunkler markiert.
  - Sichtbar gemacht, dass die Heatmap nur in der Reveal-Debugsicht erscheint und beim Vorspulen auf dem Brett direkt beobachtbar bleibt.

## [2026-04-20] update | Death-Screen-Button klarer beschriftet
- Anlass oder Quelle: Nutzerhinweis, dass `Zum Todesstudio` auf dem Todesschirm sprachlich unklar wirkt
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `index.html`
- Kern der inhaltlichen Anpassung:
  - Die Button-Beschriftung im Death-Modal wurde von `Zum Todesstudio` auf `Zum letzten Studio` geändert.
  - Ziel der Änderung ist eine kürzere und eindeutigere Formulierung bei gleichbleibender Studio-Terminologie des Projekts.

## [2026-04-20] update | Debugsteuerung wandert in die obere Studioleiste
- Anlass oder Quelle: Nutzerwunsch, den Debug-Zeitvorschub nicht im Modal, sondern direkt über der Studioansicht zu bedienen und einen Rücksprung per `F7` zu erhalten
- Neu angelegte Seiten:
  - [[../02 Wissen/Entscheidungen/Debugsteuerung in Toolbar statt Modal 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass `Debugdaten`, Rücksprung, Zeitfeld und `Vorspulen` nun in der oberen Studioleiste erscheinen, sobald `F8` die Debugsicht aktiviert hat.
  - Festgehalten, dass `F7` im Debugmodus ein Studio zurückspringt und `N` den eingestellten Zeitvorschub ohne geöffnetes Modal ausführt.
  - Sichtbar gemacht, dass das Debug-Modal für kopierbare Reproduktionsdaten zuständig bleibt, während die eigentliche Debug-Steuerung die Studioansicht nicht mehr verdeckt.

## [2026-04-20] feature | Debug Studio-Statistik und 10-Studio-Report
- Anlass oder Quelle: Nutzerwunsch nach einer schnellen numerischen Prüfung über 10 generierte Studios mit Gegner-, Schlüssel-, Nahrung- und Loot-Zahlen
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass der Debug-Dialog jetzt eine kopierbare 10-Studio-Statistik aus dem aktiven Generator anzeigen kann.
  - Dokumentiert, dass `window.__TEST_API__.getStudioGenerationReport()` und `getStudioGenerationReportText()` denselben Zahlenblock strukturiert bzw. als Text liefern.
  - Eine lokal verifizierte Beispielauswertung mit Run-Seed und Gesamtsummen für 10 Studios wurde als Referenz festgehalten.

## [2026-04-20] feature | Direktschuss fuer Einzelziel und Bogen-Projektiloptik ergaenzt
- Anlass oder Quelle: Nutzerwunsch fuer schnelleren Fernkampf mit `T`/`F` bei genau einem gueltigen Ziel sowie eine weniger laserartige Bogen-Animation
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `index.html`
  - `styles.css`
  - `src/application/input-controller.mjs`
  - `src/application/player-turn-controller.mjs`
  - `src/application/state-blueprint.mjs`
  - `src/application/state-persistence.mjs`
  - `src/application/ui-bindings.mjs`
  - `src/app/render-cycle.mjs`
  - `src/combat/player-attack.mjs`
  - `src/equipment-helpers.mjs`
- Kern der inhaltlichen Anpassung:
  - Fernkampf kann nun optional bei genau einem gueltigen Ziel sofort ausloesen, statt erst den Zielmodus zu oeffnen.
  - Die Option ist in den Spieleinstellungen schaltbar und bleibt ueber die gespeicherten Optionen erhalten.
  - Bogenwaffen verwenden fuer Spieler- und Gegner-Fernkampfangriffe nun eine eigene Pfeil-Animation statt des generischen Schussstrahls.

## Format
- Datum
- Anlass oder Quelle
- Neu angelegte Seiten
- Geänderte Seiten
- Kern der inhaltlichen Anpassung

## Einträge

## [2026-04-20] update | Gemeinsamen Verify-Lauf fuer lokale Qualitaetspruefung ergaenzt
- Anlass oder Quelle: Wunsch nach einem Skript, das den gesamten lokalen Qualitätslauf zusammen ausführt
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass `npm run verify:quick` aus `lint:strict`, `check:js` und Modultests besteht.
  - Dokumentiert, dass `npm run verify` darauf aufsetzt und zusätzlich `test:e2e` ausführt.
  - Festgehalten, dass der Syntax-Check über ein eigenes Skript mit kompakterer Ausgabe läuft.

## [2026-04-20] update | ESLint als statische JavaScript-Pruefung eingefuehrt
- Anlass oder Quelle: gewünschte Einführung von `ESLint` für das Repository
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass `npm run lint` jetzt als statische JavaScript-Prüfung zum Projektablauf gehört.
  - Sichtbar gemacht, dass `lint` den bestehenden Ablauf aus `check:js`, Modultests und Playwright sinnvoll ergänzt.

## [2026-04-20] analyse | Einordnung von PHP CodeSniffer fuer Projekt-Tests
- Anlass oder Quelle: Projektfrage zu `Codesnif` als moeglichem Testwerkzeug
- Neu angelegte Seiten:
  - [[../01 Rohquellen/web/PHP_CodeSniffer Referenz 2026-04-20]]
  - [[../02 Wissen/Prozesse/Einordnung PHP CodeSniffer fuer dieses Projekt 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass `Codesnif` sehr wahrscheinlich `PHP_CodeSniffer` meint und dieses Tool fuer PHP-Coding-Standards statt fuer fachliche JavaScript-Tests gedacht ist.
  - Sichtbar gemacht, dass dieses Repository bereits auf `check:js`, modulnahe Node-Tests und Playwright-E2E ausgerichtet ist.

## [2026-04-20] analyse | Bewertung der Tests 11 bis 20 aus `tests/app.spec.js`
- Anlass oder Quelle: Review des nächsten Blocks konkreter Playwright-Tests in `tests/app.spec.js`
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Bewertung Tests 11 bis 20 E2E-App-Spec 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die Tests 11 bis 20 fachlich überwiegend sinnvoll sind und beim Review 10 von 10 grün liefen.
  - Sichtbar gemacht, dass Highscore-, Inventar- und Container-Tests teils unnötig an Asset-Dateien oder Geometrie-Details gekoppelt sind.
  - Empfehlung dokumentiert, robuste Fachtests beizubehalten und UI-lastige Integrationsfälle stärker nach Verantwortung zu schneiden.

## [2026-04-20] analyse | Bewertung der ersten 10 E2E-Startflow-Tests
- Anlass oder Quelle: Review der ersten 10 konkreten Playwright-Tests in `tests/app.spec.js` im Kontext laufender Weiterentwicklung
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Bewertung erste 10 E2E-Startflow-Tests 2026-04-20]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die ersten 10 Startflow-Tests fachlich überwiegend weiter sinnvoll sind und beim Review 10 von 10 grün liefen.
  - Sichtbar gemacht, dass drei Tests unnötig eng an Marketing-Copy, Tooltip-Wording bzw. konkrete Asset-Dateinamen gekoppelt sind.
  - Empfehlung dokumentiert, diese spröden Stellen auf Verhaltensschutz statt Präsentationsdetails umzubauen.

## [2026-04-20] update | E2E-Stabilisierung fuer Testlaeufe und Floor-Wechsel
- Anlass oder Quelle: Durchlauf und Fehlerbehebung von `npm run test:e2e`
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass ein alter Listener auf Port `4173` Playwright gegen einen veralteten Testserver laufen lassen kann.
  - Festgehalten, dass lange E2E-Floorlaeufe fuer reine Generierungspruefungen vor dem Ebenenwechsel gegebenenfalls von Floor-Entitäten bereinigt werden sollten, damit keine kampfbedingten Nebenzustände die Aussage des Tests verfälschen.

## [2026-04-17] create | Initiale Projekt-Wissensbasis
- Anlass oder Quelle: Initiale projektbezogene Wissensbasis für `Projekt Rogue`
- Neu angelegte Seiten:
  - [[../00 Projektstart]]
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Projektueberblick]]
  - [[../02 Wissen/00 Uebersichten/Systemlandkarte]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - weitere verlinkte Begriffs-, Prozess-, Risiko- und Quellenbewertungsseiten
- Geänderte Seiten:
  - keine
- Kern der inhaltlichen Anpassung:
  - Rohquellen aus dem Repository unverändert kopiert.
  - Projektwissen aus README, Architekturdoku, Gameplay-Doku, Balancing-Bestandsaufnahme, Quality Report und Design Notes strukturiert verdichtet.
  - Unterschied zwischen dokumentiertem Projektstand und aktuellem Workspace-Snapshot explizit festgehalten.

## [2026-04-17] ingest | Karpathy LLM Wiki Gist
- Anlass oder Quelle: externe Referenz [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- Neu angelegte Seiten:
  - [[../01 Rohquellen/externe-quellen/2026-04-17-karpathy-llm-wiki-gist]]
  - [[../02 Wissen/Quellenbewertungen/Karpathy LLM Wiki Bewertung]]
  - [[../02 Wissen/Prozesse/Wiki-first Query und Linting]]
  - [[../02 Wissen/Risiken und offene Punkte/Anpassungen aus dem LLM Wiki Pattern]]
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - `wiki-first` als explizite Antwortreihenfolge verankert.
  - Index auf Katalogcharakter mit Kurzbeschreibungen geschärft.
  - Parsebares Log-Format und stärkere Lint-Regeln festgelegt.

## [2026-04-17] create | Workflowbeschreibung fuer Projektarbeit
- Anlass oder Quelle: Bedarf nach einer praktischen Anleitung für die Nutzung und Pflege der Projekt-Wissensbasis
- Neu angelegte Seiten:
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Alltäglichen Workflow für Quellenaufnahme, wiki-first Antworten, Rückführung von Erkenntnissen und Health-Checks als eigene Prozessseite dokumentiert.

## [2026-04-17] ingest | Balancing Foundation Rationale
- Anlass oder Quelle: neu Projektquelle `docs/balancing-foundation-rationale-2026-04-17.md`
- Neu angelegte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Balancing-Fundament und Vereinheitlichungsprinzipien]]
  - [[../02 Wissen/Quellenbewertungen/Balancing Foundation Rationale Bewertung]]
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Spielsysteme im Ueberblick]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Konzeptionelle Rationale hinter den jüngsten Balancing-Vereinheitlichungen als eigenes Wissenselement aufgenommen.
  - Bestehende Balancing-Bestandsaufnahme um die Begründungsebene ergänzt.

## [2026-04-17] curate | Quellenstatus der docs-Dateien
- Anlass oder Quelle: Bedarf nach kuratierter Einordnung der übernommenen `docs/`-Quellen
- Neu angelegte Seiten:
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/Quellenbewertungen/JS-Architekturbericht Bewertung]]
- Geänderte Seiten:
  - [[../00 Projektstart]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - mehrere bestehende Quellenbewertungen
- Kern der inhaltlichen Anpassung:
  - `docs/`-Quellen nach operativer Brauchbarkeit, Snapshot-Charakter, historischem Status und Designrichtungscharakter eingeordnet.
  - Menschlicher Lesepfad für den Einstieg in die Wissensbasis verbessert.

## [2026-04-17] update | Sprachregel fuer Umlaute und ß
- Anlass oder Quelle: neue Vorgabe für sichtbare deutsche Texte in UI und Wissensbasis
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
- Kern der inhaltlichen Anpassung:
  - Für normale deutsche Texte echte Umlaute und `ß` als Standard festgelegt.
  - Ausnahmen für Dateinamen, Pfade, Code-Symbole, IDs und originale technische Bezeichnungen dokumentiert.

## [2026-04-17] fix | Umlaut-Normalisierung und Sprachregeln bereinigt
- Anlass oder Quelle: fehlerhafte automatische Ersetzung bei der Umstellung auf echte Umlaute
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../00 Steuerung/Regeldatei KI-Wissenspflege]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - [[../02 Wissen/Quellenbewertungen/Karpathy LLM Wiki Bewertung]]
  - weitere Wissensseiten mit bereinigten Schreibweisen
- Kern der inhaltlichen Anpassung:
  - Falsche Ersetzungen wie `Qülle`, `aktülle` oder `Projekt Rogü` rückgängig gemacht.
  - Fließtexte in der Wissensbasis sprachlich normalisiert und auf echte Umlaute bzw. `ß` ausgerichtet.
  - Technische Dateinamen, Pfade und bestehende Links bewusst unverändert gelassen.

## [2026-04-17] analyse | Baseline-Anwendung als primaere aktuelle Referenz
- Anlass oder Quelle: Bedarf nach einer frischen Komplettanalyse statt alleiniger Nutzung älterer `docs/`
- Neu angelegte Seiten:
  - [[../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-17]]
- Geänderte Seiten:
  - [[../00 Projektstart]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
- Kern der inhaltlichen Anpassung:
  - Frische Baseline aus aktuellem Workspace, Build, Syntax-Check und Modultest-Stand als neue Hauptreferenz aufgenommen.
  - Ältere `docs/` nicht verworfen, sondern gegenüber der Baseline als Kontext-, Snapshot- oder Rationale-Quellen eingeordnet.
  - Aktuelle rote Modultest-Bereiche und laufende Umbauzonen explizit sichtbar gemacht.

## [2026-04-20] fix | Studiokarte dunkelt erkundete Tueren korrekt ab
- Anlass oder Quelle: Nutzerhinweis zur abgedunkelten Studiokarte, in der offene und geschlossene Türen trotz Memory-State zu hell blieben
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `styles.css`
- Kern der inhaltlichen Anpassung:
  - Türzellen der Studiokarte erhalten im erkundeten, aber aktuell nicht sichtbaren Zustand nun gedämpfte Farben statt dauerhaft heller Akzentfarben.
  - Die hellen Farben für `door-open` und `door-closed` greifen jetzt nur noch bei `is-visible`, damit die Kartendarstellung konsistent mit dem Fog-of-War bleibt.

## [2026-04-20] fix | Absperrband-Kreuz clippt Streifen sauber im 2x2-Overlay
- Anlass oder Quelle: Nutzerhinweis zum unsauberen Absperrband-Kreuz auf der Kachelansicht
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `assets/overlays/tape-cross-128.svg`
- Kern der inhaltlichen Anpassung:
  - Das Motiv `tape-cross-2x2` bleibt ein einzelnes dekoratives Overlay über einem 2x2-Maskenbereich und ist kein Doppel-Overlay.
  - Die schwarzen Warnstreifen werden in der SVG nun an die horizontale und vertikale Bandform geclippt, damit sie optisch nicht mehr aus dem Absperrband herauslaufen.

## [2026-04-20] fix | Absperrband-Kreuz wieder stärker als gelbes Warnband gezeichnet
- Anlass oder Quelle: Folgefeedback, dass das erste Rework den Charakter des klassischen Absperrbandes zu stark verloren hatte
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - `assets/overlays/tape-cross-128.svg`
- Kern der inhaltlichen Anpassung:
  - Das Kreuz nutzt weiterhin ein einzelnes 2x2-Overlay, zeichnet die Bänder aber wieder mit klar gelber Grundfläche statt optisch zu dunklem Gesamteindruck.
  - Die diagonalen dunklen Streifen sind nun schmaler und in gleichmäßigem Abstand gesetzt, damit das Motiv wieder näher an klassischem Warnband liegt.

## [2026-04-20] update | Fernkampf bekommt Eck-Deckung und Trefferchance im Zielmodus
- Anlass oder Quelle: Nutzerwunsch nach Schutzwirkung für Ziele, die nur knapp um Ecken sichtbar sind
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass Fernkampfschüsse auf knapp sichtbare Eckziele nun einen Deckungsmalus erhalten, wenn die Schusslinie eine spätere Ecke nur streift.
  - Dokumentiert, dass direkter Eckkontakt am Schützen bewusst ohne Malus bleibt, damit Nah-Eckspiel nicht unnötig entwertet wird.
  - Sichtbar gemacht, dass der Zielmodus die aktuelle Trefferchance jetzt direkt in Prozent anzeigt und Eck-Deckung als `Teildeckung` oder `Starke Deckung` markiert.
  - Ergänzt, dass die Komfortfunktion für automatisches Sofortfeuer bei genau einem Ziel bei Eck-Deckung bewusst nicht auslöst, damit die reduzierte Trefferchance erst sichtbar bestätigt werden kann.
  - Ergänzt, dass auch das Kampflog reduzierte Trefferchancen durch Eck-Deckung nun in atmosphärischen Zusatztexten benennt, damit Treffer und Fehlschüsse nicht wie normale Vollchancen-Schüsse wirken.
  - Nachgeschärft, dass Eck-Deckung nicht mehr nur bei perfekten Raster-Ecktreffern greift, sondern auch bei knappen Vorbeischüssen an einer späteren blockierenden Kante, damit flache Schüsse aus zweiter Reihe hinter Ecken konsistenter erfasst werden.

## [2026-04-20] update | Batch-CLI und Locked-Room-Fix für Studio-Statistik
- Anlass oder Quelle: Nutzerwunsch nach `100 x 10`-Statistiklauf, Klärung der niedrigen Schlüsselrate und Aufwertung des Schatzraums
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass der Terminal-Befehl `npm run report:studios -- --runs 100 --studios 10` wiederhergestellt ist und Batch-Auswertungen über Mittelwerte, Minima und Maxima liefert.
  - Festgehalten, dass die frühere niedrige Schlüsselrate vor allem aus der Kandidatenauswahl und fehlendem Nachrücken gültiger Locked Rooms entstand, nicht primär aus den Balancewerten.
  - Festgehalten, dass Locked Bonus Rooms jetzt garantierte Mindestbeute tragen: zwei Nahrungspickups, zwei Heilverbrauchsgüter und eine Truhe mit mindestens drei Inhalten.
  - Verifiziert eingetragen, dass der `100 x 10`-Lauf nach dem Fix im Mittel `11.64` Schlüssel und `11.64` verschlossene Türen pro Run erzeugt statt zuvor nur `1.22`.
## [2026-04-20] analyse | Startscreen-Aktivierung per Tastatur abgesichert
- Die Startscreen-Analyse ergab eine Lücke zwischen bestehender Testabdeckung und realem UX-Pfad: Das Landing-Menü war für Pfeilnavigation und Fokusübergabe abgesichert, aber nicht ausdrücklich für Aktivierung per `Enter` oder `Leertaste`.
- `src/application/ui-bindings.mjs` wurde deshalb so gehärtet, dass die Landing-Buttons ihre Tastaturaktivierung zusätzlich direkt am fokussierten Button verarbeiten und dieselben Aktionen zentral verwenden wie Maus-Klicks.
- `tests/app.spec.js` wurde um Regressionsfälle für `Enter` auf dem ausgewählten Landing-Eintrag und `Leertaste` auf dem fokussierten Startbutton ergänzt.
- Die Prozessseite `02 Wissen/Prozesse/Bewertung erste 10 E2E-Startflow-Tests 2026-04-20.md` dokumentiert die neu sichtbare Testlücke.

## [2026-04-20] fix | Utility-Verbrauchbares und Fortschrittszähler in der Studio-Batch-CLI
- Anlass oder Quelle: Nutzerfrage, warum `Verbrauchbar Utility` im Batch-Report dauerhaft `0` blieb, plus Wunsch nach sichtbarem Zähler während langer Statistikläufe
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass normale Utility-Consumables zwar korrekt gerollt wurden, aber fälschlich über `createPotionPickup(...)` liefen und dadurch im Report als Heilung erschienen.
  - Dokumentiert, dass der Spawnpfad für allgemeine Consumable-Drops jetzt `createConsumablePickup(...)` nutzt und `Verbrauchbar Utility` im Report wieder größer `0` werden kann.
  - Ergänzt, dass `scripts/studio-stats.mjs` während längerer Batch-Läufe nun einen Fortschrittszähler `Statistiklauf x/y` ausgibt.

## [2026-04-20] update | Bodenschilde in der Studio-Generierung häufiger
- Anlass oder Quelle: Nutzerhinweis, dass im Statistiklauf zu wenige Schilde auftauchen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
- Kern der inhaltlichen Anpassung:
  - Dokumentiert, dass die bisherige Bodenschild-Rate ungewöhnlich niedrig war, weil Studios `3` und `4` gar keine Bodenschilde erzeugen konnten und tiefe Studios nur mit `8 %` prüften.
  - Festgehalten, dass die Spawn-Regeln für Bodenschilde moderat angehoben wurden: `25 %` auf Studio `1`, `40 %` auf Studio `2`, `20 %` auf Studio `3` und `4`, `16 %` ab Studio `5`.
  - Verifiziert eingetragen, dass ein `20 x 10`-Batch danach im Mittel `1.5` Bodenschilde pro 10-Studio-Run erzeugte statt zuvor ungefähr `0.65`.

## [2026-04-20] update | Nahrung in der Studio-Statistik mit Nährwertsumme und Durchschnitt
- Anlass oder Quelle: Nutzerwunsch, Nahrung nicht nur als Anzahl, sondern auch nach enthaltenem Nährwert auswerten zu können
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass der strukturierte Studio-Report jetzt zusätzlich `foodNutrition.count`, `foodNutrition.totalNutrition` und `foodNutrition.averageNutrition` liefert.
  - Dokumentiert, dass Debug-Text, Test-API-Text und Batch-CLI Nahrung nun als Anzahl plus `Nährwert` und `Schnitt` ausgeben.
  - Verifiziert eingetragen, dass die Batch-Auswertung dafür eigene Kennzahlen `Nahrung Nährwert` und `Nahrung Schnitt` mit Mittelwert, Minimum und Maximum führt.

## [2026-04-20] update | Heilverbrauchsgüter in der Studio-Statistik mit Heilwertsumme und Durchschnitt
- Anlass oder Quelle: Folgeidee, Heil-Consumables analog zur Nahrung nicht nur zu zählen, sondern auch nach enthaltenem Heilwert auszuwerten
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass der strukturierte Studio-Report Heilverbrauchsgüter jetzt zusätzlich unter `consumables.healingValue` mit `count`, `totalHeal` und `averageHeal` ausweist.
  - Dokumentiert, dass Debug-Text, Test-API-Text und Batch-CLI für Heilung nun `Heilwert` und `Heilschnitt` zusätzlich zur reinen Heilitem-Anzahl anzeigen.
  - Verifiziert eingetragen, dass die Batch-Auswertung dafür eigene Kennzahlen `Verbrauchbar Heilwert` und `Verbrauchbar Heilschnitt` mit Mittelwert, Minimum und Maximum führt.
## [2026-04-20] update | Zielmodus erklärt Trefferchance jetzt per Tooltip
- Anlass oder Quelle: Nutzerwunsch nach kompakter Anzeige und klarer Erklärung, wie sich Deckung auf die Endchance auswirkt
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass der Zielmodus die Prozentanzeige auch ohne Deckung weiter sichtbar lässt und das Hauptlabel kompakt hält.
  - Dokumentiert, dass Tooltip und Zielmarker jetzt die aktuelle Endchance, den Basiswert ohne Deckung und den konkreten Deckungsmalus erklären.

## [2026-04-20] idea | Verschlossene Container und Schlüsseltruhen als offene Designspur
- Anlass oder Quelle: Nutzeridee, zusätzlich zu verschlossenen Türen auch Container oder Truhen vorzusehen, die nur per Schlüssel geöffnet werden können
- Neu angelegte Seiten:
  - [[../02 Wissen/Risiken und offene Punkte/Verschlossene Container und Schluesseltruhen]]
- Geänderte Seiten:
  - [[../02 Wissen/Risiken und offene Punkte/Offene Designrichtungen]]
  - [[../02 Wissen/00 Uebersichten/Index]]
- Kern der inhaltlichen Anpassung:
  - Als offene Projektidee festgehalten, dass Schlüssel künftig nicht nur Wege, sondern auch gezielte Loot-Container freischalten könnten.
  - Sichtbar gemacht, dass diese Idee aktuell kein dokumentierter Ist-Stand ist, sondern eine mögliche spätere Designrichtung.
  - Offene Designfragen zu Schlüsselökonomie, Frustvermeidung, Telegraphie und Balancing-Folgen direkt mit dokumentiert.



## [2026-04-20] update | Gegnerloot deutlich angehoben und um Misc-Drops ergänzt
- Anlass oder Quelle: Nutzerwunsch nach spürbar höherer Dropchance für besiegte Gegner, mit Fokus auf getragene Waffen sowie zusätzliche Nahrung, Heilung und Utility-Loot
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Begriffe und Konzepte/Spielsysteme im Ueberblick]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die Waffendropchance im aktiven Runtime-Pfad stark erhöht wurde: nicht ikonisch `48/64/80 %`, ikonisch `72/84/94 %` für `normal/elite/dire`.
  - Dokumentiert, dass Offhands nun mit `18/30/42 %` auf `normal/elite/dire` droppen und dass im aktuellen Monsterkatalog bereits drei Gegnertypen Offhands tragen.
  - Verifiziert eingetragen, dass Gegner ohne geplanten Nahrungsdrop jetzt stattdessen mit `34/46/58 %` je Variantentier einen Misc-Drop erhalten können, bevorzugt Heilverbrauchsgüter und sonstige Utility-Consumables.

## [2026-04-21] verify | Frische Baseline zeigt Build-Bruch trotz sauberer Arbeitskopie
- Anlass oder Quelle: Nutzerfrage nach einem sinnvollen Alpha-Release-Stand und direkter Verifikationslauf vor einer Veröffentlichungsentscheidung
- Neu angelegte Seiten:
  - [[../01 Rohquellen/repo-root/workspace-status-2026-04-21]]
  - [[../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-21]]
- Geänderte Seiten:
  - [[../00 Projektstart]]
  - [[../02 Wissen/00 Uebersichten/Index]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../02 Wissen/00 Uebersichten/Quellenlage und Aktualitaet]]
  - [[../02 Wissen/Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass `git status --short` am 2026-04-21 leer war und der Workspace damit sauber ist.
  - Dokumentiert, dass `npm run verify:quick` aktuell bereits in `lint:strict` scheitert, unter anderem wegen eines Parsing-Fehlers in `src/ai/enemy-turns.mjs` und eines ESLint-Verstoßes in `src/application/targeting-service.mjs`.
  - Sichtbar gemacht, dass auch `npm run build` mit `Unexpected end of file` in `src/ai/enemy-turns.mjs` fehlschlägt und die bisherige dokumentierte Release- bzw. Verifikationsreife deshalb derzeit nicht dem beobachteten Ist-Stand entspricht.

## [2026-04-21] verify | Vollständiger Verify-Lauf auf lokalem Arbeitsstand fast grün
- Anlass oder Quelle: Nutzerwunsch nach einem kompletten Testlauf im aktuellen Workspace
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-21]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass der lokale Workspace beim Volltest nicht sauber war und die Beobachtung deshalb ausdrücklich vom sauberen Snapshot getrennt werden muss.
  - Dokumentiert, dass `npm run verify` über `lint:strict`, `check:js`, `test:modules` und Build erfolgreich lief und erst in Playwright scheiterte.
  - Verifiziert eingetragen, dass nur noch zwei E2E-Kampftests rot sind: das verborgene `#deathModal` in `tests/combat.spec.js:927` und die fehlende flektierte Waffenformulierung in `tests/combat.spec.js:978`.

## [2026-04-21] fix | Kampftests auf deterministischen Fernkampfpfad umgestellt und Verify wieder grün
- Anlass oder Quelle: Nutzerwunsch, die letzten zwei roten Fehler zu überprüfen und den Testlauf zu stabilisieren
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Baseline-Analyse Anwendung 2026-04-21]]
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - `src/application/test-api-mutators.mjs`
  - `tests/combat.spec.js`
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass die zwei roten E2E-Kampftests fachlich am Nahkontakt- oder Sichtlinien-Setup scheiterten, nicht an der Waffenflexion selbst.
  - Dokumentiert, dass der Testaufbau nun ein freigeräumtes Feld und echte Distanz-Fernkampfangriffe nutzt und dass explizite `null`-Ausrüstung in der Test-API korrekt Ausrüstung entfernt.
  - Verifiziert eingetragen, dass `npm run verify` danach im aktuellen lokalen Workspace vollständig grün durchläuft.

## [2026-04-23] fix | Startbildschirm reagiert auch ohne vorab gebauten Bundle
- Anlass oder Quelle: Nutzerhinweis, dass die Knöpfe auf dem Startbildschirm keine Wirkung zeigen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
  - `index.html`
- Kern der inhaltlichen Anpassung:
  - Verifiziert, dass `index.html` zuvor nur `dist/game.bundle.js` geladen hat, der `dist`-Ordner im aktuellen Workspace aber fehlte.
  - Festgehalten, dass dadurch auf dem Startbildschirm kein JavaScript aktiv war und sichtbare Buttons ohne Handler blieben.
  - Dokumentiert, dass der lokale Einstieg nun `src/main.mjs` direkt als Modul lädt, sodass der Startbildschirm auch ohne vorab erzeugtes Bundle bedienbar bleibt.

## [2026-04-23] betrieb | Regulären Bundle-Einstieg nach `npm install` wiederhergestellt
- Anlass oder Quelle: Nutzerwunsch, den temporären Direktstart nicht als Dauerlösung stehen zu lassen
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Build Test und lokaler Start]]
  - `index.html`
- Kern der inhaltlichen Anpassung:
  - Verifiziert, dass `npm install`, `npm run build` und `npm run verify:quick` im aktuellen Workspace wieder erfolgreich laufen.
  - Festgehalten, dass `index.html` wieder regulär `dist/game.bundle.js` lädt.
  - Sichtbar gemacht, dass `node_modules/` und `dist/` bereits in `.gitignore` stehen und damit nicht regulär mit ins Repository eingecheckt werden.

## [2026-04-24] prozess | Branch-Automatik und Abschlusskommandos Finale/Endfinale ergänzt
- Anlass oder Quelle: Nutzerwunsch nach robusterer Branchhandhabung und sprachfreundlichen Einwortkommandos für Speech-to-Text.
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/Prozesse/Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit]]
  - [[../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]
  - `AGENTS.md`
- Kern der inhaltlichen Anpassung:
  - Festgelegt, dass der Agent vor Arbeitsänderungen auf `main` automatisch einen `codex/`-Arbeitsbranch anlegt, außer der Nutzer verlangt ausdrücklich eine Direktänderung auf `main`.
  - Die Abschlusskommandos `Finito`, `Finale` und `Endfinale` gestaffelt dokumentiert: lokaler Abschluss, vollständiger Merge-/Push-Abschluss und großer Projektabschluss.
  - Stop-Regeln ergänzt, damit bei roten Checks, Merge-Konflikten, riskantem Push oder offenen fachlichen Punkten nicht automatisch integriert wird.

## [2026-04-28] verify | Umgezogener Workspace geprüft
- Anlass oder Quelle: Nutzerhinweis, dass das Projekt aus OneDrive nach `C:\Projekte\final-scene-main` umgezogen ist, mit Bitte um Prüfung von Git, Anwendung und Tests.
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../03 Betrieb/Qualitaetspruefung]]
- Kern der inhaltlichen Anpassung:
  - Festgehalten, dass `main` sauber und mit `origin/main` abgeglichen ist; `git fetch --dry-run --verbose origin` meldet `main` als aktuell.
  - Verifiziert, dass Node `v24.15.0`, npm `11.12.1`, `node_modules/`, `npm run build`, `npm run check:memory` und der lokale Server auf `127.0.0.1:4173` funktionieren.
  - Dokumentiert, dass `npm run verify` aktuell im Playwright-Teil rot ist: 188 E2E-Tests bestehen, zwei Zielmodus-Tests in `tests/app.spec.js` schlagen reproduzierbar fehl.

## [2026-04-28] fix | Zielmodus- und Navigation-E2E-Setups stabilisiert
- Anlass oder Quelle: Folgeprüfung der zwei roten Playwright-Zielmodus-Tests aus dem Umzugscheck und anschließende Volltest-Stabilisierung.
- Neu angelegte Seiten:
  - keine
- Geänderte Seiten:
  - [[../02 Wissen/00 Uebersichten/Aktueller Projektstatus]]
  - [[../03 Betrieb/Qualitaetspruefung]]
  - `src/app/gameplay-assembly.mjs`
  - `src/application/test-api-mutators.mjs`
  - `tests/app.spec.js`
  - `tests/navigation.spec.js`
- Kern der inhaltlichen Anpassung:
  - Ursache dokumentiert: Die roten E2E-Tests prüften Deckung und Chebyshev-Reichweite an Gegnern, die nach der aktuellen FOV-Regel nicht sichtbar waren; der Zielmodus meldete deshalb korrekt `Kein Ziel`.
  - `setupCombatScenario()` aktualisiert die Sicht im Test-API-Pfad explizit nach dem Umbau von Spielerposition, Grid, Wänden und Gegnern.
  - Die beiden E2E-Setups wurden auf sichtbare Szenarien umgestellt, ohne die geprüften Zielmodus-Aussagen aufzugeben.
  - Zusätzlich wurden zwei mehrstöckige Navigationstests vor Studioübergängen um `clearFloorEntities()` ergänzt, damit reine Layoutprüfungen keine Gegnerangriffe oder Todeszustände mitschleppen.
  - Verifiziert eingetragen, dass `npm run verify` danach vollständig grün läuft; Playwright meldet `190 passed`.
