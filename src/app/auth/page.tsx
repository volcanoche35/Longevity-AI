'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (authError) setError(authError.message)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#64FFDA] mb-2">🧬 BioTrack</h1>
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
      </div>
    </main>
  )
}
