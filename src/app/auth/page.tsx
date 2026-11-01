'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase, IS_DEMO } from '@/lib/data'
import { ensureProfile } from '@/lib/profile'
import { KVKK_SECTIONS, KVKK_CONSENT_LABEL, KVKK_CONSENT_VERSION } from '@/lib/kvkk'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consent, setConsent] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (IS_DEMO || !supabase) {
      setError('Şu an demo modunda: hesap açma kapalı. Uygulama demo verisiyle çalışıyor.')
      setLoading(false)
      return
    }

    if (isLogin) {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(authError.message)
      else void ensureProfile(email.split('@')[0])
    } else {
      if (!consent) { setError("Kayıt olmak için Aydınlatma Metni'ni okuyup açık rıza vermelisin."); setLoading(false); return }
      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) setError(authError.message)
      else if (data.user) {
        // Profil satırı (idempotent upsert); hata sessiz yutulur.
        try {
          const { error: profileError } = await supabase.from('profiles').upsert(
            { id: data.user.id, display_name: email.split('@')[0], onboarding_complete: false, consent_version: KVKK_CONSENT_VERSION, consent_at: new Date().toISOString() },
            { onConflict: 'id', ignoreDuplicates: true },
          )
          if (profileError) console.warn('[auth] profil oluşturulamadı:', profileError.message)
        } catch (err) { console.warn('[auth] profil oluşturulamadı:', err) }
      }
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#64FFDA] mb-2">🧬 LongevityAI</h1>
          <p className="text-[#a09880] text-sm">Longevity AI Asistanın</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="E-posta" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#e0d8c8]
                       placeholder:text-[#a09880]/50 focus:outline-none focus:border-[#64FFDA]/50 transition-all"
          />
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Şifre" required minLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#e0d8c8]
                       placeholder:text-[#a09880]/50 focus:outline-none focus:border-[#64FFDA]/50 transition-all"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {!isLogin && (
            <>
              <details className="text-xs text-[#a09880]">
                <summary className="cursor-pointer text-[#64FFDA]/70 hover:text-[#64FFDA] text-sm py-1">Aydınlatma Metni (KVKK)</summary>
                <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1 leading-relaxed bg-white/[0.03] rounded-lg p-3 border border-white/5">
                  {KVKK_SECTIONS.map(s => (
                    <div key={s.title}>
                      <p className="font-semibold text-[#e0d8c8]">{s.title}</p>
                      <p className="whitespace-pre-line">{s.body}</p>
                    </div>
                  ))}
                </div>
              </details>
              <label className="flex items-start gap-2 text-xs text-[#a09880] leading-relaxed cursor-pointer">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 shrink-0 accent-[#64FFDA]" />
                <span>{KVKK_CONSENT_LABEL}</span>
              </label>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-[#64FFDA] text-[#000000] rounded-xl font-semibold
                       hover:bg-[#4fd1b8] disabled:opacity-50 transition-all text-base">
            {loading ? 'Bekle...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <button onClick={() => { setIsLogin(!isLogin); setError('') }}
          className="w-full mt-4 text-[#64FFDA]/60 hover:text-[#64FFDA] text-sm transition-colors">
          {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Hesabın var mı? Giriş yap'}
        </button>
        {isLogin && <Link href="/auth/reset" className="block w-full mt-3 text-center text-[#a09880]/60 hover:text-[#64FFDA] text-sm transition-colors">Şifremi unuttum</Link>}
      </div>
    </main>
  )
}
