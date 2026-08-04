import type { WorkspaceChatMessage } from '@/features/workspace/types';

type GeminiReplyParams = {
  history: WorkspaceChatMessage[];
  systemInstruction: string;
};

type GeminiErrorCode =
  | 'gemini/missing-api-key'
  | 'gemini/request-failed'
  | 'gemini/empty-response'
  | 'gemini/model-overloaded';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];

function createGeminiError(code: GeminiErrorCode, message: string, status?: number) {
  const error = new Error(message) as Error & { code: GeminiErrorCode; status?: number };
  error.code = code;
  error.status = status;
  return error;
}

function parseModelList(value?: string) {
  return String(value || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models.filter(Boolean)));
}

const GEMINI_MODELS = uniqueModels([
  ...parseModelList(process.env.EXPO_PUBLIC_GEMINI_MODEL),
  ...parseModelList(process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS),
  ...DEFAULT_GEMINI_MODELS,
]);

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

function shouldTryNextModel(status = 0, message = '') {
  return [404, 429, 500, 502, 503, 504].includes(status)
    || /high demand|overloaded|try again later|temporarily unavailable|rate limit|quota|not found|not supported|does not exist|not available/i.test(message);
}

function mapRequestFailureMessage(status: number, message: string) {
  if (shouldTryNextModel(status, message)) {
    return 'Gemini esta con alta demanda en este momento. Intenta de nuevo en unos segundos.';
  }

  return message || 'No pudimos comunicarnos con Gemini en este momento.';
}

async function requestGeminiModel({
  history,
  model,
  systemInstruction,
}: GeminiReplyParams & { model: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY || '',
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
  const message =
    payload?.error?.message ||
    'No pudimos comunicarnos con Gemini en este momento.';

  if (!response.ok) {
    throw createGeminiError(
      shouldTryNextModel(response.status, message) ? 'gemini/model-overloaded' : 'gemini/request-failed',
      mapRequestFailureMessage(response.status, message),
      response.status
    );
  }

  const text = extractResponseText(payload);

  if (!text) {
    throw createGeminiError(
      'gemini/empty-response',
      'Gemini no devolvio texto util para esta consulta.'
    );
  }

  return text;
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

  let lastError: (Error & { code?: GeminiErrorCode; status?: number }) | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      return await requestGeminiModel({ history, model, systemInstruction });
    } catch (error) {
      const typedError = error as Error & { code?: GeminiErrorCode; status?: number };
      lastError = typedError;

      if (typedError.code !== 'gemini/model-overloaded') {
        throw typedError;
      }
    }
  }

  throw lastError || createGeminiError(
    'gemini/model-overloaded',
    'Gemini esta con alta demanda en este momento. Intenta de nuevo en unos segundos.'
  );
}
