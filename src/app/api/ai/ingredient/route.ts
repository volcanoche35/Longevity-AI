import { NextResponse } from 'next/server'
import { askAI, isAIConfigured } from '@/lib/ai'
import { supabase, isDemoMode } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * Harici ürünün etken maddesini yapılandırılmış katalog yapısına göre normalleştirir.
 * Yalnızca JSON dizisi döndürür; teşhis/doz üretmez.
 */
export async function POST(req: Request) {
  if (!isAIConfigured()) return NextResponse.json({ ok: false, error: 'AI yapılandırması eksik' }, { status: 500 })

  // Oturum zorunluluğu (canlıda Supabase JWT).
  if (!isDemoMode() && supabase) {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ ok: false, error: 'Oturum gerekli' }, { status: 401 })
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ ok: false, error: 'Oturum geçersiz veya süresi dolmuş' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Geçersiz istek gövdesi' }, { status: 400 }) }
  const raw = (body ?? {}) as { productName?: unknown; ingredientText?: unknown }
  const productName = typeof raw.productName === 'string' ? raw.productName.trim().slice(0, 200) : ''
  const ingredientText = typeof raw.ingredientText === 'string' ? raw.ingredientText.trim().slice(0, 500) : ''
  if (!productName || !ingredientText) {
    return NextResponse.json({ ok: false, error: 'Ürün adı ve etken madde gerekli' }, { status: 400 })
  }

  const system = `Sen bir takviye etken madde normalleştiricisisin. Kullanıcının verdiği ürünü ve etken maddeleri analiz edip YALNIZCA geçerli bir JSON dizisi döndür. Başka metin, açıklama veya markdown kodu bloğu YOK.

Her öğe şu alanları içersin:
{"name":"normalleştirilmiş etken madde adı","category":"kategori","grade":"A","typicalDose":"kısa örnek günlük doz metni","dailyRef":"günlük referans değeri"}

Kategoriler (birini seç): vitamin, mineral, aminoasit, protein, yağ asidi, bitkisel, adaptogen, mantar, performans, eklem, nootropik, mikrobiyota, prebiyotik, lif, uyku, hormon, kombinasyon, diğer.
Grade: A = güçlü kanıt, B = orta, C = zayıf/az kanıt.
dailyRef: vitamin/mineral ise DSÖ/AB günlük referans değeri (örn. "375 mg", "80 mg"); değilse boş string "".
typicalDose: genel bilgi amaçlı kısa doz aralığı; teşhis veya kişisel doz reçetesi DEĞİL.`

  try {
    const reply = await askAI([
      { role: 'system', content: system },
      { role: 'user', content: `Ürün adı: ${productName}\nEtken madde(ler): ${ingredientText}` },
    ])
    const match = reply.content.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : null
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ ok: false, error: 'Etken madde çıkarılamadı, tekrar dene' }, { status: 502 })
    }
    const items = parsed
      .map((x: Record<string, unknown>) => ({
        name: String(x.name ?? '').trim(),
        category: String(x.category ?? 'diğer').trim(),
        grade: ['A', 'B', 'C'].includes(String(x.grade)) ? String(x.grade) : 'C',
        typicalDose: String(x.typicalDose ?? '').trim(),
        dailyRef: x.dailyRef ? String(x.dailyRef).trim() : '',
      }))
      .filter((x: { name: string }) => x.name)
    return NextResponse.json({ ok: true, items })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Doğrulama başarısız'
    console.error('[api/ai/ingredient] başarısız:', msg)
    return NextResponse.json({ ok: false, error: 'Etken madde doğrulanamadı, tekrar dene' }, { status: 502 })
  }
}
