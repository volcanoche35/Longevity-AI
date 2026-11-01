import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { buildSvgPages, formatDateTr, type ReportData, type ReportSupplement } from '@/lib/report/build-svg'
import { renderPdf } from '@/lib/report/render-pdf'
import { reviewSupplements } from '@/lib/interaction-review'
import { dailyIntakeSummary, type DosePlan } from '@/lib/dosage'
import { normalizeSchedule } from '@/lib/schedule'
import { parseGoals } from '@/lib/health-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Belirlek içi hız sınırlayıcı: kullanıcı başına dakikada 5. */
const buckets = new Map<string, { n: number; t: number }>()
const LIMIT = 5
const WINDOW_MS = 60_000

function rateLimited(userId: string): boolean {
  const now = Date.now()
  const b = buckets.get(userId)
  if (!b || now - b.t > WINDOW_MS) {
    buckets.set(userId, { n: 1, t: now })
    if (buckets.size > 5000) buckets.clear()
    return false
  }
  b.n += 1
  return b.n > LIMIT
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Yerel takvim günü (daymarks ile aynı sınır). */
function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** UTC aritmetiğiyle gün ekler (yaz saati kayması yok). */
function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d) + delta * 86_400_000)
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

const shortDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`

interface SupRow {
  supplement_name: string | null
  daily_dosage: number | string | null
  time_of_day: string | null
  notes: string | null
  frequency: string | null
  dose_plan: DosePlan | null
  schedule?: unknown
}

/** data.ts'deki fromRow ile aynı davranış: doz metnini insan okunur biçimde üretir. */
function doseText(row: SupRow): string {
  if (row.dose_plan && Array.isArray(row.dose_plan.parts)) {
    try {
      const summary = dailyIntakeSummary(row.dose_plan)
      if (summary) return summary
    } catch {
      /* eski/bozuk plan: aşağıdaki eski alanlara düş */
    }
  }
  const daily = row.daily_dosage
  const dosage = daily !== null && daily !== undefined && daily !== '' ? `${daily} mg` : ''
  const freq = typeof row.frequency === 'string' ? row.frequency : ''
  return [dosage, freq].filter(Boolean).join(' · ')
}

interface MarkRow {
  day: string | null
  supplement_id: number | string | null
}

async function gatherData(client: SupabaseClient, userId: string, days: number): Promise<ReportData> {
  const [prof, sups, marks, wellness] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client
      .from('user_supplements')
      .select('id, supplement_name, daily_dosage, time_of_day, notes, frequency, dose_plan, schedule, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    client.from('daymarks').select('day, supplement_id'),
    client.from('wellness_entries').select('day, energy, sleep, digestion, note').order('day', { ascending: true }),
  ])

  if (prof.error) throw new Error(prof.error.message)
  if (sups.error) throw new Error(sups.error.message)
  if (marks.error) throw new Error(marks.error.message)
  if (wellness.error) throw new Error(wellness.error.message)

  const p = (prof.data ?? {}) as Record<string, unknown>
  let goals: string[] = []
  try {
    goals = parseGoals(p.goal ?? [])
  } catch {
    goals = []
  }
  const userName = typeof p.display_name === 'string' ? p.display_name : ''
  const sex = p.sex === 'female' || p.sex === 'male' ? (p.sex as 'female' | 'male') : null

  const supplements: ReportSupplement[] = ((sups.data ?? []) as SupRow[]).map(row => ({
    name: String(row.supplement_name ?? '').trim(),
    dosage: doseText(row),
    timeOfDay: typeof row.time_of_day === 'string' ? row.time_of_day : '',
    schedule: normalizeSchedule(row.schedule),
  }))

  const marksByDay = new Map<string, Set<string>>()
  for (const row of (marks.data ?? []) as MarkRow[]) {
    if (typeof row.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) continue
    const set = marksByDay.get(row.day) ?? new Set<string>()
    set.add(String(row.supplement_id))
    marksByDay.set(row.day, set)
  }

  const today = todayKey()
  const planned = supplements.length
  const daysList: ReportData['adherence']['days'] = []
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -(days - 1 - i))
    const taken = Math.min(planned, marksByDay.get(day)?.size ?? 0)
    daysList.push({ day, label: shortDay(day), taken, planned })
  }

  const review = reviewSupplements(supplements.map(s => ({ name: s.name, dosage: s.dosage })))
  const interactions = (review.status === 'reviewed' ? review.pairs : []).map(pair => ({
    products: `${pair.products[0]} + ${pair.products[1]}`,
    condition: pair.condition,
  }))

  const start = addDays(today, -(days - 1))
  const inWindow = ((wellness.data ?? []) as Array<Record<string, unknown>>).filter(
    e => typeof e.day === 'string' && e.day >= start && e.day <= today,
  )
  const data: ReportData = {
    generatedAt: formatDateTr(today),
    userName,
    profile: {
      age: p.age == null || p.age === '' ? '' : String(p.age),
      sex,
      heightCm: p.height_cm == null || p.height_cm === '' ? '' : String(p.height_cm),
      weightKg: p.weight_kg == null || p.weight_kg === '' ? '' : String(p.weight_kg),
      goals,
    },
    supplements,
    adherence: { windowDays: days, days: daysList },
    interactions,
  }

  if (inWindow.length > 0) {
    const avg = (key: string): number | undefined => {
      const vals = inWindow
        .map(e => Number(e[key]))
        .filter(n => Number.isFinite(n) && n >= 1 && n <= 5)
      if (vals.length === 0) return undefined
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    }
    const energyAvg = avg('energy')
    const sleepAvg = avg('sleep')
    const digestionAvg = avg('digestion')
    data.wellness = {
      ...(energyAvg !== undefined ? { energyAvg } : {}),
      ...(sleepAvg !== undefined ? { sleepAvg } : {}),
      ...(digestionAvg !== undefined ? { digestionAvg } : {}),
      entryDays: inWindow.length,
    }
  }

  return data
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return bad('Rapor hizmeti yapılandırılmamış.', 500)

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return bad('Oturum gerekli.', 401)

  const { searchParams } = new URL(req.url)
  const daysParam = searchParams.get('days')
  const days = daysParam === '30' ? 30 : 7

  // RLS korunur: service role KULLANILMAZ; kullanıcı token'ıyla sorgu yapılır.
  const client = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: authError } = await client.auth.getUser(token)
  if (authError || !user) return bad('Oturum geçersiz veya süresi dolmuş.', 401)

  if (rateLimited(user.id)) return bad('Çok fazla istek gönderdin, biraz bekle.', 429)

  try {
    const data = await gatherData(client, user.id, days)
    const svgPages = buildSvgPages(data)
    const pdf = await renderPdf(svgPages)
    const filename = `saglik-ozeti-${todayKey()}.pdf`
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[api/report/pdf]', error instanceof Error ? error.message : error)
    return bad('Rapor oluşturulamadı, birazdan tekrar dene.', 500)
  }
}
