---
typ: begriff
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
  - ../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17.md
tags:
  - balancing
  - fundament
  - systemdesign
---

# Balancing-Fundament und Vereinheitlichungsprinzipien

## Kurzfassung
Das Projekt verfolgt für künftiges zentrales Balancing nicht zuerst den Bau eines Balancing-UIs, sondern die Vereinheitlichung der Runtime-Grundlagen. Ziel ist ein System, in dem Kampfkraft, Progression, Itemwirkung und Gegnerverhalten aus klaren Ableitungsschichten und stabilen Gruppen hervorgehen.

## Quellenbasis
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]
- [[../../01 Rohquellen/docs/balancing-foundation-rationale-2026-04-17]]

## Leitidee
Zentrales Balancing wird als Folge sauberer Modellierung verstanden, nicht als nachträgliche Schicht über verstreute Sonderlogik. Ein späterer Regler oder Simulationsscreen soll auf Werte und Gruppen zugreifen können, die bereits im aktiven Modell sichtbar und konsistent sind.

## Vier Grundprinzipien
- Werte sollen abgeleitet werden statt zufällig an mehreren Stellen anzufallen.
- Gruppen sollen Runtime-Eigenschaften sein statt nur implizite Kategorien.
- Wirkungen sollen möglichst nur eine kanonische Runtime-Form haben.
- Sonderfälle sollen bewusst begrenzt und klar erkennbar bleiben.

## Praktische Zielbilder
- Balancing soll auf Gruppen statt nur auf Einzelfälle zugreifen können.
- Simulation und Test-Snapshots sollen dieselbe Gruppensprache sprechen wie das aktive Spiel.
- Justierungen sollen an additiven oder prozentualen Achsen ansetzen können.
- Bestehende Inhalte, auch Legacy-Inhalte, sollen erhalten bleiben, aber sauberer eingebunden werden.

## Bedeutung für das Projekt
- Die jüngsten Umbauten sind nicht nur Refactoring, sondern Vorbereitung für künftige globale oder partielle Balancing-Regler.
- Diese Quelle erklärt das "Warum" hinter Änderungen, die in der Bestandsaufnahme eher technisch und systemisch beschrieben werden.
- Für spätere Designentscheidungen ist diese Rationale wichtig, damit neu Sonderfälle nicht die Justierbarkeit wieder unterlaufen.

## Verwandte Seiten
- [[Spielsysteme im Ueberblick]]
- [[../Risiken und offene Punkte/Architektur und Wartbarkeit]]
- [[../Risiken und offene Punkte/Dokumentationsstand und Verifikationsluecken]]
- [[../Quellenbewertungen/Balancing Foundation Rationale Bewertung]]

