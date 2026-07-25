'use client'

import { useState } from 'react'
import Link from 'next/link'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const MOCK_SUPPLEMENTS = [
  { name: 'Magnezyum Bisglisinat', dosage: '400mg', time: 'Sabah', timeOfDay: 'Sabah' },
  { name: 'Omega-3 (EPA/DHA)', dosage: '1000mg', time: '08:00', timeOfDay: 'Sabah' },
  { name: 'D3 + K2', dosage: '5000IU / 100mcg', time: '13:00', timeOfDay: 'Öğle' },
  { name: 'Çinko Pikolinat', dosage: '30mg', time: '19:00', timeOfDay: 'Akşam' },
  { name: 'Magnezyum (2. doz)', dosage: '200mg', time: '22:00', timeOfDay: 'Gece' },
]

const organTips: Record<string, string> = {
  heart: 'Kalp sağlığı için CoQ10, Omega-3 ve Magnezyum önerilir. Düzenli kardiyo egzersizi ile destekleyin.',
  brain: 'Beyin fonksiyonları için Lion\'s Mane, Omega-3 DHA ve B12 önemlidir. Meditasyon ve kaliteli uyku destekler.',
  spine: 'Omurga ve kemik sağlığı için D3 + K2, Kalsiyum ve Magnezyum kombinasyonu etkilidir.',
  liver: 'Karaciğer detoksu için Milk Thistle, NAC ve Selenyum önerilir. Bol su tüketin.',
  gut: 'Bağırsak mikrobiyomu için Probiyotik, Prebiyotik lif ve L-Glutamin. Fermente gıdalar tüketin.',
  lungs: 'Akciğer sağlığı için NAC, C vitamini ve Quercetin. Nefes egzersizleri yapın.',
}

