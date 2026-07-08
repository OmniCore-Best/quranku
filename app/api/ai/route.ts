import { NextRequest, NextResponse } from 'next/server';

const AIRO_HUNTER_API_KEY = process.env.AIRO_HUNTER_API_KEY;
const OPENROUTER_KEYS = [
  process.env.DEVNOVA_ID_API_KEY_1,
  process.env.DEVNOVA_ID_API_KEY_2,
  process.env.DEVNOVA_ID_API_KEY_3,
  process.env.DEVNOVA_ID_API_KEY_4,
  process.env.DEVNOVA_ID_API_KEY_5,
  process.env.DEVNOVA_ID_API_KEY_6,
].filter(Boolean) as string[];

const OPENROUTER_FALLBACK = process.env.DEVNOVA_ID_API_KEY;
if (OPENROUTER_KEYS.length === 0 && OPENROUTER_FALLBACK) {
  OPENROUTER_KEYS.push(OPENROUTER_FALLBACK);
}

const ALLOWED_ORIGINS = [
  'https://quranku.devnova.icu',
  'https://quranku-test.vercel.app',
];

interface Message {
  role: string;
  content: string;
  reasoning_details?: any;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

async function sendToAiroHunter(messages: Message[]): Promise<string> {
  if (!AIRO_HUNTER_API_KEY) {
    throw new Error('Airo Hunter API key not configured on server');
  }
  const response = await fetch(
    'https://api.cloudflare.com/client/v4/accounts/df62bda770b2ed71a1b91f90b7b2ff41/ai/run/@cf/google/gemma-3-12b-it',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRO_HUNTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    }
  );
  if (!response.ok) throw new Error(`Airo Hunter error: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error('Airo Hunter response not successful');
  return data.result.response || data.result;
}

async function sendToDevNovaID(messages: Message[], retryAttempt = 0): Promise<{ content: string; reasoning_details?: any }> {
  if (OPENROUTER_KEYS.length === 0) throw new Error('No DevNova keys configured');
  const currentKey = OPENROUTER_KEYS[retryAttempt % OPENROUTER_KEYS.length];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${currentKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://quranku.devnova.icu',
      'X-Title': 'Quranku AI Chat',
    },
    body: JSON.stringify({
      model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      messages,
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
    if ([401, 429, 403].includes(response.status) && retryAttempt < OPENROUTER_KEYS.length - 1) {
      return sendToDevNovaID(messages, retryAttempt + 1);
    }
    throw new Error(`OpenRouter error: ${response.status}`);
  }
  const data = await response.json();
  const choice = data.choices?.[0]?.message;
  if (!choice) throw new Error('Invalid response format');
  return {
    content: choice.content,
    reasoning_details: choice.reasoning_details,
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { messages, enableReasoning = true } = body as { messages: Message[]; enableReasoning?: boolean };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages' },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    try {
      const content = await sendToAiroHunter(messages.filter(m => m.role !== 'system'));
      return NextResponse.json(
        {
          content,
          provider: 'airo_hunter',
          status: 'online',
        },
        { headers: getCorsHeaders(origin) }
      );
    } catch (airoError) {
      try {
        const result = await sendToDevNovaID(messages);
        return NextResponse.json(
          {
            content: result.content,
            reasoning_details: result.reasoning_details,
            provider: 'devnova_id',
            status: 'fallback',
          },
          { headers: getCorsHeaders(origin) }
        );
      } catch (openRouterError) {
        const fallbackMsg = 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.';
        return NextResponse.json(
          {
            content: fallbackMsg,
            provider: 'devnova_id',
            status: 'offline',
          },
          { headers: getCorsHeaders(origin) }
        );
      }
    }
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(origin) }
    );
  }
}