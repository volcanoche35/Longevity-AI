'use client'

import { useEffect, useState } from 'react'
import { THEMES, DEFAULT_THEME } from '@/lib/themes'
import './theme-selector.css'

const KEY = 'biotrack.theme.v1'

export function getStoredTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try { return localStorage.getItem(KEY) || DEFAULT_THEME } catch { return DEFAULT_THEME }
}

export function applyTheme(id: string) {
  document.documentElement.setAttribute('data-theme', id)
  try { localStorage.setItem(KEY, id) } catch { /* yer yoksa sessiz geç */ }
}

/** Ayarlar sayfasında kullanılan tema seçici — renk önizlemeli kartlar. */
export default function ThemeSelector() {
  const [current, setCurrent] = useState<string>(DEFAULT_THEME)

  useEffect(() => { setCurrent(getStoredTheme()) }, [])

  return (
    <div className="theme-grid" role="radiogroup" aria-label="Tema seçimi">
      {THEMES.map(t => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={t.id === current}
          className={`theme-card${t.id === current ? ' is-on' : ''}`}
          onClick={() => { applyTheme(t.id); setCurrent(t.id) }}
        >
          <span className="theme-swatches" aria-hidden="true">
            {t.preview.map((c, i) => (
              <span key={i} className="theme-swatch" style={{ background: c }} />
            ))}
          </span>
          <span className="theme-name">{t.name}</span>
        </button>
      ))}
    </div>
  )
}
