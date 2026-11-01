/**
 * Saf (pure) SVG rapor üretici.
 *
 * Kurallar:
 *  - Ağ, dosya, DOM ve Supabase erişimi YOK; yalnızca veri → SVG dönüşümü.
 *  - Tüm kullanıcı kaynaklı metinler XML-escape edilir (enjeksiyon kapalı).
 *  - Uydurma veri yok: yalnızca ReportData'da verilen alanlar çizilir.
 *  - A4 (595×842 pt), açık baskı teması. İçerik tek sayfaya sığmazsa 2+ sayfaya bölünür.
 */

export const PAGE_W = 595
export const PAGE_H = 842

export interface ReportSupplement {
  name: string
  /** İnsan okunur doz özeti (sunucuda önceden hesaplanır). */
  dosage: string
  timeOfDay: string
  /** "HH:MM" hatırlatma saatleri. */
  schedule: string[]
}

export interface AdherenceDay {
  day: string
  label: string
  taken: number
  planned: number
}

export interface ReportInteraction {
  /** "Ürün A + Ürün B" */
  products: string
  condition: string
}

export interface ReportData {
  /** Örn. "1 Kasım 2026" */
  generatedAt: string
  userName: string
  profile: {
    age: string
    sex: 'female' | 'male' | null
    heightCm: string
    weightKg: string
    goals: string[]
  }
  supplements: ReportSupplement[]
  adherence: { windowDays: number; days: AdherenceDay[] }
  interactions: ReportInteraction[]
  /** Günlük özbildirim özeti — yalnızca gerçek kayıt varsa dolar. */
  wellness?: {
    energyAvg?: number
    sleepAvg?: number
    digestionAvg?: number
    entryDays: number
  }
}

const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2

const C = {
  ink: '#1f2430',
  muted: '#5f6672',
  faint: '#8a919c',
  accent: '#2e7d5b',
  accentSoft: '#e4efe9',
  line: '#e7e9ec',
  headerBg: '#f3f5f7',
  planned: '#dfe3e6',
  warn: '#8a6a1e',
  warnBg: '#f8f4e8',
  warnBorder: '#e7d9a8',
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

/** "2026-11-01" → "1 Kasım 2026". Geçersizse girişi olduğu gibi döner. */
export function formatDateTr(dayKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!m) return dayKey
  const day = Number(m[3])
  const month = Number(m[2]) - 1
  const year = Number(m[1])
  const name = MONTHS_TR[month]
  return name ? `${day} ${name} ${year}` : dayKey
}

/** XML metin/öznitelik escape: & < > " ' */
export function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Sözcük sınırında sarar; uzun tek sözcük de kırılır. */
function wrap(text: string, maxChars: number): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  const words = clean.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word
    if (next.length <= maxChars) {
      cur = next
      continue
    }
    if (cur) lines.push(cur)
    cur = word.length > maxChars ? word.slice(0, maxChars) : word
  }
  if (cur) lines.push(cur)
  return lines
}

