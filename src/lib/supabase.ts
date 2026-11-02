/**
 * Supabase istemcisi + "hazır mı?" bayrakları.
 *
 * SUPABASE_READY mantığı:
 *  - isSupabaseConfigured(): URL gerçek bir *.supabase.co/.in adresi VE anon key dolu.
 *  - isDemoMode(): NEXT_PUBLIC_DEMO_MODE === 'true'.
 *  - isRemoteMode(): yapılandırılmış VE demo kapalı. Veri katmanı yalnız bunu true görürse
 *    Supabase'e gider; aksi halde mevcut localStorage yolu çalışır.
 *
 * Canlıya geçiş: supabase-schema-v2.sql'i SQL Editor'da çalıştır, sonra
 * .env.local → NEXT_PUBLIC_DEMO_MODE=false ve sunucuyu yeniden derle.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isRealUrl(u: string | undefined): boolean {
  return Boolean(u && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(u) && !u.includes('your-project'))
}

/** Ortam değişkenleri geçerli mi (demo durumundan bağımsız). */
export function isSupabaseConfigured(): boolean {
  return isRealUrl(url) && Boolean(anon)
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

/** Env yoksa null. */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(url as string, anon as string, { auth: { persistSession: true } })
  : null

/** true ⇒ veri Supabase'e gider; false ⇒ localStorage. */
export function isRemoteMode(): boolean {
  return !isDemoMode() && supabase !== null
}

/** Oturum açmış kullanıcının id'si; yoksa null. */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  // getSession önbellekten okur (ağ çağrısı YAPMAZ); getUser JWT'yi ağdan doğrular
  // ve her işaretlemede 200-500 ms gecikmeye yol açar. ID için getSession yeterli.
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}
