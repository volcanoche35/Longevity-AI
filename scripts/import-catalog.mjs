#!/usr/bin/env node
/**
 * Takviye kataloğunu Excel/CSV ile genişlet.
 *
 *   node scripts/import-catalog.mjs <dosya.xlsx|xls|csv> [--dry] [--force]
 *
 * Başlık satiri zorunlu. Tanınan sütun adları (büyük/küçük harf ve ; / , ayracı toleranslı):
 *   name|ad|ürün|takviye · category|kategori · grade|derece|kanıt (A/B/C)
 *   typicaldose|doz · timing|zamanlama|saat · withfood|tok mu|yemekle
 *   avoidwith|etkileşim|kaçın|interactions · note|not|aciklama|description · aliases|es anlamlilar
 *
 * --dry   : diske yazmaz, önizleme + uyumsuzluk raporu
 * --force : aynı isimli mevcut kaydın üzerine yazar
 * Güvenlik kuralı: kanıt derecesi boşsa C yazılır (tembel varsayılan = güvenli taraf).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const DRY = args.includes('--dry')
const FORCE = args.includes('--force')
if (!file) {
  console.error('Kullanım: node scripts/import-catalog.mjs <dosya.xlsx|csv> [--dry] [--force]')
  process.exit(1)
}
const abs = resolve(file)
if (!existsSync(abs)) { console.error('Dosya bulunamadı:', abs); process.exit(1) }

const TARGET = resolve(process.cwd(), 'data/supplements.json')
if (!existsSync(TARGET)) { console.error('Hedef katalog yok:', TARGET); process.exit(1) }

const norm = s => String(s ?? '').trim()
const list = s => norm(s).split(/[,;|]/).map(x => x.trim()).filter(Boolean)
const yes = s => /^(1|e|evet|y|true|yes)$/i.test(norm(s))
const gradeOf = g => { const x = norm(g).toUpperCase().slice(0, 1); return ['A', 'B', 'C'].includes(x) ? x : 'C' }
const pick = (row, keys) => { for (const k of keys) { const v = row[k]; if (norm(v)) return v } return '' }

/* ── CSV ayracı (virgül/noktalı virgül) + tırnak desteği ─────────────── */
function splitLine(line, delim) {
  const out = []; let cur = ''; let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = !q; continue }
    if (c === delim && !q) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur); return out
}
function readCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error('Başlık satiri + en az bir veri satırı gerekli')
  const head = splitLine(lines[0], ';').length > splitLine(lines[0], ',').length ? ';' : ','
  const cols = splitLine(lines[0], head).map(h => norm(h).toLowerCase())
  return lines.slice(1).map(l => {
    const cells = splitLine(l, head)
    return Object.fromEntries(cols.map((c, i) => [c, norm(cells[i] ?? '')]))
  })
}
async function readXlsx(path) {
  let XLSX
  try { XLSX = await import('xlsx') } catch {
    throw new Error('xlsx paketi kurulu değil. İki yol var:\n'
      + '  1) npm i -D xlsx  (Excel dosyasını doğrudan okur)\n'
      + '  2) Excel\'de Dosya → Farklı Kaydet → CSV (Türkçe sınırlı) ve bu betiği .csv ile çalıştır')
  }
  const lib = XLSX.default ?? XLSX
  const wb = lib.readFile(path)
  const ws = wb.Sheets[wb.SheetNames[0]]
  return lib.utils.sheet_to_json(ws, { defval: '', raw: false })
    .map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k).toLowerCase(), norm(v)])))
}

/* ── Ana ────────────────────────────────────────────────────────────── */
const ext = extname(abs).toLowerCase()
let rows
try {
  rows = (ext === '.csv' || ext === '.txt') ? readCsv(abs) : await readXlsx(abs)
} catch (e) { console.error('Okuma hatası:', e.message); process.exit(1) }
if (!Array.isArray(rows) || !rows.length) { console.error('Satır okunamadı.'); process.exit(1) }

const catalog = JSON.parse(readFileSync(TARGET, 'utf8'))
const byName = new Map(catalog.entries.map(e => [norm(e.name).toLowerCase(), e]))
const added = [], updated = [], skipped = []
let missingGrade = 0

for (const r of rows) {
  const name = norm(pick(r, ['name', 'ad', 'ürün', 'urun', 'takviye', 'takviye adı', 'supplement']))
  if (!name) { skipped.push({ what: JSON.stringify(r).slice(0, 60), why: 'isim sütunu boş' }); continue }
  const rawGrade = pick(r, ['grade', 'derece', 'kanıt', 'kanit'])
  if (!rawGrade) missingGrade++
  const entry = {
    name,
    category: norm(pick(r, ['category', 'kategori', 'kat'])) || 'etiket',
    source_url: norm(pick(r, ['source_url', 'kaynak'])),
    barcode: norm(pick(r, ['barcode', 'barkod'])),
    brand: norm(pick(r, ['brand', 'marka'])),
    reviewStatus: 'unreviewed',
    grade: gradeOf(rawGrade),
    aliases: list(pick(r, ['aliases', 'es anlamlilar', 'alias'])),
    typicalDose: norm(pick(r, ['typicaldose', 'doz', 'dose', 'tipik doz'])),
    timing: norm(pick(r, ['timing', 'zamanlama', 'saat'])) || 'Her saat',
    withFood: yes(pick(r, ['withfood', 'tok mu', 'yemekle'])),
    avoidWith: list(pick(r, ['avoidwith', 'etkileşim', 'etkilesim', 'kaçın', 'kacin', 'interactions'])),
    note: norm(pick(r, ['note', 'not', 'aciklama', 'açıklama', 'description'])),
  }
  const key = name.toLowerCase()
  if (byName.has(key)) {
    if (FORCE) { Object.assign(byName.get(key), entry); updated.push(name) }
    else skipped.push({ what: name, why: 'mevcut — üzerine yazmak için --force' })
  } else {
    catalog.entries.push(entry); byName.set(key, entry); added.push(name)
  }
}

console.log(`\nDosya: ${abs}\nOkunan satır: ${rows.length} · Eklenen: ${added.length} · Güncellenen: ${updated.length} · Atlanan: ${skipped.length}`)
if (added.length) console.log('  + ' + added.slice(0, 20).join(', ') + (added.length > 20 ? ` …(+${added.length - 20})` : ''))
if (updated.length) console.log('  ↻ ' + updated.slice(0, 10).join(', '))
for (const s of skipped.slice(0, 8)) console.log(`  ✕ ${s.what}: ${s.why}`)
if (skipped.length > 8) console.log(`  ✕ …ve ${skipped.length - 8} satır daha atlandı`)
if (missingGrade) console.log(`  ⚠ ${missingGrade} satırda kanıt derecesi yok → C (güvenli varsayılan) yazıldı`)

if (DRY) { console.log('\n--dry modu: diske hiçbir şey yazılmadı.\n'); process.exit(0) }
if (!added.length && !updated.length) { console.log('\nYazılacak yeni kayıt yok, katalog dokunulmadı.\n'); process.exit(0) }

catalog.updated = new Date().toISOString().slice(0, 10)
catalog.version = (catalog.version ?? 1) + 1
writeFileSync(TARGET, JSON.stringify(catalog, null, 2) + '\n')
console.log(`\n✅ Yazıldı: ${TARGET}\n   Toplam kayıt: ${catalog.entries.length}\n   Sonraki adım: npm run build && sunucuyu yeniden başlat.\n`)
