/**
 * İstemci veri katmanı — demo modda lokal, canlı modda Supabase.
 * Amaç: sayfaların "Supabase yoksa çökme" davranışı olması.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function isRealUrl(u: string | undefined): boolean {
  return Boolean(u && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u) && !u.includes('your-project'))
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Supabase yalnızca gerçek yapılandırılmışsa oluşturulur; demo modda null döner */
export const supabase: SupabaseClient | null = isRealUrl(url) && anon
  ? createClient(url as string, anon, { auth: { persistSession: true } })
  : null

export interface ClientSupplement {
  id: string
  name: string
  dosage: string
  frequency: string
  time_of_day: string
  notes: string
}

const SEED: ClientSupplement[] = [
  { id: 'd1', name: 'Vitamin D3 + K2', dosage: '2000 IU', frequency: 'Günde 1', time_of_day: 'Sabah', notes: 'Tok karnına' },
  { id: 'd2', name: 'Magnezyum Glisinat', dosage: '300 mg', frequency: 'Günde 1', time_of_day: 'Gece', notes: 'Uyku için' },
  { id: 'd3', name: 'Kreatin Monohidrat', dosage: '5 g', frequency: 'Günde 1', time_of_day: 'Öğle', notes: '' },
  { id: 'd4', name: 'Omega-3', dosage: '1000 mg EPA+DHA', frequency: 'Günde 1', time_of_day: 'Sabah', notes: 'Tok karnına' },
]

/** oturum-ömrü boyunca yaşayan demo deposu */
let demoStore: ClientSupplement[] = [...SEED]
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

export function onDemoChange(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export async function listSupplements(): Promise<ClientSupplement[]> {
  if (IS_DEMO || !supabase) return [...demoStore]
  const { data, error } = await supabase.from('supplements')
    .select('*').order('created_at', { ascending: false })
  if (error) {
    console.warn('[data] supabase list:', error.message)
    return []
  }
  return (data ?? []) as ClientSupplement[]
}

export async function addSupplement(input: Omit<ClientSupplement, 'id'>): Promise<boolean> {
  if (IS_DEMO || !supabase) {
    demoStore = [{ ...input, id: `d${Date.now()}` }, ...demoStore]
    emit()
    return true
  }
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('supplements').insert({ ...input, user_id: user?.id ?? null })
  if (error) {
    console.warn('[data] supabase add:', error.message)
    return false
  }
  return true
}

export async function removeSupplement(id: string): Promise<boolean> {
  if (IS_DEMO || !supabase) {
    demoStore = demoStore.filter(s => s.id !== id)
    emit()
    return true
  }
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  return !error
}

export interface AssistantReply { content: string; model?: string; note?: string }

export async function askAssistant(
  messages: { role: 'user' | 'assistant'; content: string }[],
  supplements: string[],
): Promise<AssistantReply> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, supplements }),
  })
  const data = (await res.json().catch(() => null)) as
    { ok?: boolean; content?: string; model?: string; note?: string; error?: string } | null
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'AI yanıtı alınamadı')
  }
  return { content: data.content as string, model: data.model, note: data.note }
}
