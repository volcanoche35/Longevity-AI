'use client'

import { useState, useEffect, useMemo } from 'react'
import { listSupplements, addSupplement as createSupplement, removeSupplement as deleteRow } from '@/lib/data'
import { suggest, findEntry, findConflicts, catalogSize, type CatalogEntry } from '@/lib/catalog'

interface Supplement { id: string; name: string; dosage: string; frequency: string; time_of_day: string; notes: string }

const CATEGORY_ICON: Record<string, string> = {
  vitamin: '🍊', mineral: '⚡', 'yağ asidi': '🐟', yağ: '🫒', aminoasit: '🧬', protein: '🥩',
  bitkisel: '🌿', adaptogen: '🌱', mantar: '🍄', nootropik: '🧠', performans: '💪', eklem: '🦴',
  mikrobiyota: '🦠', lif: '🌾', prebiyotik: '🌾', uyku: '🌙', hormon: '🧪', kombinasyon: '🧩',
  'vitamin-benzeri': '🍊', etiket: '💊',
}
const GRADE_CLASS = { A: 'chip-a', B: 'chip-b', C: 'chip-c' } as const
const TIMES = ['Sabah', 'Öğle', 'Akşam', 'Gece']

const TIME_COLORS: Record<string, string> = {
  Sabah: 'from-amber-500/12 to-yellow-500/4 border-amber-500/20',
  Öğle: 'from-cyan-500/12 to-sky-500/4 border-cyan-400/20',
  Akşam: 'from-rose-500/12 to-red-500/4 border-rose-500/20',
  Gece: 'from-fuchsia-500/12 to-purple-500/4 border-fuchsia-500/20',
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [name, setName] = useState(''); const [dosage, setDosage] = useState('')
  const [freq, setFreq] = useState('Günde 1'); const [time, setTime] = useState('Sabah')
  const [notes, setNotes] = useState('')
  const [showForm, setShowForm] = useState(false); const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => suggest(name, 7), [name])
  const picked = useMemo(() => findEntry(name), [name])

  // envanterde birbirini dışlayan çift var mı?
  const conflicts = useMemo(
    () => [] as { a: string; b: string; reason: string }[],
    [supplements],
  )

  const fetchSupplements = () =>
    listSupplements().then(setSupplements).catch(() => setSupplements([]))

  useEffect(() => { fetchSupplements() }, [])

  const applySuggestion = (s: CatalogEntry) => {
    setName(s.name)
    setOpen(false)
  }

  const addSupplement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await createSupplement({ name, dosage, frequency: freq, time_of_day: time, notes })
    setName(''); setDosage(''); setNotes(''); setShowForm(false)
    await fetchSupplements()
    setLoading(false)
  }

  const deleteSupplement = async (id: string) => {
    await deleteRow(id)
    await fetchSupplements()
  }

  const getIcon = (n: string) => CATEGORY_ICON[findEntry(n)?.category ?? ''] ?? '💊'

  const groupedByTime = supplements.reduce((acc, s) => {
    const t = s.time_of_day || 'Diğer'
    ;(acc[t] ??= []).push(s)
    return acc
  }, {} as Record<string, Supplement[]>)

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--primary)]/60'

  return (
    <div className="p-4 pb-28 min-h-screen">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Takviyelerim</h2>
          <p className="text-[var(--text-3)] text-xs mt-0.5">
            {supplements.length} envanter · {catalogSize()} katalog kaydı
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="w-11 h-11 rounded-full grid place-items-center text-xl transition-colors"
          style={{ background: showForm ? 'rgba(255,77,94,.15)' : 'rgba(57,224,122,.12)', color: showForm ? 'var(--primary)' : 'var(--vital)' }}>
          {showForm ? '×' : '+'}
        </button>
      </div>

      {/* ── Etkileşim denetimi ── */}
      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-[#FF6B4A]/25 bg-[#FF6B4A]/8 p-3 mb-4">
          <p className="text-[11px] font-mono tracking-widest text-[#FF9A7A]">EMİLİM / ETKİLEŞİM UYARISI</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-[12px] text-[var(--text)] mt-1">
              {c.a} ↔ {c.b} <span className="text-[var(--text-3)]">— {c.reason}</span>
            </p>
          ))}
        </div>
      )}

      {/* ── Ekleme formu ── */}
      {showForm && (
        <form onSubmit={addSupplement} className="glass-card p-4 space-y-3 mb-6 animate-fade-in">
          <div className="relative">
            <input
              value={name}
              onChange={e => { setName(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 160)}
              placeholder="Takviye adı yaz — örn: m, mag, demir…"
              className={inputCls}
              autoComplete="off"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="catalog-suggest"
              autoFocus
            />
            {open && suggestions.length > 0 && (
              <ul id="catalog-suggest" className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-2xl border border-white/15" style={{ background: 'rgba(10, 15, 24, 0.96)', backdropFilter: 'blur(24px) saturate(120%)', WebkitBackdropFilter: 'blur(24px) saturate(120%)', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)' }}>
                {suggestions.map(s => (
                  <li key={s.name}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => applySuggestion(s)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/6 transition-colors"
                    >
                      <span className="text-lg shrink-0">{CATEGORY_ICON[s.category] ?? '💊'}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-white truncate">{s.name}</span>
                        <span className="block text-[10px] text-[var(--text-3)] truncate">
                          {s.category}
                        </span>
                      </span>
                      <span className="chip shrink-0">Katalog</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* seçilen kaydın kanıt notu — kullanıcı ne yazdığını bilsin */}
          {picked && <p className="text-xs text-[var(--text-2)]">Katalogdan seçildi. Dozu kendi ürün etiketinizden girin; katalog tıbbi doğrulama içermez.</p>}

          <div className="flex gap-2">
            <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Doz (örn: 400mg)" className={`${inputCls} flex-1`} />
            <select value={freq} onChange={e => setFreq(e.target.value)} className={inputCls}>
              {['Günde 1', 'Günde 2', 'Günde 3', 'Haftada 1'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select value={time} onChange={e => setTime(e.target.value)} className={`${inputCls} flex-1`}>
              {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Not" className={`${inputCls} flex-1`} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-3 text-sm text-[var(--text-3)] hover:text-white transition-colors">İptal</button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
              style={{ background: 'linear-gradient(92deg,#FF4D5E,#FFB020)', color: '#0A0F18' }}>
              {loading ? '…' : 'Envantere ekle'}
            </button>
          </div>
        </form>
      )}

      {/* ── Zaman grupları ── */}
      {Object.entries(groupedByTime).map(([timeGroup, items]) => (
        <div key={timeGroup} className="mb-6">
          <h3 className="text-[var(--text-2)] text-xs font-semibold uppercase tracking-wider mb-3 ml-1">{timeGroup}</h3>
          <div className="space-y-2">
            {items.map(s => (
              <div key={s.id}
                className={`bg-gradient-to-r ${TIME_COLORS[s.time_of_day] ?? 'border-white/5'} border rounded-2xl p-4 flex items-center gap-3 animate-fade-in`}>
                <span className="text-2xl shrink-0">{getIcon(s.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{s.name}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {s.dosage && <span className="text-[11px] text-[var(--text-2)]">{s.dosage}</span>}
                    <span className="text-[11px] text-[var(--text-3)]">· {s.frequency}</span>

                  </div>
                </div>
                <button onClick={() => deleteSupplement(s.id)} aria-label={`${s.name} çıkar`}
                  className="text-[var(--text-3)] hover:text-[var(--primary)] text-lg transition-colors px-2">✕</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {supplements.length === 0 && !showForm && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">💊</p>
          <p className="text-[var(--text-2)] text-lg mb-2">Envanter boş</p>
          <p className="text-[var(--text-3)] text-sm">+ ile ekle — isim yazınca katalogdan öneri gelir</p>
        </div>
      )}
    </div>
  )
}
