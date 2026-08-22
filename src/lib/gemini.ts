// Thin wrapper around Google's Generative Language REST API (Gemini) — plain fetch rather
// than an SDK, so there's no dependency to keep pinned as the SDK/model landscape shifts.

export interface CatalogRecommendation {
  type: 'benefit' | 'partner';
  id: number;
  name: string;
  reason: string;
}

const DEFAULT_MODEL = 'gemini-3.6-flash';

export async function generateRecommendations(prompt: string): Promise<CatalogRecommendation[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: ['benefit', 'partner'] },
              id: { type: 'INTEGER' },
              name: { type: 'STRING' },
              reason: { type: 'STRING' },
            },
            required: ['type', 'id', 'name', 'reason'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no content');
  }

  try {
    return JSON.parse(text) as CatalogRecommendation[];
  } catch {
    throw new Error('Gemini returned malformed JSON');
  }
}
