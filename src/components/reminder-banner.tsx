'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { dueReminders, dueRemindersAsync, REMINDERS_KEY, type Reminder } from '@/lib/reminders'
import { isRemoteMode } from '@/lib/supabase'
import { onStorageKey, readRaw } from '@/lib/local-store'
import { listSupplements } from '@/lib/data'
import { readMarksAsync, toggleDayMarkAsync, localDayKey } from '@/lib/daymarks'
import { dueSlot } from '@/lib/schedule'

const subscribe = (callback: () => void) => onStorageKey(REMINDERS_KEY, callback)
const noopSubscribe = () => () => {}
const CHECK_MS = 45_000

interface DueSupplement { id: string; name: string; slot: string }

export default function ReminderBanner() {
  const pathname = usePathname()
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  useSyncExternalStore(subscribe, () => readRaw(REMINDERS_KEY).raw, () => null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => { if (document.visibilityState !== 'hidden') setNow(new Date()) }
    const timer = window.setInterval(update, CHECK_MS)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])

  const remote = isRemoteMode()
  const [remoteDue, setRemoteDue] = useState<Reminder[]>([])
  useEffect(() => {
    if (!remote) return
    let alive = true
    dueRemindersAsync(now).then(list => { if (alive) setRemoteDue(list) }).catch(() => { if (alive) setRemoteDue([]) })
    return () => { alive = false }
  }, [remote, now, pathname])

  // Takviye saatleri: due = şu an >= planlı saat (2 sa pencere içinde) VE bugün alınmadı.
  const [dueSupps, setDueSupps] = useState<DueSupplement[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!mounted) return
    let alive = true
    ;(async () => {
      const [supps, marks] = await Promise.all([listSupplements(), readMarksAsync()])
      const taken = new Set(marks[localDayKey(now)] ?? [])
      const list: DueSupplement[] = []
      for (const s of supps) {
        const slot = dueSlot(s.schedule, now)
        if (slot && !taken.has(s.id)) list.push({ id: s.id, name: s.name, slot })
      }
      if (alive) setDueSupps(list)
    })().catch(() => { if (alive) setDueSupps([]) })
    return () => { alive = false }
  }, [mounted, now, pathname, tick])

  const markTaken = useCallback(async (id: string) => {
    setBusy(id); setFailed(false)
    try {
      const ok = await toggleDayMarkAsync(id)
      if (!ok) setFailed(true)
      else setDueSupps(list => list.filter(s => s.id !== id))
    } catch { setFailed(true) }
    finally { setBusy(null); setTick(t => t + 1) }
  }, [])

  if (!mounted) return null
  const due = pathname === '/reminders' ? [] : remote ? remoteDue : dueReminders(now)
  if (!due.length && !dueSupps.length) return null
  return <div>
    {dueSupps.length > 0 && <aside className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm space-y-2" style={{background:'#0d1f45',borderColor:'#4a6b5a'}} aria-label="Takviye hatırlatması" role="status">
      {dueSupps.map(s => <div key={s.id} className="flex items-center justify-between gap-3">
        <span><strong>Şimdi {s.name} alma vakti</strong><span className="block text-xs text-[var(--text-2)] mt-0.5">Planlanan saat {s.slot}</span></span>
        <button type="button" disabled={busy === s.id} onClick={() => markTaken(s.id)}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ background: 'var(--primary)', color: 'var(--surface)' }}>{busy === s.id ? '…' : 'Aldım'}</button>
      </div>)}
      {failed && <p role="alert" className="text-xs text-[var(--primary)]">İşaret kaydedilemedi, tekrar dene.</p>}
    </aside>}
    {due.length > 0 && <aside className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm" style={{background:'#0d1f45',borderColor:'#4a6b5a'}} aria-label="Zamanı gelen hatırlatmalar">
      <Link href="/reminders" className="flex items-center justify-between gap-3"><span><strong>{due[0].title}</strong><span className="block text-xs text-[var(--text-2)] mt-1">{due.length} hatırlatmanın zamanı geldi · senin planın</span></span><span aria-hidden="true">→</span></Link>
    </aside>}
  </div>
}
