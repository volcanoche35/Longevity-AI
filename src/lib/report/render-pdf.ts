/**
 * Sunucu tarafı PDF üretici (yalnızca Node.js runtime'ında kullanılır).
 *
 * Akış: SVG sayfalarını os.tmpdir() altında benzersiz bir klasöre yaz →
 * vectorcraft-cli ile PDF'e çevir → çok sayfa varsa pdfunite ile birleştir →
 * tamponu oku → geçici dosyaları finally'de sil.
 *
 * - shell yok: execFile kullanılır, zaman aşımı 30 sn.
 * - Binary yolu VECTORCRAFT_CLI ile override edilebilir.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const execFileAsync = promisify(execFile)

const CLI_CANDIDATES = [
  '/app/bin/vectorcraft-cli',             // konteyner (nixpacks build aşamasında indirilir)
  '/root/craft-tools/bin/vectorcraft-cli', // host geliştirme
]
const TIMEOUT_MS = 30_000
const MAX_BUFFER = 16 * 1024 * 1024

function cliPath(): string {
  if (process.env.VECTORCRAFT_CLI) return process.env.VECTORCRAFT_CLI
  for (const c of CLI_CANDIDATES) if (existsSync(c)) return c
  return CLI_CANDIDATES[0]
}

/**
 * SVG sayfa dizisini tek bir PDF tamponuna çevirir.
 * Tek sayfa en yaygın durumdur; bu durumda birleştirme yapılmaz.
 */
export async function renderPdf(svgPages: string[]): Promise<Buffer> {
  if (!svgPages.length) throw new Error('Rapor içeriği boş.')

  const dir = await mkdtemp(path.join(tmpdir(), 'report-'))
  try {
    const pdfs: string[] = []
    for (let i = 0; i < svgPages.length; i++) {
      const svgPath = path.join(dir, `page-${i}.svg`)
      const pdfPath = path.join(dir, `page-${i}.pdf`)
      await writeFile(svgPath, svgPages[i], 'utf8')
      await execFileAsync(cliPath(), ['convert', svgPath, pdfPath], {
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
      })
      pdfs.push(pdfPath)
    }

    if (pdfs.length === 1) return await readFile(pdfs[0])

    const outPath = path.join(dir, 'merged.pdf')
    await execFileAsync('pdfunite', [...pdfs, outPath], { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER })
    return await readFile(outPath)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
