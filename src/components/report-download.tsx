'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase, isRemoteMode } from '@/lib/supabase'

/**
 * "Sağlık özetini indir (PDF)" — kullanıcı kendi verisinden sunucuda üretilen
 * PDF raporu indirir. Canlı modda Bearer token ile /api/report/pdf çağrılır;
 * demo modda (giriş yok) rapor üretilemeyeceği açıkça söylenir.
 */
export default function ReportDownload() {
  const [days, setDays] = useState<7 | 30>(7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remote = isRemoteMode()

  async function download() {
    if (!supabase) {
      setError('Rapor hizmeti kullanılamıyor.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setError('Rapor için giriş yapmalısın.')
        return
      }
      const res = await fetch(`/api/report/pdf?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error || 'Rapor indirilemedi.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('content-disposition') || ''
      const match = /filename="?([^";]+)"?/.exec(disposition)
      a.download = match?.[1] || 'saglik-ozeti.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rapor indirilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!remote) {
    return (
      <div className="dv-card" style={{ padding: '14px 16px' }}>
        <h2 className="dv-card-title" style={{ fontSize: 14 }}>Sağlık özetini indir (PDF)</h2>
        <p className="dv-card-sub">Rapor için giriş yapman gerekiyor.</p>
        <Link href="/auth" className="dv-link">Giriş yap →</Link>
      </div>
    )
  }

  return (
    <div className="dv-card" style={{ padding: '14px 16px' }}>
      <h2 className="dv-card-title" style={{ fontSize: 14 }}>Sağlık özetini indir (PDF)</h2>
      <p className="dv-card-sub">Profilin, takviyelerin ve uyum geçmişin tek PDF'te.</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div role="group" aria-label="Rapor kapsamı" style={{ display: 'flex', gap: 6 }}>
          {([7, 30] as const).map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid var(--line, #e7e9df)',
                background: days === d ? 'var(--primary, #2e8a74)' : 'transparent',
                color: days === d ? '#0d1f45' : 'var(--text-2, #8a96af)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Son {d} gün
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="dv-ai dv-ai--wide"
          style={{ flex: 1, minWidth: 180 }}
        >
          {busy ? 'Hazırlanıyor…' : 'Sağlık özetimi indir (PDF)'}
        </button>
      </div>
      {error && <p className="dv-alert" role="alert" style={{ marginTop: 8 }}>{error}</p>}
      <p className="dv-privacy dv-privacy--dim" style={{ marginTop: 8 }}>
        Rapor, verilerinden anlık üretilir; teşhis değildir.
      </p>
    </div>
  )
}
