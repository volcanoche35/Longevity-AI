'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import './onboarding.css'

const SLIDES = [
  {
    emoji: '💊',
    title: 'Takviye takibi',
    desc: 'Vitamin, mineral ve aminoasitlerini planla; her gün al, tek dokunuşla işaretle, geçmişini takip et.',
  },
  {
    emoji: '📊',
    title: 'Günlük özbildirim',
    desc: 'Enerji, uyku ve sindirimini her gün işaretle; haftalar içindeki trendini net biçimde gör.',
  },
  {
    emoji: '🧠',
    title: 'Yapay zekâ analizi',
    desc: 'Profiline ve günlüğüne dayanan kısa, uygulanabilir tavsiyeler al. Teşhis değil, yönlendirme.',
  },
  {
    emoji: '⚕️',
    title: 'İlaç × takviye güvenliği',
    desc: 'Düzenli kullandığın ilaçlarla olası etkileşimleri önceden gör; güvenli kombinasyonu seç.',
  },
  {
    emoji: '📄',
    title: 'Sağlık özetin (PDF)',
    desc: 'Doktorunla ya da diyetisyeninle paylaşabileceğin tek sayfalık raporu istediğin an indir.',
  },
] as const

export default function OnboardingPage() {
  const [slide, setSlide] = useState(0)
  const touchX = useRef<number | null>(null)
  const last = slide === SLIDES.length - 1

  const next = useCallback(() => setSlide(s => Math.min(s + 1, SLIDES.length - 1)), [])
  const prev = useCallback(() => setSlide(s => Math.max(s - 1, 0)), [])

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx < -40) next()
    else if (dx > 40) prev()
    touchX.current = null
  }

  const s = SLIDES[slide]

  return (
    <div className="ob" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="ob-head">
        <span className="ob-brand">🧬 LongevityAI</span>
        <Link href="/auth" className="ob-link">Giriş yap</Link>
      </header>

      <main className="ob-main">
        <div className="ob-slide" key={slide}>
          <div className="ob-icon" aria-hidden="true">{s.emoji}</div>
          <h1 className="ob-title">{s.title}</h1>
          <p className="ob-desc">{s.desc}</p>
        </div>
      </main>

      <footer className="ob-foot">
        {last ? (
          <div className="ob-cta">
            <Link href="/auth" className="ob-primary">Giriş yap / Kayıt ol</Link>
            <button type="button" className="ob-social" disabled title="Yakında">
              <span className="ob-social-logo ob-g" aria-hidden="true">G</span>
              Google ile devam et
            </button>
            <button type="button" className="ob-social" disabled title="Yakında">
              <span className="ob-social-logo" aria-hidden="true"></span>
              Apple ile devam et
            </button>
            <p className="ob-note">Google ve Apple ile giriş yakında.</p>
          </div>
        ) : (
          <button type="button" className="ob-next" onClick={next}>
            İleri
            <span aria-hidden="true">→</span>
          </button>
        )}

        <div className="ob-dots" role="tablist" aria-label="Özellikler">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === slide}
              aria-label={`${i + 1}. özellik`}
              className={`ob-dot${i === slide ? ' is-on' : ''}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </footer>
    </div>
  )
}
