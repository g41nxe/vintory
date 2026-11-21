export interface ExtractedWineData {
  name: string;
  type: string;
  year: number | null;
  winery: string;
  region: string;
  grape: string;
  suggestedPrice?: string;
}

// Calls the server-side proxy (netlify/functions/analyze-label.mts).
// The Gemini API key is stored only on the server.
export class GeminiService {
  async analyzeLabel(frontImageBase64: string, backImageBase64?: string): Promise<ExtractedWineData> {
    const response = await fetch('/api/analyze-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frontImage: frontImageBase64,
        backImage: backImageBase64 || null,
      }),
    });

    let payload: (Partial<ExtractedWineData> & { error?: string }) | null = null;
    try {
      payload = await response.json();
    } catch {
      // Non-JSON response (e.g. network or routing problem)
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Etikett-Analyse fehlgeschlagen (Status ${response.status}).`);
    }
    if (!payload || typeof payload.name !== 'string') {
      throw new Error('Ungültige Antwort vom Server.');
    }

    return payload as ExtractedWineData;
  }
}
