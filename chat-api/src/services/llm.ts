import { logger } from '../../config/logger.js';
import type { DestinationProvider } from './message-routing.js';

type GenerateTextParams = {
  provider: DestinationProvider;
  model: string;
  apiKey: string;
  prompt: string | null;
  message: string;
};

const generateGeminiText = async ({ model, apiKey, prompt, message }: GenerateTextParams): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: message }],
          },
        ],
        ...(prompt
          ? {
              systemInstruction: {
                parts: [{ text: prompt }],
              },
            }
          : {}),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini response missing text');
  }
  return text as string;
};

const generateOpenAIText = async ({ model, apiKey, prompt, message }: GenerateTextParams): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: message,
      ...(prompt ? { instructions: prompt } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text =
    (typeof data?.output_text === 'string' && data.output_text) ||
    data?.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text || '').join('').trim();
  if (!text) {
    throw new Error('OpenAI response missing text');
  }
  return text as string;
};

export const generateText = async (params: GenerateTextParams): Promise<string> => {
  logger.info({ provider: params.provider, model: params.model, hasPrompt: Boolean(params.prompt) }, 'llm request prepared');

  if (params.provider === 'openai') {
    return generateOpenAIText(params);
  }

  return generateGeminiText(params);
};
