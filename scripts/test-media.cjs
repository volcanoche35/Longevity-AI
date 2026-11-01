// Sunucu tarafı görsel hattı testi: gerçek görsel üretir, photocraft-cli ile çalıştırır.
require('./ts-harness.cjs')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { optimizeImage, MediaError, MAX_INPUT_BYTES } = require('../src/lib/media/optimize.ts')
const { detectFormat, findMetadata, stripMetadata } = require('../src/lib/media/metadata.ts')

const FFMPEG = process.env.FFMPEG || '/root/.hermes/tools/ffmpeg-9.0.1-linux-arm64/bin/ffmpeg'
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'test-media-'))

function makeJpeg(vf) {
  const f = path.join(tmp, 'base.jpg')
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `testsrc2=size=${vf}`, '-frames:v', '1', '-q:v', '3', f])
  return fs.readFileSync(f)
}
// EXIF: Orientation=6 (90° CW) + GPS IFD (N/E) ekle
function withExif(jpg) {
  const e = (tag, typ, cnt, val) => { const b = Buffer.alloc(12); b.writeUInt16LE(tag, 0); b.writeUInt16LE(typ, 2); b.writeUInt32LE(cnt, 4); val.copy(b, 8); return b }
  const v = (...a) => Buffer.from(a)
  const gpsOff = 8 + 2 + 24 + 4
  const ifd0 = Buffer.concat([Buffer.from([2, 0]), e(0x112, 3, 1, v(6, 0, 0, 0)), e(0x8825, 4, 1, (() => { const b = Buffer.alloc(4); b.writeUInt32LE(gpsOff); return b })()), Buffer.alloc(4)])
  const gps = Buffer.concat([Buffer.from([2, 0]), e(1, 2, 2, Buffer.from('N\0\0\0')), e(3, 2, 2, Buffer.from('E\0\0\0')), Buffer.alloc(4)])
  const hdr = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0])
  const app1 = Buffer.concat([Buffer.from('Exif\0\0'), hdr, ifd0, gps])
  const seg = Buffer.alloc(4); seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(app1.length + 2, 2)
  return Buffer.concat([jpg.subarray(0, 2), seg, app1, jpg.subarray(2)])
}

;(async () => {
  const src = withExif(makeJpeg('3000x2000'))
  assert.equal(detectFormat(src), 'jpg')
  assert.ok(findMetadata(src, 'jpg').length > 0, 'girdide EXIF olmalı')

  // photo → webp (varsayılan)
  let r = await optimizeImage(src)
  assert.equal(r.format, 'webp')
  assert.equal(detectFormat(r.buffer), 'webp')
  // EXIF Orientation=6 uygulandı: 3000x2000 → dik, uzun kenar 1600
  assert.equal(r.height, 1600); assert.equal(r.width, Math.round(2000 * 1600 / 3000))
  assert.ok(r.bytesOut < r.bytesIn, `küçülmeli ${r.bytesOut} < ${r.bytesIn}`)
  assert.deepEqual(findMetadata(r.buffer, 'webp'), [])
  assert.ok(!r.buffer.includes('Exif') && !r.buffer.includes('EXIF'))
  console.log(`photo webp: ${r.bytesIn} -> ${r.bytesOut} B, ${r.width}x${r.height}`)

  // photo → jpg ve png: metadata yok
  for (const format of ['jpg', 'png']) {
    r = await optimizeImage(src, { format, maxEdge: 800, quality: 70 })
    assert.equal(detectFormat(r.buffer), format)
    assert.equal(Math.max(r.width, r.height), 800)
    assert.deepEqual(findMetadata(r.buffer, format), [])
    console.log(`photo ${format}: ${r.bytesOut} B, ${r.width}x${r.height}`)
  }

  // küçük görsel büyütülmez
  r = await optimizeImage(makeJpeg('400x300'))
  assert.equal(r.width, 400); assert.equal(r.height, 300)

  // document: uzun kenar 2000, png, gri
  r = await optimizeImage(src, { mode: 'document' })
  assert.equal(r.format, 'png'); assert.equal(detectFormat(r.buffer), 'png')
  assert.equal(Math.max(r.width, r.height), 2000)
  assert.deepEqual(findMetadata(r.buffer, 'png'), [])
  const outPng = path.join(tmp, 'doc.png'); fs.writeFileSync(outPng, r.buffer)
  const raw = execFileSync(FFMPEG, ['-loglevel', 'error', '-i', outPng, '-vf', 'scale=32:32', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
  let maxDiff = 0
  for (let i = 0; i < raw.length; i += 3) maxDiff = Math.max(maxDiff, Math.abs(raw[i] - raw[i + 1]), Math.abs(raw[i + 1] - raw[i + 2]))
  assert.ok(maxDiff <= 2, `document çıktısı gri olmalı (kanal farkı ${maxDiff})`)
  console.log(`document png: ${r.bytesIn} -> ${r.bytesOut} B, ${r.width}x${r.height}, kanal farkı ${maxDiff}`)
  r = await optimizeImage(src, { mode: 'document', format: 'jpg' })
  assert.deepEqual(findMetadata(r.buffer, 'jpg'), [])

  // stripMetadata birim: PNG tEXt, WebP XMP
  const withText = (() => {
    const png = fs.readFileSync(outPng)
    const data = Buffer.from('Comment\0GPS 41,29')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const chunk = Buffer.concat([len, Buffer.from('tEXt'), data, Buffer.alloc(4)])
    return Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)])
  })()
  assert.deepEqual(findMetadata(withText, 'png'), ['tEXt'])
  assert.deepEqual(findMetadata(stripMetadata(withText, 'png'), 'png'), [])

  // reddetmeler
  const reject = async (buf, code, opts) => {
    await assert.rejects(() => optimizeImage(buf, opts), (e) => e instanceof MediaError && e.code === code, code)
  }
  await reject(Buffer.alloc(MAX_INPUT_BYTES + 1, 0xff), 'too_large')
  await reject(Buffer.alloc(0), 'empty')
  await reject(Buffer.from('%PDF-1.7 not an image at all'), 'unsupported_format')
  await reject(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'unsupported_format')
  await reject(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(20)]), 'heic_unsupported')
  await reject(src, 'bad_options', { quality: 0 })
  await reject(src, 'bad_options', { maxEdge: 5 })
  // bozuk ama JPEG başlıklı → süreç hatası, temiz MediaError
  await reject(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]), 'process_failed')

  // temp dizin sızıntısı yok
  const leaked = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('optimg-'))
  assert.deepEqual(leaked, [], 'geçici dizin temizlenmeli')

  // PHOTOCRAFT_CLI override: olmayan binary → process_failed
  process.env.PHOTOCRAFT_CLI = '/nonexistent/photocraft-cli'
  await reject(src, 'process_failed')
  delete process.env.PHOTOCRAFT_CLI

  fs.rmSync(tmp, { recursive: true, force: true })
  console.log('test-media: OK')
})().catch((e) => { console.error(e); process.exit(1) })
