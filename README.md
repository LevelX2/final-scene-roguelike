# The Final Scene

Fight Through a Dying Movieverse

Browserbasiertes Rogue-like mit gebuendeltem Browser-Build.

## Start

1. Abhaengigkeiten installieren: `npm install`
2. Browser-Bundle bauen: `npm run build`
3. Danach `index.html` im Browser oeffnen

Die aktive Quelle der Wahrheit fuer den Browser-Build ist `src/main_v2.mjs`. `index.html` laedt das erzeugte Artefakt `dist/game.bundle.js`.

Die Dateien ohne `_v2` im `src/`-Ordner sind nur noch Legacy-Referenzen und nicht der aktive Runtime-Pfad.

## Verifikation

- Syntax-Pruefung: `npm run check:js`
- E2E-Tests: `npm run test:e2e`

## Steuerung

- `WASD` oder Pfeiltasten: bewegen
- `Leertaste`: warten
- `H`: Heiltrank aus dem Inventar trinken
- `I`: Inventar als Overlay oeffnen
- `R`: neues Spiel starten

## Ziel

Heiltraenke einsammeln, beim Aufheben zwischen sofort trinken oder einlagern waehlen, Goblins besiegen und Treppen zwischen den Ebenen strategisch nutzen. Nach dem Tod landet dein Lauf in der lokalen Highscore-Liste.
