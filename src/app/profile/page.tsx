'use client'
import { useSyncExternalStore } from 'react'
import ProfileEditor from '@/components/profile-editor'
const noopSubscribe = () => () => {}
export default function ProfilePage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return mounted ? <ProfileEditor /> : <div className="p-4" aria-busy="true">Profil yükleniyor…</div>
}
