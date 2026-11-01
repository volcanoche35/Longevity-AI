'use client'

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react'
import { listSupplements, addSupplement as createSupplement, removeSupplement as deleteRow } from '@/lib/data'
import { suggest, findEntry, catalogSize, type CatalogEntry } from '@/lib/catalog'
import ThemeSelect from '@/components/theme-select'
import DoseEditor, { ScheduleEditor } from '@/components/dose-editor'
import CustomizeButton from '@/components/customize-button'
import InteractionPanel from '@/components/interaction-panel'
import UsageDisclosure from '@/components/usage-disclosure'
import { usePreferences, type Preferences } from '@/lib/preferences'
import { interactionsFor, type InteractionKind } from '@/lib/supplement-interactions'
import { unitsForForm, validateDose, dailyIntakeSummary, emptyPart, type DosePlan } from '@/lib/dosage'
import { loadProfile, onProfileChange } from '@/lib/profile'

interface Supplement { id: string; name: string; dosage: string; frequency: string; time_of_day: string; notes: string; schedule: string[] }

const CATEGORY_ICON: Record<string, string> = {
  vitamin: '🍊', mineral: '⚡', 'yağ asidi': '🐟', yağ: '🫒', aminoasit: '🧬', protein: '🥩',
  bitkisel: '🌿', adaptogen: '🌱', mantar: '🍄', nootropik: '🧠', performans: '💪', eklem: '🦴',
  mikrobiyota: '🦠', lif: '🌾', prebiyotik: '🌾', uyku: '🌙', hormon: '🧪', kombinasyon: '🧩',
  'vitamin-benzeri': '🍊', etiket: '💊',
}
const GRADE_CLASS = { A: 'chip-a', B: 'chip-b', C: 'chip-c' } as const
const TIMES = ['Sabah', 'Öğle', 'Akşam', 'Gece']
const FORMS = ['Hap', 'Kapsül', 'Damla', 'Toz', 'Sıvı', 'Diğer']

const KIND_ICON: Record<InteractionKind, string> = { conflict: '⚠️', timing: '⏰', food: '🍽️', avoid: '🚫' }
const KIND_COLOR: Record<InteractionKind, string> = { conflict: '#eb7a54', timing: '#8fb0d0', food: '#ebd3a2', avoid: '#eb5324' }
const NOTE_DISCLAIMER = 'Bilgi amaçlı, tıbbi tavsiye değil.'

function InteractionNotes({ name }: { name: string }) {
  const notes = interactionsFor(name)
  if (notes.length === 0) return null
  return (
    <div className="mt-2 space-y-1" aria-label={`${name} etkileşim notları`}>
      {notes.map((n, i) => (
        <p key={i} className="text-[11px] leading-snug flex gap-1.5" style={{ color: KIND_COLOR[n.kind] }}>
          <span aria-hidden="true">{KIND_ICON[n.kind]}</span><span className="text-[var(--text-2)]">{n.text} <span className="text-[var(--text-3)]">· {n.source}</span></span>
        </p>
      ))}
      <p className="text-[10px] text-[var(--text-3)]">{NOTE_DISCLAIMER}</p>
    </div>
  )
}

