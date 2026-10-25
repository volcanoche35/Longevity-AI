'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import ThemeSelect from './theme-select'
import { listSupplements } from '@/lib/data'
import { onStorageKey, storageState } from '@/lib/local-store'
import {
  KIND_LABELS,
  REMINDER_KINDS,
  REMINDER_NOTE_MAX,
  REMINDER_TITLE_MAX,
  REMINDERS_KEY,
  SNOOZE_MINUTES,
  acknowledgeReminder,
  addReminder,
  deleteReminder,
  getAcknowledgedIds,
  listReminders,
  reminderDayKey,
  reminderStatus,
  snoozeReminder,
  updateReminder,
  type Reminder,
  type ReminderKind,
  type ReminderStatus,
} from '@/lib/reminders'

const KIND_OPTIONS = REMINDER_KINDS.map(kind => KIND_LABELS[kind])
const VITAMIN_D_SOURCE = 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/'

const STATUS_LABEL: Record<ReminderStatus, string> = {
  due: 'Zamanı geldi',
  snoozed: 'Ertelendi',
  done: 'Bugün tamamlandı',
  upcoming: 'Planlandı',
}

function clock(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return iso
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function snoozeLabel(reminder: Reminder, now: Date): string {
  if (!reminder.snoozeUntil) return ''
  const until = new Date(reminder.snoozeUntil)
  if (!Number.isFinite(until.getTime())) return ''
  const sameDay = reminderDayKey(until) === reminderDayKey(now)
  return `${sameDay ? '' : 'Yarın '}${clock(reminder.snoozeUntil)}`
}

export default function RemindersPanel() {
  // Panel yalnızca istemciye bağlandıktan sonra render edildiği için ilk okuma
  // güvenli; SSR'de listReminders boş döner.
  const [items, setItems] = useState<Reminder[]>(() => listReminders())
  const [acked, setAcked] = useState<string[]>(() => getAcknowledgedIds())
  const [now, setNow] = useState(() => new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<ReminderKind>('general')
  const [note, setNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', time: '', note: '' })
  const [error, setError] = useState('')
  const [live, setLive] = useState('')
  const [storageNote, setStorageNote] = useState(() =>
    storageState().mode === 'memory'
      ? 'Tarayıcı depolamasına erişilemiyor; hatırlatmalar bu oturumda tutulur ve kalıcı olmayabilir.'
      : '',
  )
  const [inventory, setInventory] = useState<string[]>([])

  const timeRef = useRef<HTMLInputElement>(null)
  const announced = useRef<Set<string> | null>(null)

  const refresh = useCallback((at: Date = new Date(), announce = false) => {
    const nextItems = listReminders()
    const nextAcked = getAcknowledgedIds(at)
    if (announce) {
      const dueNow = nextItems.filter(item => reminderStatus(item, at, nextAcked) === 'due')
      const ids = dueNow.map(item => item.id)
      if (announced.current === null) {
        announced.current = new Set(ids)
      } else {
        const fresh = dueNow.filter(item => !announced.current!.has(item.id))
        for (const id of ids) announced.current.add(id)
        if (fresh.length) {
          setLive(
            fresh.length === 1
              ? `${fresh[0].time} · ${fresh[0].title} hatırlatmasının zamanı geldi.`
              : `${fresh.length} hatırlatmanın zamanı geldi: ${fresh.map(item => item.title).join(', ')}.`,
          )
        }
      }
    }
    setNow(at)
    setItems(nextItems)
    setAcked(nextAcked)
    setStorageNote(
      storageState().mode === 'memory'
        ? 'Tarayıcı depolamasına erişilemiyor; hatırlatmalar bu oturumda tutulur ve kalıcı olmayabilir.'
        : '',
    )
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => refresh(new Date(), true), 30_000)
    const off = onStorageKey(REMINDERS_KEY, () => refresh(new Date(), true))
    return () => {
      window.clearInterval(id)
      off()
    }
  }, [refresh])

  useEffect(() => {
    let active = true
    listSupplements()
      .then(rows => {
        if (!active) return
        const names = [...new Set(rows.map(row => row.name.trim()).filter(Boolean))].slice(0, 40)
        setInventory(names)
      })
      .catch(() => { if (active) setInventory([]) })
    return () => { active = false }
  }, [])

  const due = useMemo(
    () => items.filter(item => reminderStatus(item, now, acked) === 'due'),
    [items, now, acked],
  )
  const rest = useMemo(
    () => items.filter(item => reminderStatus(item, now, acked) !== 'due'),
    [items, now, acked],
  )

  const resetForm = () => {
    setTitle('')
    setTime('')
    setKind('general')
    setNote('')
    setError('')
  }

  const openForm = (next?: Partial<{ title: string; kind: ReminderKind }>) => {
    setTitle(next?.title ?? '')
    setTime('')
    setKind(next?.kind ?? 'general')
    setNote('')
    setError('')
    setFormOpen(true)
    window.requestAnimationFrame(() => timeRef.current?.focus())
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      addReminder({ title, time, kind, note })
      resetForm()
      setFormOpen(false)
      refresh()
      setLive('Hatırlatma eklendi. Saati siz seçtiniz; otomatik plan oluşturulmadı.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hatırlatma eklenemedi.')
    }
  }

  const startEdit = (reminder: Reminder) => {
    setEditingId(reminder.id)
    setEditDraft({ title: reminder.title, time: reminder.time, note: reminder.note })
    setError('')
  }

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingId) return
    setError('')
    try {
      updateReminder(editingId, editDraft)
      setEditingId(null)
      refresh()
      setLive('Hatırlatma güncellendi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hatırlatma güncellenemedi.')
    }
  }

  const acknowledge = (reminder: Reminder) => {
    setError('')
    try {
      if (!acknowledgeReminder(reminder.id)) throw new Error('Hatırlatma bulunamadı.')
      announced.current?.delete(reminder.id)
      setLive(`${reminder.title} bugün için tamamlandı.`)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşaretlenemedi.')
    }
  }

  const snooze = (reminder: Reminder) => {
    setError('')
    try {
      const result = snoozeReminder(reminder.id, SNOOZE_MINUTES)
      if (!result) throw new Error('Hatırlatma bulunamadı.')
      announced.current?.delete(reminder.id)
      setLive(`${reminder.title} ${result.minutes} dakika ertelendi; ${clock(result.until)} tekrar görünecek.`)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ertelenemedi.')
    }
  }

  const remove = (reminder: Reminder) => {
    if (!window.confirm(`“${reminder.title}” hatırlatması silinsin mi? Bu işlem geri alınamaz.`)) return
    setError('')
    try {
      deleteReminder(reminder.id)
      if (editingId === reminder.id) setEditingId(null)
      refresh()
      setLive('Hatırlatma silindi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hatırlatma silinemedi.')
    }
  }

  const statusOf = (reminder: Reminder) => reminderStatus(reminder, now, acked)

  const rowActions = (reminder: Reminder) => (
    <div className="rem-actions">
      {statusOf(reminder) === 'due' && (
        <>
          <button type="button" className="rem-btn rem-btn-primary" onClick={() => acknowledge(reminder)}>
            Aldım
          </button>
          <button type="button" className="rem-btn" onClick={() => snooze(reminder)}>
            {SNOOZE_MINUTES} dk ertele
          </button>
        </>
      )}
      <button
        type="button"
        className="rem-btn rem-btn-quiet"
        aria-expanded={editingId === reminder.id}
        aria-controls={`rem-edit-${reminder.id}`}
        onClick={() => editingId === reminder.id ? setEditingId(null) : startEdit(reminder)}
      >
        {editingId === reminder.id ? 'Vazgeç' : 'Düzenle'}
      </button>
      <button type="button" className="rem-btn rem-btn-danger" onClick={() => remove(reminder)}>
        Sil
      </button>
    </div>
  )

  const rowBody = (reminder: Reminder) => {
    const status = statusOf(reminder)
    return (
      <>
        <div className="rem-time">{reminder.time}</div>
        <div className="rem-body">
          <div className="rem-row-head">
            <p className="rem-title">{reminder.title}</p>
            <span className={`rem-badge rem-badge-${status}`}>{STATUS_LABEL[status]}</span>
          </div>
          <p className="rem-meta">
            {KIND_LABELS[reminder.kind]}
            {status === 'snoozed' && reminder.snoozeUntil ? ` · ${snoozeLabel(reminder, now)} tekrar` : ''}
          </p>
          {reminder.note && <p className="rem-note">{reminder.note}</p>}
        </div>
      </>
    )
  }

  return (
    <div className="rem-page">
      <header className="rem-head">
        <p className="rem-kicker">BİYOTRACK · GÜNLÜK PLAN</p>
        <h1>Hatırlatmalar</h1>
        <p className="rem-intro">
          Takviye, kısa yürüyüş veya genel bir not için saati kendiniz seçin. Uygulama sizin yerinize
          saat ya da doz planı oluşturmaz.
        </p>
        <div className="rem-head-actions">
          <button
            type="button"
            className="rem-btn rem-btn-primary"
            aria-expanded={formOpen}
            onClick={() => {
              if (formOpen) {
                setFormOpen(false)
                resetForm()
              } else {
                openForm()
              }
            }}
          >
            {formOpen ? 'Formu kapat' : '+ Hatırlatma ekle'}
          </button>
          <button type="button" className="rem-btn rem-btn-template" onClick={() => openForm({ title: 'Kısa yürüyüş', kind: 'walk' })}>
            Yürüyüş hatırlatması ekle
          </button>
        </div>
      </header>

      {storageNote && <p className="rem-warn" role="alert">{storageNote}</p>}
      {error && <p className="rem-error" role="alert">{error}</p>}
      <p className="rem-sr" role="status" aria-live="polite">{live}</p>

      {formOpen && (
        <form className="rem-form" onSubmit={submit} aria-label="Yeni hatırlatma">
          <h2>Yeni hatırlatma</h2>
          <label className="rem-field">
            <span className="field-label">Başlık</span>
            <input
              className="dose-input"
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={REMINDER_TITLE_MAX}
              placeholder="Örn. Kısa yürüyüş"
              required
              autoComplete="off"
            />
          </label>

          <div className="rem-grid">
            <label className="rem-field">
              <span className="field-label">Saat (siz seçin)</span>
              <input
                ref={timeRef}
                type="time"
                className="dose-input"
                value={time}
                onChange={event => setTime(event.target.value)}
                required
              />
            </label>
            <ThemeSelect
              label="Tür"
              value={KIND_LABELS[kind]}
              options={KIND_OPTIONS}
              onChange={label => {
                const next = REMINDER_KINDS.find(item => KIND_LABELS[item] === label)
                if (next) setKind(next)
              }}
            />
          </div>

          {kind === 'supplement' && (
            <div className="rem-picks">
              <p className="field-label">Envanterden ad seç (isteğe bağlı)</p>
              {inventory.length > 0 ? (
                <div className="rem-chips">
                  {inventory.map(name => (
                    <button
                      type="button"
                      key={name}
                      className="rem-chip"
                      aria-pressed={title === name.slice(0, REMINDER_TITLE_MAX)}
                      onClick={() => setTitle(name.slice(0, REMINDER_TITLE_MAX))}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rem-hint">
                  Envanterde kayıtlı takviye yok; başlığı kendiniz yazabilirsiniz.{' '}
                  <Link href="/supplements">Takviye ekle →</Link>
                </p>
              )}
              <p className="rem-hint">
                Başladığınız bir ilaç için bu modül doz önermez ve otomatik doz oluşturmaz; yalnızca
                sizin girdiğiniz saati hatırlatır. Doz ve kullanım için ürün etiketine/hekim planına uyun.
              </p>
            </div>
          )}

          {kind === 'walk' && (
            <p className="rem-hint">
              Yürüyüş hatırlatması genel bir hareket hatırlatmasıdır; sağlık durumunuz veya hekim
              kısıtlamanız varsa kendi planınıza uyun.
            </p>
          )}

          <label className="rem-field">
            <span className="field-label">Not (isteğe bağlı, en fazla {REMINDER_NOTE_MAX} karakter)</span>
            <textarea
              className="dose-input rem-textarea"
              rows={2}
              maxLength={REMINDER_NOTE_MAX}
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="Örn. yemekten sonra"
            />
          </label>

          <div className="rem-form-actions">
            <button type="button" className="rem-btn rem-btn-quiet" onClick={() => { setFormOpen(false); resetForm() }}>
              İptal
            </button>
            <button type="submit" className="rem-btn rem-btn-primary">Hatırlatma ekle</button>
          </div>
        </form>
      )}

      <section className="rem-section" aria-labelledby="rem-due-title">
        <div className="rem-section-head">
          <h2 id="rem-due-title">Şimdi</h2>
          <span className="rem-count">{due.length}</span>
        </div>
        {due.length === 0 ? (
          <p className="rem-empty-line">Şu an zamanı gelen hatırlatma yok.</p>
        ) : (
          <ul className="rem-list">
            {due.map(reminder => (
              <li key={reminder.id} className="rem-card rem-card-due">
                {rowBody(reminder)}
                {rowActions(reminder)}
                {editingId === reminder.id && editForm(reminder.id)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rem-section" aria-labelledby="rem-plan-title">
        <div className="rem-section-head">
          <h2 id="rem-plan-title">Bugünün planı</h2>
          <span className="rem-count">{rest.length}</span>
        </div>
        {items.length === 0 ? (
          <div className="rem-empty">
            <p className="rem-empty-title">Henüz hatırlatma yok.</p>
            <p>
              İlk hatırlatmayı yukarıdan ekleyin; saat alanı boş başlar ve sizin onayınız olmadan
              kaydedilmez. Varsayılan alarm veya otomatik plan oluşturulmaz.
            </p>
          </div>
        ) : rest.length === 0 ? (
          <p className="rem-empty-line">Bugün için planlanmış başka hatırlatma yok.</p>
        ) : (
          <ul className="rem-list">
            {rest.map(reminder => (
              <li key={reminder.id} className="rem-card">
                {rowBody(reminder)}
                {rowActions(reminder)}
                {editingId === reminder.id && editForm(reminder.id)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="rem-edu" aria-label="Beslenme ve güvenlik notu">
        <p>
          <strong>D vitamini ve öğün:</strong> “D vitamini yağ içeren bir öğünle daha iyi emilebilir;
          belirli bir saat herkes için zorunlu değildir. Ürün etiketi/hekim planını esas al.”
        </p>
        <a href={VITAMIN_D_SOURCE} target="_blank" rel="noopener noreferrer">
          Kaynak: NIH ODS · Vitamin D fact sheet ↗
        </a>
        <p className="rem-edu-muted">
          Magnezyum veya başka bir takviye için “en iyi saat” iddiası bu modülde yoktur; zamanı siz
          belirlersiniz. Başlamış bir ilacın dozunu değiştirmeyin.
        </p>
      </aside>

      <p className="rem-footnote">
        Bu sürümde hatırlatmalar uygulama açıkken görünür; kapalıyken push göndermez. Sayfa açıkken
        durum 30 saniyede bir yerel saatle yenilenir, “Aldım” işareti yalnızca bugün için geçerlidir.
      </p>
    </div>
  )

  function editForm(id: string) {
    return (
      <form id={`rem-edit-${id}`} className="rem-edit" onSubmit={saveEdit} aria-label="Hatırlatmayı düzenle">
        <label className="rem-field">
          <span className="field-label">Başlık</span>
          <input
            className="dose-input"
            value={editDraft.title}
            maxLength={REMINDER_TITLE_MAX}
            onChange={event => setEditDraft(prev => ({ ...prev, title: event.target.value }))}
            required
          />
        </label>
        <label className="rem-field">
          <span className="field-label">Saat</span>
          <input
            type="time"
            className="dose-input"
            value={editDraft.time}
            onChange={event => setEditDraft(prev => ({ ...prev, time: event.target.value }))}
            required
          />
        </label>
        <label className="rem-field">
          <span className="field-label">Not</span>
          <textarea
            className="dose-input rem-textarea"
            rows={2}
            maxLength={REMINDER_NOTE_MAX}
            value={editDraft.note}
            onChange={event => setEditDraft(prev => ({ ...prev, note: event.target.value }))}
          />
        </label>
        <div className="rem-form-actions">
          <button type="button" className="rem-btn rem-btn-quiet" onClick={() => setEditingId(null)}>Vazgeç</button>
          <button type="submit" className="rem-btn rem-btn-primary">Değişiklikleri kaydet</button>
        </div>
      </form>
    )
  }
}
