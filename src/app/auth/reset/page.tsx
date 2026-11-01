'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/data'

export default function ResetPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!supabase) return
    // E-posta bağlantısıyla gelindiyse recovery moduna geç.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setStatus(''); setLoading(true)
    if (!supabase) { setError('Oturum servisi kullanılamıyor.'); setLoading(false); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` })
    setLoading(false)
    if (error) setError(error.message)
    else setStatus('Sıfırlama bağlantısı e-postana gönderildi. Gelen kutusunu kontrol et.')
  }

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setStatus(''); setLoading(true)
    if (!supabase) { setError('Oturum servisi kullanılamıyor.'); setLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else { setStatus('Şifren güncellendi. Giriş yapabilirsin.'); setTimeout(() => router.replace('/auth'), 1500) }
  }

  return (
    <main className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2fc1b4] mb-2">🔑 Parola Sıfırlama</h1>
          <p className="text-[#8a96af] text-sm">{recovery ? 'Yeni şifreni belirle' : 'E-postana sıfırlama bağlantısı gönder'}</p>
        </div>

        {!recovery ? (
          <form onSubmit={requestReset} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-posta" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#e7e3d4] placeholder:text-[#8a96af]/50 focus:outline-none focus:border-[#2fc1b4]/50 transition-all" />
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#2fc1b4] text-[#000000] rounded-xl font-semibold hover:bg-[#2fc1b4] disabled:opacity-50 transition-all">
              {loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
            </button>
          </form>
        ) : (
          <form onSubmit={setNewPassword} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Yeni şifre" required minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[#e7e3d4] placeholder:text-[#8a96af]/50 focus:outline-none focus:border-[#2fc1b4]/50 transition-all" />
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-[#2fc1b4] text-[#000000] rounded-xl font-semibold hover:bg-[#2fc1b4] disabled:opacity-50 transition-all">
              {loading ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
            </button>
          </form>
        )}

        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        {status && <p className="text-[#2fc1b4] text-sm mt-4">{status}</p>}

        <button onClick={() => router.replace('/auth')} className="w-full mt-4 text-[#2fc1b4]/60 hover:text-[#2fc1b4] text-sm transition-colors">
          Girişe dön
        </button>
      </div>
    </main>
  )
}
