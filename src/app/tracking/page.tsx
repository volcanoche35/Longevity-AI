import type { Metadata } from 'next'
import WellnessPanel from '@/components/wellness-panel'
import CustomizeButton from '@/components/customize-button'

export const metadata: Metadata = {
  title: 'Etki günlüğü · LongevityAI',
  description: 'Günlük özbildirimler ve takviye kullanım işaretleri — bu cihazda, tıbbi değerlendirme değil.',
}

export default function TrackingPage() {
  return <><div className="px-4 pt-4 flex justify-end"><CustomizeButton section="tracking" /></div><WellnessPanel /></>
}
