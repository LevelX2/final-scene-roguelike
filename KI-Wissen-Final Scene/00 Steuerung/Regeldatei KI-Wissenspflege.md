# Regeldatei KI-Wissenspflege

## Zweck
Diese Wissensbasis dient der dauerhaften, strukturierten und verlinkten Dokumentation von `Projekt Rogue` / `The Final Scene`.

## Projektgrenze
- Diese Wissensbasis behandelt nur dieses Projekt.
- Andere Projekte oder fachlich getrennte Themen werden nicht eingemischt.

## Arbeitssprache
- Wissensseiten werden in klarem Deutsch gepflegt.
- In normalen deutschen Texten werden echte Umlaute und `ß` verwendet.
- Schreibweisen wie `ae`, `oe`, `ue` oder `ss` statt Umlaut/Eszett sind nur für technische Bezeichner, Dateinamen, Pfade, Code-Symbole, IDs, bestehende Dateilinks oder originale Quellbezeichnungen zulässig.
- Technische Dateinamen, Modulnamen und IDs bleiben in ihrer Originalschreibweise.

## Dateikodierung
- Dateien in `KI-Wissen-Final Scene` werden als UTF-8 gespeichert.
- Wissenspflege soll keine impliziten ANSI- oder Codepage-Schreibpfade verwenden.
- Nach größeren Pflegearbeiten oder bei Verdacht auf Zeichensalat `npm run check:memory` ausführen.

## Primäre Quellen
- Primär gelten die in `01 Rohquellen` abgelegten Projektquellen aus dem Repository.
- Für Aussagen über den aktuellen Workspace-Stand sind Repo-Snapshots wie [[../01 Rohquellen/repo-root/workspace-status-2026-04-17]] zulässige Rohquellen.
- Bei Abweichungen zwischen älterer Doku und aktuellem Code wird der Konflikt sichtbar gemacht statt stillschweigend geglättet.

## Mindeststandard pro neuer Quelle
1. Quelle vollständig lesen oder vollständig auswerten.
2. Kernaussagen, Begriffe, Entscheidungen, Prozesse, Risiken und offene Punkte erfassen.
3. Bezug zu bestehenden Wissensseiten prüfen.
4. Betroffene Seiten aktualisieren oder neu anlegen.
5. Verlinkungen und Quellenbasis ergänzen.
6. Index aktualisieren und Log nach Relevanzregel ergänzen.
7. Beachten, dass eine einzelne Quelle mehrere Wissensseiten berühren kann; Aktualisierungen nicht auf eine reine Sammelseite reduzieren.

## Antwortregeln
- Antworten zum Projekt basieren primär auf dieser Wissensbasis.
- Antworten beginnen mit dem vorhandenen Wiki-Bestand, nicht mit erneuter Raw-Source-Suche.
- Dafür zuerst [[../02 Wissen/00 Uebersichten/Index]] lesen, dann relevante Wissensseiten, danach nur bei Bedarf Rohquellen oder externe Recherchen heranziehen.
- Wenn Aussagen nur historisch dokumentiert, aber nicht frisch verifiziert sind, wird das offengelegt.
- Wenn der aktuelle Workspace eine abweichende Lage zeigt, wird diese als eigener Stand markiert.
- Wenn aus einer Antwort wiederverwendbares Wissen entsteht, wird dieses als neue oder aktualisierte Wissensseite zurück in die Wissensbasis geführt.

## Bevorzugte Seitentypen
- Übersichten
- Begriffe und Konzepte
- Rollen
- Entscheidungen
- Prozesse
- Risiken und offene Punkte
- Quellenbewertungen

## Qualitätsregeln
- Keine unbelegten Vermutungen.
- Widersprüche sichtbar kennzeichnen.
- Fakten, Interpretation und offene Punkte trennen.
- Größere Themen bei Wachstum in Unterseiten aufteilen.

## Betriebsdateien
- `Index.md` ist ein inhaltsorientierter Katalog der wichtigsten Wissensseiten. Jeder Eintrag soll mindestens Link und Kurzbeschreibung tragen.
- `Log.md` ist chronologisch und append-only. Einträge sollen mit parsebarem Präfix beginnen, bevorzugt `## [YYYY-MM-DD] typ | titel`.
- Das Log ist kein vollständiges Tätigkeitsjournal. Es dokumentiert relevante Entwicklungsänderungen, Entscheidungen, Verifikationen, Risiken, Abschlussstände und wesentliche Projektvorgänge; Routine-Schritte und reine Nutzdaten- oder Spielstandaktionen bleiben normalerweise außerhalb des Projektlogs.
- Für externe Webquellen soll nach Möglichkeit ein lokaler Snapshot in `01 Rohquellen` abgelegt werden. Wenn das nicht möglich ist, wird mindestens eine Rohquellen-Referenz mit URL und Abrufdatum angelegt.

## Lint-Regeln
- regelmäßig auf Widersprüche, veraltete Aussagen, Orphan-Seiten, fehlende Querverweise, fehlende Pflichtabschnitte, defekte Links und Kodierungsfehler prüfen
- wichtige Konzepte ohne eigene Seite als Erweiterungskandidaten markieren
- aus Lint-Ergebnissen konkrete Korrekturhinweise ableiten, nicht nur allgemeine Warnungen
