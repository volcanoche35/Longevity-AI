'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ThemeSelect from './theme-select'
import { EMPTY_PROFILE, clearProfile, loadProfile, onProfileChange, profileStorageInfo, saveProfile, type LocalProfile } from '@/lib/profile'
import { askAssistant, clearLocalDemoData, listSupplements } from '@/lib/data'
import { removeRaw } from '@/lib/local-store'
import { DAY_MARKS_KEY } from '@/lib/daymarks'
import { clearWellness } from '@/lib/wellness'
import { REMINDERS_KEY } from '@/lib/reminders'

export default function ProfileEditor({ welcome = false }: { welcome?: boolean }) {
  const router = useRouter()
  const [draft, setDraft] = useState<LocalProfile>(loadProfile)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  useEffect(() => onProfileChange(() => setDraft(loadProfile())), [])
  const update = <K extends keyof LocalProfile>(key: K, value: LocalProfile[K]) => { setDraft(prev => ({ ...prev, [key]: value })); setStatus(''); setError(''); setAnalysis('') }
  const persist = () => {
    if (!draft.age.trim() || !draft.heightCm.trim() || !draft.weightKg.trim()) throw new Error('Yaş, boy ve kilo alanlarını doldur. Cinsiyet için belirtmemeyi de seçebilirsin.')
    saveProfile({ ...draft, onboardingComplete: true })
  }
  const save = (event: React.FormEvent) => {
    event.preventDefault(); setStatus(''); setError('')
    try {
      persist(); setStatus('Profil bu tarayıcıda hatırlanacak.')
      if (welcome) router.replace('/dashboard')
    } catch (e) { setError(e instanceof Error ? e.message : 'Profil kaydedilemedi.') }
  }
  const analyze = async () => {
    setError(''); setAnalysis('')
    if (!draft.aiProfileConsent) { setError('Analiz için aşağıdaki profil paylaşım iznini aç.'); return }
    try {
      persist(); setAnalyzing(true)
      const rows = await listSupplements()
      const reply = await askAssistant([{ role: 'user', content: 'Paylaştığım yaş, boy, kilo, cinsiyet, hedef ve sağlık bilgilerimi dikkate alarak kısa bir genel değerlendirme yap. Profilime göre nelere dikkat etmeliyim? Eksik bilgi varsa açıkça söyle, ilaç/hastalık/alerji bilgisi boşsa yok varsayma. Demografiden teşhis, vitamin eksikliği veya kesin takviye dozu çıkarma.' }], rows.map(row => row.name))
      setAnalysis(reply.content)
    } catch (e) { setError(e instanceof Error ? e.message : 'AI değerlendirmesi alınamadı.') }
    finally { setAnalyzing(false) }
  }
  const clear = () => {
    if (!window.confirm('Bu tarayıcıdaki profil, takviye kayıtları ve günlük işaretler silinsin mi?')) return
    try {
      removeRaw(DAY_MARKS_KEY)
      const journal = clearWellness()
      if (!journal.ok) throw new Error(journal.error)
      removeRaw(REMINDERS_KEY)
      if (!clearLocalDemoData()) throw new Error('Takviye kayıtları silinemedi.')
      clearProfile(); setDraft({ ...EMPTY_PROFILE }); setAnalysis(''); setStatus('Bu tarayıcıdaki veriler silindi.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Veriler silinemedi.') }
  }
  const sexLabel = draft.sex === 'female' ? 'Kadın' : draft.sex === 'male' ? 'Erkek' : 'Belirtmek istemiyorum'
  const storage = profileStorageInfo()
  return <div className="p-4 pb-28 min-h-screen max-w-lg mx-auto">
    <header className="mb-5 pt-2">
      <p className="text-[10px] font-mono tracking-[.2em] text-[var(--primary)]">BİYOTRACK · {welcome ? 'HOŞ GELDİN' : 'PROFİLİM'}</p>
      <h1 className="text-2xl font-bold text-white mt-2">{welcome ? 'Sana göre bir başlangıç.' : 'Sağlık profilin'}</h1>
      <p className="text-sm text-[var(--text-2)] mt-2 leading-relaxed">{welcome ? 'Profilini bir kez doldur; sonraki açılışlarda kaldığın yerden devam et. Anatomi ve izin verdiğin AI değerlendirmesi bu bilgilerle kişiselleşir.' : 'Bilgilerini güncelle, paylaşımı yönet ve istersen AI ile değerlendir.'}</p>
      <span className="chip chip-b mt-3">Test sürümü · bu tarayıcıda hatırlanır</span>
    </header>
    <form onSubmit={save} className="space-y-4">
      <section className="dose-section space-y-4">
        <h2 className="font-semibold">Temel bilgiler</h2>
        <label className="block"><span className="field-label">Ad (isteğe bağlı)</span><input className="dose-input" aria-label="Ad" placeholder="Sana nasıl seslenelim?" value={draft.displayName} onChange={e => update('displayName', e.target.value)} maxLength={60} autoComplete="nickname" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label><span className="field-label">Yaş</span><input className="dose-input" aria-label="Yaş" inputMode="numeric" placeholder="Örn. 35" value={draft.age} onChange={e => update('age', e.target.value)} required /></label>
          <ThemeSelect label="Cinsiyet" value={sexLabel} options={['Kadın','Erkek','Belirtmek istemiyorum']} onChange={v => update('sex',v === 'Kadın' ? 'female' : v === 'Erkek' ? 'male' : null)} />
          <label><span className="field-label">Boy (cm)</span><input className="dose-input" aria-label="Boy" inputMode="decimal" placeholder="Örn. 175" value={draft.heightCm} onChange={e => update('heightCm', e.target.value)} required /></label>
          <label><span className="field-label">Kilo (kg)</span><input className="dose-input" aria-label="Kilo" inputMode="decimal" placeholder="Örn. 70" value={draft.weightKg} onChange={e => update('weightKg', e.target.value)} required /></label>
        </div>
        <p className="text-xs text-[var(--text-2)]">Anatomi cinsiyet alanına göre açılır; ayrıca beden seçmen gerekmez. Belirtmezsen genel örnek model gösterilir.</p>
        <label className="block"><span className="field-label">Takip hedefin (isteğe bağlı)</span><input className="dose-input" aria-label="Takip hedefi" placeholder="Örn. uyku düzeni, spor, genel sağlık takibi" value={draft.goal} onChange={e => update('goal', e.target.value)} maxLength={160} /></label>
      </section>
      <details className="dose-section">
        <summary className="cursor-pointer font-medium text-sm py-1">Güvenli değerlendirme için ek bilgiler <span className="text-[var(--text-2)] text-xs">(isteğe bağlı)</span></summary>
        <p className="text-xs text-[var(--text-2)] mt-3 mb-3">Boş bırakılan alanlar “yok” sayılmaz. AI, güvenlik için bunları ayrıca sorabilir. Tanı veya tahlil belgesi yüklemen gerekmiyor.</p>
        {([['medications','Kullandığın ilaçlar'],['conditions','Bilinen hastalıklar / özel durumlar'],['allergies','Alerjiler']] as const).map(([key,label]) => <label key={key} className="block mt-3"><span className="field-label">{label}</span><textarea className="dose-input text-sm" aria-label={label} rows={2} maxLength={500} value={draft[key]} onChange={e => update(key,e.target.value)} placeholder="Paylaşmak istersen yaz; yoksa boş bırak" /></label>)}
      </details>
      <section className="dose-section space-y-3">
        <h2 className="font-semibold text-sm">AI ile profil analizi</h2>
        <label className="flex items-start gap-3 text-xs text-[var(--text-2)] leading-relaxed cursor-pointer"><input type="checkbox" aria-label="Profilimi AI ile paylaş" className="mt-1 shrink-0 accent-[var(--primary)]" checked={draft.aiProfileConsent} onChange={e => update('aiProfileConsent',e.target.checked)} />AI’a soru/analiz gönderdiğimde yaş, boy, kilo, cinsiyet, hedef, doldurduğum ek sağlık bilgilerinin ve günlük özbildirim/kullanım kayıtlarımın yanıt için sunucu ve AI sağlayıcısına iletilmesine izin veriyorum. Adım paylaşılmaz; izni istediğim zaman kapatabilirim.</label>
        <p className="text-xs text-[var(--text-2)]">Profil analizi otomatik çalışmaz. Genel dikkat noktalarını açıklar; teşhis veya kişisel doz reçetesi değildir.</p>
      </section>
      <button type="submit" className="w-full rounded-xl py-3 font-semibold text-sm" style={{background:'var(--primary)',color:'#152018'}}>{welcome ? 'Profilimi kaydet ve başla' : 'Kaydet'}</button>
      {!welcome && <button type="button" onClick={analyze} disabled={analyzing} className="dose-add disabled:opacity-50">{analyzing ? 'Profilin değerlendiriliyor…' : 'Profilimi AI ile değerlendir'}</button>}
      {error && <p role="alert" className="text-sm text-[var(--primary)]">{error}</p>}
      {status && <p role="status" className="text-sm text-[var(--vital)]">{status}</p>}
    </form>
    {analysis && <section className="dose-section mt-4" aria-label="AI profil değerlendirmesi"><h2 className="font-semibold mb-3 text-[var(--amber)]">Profiline göre genel değerlendirme</h2><p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)]">{analysis}</p></section>}
    <div className="text-xs text-[var(--text-2)] leading-relaxed mt-4">
      <p>Profil ve ürün kayıtları bu tarayıcıda tutulur. Bulut üyelik/senkronizasyon henüz bağlı değil; tarayıcı verilerini silersen kayıtlar gider. AI paylaşım izni kapalı olsa bile gönderdiğin sohbet mesajı ve takviye adları yanıt için sağlayıcıya iletilir.</p>
      {storage.mode !== 'local' && <p role="alert" className="text-[var(--primary)] mt-2">Tarayıcı depolamasına erişilemiyor; kalıcı kayıt yapılamayabilir.</p>}
    </div>
    {!welcome && <><Link href="/dashboard" className="block text-center mt-4 text-sm text-[var(--primary)]">Panele dön →</Link><button type="button" onClick={clear} className="dose-add mt-5">Bu cihazdaki verilerimi sil</button></>}
  </div>
}
