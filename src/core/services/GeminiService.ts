export interface ExtractedWineData {
  name: string;
  type: string;
  year: number | null;
  winery: string;
  region: string;
  grape: string;
  suggestedPrice?: string;
}

/**
 * Error from a label scan.
 * `retryable` is true for temporary problems (offline, scan limit reached,
 * server briefly unavailable) – the scan should stay queued and be tried again later.
 * `retryable` is false when retrying the same photos is pointless (e.g. unreadable label).
 */
export class ScanError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  readonly limitReached: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = 'ScanError';
    this.status = status;
    this.retryable = retryable;
    this.limitReached = status === 429;
  }
}

// 429 = scan limit, 5xx except 502 = server/limit storage temporarily unavailable.
// 502 means Gemini answered with an error or unusable data for these photos.
const isRetryableStatus = (status: number) => status === 429 || (status >= 500 && status !== 502);

// Calls the server-side proxy (netlify/functions/analyze-label.mts).
// The Gemini API key is stored only on the server.
export class GeminiService {
  async analyzeLabel(frontImageBase64: string, backImageBase64?: string): Promise<ExtractedWineData> {
    let response: Response;
    try {
      response = await fetch('/api/analyze-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frontImage: frontImageBase64,
          backImage: backImageBase64 || null,
        }),
      });
    } catch {
      // Network failure (offline, connection dropped)
      throw new ScanError('Keine Verbindung zum Server. Bitte später erneut versuchen.', null, true);
    }

    let payload: (Partial<ExtractedWineData> & { error?: string }) | null = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON response (e.g. network or routing problem)
    }

    if (!response.ok) {
      throw new ScanError(
        payload?.error || `Etikett-Analyse fehlgeschlagen (Status ${response.status}).`,
        response.status,
        isRetryableStatus(response.status)
      );
    }
    if (!payload || typeof payload.name !== 'string') {
      throw new ScanError('Ungültige Antwort vom Server.', response.status, true);
    }

    return payload as ExtractedWineData;
  }
}
