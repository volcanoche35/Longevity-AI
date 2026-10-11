'use client'

import { useState } from 'react'
import Link from 'next/link'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface Organ {
  id: string
  name: string
  icon: string
  cx: number; cy: number; rx: number; ry: number
  color: string
  tip: string
  supplements: string[]
}

const ORGANS: Organ[] = [
  { id: 'brain', name: 'Beyin', icon: '🧠', cx: 100, cy: 32, rx: 26, ry: 24, color: '#64FFDA', tip: 'Lion\'s Mane, Omega-3 DHA, B12, Fosfatidilserin', supplements: ['Omega-3 (EPA/DHA)'] },
  { id: 'eyes', name: 'Gözler', icon: '👁', cx: 82, cy: 38, rx: 8, ry: 6, color: '#FFD700', tip: 'Lutein, Zeaksantin, A Vitamini', supplements: [] },
  { id: 'thyroid', name: 'Tiroit', icon: '🦋', cx: 100, cy: 72, rx: 16, ry: 8, color: '#FFB74D', tip: 'İyot, Selenyum, Çinko', supplements: ['Çinko Pikolinat'] },
  { id: 'lungs', name: 'Akciğerler', icon: '🫁', cx: 82, cy: 105, rx: 16, ry: 22, color: '#81C784', tip: 'NAC, C Vitamini, Quercetin', supplements: [] },
  { id: 'lungs_r', name: 'Akciğerler', icon: '🫁', cx: 118, cy: 105, rx: 16, ry: 22, color: '#81C784', tip: 'NAC, C Vitamini, Quercetin', supplements: [] },
  { id: 'heart', name: 'Kalp', icon: '❤️', cx: 93, cy: 108, rx: 18, ry: 16, color: '#EF5350', tip: 'CoQ10, Omega-3, Magnezyum, Potasyum', supplements: ['Omega-3 (EPA/DHA)', 'Magnezyum Bisglisinat', 'Magnezyum (2. doz)'] },
  { id: 'liver', name: 'Karaciğer', icon: '🫁', cx: 66, cy: 130, rx: 20, ry: 14, color: '#FF8A65', tip: 'Milk Thistle, NAC, Selenyum, Kolin', supplements: [] },
  { id: 'stomach', name: 'Mide', icon: '🫗', cx: 88, cy: 140, rx: 14, ry: 10, color: '#FFCC80', tip: 'Probiyotik, Sindirim Enzimleri, Zencefil', supplements: [] },
  { id: 'pancreas', name: 'Pankreas', icon: '🫘', cx: 72, cy: 148, rx: 22, ry: 7, color: '#FFF176', tip: 'Krom, Alfa Lipoik Asit, Berberin', supplements: [] },
  { id: 'kidneys', name: 'Böbrekler', icon: '🫘', cx: 72, cy: 165, rx: 12, ry: 10, color: '#CE93D8', tip: 'Magnezyum, Potasyum, B6', supplements: ['Magnezyum Bisglisinat', 'Magnezyum (2. doz)'] },
  { id: 'kidneys_r', name: 'Böbrekler', icon: '🫘', cx: 128, cy: 165, rx: 12, ry: 10, color: '#CE93D8', tip: 'Magnezyum, Potasyum, B6', supplements: ['Magnezyum Bisglisinat', 'Magnezyum (2. doz)'] },
  { id: 'intestine', name: 'Bağırsak', icon: '🔬', cx: 100, cy: 178, rx: 26, ry: 18, color: '#64B5F6', tip: 'Probiyotik, Prebiyotik, L-Glutamin, Lif', supplements: [] },
  { id: 'spine', name: 'Omurga', icon: '🦴', cx: 100, cy: 110, rx: 5, ry: 60, color: '#B0BEC5', tip: 'D3 + K2, Kalsiyum, Magnezyum', supplements: ['D3 + K2', 'Magnezyum Bisglisinat'] },
  { id: 'joints_l', name: 'Eklemler', icon: '🦵', cx: 55, cy: 190, rx: 14, ry: 8, color: '#FFCC80', tip: 'Glukozamin, Kondroitin, MSM, Kolajen', supplements: [] },
  { id: 'joints_r', name: 'Eklemler', icon: '🦵', cx: 145, cy: 190, rx: 14, ry: 8, color: '#FFCC80', tip: 'Glukozamin, Kondroitin, MSM, Kolajen', supplements: [] },
  { id: 'skin', name: 'Cilt', icon: '✨', cx: 100, cy: 20, rx: 30, ry: 8, color: '#F48FB1', tip: 'Kolajen, C Vitamini, Hyaluronik Asit, Biotin', supplements: [] },
]

