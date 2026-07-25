export async function getAIResponse(
  messages: { role: 'user' | 'assistant'; content: string }[],
  userSupplements: string[]
) {
  const supplementContext = userSupplements.length > 0
    ? `\nKullanıcının takviyeleri: ${userSupplements.join(', ')}. Bu takviyeler arasındaki olası etkileşimlere dikkat et.`
    : ''

  const systemPrompt = `Sen bir eczacı asistanısın. Kullanıcının takviyelerini analiz et, olası etkileşim risklerini belirt, dozaj önerileri yap. 
⚠️ Verdiğin hiçbir bilgi doktor tavsiyesi yerine geçmez. Ciddi durumlarda mutlaka doktora danışmasını söyle.
${supplementContext}`

  const res = await fetch('https://api.openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-v4-flash',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) throw new Error('AI yanıtı alınamadı')
  const data = await res.json()
  return data.choices[0].message.content
}
