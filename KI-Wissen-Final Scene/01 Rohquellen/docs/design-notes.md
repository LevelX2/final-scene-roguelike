# Design Notes

## Hunger und Nahrung

- Die aktuelle UI zeigt fuer Nahrung bewusst nur den Hungerzustand.
- Es gibt keine exakten sichtbaren Reserven und keine exakten Nahrungswerte pro Item in der Standardansicht.
- Nahrung wird ueber grobe Schaetzungen beschrieben, zum Beispiel `Stillt wenig.` oder `Macht ordentlich satt.`
- Wenn Essen wegen Ueberfuellung teilweise verpufft, soll das als Rueckmeldung sichtbar werden.

## Spaeteres Tag- und Talentsystem

- Fuer spaetere Builds ist ein Tag- oder Faehigkeitssystem vorgesehen.
- Ein sinnvoller Pfad waere ein Klassenbaum oder allgemeiner Talentbaum beim Levelaufstieg.
- Solche Tags koennen Informationsvorteile freischalten, zum Beispiel genauere Einschaetzungen von Nahrung oder anderen Systemwerten.
- Diese Idee ist hier nur als Designrichtung festgehalten und noch nicht technisch umgesetzt.

## Initiative und Angriffsreihenfolge

- Fuer spaetere Kampfdesigns soll klar entschieden werden, wer in einem direkten Schlagabtausch zuerst angreift.
- Aktuell wirkt es so, als wuerden beide Seiten im Zweifel gleichzeitig handeln. Kuenftig sollte die Reihenfolge explizit ueber einen Initiativwert entschieden werden.
- Dieser Wert kann ganz oder teilweise aus bestehenden Attributen abgeleitet werden, zum Beispiel ueber Reaktion, Geschwindigkeit oder aehnliche Kampfwerte.
- Optional kann ein kleiner Gluecksfaktor dazukommen, damit gleiche oder sehr nahe Werte nicht immer identisch aufgeloest werden.
- Offene Designfrage: Der Gluecksfaktor sollte klein genug bleiben, damit hohe Initiative spuerbar verlaesslich bleibt und nicht von Zufall ueberlagert wird.

## Geschwindigkeit als Aktionsrhythmus

- Der Spieler soll als Grundannahme eine Geschwindigkeit von `100` haben.
- Gegner koennen etwas langsamer oder schneller sein, zum Beispiel `75`, `90`, `110` oder `125`.
- Geschwindigkeit soll nicht nur bedeuten, dass jemand pauschal "seltener" dran ist, sondern in einen nachvollziehbaren Aktionsrhythmus uebersetzt werden.
- Designidee: Jede Einheit sammelt pro Takt oder Zug ihren Geschwindigkeitswert als Fortschritt an. Immer wenn dabei eine weitere `100`er-Schwelle erreicht wird, darf sie eine Aktion ausfuehren.
- Dadurch bleibt `100` der klare Standard fuer normales Tempo, waehrend langsamere oder schnellere Werte sauber interpolieren.

Beispiel fuer `75` Geschwindigkeit:

- Nach 1 Aufladung: `75` Fortschritt, noch keine Aktion
- Nach 2 Aufladungen: `150` Fortschritt, erste Aktion moeglich
- Nach 3 Aufladungen: `225` Fortschritt, zweite Aktion moeglich
- Nach 4 Aufladungen: `300` Fortschritt, dritte Aktion moeglich
- Nach 5 Aufladungen: `375` Fortschritt, noch keine neue Aktion
- Nach 6 Aufladungen: `450` Fortschritt, vierte Aktion moeglich

- So entsteht bei `75` effektiv das Gefuehl, dass drei Aktionen noch relativ gleichmaessig passieren, dann aber eine Verzoegerung gegenueber einer Einheit mit `100` entsteht.
- Das System eignet sich auch fuer schnellere Gegner ueber `100`, weil diese entsprechend frueher oder haeufiger ihre naechste Aktionsschwelle erreichen.
- Offene Designfrage: Es muss spaeter entschieden werden, was genau als "Takt" zaehlt und ob Bewegung, Angriff und Spezialaktionen jeweils dieselben Kosten von `100` haben oder unterschiedlich teuer sind.

## Spaetere 8-Richtungs-Bewegung

- Als moegliche spaetere Designerweiterung soll Bewegung nicht auf die vier Kardinalrichtungen beschraenkt bleiben.
- Spieler und Monster koennten sich kuenftig in alle acht Richtungen bewegen, also auch diagonal.
- Das wuerde Wegfindung, Verfolgung, Flucht und Stellungsspiel natuerlicher wirken lassen.
- Diese Idee ist ausdruecklich noch nicht beschlossen und noch nicht technisch umgesetzt.
- Offene Designfrage: Es muss spaeter festgelegt werden, ob diagonale Bewegung dieselben Kosten wie orthogonale Bewegung hat oder leicht teurer sein soll.
- Offene Designfrage: Sicht, Kollisionsregeln, Tueren und Engstellen muessen dann konsistent auf die 8-Richtungs-Bewegung abgestimmt werden.

## Spaeteres freieres Zielen mit Fernkampf

- Als moegliche spaetere Designerweiterung soll Fernkampf nicht nur auf die heutigen reinen Geraden beschraenkt bleiben.
- Denkbar ist, dass man kuenftig in alle Richtungen schiessen kann, also auch diagonal oder auf leicht versetzte Ziele wie `2 nach vorn, 1 zur Seite`.
- Das waere geometrisch intuitiver und wuerde Fernkampf logischer wirken lassen als die aktuelle harte Linienregel.
- Diese Idee ist ausdruecklich noch nicht beschlossen und noch nicht technisch umgesetzt.
- Wichtiges Balancing-Risiko: Freieres Zielen macht Fernkampf deutlich staerker, fuer Spieler wie fuer Monster.
- Offene Designfrage: Falls diese Idee spaeter umgesetzt wird, braucht Fernkampf sehr wahrscheinlich neue Ausgleichsregeln, zum Beispiel geringeren Schaden, strengere Sichtblocker, Munitions- oder Cooldown-Druck, Zielaufschlaege je nach Winkel oder eine staerkere Begrenzung bei fruehen Gegnern.
