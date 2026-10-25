import type { Metadata } from 'next'
import WellnessPanel from '@/components/wellness-panel'

export const metadata: Metadata = {
  title: 'Etki günlüğü · BioTrack',
  description: 'Günlük özbildirimler ve takviye kullanım işaretleri — bu cihazda, tıbbi değerlendirme değil.',
}

export default function TrackingPage() {
  return <WellnessPanel />
}
