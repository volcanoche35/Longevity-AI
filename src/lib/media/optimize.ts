/**
 * Sunucu tarafı görsel hattı (photocraft-cli). YALNIZ sunucuda (route handler /
 * server action) içe aktarın — node:child_process kullanır, istemci paketine
 * girerse build kırılır.
 *
 * Akış: magic-byte doğrulama → geçici dizin → photocraft run (EXIF yönüne göre
 * döndürülmüş açar, boyutlandırır, [belge modunda gri+kontrast+keskinleştir],
 * dışa aktarır) → metadata'yı ayrıca temizle → buffer döndür → dizini sil.
 *
 * Gizlilik notu: photocraft'ın "metadata:none" ayarı yalnız JPEG'de işe yarıyor;
 * WebP/PNG çıktıda EXIF (GPS dahil) kalıyordu (ölçüldü). Bu yüzden her
 * biçimde metadata.ts ile ikinci bir temizlik yapılır.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { detectFormat, stripMetadata } from './metadata'

const execFileAsync = promisify(execFile)

export type OutputFormat = 'webp' | 'jpg' | 'png'
export type OptimizeMode = 'photo' | 'document'

export interface OptimizeOptions {
  /** Uzun kenar üst sınırı (px). Varsayılan 1600; document modunda 2000. Küçük görsel büyütülmez. */
  maxEdge?: number
  /** Varsayılan: photo→webp, document→png (OCR için kayıpsız). */
  format?: OutputFormat
  /** 1–100, jpg/webp için. Varsayılan: webp 80, jpg 82 (document jpg 92). */
  quality?: number
  mode?: OptimizeMode
}

export interface OptimizeResult {
  buffer: Buffer
  width: number
  height: number
  format: OutputFormat
  bytesIn: number
  bytesOut: number
}

export class MediaError extends Error {
  constructor(
    public code: 'too_large' | 'empty' | 'unsupported_format' | 'heic_unsupported' | 'too_many_pixels' | 'process_failed' | 'bad_options',
    message: string,
  ) {
    super(message)
    this.name = 'MediaError'
  }
}

export const MAX_INPUT_BYTES = 15 * 1024 * 1024
const MAX_INPUT_PIXELS = 100_000_000
const TIMEOUT_MS = 30_000
const DEFAULT_CLI = '/root/craft-tools/bin/photocraft-cli'

function cliPath(): string {
  return process.env.PHOTOCRAFT_CLI || DEFAULT_CLI
}

/** photocraft `run` stdout'u: her satır {command,result} JSON. */
function parseResults(stdout: string): Record<string, any> {
  const out: Record<string, any> = {}
  for (const line of stdout.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('{')) continue
    try {
      const j = JSON.parse(t)
      if (j && typeof j.command === 'string') out[j.command] = j.result
    } catch { /* json olmayan satırı yok say */ }
  }
  return out
}

async function runCli(args: string[], env: Record<string, string | undefined>): Promise<string> {
  try {
    const { stdout } = await execFileAsync(cliPath(), args, {
      timeout: TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
      env: env as NodeJS.ProcessEnv,
      windowsHide: true,
    })
    return stdout
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { killed?: boolean; stderr?: string }
    const why = err.killed ? 'zaman aşımı (30 sn)' : (err.stderr || err.message || '').toString().slice(0, 300)
    throw new MediaError('process_failed', `Görsel işleme başarısız: ${why}`)
  }
}

export async function optimizeImage(input: Buffer, opts: OptimizeOptions = {}): Promise<OptimizeResult> {
  const mode: OptimizeMode = opts.mode ?? 'photo'
  if (mode !== 'photo' && mode !== 'document') throw new MediaError('bad_options', 'Geçersiz mod')
  const format: OutputFormat = opts.format ?? (mode === 'document' ? 'png' : 'webp')
  if (!['webp', 'jpg', 'png'].includes(format)) throw new MediaError('bad_options', 'Geçersiz çıktı biçimi')
  const maxEdge = opts.maxEdge ?? (mode === 'document' ? 2000 : 1600)
  if (!Number.isInteger(maxEdge) || maxEdge < 16 || maxEdge > 8000) throw new MediaError('bad_options', 'maxEdge 16–8000 olmalı')
  const quality = Math.round(opts.quality ?? (format === 'webp' ? 80 : mode === 'document' ? 92 : 82))
  if (quality < 1 || quality > 100) throw new MediaError('bad_options', 'quality 1–100 olmalı')

  if (!Buffer.isBuffer(input) || input.length === 0) throw new MediaError('empty', 'Boş dosya')
  if (input.length > MAX_INPUT_BYTES) throw new MediaError('too_large', 'Dosya 15 MB sınırını aşıyor')
  const inFmt = detectFormat(input)
  if (!inFmt) throw new MediaError('unsupported_format', 'Desteklenmeyen dosya biçimi (JPG, PNG, WebP kabul edilir)')
  if (inFmt === 'heic') throw new MediaError('heic_unsupported', 'HEIC desteklenmiyor; lütfen JPG olarak paylaşın')

  const dir = await mkdtemp(path.join(tmpdir(), 'optimg-'))
  try {
    const inPath = path.join(dir, `in.${inFmt}`)
    const outPath = path.join(dir, `out.${format}`)
    await writeFile(inPath, input, { mode: 0o600 })
    // photocraft kullanıcı ayarlarını HOME'a yazabilir; geçici dizine izole et.
    const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: dir, XDG_CONFIG_HOME: dir, XDG_DATA_HOME: dir }

    // 1) Boyut (info EXIF yönünü uygulanmış hâliyle verir)
    const info = JSON.parse(await runCli(['info', inPath], env)) as { width: number; height: number }
    if (!info.width || !info.height) throw new MediaError('process_failed', 'Görsel boyutu okunamadı')
    if (info.width * info.height > MAX_INPUT_PIXELS) throw new MediaError('too_many_pixels', 'Görsel çözünürlüğü çok yüksek')

    let width = info.width
    let height = info.height
    const long = Math.max(width, height)
    const args = ['run', inPath]
    const cmd = (id: string, params?: object) => { args.push('--cmd', id); if (params) args.push('--params', JSON.stringify(params)) }

    if (long > maxEdge) {
      const s = maxEdge / long
      width = Math.max(1, Math.round(width * s))
      height = Math.max(1, Math.round(height * s))
      cmd('image.imageSize', { width, height, resample: 'lanczos' })
    }
    if (mode === 'document') {
      // OCR hazırlığı: otomatik kontrast (levels eşdeğeri) → gri → hafif keskinleştirme
      cmd('image.autoContrast')
      cmd('image.mode.grayscale')
      cmd('filter.sharpen.unsharpMask', { amount: 60, radius: 1, threshold: 2 })
    }
    cmd('file.export.exportPreferences', { metadata: 'none', convertToSrgb: true, jpegQuality: quality, webpLossless: false, webpQuality: quality })
    cmd('file.export.quickExport', { path: outPath })

    const results = parseResults(await runCli(args, env))
    const size = results['image.imageSize']
    if (size?.width && size?.height) { width = size.width; height = size.height }

    const raw = await readFile(outPath)
    const clean = stripMetadata(raw, format)
    return { buffer: clean, width, height, format, bytesIn: input.length, bytesOut: clean.length }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
