'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [count, setCount] = useState(0)
  const [today, setToday] = useState<{name: string; time: string}[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    supabase.from('supplements').select('*').then(({ data }) => {
      if (data) {
        setCount(data.length)
        const now = new Date().getHours()
        const timeMap: Record<string, string> = { Sabah: '08:00', Öğle: '13:00', Akşam: '19:00', Gece: '22:00' }
        setToday(data.filter(s => {
          const h = parseInt(timeMap[s.time_of_day]?.split(':')[0] || '0')
          return Math.abs(h - now) <= 4
        }))
      }
    })
  }, [])

  return (
    <div className="p-4 pb-24">
      <h2 className="text-xl font-bold text-[#64FFDA] mb-1">🧬 BioTrack</h2>
      <p className="text-[#a09880]/60 text-sm mb-6">Hoş geldin{user?.email ? `, ${user.email.split('@')[0]}` : ''}</p>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/supplements" className="glass-card p-4 hover:border-[#64FFDA]/40 transition-all">
          <p className="text-3xl mb-1">💊</p>
          <p className="text-2xl font-bold text-[#64FFDA]">{count}</p>
          <p className="text-[#a09880] text-xs">Takviye</p>
        </Link>
        <Link href="/chat" className="glass-card p-4 hover:border-[#64FFDA]/40 transition-all">
          <p className="text-3xl mb-1">🤖</p>
          <p className="text-lg font-bold text-[#64FFDA]">AI Asistan</p>
          <p className="text-[#a09880] text-xs">Soru sor</p>
        </Link>
        <div className="glass-card p-4 col-span-2">
          <p className="text-[#a09880] text-xs mb-2">Bugün Alınacaklar</p>
          {today.length > 0 ? today.map(s => (
            <div key={s.name} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[#e0d8c8] text-sm">{s.name}</span>
              <span className="text-[#64FFDA]/60 text-xs">{s.time}</span>
            </div>
          )) : (
            <p className="text-[#a09880]/40 text-sm">Bugünlük takviye yok</p>
          )}
        </div>
      </div>
    </div>
  )
}
