# Index

## Einstieg
- [[Projektueberblick]]: Produktbild, Kernsysteme und technische Grundform des Spiels.
- [[Baseline-Analyse Anwendung 2026-04-21]]: primäre aktuelle Referenz für den heute verifizierten Workspace-, Build- und Schnellverifikationsstand.
- [[Baseline-Analyse Anwendung 2026-04-17]]: älterer Snapshot eines damals noch baubaren Zwischenstands.
- [[Systemlandkarte]]: aktive Architektur, Schichten und zentrale Module.
- [[Aktueller Projektstatus]]: zusammengeführter Status aus Dokumentation, Baseline und beobachtetem Workspace.
- [[Quellenlage und Aktualitaet]]: welche Dokumente operativ brauchbar, snapshot-gebunden, historisch oder nur Designrichtung sind.

## Kernwissen
- [[../Begriffe und Konzepte/The Final Scene]]: Produktname und Einordnung zum Repository `projekt-rogue`.
- [[../Begriffe und Konzepte/Dungeon und Studio]]: verbindliche Terminologie für Runs und einzelne Spieleinheiten.
- [[../Begriffe und Konzepte/Spielsysteme im Ueberblick]]: wichtigste mechanische Achsen und Zusammenhänge.
- [[../Begriffe und Konzepte/Balancing-Fundament und Vereinheitlichungsprinzipien]]: Leitidee hinter den jüngsten Balancing-Vereinheitlichungen und der Weg zu späteren Reglern.
- [[../Personen und Rollen/Spielerklassen und Passiven]]: aktuelle Klassen, Startprofile und Passiven.

## Projektentscheidungen und Prozesse
- [[../Entscheidungen/Aktiver Runtime-Pfad und Legacy-Abgrenzung]]: aktive Produktivlinie und Abgrenzung zu `src/legacy/`.
- [[../Entscheidungen/Debugsteuerung in Toolbar statt Modal 2026-04-20]]: Debug-Zeitvorschub und Debug-Studio-Navigation liegen in der oberen Studioleiste statt im Debug-Modal.
- [[../Entscheidungen/Debug-Vorschub mit sichtbarer Wiedergabe 2026-04-20]]: Toolbar-Temporegler, sichtbarer Scheduler-Vorschub und Heatmap-Verhalten bei überlagerten Gegnerpfaden.
- [[../Entscheidungen/Sichtkanten-Glaettung im Board-Rendering 2026-04-23]]: organischer Fog-Canvas auf Basis einer einheitlichen FOV-Sicht; Wahrnehmung und Projektilsicht sind getrennt.
- [[../Entscheidungen/Special Events und Setpieces 2026-05-01]]: Special Events als häufige filmische Studiomomente mit drei v1-Setpieces, Bonusgegnern und dezenter Ankündigung.
- [[../Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen]]: alltäglicher Bedien- und Pflegeworkflow für Quellen, Fragen und Rückführung von Erkenntnissen.
- [[../Prozesse/Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit]]: empfohlener Git- und GitHub-Ablauf für thematische Arbeitsbranches, Pull Requests und parallele Arbeit auf mehreren Rechnern.
- [[../Prozesse/Build Test und lokaler Start]]: lokaler Start-, Build- und Testablauf.
- [[../Prozesse/Debug Studio-Statistik und 10-Studio-Report 2026-04-20]]: Debug-, Test-API- und Batch-CLI-Pfad für numerische Studio-Auswertungen samt Analyse der Schlüsselraum-Frequenz.
- [[../Prozesse/Einordnung PHP CodeSniffer fuer dieses Projekt 2026-04-20]]: warum `PHP_CodeSniffer` für dieses JavaScript-/Playwright-Projekt kein Testwerkzeug ist.
- [[../Prozesse/Bewertung erste 10 E2E-Startflow-Tests 2026-04-20]]: Einordnung, welche frühen Startflow-Tests fachlich wertvoll bleiben und wo sie für Weiterentwicklung zu spröde sind.
- [[../Prozesse/Bewertung Tests 11 bis 20 E2E-App-Spec 2026-04-20]]: Einordnung des nächsten E2E-Blocks mit Fokus auf Startausstattung, Inventar, Containerfluss und UI-Kopplung.
- [[../Prozesse/Quellenverarbeitung in dieser Wissensbasis]]: wie neue Quellen in Wissen überführt werden.
- [[../Prozesse/Wiki-first Query und Linting]]: Antwortreihenfolge, Rückführung von Erkenntnissen und regelmäßige Health-Checks.

## Risiken und offene Punkte
- [[../Risiken und offene Punkte/Architektur und Wartbarkeit]]: strukturelle Engpässe und Kopplungsrisiken.
- [[../Risiken und offene Punkte/Offene Designrichtungen]]: dokumentierte, aber noch nicht umgesetzte Designspuren.
- [[../Risiken und offene Punkte/Verschlossene Container und Schluesseltruhen]]: offene Idee für Truhen oder Container, die einen Schlüssel statt einer Tür freischalten.
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]: Unsicherheiten zwischen Doku, Baseline und aktuellem Workspace.
- [[../Risiken und offene Punkte/Anpassungen aus dem LLM Wiki Pattern]]: konkrete Verbesserungen, die sich aus dem Karpathy-Gist ableiten lassen.

## Quellenbewertungen
- [[../Quellenbewertungen/README Bewertung]]: Gesamtüberblick und Betriebsorientierung.
- [[../Quellenbewertungen/Project Overview Bewertung]]: Architektur und Änderungshilfen.
- [[../Quellenbewertungen/JS-Architekturbericht Bewertung]]: Zielbild, Engpässe und Refactoring-Richtung der Architektur.
- [[../Quellenbewertungen/Gameplay Mechanics Bewertung]]: fachliche Regelbeschreibung aus Spielsicht.
- [[../Quellenbewertungen/Balancing Foundation Rationale Bewertung]]: Begründung hinter den aktuellen Vereinheitlichungsumbauten.
- [[../Quellenbewertungen/Balancing Bestandsaufnahme Bewertung]]: gruppierbare Balanceachsen und Systemrisiken.
- [[../Quellenbewertungen/Quality Report Bewertung]]: historisierte Qualitätsprobleme, Fixes und Restrisiken.
- [[../Quellenbewertungen/Design Notes Bewertung]]: offene Designrichtungen statt Ist-Beschreibung.
- [[../Quellenbewertungen/Karpathy LLM Wiki Bewertung]]: externe Referenz für Betriebsmodell, Index/Log/Lint und wiki-first Nutzung.

## Betrieb
- [[../../03 Betrieb/Log]]
- [[../../03 Betrieb/Qualitaetspruefung]]
