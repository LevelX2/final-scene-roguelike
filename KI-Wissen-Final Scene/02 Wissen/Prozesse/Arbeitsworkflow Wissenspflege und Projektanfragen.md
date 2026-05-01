---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-24
quellen:
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - ../../02 Wissen/Prozesse/Quellenverarbeitung in dieser Wissensbasis.md
  - ../../02 Wissen/Prozesse/Wiki-first Query und Linting.md
  - ../../../AGENTS.md
tags:
  - workflow
  - wissenspflege
  - projektarbeit
---

# Arbeitsworkflow Wissenspflege und Projektanfragen

## Kurzfassung
Dieser Workflow beschreibt, wie die Wissensbasis im Alltag genutzt und gepflegt wird. Er stellt sicher, dass neue Informationen nicht im Chat verloren gehen und dass Antworten sowie Projektaufgaben zuerst auf dem vorhandenen Wissensbestand aufbauen.

## Quellenbasis
- [[../../00 Steuerung/Regeldatei KI-Wissenspflege]]
- [[Quellenverarbeitung in dieser Wissensbasis]]
- [[Wiki-first Query und Linting]]

## Zielbild
- Neue Quellen werden als Rohquellen aufgenommen und in bestehendes Wissen integriert.
- Projektfragen werden zuerst gegen die Wissensbasis beantwortet.
- Wiederverwendbare Ergebnisse aus Analysen, Entscheidungen oder Aufgaben fließen zurück in die Wissensbasis.

## Wann der Workflow genutzt wird
- wenn eine neue Quelle zum Projekt auftaucht
- wenn eine Frage zum Projekt beantwortet werden soll
- wenn durch eine Aufgabe neues belastbares Projektwissen entsteht
- wenn die Wissensbasis auf Konsistenz oder Vollständigkeit geprüft werden soll

## Fall 1: Neue Quelle aufnehmen
### Typischer Auslöser
- Du gibst mir eine Datei, einen Pfad oder einen Link und sagst sinngemäß: `Nimm das in die Projekt-Wissensbasis auf.`

### Ablauf
1. Quelle in `01 Rohquellen` ablegen oder als Rohquellen-Referenz erfassen.
2. Quelle vollständig lesen oder vollständig auswerten.
3. Betroffene Wissensseiten im Index und im bestehenden Wiki identifizieren.
4. Bestehende Seiten aktualisieren oder neue Seiten anlegen.
5. Verlinkungen und Quellenbasis ergänzen.
6. Index aktualisieren, falls neue relevante Seiten entstanden sind.
7. Log nach Relevanzregel aktualisieren.

### Wirkung
- Die Information bleibt dauerhaft dokumentiert.
- Spätere Antworten müssen die Quelle nicht erneut von null rekonstruieren.
- Widersprüche oder neue Erkenntnisse werden sichtbar.

## Fall 2: Frage zum Projekt beantworten
### Typischer Auslöser
- Du fragst nach Architektur, Gameplay, Build, Risiken, Balancing oder aktuellem Projektstand.

### Ablauf
1. Zuerst [[../00 Uebersichten/Index]] lesen.
2. Relevante Wissensseiten im Zusammenhang lesen.
3. Nur bei Bedarf Rohquellen oder frische Code-/Webquellen hinzuziehen.
4. Antwort mit klarer Trennung von gesichertem Wissen, Unsicherheit und offenem Punkt formulieren.
5. Wenn aus der Antwort neues wiederverwendbares Wissen entsteht, dieses zurück in die Wissensbasis führen.

### Wirkung
- Antworten sind konsistenter.
- Vorwissen aus früheren Quellen und Analysen wird aktiv wiederverwendet.
- Die Wissensbasis wird zum echten Arbeitsgedächtnis des Projekts.

## Fall 3: Erkenntnisse aus einer Aufgabe zurückführen
### Typischer Auslöser
- Wir haben ein Problem analysiert, eine Entscheidung getroffen, ein Risiko geklärt oder ein System verstanden.

### Ablauf
1. Prüfen, ob das Ergebnis wiederverwendbar ist.
2. Passende Wissensseite aktualisieren oder neue Seite anlegen.
3. Quellenbasis ergänzen:
   - Chat-Ergebnis nur dann, wenn es auf klar benennbaren Projektquellen oder verifizierter Analyse beruht.
   - Bei Codebezug bevorzugt auf Repo-Quellen oder konkrete Dateien verweisen.
4. Index nachziehen und Log nur bei relevanter Entwicklungsänderung, Entscheidung, Verifikation, Risiko oder Abschlussstand ergänzen.

