'use client'

/**
 * Anatomi sahnesi — katmanlı görsel + SVG bölge katmanı.
 *
 * Tasarım kararları:
 *  - Görsel hotspot NOKTASI yok. Etkileşim, görselle aynı 896×1200 koordinat
 *    uzayındaki organ/sistem sınır path'lerinde: hover = önizleme,
 *    tık/dokunma = sabitlenmiş seçim.
 *  - body.webp ve cardio.webp ÜST ÜSTE screen ile bindirilmez (çift kontur olur).
 *    İkisi crossfade edilir; aynı anda yalnız biri tam opak.
 *  - Kafa üstü kırpık olduğu için beyin bölgesi çizilmez; "Sinir" sistemi
 *    yalnızca açıklama kartı açar (hayali bölge gösterilmez).
 *  - Kanıt derecesi / sağlık skoru / fayda iddiası yok: yalnızca açıklayıcı
 *    anatomi bilgisi ve AI bağlantısı.
 */

import Image from 'next/image'
import { createPortal } from 'react-dom'
import { lockBodyScroll } from '@/lib/modal'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  SYSTEM_BY_ID,
  SYSTEMS,
  anatomyAssets,
  getRegions,
  toStagePercent,
  type AnatomyVariant,
  type Region,
  type RegionId,
  type SystemId,
} from '@/lib/anatomy-regions'

export interface AnatomySelection {
  system: SystemId
  region: RegionId | null
}

interface AnatomyHeroProps {
  variant: AnatomyVariant | null
  selection: AnatomySelection | null
  onSelect: (selection: AnatomySelection | null) => void
}

