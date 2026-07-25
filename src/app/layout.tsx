'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AuthPage from './auth/page'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(DEMO_MODE ? { user: { email: 'demo@biotrack.ai', id: 'demo' } } : null)
  const [loading, setLoading] = useState(!DEMO_MODE)
  const pathname = usePathname()

  useEffect(() => {
    if (DEMO_MODE) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-[#64FFDA] animate-pulse">🧬</p></div>

  if (!session && pathname !== '/auth') return <AuthPage />

  const isDemo = DEMO_MODE && session?.user?.email === 'demo@biotrack.ai'

  const tabs = [
    { href: '/dashboard', icon: '🧬', label: 'Panel' },
    { href: '/supplements', icon: '💊', label: 'Takviyeler' },
    { href: '/chat', icon: '🤖', label: 'AI' },
    { href: '/profile', icon: '👤', label: 'Profil' },
  ]

  return (
    <html lang="tr">
      <body className="bg-[#000000] text-[#e0d8c8] antialiased">
        <main className="max-w-lg mx-auto min-h-screen">
          {isDemo && (
            <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-center">
              <p className="text-yellow-500/70 text-[10px]">⚠️ DEMO MOD — Supabase bağlantısı yok</p>
            </div>
          )}
          {children}
          <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#000000]/95 backdrop-blur-xl border-t border-white/5 px-2 py-2 flex justify-around z-50">
            {tabs.map(t => (
              <Link key={t.href} href={t.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[48px] ${
                  pathname.startsWith(t.href) ? 'text-[#64FFDA]' : 'text-[#a09880]/50'
                }`}>
                <span className="text-xl">{t.icon}</span>
                <span className="text-[10px]">{t.label}</span>
              </Link>
            ))}
          </nav>
        </main>
      </body>
    </html>
  )
}
