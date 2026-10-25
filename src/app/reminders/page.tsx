'use client'

import { useSyncExternalStore } from 'react'
import RemindersPanel from '@/components/reminders-panel'
import '@/components/reminders.css'

const noopSubscribe = () => () => {}

export default function RemindersPage() {
  // localStorage yalnızca istemcide okunur; ilk render sunucuyla eşleşsin.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return mounted
    ? <RemindersPanel />
    : <div className="rem-page" aria-busy="true"><p className="rem-empty-line">Hatırlatmalar yükleniyor…</p></div>
}
