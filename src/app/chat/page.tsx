'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getAIResponse } from '@/lib/deepseek'

interface Message { role: 'user' | 'assistant'; content: string }

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [supplements, setSupplements] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('supplements').select('name').then(({ data }) => {
      if (data) setSupplements(data.map(s => s.name))
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const userMsg: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await getAIResponse([...messages, userMsg], supplements)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI yanıtı alınamadı. Lütfen tekrar dene.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <h2 className="text-xl font-bold text-[#64FFDA] p-4 pb-2">🤖 AI Asistan</h2>
      {supplements.length > 0 && (
        <p className="px-4 text-[#a09880]/60 text-xs mb-2">
          Takip edilen: {supplements.join(', ')}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-[#a09880]/40">
            <p className="text-4xl mb-4">💬</p>
            <p>Takviyelerin hakkında soru sorabilirsin</p>
            <p className="text-xs mt-2">Örn: "Bu iki takviye birlikte alınır mı?"</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
              m.role === 'user'
                ? 'bg-[#64FFDA]/20 text-[#e0d8c8] rounded-br-md'
                : 'glass-card text-[#e0d8c8] rounded-bl-md'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-[#64FFDA]/60 text-sm animate-pulse">Yazıyor...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Takviyelerin hakkında sor..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[#e0d8c8] text-sm
                       placeholder:text-[#a09880]/50 focus:outline-none focus:border-[#64FFDA]/50" />
          <button onClick={send} disabled={loading}
            className="px-5 py-3 bg-[#64FFDA] text-[#000000] rounded-xl font-semibold text-sm disabled:opacity-50">
            Gönder
          </button>
        </div>
        <p className="text-[#a09880]/30 text-[10px] mt-2 text-center">⚠️ AI önerileri doktor tavsiyesi değildir</p>
      </div>
    </div>
  )
}
