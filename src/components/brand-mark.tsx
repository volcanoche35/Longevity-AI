'use client'

import './brand-mark.css'

interface BrandMarkProps {
  size?: number
  /** Erişilebilirlik: marka adı + görselin işlevi. */
  label?: string
}

/**
 * Animasyonlu marka işareti: dönen iki orbital halka + çekirdek.
 * Tamamen CSS animasyonu (JS yok), `prefers-reduced-motion` saygılı.
 */
export default function BrandMark({ size = 44, label = 'LongevityAI logosu' }: BrandMarkProps) {
  const style = { width: size, height: size }
  return (
    <span
      className="brand-mark"
      role="img"
      aria-label={label}
      style={style}
      aria-hidden={undefined}
    >
      <span className="brand-mark__ring" aria-hidden="true" />
      <span className="brand-mark__ring brand-mark__ring--2" aria-hidden="true" />
      <span className="brand-mark__nucleus" aria-hidden="true" />
    </span>
  )
}
