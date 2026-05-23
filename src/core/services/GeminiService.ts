export interface ExtractedWineData {
  name: string;
  type: string;
  year: number | null;
  winery: string;
  region: string;
  grape: string;
}

export class GeminiService {
  async analyzeLabel(base64Image: string, apiKey: string): Promise<ExtractedWineData> {
    if (!apiKey) {
      throw new Error("No Gemini API key provided.");
    }

    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Du bist ein Sommelier-Assistent. Analysiere dieses Foto eines Weinetiketts und extrahiere alle Details. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung oder Code-Blöcke (kein ```json). Falls ein Feld nicht erkennbar ist, verwende null. Typ MUSS genau einer der folgenden Werte sein: 'Rotwein', 'Weißwein', 'Rosé', 'Schaumwein' (Standard ist 'Rotwein'). Das JSON-Format lautet:\n{\n  \"name\": \"Name des Weins (ohne Jahrgang/Winzer)\",\n  \"type\": \"Rotwein\" | \"Weißwein\" | \"Rosé\" | \"Schaumwein\",\n  \"year\": 2018 (Zahl oder null),\n  \"winery\": \"Name des Winzers / Weinguts\",\n  \"region\": \"Anbauregion\",\n  \"grape\": \"Rebsorte (z.B. Riesling, Pinot Noir)\"\n}"
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
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
