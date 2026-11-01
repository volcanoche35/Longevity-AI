import { NextResponse } from 'next/server'
import { ASSISTANT_POLICY as SYSTEM_PROMPT } from '@/lib/assistant-policy'
import { parseObservations, buildObservationContext } from '@/lib/observation-context'
import { askAI, isAIConfigured, type ChatMessage } from '@/lib/ai'
import { buildKnowledgeContext } from '@/lib/knowledge'
import { parseHealthProfile, buildHealthContext } from '@/lib/health-profile'
import { supabase, isDemoMode } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


/** bellek içi hız sınırlayıcı (demo/tek instance için yeterli) */
const buckets = new Map<string, { n: number; t: number }>()
const LIMIT = 20
const WINDOW_MS = 60_000

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now - b.t > WINDOW_MS) {
    buckets.set(ip, { n: 1, t: now })
    if (buckets.size > 5000) buckets.clear()
    return false
  }
  b.n += 1
  return b.n > LIMIT
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function POST(req: Request) {
  if (!isAIConfigured()) return bad('AI yapılandırması eksik', 500)

  // Oturum zorunluluğu: demo modda atla; canlıda Supabase JWT doğrula.
  if (!isDemoMode() && supabase) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return bad('Oturum gerekli', 401)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return bad('Oturum geçersiz veya süresi dolmuş', 401)
  }

  // Not: x-forwarded-for yalnız güvenilir reverse proxy arkasında doğrudur; yoksa sahte olabilir.
  const fwd = req.headers.get('x-forwarded-for')?.split(',')
  const ip = fwd?.[fwd.length - 1]?.trim() || req.headers.get('x-real-ip') || 'bilinmeyen'
  if (rateLimited(ip)) return bad('Çok fazla istek gönderdin, biraz bekle', 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('Geçersiz istek gövdesi')
  }

  const raw = (body ?? {}) as { messages?: unknown; supplements?: unknown; profile?: unknown; observations?: unknown }

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return bad('messages boş olamaz')
  }
  if (raw.messages.length > 30) return bad('Sohbet çok uzun, yeni sohbet başlat')

  const messages: ChatMessage[] = []
  for (const m of raw.messages) {
    if (!m || typeof m !== 'object') return bad('Geçersiz mesaj nesnesi')
    const item = m as { role?: unknown; content?: unknown }
    if (item.role !== 'user' && item.role !== 'assistant') return bad('rol user ya da assistant olmalı')
    if (typeof item.content !== 'string' || !item.content.trim()) return bad('content boş olamaz')
    if (item.content.length > 4000) return bad('mesaj çok uzun (en fazla 4000 karakter)')
    messages.push({ role: item.role, content: item.content.trim() })
  }

  const supplements = Array.isArray(raw.supplements)
    ? raw.supplements.filter((s): s is string => typeof s === 'string' && s.length <= 200).slice(0, 40)
    : []

  let profile
  let observations
  try {
    profile = parseHealthProfile(raw.profile)
    observations = profile ? parseObservations(raw.observations) : null
  }
  catch (error) { return bad(error instanceof Error ? error.message : 'Geçersiz profil') }

  try {
    const reply = await askAI([
      { role: 'system', content: SYSTEM_PROMPT + buildKnowledgeContext(supplements) + buildHealthContext(profile) + buildObservationContext(observations) },
      ...messages,
    ])
    return NextResponse.json({
      ok: true,
      content: reply.content,
      model: reply.model,
      note: reply.providerNote,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
    console.error('[api/ai] başarısız:', msg)
    return bad('AI şu an cevap veremiyor, birazdan tekrar dene', 502)
  }
}
