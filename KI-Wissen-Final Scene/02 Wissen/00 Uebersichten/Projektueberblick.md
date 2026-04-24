---
typ: übersicht
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/repo-root/README.md
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14.md
tags:
  - projekt
  - überblick
---

# Projektüberblick

## Kurzfassung
`The Final Scene` ist ein browserbasiertes Einzelspieler-Rogue-like mit Horrorfilm-Thema. Der Spieler kämpft sich rundenbasiert durch prozedural erzeugte Studios, sammelt Loot, verwaltet Hunger und Ausrüstung und versucht tiefe Runs mit lokal gespeicherten Highscores zu erreichen.

## Quellenbasis
- [[../../01 Rohquellen/repo-root/README]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/gameplay-mechanics-2026-04-14]]

## Produktbild
- Genre: browserbasiertes Rogue-like ohne Frontend-Framework.
- Thema: sterbendes Movieverse mit Studiokomplex, Film-Archetypen und Horror-Anmutung.
- Spielerloop: Klasse wählen, Studio erkunden, kämpfen, Ressourcen verwalten, tiefer absteigen oder sterben.

## Zentrale Spielsysteme
- prozedurale Studio-Erzeugung mit branch-basiertem Layout
- rundenbasierter Kampf
- Loot, Waffen, Schilde und Raritäten
- Hunger- und Nahrungsmodell
- Fallen, Türen, Schlüssel und Raumkontrolle
- Save/Load und Highscores über `localStorage`

## Technische Grundform
- statisches HTML in `index.html`
- CSS in `styles.css`
- modularer JavaScript-Pfad unter `src/`
- Bundle-Build über `esbuild` nach `dist/game.bundle.js`
- E2E-Tests mit Playwright

## Wichtige Einordnung
Die vorhandene Doku beschreibt das Projekt bereits als spielbar und lokal verifizierbar. Für den heutigen Workspace-Stand gilt aber zusätzlich, dass viele lokale Änderungen offen sind und die Dokumentation deshalb nicht automatisch den exakten Live-Zustand der Arbeitskopie beschreibt.

## Verwandte Seiten
- [[Systemlandkarte]]
- [[Aktueller Projektstatus]]
- [[../Begriffe und Konzepte/Spielsysteme im Ueberblick]]

