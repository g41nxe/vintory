# Gemini nur über einen Server-Proxy aufrufen

Die App ruft Gemini nicht direkt aus dem Browser auf, sondern über die Netlify Function `/api/analyze-label`; der API-Key liegt nur als `GEMINI_API_KEY` auf dem Server. Vorher steckte der Key als `VITE_GEMINI_API_KEY` im öffentlichen JavaScript-Bundle, wurde dort mutmaßlich abgegriffen und verursachte Kosten – deshalb wurde er gesperrt und neu erzeugt.

## Betrachtete Optionen

- **Jeder Nutzer trägt seinen eigenen Key ein** (die App konnte das bereits): kein Kostenrisiko für den Betreiber, aber für Nutzer ohne Google-Konto unbrauchbar. Es gab keinen Nutzer mit eigenem Key, daher wurde die Eingabe entfernt.
- **Server-Proxy** (gewählt): ein Key für alle, dafür muss der Proxy selbst vor Missbrauch geschützt werden (siehe [ADR 0002](./0002-scan-limits-fail-closed.md)).

## Konsequenzen

- Nichts, was mit `VITE_` beginnt, darf ein Geheimnis enthalten – Vite baut diese Variablen ins öffentliche Bundle ein.
- Der Prompt und das Auslesen der Antwort liegen auf dem Server; das Modell ist per `GEMINI_MODEL` umstellbar, ohne neuen Client-Build.
