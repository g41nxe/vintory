# Vintory

Progressive Web App, um Weine festzuhalten – als Verkostungstagebuch und als Weinkeller. Etiketten lassen sich per Kamera scannen; eine KI (Google Gemini) schlägt daraus Name, Weingut, Jahrgang, Region, Rebsorte und Preis vor. Live: https://vintory.netlify.app

Fachbegriffe stehen in [CONTEXT.md](./CONTEXT.md), wichtige Entscheidungen in [docs/adr](./docs/adr).

## Aufbau

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS 4, als PWA (`vite-plugin-pwa`, Updates nach Bestätigung).
- **Daten**: nur lokal im Browser in IndexedDB (`VintoryDB`). Kein Server, kein Konto – siehe [ADR 0003](./docs/adr/0003-nutzerdaten-nur-lokal.md).
- **Scan**: Netlify Function [`netlify/functions/analyze-label.mts`](./netlify/functions/analyze-label.mts) unter `/api/analyze-label` ruft Gemini auf. Der API-Key liegt nur auf dem Server, Scans sind pro Tag und IP begrenzt – siehe [ADR 0001](./docs/adr/0001-gemini-nur-ueber-server-proxy.md) und [ADR 0002](./docs/adr/0002-scan-limits-fail-closed.md).

```
src/
  core/            Entities, Repository-Interface, Services (Gemini-Client, Backup-Import)
  infrastructure/  IndexedDB-Repository
  ui/              Context (State, Warteschlange), Komponenten, Hooks
netlify/functions/ Server-Proxy für Gemini inkl. Scan-Limits
```

## Lokal starten

```bash
npm install
netlify dev        # App + Function auf http://localhost:8888
```

`npm run dev` startet nur das Frontend (ohne Scan-Function). Für Scans lokal eine `.env` nach Vorlage von [`.env.example`](./.env.example) anlegen oder den Ordner mit `netlify link` verknüpfen.

## Umgebungsvariablen (Netlify)

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `GEMINI_API_KEY` | ja | Gemini-API-Key, nur für die Function. **Niemals mit `VITE_` beginnen** – das landet im öffentlichen Bundle. |
| `GEMINI_MODEL` | nein | Modell, Standard `gemini-3.8-flash` |
| `SCAN_LIMIT_PER_DAY` | nein | Scans pro Tag für alle zusammen, Standard 200 |
| `SCAN_LIMIT_PER_IP_HOUR` | nein | Scans pro Stunde je IP, Standard 30 |

Änderungen an Variablen wirken erst nach einem neuen Deploy.

## Deploy

Netlify baut und veröffentlicht automatisch jeden Push auf `master`. Eine Vorschau ohne Live-Gang:

```bash
npm run build
netlify deploy --dir dist --functions netlify/functions
```