### Wirkung
- Erkenntnisse verschwinden nicht im Chatverlauf.
- Das Projektwissen wächst mit jeder ernsthaften Analyse.

## Fall 4: Wissensbasis health-checken
### Typischer Auslöser
- Du sagst sinngemäß: `Prüfe die Wissensbasis` oder `Mach einen Lint-Check`.

### Ablauf
1. Index, Log und Stichproben aus den Wissensseiten lesen.
2. Auf Widersprüche, Orphans, defekte Links, fehlende Pflichtabschnitte, veraltete Aussagen und Kodierungsprobleme prüfen.
3. Dafür bei technischen Checks bevorzugt `npm run check:memory` verwenden, damit UTF-8-Fehler und Mojibake nicht still in Log oder Wissensseiten stehen bleiben.
4. Konkrete Korrekturhinweise in [[../../03 Betrieb/Qualitaetspruefung]] dokumentieren.
5. Wenn sinnvoll, fehlende Verlinkungen oder kleinere Strukturkorrekturen direkt nachziehen.

### Wirkung
- Die Wissensbasis bleibt navigierbar und vertrauenswürdig.
- Pflegeprobleme werden früh sichtbar, bevor sie sich stapeln.

## Fall 5: Thread mit Abschlusskommando abschließen
### Typischer Auslöser
- Du schreibst `Finito`, `Finale`, `Endfinale` oder `Ende`, um den aktuellen Thread kontrolliert abzuschließen.

### Ablauf bei `Finito` oder `Ende`
1. Die globale Detailsequenz liegt im Haupt-Vault-Skill `abschlusskommandos`.
2. Projektlokal gilt: Änderungen in sinnvolle Commit-Blöcke aufteilen, nur abgeschlossene Teile committen, nötige Wissenspflege nachziehen und offene Punkte kompakt benennen.
3. Uncommittete Änderungen, die erkennbar nicht zu diesem Thread gehören, höchstens als kurzen Hinweis aufführen, aber nicht als automatischen Blocker behandeln.

### Ablauf bei `Finale`
1. Zuerst `Finito` ausführen.
2. Wenn keine relevanten offenen Punkte, roten Checks oder Merge-Konflikte bestehen, den Arbeitsbranch nach Projektregel nach `main` überführen oder den PR-Weg nutzen.
3. Nach dem Merge passende Checks erneut ausführen.
4. Wenn der Merge und die Checks erfolgreich sind, `main` nach GitHub pushen oder den Pull Request aktualisieren.
5. Branches nur nach den globalen Aufräumregeln löschen.
6. Bei roten Checks, Merge-Konflikten, riskantem Push oder fachlichen offenen Punkten stoppen und nachfragen.

### Ablauf bei `Endfinale`
1. Zuerst den erweiterten Verify-Lauf ausführen.
2. Nur bei Erfolg `Finale` ausführen.
3. Danach je nach Lage `npm run check:memory`, Aktualisierung relevanter Status- oder Risikoseiten und eine kompakte Abschlussnotiz verwenden.

### Wirkung
- Der Thread endet mit klarer Commit-Struktur statt mit einem unscharfen Sammelabschluss.
- Wissenspflege wird beim Abschluss nicht vergessen, sondern als Teil der Abnahme mitgeführt.
- Offene Entscheidungen bleiben sichtbar, statt versehentlich in Commits eingebacken zu werden.
- Bei `Finale` und `Endfinale` wird der Stand für Mehrgerätearbeit über `origin/main` oder den projektkonformen PR-Weg verfügbar gemacht.

## Empfohlene Kurzbefehle für den Alltag
- `Nimm diese Quelle in die Projekt-Wissensbasis auf.`
- `Beantworte das wiki-first aus der Projekt-Wissensbasis.`
- `Führe dieses Ergebnis als Projektwissen in die Wissensbasis zurück.`
- `Mach einen Lint-Check für die Wissensbasis.`
- `Finito`
- `Finale`
- `Endfinale`
- `Ende`

## Was der Workflow nicht automatisch tut
- Er pflegt die Wissensbasis nicht unsichtbar im Hintergrund ohne Anlass.
- Er ersetzt keine frische Verifikation, wenn sich Code oder Projektlage geändert haben.
- Er macht aus unklaren Aussagen keine gesicherten Fakten.

## Verwandte Seiten
- [[Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit]]
- [[Quellenverarbeitung in dieser Wissensbasis]]
- [[Wiki-first Query und Linting]]
- [[../../03 Betrieb/Log]]
- [[../../03 Betrieb/Qualitaetspruefung]]
