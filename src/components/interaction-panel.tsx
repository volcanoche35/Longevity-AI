'use client'

import { useMemo, useState } from 'react'
import {
  reviewSupplements,
  DRUG_NOTICE,
  DISCLOSURE_LABEL,
  SCOPE_NOTICE,
  type InteractionInput,
} from '@/lib/interaction-review'
import './interaction-panel.css'

interface InteractionPanelProps {
  supplements: Array<{ name: string; dosage?: string }>
}

/**
 * Birlikte kullanım paneli — kaynaklı, sınırları açık.
 * Karar mantığı src/lib/interaction-review.ts içinde; bu dosya yalnızca gösterir.
 * Ağ/AI çağrısı yok, doz ayrıştırma yok: `dosage` etiketteki metin olarak basılır.
 */
export default function InteractionPanel({ supplements }: InteractionPanelProps) {
  const [open, setOpen] = useState(false)
  const input: InteractionInput[] = useMemo(
    () => (supplements ?? []).map(s => ({ name: s.name, dosage: s.dosage })),
    [supplements],
  )
  const review = useMemo(() => reviewSupplements(input), [input])

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
                <li key={`${pair.ruleId}-${idx}`} className="ixp-card">
                  <span className="ixp-label">{pair.label}</span>
                  <p className="ixp-pair">
                    <span>{pair.products[0]}</span>
                    <span className="ixp-x" aria-hidden="true">+</span>
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

        <p className="ixp-drug">{DRUG_NOTICE}</p>
        <p className="ixp-scope">{SCOPE_NOTICE}</p>
      </div>
    </section>
  )
}
