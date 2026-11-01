'use client'

/**
 * Ortak ayar içeriği — "Bu ekranı özelleştir" dialogu ve /settings sayfası
 * AYNI bileşeni kullanır, böylece iki yerde farklı değer gösterilmez.
 *
 * Gerçek olmayan anahtar üretilmez: yalnız dashboard ve supplements bölümlerinde
 * kalıcı tercih var. Diğer bölümler gerçek hedeflerine bağlantı + açıklama verir
 * (ölü buton / boş modal yok). Hatırlatıcı programı, push/cron ve klinik profil
 * bu modülden YAZILMAZ.
 */
import Link from 'next/link'
import ThemeSelect from './theme-select'
import {
  SUPPLEMENT_FORMS,
  SUPPLEMENT_TIMES,
  type Preferences,
} from '@/lib/preferences'

export type SettingsSection =
  | 'dashboard'
  | 'supplements'
  | 'tracking'
  | 'reminders'
  | 'assistant'
  | 'profile'

export const SECTION_TITLES: Record<SettingsSection, string> = {
  dashboard: 'Bugün ekranı',
  supplements: 'Takviyeler',
  tracking: 'Günlüğüm',
  reminders: 'Hatırlatıcılar',
  assistant: 'Asistan',
  profile: 'Profil',
}

export const SECTION_SUBTITLES: Record<SettingsSection, string> = {
  dashboard: 'Anatomi görseli ve bilgi kartlarının görünürlüğü.',
  supplements: 'Yeni takviye eklerken ön seçili form ve saat.',
  tracking: 'Günlük kayıtlar ve ölçümler.',
  reminders: 'Hatırlatıcı saatleri ve bildirimler.',
  assistant: 'AI yanıtlarının kişiselleştirilmesi.',
  profile: 'Sağlık bilgileri ve paylaşım izni.',
}

export const SECTION_HREFS: Record<SettingsSection, string> = {
  dashboard: '/dashboard',
  supplements: '/supplements',
  tracking: '/tracking',
  reminders: '/reminders',
  assistant: '/chat',
  profile: '/profile',
}

/** Dialog ve /settings sayfasında gösterilen bölüm sırası. */
export const SETTINGS_ORDER: SettingsSection[] = [
  'dashboard',
  'supplements',
  'tracking',
  'reminders',
  'assistant',
  'profile',
]

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-text">
        <span className="settings-row-label" id={`${id}-label`}>
          {label}
        </span>
        <span className="settings-row-hint">{hint}</span>
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        className="settings-switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-knob" aria-hidden="true" />
      </button>
    </div>
  )
}

