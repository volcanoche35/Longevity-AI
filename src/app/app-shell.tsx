'use client'

import { useEffect, useState } from 'react'
import { supabase, IS_DEMO } from '@/lib/data'
import AuthPage from './auth/page'
import ReminderBanner from '@/components/reminder-banner'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type SessionState = { user: { email?: string | null; id: string } } | null

const TABS = [
  { href: '/dashboard', icon: 'today', label: 'Bugün' },
  { href: '/supplements', icon: 'pill', label: 'Takviyeler' },
  { href: '/tracking', icon: 'chart', label: 'Günlüğüm' },
  { href: '/chat', icon: 'chat', label: 'Asistan' },
  { href: '/profile', icon: 'profile', label: 'Profil' },
]
function NavIcon({ kind }: { kind: string }) {
  const shapes: Record<string, React.ReactNode> = {
    today: <><path d="M4 10 12 3l8 7v10H4z"/><path d="M9 20v-7h6v7"/></>,
    pill: <><path d="M8.5 4.5a5 5 0 0 1 7 7l-5 5a5 5 0 0 1-7-7z" transform="translate(3 1)"/><path d="m8 9 7 7"/></>,
    chart: <><path d="M4 4v16h16"/><path d="m7 14 4-4 4 2 5-7"/></>,
    chat: <><path d="M20 11a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 1 1 17-4Z"/><path d="M8 10h8M8 14h5"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind]}</svg>
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  /**
   * Yerel mod = demo bayrağı VEYA gerçek Supabase yapılandırması yok.
   * Bu durumda auth kapalıdır; sahte oturum/e-posta üretilmez ve bekleme ekranı
   * sonsuza kadar dönmez.
   */
  const localMode = IS_DEMO || !supabase
  const remoteAuth = !localMode

  const [session, setSession] = useState<SessionState>(null)
  const [loading, setLoading] = useState(remoteAuth)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!remoteAuth || !supabase) return
    let active = true
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setSession(data.session) })
      .catch(() => { if (active) setSession(null) })
      .finally(() => { if (active) setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => { active = false; subscription.unsubscribe() }
  }, [remoteAuth])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(registration => registration.update()).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (session && pathname === '/onboarding') router.replace('/dashboard')
  }, [session, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-[var(--primary)] text-2xl animate-pulse">🧬</p>
      </div>
    )
  }
  // Giriş yapmış kullanıcı onboarding'e takılırsa ana ekrana yönlendir (useEffect ile).
  if (session && pathname === '/onboarding') return null
  if (!session && remoteAuth && pathname !== '/auth' && pathname !== '/onboarding') return <AuthPage />

  // Masaüstünde panel geniş alan kullanır; diğer sayfalar mobil kolonda kalır.
  const wide = pathname.startsWith('/dashboard')
  const mainWidth = wide
    ? 'max-w-7xl w-full md:px-6 md:pt-2'
    : 'max-w-lg w-full'
  // Giriş öncesi ekranlar (onboarding, auth): uygulama navigasyonu ve hatırlatma çubuğu gizlenir.
  const hideChrome = pathname === '/onboarding' || pathname === '/auth'

  return (
    <div className="min-h-screen">
      <main className={`mx-auto min-h-screen ${mainWidth}`}>
        {!remoteAuth && !IS_DEMO && (
          <div className="px-4 pt-3">
            <p
              className="text-[11px] leading-snug rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,176,32,.08)', border: '1px solid rgba(255,176,32,.28)', color: 'var(--amber)' }}
            >
              Yerel mod: Supabase yapılandırılmamış. Üyelik kapalı, veriler yalnızca bu cihazda tutulur.
            </p>
          </div>
        )}
        {!hideChrome && <ReminderBanner />}
        {children}
        {!hideChrome && (
          <nav className="app-nav tabbar" aria-label="Ana menü">
            {TABS.map(t => <Link key={t.href} href={t.href} className="app-nav-link" aria-current={pathname.startsWith(t.href) ? 'page' : undefined}>
              <NavIcon kind={t.icon} /><span>{t.label}</span>
            </Link>)}
          </nav>
        )}
      </main>
    </div>
  )
}
