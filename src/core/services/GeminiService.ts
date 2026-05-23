export interface ExtractedWineData {
  name: string;
  type: string;
  year: number | null;
  winery: string;
  region: string;
  grape: string;
}

export class GeminiService {
  async analyzeLabel(frontImageBase64: string, apiKey: string, backImageBase64?: string): Promise<ExtractedWineData> {
    if (!apiKey) {
      throw new Error("No Gemini API key provided.");
    }

    const frontBase64 = frontImageBase64.split(',')[1] || frontImageBase64;

    const parts: any[] = [
      {
        text: "Du bist ein Sommelier-Assistent. Analysiere dieses Foto (oder diese Fotos von Vorderseite und optional Rückseite) eines Weinetiketts und extrahiere alle Details. Nutze insbesondere die Rückseite (Backlabel), falls vorhanden, um Rebsorten, Winzer, Region oder andere Spezifikationen präziser zu erfassen. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung oder Code-Blöcke (kein ```json). Falls ein Feld nicht erkennbar ist, verwende null. Typ MUSS genau einer der folgenden Werte sein: 'Rotwein', 'Weißwein', 'Rosé', 'Schaumwein' (Standard ist 'Rotwein'). Das JSON-Format lautet:\n{\n  \"name\": \"Name des Weins (ohne Jahrgang/Winzer)\",\n  \"type\": \"Rotwein\" | \"Weißwein\" | \"Rosé\" | \"Schaumwein\",\n  \"year\": 2018 (Zahl oder null),\n  \"winery\": \"Name des Winzers / Weinguts\",\n  \"region\": \"Anbauregion\",\n  \"grape\": \"Rebsorte (z.B. Riesling, Pinot Noir)\"\n}"
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: frontBase64
        }
      }
    ];

    if (backImageBase64) {
      const backBase64 = backImageBase64.split(',')[1] || backImageBase64;
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: backBase64
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error details:", errorText);
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const result = await response.json();
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Empty response from Gemini API");
    }

    try {
      const parsed = JSON.parse(textResponse.trim());
      return {
        name: parsed.name || '',
        type: parsed.type || 'Rotwein',
        year: parsed.year ? Number(parsed.year) : null,
        winery: parsed.winery || '',
        region: parsed.region || '',
        grape: parsed.grape || '',
      };
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", textResponse, e);
      throw new Error("Gemini did not return valid JSON wine structured data.");
    }
  }
}
