import type { WorkspaceChatMessage } from '@/features/workspace/types';

type GeminiReplyParams = {
  history: WorkspaceChatMessage[];
  systemInstruction: string;
};

type GeminiErrorCode =
  | 'gemini/missing-api-key'
  | 'gemini/request-failed'
  | 'gemini/empty-response';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3-flash-preview';

function createGeminiError(code: GeminiErrorCode, message: string, status?: number) {
  const error = new Error(message) as Error & { code: GeminiErrorCode; status?: number };
  error.code = code;
  error.status = status;
  return error;
}

function normalizeGeminiHistory(history: WorkspaceChatMessage[]) {
  return history.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
}

function extractResponseText(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();
}

export async function generateGeminiReply({
  history,
  systemInstruction,
}: GeminiReplyParams): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw createGeminiError(
      'gemini/missing-api-key',
      'Falta EXPO_PUBLIC_GEMINI_API_KEY para usar el chat con Gemini.'
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: normalizeGeminiHistory(history),
      }),
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      'No pudimos comunicarnos con Gemini en este momento.';

    throw createGeminiError('gemini/request-failed', message, response.status);
  }

  const text = extractResponseText(payload);

  if (!text) {
    throw createGeminiError(
      'gemini/empty-response',
      'Gemini no devolvió texto útil para esta consulta.'
    );
  }

  return text;
}
