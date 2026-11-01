'use client'

/**
 * "Bu ekranı özelleştir" — aynı sayfada, native <dialog> ile açılan menü.
 *
 * Neden native <dialog>: showModal() öğeyi top-layer'a taşır, arka planı inert
 * yapar, Escape/focus trap ve kapanışta focus iadesi tarayıcıdan gelir. Portal
 * veya elle yazılmış focus tuzağı yok.
 *
 * Davranış:
 *  - Açılışta gerçek (depodaki) değerler taslağa alınır; kapatınca kaydedilmemiş
 *    taslak sessizce UYGULANMAZ, bir sonraki açılış yine gerçek değeri gösterir.
 *  - Kaydet: savePreferences açık sonuç döner; başarı/hata metni gösterilir.
 *  - Kaydedilmemiş değişiklik varken kapatma (X, arka plan, Escape) önce sade
 *    bir uyarı gösterir; "Yine de kapat" ancak ondan sonra kapatır.
 */
import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import SettingsPanel, {
  SECTION_TITLES,
  SECTION_HREFS,
  type SettingsSection,
} from './settings-panel'
import { getPreferences, savePreferences, usePreferences, type Preferences } from '@/lib/preferences'
import { lockBodyScroll } from '@/lib/modal'
import './settings.css'

export type { SettingsSection }

export default function CustomizeButton({
  section = 'dashboard',
  label = 'Özelleştir',
}: {
  section?: SettingsSection
  label?: string
}) {
  const stored = usePreferences()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const releaseScroll = useRef<(() => void) | null>(null)
  const baseId = useId()
  const [draft, setDraft] = useState<Preferences | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  useEffect(() => () => { releaseScroll.current?.(); releaseScroll.current = null }, [])

  const editable = section === 'dashboard' || section === 'supplements'
  /** Taslak yoksa gerçek değerler gösterilir (SSR ile aynı ilk render). */
  const value = draft ?? stored
  const dirty =
    draft !== null &&
    (draft.dashboard.showPerformance !== stored.dashboard.showPerformance ||
      draft.supplements.defaultForm !== stored.supplements.defaultForm ||
      draft.supplements.defaultTime !== stored.supplements.defaultTime)

  const open = () => {
    const dialog = dialogRef.current
    if (!dialog) return
    setDraft(getPreferences())
    setStatus('')
    setError('')
    setConfirmClose(false)
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
      releaseScroll.current = lockBodyScroll()
    }
  }

  const close = () => {
    const dialog = dialogRef.current
    if (dialog?.open) dialog.close()
    else onClosed()
  }

  /** Kaydedilmemiş taslak varsa önce uyarır; veri sessizce yazılmaz. */
  const requestClose = () => {
    if (dirty) {
      setConfirmClose(true)
      setStatus('')
      setError('')
      return
    }
    close()
  }

  const onClosed = () => {
    releaseScroll.current?.()
    releaseScroll.current = null
    setDraft(null)
    setConfirmClose(false)
    setStatus('')
    setError('')
  }

  const save = () => {
    if (!draft) return
    const result = savePreferences({
      dashboard: { ...draft.dashboard },
      supplements: { ...draft.supplements },
    })
    if (result.ok) {
      setDraft(result.preferences)
      setStatus('Ayarlar kaydedildi. Bu ekran yeni tercihlerle çalışır.')
      setError('')
    } else {
      setError(result.error)
      setStatus('')
    }
  }

  const titleId = `${baseId}-title`

  return (
    <>
      <button type="button" className="cz-trigger" onClick={open} aria-haspopup="dialog">
        <span className="cz-trigger-icon" aria-hidden="true">
          ⚙
        </span>
        {label}
      </button>

      <dialog
        ref={dialogRef}
        className="cz-dialog"
        aria-labelledby={titleId}
        onClose={onClosed}
        onCancel={event => {
          if (dirty) {
            event.preventDefault()
            setConfirmClose(true)
          }
        }}
        onClick={event => {
          if (event.target === dialogRef.current) requestClose()
        }}
      >
        <div className="cz-head">
          <div className="cz-head-text">
            <p className="cz-eyebrow">{SECTION_TITLES[section]} · kişiselleştirme</p>
            <h2 className="cz-title" id={titleId}>
              Bu ekranı özelleştir
            </h2>
          </div>
          <button
            type="button"
            className="cz-close"
            onClick={requestClose}
            aria-label="Özelleştirme penceresini kapat"
          >
            ✕
          </button>
        </div>

        <div className="cz-body">
          <SettingsPanel
            section={section}
            value={value}
            idPrefix={`cz-${section}`}
            onChange={next => {
              setDraft(next)
              setStatus('')
              setError('')
              setConfirmClose(false)
            }}
          />

          {!editable && (
            <p className="settings-note">
              Kişisel bilgilerini ve kullanım planını aşağıdaki bağlantılardan yönetebilirsin.
            </p>
          )}

          {confirmClose && (
            <div className="cz-guard" role="status">
              <p>Kaydedilmemiş değişiklikler var. Kapatırsan bu taslak uygulanmaz.</p>
              <div className="cz-guard-actions">
                <button type="button" className="cz-btn cz-btn-ghost" onClick={() => setConfirmClose(false)}>
                  Düzenlemeye dön
                </button>
                <button type="button" className="cz-btn cz-btn-ghost" onClick={close}>
                  Yine de kapat
                </button>
              </div>
            </div>
          )}

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
        </div>

        <div className="cz-foot">
          <p className="cz-foot-note">
            Kişisel bilgiler ve AI paylaşımı <Link href="/profile">Profil</Link>&rsquo;de yönetilir.
            <span className="cz-foot-sep" aria-hidden="true">
              ·
            </span>
            <Link href="/settings">Tüm ayarlar</Link>
            <span className="cz-foot-sep" aria-hidden="true">
              ·
            </span>
            <Link href={SECTION_HREFS[section]}>Ekrana dön</Link>
          </p>
          <div className="cz-foot-actions">
            <button type="button" className="cz-btn cz-btn-ghost" onClick={requestClose}>
              Kapat
            </button>
            {editable && (
              <button type="button" className="cz-btn cz-btn-primary" onClick={save} disabled={!dirty}>
                Kaydet
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
