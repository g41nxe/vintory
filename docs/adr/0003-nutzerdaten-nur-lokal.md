# Nutzerdaten liegen nur lokal – Änderungen dürfen sie nie verlieren

Alle Weine, Einstellungen und die Warteschlange liegen ausschließlich in der IndexedDB des jeweiligen Geräts (`VintoryDB`); es gibt keinen Server, kein Konto und keine Cloud-Kopie. Das hält die App einfach und privat, bedeutet aber: Was eine neue Version kaputt macht, ist für den Nutzer unwiederbringlich verloren – außer er hat selbst ein Backup exportiert.

## Konsequenzen

- Datenbankname und Stores werden nicht umbenannt. Schemaänderungen nur über eine neue DB-Version mit Migration in `onupgradeneeded`.
- Neue Felder sind optional; alte Einträge ohne sie müssen weiter funktionieren. Bestehende Datenformate (z. B. der Preis als Text) müssen weiter lesbar bleiben.
- Nichts löscht oder überschreibt Weine ohne ausdrückliche Bestätigung des Nutzers. Wo das doch passiert (Import mit „Ersetzen“, Händler aufräumen), lädt die App vorher automatisch ein Backup herunter.
- Updates laufen über den Service Worker erst nach „Aktualisieren“; alte und neue App-Version müssen dieselben Daten lesen können.
