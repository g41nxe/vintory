# Scan-Limits im Proxy, im Zweifel blockieren

Der Proxy ist öffentlich erreichbar und die Origin-Prüfung lässt sich von Skripten fälschen, deshalb begrenzt er Scans selbst: höchstens 200 pro Tag für alle zusammen (Tageswechsel Europe/Berlin) und 30 pro Stunde je IP-Adresse, gezählt in Netlify Blobs, IP-Adressen nur gehasht. Ist der Zählerspeicher nicht erreichbar, wird der Scan abgelehnt („fail closed“): Lieber fällt der Scanner kurz aus, als dass ungedeckelte Kosten entstehen.

## Betrachtete Optionen

- **Tageslimit bei Google**: Für die in AI Studio angelegten Keys kann der Nutzer die Quoten dort nicht selbst senken; in der Cloud Console ist das Projekt nicht wie gewohnt verwaltbar.
- **Monatliche Ausgabengrenze in AI Studio**: ist gesetzt (3 €), laut Google aber experimentell und mit etwa 10 Minuten Verzögerung – nur ein zweites Netz.
- **Zugangscode oder Login**: wirksamer gegen Fremdnutzung, für eine private App mit wenigen Nutzern aber zu viel Reibung.

## Konsequenzen

- Die Zähler sind nicht atomar (lesen, dann schreiben); unter starker paralleler Last kann ein Limit um einige Scans überschritten werden. Für den Kostenschutz ist das hinnehmbar.
- Ein Angreifer kann das Tageslimit aufbrauchen und den Scanner für alle bis Mitternacht sperren. Manuelles Anlegen von Weinen bleibt möglich.
