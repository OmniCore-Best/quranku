export interface OpenRouterMessage {
  role: string;
  content: string;
  reasoning_details?: any;
}

export interface OpenRouterResponse {
  content: string;
  reasoning_details?: any;
  provider: 'airo_hunter' | 'devnova_id';
  status: 'online' | 'fallback' | 'offline';
}

/**
 * Send messages to the server-side AI endpoint.
 * This function should only be used on the client.
 */
export async function sendMessageWithFallback(
  messages: OpenRouterMessage[],
  enableReasoning: boolean = true
): Promise<OpenRouterResponse> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, enableReasoning }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  return response.json();
}