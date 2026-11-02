'use client'

/**
 * /settings — tek merkezli ayarlar sayfası.
 *
 * Aynı SettingsPanel bileşeni dialog ile paylaşılır; burada da yalnız gerçek
 * tercihler (dashboard, supplements) düzenlenebilir. Diğer bölümler gerçek
 * hedeflerine bağlantı verir. Klinik profil / AI izni için ikinci depo yoktur.
 *
 * Taslak kuralı: `draft === null` iken canlı (depodaki) değer gösterilir, yani
 * ilk render sunucuyla aynıdır; kullanıcı dokununca taslak başlar ve yalnız
 * "Kaydet" ile kalıcı olur.
 */
import { useState } from 'react'
import Link from 'next/link'
import SettingsPanel, {
  SECTION_TITLES,
  SECTION_HREFS,
  SETTINGS_ORDER,
} from '@/components/settings-panel'
import ThemeSelector from '@/components/theme-selector'
import { exportUserData } from '@/lib/export-data'
import {
  resetPreferences,
  savePreferences,
  usePreferences,
  type Preferences,
} from '@/lib/preferences'
import '@/components/settings.css'

export default function SettingsPage() {
  const stored = usePreferences()
  const [draft, setDraft] = useState<Preferences | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const value = draft ?? stored

  const save = () => {
    if (!draft) return
    const result = savePreferences({
      dashboard: { ...draft.dashboard },
      supplements: { ...draft.supplements },
    })
    if (result.ok) {
      setDraft(null)
      setStatus('Ayarlar kaydedildi. Ekranlar yeni tercihlerle açılır.')
      setError('')
    } else {
      setError(result.error)
      setStatus('')
    }
  }

  const reset = () => {
    const result = resetPreferences()
    if (result.ok) {
      setDraft(null)
      setStatus('Ayarlar varsayılana döndü.')
      setError('')
    } else {
      setError(result.error)
      setStatus('')
    }
  }

  const handleExport = async () => {
    setExporting(true); setExportError('')
    try {
      await exportUserData()
      setStatus('Verilerin JSON olarak indirildi.')
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Veri dışa aktarılamadı.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-page-head">
        <p className="settings-page-eyebrow">LongevityAI · AYARLAR</p>
        <h1 className="settings-page-title">Ayarlar</h1>
        <p className="settings-page-sub">
          Kişiselleştirme tek yerde toplanır. Her ekranın kendi “Özelleştir” menüsü de buradaki aynı
          değerleri kullanır.
        </p>
      </header>

      <p className="settings-note">
        Kişisel bilgiler ve AI paylaşımı <Link href="/profile">Profil</Link>&rsquo;de yönetilir. Sağlık
        verisi bu sayfada tutulmaz.
      </p>

      <div className="settings-page-card">
        <section className="settings-block" aria-label="Görünüm">
          <h3 className="settings-block-title">Tema</h3>
          <p className="settings-block-sub">Uygulamanın renk paletini seç. Tercihin bu cihazda saklanır.</p>
          <ThemeSelector />
        </section>
      </div>

      <div className="settings-page-card">
        <section className="settings-block" aria-label="Gizlilik ve veri">
          <h3 className="settings-block-title">Gizlilik & Veri</h3>
          <p className="settings-block-sub">Tüm verilerini tek dosya olarak indir.</p>
          <button type="button" className="cz-btn cz-btn-ghost" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Hazırlanıyor…' : 'Verileri dışa aktar (JSON)'}
          </button>
          {exportError && <p className="cz-error" role="alert">{exportError}</p>}
        </section>
      </div>

      {SETTINGS_ORDER.map(section => (
        <div className="settings-page-card" key={section}>
          <SettingsPanel
            section={section}
            value={value}
            idPrefix="settings-page"
            onChange={next => {
              setDraft(next)
              setStatus('')
              setError('')
            }}
          />
          <Link className="settings-page-link" href={SECTION_HREFS[section]}>
            {SECTION_TITLES[section]} ekranına git →
          </Link>
        </div>
      ))}

      <div className="settings-page-card">
        <section className="settings-block" aria-label="Hakkında">
          <h3 className="settings-block-title">Hakkında</h3>
          <p className="settings-block-sub">LongevityAI — uzun ömür takip asistanı. Sürüm 0.1.0</p>
          <Link className="settings-link" href="/information">
            <span className="settings-link-text">
              <span className="settings-link-title">Kullanım bilgisi ve sınırlar</span>
              <span className="settings-link-detail">Verilerin nasıl kullanıldığı ve KVKK.</span>
            </span>
            <span className="settings-link-arrow" aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      {status && (
        <p className="cz-status" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="cz-error" role="alert">
          {error}
        </p>
      )}

      <div className="settings-page-actions">
        <button type="button" className="cz-btn cz-btn-ghost" onClick={reset}>
          Varsayılana dön
        </button>
        <button
          type="button"
          className="cz-btn cz-btn-primary"
          onClick={save}
          disabled={draft === null}
          aria-label="Ayarları kaydet"
        >
          Kaydet
        </button>
      </div>

      <p className="settings-theme-note">
        Hatırlatıcı saatleri ayrı <Link href="/reminders">hatırlatıcılar</Link> ekranında yönetilir; bu
        sayfadan bildirim veya zamanlanmış görev oluşturulmaz.
      </p>
    </div>
  )
}
