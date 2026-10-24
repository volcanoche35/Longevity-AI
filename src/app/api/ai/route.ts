import { NextResponse } from 'next/server'
import { askAI, isAIConfigured, type ChatMessage } from '@/lib/ai'
import { buildKnowledgeContext } from '@/lib/knowledge'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Sen BioTrack için çalışan bir takviye bilgi asistanısın.
Kullanıcının eczacısı veya doktoru DEĞİLSİN.

Kurallar:
1. Her öneride kanıt düzeyini belirt (A: güçlü insan kanıtı / B: olası fayda / C: zayıf-karmaşık).
2. Bilgi tabanında yazmayan bir şeyi kesinlik gibi SUNMA. Emin değilsen "kanıt zayıf" de.
3. Tedavi, teşhis veya "şu hastalığı iyileştirir / yaşlanmayı yavaşlatır" gibi sağlık beyanı YASAK.
4. Doz önerirken üst sınırları aşma ve "kişiye özel doz için kan değeri + hekim gerekir" de.
5. Tehlike işareti (şiddetli semptom, ilaç etkileşimi, hamilelik, böbrek/karaciğer hastalığı) görürsen doktora yönlendir.
6. Türkçe, kısa ve madde madde cevap ver. Gereksiz giriş/sonuç cümlesi yazma.`

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

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'bilinmeyen'
  if (rateLimited(ip)) return bad('Çok fazla istek gönderdin, biraz bekle', 429)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('Geçersiz istek gövdesi')
  }

  const raw = (body ?? {}) as { messages?: unknown; supplements?: unknown }

  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    return bad('messages boş olamaz')
  }
  if (raw.messages.length > 30) return bad('Sohbet çok uzun, yeni sohbet başlat')

  const messages: ChatMessage[] = []
  for (const m of raw.messages) {
    const item = m as { role?: unknown; content?: unknown }
    if (item.role !== 'user' && item.role !== 'assistant') return bad('rol user ya da assistant olmalı')
    if (typeof item.content !== 'string' || !item.content.trim()) return bad('content boş olamaz')
    if (item.content.length > 4000) return bad('mesaj çok uzun (en fazla 4000 karakter)')
    messages.push({ role: item.role, content: item.content.trim() })
  }

  const supplements = Array.isArray(raw.supplements)
    ? raw.supplements.filter((s): s is string => typeof s === 'string').slice(0, 40)
    : []

  try {
    const reply = await askAI([
      { role: 'system', content: SYSTEM_PROMPT + buildKnowledgeContext(supplements) },
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
