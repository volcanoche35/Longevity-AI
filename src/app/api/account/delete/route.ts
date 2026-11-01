import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Hesap silme: kullanıcı JWT'sini doğrular, service_role ile auth.users satırını
 * siler. Tüm kullanıcı verisi (profiles, user_supplements, wellness_entries,
 * daymarks, reminders, reminder_acks) ON DELETE CASCADE ile otomatik silinir.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !serviceRole || !anon) {
    return NextResponse.json({ ok: false, error: 'Hesap silme yapılandırılmamış.' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ ok: false, error: 'Oturum gerekli.' }, { status: 401 })

  const userClient = createClient(url, anon, { auth: { persistSession: false } })
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ ok: false, error: 'Oturum geçersiz veya süresi dolmuş.' }, { status: 401 })

  const adminClient = createClient(url, serviceRole, { auth: { persistSession: false } })

  // user_supplements.user_id → profiles.id FK'sinde CASCADE yok; önce açıkça sil
  // (daymarks.supplement_id → user_supplements CASCADE olduğu için işaretler de düşer).
  await adminClient.from('user_supplements').delete().eq('user_id', user.id)
  await adminClient.from('profiles').delete().eq('id', user.id)

  // auth.users silinince wellness_entries, daymarks, reminders, reminder_acks
  // (hepsi auth.users'a CASCADE) otomatik silinir.
  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
