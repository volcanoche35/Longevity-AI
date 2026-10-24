'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AnatomyHero from '@/components/anatomy-hero'
import { listSupplements } from '@/lib/data'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const TIME_TONE: Record<string, string> = {
  Sabah: '#FFB020',
  Öğle: '#22E1FF',
  Akşam: '#FF4D5E',
  Gece: '#FF3DA6',
}

export default function DashboardPage() {
  const [rows, setRows] = useState<{ name: string; dosage: string; time_of_day: string }[]>([])

  useEffect(() => {
    listSupplements()
      .then(s => setRows(s.map(x => ({ name: x.name, dosage: x.dosage, time_of_day: x.time_of_day }))))
      .catch(() => setRows([]))
  }, [])

  const gradeA = rows.filter(r => /D3|Kreatin|B12/i.test(r.name)).length

  return (
    <div className="p-4 pb-28 min-h-screen">
      {DEMO_MODE && (
        <div className="text-center mb-3">
          <span className="chip chip-b">⚠ DEMO · lokal veri</span>
        </div>
      )}

      {/* ── Katmanlı interaktif anatomi ── */}
      <AnatomyHero />

      {/* ── Sayılar ── */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { k: 'Envanter', v: String(rows.length), c: 'var(--vital)' },
          { k: 'Bugün', v: String(rows.length), c: 'var(--electric)' },
          { k: 'Kanıt A', v: String(gradeA), c: 'var(--primary)' },
        ].map(s => (
          <div key={s.k} className="glass-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">{s.k}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: s.c }}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* ── Bugün alınacaklar ── */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">Bugün Alınacaklar</h3>
          <Link href="/supplements" className="text-xs text-[var(--text-3)] hover:text-white transition-colors">Tümü →</Link>
        </div>
        {rows.length === 0 && <p className="text-sm text-[var(--text-3)]">Henüz takviye eklenmemiş.</p>}
        {rows.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
            <div
              className="w-9 h-9 rounded-xl grid place-items-center text-[10px] font-bold shrink-0"
              style={{
                background: `${TIME_TONE[s.time_of_day] ?? '#6B7893'}22`,
                color: TIME_TONE[s.time_of_day] ?? '#AEB9CC',
              }}
            >
              {s.time_of_day || '—'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{s.name}</p>
              <p className="text-[11px] text-[var(--text-3)]">{s.dosage}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Hızlı işlemler ── */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/chat" className="glass-card p-4">
          <p className="text-sm font-semibold text-white">AI'a sor</p>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">Etkileşim · doz · kanıt</p>
        </Link>
        <Link href="/supplements" className="glass-card p-4">
          <p className="text-sm font-semibold text-white">Envanter</p>
          <p className="text-[11px] text-[var(--text-3)] mt-0.5">Takviye ekle / çıkar</p>
        </Link>
      </div>

      <p className="mt-6 text-[10px] leading-relaxed text-[var(--text-3)] text-center">
        BioTrack bilgi amaçlıdır; teşhis, tedavi veya sağlık beyanı içermez.
        Doz ve kullanım için hekiminize danışın.
      </p>
    </div>
  )
}
