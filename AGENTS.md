# Projekt Rogue Agent Instructions

## Projektbezogene Wissensbasis

Für dieses Repository existiert eine projektbezogene KI-Wissensbasis im Ordner:

`KI-Wissen-Final Scene/`

Bei neuen Threads, neuen Aufgaben und Projektfragen ist diese Wissensbasis primär zu verwenden.

## Pflicht-Einstieg für neue Threads

Zu Beginn projektbezogener Arbeit zuerst diese Dateien lesen:

1. `KI-Wissen-Final Scene/00 Projektstart.md`
2. `KI-Wissen-Final Scene/02 Wissen/00 Uebersichten/Index.md`
3. `KI-Wissen-Final Scene/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
4. `KI-Wissen-Final Scene/00 Steuerung/Regeldatei KI-Wissenspflege.md`

## Arbeitsmodus

- Arbeite `wiki-first`.
- Beantworte Projektfragen zuerst aus dem vorhandenen Wissensbestand.
- Ziehe Rohquellen, Repository-Dateien oder Webquellen nur dann nach, wenn die Wissensbasis Lücken hat, veraltet ist oder verifiziert werden muss.
- Wenn neue belastbare Erkenntnisse entstehen, führe sie in die Wissensbasis zurück.

## Branch-Automatik

- `main` ist der Integrationsbranch. Wenn der Agent auf `main` steht und eine Arbeitsänderung an Dateien vornehmen soll, erstellt er vor der ersten Änderung automatisch einen Arbeitsbranch mit Präfix `codex/`.
- Reine Lese-, Prüf- und Statusbefehle dürfen auf `main` ausgeführt werden.
- Eine direkte Arbeitsänderung auf `main` ist nur zulässig, wenn der Nutzer sie ausdrücklich verlangt.
- Arbeitsbranches sollen kurz, thematisch und verständlich benannt werden, zum Beispiel `codex/finale-workflow-commands`.

## Sprachregeln

- Sichtbare UI-Texte sollen echtes Deutsch mit Umlauten und `ß` verwenden.
- In Fließtexten, Beschreibungen und Überschriften der Wissensbasis sollen echte Umlaute verwendet werden:
  `ä` statt `ae`, `ö` statt `oe`, `ü` statt `ue`, `Ä` statt `Ae`, `Ö` statt `Oe`, `Ü` statt `Ue`, `ß` statt `ss`, sofern es sich um normales Deutsch handelt.
- Ausnahmen:
  Dateinamen, Pfade, Code-Symbole, IDs, technische Bezeichner, Markdown-Links auf bestehende Dateien und originale Quellzitate bleiben in ihrer technischen oder originalen Schreibweise.

## Wissenspflege bei neuen Quellen

Wenn neue Projektquellen hinzukommen:

1. als Rohquelle in die Wissensbasis aufnehmen
2. vollständig lesen oder vollständig auswerten
3. betroffene Wissensseiten aktualisieren oder neu anlegen
4. Index aktualisieren
5. Log aktualisieren

## Wichtige Betriebsregeln

- Rohquellen bleiben unverändert.
- Widersprüche zwischen neuen Quellen und bestehendem Wissen sichtbar machen, nicht stillschweigend überschreiben.
- Zwischen dokumentiertem Projektstand und aktuellem Workspace-Stand unterscheiden, wenn offene lokale Änderungen vorliegen.
- Wiederverwendbare Antworten, Entscheidungen, Analysen oder Risikoerklärungen nicht nur im Chat belassen, sondern als Wissensseiten oder Aktualisierungen zurückführen.

## Abschlusskommandos

Wenn der Nutzer `Finito`, `Ende`, `Finale` oder `Endfinale` schreibt, gelten grundsätzlich die globalen Abschlusskommandos aus dem Skill `abschlusskommandos`.

Das persönliche Haupt-Vault `mein-wissen` wird auf den Systemen des Nutzers vorausgesetzt. Wenn der Skill lokal nicht installiert ist, soll `mein-wissen` über `MEIN_WISSEN_PATH` oder typische OneDrive-Pfade gesucht und der Skill aus `07 Codex/skills/abschlusskommandos/` installiert werden. Private absolute Pfade gehören nicht in diese commitbare Datei.

Wenn diese globale Auflösung nicht verfügbar ist, gilt als lokaler Minimalkontrakt:

- `Finito` oder `Ende`: lokaler Abschluss ohne automatischen Merge und ohne automatischen Push; offene Änderungen und untracked Dateien prüfen, abgeschlossene Änderungen in sinnvolle Commit-Blöcke aufteilen, committen und offene Punkte kompakt benennen.
- `Finale`: zuerst denselben lokalen Abschluss wie bei `Finito` durchführen; wenn nichts Relevantes offen ist, nach Projektregel nach `main` integrieren und bei eindeutigem Remote/GitHub-Modell pushen oder einen Pull Request erstellen.
- `Endfinale`: zuerst erweiterten Verify-Lauf ausführen; nur bei Erfolg `Finale` ausführen; danach Wissenspflege-, Status- und Restpunkteprüfung nachziehen.

Für dieses Projekt gilt ergänzend:

- `main` ist der Integrationsbranch.
- Force-Push ist nicht Teil von `Finale`.
- Lokale und remote Arbeitsbranches dürfen nur aufgeräumt werden, wenn sie vollständig gemerged sind, seit mindestens drei Tagen nicht mehr verwendet wurden und kein offener Pull Request oder abweichender Remote-Stand dagegen spricht.
- Projektspezifische Branch- und PR-Regeln stehen in der Wissensbasis unter `KI-Wissen-Final Scene/02 Wissen/Prozesse/Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit.md`.

## Wichtige Wissensbasis-Dateien

- Einstieg: `KI-Wissen-Final Scene/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `KI-Wissen-Final Scene/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `KI-Wissen-Final Scene/03 Betrieb/Log.md`
- Qualitätsprüfung: `KI-Wissen-Final Scene/03 Betrieb/Qualitaetspruefung.md`