/* ── sistem ikonları (emoji yerine ince çizgi: platform tutarlılığı) ── */
function SystemIcon({ system }: { system: SystemId }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (system === 'nervous') {
    return (
      <svg {...common}>
        <path d="M12 3v18" />
        <path d="M12 7.5C9.5 7.5 8 9.2 8 11.5" />
        <path d="M12 7.5c2.5 0 4 1.7 4 4" />
        <path d="M12 13.5c-2 0-3.2 1.1-3.2 3" />
        <path d="M12 13.5c2 0 3.2 1.1 3.2 3" />
      </svg>
    )
  }
  if (system === 'respiratory') {
    return (
      <svg {...common}>
        <path d="M12 3v7.5" />
        <path d="M12 10.5c0-2-1.6-3.5-3.6-3.5S5 8.5 5 11.5v4.2c0 2 1.6 3.4 3.4 3.4 1.6 0 3-1.1 3.4-2.6" />
        <path d="M12 10.5c0-2 1.6-3.5 3.6-3.5S19 8.5 19 11.5v4.2c0 2-1.6 3.4-3.4 3.4-1.6 0-3-1.1-3.4-2.6" />
      </svg>
    )
  }
  if (system === 'cardiovascular') {
    return (
      <svg {...common}>
        <path d="M12 20.2S4.8 15.7 4.8 10.8A3.9 3.9 0 0 1 12 8.6a3.9 3.9 0 0 1 7.2 2.2c0 4.9-7.2 9.4-7.2 9.4Z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M8.5 3.5v5.2c0 2 1.4 3.2 3.1 3.2h1.6c2 0 3.3 1.4 3.3 3.4v4.7" />
      <path d="M6 20.5h4.2" />
      <path d="M14.2 20.5h4.3" />
    </svg>
  )
}

interface StageProps {
  variant: AnatomyVariant | null
  selection: AnatomySelection | null
  onSelect: (selection: AnatomySelection | null) => void
  regions: Region[]
  hovered: RegionId | null
  setHovered: (id: RegionId | null) => void
  vessels: boolean
  onToggleVessels: () => void
  zoom?: boolean
  onExpand?: () => void
  expanded?: boolean
  className?: string
}

function AnatomyStage({
  variant,
  selection,
  onSelect,
  regions,
  hovered,
  setHovered,
  vessels,
  onToggleVessels,
  zoom = false,
  onExpand,
  expanded = false,
  className = '',
}: StageProps) {
  const [imageFallback, setImageFallback] = useState(false)
  const assets = anatomyAssets(imageFallback ? null : variant)
  const hoveredRegion = hovered ? regions.find(region => region.id === hovered) ?? null : null
  const tip = hoveredRegion ? toStagePercent(hoveredRegion.label) : null
  const digestiveVisible = selection?.system === 'digestive' || hoveredRegion?.system === 'digestive'

  return (
    <div className={`dv-stage ${zoom ? 'dv-stage--zoom' : ''} ${className}`.trim()}>
      <div className="dv-stage-media" aria-hidden="true">
        {/* crossfade: iki görsel aynı anda tam opak olmaz → çift kontur yok */}
        <Image
          src={assets.body}
          alt=""
          fill
          priority={!zoom}
          sizes={zoom ? '(max-width: 640px) 100vw, 560px' : '(max-width: 1023px) 50vw, 420px'}
          className="dv-stage-img"
          data-active={!vessels}
          style={{ objectFit: 'contain' }}
          onError={() => setImageFallback(true)}
        />
        <Image
          src={assets.cardio}
          alt=""
          fill
          sizes={zoom ? '(max-width: 640px) 100vw, 560px' : '(max-width: 1023px) 50vw, 420px'}
          className="dv-stage-img dv-stage-img--cardio"
          data-active={vessels}
          style={{ objectFit: 'contain' }}
          onError={() => setImageFallback(true)}
        />
      </div>

      <div className="dv-digestive" data-active={digestiveVisible} aria-hidden="true">
        <Image src="/anatomy/digestive.webp" alt="" fill sizes="(max-width: 767px) 150px, 260px" style={{ objectFit: 'fill' }} />
      </div>
      <svg
        className="dv-stage-svg"
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x={0}
          y={0}
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          className="dv-stage-hit"
          onClick={() => onSelect(null)}
        />
        {regions.map(region => {
          const tone = SYSTEM_BY_ID[region.system].tone
          const activeRegion = selection?.region === region.id
          const activeSystem = selection?.system === region.system
          const shown = activeRegion || activeSystem || hovered === region.id
          const dimmed = Boolean(selection) && !activeSystem
          const fill = activeRegion ? tone.fillStrong : shown ? tone.fill : 'transparent'
          const stroke = shown ? tone.line : 'transparent'

          return (
            <g
              key={region.id}
              transform={region.transform}
              style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 200ms ease' }}
            >
              {region.paths.map((d, index) => (
                <path
                  key={`${region.id}-${index}`}
                  d={d}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={activeRegion ? 1.9 : 1.4}
                  vectorEffect="non-scaling-stroke"
                  className="dv-region"
                  onPointerEnter={event => {
                    if (event.pointerType === 'mouse') setHovered(region.id)
                  }}
                  onPointerLeave={event => {
                    if (event.pointerType === 'mouse') setHovered(null)
                  }}
                  onClick={event => {
                    event.stopPropagation()
                    if (activeRegion) {
                      onSelect(null)
                      return
                    }
                    onSelect({ system: region.system, region: region.id })
                  }}
                />
              ))}
            </g>
          )
        })}
      </svg>

      {tip && hoveredRegion && (
        <span className="dv-stage-tip" style={{ left: `${tip.left}%`, top: `${tip.top}%` }}>
          <b>{hoveredRegion.name}</b>
          <em>{SYSTEM_BY_ID[hoveredRegion.system].name}</em>
        </span>
      )}

      <div className="dv-stage-tools">
        <button
          type="button"
          className="dv-tool"
          aria-pressed={vessels}
          onClick={onToggleVessels}
          title={vessels ? 'Damar katmanını kapat' : 'Damar katmanını göster'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3.5s5.6 6.1 5.6 9.6a5.6 5.6 0 0 1-11.2 0C6.4 9.6 12 3.5 12 3.5Z" />
          </svg>
          <span>{vessels ? 'Damar açık' : 'Damarlar'}</span>
        </button>
        {onExpand && (
          <button type="button" className="dv-tool dv-tool--icon" onClick={onExpand} aria-expanded={expanded} aria-label="Anatomi görselini büyüt">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
            </svg>
          </button>
        )}
      </div>

    </div>
  )
}

export default function AnatomyHero({ variant, selection, onSelect }: AnatomyHeroProps) {
  const [hovered, setHovered] = useState<RegionId | null>(null)
  const [vessels, setVessels] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const regions = getRegions(variant)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  const toggleVessels = useCallback(() => setVessels(value => !value), [])

  /* seçim: dolaşım sistemi seçilirse damar katmanı açılır (effect'siz, olay içinde) */
  const handleSelect = useCallback(
    (next: AnatomySelection | null) => {
      if (next?.system === 'cardiovascular') setVessels(true)
      if (next) setExpanded(false)
      onSelect(next)
    },
    [onSelect],
  )

  const openDialog = useCallback(() => {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setExpanded(true)
  }, [])

  const closeDialog = useCallback(() => {
    setExpanded(false)
    requestAnimationFrame(() => restoreFocus.current?.focus())
  }, [])

  /* Escape: önce büyük görünüm, sonra sabitlenmiş seçim kapanır */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (expanded) {
        closeDialog()
        return
      }
      if (selection) onSelect(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selection, onSelect, closeDialog, expanded])

  /* büyük görünüm: gövde kaydırmasını kilitle, odağı taşı */
  useEffect(() => {
    if (!expanded) return
    const unlock = lockBodyScroll()
    const main = document.querySelector('main')
    const previousInert = main?.inert ?? false
    if (main) main.inert = true
    closeRef.current?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const dialog = closeRef.current?.closest('[role=dialog]')
      const controls = [...(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => {
      unlock()
      if (main) main.inert = previousInert
      requestAnimationFrame(() => restoreFocus.current?.focus())
      document.removeEventListener('keydown', trap)
    }
  }, [expanded])

  return (
    <div className="dv-anat">
      <div className="dv-anat-grid">
        <div className="dv-anat-rail">
          <p className="dv-rail-title">Sistemler</p>
          <div className="dv-sys-group" role="group" aria-label="Vücut sistemleri">
            {SYSTEMS.map(system => {
              const pressed = selection?.system === system.id
              return (
                <button
                  key={system.id}
                  type="button"
                  className="dv-sys"
                  aria-pressed={pressed}
                  onClick={() => handleSelect({ system: system.id, region: null })}
                  style={{ '--sys': system.tone.solid } as React.CSSProperties}
                >
                  <SystemIcon system={system.id} />
                  <span>{system.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <AnatomyStage
          variant={variant}
          selection={selection}
          onSelect={handleSelect}
          regions={regions}
          hovered={hovered}
          setHovered={setHovered}
          vessels={vessels}
          onToggleVessels={toggleVessels}
          onExpand={openDialog}
          expanded={expanded}
        />
      </div>

      <p className="dv-anat-hint">
        Bölgeye gel: önizleme · tıkla: sabitle · tekrar tıkla veya Esc: kapat
      </p>

      {expanded && createPortal(
        <div
          className="dv-dialog-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeDialog()
          }}
        >
          <div className="dv-dialog" role="dialog" aria-modal="true" aria-label="Anatomi — büyük görünüm">
            <div className="dv-dialog-head">
              <p className="dv-dialog-title">Anatomi</p>
              <button
                type="button"
                className="dv-dialog-close"
                ref={closeRef}
                onClick={closeDialog}
                aria-label="Büyük görünümü kapat"
              >
                ✕
              </button>
            </div>
            <AnatomyStage
              variant={variant}
              selection={selection}
              onSelect={handleSelect}
              regions={regions}
              hovered={hovered}
              setHovered={setHovered}
              vessels={vessels}
              onToggleVessels={toggleVessels}
              zoom
            />
            <p className="dv-anat-hint">Bölgeye dokun · tekrar dokun veya Esc: kapat</p>
          </div>
        </div>, document.body
      )}
    </div>
  )
}
