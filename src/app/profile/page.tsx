'use client'
import { useSyncExternalStore } from 'react'
import ProfileEditor from '@/components/profile-editor'
import CustomizeButton from '@/components/customize-button'
const noopSubscribe = () => () => {}
export default function ProfilePage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  return mounted ? <><div className="px-4 pt-4 flex justify-end"><CustomizeButton section="profile" /></div><ProfileEditor /></> : <div className="p-4" aria-busy="true">Profil yükleniyor…</div>
}
