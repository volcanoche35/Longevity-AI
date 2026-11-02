import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Hesap silme: kullanıcı JWT'sini doğrular, service_role ile KULLANICIYA AİT
 * TÜM veriyi açıkça siler, sonra auth.users satırını siler.
 *
 * Neden açık silme (CASCADE'e güvenmek yerine): bazı tablolar (user_supplements →
 * profiles.id, user_favorites, user_medications, usage_logs, biomarkers,
 * subscriptions, subscription_summary) auth.users'a CASCADE bağlı DEĞİL. auth.users
 * silinince bu satırlar yetim kalır ve kullanıcı eski verisini/hesabını "hâlâ görür".
 *
 * Sıra önemli: çocuk tablolar (FK sahipleri) önce, sonra profiles, en son auth user.
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
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Oturum geçersiz veya süresi dolmuş.' }, { status: 401 })
  }

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } })

  // user_id sütunu taşıyan tüm kullanıcı tabloları (çocuktan ebeveyne doğru).
  const userTables = [
    'daymarks',            // user_supplements + auth.users'a bağlı
    'reminder_acks',       // reminders + auth.users'a bağlı
    'user_supplements',    // profiles.id'ye bağlı
    'reminders',
    'wellness_entries',
    'user_favorites',
    'user_medications',
    'usage_logs',
    'biomarkers',
    'subscription_summary',
    'subscriptions',
  ]

  const failures: string[] = []
  for (const table of userTables) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id)
    if (error) failures.push(`${table}: ${error.message}`)
  }

  // profiles: satır anahtarı id = auth.uid()
  const { error: profileErr } = await admin.from('profiles').delete().eq('id', user.id)
  if (profileErr) failures.push(`profiles: ${profileErr.message}`)

  // Son adım: auth user. Bu, kalan auth.users CASCADE'li satırları da temizler.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) failures.push(`auth: ${delErr.message}`)

  if (failures.length) {
    // auth user silindiyse veri temizlenmiştir (kısmi hata olsa da başarı say).
    return NextResponse.json({ ok: !delErr, error: failures.join('; ') }, { status: delErr ? 500 : 200 })
  }

  return NextResponse.json({ ok: true })
}
