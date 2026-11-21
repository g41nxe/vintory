# Ein Eintrag pro Wein statt einzelner Verkostungen

Ein Wein hat genau ein „Verkostet am“, einen Kommentar, Schlagwörter und eine Bewertung. Wird derselbe Wein mehrfach probiert, hält der Nutzer das im Kommentar fest; ein anderer Jahrgang ist ein eigener Wein. Ein Modell „Wein mit mehreren Verkostungen“ wäre fachlich genauer, hätte aber Datenmodell, Oberfläche, Backup-Format und Duplikat-Erkennung grundlegend umgebaut – für eine Nutzung, bei der Weine meist einmal probiert werden.

## Konsequenzen

- Erkennt ein Scan einen vorhandenen Wein (gleicher Name, gleiches Weingut, gleicher Jahrgang), bietet die App an, den vorhandenen Eintrag zu öffnen, statt eine zweite Verkostung anzulegen.
- Sollte später doch eine Verkostungshistorie nötig werden, ist das eine Datenmigration (siehe [ADR 0003](./0003-nutzerdaten-nur-lokal.md)).
