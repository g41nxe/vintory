# „Im Besitz“ wird aus der Anzahl abgeleitet

Vintory dient als Verkostungstagebuch und als Weinkeller zugleich. Für das Tagebuch reicht „im Besitz ja/nein“, für den Keller braucht es die Anzahl. Statt eines neuen Feldes gilt: Ein Wein ist im Besitz, wenn seine Anzahl größer als 0 ist. Der Schalter „Im Besitz“ setzt die Anzahl auf 1 bzw. 0, und erst bei „ja“ zeigt die App die Anzahl an.

## Betrachtete Optionen

- **Neues Feld `owned` neben der Anzahl**: zwei Felder, die sich widersprechen können (im Besitz, aber 0 Flaschen), und eine Migration für alle bestehenden Weine.
- **Anzahl ganz entfernen**: hätte Keller-Nutzern ihre Flaschenzahlen genommen.
- **Modus-Einstellung pro Gerät (Keller/Tagebuch)**: zwei Oberflächen zu pflegen für wenig Gewinn.

## Konsequenzen

- Keine Datenmigration: Bestehende Weine mit Flaschen sind automatisch im Besitz, solche mit 0 nicht.
- Schaltet ein Nutzer „Im Besitz“ aus und wieder ein, ist die vorherige Anzahl verloren (sie startet wieder bei 1).
