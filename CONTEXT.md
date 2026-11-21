# Vintory

Vintory hält Weine fest, die man verkostet hat oder besitzt – als Verkostungstagebuch und als Weinkeller zugleich. Die Daten jedes Nutzers liegen nur auf dessen Gerät.

## Sprache

### Weine

**Wein**:
Ein Eintrag in der Liste: ein bestimmter Wein eines bestimmten Jahrgangs. Derselbe Wein aus einem anderen Jahrgang ist ein eigener Wein.
_Vermeiden_: Flasche, Eintrag, Etikett

**Weinliste**:
Alle Weine eines Nutzers, egal ob verkostet, im Besitz oder beides.
_Vermeiden_: Keller, Sammlung, Datenbank

**Weingut**:
Der Erzeuger, der den Wein gemacht hat.
_Vermeiden_: Winzer, Hersteller, Produzent

**Händler**:
Wo der Wein gekauft oder probiert wurde. Nie dasselbe wie das Weingut, auch wenn ein Weingut selbst verkauft.
_Vermeiden_: Verkäufer, Shop, Laden, Bezugsquelle

**Weintyp**:
Eine von vier Kategorien: Rotwein, Weißwein, Rosé, Schaumwein.
_Vermeiden_: Sorte, Art

**Rebsorte**:
Die Traube(n), aus denen der Wein gemacht ist, z. B. Riesling.
_Vermeiden_: Sorte, Traube

**Preis**:
Preis oder Preisspanne in Euro, vom Scan geschätzt oder selbst eingetragen.
_Vermeiden_: Wert, Marktwert

### Verkostung und Besitz

**Im Besitz**:
Ein Wein ist im Besitz, wenn der Nutzer mindestens eine Flasche davon hat.
_Vermeiden_: vorrätig, im Keller, gekauft

**Anzahl**:
Wie viele Flaschen eines Weins der Nutzer besitzt; nur bedeutsam, solange der Wein im Besitz ist.
_Vermeiden_: Menge, Bestand

**Verkostet am**:
Das Datum, an dem der Nutzer den Wein (zuletzt) probiert hat.
_Vermeiden_: Datum, Trinkdatum

**Kommentar**:
Freie Notiz des Nutzers zum Wein, meist der Eindruck bei der Verkostung.
_Vermeiden_: Notiz, Beschreibung, Verkostungsnotiz

**Schlagwort**:
Ein kurzer Begriff für den Eindruck eines Weins, z. B. „mineralisch“; entweder eine der Vorgaben oder selbst angelegt.
_Vermeiden_: Tag, Label, Kategorie

**Bewertung**:
Die persönliche Einschätzung des Nutzers in Sternen von 0 bis 5.
_Vermeiden_: Rating, Punkte, Note

**Favorit**:
Ein vom Nutzer markierter Lieblingswein.
_Vermeiden_: Merkliste, Lesezeichen

### Scannen

**Scan**:
Das Auswerten von Fotos eines Etiketts (Vorderseite, optional Rückseite) durch die KI, die daraus Name, Weingut, Jahrgang und weitere Angaben vorschlägt.
_Vermeiden_: OCR, Analyse, Erkennung

**Warteschlange**:
Scans, die auf dem Gerät gespeichert sind, weil sie noch nicht ausgewertet werden konnten (z. B. offline).
_Vermeiden_: Queue, Offline-Speicher

**Wartend** / **Fehlgeschlagen**:
Ein wartender Scan wird automatisch ausgewertet, sobald es geht; ein fehlgeschlagener konnte nicht gelesen werden und wird nur auf Wunsch des Nutzers erneut versucht.
_Vermeiden_: pending/failed in Texten für Nutzer

**Scan-Limit**:
Die Obergrenze, wie viele Scans alle Nutzer zusammen pro Tag und ein einzelner Anschluss pro Stunde auslösen dürfen.
_Vermeiden_: Kontingent, Quota, Rate-Limit

### Daten sichern

**Backup**:
Eine Datei mit allen Weinen eines Nutzers, die er exportiert und später wieder importieren kann.
_Vermeiden_: Sicherung, Export-Datei, Dump

**Zusammenführen** / **Ersetzen**:
Die beiden Arten, ein Backup zu importieren: Zusammenführen fügt nur fehlende Weine hinzu, Ersetzen tauscht die ganze Weinliste gegen das Backup.
_Vermeiden_: Merge, Überschreiben, Wiederherstellen