function trunc(value: string, max: number): string {
  const s = value.replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/* ── yerleşim: içerik parçalarını sayfalara böler ─────────────────── */

function layout(data: ReportData): string[][] {
  const pages: string[][] = []
  let cur: string[] = []
  let y = MARGIN

  const breakPage = () => {
    pages.push(cur)
    cur = []
    y = MARGIN
  }
  const ensure = (h: number) => {
    if (y + h > PAGE_H - MARGIN) breakPage()
  }
  const text = (x: number, yy: number, s: string, size: number, fill: string, weight = 400) =>
    `<text x="${x}" y="${yy}" font-family="sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}">${xmlEscape(s)}</text>`
  const divider = () => {
    cur.push(`<line x1="${MARGIN}" y1="${y}" x2="${PAGE_W - MARGIN}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`)
    y += 1
  }
  const secTitle = (title: string) => {
    ensure(22)
    cur.push(`<rect x="${MARGIN}" y="${y + 2}" width="3" height="12" fill="${C.accent}"/>`)
    cur.push(text(MARGIN + 10, y + 13, title, 11, C.ink, 700))
    y += 24
  }
  const paragraph = (value: string, size: number, fill: string, maxChars: number) => {
    const lines = wrap(value, maxChars)
    ensure(lines.length * Math.round(size * 1.5) + 2)
    for (const ln of lines) {
      cur.push(text(MARGIN, y + size, ln, size, fill))
      y += Math.round(size * 1.5)
    }
    y += 2
  }

  /* ── Başlık ── */
  ensure(70)
  cur.push(text(MARGIN, y + 14, 'LongevityAI · Sağlık Özeti', 11, C.accent, 700))
  cur.push(text(MARGIN, y + 38, 'SAĞLIK ÖZETİ', 20, C.ink, 700))
  cur.push(text(MARGIN, y + 58, data.generatedAt + (data.userName ? ` · ${data.userName}` : ''), 10.5, C.muted))
  y += 72
  divider()
  y += 12

  /* ── Profil ── */
  secTitle('Profil')
  const p = data.profile
  const kv: Array<[string, string]> = []
  if (p.age) kv.push(['Yaş', p.age])
  if (p.sex) kv.push(['Cinsiyet', p.sex === 'female' ? 'Kadın' : 'Erkek'])
  if (p.heightCm) kv.push(['Boy', `${p.heightCm} cm`])
  if (p.weightKg) kv.push(['Kilo', `${p.weightKg} kg`])
  if (p.goals.length) kv.push(['Hedefler', p.goals.join(', ')])
  if (kv.length === 0) {
    paragraph('Profil bilgisi girilmemiş.', 10.5, C.faint, 80)
  } else {
    for (const [label, value] of kv) {
      const lines = wrap(value, 62)
      ensure(lines.length * 16 + 2)
      cur.push(text(MARGIN, y + 11, `${label}:`, 10.5, C.muted, 600))
      lines.forEach((ln, i) => cur.push(text(MARGIN + 92, y + 11 + i * 16, ln, 10.5, C.ink)))
      y += lines.length * 16 + 2
    }
  }
  y += 8

  /* ── Takviye tablosu ── */
  secTitle('Takviyeler ve doz planı')
  const rows = data.supplements
  if (rows.length === 0) {
    paragraph('Kayıtlı takviye yok.', 10.5, C.faint, 80)
    y += 6
  } else {
    const colName = MARGIN
    const colDose = MARGIN + 180
    const colTime = MARGIN + 322
    const colSched = MARGIN + 388
    const rowH = 19
    ensure(rowH)
    cur.push(`<rect x="${MARGIN}" y="${y}" width="${CONTENT_W}" height="${rowH}" rx="3" fill="${C.headerBg}"/>`)
    cur.push(text(colName, y + 13, 'Takviye', 9.5, C.muted, 700))
    cur.push(text(colDose, y + 13, 'Doz', 9.5, C.muted, 700))
    cur.push(text(colTime, y + 13, 'Zaman', 9.5, C.muted, 700))
    cur.push(text(colSched, y + 13, 'Hatırlatma', 9.5, C.muted, 700))
    y += rowH
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      ensure(rowH)
      cur.push(text(colName, y + 13, trunc(r.name, 34), 10, C.ink))
      cur.push(text(colDose, y + 13, trunc(r.dosage || '—', 27), 10, C.muted))
      cur.push(text(colTime, y + 13, trunc(r.timeOfDay || '—', 11), 10, C.ink))
      cur.push(text(colSched, y + 13, trunc(r.schedule.length ? r.schedule.join(', ') : '—', 18), 10, C.muted))
      y += rowH
      cur.push(`<line x1="${MARGIN}" y1="${y}" x2="${PAGE_W - MARGIN}" y2="${y}" stroke="${C.line}" stroke-width="0.7"/>`)
      y += 1
    }
    y += 8
  }

  /* ── Uyum grafiği ── */
  secTitle(`Uyum · son ${data.adherence.windowDays} gün`)
  if (rows.length === 0 || data.adherence.days.length === 0) {
    paragraph('Takviye kaydı olmadığından uyum hesaplanamadı.', 10.5, C.faint, 80)
    y += 6
  } else {
    const days = data.adherence.days
    const maxV = Math.max(1, ...days.map(d => d.planned))
    const chartH = 72
    ensure(chartH + 34)
    const chartTop = y
    const chartW = CONTENT_W
    const slot = chartW / days.length
    const barW = Math.max(2, Math.min(slot * 0.32, 14))
    const yBase = chartTop + chartH
    days.forEach((d, i) => {
      const cx = MARGIN + slot * i + slot / 2
      const ph = Math.max(1, Math.round((d.planned / maxV) * chartH))
      const th = Math.max(0, Math.round((d.taken / maxV) * chartH))
      cur.push(`<rect x="${(cx - barW - 1).toFixed(1)}" y="${yBase - ph}" width="${barW.toFixed(1)}" height="${ph}" fill="${C.planned}"/>`)
      cur.push(`<rect x="${(cx + 1).toFixed(1)}" y="${yBase - th}" width="${barW.toFixed(1)}" height="${th}" fill="${C.accent}"/>`)
    })
    cur.push(`<line x1="${MARGIN}" y1="${yBase}" x2="${MARGIN + chartW}" y2="${yBase}" stroke="${C.line}" stroke-width="1"/>`)
    y += chartH + 6
    // Eksen etiketleri
    const labelIdx = days.length <= 7
      ? days.map((_, i) => i)
      : days.map((_, i) => i).filter(i => i % 5 === 0 || i === days.length - 1)
    for (const i of labelIdx) {
      const cx = MARGIN + slot * i + slot / 2
      cur.push(text(cx - 14, y + 10, days[i].label, 8.5, C.faint))
    }
    y += 18
    // Gösterge + oran
    cur.push(`<rect x="${MARGIN}" y="${y - 8}" width="9" height="9" fill="${C.accent}"/>`)
    cur.push(text(MARGIN + 14, y, 'Alınan (işaretlenen)', 9, C.muted))
    cur.push(`<rect x="${MARGIN + 128}" y="${y - 8}" width="9" height="9" fill="${C.planned}"/>`)
    cur.push(text(MARGIN + 142, y, 'Planlanan (aktif kayıt)', 9, C.muted))
    const takenTotal = days.reduce((a, d) => a + d.taken, 0)
    const plannedTotal = days.reduce((a, d) => a + d.planned, 0)
    const pct = plannedTotal > 0 ? Math.round((takenTotal / plannedTotal) * 100) : 0
    cur.push(text(MARGIN + 300, y, `Son ${days.length} gün: ${takenTotal}/${plannedTotal} işaret (≈%${pct})`, 9, C.ink, 600))
    y += 14
  }
  y += 8

  /* ── Etkileşim notları (varsa) ── */
  if (data.interactions.length > 0) {
    secTitle('Olası etkileşimler (sınırlı, kaynaklı)')
    for (const it of data.interactions) {
      ensure(20)
      cur.push(text(MARGIN, y + 11, it.products, 10.5, C.accent, 700))
      y += 18
      for (const ln of wrap(it.condition, 84)) {
        ensure(15)
        cur.push(text(MARGIN + 12, y + 10, ln, 9.5, C.muted))
        y += 15
      }
      y += 3
    }
    paragraph('Bu sınırlı kural listesi birlikte kullanım için güvenlik onayı değildir.', 9, C.faint, 84)
    y += 6
  }

  /* ── Günlük özbildirim (varsa) ── */
  const w = data.wellness
  if (w && w.entryDays > 0) {
    secTitle(`Günlük özbildirim · son ${data.adherence.windowDays} gün`)
    const parts: string[] = []
    if (w.energyAvg !== undefined) parts.push(`Enerji ort. ${w.energyAvg}/5`)
    if (w.sleepAvg !== undefined) parts.push(`Uyku ort. ${w.sleepAvg}/5`)
    if (w.digestionAvg !== undefined) parts.push(`Sindirim ort. ${w.digestionAvg}/5`)
    paragraph(`${parts.join(' · ') || 'Kayıt var'} (${w.entryDays} gün kayıt)`, 10.5, C.ink, 80)
    paragraph('Kendi beyanındır; ölçüm veya tanı değildir.', 9, C.faint, 84)
    y += 4
  }

  /* ── Sabit uyarı + KVKK ── */
  ensure(74)
  y += 6
  divider()
  y += 6
  cur.push(`<rect x="${MARGIN}" y="${y - 2}" width="${CONTENT_W}" height="56" rx="4" fill="${C.warnBg}" stroke="${C.warnBorder}" stroke-width="1"/>`)
  cur.push(text(MARGIN + 12, y + 12, 'Bu rapor tıbbi tanı değildir; sağlık profesyoneline danışın.', 10, C.warn, 700))
  cur.push(text(MARGIN + 12, y + 29, "Bu belge hesabınızdaki kişisel sağlık verilerinizden üretilmiştir; 6698 sayılı KVKK kapsamında işlenmektedir. Haklarınız için uygulama içi Aydınlatma Metni'ne bakın.", 8.5, C.muted))
  cur.push(text(MARGIN + 12, y + 45, 'LongevityAI bilgi amaçlıdır; teşhis veya tedavi önerisi değildir.', 8.5, C.faint))
  y += 64

  pages.push(cur)
  return pages
}

