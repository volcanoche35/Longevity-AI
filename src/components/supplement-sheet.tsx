'use client'

/**
 * Takviye satırı için alt-sheet menüsü: Düzenle · Hatırlatma · Sil.
 * Native <dialog>: showModal() odak tuzağı, Escape ve inert arka planı tarayıcıya bırakır.
 * Her işlem data.ts üzerinden gider (remote Supabase + demo localStorage).
 */
import { useEffect, useRef, useState } from 'react'
import DoseEditor from '@/components/dose-editor'
import { dailyIntakeSummary, normalizeDosePlan, validateDose, type DosePlan } from '@/lib/dosage'
import { removeSupplement, updateSupplement, type ClientSupplement } from '@/lib/data'
import { lockBodyScroll } from '@/lib/modal'
import { isRemoteMode } from '@/lib/supabase'
import { DAY_MARKS_KEY } from '@/lib/daymarks'
import { readRaw, writeRaw } from '@/lib/local-store'
import '@/components/mobile-app.css'

type View = 'menu' | 'edit' | 'remind' | 'delete'
const TIMES = ['Sabah', 'Öğle', 'Akşam', 'Gece'] as const
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Demo modda silinen ürünün bugünkü/eski 'aldım' işaretlerini temizler (remote: işaret kalsa da ürün listede görünmez). */
function dropDemoMarks(id: string) {
  if (isRemoteMode()) return
  try {
    const raw = readRaw(DAY_MARKS_KEY).raw
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, unknown>
    let changed = false
    for (const day of Object.keys(all)) {
      const list = all[day]
      if (Array.isArray(list) && list.includes(id)) { all[day] = list.filter(x => x !== id); changed = true }
    }
    if (changed) writeRaw(DAY_MARKS_KEY, JSON.stringify(all))
  } catch { /* işaret temizliği başarısızsa ürün zaten silindi; sessiz geç */ }
}

export default function SupplementSheet({ row, onClose, onChanged }: {
  row: ClientSupplement
  onClose: () => void
  onChanged: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [view, setView] = useState<View>('menu')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(row.name)
  const [plan, setPlan] = useState<DosePlan>(() => normalizeDosePlan(row.dose_plan))
  const [time, setTime] = useState(row.time_of_day)
  const [notes, setNotes] = useState(row.notes)
  const [schedule, setSchedule] = useState<string[]>(row.schedule)
  const [draft, setDraft] = useState('08:00')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    const release = lockBodyScroll()
    return () => { release(); if (dialog.open) dialog.close() }
  }, [])

  const go = (v: View) => { setError(''); setView(v) }

  const run = async (job: () => Promise<boolean>, failMsg: string) => {
    setBusy(true); setError('')
    try {
      if (!(await job())) { setError(failMsg); return }
      onChanged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : failMsg)
    } finally { setBusy(false) }
  }

  const saveEdit = () => {
    const cleanPlan: DosePlan = { ...plan, parts: plan.parts.filter(p => p.amount.trim() !== '' || p.label.trim() !== '') }
    const invalid = validateDose(cleanPlan)
    if (!name.trim()) { setError('Ürün adını girin.'); return }
    if (invalid) { setError(invalid); return }
    void run(() => updateSupplement(row.id, {
      name: name.trim(), time_of_day: time, notes, dose_plan: cleanPlan,
      dosage: dailyIntakeSummary(cleanPlan), frequency: row.frequency || 'Günlük toplam',
    }), 'Kaydedilemedi. Tekrar dene.')
  }

  const addTime = () => {
    if (!HHMM.test(draft)) { setError('Saat HH:MM biçiminde olmalı.'); return }
    setError('')
    setSchedule(s => [...new Set([...s, draft])].sort())
  }

  const title = view === 'edit' ? 'Düzenle' : view === 'remind' ? 'Hatırlatma' : view === 'delete' ? 'Sil' : row.name

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={`${row.name} işlemleri`}
      onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose() }}
    >
      <div className="sheet-body">
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          {view !== 'menu' && <button type="button" className="sheet-back" onClick={() => go('menu')} aria-label="Geri">‹</button>}
          <h2 className="sheet-title">{title}</h2>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Kapat">×</button>
        </div>

        {view === 'menu' && (
          <div role="menu" aria-label={`${row.name} işlemleri`}>
            <button type="button" role="menuitem" className="sheet-row" onClick={() => go('edit')}><span aria-hidden="true">✏️</span>Düzenle</button>
            <button type="button" role="menuitem" className="sheet-row" onClick={() => go('remind')}>
              <span aria-hidden="true">⏰</span>Hatırlatma
              <small>{row.schedule.length ? row.schedule.join(' · ') : 'saat yok'}</small>
            </button>
            <button type="button" role="menuitem" className="sheet-row sheet-row--danger" onClick={() => go('delete')}><span aria-hidden="true">🗑</span>Sil</button>
          </div>
        )}

        {view === 'edit' && (
          <form onSubmit={e => { e.preventDefault(); saveEdit() }}>
            <label className="field-label" htmlFor="sheet-name">Ürün adı</label>
            <input id="sheet-name" className="dose-input" value={name} onChange={e => setName(e.target.value)} />
            <div className="mt-3"><DoseEditor plan={plan} onChange={setPlan} /></div>
            <span className="field-label mt-3">Zaman dilimi</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Zaman dilimi">
              {TIMES.map(t => (
                <button key={t} type="button" className={`chip-time ${time === t ? 'is-on' : ''}`} aria-pressed={time === t} onClick={() => setTime(t)}>{t}</button>
              ))}
            </div>
            <label className="field-label mt-3" htmlFor="sheet-notes">Not</label>
            <textarea id="sheet-notes" className="dose-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            {error && <p className="dv-alert" role="alert">{error}</p>}
            <button type="submit" className="sheet-primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </form>
        )}

        {view === 'remind' && (
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {schedule.length === 0 && <span className="text-xs text-[var(--text-3)]">Saat eklenmedi — hatırlatma çıkmaz.</span>}
              {schedule.map(t => (
                <button key={t} type="button" className="chip-time is-on" aria-label={`${t} saatini sil`} onClick={() => setSchedule(s => s.filter(x => x !== t))}>{t} ×</button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input type="time" className="dose-input" aria-label="Yeni saat" value={draft} onChange={e => setDraft(e.target.value)} />
              <button type="button" className="dose-add" style={{ width: 'auto', paddingInline: 16 }} onClick={addTime}>+ Saat ekle</button>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-3">Bu saatlerde uygulama açıkken balon gösterilir. Uygulama kapalıyken bildirim garanti edilmez.</p>
            {error && <p className="dv-alert" role="alert">{error}</p>}
            <button type="button" className="sheet-primary" disabled={busy}
              onClick={() => void run(() => updateSupplement(row.id, { schedule }), 'Kaydedilemedi. Tekrar dene.')}>
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        )}

        {view === 'delete' && (
          <div>
            <p className="text-sm text-[var(--text-2)] mb-3">Emin misin? “{row.name}” envanterinden silinecek.</p>
            {error && <p className="dv-alert" role="alert">{error}</p>}
            <button type="button" className="sheet-primary sheet-primary--danger" disabled={busy}
              onClick={() => void run(async () => { const ok = await removeSupplement(row.id); if (ok) dropDemoMarks(row.id); return ok }, 'Silinemedi. Tekrar dene.')}>
              {busy ? 'Siliniyor…' : 'Evet, sil'}
            </button>
            <button type="button" className="sheet-row" onClick={() => go('menu')}>Vazgeç</button>
          </div>
        )}
      </div>
    </dialog>
  )
}
