'use client'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { dueReminders, REMINDERS_KEY } from '@/lib/reminders'
import { onStorageKey, readRaw } from '@/lib/local-store'
const subscribe = (callback: () => void) => onStorageKey(REMINDERS_KEY, callback)
const noopSubscribe = () => () => {}
export default function ReminderBanner() {
  const pathname = usePathname()
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  useSyncExternalStore(subscribe, () => readRaw(REMINDERS_KEY).raw, () => null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    const timer = window.setInterval(update, 30_000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  if (!mounted || pathname === '/reminders') return null
  const due = dueReminders(now)
  if (!due.length) return null
  return <aside className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm" style={{background:'#263129',borderColor:'#657B64'}} aria-label="Zamanı gelen hatırlatmalar">
    <Link href="/reminders" className="flex items-center justify-between gap-3"><span><strong>{due[0].title}</strong><span className="block text-xs text-[var(--text-2)] mt-1">{due.length} hatırlatmanın zamanı geldi · senin planın</span></span><span aria-hidden="true">→</span></Link>
  </aside>
}
