'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Supplement { id: string; name: string; dosage: string; frequency: string; time_of_day: string; notes: string }

const SUPPLEMENT_ICONS: Record<string, string> = {
  Vitamin: '💊', Magnezyum: '⚡', Omega: '🐟', Balık: '🐟', D3: '☀️', K2: '🦴', Kalsiyum: '🦴',
  Çinko: '🛡️', Demir: '🩸', B12: '🧠', C: '🍊', Probiyotik: '🦠', Melatonin: '🌙',
  Kreatin: '💪', Protein: '🥩', Kolajen: '✨', Ashwagandha: '🌿', Lion: '🍄', NAC: '🫧',
  CoQ10: '❤️', default: '💊'
}

const TIME_COLORS: Record<string, string> = {
  Sabah: 'from-amber-500/10 to-yellow-500/5 border-amber-500/20',
  Öğle: 'from-sky-500/10 to-blue-500/5 border-sky-500/20',
  Akşam: 'from-purple-500/10 to-pink-500/5 border-purple-500/20',
  Gece: 'from-indigo-500/10 to-violet-500/5 border-indigo-500/20',
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [name, setName] = useState(''); const [dosage, setDosage] = useState('')
  const [freq, setFreq] = useState('Günde 1'); const [time, setTime] = useState('Sabah')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false); const [loading, setLoading] = useState(false)

  const fetchSupplements = async () => {
    const { data } = await supabase.from('supplements').select('*').order('created_at', { ascending: false })
    if (data) setSupplements(data)
  }

  useEffect(() => { fetchSupplements() }, [])

  const addSupplement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const user = (await supabase.auth.getUser()).data.user
    await supabase.from('supplements').insert({
      user_id: user?.id, name, dosage, frequency: freq, time_of_day: time, notes
    })
    setName(''); setDosage(''); setNotes(''); setShowForm(false)
    await fetchSupplements()
    setLoading(false)
  }

  const deleteSupplement = async (id: string) => {
    await supabase.from('supplements').delete().eq('id', id)
    await fetchSupplements()
  }

  const getIcon = (name: string) => {
    for (const [key, icon] of Object.entries(SUPPLEMENT_ICONS)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return icon
    }
    return SUPPLEMENT_ICONS.default
  }

  const groupedByTime = supplements.reduce((acc, s) => {
    const t = s.time_of_day || 'Diğer'
    if (!acc[t]) acc[t] = []
    acc[t].push(s)
    return acc
  }, {} as Record<string, Supplement[]>)

  return (
    <div className="p-4 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#64FFDA]">💊 Takviyelerim</h2>
          <p className="text-[#a09880]/60 text-xs mt-0.5">{supplements.length} takviye</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="w-11 h-11 rounded-full bg-[#64FFDA]/10 border border-[#64FFDA]/20 
                     text-[#64FFDA] text-xl flex items-center justify-center hover:bg-[#64FFDA]/20 transition-all">
          {showForm ? '×' : '+'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={addSupplement} className="glass-card p-4 space-y-3 mb-6 animate-slide-up">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Takviye adı (örn: Magnezyum Bisglisinat)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#e0d8c8] text-sm focus:outline-none focus:border-[#64FFDA]/50" autoFocus />
          <div className="flex gap-2">
            <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Doz (örn: 400mg)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0d8c8] focus:outline-none focus:border-[#64FFDA]/50" />
            <select value={freq} onChange={e => setFreq(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-[#e0d8c8]">
              {['Günde 1', 'Günde 2', 'Günde 3', 'Haftada 1'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={time} onChange={e => setTime(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0d8c8]">
              {['Sabah', 'Öğle', 'Akşam', 'Gece'].map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e0d8c8] focus:outline-none focus:border-[#64FFDA]/50" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-3 text-sm text-[#a09880] hover:text-[#e0d8c8] transition-colors">İptal</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-[#64FFDA] text-[#000000] rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-[#4fd1b8] transition-all">
              {loading ? '⏳' : 'Takviye Ekle'}
            </button>
          </div>
        </form>
      )}

      {/* Grouped by time */}
      {Object.entries(groupedByTime).map(([timeGroup, items]) => (
        <div key={timeGroup} className="mb-6">
          <h3 className="text-[#a09880]/70 text-xs font-semibold uppercase tracking-wider mb-3 ml-1">
            {timeGroup === 'Sabah' && '🌅 Sabah'}
            {timeGroup === 'Öğle' && '☀️ Öğle'}
            {timeGroup === 'Akşam' && '🌆 Akşam'}
            {timeGroup === 'Gece' && '🌙 Gece'}
            {!['Sabah', 'Öğle', 'Akşam', 'Gece'].includes(timeGroup) && '📋 ' + timeGroup}
          </h3>
          <div className="space-y-2">
            {items.map(s => (
              <div key={s.id} 
                className={`bg-gradient-to-r ${TIME_COLORS[s.time_of_day] || 'border-white/5'} rounded-2xl p-4 flex items-center gap-3 animate-fade-in`}>
                <span className="text-2xl flex-shrink-0">{getIcon(s.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#e0d8c8] font-medium text-sm truncate">{s.name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {s.dosage && <span className="text-[#a09880] text-[11px]">{s.dosage}</span>}
                    <span className="text-[#a09880]/60 text-[11px]">· {s.frequency}</span>
                    {s.notes && <span className="text-[#a09880]/40 text-[11px] truncate">· {s.notes}</span>}
                  </div>
                </div>
                <button onClick={() => deleteSupplement(s.id)} 
                  className="text-red-400/30 hover:text-red-400 text-lg transition-colors px-2">
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {supplements.length === 0 && !showForm && (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">💊</p>
          <p className="text-[#a09880]/40 text-lg mb-2">Henüz takviye eklenmedi</p>
          <p className="text-[#a09880]/30 text-sm">+ butonuna dokunarak ilk takviyeni ekle</p>
        </div>
      )}
    </div>
  )
}
