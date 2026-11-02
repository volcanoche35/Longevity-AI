import { loadProfileAsync } from './profile'
import { listSupplements } from './data'
import { loadWellnessAsync } from './wellness'
import { readMarksAsync } from './daymarks'
import { getPreferences } from './preferences'

export interface ExportBundle {
  exportedAt: string
  app: string
  version: number
  profile: unknown
  supplements: unknown
  wellness: unknown
  dayMarks: unknown
  preferences: unknown
  theme: string
}

/** Kullanıcının tüm verisini toplar (profil + takviye + günlük + tercih). */
export async function collectUserData(): Promise<ExportBundle> {
  const [profile, supplements, wellness, dayMarks] = await Promise.all([
    loadProfileAsync(),
    listSupplements(),
    loadWellnessAsync(),
    readMarksAsync(),
  ])
  let theme = 'indigo'
  try { theme = localStorage.getItem('biotrack.theme.v1') || 'indigo' } catch { /* yok */ }
  return {
    exportedAt: new Date().toISOString(),
    app: 'LongevityAI',
    version: 1,
    profile,
    supplements,
    wellness,
    dayMarks,
    preferences: getPreferences(),
    theme,
  }
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Verileri JSON olarak indirir. */
export async function exportUserData(): Promise<void> {
  const data = await collectUserData()
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(data, `longevityai-verileri-${date}.json`)
}
