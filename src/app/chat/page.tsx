'use client'

import { useState, useEffect, useRef } from 'react'
import { listSupplements, askAssistant } from '@/lib/data'

interface Message { role: 'user' | 'assistant'; content: string; model?: string }

/** Model cevapları markdown karışımı döndürüyor; saf React text içinde ** görünmesin.
 *  Bağımlısız, minimal satır-içi biçimlendirme (kalın + madde işareti). */
function renderRich(text: string): React.ReactNode {
  const lines = text.split('\n')
  return lines.map((line, li) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, si) =>
      seg.startsWith('**') && seg.endsWith('**') && seg.length > 4
        ? <strong key={si} className="font-semibold text-white">{seg.slice(2, -2)}</strong>
        : <span key={si}>{seg.replace(/^#+\s*/, '')}</span>,
    )
    const isBullet = /^\s*[-•*]\s+/.test(line)
    return (
      <div key={li} className={isBullet ? 'pl-3 -ml-1' : ''}>
        {isBullet && <span>• </span>}
        {parts}
      </div>
    )
  })
}

const QUICK_QUESTIONS = [
  'Bu iki takviye birlikte alınır mı?',
  'Hangi saatte almalıyım?',
  'Yan etkileri neler?',
  'Dozaj önerisi verir misin?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [supplements, setSupplements] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listSupplements()
      .then(rows => setSupplements(rows.map(s => s.name)))
      .catch(() => setSupplements([]))
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const msgText = text || input
    if (!msgText.trim()) return
    const userMsg: Message = { role: 'user', content: msgText }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await askAssistant([...messages, userMsg], supplements)
      setMessages(prev => [...prev, { role: 'assistant', content: reply.content, model: reply.model }])
    } catch (err) {
      const text = err instanceof Error ? err.message : 'bilinmeyen hata'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ AI yanıtı alınamadı: ${text}` }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold text-[#64FFDA]">🤖 AI Asistan</h2>
        {supplements.length > 0 && (
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {supplements.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-[#64FFDA]/10 text-[#64FFDA]/70 border border-[#64FFDA]/20">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#64FFDA]/5 border border-[#64FFDA]/10 flex items-center justify-center text-3xl animate-[breathe_3s_ease-in-out_infinite]">
              🧬
            </div>
            <p className="text-[#a09880]/40 mb-4">Takviyelerin hakkında soru sor</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-xs px-3 py-2 rounded-full bg-white/5 text-[#a09880] hover:text-[#64FFDA] hover:bg-white/10 border border-white/5 transition-all">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-gradient-to-br from-[#64FFDA]/20 to-[#64FFDA]/5 text-[#e0d8c8] rounded-br-md border border-[#64FFDA]/10'
                : 'glass-card text-[#e0d8c8] rounded-bl-md'
            }`}>
              {renderRich(m.content)}
              {m.role === 'assistant' && m.model && (
                <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-white/25 font-mono">
                  {m.model.split('/').pop()}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="glass-card px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#64FFDA]/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#64FFDA]/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#64FFDA]/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 bg-[#000000]/95 backdrop-blur-xl">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Takviyelerin hakkında sor..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[#e0d8c8] text-sm
                       placeholder:text-[#a09880]/40 focus:outline-none focus:border-[#64FFDA]/40 transition-all" />
          <button onClick={() => send()} disabled={loading}
            className="px-5 py-3 bg-[#64FFDA] text-[#000000] rounded-2xl font-semibold text-sm 
                       disabled:opacity-30 hover:bg-[#4fd1b8] transition-all flex-shrink-0">
            ➤
          </button>
        </div>
        <p className="text-[#a09880]/20 text-[9px] mt-1.5 text-center">⚠️ AI önerileri doktor tavsiyesi değildir</p>
      </div>
    </div>
  )
}