function InfoLink({
  href,
  title,
  detail,
}: {
  href: string
  title: string
  detail: string
}) {
  return (
    <Link className="settings-link" href={href}>
      <span className="settings-link-text">
        <span className="settings-link-title">{title}</span>
        <span className="settings-link-detail">{detail}</span>
      </span>
      <span className="settings-link-arrow" aria-hidden="true">
        →
      </span>
    </Link>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="settings-note">{children}</p>
}

export default function SettingsPanel({
  section,
  value,
  onChange,
  idPrefix = 'settings',
  showHeading = true,
}: {
  section: SettingsSection
  value: Preferences
  onChange: (next: Preferences) => void
  idPrefix?: string
  showHeading?: boolean
}) {
  const titleId = `${idPrefix}-${section}-title`

  if (section === 'dashboard') {
    return (
      <section className="settings-block" aria-labelledby={titleId}>
        {showHeading && (
          <>
            <h3 className="settings-block-title" id={titleId}>
              {SECTION_TITLES.dashboard}
            </h3>
            <p className="settings-block-sub">{SECTION_SUBTITLES.dashboard}</p>
          </>
        )}
        <Toggle
          id={`${idPrefix}-performance`}
          label="Performans grafiğini göster"
          hint="Ana sayfadaki performans grafiğini açar veya gizler."
          checked={value.dashboard.showPerformance}
          onChange={next => onChange({ ...value, dashboard: { ...value.dashboard, showPerformance: next } })}
        />
      </section>
    )
  }

  if (section === 'supplements') {
    return (
      <section className="settings-block" aria-labelledby={titleId}>
        {showHeading && (
          <>
            <h3 className="settings-block-title" id={titleId}>
              {SECTION_TITLES.supplements}
            </h3>
            <p className="settings-block-sub">{SECTION_SUBTITLES.supplements}</p>
          </>
        )}
        <div className="settings-fields">
          <div className="settings-field">
            <ThemeSelect
              label="Varsayılan form"
              value={value.supplements.defaultForm}
              options={SUPPLEMENT_FORMS}
              onChange={next =>
                onChange({
                  ...value,
                  supplements: { ...value.supplements, defaultForm: next as Preferences['supplements']['defaultForm'] },
                })
              }
            />
            <p className="settings-row-hint">Yeni takviye formu bu seçimle açılır. Doz alanı otomatik dolmaz.</p>
          </div>
          <div className="settings-field">
            <ThemeSelect
              label="Varsayılan saat"
              value={value.supplements.defaultTime}
              options={SUPPLEMENT_TIMES}
              onChange={next =>
                onChange({
                  ...value,
                  supplements: { ...value.supplements, defaultTime: next as Preferences['supplements']['defaultTime'] },
                })
              }
            />
            <p className="settings-row-hint">Yeni kayıtların günün hangi saati için önerileceğini belirler.</p>
          </div>
        </div>
      </section>
    )
  }

  if (section === 'reminders') {
    return (
      <section className="settings-block" aria-labelledby={titleId}>
        {showHeading && (
          <>
            <h3 className="settings-block-title" id={titleId}>
              {SECTION_TITLES.reminders}
            </h3>
            <p className="settings-block-sub">{SECTION_SUBTITLES.reminders}</p>
          </>
        )}
        <Note>
          Hatırlatıcı saatleri ayrı ekranda yönetilir. Bu bölümden bildirim izni istemez, zamanlanmış
          görev veya arka plan bildirimi oluşturmaz.
        </Note>
        <InfoLink
          href="/reminders"
          title="Hatırlatıcıları aç"
          detail="Saat ekle, düzenle veya ertele."
        />
      </section>
    )
  }

  if (section === 'assistant') {
    return (
      <section className="settings-block" aria-labelledby={titleId}>
        {showHeading && (
          <>
            <h3 className="settings-block-title" id={titleId}>
              {SECTION_TITLES.assistant}
            </h3>
            <p className="settings-block-sub">{SECTION_SUBTITLES.assistant}</p>
          </>
        )}
        <Note>
          Asistanın hangi bilgileri göreceği profildeki paylaşım iznine bağlıdır. Burada ikinci bir izin
          veya ayrı profil kopyası tutulmaz.
        </Note>
        <InfoLink
          href="/profile"
          title="AI paylaşım iznini yönet"
          detail="Profil ve paylaşım ayarları."
        />
      </section>
    )
  }

  if (section === 'profile') {
    return (
      <section className="settings-block" aria-labelledby={titleId}>
        {showHeading && (
          <>
            <h3 className="settings-block-title" id={titleId}>
              {SECTION_TITLES.profile}
            </h3>
            <p className="settings-block-sub">{SECTION_SUBTITLES.profile}</p>
          </>
        )}
        <Note>
          Yaş, cinsiyet, boy, kilo, ilaç ve alerji bilgileri ile AI paylaşım izni profil ekranında
          yönetilir; bu sayfa kişisel sağlık verisi saklamaz.
        </Note>
        <InfoLink
          href="/profile"
          title="Profil ve AI paylaşımı"
          detail="Sağlık bilgilerini görüntüle ve güncelle."
        />
      </section>
    )
  }

  return (
    <section className="settings-block" aria-labelledby={titleId}>
      {showHeading && (
        <>
          <h3 className="settings-block-title" id={titleId}>
            {SECTION_TITLES.tracking}
          </h3>
          <p className="settings-block-sub">{SECTION_SUBTITLES.tracking}</p>
        </>
      )}
      <Note>
        Günlük işaretler ve ölçümler kendi ekranında tutulur. Görünürlük ve hatırlatma tercihleri için
        ilgili ekranları kullan.
      </Note>
      <InfoLink href="/tracking" title="Günlüğüm ekranı" detail="Kayıtları görüntüle ve sürdür." />
      <InfoLink href="/reminders" title="Hatırlatıcılar" detail="Kayıt saatlerini planla." />
    </section>
  )
}
