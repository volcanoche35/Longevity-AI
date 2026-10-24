'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/data'
import AuthPage from './auth/page'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

type SessionState = { user: { email?: string | null; id: string } } | null

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>(DEMO_MODE ? { user: { email: 'demo@biotrack.ai', id: 'demo' } } : null)
  const [loading, setLoading] = useState(!DEMO_MODE)
  const pathname = usePathname()

  useEffect(() => {
    if (DEMO_MODE || !supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><p className="text-[var(--primary)] text-2xl animate-pulse">🧬</p></div>
  if (!session && pathname !== '/auth') return <AuthPage />

  const tabs = [
    { href: '/dashboard', icon: '🧬', label: 'Panel' },
    { href: '/supplements', icon: '💊', label: 'Takviyeler' },
    { href: '/chat', icon: '🤖', label: 'AI' },
    { href: '/profile', icon: '👤', label: 'Profil' },
  ]

  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto min-h-screen">
        {children}
        <nav className="tabbar fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-2 py-2 flex justify-around z-50">
          {tabs.map(t => {
            const activeTab = pathname.startsWith(t.href)
            return (
              <Link key={t.href} href={t.href} data-active={activeTab}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[52px] ${
                  activeTab ? 'bg-white/8' : ''
                }`}>
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="text-[10px] font-medium">{t.label}</span>
              </Link>
            )
          })}
        </nav>
      </main>
    </div>
  )
}
