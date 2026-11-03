'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { listSupplements, type ClientSupplement } from '@/lib/data'
import { loadProfile, onProfileChange } from '@/lib/profile'
import { reviewSupplements } from '@/lib/interaction-review'
import { reviewMedications } from '@/lib/medication-interactions'
import { recommendationsFor } from '@/lib/usage-recommendations'
import BrandMark from '@/components/brand-mark'
import './interactions.css'

interface Supp { name: string; dosage?: string }

export default function InteractionsPage() {
  const [supplements, setSupplements] = useState<ClientSupplement[]>([])
  const [loaded, setLoaded] = useState(false)
  const medications = useSyncExternalStore(onProfileChange, () => loadProfile().medications, () => '')

  useEffect(() => {
    let cancelled = false
    listSupplements()
      .then(list => { if (!cancelled) setSupplements(list) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  const input: Supp[] = useMemo(() => supplements.map(s => ({ name: s.name, dosage: s.dosage })), [supplements])
  const review = useMemo(() => reviewSupplements(input, { maxPairs: 12 }), [input])
  const recs = useMemo(() => recommendationsFor(supplements.map(s => s.name)), [supplements])
  const medConflicts = useMemo(
    () => reviewMedications(medications ?? '', supplements.map(s => s.name)),
    [medications, supplements],
  )

  const conflicts = review.pairs.filter(p => p.kind === 'conflict')
  const synergies = review.pairs.filter(p => p.kind === 'synergy')

  if (!loaded) {
    return (
      <div className="ixp-page">
        <p className="ixp-page__loading">🧬 Yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className="ixp-page">
      <header className="ixp-hero">
        <BrandMark size={56} label="LongevityAI — etkileşim ve öneriler" />
        <div className="ixp-hero__text">
          <h1 className="ixp-hero__title">Etkileşimler &amp; Öneriler</h1>
          <p className="ixp-hero__sub">
            Takviyelerin arasındaki olası etkileşimler ve kullanım önerileri — bilgi amaçlı, tıbbi tavsiye değildir.
          </p>
        </div>
      </header>

      {supplements.length === 0 ? (
        <p className="ixp-page__empty">
          Henüz takviye eklemedin. Takviyeler sayfasından birkaç ürün ekleyince burada aralarındaki etkileşimler ve kullanım önerileri listelenecek.
        </p>
      ) : (
        <>
          <section className="ixp-stats" aria-label="Özet">
            <div className="ixp-stat">
              <span className="ixp-stat__num">{conflicts.length}</span>
              <span className="ixp-stat__label">Olası etkileşim</span>
            </div>
            <div className="ixp-stat ixp-stat--syn">
              <span className="ixp-stat__num">{synergies.length}</span>
              <span className="ixp-stat__label">Sinerji</span>
            </div>
            <div className="ixp-stat">
              <span className="ixp-stat__num">{recs.length}</span>
              <span className="ixp-stat__label">Kullanım önerisi</span>
            </div>
          </section>

          {conflicts.length > 0 && (
            <section className="ixp-section" aria-labelledby="ixp-conflict-title">
              <h2 id="ixp-conflict-title" className="ixp-section__title">
                <span aria-hidden="true">⚠️</span> Ayrı alma önerileri
              </h2>
              <ul className="ixp-section__list">
                {conflicts.map((pair, i) => (
                  <li key={`c-${i}`} className="ixp-item ixp-item--conflict">
                    <p className="ixp-item__pair">
                      <span>{pair.products[0]}</span>
                      <span className="ixp-item__x" aria-hidden="true">+</span>
                      <span>{pair.products[1]}</span>
                    </p>
                    <p className="ixp-item__cond">{pair.condition}</p>
                    <p className="ixp-item__src">
                      {pair.sources.map(s => s.label).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {synergies.length > 0 && (
            <section className="ixp-section" aria-labelledby="ixp-syn-title">
              <h2 id="ixp-syn-title" className="ixp-section__title">
                <span aria-hidden="true">✦</span> Birlikte iyi gidenler
              </h2>
              <ul className="ixp-section__list">
                {synergies.map((pair, i) => (
                  <li key={`s-${i}`} className="ixp-item ixp-item--synergy">
                    <p className="ixp-item__pair">
                      <span>{pair.products[0]}</span>
                      <span className="ixp-item__x" aria-hidden="true">✦</span>
                      <span>{pair.products[1]}</span>
                    </p>
                    <p className="ixp-item__cond">{pair.condition}</p>
                    <p className="ixp-item__src">
                      {pair.sources.map(s => s.label).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {recs.length > 0 && (
            <section className="ixp-section" aria-labelledby="ixp-rec-title">
              <h2 id="ixp-rec-title" className="ixp-section__title">
                <span aria-hidden="true">💡</span> Kullanım önerileri
              </h2>
              <ul className="ixp-section__list">
                {recs.map(({ rec }, i) => (
                  <li key={`r-${i}`} className="ixp-item ixp-item--rec">
                    <p className="ixp-item__label">{rec.label}</p>
                    <div className="ixp-item__recs">
                      <p><span className="ixp-item__tag">⏰ Zaman</span>{rec.timing}</p>
                      <p><span className="ixp-item__tag">🍽️ Yiyecek</span>{rec.food}</p>
                      {rec.synergy.length > 0 && (
                        <p><span className="ixp-item__tag">🤝 Sinerji</span>{rec.synergy.join(', ')}</p>
                      )}
                      <p><span className="ixp-item__tag">⚠️ Dikkat</span>{rec.caution}</p>
                    </div>
                    <p className="ixp-item__src">{rec.source}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {medications && medications.trim() && (
            <section className="ixp-section" aria-labelledby="ixp-med-title">
              <h2 id="ixp-med-title" className="ixp-section__title">
                <span aria-hidden="true">⚕️</span> İlaç × Takviye
              </h2>
              {medConflicts.length > 0 ? (
                <ul className="ixp-section__list">
                  {medConflicts.map((c, i) => (
                    <li key={`m-${i}`} className="ixp-item ixp-item--med">
                      <p className="ixp-item__pair">
                        <span>{c.medicationLabel}</span>
                        <span className="ixp-item__x" aria-hidden="true">↔</span>
                        <span>{c.supplement}</span>
                      </p>
                      <p className="ixp-item__cond">{c.note}</p>
                      <p className="ixp-item__src">{c.source}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ixp-page__note">Sınırlı ilaç taramasında eşleşme bulunmadı. Düzenli ilaç kullanıyorsanız hekim veya eczacıya danışın.</p>
              )}
            </section>
          )}

          <p className="ixp-page__disclaimer">
            Bu ekran sınırlı sayıda kaynaklı kuralı denetler; birlikte kullanım için güvenlik onayı değildir ve tıbbi tanı/tavsiye yerine geçmez.
          </p>
        </>
      )}
    </div>
  )
}
