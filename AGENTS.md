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

Wenn der Nutzer `Finito`, `Finale`, `Endfinale` oder `Ende` schreibt, führt der Agent die passende Abschlusssequenz für den aktuellen Thread aus.

### `Finito` oder `Ende`

Lokaler Abschluss ohne automatischen Merge nach `main` und ohne automatischen Push.

1. Der Agent teilt die Änderungen in sinnvolle Commit-Blöcke auf. Nicht direkt zusammenhängende Änderungen sollen in getrennten Commits mit jeweils eigener passender Commit-Message landen.
2. Der Agent committet alle Teile, zu denen keine offenen Fragen mehr bestehen und die fachlich wie technisch konsistent abgeschlossen sind.
3. Nötige Anpassungen am KI-Wissen werden nach den sonstigen Wissensregeln nachgezogen, dokumentiert und ebenfalls committed.
4. Verbleibende offene Fragen, Konflikte oder bewusste Entscheidungsbedarfe werden danach kompakt benannt.

Zusätzlich gilt:

- Teile, die noch von offenen Fragen abhängen, sollen nicht vorschnell committed werden.
- Uncommittete Änderungen, die erkennbar nicht zu diesem Thread gehören, sind kein automatischer Blocker und können am Ende kurz als Hinweis genannt werden.
- Gemachte Commits sollen im Abschluss jeweils in einer eigenen Zeile mit ihrer Commit-Message genannt werden, damit sie schnell erkennbar sind.
- Wenn nach der Finito-Sequenz keine relevanten offenen Punkte mehr für diesen Thread übrig sind, gilt der Thread als abgeschlossen und archivierungsreif.

### `Finale`

Vollständiger Arbeitsabschluss.

1. Der Agent führt zuerst die `Finito`-Sequenz aus.
2. Wenn keine relevanten offenen Punkte, roten Checks oder Merge-Konflikte bestehen, wechselt der Agent nach `main`.
3. Der Agent aktualisiert `main` per Fast-Forward, soweit möglich.
4. Der Agent merged den Arbeitsbranch nach `main`.
5. Der Agent führt die passenden Checks erneut aus.
6. Wenn der Merge und die Checks erfolgreich sind, pusht der Agent `main`.
7. Erfolgreich gemergte Arbeitsbranches dürfen lokal und remote aufgeräumt werden.

Der Agent stoppt und fragt nach, wenn Tests oder Checks fehlschlagen, ein Merge-Konflikt entsteht, ein Push nicht ohne Risiko möglich ist oder fachliche offene Punkte bestehen. Force-Push ist nicht Teil von `Finale`.

### `Endfinale`

Großer Projektabschluss.

`Endfinale` umfasst `Finale` und zusätzlich einen bewussten Abschluss-Check: vollständigerer Verify-Lauf, Wissensbasis-Check, Aktualisierung relevanter Projektstatus- oder Risikoseiten und kompakte Benennung verbleibender Projektfragen.

## Wichtige Wissensbasis-Dateien

- Einstieg: `KI-Wissen-Final Scene/02 Wissen/00 Uebersichten/Index.md`
- Workflow: `KI-Wissen-Final Scene/02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md`
- Log: `KI-Wissen-Final Scene/03 Betrieb/Log.md`
- Qualitätsprüfung: `KI-Wissen-Final Scene/03 Betrieb/Qualitaetspruefung.md`
