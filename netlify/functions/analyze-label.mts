import type { Config } from '@netlify/functions';

// Server-side proxy for Gemini label analysis.
// The API key lives only in the Netlify environment variable GEMINI_API_KEY
// (scope: Functions) and never reaches the browser.

// Model can be switched without a code change via the GEMINI_MODEL env variable.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const geminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || DEFAULT_MODEL}:generateContent`;

// Images are downscaled to max 600px JPEG in the client (~50-150 KB each).
// 2 MB per image leaves plenty of headroom and stays far below Netlify's 6 MB payload limit.
const MAX_IMAGE_CHARS = 2 * 1024 * 1024;

const PROMPT =
  "Du bist ein Sommelier-Assistent. Analysiere dieses Foto (oder diese Fotos von Vorderseite und optional Rückseite) eines Weinetiketts, extrahiere alle Details und schätze den aktuellen Marktpreis (oder eine realistische Preisspanne) in Euro (€) basierend auf dem erkannten Wein und Jahrgang. Nutze insbesondere die Rückseite (Backlabel), falls vorhanden, um Rebsorten, Winzer, Region oder andere Spezifikationen präziser zu erfassen. Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt ohne Markdown-Formatierung oder Code-Blöcke (kein ```json). Falls ein Feld nicht erkennbar ist, verwende null. Typ MUSS genau einer der folgenden Werte sein: 'Rotwein', 'Weißwein', 'Rosé', 'Schaumwein' (Standard ist 'Rotwein'). Das JSON-Format lautet:\n{\n  \"name\": \"Name des Weins (ohne Jahrgang/Winzer)\",\n  \"type\": \"Rotwein\" | \"Weißwein\" | \"Rosé\" | \"Schaumwein\",\n  \"year\": 2018 (Zahl oder null),\n  \"winery\": \"Name des Winzers / Weinguts\",\n  \"region\": \"Anbauregion\",\n  \"grape\": \"Rebsorte (z.B. Riesling, Pinot Noir)\",\n  \"suggestedPrice\": \"z.B. 45.00 oder 120.00 - 140.00 (nur Zahlen und eventuell Spanne, ohne Währungssymbol, null falls unklar)\"\n}";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// Browsers always send Origin on cross-origin POSTs; this stops other websites
// from using the proxy from their pages. (Non-browser clients can still forge it.)
// Same-origin check: works for production, deploy previews and `netlify dev` alike.
const isAllowedOrigin = (origin: string | null, requestUrl: string): boolean => {
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    if (originUrl.host === new URL(requestUrl).host) return true;
    return originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const toBase64Payload = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_IMAGE_CHARS) {
    return null;
  }
  const data = value.includes(',') ? value.split(',')[1] : value;
  return /^[A-Za-z0-9+/=]+$/.test(data) ? data : null;
};

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!isAllowedOrigin(req.headers.get('origin'), req.url)) {
    return json(403, { error: 'Forbidden' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return json(500, { error: 'Server ist nicht konfiguriert (GEMINI_API_KEY fehlt).' });
  }

  let body: { frontImage?: unknown; backImage?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Ungültige Anfrage.' });
  }

  const front = toBase64Payload(body.frontImage);
  if (!front) {
    return json(400, { error: 'Vorderseiten-Foto fehlt oder ist ungültig.' });
  }
  const back = body.backImage ? toBase64Payload(body.backImage) : null;
  if (body.backImage && !back) {
    return json(400, { error: 'Rückseiten-Foto ist ungültig.' });
  }

  const parts: unknown[] = [
    { text: PROMPT },
    { inlineData: { mimeType: 'image/jpeg', data: front } },
  ];
  if (back) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: back } });
  }

  const response = await fetch(geminiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error', response.status, errorText);
    // Google's error message never contains the key; pass its reason through for debugging.
    let reason = '';
    try {
      const parsedError = JSON.parse(errorText);
      reason = [parsedError?.error?.status, parsedError?.error?.message].filter(Boolean).join(': ');
    } catch {
      // ignore non-JSON error bodies
    }
    return json(502, {
      error: `Gemini-Anfrage fehlgeschlagen (Status ${response.status}).`,
      reason: reason.slice(0, 300) || undefined,
    });
  }

  const result = await response.json();
  const text: string | undefined = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return json(502, { error: 'Leere Antwort von Gemini.' });
  }

  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(cleaned.trim());
    return json(200, {
      name: parsed.name || '',
      type: parsed.type || 'Rotwein',
      year: parsed.year ? Number(parsed.year) : null,
      winery: parsed.winery || '',
      region: parsed.region || '',
      grape: parsed.grape || '',
      suggestedPrice: parsed.suggestedPrice || '',
    });
  } catch (e) {
    console.error('Failed to parse Gemini JSON', text, e);
    return json(502, { error: 'Gemini hat keine gültigen Weindaten geliefert.' });
  }
};

export const config: Config = {
  path: '/api/analyze-label',
  method: 'POST',
};
