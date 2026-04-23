---
typ: risiko
status: aktiv
letzte_aktualisierung: 2026-04-17
quellen:
  - ../../01 Rohquellen/docs/js-architecture-report.md
  - ../../01 Rohquellen/docs/project-overview.md
  - ../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17.md
tags:
  - risiko
  - architektur
---

# Architektur und Wartbarkeit

## Kurzfassung
Das grösste strukturelle Risiko ist nicht fehlende Funktion, sondern wachsende Kopplung an zentrale Verdrahtungs- und Kompositionsmodule. Dokumentierte Schwerpunktstellen sind vor allem `main.mjs` und `dungeon.mjs`.

## Quellenbasis
- [[../../01 Rohquellen/docs/js-architecture-report]]
- [[../../01 Rohquellen/docs/project-overview]]
- [[../../01 Rohquellen/docs/balancing-bestandsaufnahme-2026-04-17]]

## Risikoaussagen
- Neu Features können wieder an denselben Zentralstellen andocken.
- Domain-Logik, UI-Logik und Runtime-Verdrahtung sind noch nicht überall sauber getrennt.
- Legacy-Referenzen bleiben als potenzielle Driftquelle im Repository.
- Mehrere Systeme enthalten noch implizite Defaults oder hart codierte Sonderregeln.

## Besonders beobachtenswerte Bereiche
- `src/main.mjs`
- `src/dungeon.mjs`
- verteilte KI-Schwellenwerte
- halbverdrahtete oder tote Effektfelder

## Relevanz für Wissenspflege
- Architekturwissen sollte nicht nur Ordner nennen, sondern auch Spannungen und Engpässe festhalten.
- Quellen zur Architektur müssen später regelmäßig gegen den echten Codezustand abgeglichen werden.

## Verwandte Seiten
- [[../00 Uebersichten/Systemlandkarte]]
- [[../Entscheidungen/Aktiver Runtime-Pfad und Legacy-Abgrenzung]]
- [[Dokumentationsstand und Verifikationsluecken]]

