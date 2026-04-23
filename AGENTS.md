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

## Finito-Sequenz

Wenn der Nutzer `Finito` oder `Ende` schreibt, führt der Agent die Abschlusssequenz für den aktuellen Thread aus.

1. Der Agent teilt die Änderungen in sinnvolle Commit-Blöcke auf. Nicht direkt zusammenhängende Änderungen sollen in getrennten Commits mit jeweils eigener passender Commit-Message landen.
2. Der Agent committet alle Teile, zu denen keine offenen Fragen mehr bestehen und die fachlich wie technisch konsistent abgeschlossen sind.
3. Nötige Anpassungen am KI-Wissen werden nach den sonstigen Wissensregeln nachgezogen, dokumentiert und ebenfalls committed.
4. Verbleibende offene Fragen, Konflikte oder bewusste Entscheidungsbedarfe werden danach kompakt benannt.

Zusätzlich gilt:

- Teile, die noch von offenen Fragen abhängen, sollen nicht vorschnell committed werden.
- Uncommittete Änderungen, die erkennbar nicht zu diesem Thread gehören, sind kein automatischer Blocker und können am Ende kurz als Hinweis genannt werden.
- Gemachte Commits sollen im Abschluss jeweils in einer eigenen Zeile mit ihrer Commit-Message genannt werden, damit sie schnell erkennbar sind.
- Wenn nach der Finito-Sequenz keine relevanten offenen Punkte mehr für diesen Thread übrig sind, gilt der Thread als abgeschlossen und archivierungsreif.

## Wichtige Wissensbasis-Dateien

- Einstieg: `KI-Wissen-Final Scene/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `KI-Wissen-Final Scene/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `KI-Wissen-Final Scene/03 Betrieb/Log.md`
- Qualitätsprüfung: `KI-Wissen-Final Scene/03 Betrieb/Qualitaetspruefung.md`
