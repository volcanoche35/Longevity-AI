'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Supplement {
  id: string; name: string; dosage: string; frequency: string
  time_of_day: string; notes: string
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

  return (
    <div className="p-4 pb-24">
      <h2 className="text-xl font-bold text-[#64FFDA] mb-4">💊 Takviyelerim</h2>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full py-4 border-2 border-dashed border-[#64FFDA]/30 rounded-xl
                     text-[#64FFDA]/60 hover:text-[#64FFDA] hover:border-[#64FFDA]/60 transition-all">
          + Takviye Ekle
        </button>
      ) : (
        <form onSubmit={addSupplement} className="glass-card p-4 space-y-3 mb-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Takviye adı"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-[#e0d8c8] text-sm focus:outline-none focus:border-[#64FFDA]/50" autoFocus />
          <div className="flex gap-2">
            <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Doz (örn: 500mg)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-sm text-[#e0d8c8] focus:outline-none focus:border-[#64FFDA]/50" />
            <select value={freq} onChange={e => setFreq(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-sm text-[#e0d8c8]">
              {['Günde 1', 'Günde 2', 'Günde 3', 'Haftada 1'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={time} onChange={e => setTime(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-sm text-[#e0d8c8]">
              {['Sabah', 'Öğle', 'Akşam', 'Gece'].map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not (opsiyonel)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-sm text-[#e0d8c8] focus:outline-none focus:border-[#64FFDA]/50" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 text-sm text-[#a09880] hover:text-[#e0d8c8] transition-colors">İptal</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-[#64FFDA] text-[#000000] rounded-lg font-semibold text-sm disabled:opacity-50">
              {loading ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 mt-4">
        {supplements.map(s => (
          <div key={s.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[#e0d8c8] font-medium">{s.name}</p>
              <p className="text-[#a09880] text-xs">{s.dosage} · {s.frequency} · {s.time_of_day}</p>
            </div>
            <button onClick={() => deleteSupplement(s.id)}
              className="text-red-400/50 hover:text-red-400 text-sm transition-colors">Sil</button>
          </div>
        ))}
        {supplements.length === 0 && !showForm && (
          <p className="text-center text-[#a09880]/40 py-8">Henüz takviye eklenmedi</p>
        )}
      </div>
    </div>
  )
}
