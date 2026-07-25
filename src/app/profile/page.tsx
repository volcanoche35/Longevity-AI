'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)) }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (!user) return null

  return (
    <div className="p-4 pb-24">
      <h2 className="text-xl font-bold text-[#64FFDA] mb-6">👤 Profil</h2>
      <div className="glass-card p-6 space-y-4">
        <div>
          <p className="text-[#a09880] text-xs">E-posta</p>
          <p className="text-[#e0d8c8]">{user.email}</p>
        </div>
        <div>
          <p className="text-[#a09880] text-xs">Kullanıcı ID</p>
          <p className="text-[#e0d8c8] text-xs font-mono">{user.id.slice(0, 16)}...</p>
        </div>
        <button onClick={logout}
          className="w-full py-3 mt-4 border border-red-400/30 text-red-400 rounded-xl
                     hover:bg-red-400/10 transition-all text-sm font-medium">
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}