function wrapPage(parts: string[]): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${PAGE_H}" viewBox="0 0 ${PAGE_W} ${PAGE_H}">` +
    `<rect width="${PAGE_W}" height="${PAGE_H}" fill="#ffffff"/>` +
    parts.join('') +
    `</svg>`
  )
}

/**
 * Sayfa başına bir A4 SVG dizesi. Çoğu rapor tek sayfa döner; içerik taşarsa
 * 2+ sayfa. PDF üreticisi her sayfayı ayrı çevirip birleştirir.
 */
export function buildSvgPages(data: ReportData): string[] {
  return layout(data).map(wrapPage)
}

/**
 * Tek SVG dizesi: tüm sayfalar dikey olarak art arda (yükseklik = sayfa × 842).
 * Testler ve tek dosya önizleme için; PDF yolu buildSvgPages kullanır.
 */
export function buildSvg(data: ReportData): string {
  const pages = layout(data)
  const inner = pages
    .map((parts, i) => `<g transform="translate(0,${i * PAGE_H})">${parts.join('')}</g>`)
    .join('')
  const height = pages.length * PAGE_H
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${height}" viewBox="0 0 ${PAGE_W} ${height}">` +
    `<rect width="${PAGE_W}" height="${height}" fill="#ffffff"/>` +
    inner +
    `</svg>`
  )
}
