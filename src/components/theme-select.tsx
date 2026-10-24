'use client'
import { useEffect, useRef, useState } from 'react'

/** Custom listbox avoids native white/blue OS select menus. */
export default function ThemeSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly string[]; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return <div ref={root} className="theme-select" onKeyDown={e => {
    if (e.key === 'Escape') { setOpen(false); trigger.current?.focus() }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); setOpen(true)
      const buttons = [...root.current!.querySelectorAll<HTMLButtonElement>('[role=option]')]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = index < 0 ? Math.max(0, options.indexOf(value)) : (index + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
      requestAnimationFrame(() => root.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[next]?.focus())
    }
  }}>
    <span className="field-label">{label}</span>
    <button ref={trigger} type="button" className="dose-input theme-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
      <span>{value}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div role="listbox" aria-label={label} className="theme-options">
      {options.map(option => <button type="button" key={option} role="option" aria-selected={option === value} className="theme-option" onClick={() => { onChange(option); setOpen(false); trigger.current?.focus() }}>
        <span>{option}</span>{option === value && <span aria-hidden="true">✓</span>}
      </button>)}
    </div>}
  </div>
}
