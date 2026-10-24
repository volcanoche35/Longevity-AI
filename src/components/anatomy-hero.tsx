'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LAYERS, ORGANS, GRADE_LABEL, toStagePercent, type LayerId, type Organ } from '@/lib/anatomy'

const GRADE_CLASS = { A: 'chip-a', B: 'chip-b', C: 'chip-c' } as const

export default function AnatomyHero() {
  const [on, setOn] = useState<Record<LayerId, boolean>>({ body: true, cardio: true, digestive: false })
  const [selected, setSelected] = useState<Organ | null>(null)

  const toggle = (id: LayerId) => setOn(prev => ({ ...prev, [id]: !prev[id] }))
  const visible = ORGANS.filter(o => on[o.layer as LayerId])

  return (
    <section className="mb-6">
      {/* ── Başlık sahnenin ÜSTÜNDE: görselin üstüne binmez, okunurluk korunur ── */}
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-mono tracking-[0.22em] text-[var(--text-3)]">BİYOTRACK</p>
          <h2 className="text-gradient text-[22px] font-bold leading-tight mt-0.5">
            Vücudunu kanıtla haritala
          </h2>
        </div>
        <span className="chip shrink-0" style={{ borderColor: 'rgba(255,77,94,.35)', color: '#FF8A93' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" /> CANLI
        </span>
      </div>

      {/* ── Sahne ── */}
      <div
        className="anat-stage relative w-full overflow-hidden rounded-[26px] border border-white/10"
        style={{
          aspectRatio: '896 / 1200',
          maxHeight: '58vh',
          background: 'radial-gradient(120% 78% at 50% 20%, #0C1424 0%, #04060A 65%)',
        }}
      >
        {/* Her katman kendi kutusunda. Konumlandırma SARMALAYICI div'de:
            Image'a doğrudan left/top vermek Next'in fill modu (inset:0) ile çarpışıyor
            ve katman sahnenin sol-üst köşesine kayıyordu. */}
        {LAYERS.map(layer => (
          <div
            key={layer.id}
            aria-hidden={!on[layer.id]}
            className={`absolute overflow-hidden transition-opacity duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)] ${
              on[layer.id] ? 'opacity-100' : 'opacity-0'
            } ${layer.id === 'cardio' ? 'anat-pulse' : ''}`}
            style={{
              left: `${layer.box.left}%`,
              top: `${layer.box.top}%`,
              width: `${layer.box.width}%`,
              height: `${layer.box.height}%`,
              mixBlendMode: 'screen',
            }}
          >
            <Image
              src={layer.src}
              alt={layer.label}
              fill
              sizes="(max-width: 640px) 100vw, 520px"
              priority={layer.id !== 'digestive'}
              style={{ objectFit: 'contain' }}
            />
          </div>
        ))}

        {/* ── Hotspot'lar ── */}
        {visible.map(organ => {
          const pos = toStagePercent(organ)
          const active = selected?.id === organ.id
          return (
            <button
              key={organ.id}
              type="button"
              aria-label={organ.name}
              className="hotspot"
              data-active={active}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              onClick={() => setSelected(active ? null : organ)}
            >
              {active && <span className="hotspot-ring" />}
            </button>
          )
        })}

        {/* ── Katman anahtarları ── */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2 justify-center">
          {LAYERS.map(layer => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={on[layer.id]}
              onClick={() => toggle(layer.id)}
              className="chip transition"
              style={{
                borderColor: on[layer.id] ? `${layer.color}66` : 'rgba(255,255,255,.08)',
                background: on[layer.id] ? `${layer.color}1f` : 'rgba(255,255,255,.05)',
                color: on[layer.id] ? layer.color : 'rgba(255,255,255,.45)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
              {layer.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Organ detay çekmecesi ── */}
      {selected && (
        <div className="mt-3 glass-strong p-4 animate-sheet-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{selected.icon}</span>
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
              </div>
              <p className="text-sm text-[var(--text-2)] mt-1">{selected.blurb}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="chip shrink-0" aria-label="Kapat">✕</button>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-mono tracking-widest text-[var(--text-3)]">İLGİLİ TAKVİYELER</p>
            {selected.supplements.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--text)]">{s.name}</span>
                <span className={`chip ${GRADE_CLASS[s.grade]}`}>{s.grade} · {GRADE_LABEL[s.grade]}</span>
              </div>
            ))}
          </div>

          {selected.avoid && selected.avoid.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#FF6B4A]/25 bg-[#FF6B4A]/8 p-3">
              <p className="text-[11px] font-mono tracking-widest text-[#FF9A7A]">DİKKAT</p>
              {selected.avoid.map(a => <p key={a} className="text-sm text-[var(--text)] mt-1">• {a}</p>)}
            </div>
          )}

          <Link
            href="/chat"
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-sm font-semibold"
            style={{ background: 'linear-gradient(92deg,#FF4D5E,#FFB020)', color: '#0A0F18' }}
          >
            Bu organ için AI'a sor →
          </Link>
          <p className="mt-2 text-[10px] text-[var(--text-3)] text-center">
            Bilgi amaçlıdır, tıbbi tavsiye yerine geçmez. Doz için kan değerinizi hekiminizle değerlendirin.
          </p>
        </div>
      )}
    </section>
  )
}