export default function DashboardPage() {
  const [activeOrgan, setActiveOrgan] = useState<string | null>(null)
  const [organInfo, setOrganInfo] = useState('')

  const today = DEMO_MODE ? MOCK_SUPPLEMENTS : []
  const count = DEMO_MODE ? 5 : 0

  const handleOrganClick = (organ: string) => {
    setActiveOrgan(organ === activeOrgan ? null : organ)
    setOrganInfo(organTips[organ] || '')
  }

  const isActive = (organ: string) => activeOrgan === organ

  return (
    <div className="p-4 pb-24 min-h-screen">
      {DEMO_MODE && (
        <div className="text-center mb-4">
          <p className="text-yellow-500/50 text-[10px]">⚠️ Demo veriler — Supabase bağlantısı yok</p>
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
              <p className="text-2xl font-bold text-[#64FFDA]">{count}</p>
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

      {/* Interactive Body */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-[#64FFDA] mb-1">🧬 İnteraktif Anatomi</h3>
        <p className="text-[#a09880]/60 text-xs mb-4">Bir bölgeye dokun, AI önerisi al</p>
        
        <div className="relative mx-auto w-full max-w-[280px] aspect-[3/5] mb-3">
          <svg viewBox="0 0 200 340" className="w-full h-full">
            <ellipse cx="100" cy="35" rx="28" ry="32" fill="rgba(100,255,218,0.05)" stroke="rgba(100,255,218,0.15)" strokeWidth="1"/>
            <rect x="88" y="65" width="24" height="10" rx="3" fill="rgba(100,255,218,0.03)"/>
            <rect x="55" y="73" width="90" height="120" rx="25" fill="rgba(100,255,218,0.04)" stroke="rgba(100,255,218,0.1)" strokeWidth="1"/>
            <rect x="20" y="75" width="36" height="110" rx="18" fill="rgba(100,255,218,0.02)"/>
            <rect x="144" y="75" width="36" height="110" rx="18" fill="rgba(100,255,218,0.02)"/>
            <rect x="62" y="192" width="34" height="120" rx="17" fill="rgba(100,255,218,0.02)"/>
            <rect x="104" y="192" width="34" height="120" rx="17" fill="rgba(100,255,218,0.02)"/>

            <g onClick={() => handleOrganClick('brain')} className="cursor-pointer">
              <ellipse cx="100" cy="30" rx="22" ry="18" fill={isActive('brain') ? 'rgba(100,255,218,0.2)' : 'transparent'} stroke={isActive('brain') ? '#64FFDA' : 'rgba(100,255,218,0.2)'} strokeWidth="1.5" strokeDasharray={isActive('brain') ? '0' : '4'}/>
            </g>
            <g onClick={() => handleOrganClick('heart')} className="cursor-pointer">
              <ellipse cx="92" cy="105" rx="20" ry="18" fill={isActive('heart') ? 'rgba(255,100,100,0.2)' : 'transparent'} stroke={isActive('heart') ? '#ff6464' : 'rgba(255,100,100,0.15)'} strokeWidth="1.5" strokeDasharray={isActive('heart') ? '0' : '4'}/>
            </g>
            <g onClick={() => handleOrganClick('liver')} className="cursor-pointer">
              <ellipse cx="70" cy="130" rx="16" ry="12" fill={isActive('liver') ? 'rgba(255,200,100,0.2)' : 'transparent'} stroke={isActive('liver') ? '#ffc864' : 'rgba(255,200,100,0.15)'} strokeWidth="1.5" strokeDasharray={isActive('liver') ? '0' : '4'}/>
            </g>
            <g onClick={() => handleOrganClick('gut')} className="cursor-pointer">
              <ellipse cx="100" cy="155" rx="22" ry="15" fill={isActive('gut') ? 'rgba(100,200,255,0.2)' : 'transparent'} stroke={isActive('gut') ? '#64c8ff' : 'rgba(100,200,255,0.15)'} strokeWidth="1.5" strokeDasharray={isActive('gut') ? '0' : '4'}/>
            </g>
            <g onClick={() => handleOrganClick('spine')} className="cursor-pointer">
              <rect x="97" y="80" width="6" height="100" rx="3" fill={isActive('spine') ? 'rgba(200,200,255,0.3)' : 'transparent'} stroke={isActive('spine') ? '#c8c8ff' : 'rgba(200,200,255,0.2)'} strokeWidth="1.5" strokeDasharray={isActive('spine') ? '0' : '3'}/>
            </g>
            <g onClick={() => handleOrganClick('lungs')} className="cursor-pointer">
              <ellipse cx="82" cy="108" rx="15" ry="20" fill={isActive('lungs') ? 'rgba(150,255,200,0.2)' : 'transparent'} stroke={isActive('lungs') ? '#96ffc8' : 'rgba(150,255,200,0.15)'} strokeWidth="1.5" strokeDasharray={isActive('lungs') ? '0' : '4'}/>
              <ellipse cx="118" cy="108" rx="15" ry="20" fill={isActive('lungs') ? 'rgba(150,255,200,0.2)' : 'transparent'} stroke={isActive('lungs') ? '#96ffc8' : 'rgba(150,255,200,0.15)'} strokeWidth="1.5" strokeDasharray={isActive('lungs') ? '0' : '4'}/>
            </g>
          </svg>
        </div>

        {activeOrgan && (
          <div className="bg-white/5 rounded-xl p-3 border border-[#64FFDA]/10">
            <p className="text-[#64FFDA] text-xs font-semibold mb-1">
              {activeOrgan === 'heart' && '❤️ Kalp'}
              {activeOrgan === 'brain' && '🧠 Beyin'}
              {activeOrgan === 'spine' && '🦴 Omurga'}
              {activeOrgan === 'liver' && '🫁 Karaciğer'}
              {activeOrgan === 'gut' && '🔬 Bağırsak'}
              {activeOrgan === 'lungs' && '🫧 Akciğer'}
            </p>
            <p className="text-[#e0d8c8] text-xs leading-relaxed">{organInfo}</p>
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
          <div>
            <p className="text-[#e0d8c8] text-sm font-medium">AI Asistan</p>
            <p className="text-[#a09880]/60 text-[11px]">Soru sor</p>
          </div>
        </Link>
        <Link href="/supplements" className="glass-card p-4 flex items-center gap-3 hover:border-[#64FFDA]/30 transition-all group">
          <span className="text-2xl group-hover:scale-110 transition-transform">➕</span>
          <div>
            <p className="text-[#e0d8c8] text-sm font-medium">Takviye Ekle</p>
            <p className="text-[#a09880]/60 text-[11px]">Envanteri yönet</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
