export const AIRO_HUNTER_API_KEY = process.env.NEXT_PUBLIC_AIRO_HUNTER_API_KEY;
export const SYSTEM_PROMPT = process.env.NEXT_PUBLIC_AI_SYSTEM_PROMPT || 
  'You are Yarsya, a friendly and helpful AI assistant that speaks Indonesian casually.';

// OpenRouter API Key Rotator
const getOpenRouterKeys = (): string[] => {
  const keys = [
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_1,
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_2,
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_3,
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_4,
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_5,
    process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY_6,
  ].filter(Boolean) as string[];
  return keys.length > 0 ? keys : [process.env.NEXT_PUBLIC_DEVNOVA_ID_API_KEY].filter(Boolean) as string[];
};

export const OPENROUTER_KEYS = getOpenRouterKeys();

/**
 * Extended message type that includes reasoning_details for OpenRouter.
 */
export interface OpenRouterMessage {
  role: string;
  content: string;
  reasoning_details?: any; 
}

/**
 * Response from OpenRouter with reasoning.
 */
export interface OpenRouterResponse {
  content: string;
  reasoning_details?: any;
  provider: 'airo_hunter' | 'devnova_id';
  status: 'online' | 'fallback' | 'offline';
}

// ==================== Airo Hunter (no reasoning) ====================
export async function sendToAiroHunter(
  messageHistory: Array<{ role: string; content: string }>
): Promise<string> {
  if (!AIRO_HUNTER_API_KEY) throw new Error('Airo Hunter API key not configured');
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/df62bda770b2ed71a1b91f90b7b2ff41/ai/run/@cf/google/gemma-3-12b-it',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRO_HUNTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messageHistory }),
    }
  );
  if (!response.ok) throw new Error(`Airo Hunter error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error('Airo Hunter response not successful');
  return data.result.response || data.result;
}

// DevNova ID (OpenRouter) with reasoning support
export async function sendToDevNovaID(
  messages: OpenRouterMessage[],  
  retryAttempt: number = 0
): Promise<{ content: string; reasoning_details?: any }> {
  const validKeys = OPENROUTER_KEYS.filter(k => k && k.trim() !== '');
  if (validKeys.length === 0) throw new Error('No servers configured');

  const currentKey = validKeys[retryAttempt % validKeys.length];

  // Convert messages to format expected by OpenRouter (strip internal fields if any)
  const openRouterMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {})
  }));

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://quranku.devnova.icu',
        'X-Title': 'Quranku AI Chat',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b:free',
        messages: openRouterMessages,
        reasoning: { enabled: true }, 
        max_tokens: 1000,
        temperature: 0.85,
        top_p: 0.9,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        stream: false,
      }),
    });

    if (!response.ok) {
      if ([401, 429, 403].includes(response.status) && retryAttempt < validKeys.length - 1) {
        return sendToDevNovaID(messages, retryAttempt + 1);
      }
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error('Invalid response format');

    return {
      content: choice.content,
      reasoning_details: choice.reasoning_details, // captured for next turn
    };
  } catch (error) {
    if (retryAttempt < validKeys.length - 1) {
      return sendToDevNovaID(messages, retryAttempt + 1);
    }
    throw error;
  }
}

/**
 * Main function with fallback (Airo Hunter → DevNova ID).  
 * Returns content, provider, status, and optionally reasoning_details.
 */
export async function sendMessageWithFallback(
  messageHistory: OpenRouterMessage[],
  enableReasoning: boolean = true
): Promise<OpenRouterResponse> {
  // Try Airo Hunter first (does not support reasoning)
  try {
    const content = await sendToAiroHunter(messageHistory.filter(m => m.role !== 'system')); // system prompt handled differently
    return { content, provider: 'airo_hunter', status: 'online' };
  } catch (airoError) {
    // Fallback to DevNova ID with reasoning
    try {
      const result = await sendToDevNovaID(messageHistory);
      return {
        content: result.content,
        reasoning_details: result.reasoning_details,
        provider: 'devnova_id',
        status: 'fallback',
      };
    } catch (devError) {
      const fallbackMsg = 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.';
      return { content: fallbackMsg, provider: 'devnova_id', status: 'offline' };
    }
  }
}