const emptyPlan = (form = 'Hap'): DosePlan => ({ parts: [], form, dailyCount: '', dailyAmount: '', dailyUnit: unitsForForm(form)[0] })

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const medications = useSyncExternalStore(onProfileChange, () => loadProfile().medications, () => '')
  const [name, setName] = useState('')
  const [plan, setPlan] = useState<DosePlan>(emptyPlan())
  const [error, setError] = useState('')
  const [time, setTime] = useState('Sabah')
  const [notes, setNotes] = useState('')
  const [schedule, setSchedule] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false); const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Yeni form açılırken ayarlardaki güncel varsayılanlar; açık formdaki değişiklikleri ezmez.
  const prefs: Preferences = usePreferences()
  const suppPrefs = prefs?.supplements
  const toggleForm = () => {
    const next = !showForm
    setShowForm(next)
    if (!next) return
    const form: string = FORMS.includes(suppPrefs?.defaultForm ?? '') ? suppPrefs.defaultForm : 'Hap'
    setPlan(emptyPlan(form)); setSchedule([])
    if (suppPrefs?.defaultTime && TIMES.includes(suppPrefs.defaultTime)) setTime(suppPrefs.defaultTime)
    setError('')
  }

  const suggestions = useMemo(() => suggest(name, 7), [name])
  const picked = useMemo(() => findEntry(name), [name])

  const fetchSupplements = () =>
    listSupplements().then(setSupplements).catch(() => setSupplements([]))

  useEffect(() => { fetchSupplements() }, [])

  const applySuggestion = (s: CatalogEntry) => {
    setName(s.name)
    setOpen(false)
    // Etken maddeyi otomatik doldur — katalog seçimi zaten etken madde bazlı,
    // kullanıcı aynı ismi "Ürün içeriği"nde bir daha yazmasın. Sadece miktarı girer.
    setPlan(p => {
      const hasContent = p.parts.some(part => part.label.trim() !== '' || part.amount.trim() !== '')
      if (hasContent) return p
      return { ...p, parts: [{ ...emptyPart(), label: s.name }] }
    })
  }

  const addSupplement = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPlan: DosePlan = { ...plan, parts: plan.parts.filter(p => p.amount.trim() !== '' || p.label.trim() !== '') }
    const validation = validateDose(cleanPlan)
    if (!name.trim() || validation) { setError(validation || 'Ürün adını girin.'); return }
    setError(''); setLoading(true)
    try {
      const ok = await createSupplement({ name, dosage: dailyIntakeSummary(cleanPlan), frequency: 'Günlük toplam', time_of_day: time, notes, schedule, dose_plan: cleanPlan })
      if (!ok) throw new Error('Ürün kaydedilemedi. Tekrar deneyin.')
      setName(''); setPlan(emptyPlan()); setNotes(''); setSchedule([]); setShowForm(false)
      await fetchSupplements()
    } catch (e) { setError(e instanceof Error ? e.message : 'Kayıt başarısız.') }
    finally { setLoading(false) }
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

  const inputCls = 'dose-input'

  return (
    <div className="p-4 pb-28 min-h-screen">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Takviyelerim</h2>
            <CustomizeButton section="supplements" />
          </div>
          <p className="text-[var(--text-3)] text-xs mt-0.5">
            {supplements.length} envanter · {catalogSize()} katalog kaydı
          </p>
        </div>
        <button onClick={toggleForm}
          className="w-11 h-11 rounded-full grid place-items-center text-xl transition-colors"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--primary)' }}>
          {showForm ? '×' : '+'}
        </button>
      </div>

      {/* ── Ekleme formu ── */}
      {showForm && (
        <form onSubmit={addSupplement} className="supplement-form p-4 space-y-4 mb-6 animate-fade-in">
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
              <ul id="catalog-suggest" className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}>
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
                          {s.category}{s.dailyRef ? ` · DSÖ ${s.dailyRef}` : ''}
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
          {picked && (
            <p className="text-xs text-[var(--text-2)]">
              Katalogdan seçildi.{picked.dailyRef ? <span> DSÖ günlük referans: <span className="text-[var(--amber)]">{picked.dailyRef}</span>.</span> : null} Dozu kendi ürün etiketinizden girin.
            </p>
          )}
          {name.trim() && <InteractionNotes name={name} />}

          <DoseEditor plan={plan} onChange={setPlan} />
          <div className="dose-section">
            <ThemeSelect label="Kullanım zamanı" value={time} options={TIMES} onChange={setTime} />
            <ScheduleEditor value={schedule} onChange={setSchedule} />
            <label className="block mt-3"><span className="field-label">Not (isteğe bağlı)</span>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Kendi notun" className="dose-input" />
            </label>
          </div>
          {error && <p role="alert" className="text-sm text-[var(--primary)]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-3 text-sm text-[var(--text-3)] hover:text-white transition-colors">İptal</button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
              style={{ background: 'var(--primary)', color: 'var(--surface)' }}>
              {loading ? '…' : 'Envantere ekle'}
            </button>
          </div>
        </form>
      )}
      {showForm && <UsageDisclosure />}

      {/* ── Zaman grupları ── */}
      {supplements.length > 0 && <InteractionPanel supplements={supplements.map(s => ({ name: s.name, dosage: s.dosage }))} medications={medications} />}
      {Object.entries(groupedByTime).map(([timeGroup, items]) => (
        <div key={timeGroup} className="mb-6">
          <h3 className="text-[var(--text-2)] text-xs font-semibold uppercase tracking-wider mb-3 ml-1">{timeGroup}</h3>
          <div className="space-y-2">
            {items.map(s => (
              <div key={s.id}
                className="border rounded-2xl p-4 flex items-center gap-3 animate-fade-in"
                style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
                <span className="text-2xl shrink-0">{getIcon(s.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{s.name}</p>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    {s.dosage && <span className="text-[11px] text-[var(--text-2)]">{s.dosage}</span>}
                    <span className="text-[11px] text-[var(--text-3)]">· {s.frequency}</span>
                    {s.schedule.length > 0 && <span className="text-[11px] text-[var(--text-2)]">· 🕒 {s.schedule.join(', ')}</span>}

                  </div>
                  <InteractionNotes name={s.name} />
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
