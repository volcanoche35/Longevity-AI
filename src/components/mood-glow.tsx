import './mobile-app.css'

/** Sade mood aurası: yalnızca renk/yoğunluk değişen yumuşak radyal glow. value yoksa nötr. */
export function MoodGlow({ value, className = '' }: { value?: 1 | 2 | 3 | 4 | 5 | number | null; className?: string }) {
  const v = value && value >= 1 && value <= 5 ? Math.round(value) : undefined
  return (
    <div className={`mood-glow ${className}`.trim()} data-mood={v} aria-hidden="true">
      <div className="mg-aura" />
    </div>
  )
}

export default MoodGlow
