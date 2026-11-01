'use client'

import { useState } from 'react'
import ThemeSelect from '@/components/theme-select'
import { suggest } from '@/lib/catalog'
import {
  dailyIntakeSummary, emptyPart, formWord, labelContentLines, unitsForForm,
  type DosePart, type DosePlan, type DoseUnit,
} from '@/lib/dosage'

/**
 * Etken madde seçici — katalogdan kategoriye göre otomatik tamamlama.
 * Kullanıcı 1 hap/dozdaki etken maddeleri (örn. Magnezyum sitrat, D3)
 * kategoriye göre seçer; mg miktarını ayrı girer.
 */
function IngredientNameInput({ value, onChange, placeholder }: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const suggestions = suggest(value, 7)

  return (
    <div className="relative">
      <input
        className="dose-input"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls="ingredient-suggest"
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />
      {open && suggestions.length > 0 && (
        <ul
          id="ingredient-suggest"
          className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-2xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}
        >
          {suggestions.map(s => (
            <li key={s.name}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { onChange(s.name); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/6 transition-colors"
              >
                <span className="text-lg shrink-0">💊</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-white truncate">{s.name}</span>
                  <span className="block text-[10px] text-[var(--text-3)] truncate">{s.category}</span>
                </span>
                <span className="text-[10px] text-[var(--text-3)] shrink-0">Katalog</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Sade giriş: kullanım şekli → günde ne kadar → bu dozdaki etken maddeler (mg).
 * Etken maddeler katalogdan seçilir; aynı hapta birden çok madde tek tek eklenir.
 */
export default function DoseEditor({ plan, onChange }: { plan: DosePlan; onChange: (plan: DosePlan) => void }) {
  const units = unitsForForm(plan.form)
  const unit = (units.includes(plan.dailyUnit as DoseUnit) ? plan.dailyUnit : units[0]) as DoseUnit
  const counted = unit === 'adet'
  const word = formWord(plan.form)
  const updatePart = (index: number, change: Partial<DosePart>) =>
    onChange({ ...plan, parts: plan.parts.map((p, i) => i === index ? { ...p, ...change } : p) })

  const setForm = (form: string) => {
    const allowed = unitsForForm(form)
    onChange({ ...plan, form, dailyUnit: allowed.includes(unit) ? unit : allowed[0] })
  }

  const addPart = () => onChange({ ...plan, parts: [...plan.parts, emptyPart()] })
  const removePart = (index: number) => onChange({ ...plan, parts: plan.parts.filter((_, i) => i !== index) })

  const labelLines = labelContentLines(plan.parts)

  return (
    <>
      <div className="dose-section">
        <p className="field-label">GÜNLÜK KULLANIM</p>
        <ThemeSelect label="Kullanım şekli" value={plan.form} options={['Hap', 'Kapsül', 'Damla', 'Toz', 'Sıvı', 'Diğer']} onChange={setForm} />

        <div className="mt-3">
          <span className="field-label">{counted ? `Günde kaç ${word}` : 'Günde ne kadar'}</span>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="dose-input"
              aria-label="Günlük miktar"
              inputMode="decimal"
              placeholder={counted ? 'Örn. 1' : 'Örn. 5'}
              value={plan.dailyAmount ?? ''}
              onChange={e => onChange({ ...plan, dailyAmount: e.target.value })}
            />
            {units.length === 1 ? (
              <div className="dose-input flex items-center" aria-label={counted ? `Günlük birim: ${word}` : `Günlük birim: ${unit}`}>
                <span className="text-[var(--text-2)] text-sm">{counted ? word : unit}</span>
              </div>
            ) : (
              <ThemeSelect label="Birim" value={unit} options={units} onChange={v => onChange({ ...plan, dailyUnit: v as DoseUnit })} />
            )}
          </div>
          <p className="text-xs text-[var(--text-2)] mt-2">
            {plan.form === 'Toz'
              ? 'Toz ürünlerin etiketinde mg veya g yazar. Günlük toz miktarını bu şekilde gir; adet sorulmaz.'
              : counted
                ? `Gün içinde aldığın toplam ${word} sayısını gir.`
                : 'Gün içinde aldığın toplam miktarı gir.'}
          </p>
        </div>
      </div>

      <div className="dose-section">
        <p className="field-label">ÜRÜN İÇERİĞİ</p>
        <div className="rounded-2xl p-3" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-medium">💊 1 {word} <span className="text-[var(--text-3)] font-normal">(tek ürün)</span></span>
            <span className="text-[11px] text-[var(--text-3)]">{plan.parts.length} etken madde</span>
          </div>
          <p className="text-xs text-[var(--text-2)] mt-1 mb-3">
            Tek {word} içinde birden çok etken madde olabilir; her biri bu ürünün içeriği olarak aşağıda listelenir. Örn. 1 {word}: 200 mg Magnezyum sitrat + 100 mg Magnezyum bisglisinat.
          </p>
          <div className="ml-1 pl-3 space-y-3" style={{ borderLeft: '2px solid var(--line)' }}>
            {plan.parts.map((part, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] text-[var(--text-3)]">↳ içerik {index + 1}</span>
                  <button type="button" aria-label={`${index + 1}. içeriği kaldır`} className="text-xs text-[var(--primary)]"
                    onClick={() => removePart(index)}>Kaldır</button>
                </div>
                <IngredientNameInput
                  value={part.label}
                  placeholder="Etken madde — örn. Magnezyum sitrat"
                  onChange={label => updatePart(index, { label })}
                />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input className="dose-input" aria-label={`${index + 1}. madde miktarı`} inputMode="decimal" placeholder={`1 ${word} içinde, örn. 200`}
                    value={part.amount} onChange={e => updatePart(index, { amount: e.target.value })} />
                  <ThemeSelect label="Birim" value={part.unit}
                    options={['mg', 'g', 'µg', 'IU', 'damla', 'adet', 'ml']} onChange={v => updatePart(index, { unit: v as DoseUnit })} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="dose-add mt-3" onClick={addPart}>
            + Bu ürüne etken madde ekle
          </button>
        </div>
        {labelLines.length > 1 && (
          <div className="dose-total" role="status">1 {word} içinde: {labelLines.join(' · ')}</div>
        )}
      </div>

      {plan.dailyAmount?.trim() && (
        <div className="dose-total" role="status" aria-live="polite">{dailyIntakeSummary({ ...plan, dailyUnit: unit })}</div>
      )}
    </>
  )
}

/** Kullanım saatleri: birden fazla HH:MM slotu ekle/çıkar. */
export function ScheduleEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('08:00')
  const add = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft)) return
    onChange([...new Set([...value, draft])].sort())
  }
  return (
    <div className="mt-3">
      <span className="field-label">Kullanım saatleri</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.length === 0 && <span className="text-xs text-[var(--text-3)]">Saat eklenmedi — hatırlatma çıkmaz.</span>}
        {value.map(t => (
          <span key={t} className="chip inline-flex items-center gap-1">
            {t}
            <button type="button" aria-label={`${t} saatini kaldır`} className="px-1 text-[var(--primary)]"
              onClick={() => onChange(value.filter(x => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input type="time" className="dose-input" aria-label="Kullanım saati" value={draft}
          onChange={e => setDraft(e.target.value)} />
        <button type="button" className="dose-add" onClick={add}>+ saat</button>
      </div>
    </div>
  )
}
