/**
 * Sunucu tarafı AI istemcisi — OpenRouter geçidi.
 * Bu modül ASLA client component içinden import edilmez; anahtar yalnızca
 * Route Handler (src/app/api/ai/route.ts) üzerinden kullanılır.
 */

export type ChatRole = 'user' | 'assistant' | 'system'
export interface ChatMessage { role: ChatRole; content: string }

export interface AIReply {
  content: string
  model: string
  providerNote?: string
}

class AIError extends Error {
  status: number
  constructor(message: string, status = 502) {
    super(message)
    this.status = status
  }
}

const TIMEOUT_MS = 45_000

function requireConfig() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key || key.length < 20) throw new AIError('AI yapılandırması eksik (anahtar tanımsız)', 500)
  // DÜZELTME: eski yapılandırmada "api.openrouter.ai" vardı — böyle bir domain yok.
  const base = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1')
    .replace('api.openrouter.ai', 'openrouter.ai')
    .replace(/\/+$/, '')
  const site = process.env.SITE_URL || 'http://localhost:3000'
  return {
    key,
    base,
    models: [process.env.AI_MODEL, process.env.AI_MODEL_FALLBACK]
      .filter((m): m is string => Boolean(m && m.trim()))
      .map(m => m.trim()),
    headers: {
      'HTTP-Referer': site,
      'X-Title': 'Longevity AI / BioTrack',
    },
  }
}

async function callModel(
  cfg: ReturnType<typeof requireConfig>,
  model: string,
  messages: ChatMessage[],
): Promise<string | null> {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.key}`,
      ...cfg.headers,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      // Reasoning modelleri bütçeyi akıl yürütmeye harcayabiliyor: 900 token
      // tamamı reasoning'e gidip içerik BOŞ dönüyordu (finish_reason=length).
      // Cevap + reasoning başlığa sığsın.
      max_tokens: 3000,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[ai] ${model} → HTTP ${res.status}: ${detail.slice(0, 200)}`)
    return null
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  return typeof content === 'string' && content.trim() ? content.trim() : null
}

export async function askAI(messages: ChatMessage[]): Promise<AIReply> {
  const cfg = requireConfig()
  const models = cfg.models.length ? cfg.models : ['deepseek/deepseek-v4-flash-0731']

  for (const model of models) {
    const content = await callModel(cfg, model, messages)
    if (content) {
      return {
        content,
        model,
        providerNote: model === models[0] ? undefined : 'yedek model ile cevaplandı',
      }
    }
  }
  throw new AIError('AI sağlayıcısına ulaşılamadı, birazdan tekrar dene', 502)
}

export function isAIConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY
  return Boolean(key && key.length > 20)
}