export default function DashboardPage() {
  const [activeOrgan, setActiveOrgan] = useState<string | null>(null)
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null)

  const active = ORGANS.find(o => o.id === activeOrgan)

  const today = DEMO_MODE ? [
    { name: 'Omega-3 (EPA/DHA)', dosage: '1000mg', time: '08:00' },
    { name: 'D3 + K2', dosage: '5000IU / 100mcg', time: '13:00' },
    { name: 'Çinko Pikolinat', dosage: '30mg', time: '19:00' },
    { name: 'Magnezyum Bisglisinat', dosage: '400mg', time: '08:00' },
    { name: 'Magnezyum (2. doz)', dosage: '200mg', time: '22:00' },
  ] : []

  const allSupplements = ['Omega-3', 'D3 + K2', 'Çinko', 'Magnezyum']

  return (
    <div className="p-4 pb-24 min-h-screen">
      {DEMO_MODE && (
        <div className="text-center mb-3">
          <span className="text-yellow-500/40 text-[10px] bg-yellow-500/5 px-3 py-1 rounded-full">⚠️ DEMO</span>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1a1a] via-[#0a0f0f] to-[#000000] border border-[#64FFDA]/10 p-6 mb-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#64FFDA]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#64FFDA]/3 rounded-full blur-2xl" />
        <div className="relative">
          <p className="text-[#64FFDA]/70 text-xs font-mono tracking-widest mb-2">LONGEVITY AI</p>
          <h1 className="text-3xl font-bold text-[#e0d8c8] mb-1">BioTrack</h1>
          <p className="text-[#a09880] text-sm">Sağlık yolculuğunun kontrolü sende</p>
          
          <div className="flex gap-4 mt-5">
            <div className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/5">
              <p className="text-[#a09880] text-[10px] uppercase tracking-wider">Takviye</p>
              <p className="text-2xl font-bold text-[#64FFDA]">{allSupplements.length}</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/5">
              <p className="text-[#a09880] text-[10px] uppercase tracking-wider">Bugün</p>
              <p className="text-2xl font-bold text-[#64FFDA]">{today.length}</p>
            </div>
            <div className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/5">
              <p className="text-[#a09880] text-[10px] uppercase tracking-wider">Streak</p>
              <p className="text-2xl font-bold text-[#FFD700]">🔥 7</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Anatomy */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-[#64FFDA]">🧬 İnteraktif Anatomi</h3>
          {active && <span className="text-[#a09880]/60 text-[10px]">{active.icon} {active.name} seçili</span>}
        </div>
        <p className="text-[#a09880]/60 text-xs mb-4">Organlara dokun, takviye önerilerini gör</p>
        
        <div className="relative mx-auto w-full max-w-[320px] aspect-[3/5.5]">
          <svg viewBox="0 0 200 370" className="w-full h-full">
            <defs>
              <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>

            {/* Body silhouette */}
            <ellipse cx="100" cy="35" rx="32" ry="36" fill="rgba(100,255,218,0.03)" stroke="rgba(100,255,218,0.08)" strokeWidth="1"/>
            <rect x="80" y="68" width="40" height="12" rx="4" fill="rgba(100,255,218,0.02)"/>
            <rect x="48" y="78" width="104" height="140" rx="28" fill="rgba(100,255,218,0.025)" stroke="rgba(100,255,218,0.06)" strokeWidth="1"/>
            
            {/* Arms */}
            <path d="M48 90 Q10 130 10 200" stroke="rgba(100,255,218,0.04)" strokeWidth="18" fill="none" strokeLinecap="round"/>
            <path d="M152 90 Q190 130 190 200" stroke="rgba(100,255,218,0.04)" strokeWidth="18" fill="none" strokeLinecap="round"/>
            
            {/* Legs */}
            <path d="M70 218 Q60 300 55 350" stroke="rgba(100,255,218,0.04)" strokeWidth="20" fill="none" strokeLinecap="round"/>
            <path d="M130 218 Q140 300 145 350" stroke="rgba(100,255,218,0.04)" strokeWidth="20" fill="none" strokeLinecap="round"/>

            {/* Organ hotspots */}
            {ORGANS.map((organ) => {
              const isActive = activeOrgan === organ.id
              const isHovered = hoveredOrgan === organ.id
              const hasSupp = organ.supplements.length > 0
              const strokeColor = isActive ? organ.color : (isHovered ? `${organ.color}90` : `${organ.color}30`)
              const fillColor = isActive ? `${organ.color}20` : (isHovered ? `${organ.color}10` : 'transparent')
              
              return (
                <g key={organ.id}
                  onMouseEnter={() => setHoveredOrgan(organ.id)}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => setActiveOrgan(activeOrgan === organ.id ? null : organ.id)}
                  className="cursor-pointer transition-all duration-200">
                  
                  {/* Hit area (larger than visual) */}
                  <ellipse cx={organ.cx} cy={organ.cy} rx={organ.rx + 6} ry={organ.ry + 6} fill="transparent"/>
                  
                  {/* Organ shape */}
                  <ellipse cx={organ.cx} cy={organ.cy} rx={organ.rx} ry={organ.ry}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isActive ? 2 : 1.2}
                    strokeDasharray={isActive ? '0' : '3 2'}
                    filter={isActive ? 'url(#glow)' : undefined}
                  />

                  {/* Supplement dots */}
                  {hasSupp && (
                    <circle cx={organ.cx} cy={organ.cy - organ.ry - 4} r="3"
                      fill={isActive ? organ.color : `${organ.color}60`}
                      className={isActive ? 'animate-pulse' : ''}/>
                  )}

                  {/* Tooltip on hover */}
                  {(isHovered || isActive) && (
                    <g>
                      <rect x={organ.cx - organ.rx - 10} y={organ.cy - organ.ry - 30}
                        width={organ.rx * 2 + 20} height="20" rx="6"
                        fill="rgba(0,0,0,0.9)" stroke={organ.color} strokeWidth="0.5"/>
                      <text x={organ.cx} y={organ.cy - organ.ry - 16}
                        textAnchor="middle" fill={organ.color} fontSize="9" fontWeight="600">
                        {organ.icon} {organ.name}
                      </text>
                    </g>
                  )}

                  {/* Supplement labels */}
                  {isActive && organ.supplements.map((sup, i) => (
                    <g key={sup}>
                      <rect x={organ.cx + organ.rx + 6} y={organ.cy - 6 + i * 15}
                        width={sup.length * 6.5 + 12} height="12" rx="6"
                        fill={`${organ.color}18`} stroke={`${organ.color}30`} strokeWidth="0.5"/>
                      <text x={organ.cx + organ.rx + 12} y={organ.cy + 3 + i * 15}
                        fill={organ.color} fontSize="7" fontWeight="500">💊 {sup}</text>
                    </g>
                  ))}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {ORGANS.filter((o, i, arr) => arr.findIndex(x => x.name === o.name) === i).slice(0, 8).map(o => (
            <span key={o.id}
              className={`text-[9px] px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                activeOrgan === o.id ? 'bg-white/10 text-white' : 'bg-white/5 text-[#a09880]/50 hover:text-[#a09880]'
              }`}
              onClick={() => setActiveOrgan(activeOrgan === o.id ? null : o.id)}>
              {o.icon} {o.name}
            </span>
          ))}
        </div>

        {/* Active organ info */}
        {active && (
          <div className="mt-3 bg-white/5 rounded-xl p-3 border border-white/5 animate-slide-up">
            <p className="text-sm font-semibold mb-1" style={{ color: active.color }}>
              {active.icon} {active.name}
            </p>
            <p className="text-[#e0d8c8] text-xs leading-relaxed mb-2">{active.tip}</p>
            {active.supplements.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                <span className="text-[#a09880] text-[9px]">Mevcut takviyelerin:</span>
                {active.supplements.map(s => (
                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#64FFDA]/10 text-[#64FFDA]/80">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-[#a09880]/40 text-[9px]">Bu organ için henüz takviye yok</p>
            )}
          </div>
        )}
      </div>

      {/* Today */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#64FFDA]">⏰ Bugün Alınacaklar</h3>
          <Link href="/supplements" className="text-[#64FFDA]/50 text-xs hover:text-[#64FFDA] transition-colors">Tümü →</Link>
        </div>
        {today.map((s, i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
            <div className="w-8 h-8 rounded-full bg-[#64FFDA]/10 flex items-center justify-center text-sm flex-shrink-0">
              {s.time?.split(':')[0]}h
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#e0d8c8] text-sm font-medium truncate">{s.name}</p>
              <p className="text-[#a09880] text-[11px]">{s.dosage}</p>
            </div>
            <span className="text-[#64FFDA]/40 text-xs flex-shrink-0">{s.time}</span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <Link href="/chat" className="glass-card p-4 flex items-center gap-3 hover:border-[#64FFDA]/30 transition-all group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🤖</span>
          <div><p className="text-[#e0d8c8] text-sm font-medium">AI Asistan</p><p className="text-[#a09880]/60 text-[11px]">Soru sor</p></div>
        </Link>
        <Link href="/supplements" className="glass-card p-4 flex items-center gap-3 hover:border-[#64FFDA]/30 transition-all group">
          <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
          <div><p className="text-[#e0d8c8] text-sm font-medium">Takviye Ekle</p><p className="text-[#a09880]/60 text-[11px]">Envanteri yönet</p></div>
        </Link>
      </div>
    </div>
  )
}
