'use client'

import { useMemo, useState } from 'react'
import {
  reviewSupplements,
  DRUG_NOTICE,
  DISCLOSURE_LABEL,
  SCOPE_NOTICE,
  type InteractionInput,
} from '@/lib/interaction-review'
import { reviewMedications, MEDICATION_NOTICE } from '@/lib/medication-interactions'
import './interaction-panel.css'

interface InteractionPanelProps {
  supplements: Array<{ name: string; dosage?: string }>
  medications?: string
}

/**
 * Birlikte kullanım paneli — kaynaklı, sınırları açık.
 * Karar mantığı src/lib/interaction-review.ts içinde; bu dosya yalnızca gösterir.
 * Ağ/AI çağrısı yok, doz ayrıştırma yok: `dosage` etiketteki metin olarak basılır.
 */
export default function InteractionPanel({ supplements, medications }: InteractionPanelProps) {
  const [open, setOpen] = useState(false)
  const input: InteractionInput[] = useMemo(
    () => (supplements ?? []).map(s => ({ name: s.name, dosage: s.dosage })),
    [supplements],
  )
  const review = useMemo(() => reviewSupplements(input), [input])
  const medConflicts = useMemo(
    () => reviewMedications(medications ?? '', (supplements ?? []).map(s => s.name)),
    [medications, supplements],
  )
  const hasMedications = Boolean(medications && medications.trim())

  return (
    <section className="ixp" aria-labelledby="ixp-title">
      <button
        type="button"
        className="ixp-toggle"
        aria-label={DISCLOSURE_LABEL}
        aria-expanded={open}
        aria-controls="ixp-body"
        onClick={() => setOpen(v => !v)}
      >
        <span className="ixp-toggle-text">
          <span id="ixp-title" className="ixp-title">Birlikte kullanım</span>
          <span className="ixp-sub">
            {review.status === 'insufficient'
              ? 'Çift karşılaştırması için en az iki kayıt gerekir'
              : review.pairs.length > 0
                ? `${review.pairs.length} kaynaklı olası etkileşim`
                : 'Sınırlı kurallarda eşleşme yok'}
          </span>
        </span>
        <span className="ixp-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      <div id="ixp-body" className="ixp-body" hidden={!open}>
        <p className="ixp-kicker">Sınırlı kaynaklı kontrol</p>

        {review.status === 'insufficient' ? (
          <p className="ixp-empty">{review.notice}</p>
        ) : review.pairs.length === 0 ? (
          <p className="ixp-empty">{review.notice}</p>
        ) : (
          <>
            <p className="ixp-notice">{review.notice}</p>
            <ul className="ixp-list">
              {review.pairs.map((pair, idx) => (
                <li key={`${pair.ruleId}-${idx}`} className={`ixp-card ${pair.kind === 'synergy' ? 'ixp-card--synergy' : ''}`}>
                  <span className="ixp-label">{pair.label}</span>
                  <p className="ixp-pair">
                    <span>{pair.products[0]}</span>
                    <span className="ixp-x" aria-hidden="true">{pair.kind === 'synergy' ? '✦' : '+'}</span>
                    <span>{pair.products[1]}</span>
                  </p>
                  {(pair.dosages[0] || pair.dosages[1]) && (
                    <p className="ixp-dosage">
                      <span className="ixp-dosage-tag">Etiketteki doz</span>{' '}
                      {[pair.dosages[0], pair.dosages[1]].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="ixp-condition">{pair.condition}</p>
                  <p className="ixp-sources">
                    {pair.sources.map((source, si) => (
                      <a
                        key={source.id}
                        className="ixp-source"
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Kaynak{si === 0 ? '' : ` ${si + 1}`}: {source.label}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}

        {review.unreviewedCount > 0 && (
          <div className="ixp-unreviewed">
            <p className="ixp-unreviewed-title">
              İncelenemeyen kayıtlar ({review.unreviewedCount})
            </p>
            <p className="ixp-unreviewed-body">
              Bu adlar sınırlı sözlükte tanınmadı; etkileşim açısından değerlendirilmedi ve
              güvenli sayılmadı: {review.unreviewed.join(', ')}.
            </p>
          </div>
        )}

        {hasMedications ? (
          medConflicts.length > 0 ? (
            <div className="ixp-med">
              <p className="ixp-kicker">İlaç etkileşimi — sınırlı tarama</p>
              <ul className="ixp-list">
                {medConflicts.map((c, i) => (
                  <li key={`${c.ruleId}-${i}`} className="ixp-card ixp-card--med">
                    <span className="ixp-label">{c.medicationLabel}</span>
                    <p className="ixp-pair">
                      <span>{c.medicationText}</span>
                      <span className="ixp-x" aria-hidden="true">↔</span>
                      <span>{c.supplement}</span>
                    </p>
                    <p className="ixp-condition">{c.note}</p>
                    <p className="ixp-sources"><span className="ixp-source">{c.source}</span></p>
                  </li>
                ))}
              </ul>
              <p className="ixp-scope">{MEDICATION_NOTICE}</p>
            </div>
          ) : (
            <p className="ixp-drug">Bu sınırlı ilaç taramasında eşleşme bulunmadı. {MEDICATION_NOTICE}</p>
          )
        ) : (
          <p className="ixp-drug">{DRUG_NOTICE}</p>
        )}
        <p className="ixp-scope">{SCOPE_NOTICE}</p>
      </div>
    </section>
  )
}
