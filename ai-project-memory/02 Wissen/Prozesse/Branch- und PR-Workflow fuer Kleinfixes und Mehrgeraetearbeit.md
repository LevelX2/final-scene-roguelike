---
typ: prozess
status: aktiv
letzte_aktualisierung: 2026-04-24
quellen:
  - ../../01 Rohquellen/repo-root/workspace-status-2026-04-24-branching.txt
  - ../../00 Steuerung/Regeldatei KI-Wissenspflege.md
  - ../../02 Wissen/Prozesse/Arbeitsworkflow Wissenspflege und Projektanfragen.md
tags:
  - git
  - github
  - branch-workflow
  - pull-request
  - mehrgeraetearbeit
---

# Branch- und PR-Workflow fuer Kleinfixes und Mehrgeraetearbeit

## Kurzfassung
Arbeit soll in diesem Projekt standardmäßig nicht direkt auf `main` entstehen. Für zusammenhängende Kleinfixes ist ein gemeinsamer Arbeitsbranch sinnvoll; unterschiedliche Themen gehören auf getrennte Branches oder mindestens in klar getrennte Commits. `main` bleibt der saubere Integrationsstand, Branches werden nach GitHub gepusht und von dort per Pull Request nach `main` gemerged.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/workspace-status-2026-04-24-branching]]
- [[../../00 Steuerung/Regeldatei KI-Wissenspflege]]
- [[Arbeitsworkflow Wissenspflege und Projektanfragen]]

## Zielbild
- `main` spiegelt den aktuellen Integrationsstand aus GitHub.
- Neue Arbeit entsteht auf thematischen Branches wie `fix/...`, `feature/...`, `docs/...` oder `chore/...`.
- GitHub dient als gemeinsamer Zwischenstand zwischen mehreren Rechnern.
- Merges nach `main` passieren erst, wenn ein Thema in sich stimmig ist.

## Standardablauf fuer ein zusammenhaengendes Thema
1. `git switch main`
2. `git pull --ff-only`
3. `git switch -c fix/<thema>` oder `docs/<thema>`
4. Änderungen lokal in sinnvolle Commits aufteilen
5. Branch mit `git push -u origin <branch>` nach GitHub hochladen
6. Pull Request gegen `main` öffnen
7. Erst nach Review oder eigener Freigabe nach `main` mergen
8. Danach lokal wieder `main` aktualisieren und den Arbeitsbranch bei Bedarf löschen

## Wie gross ein Branch sein darf
- Zehn kleine Verbesserungen mit gemeinsamem Thema dürfen zusammen auf einen Branch.
- Wenn die Änderungen fachlich nicht zusammenhängen, sind getrennte Branches besser.
- Wenn ein gemeinsamer Branch trotzdem sinnvoll ist, sollten die Commits die Teilthemen sauber trennen.

## Mehrgeraetearbeit mit zwei Rechnern
### Gleiches Thema auf beiden Rechnern
1. Auf Rechner A den Arbeitsbranch anlegen und früh nach GitHub pushen.
2. Auf Rechner B `git fetch origin` ausführen.
3. Auf Rechner B denselben Branch auschecken.
4. Vor neuer Arbeit den Branch zuerst auf den GitHub-Stand bringen, bevorzugt per `git pull --rebase` oder per Fast-Forward, wenn noch keine lokalen Commits vorliegen.
5. Weitere Änderungen wieder auf denselben Branch committen und pushen.

### Unterschiedliche Themen auf zwei Rechnern
- Pro Thema einen eigenen Branch verwenden.
- Neue Branches immer von aktuellem `main` oder `origin/main` ableiten.
- Nicht mehrere unabhängige Themen auf demselben Arbeitsbranch mischen.

## Was vermieden werden soll
- Nicht direkt auf `main` entwickeln, wenn die Änderung mehr als eine triviale Sofortkorrektur ist.
- Nicht erst lokal nach `main` mergen und dann `main` nach GitHub pushen.
- Nicht auf zwei Rechnern parallel unterschiedliche Themen auf demselben unstrukturierten Stand fortführen.
- Nicht warten, bis ein großer Block fertig ist, bevor der Branch das erste Mal nach GitHub gepusht wird.

## Praktische Ausnahme
- Sehr kleine Einzelkorrekturen in einem reinen Solo-Kontext können theoretisch direkt auf `main` passieren.
- Auch dann bleibt ein kurzer Fix-Branch meistens die robustere Gewohnheit, weil Review, Rückbau und Gerätewechsel einfacher werden.

## Wiederherstellung bei divergentem `main`
- Wenn lokales `main` vor und hinter `origin/main` liegt, sollten lokale Commits zuerst auf einem Sicherungs- oder Themenbranch bewahrt werden.
- Danach kann `main` gezielt wieder auf `origin/main` ausgerichtet werden.
- Der verifizierte Workspace-Stand vom 2026-04-24 zeigt genau dieses Muster:
  - `main` wurde auf `origin/main` zurückgeführt
  - die beiden lokalen Dokumentations-Commits leben auf `codex/finito-knowledge-base-rename`
  - der frühere lokale `main` wurde zusätzlich auf `codex/backup-main-pre-sync-2026-04-24` gesichert

## Wirkung
- Änderungen bleiben thematisch sauber und leichter reviewbar.
- GitHub wird zum verlässlichen Übergabepunkt zwischen Rechnern.
- `main` bleibt lesbar, stabil und näher am tatsächlichen Integrationsstand.

## Verwandte Seiten
- [[Arbeitsworkflow Wissenspflege und Projektanfragen]]
- [[Build Test und lokaler Start]]
- [[../../03 Betrieb/Log]]
