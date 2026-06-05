const API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeout || 30000
  );

  try {
    const response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: options?.model || 'deepseek-chat',
        messages,
        temperature: options?.temperature || 0.1,
        max_tokens: options?.maxTokens || 4096,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJSONResponse(content: string): any {
  // Strip BOM and other invisible control characters
  const clean = content.replace(/^\uFEFF/, '').trim();

  // Try to extract JSON from markdown code blocks
  const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      console.warn('Failed to parse JSON from code block:', (e as Error).message);
    }
  }

  // Try direct parse
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn('Failed to parse JSON directly, trying regex extraction:', (e as Error).message);
  }

  // Try to find JSON object/array in the content
  const objectMatch = clean.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  const arrayMatch = clean.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  throw new Error('Failed to parse AI response as JSON. Raw response: ' + clean.slice(0, 500));
}
