/**
 * Görsel güvenliği: magic-byte ile biçim tespiti ve metadata (EXIF/GPS/XMP/yorum)
 * temizleme. Saf fonksiyonlar — süreç/dosya yok, kolay test edilir.
 */

export type DetectedFormat = 'jpg' | 'png' | 'webp' | 'heic'

/** Dosya başlığından biçimi tanır; bilinmiyorsa null. */
export function detectFormat(buf: Buffer): DetectedFormat | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp'
  if (buf.toString('latin1', 4, 8) === 'ftyp') {
    const brand = buf.toString('latin1', 8, 12)
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'heic'
  }
  return null
}

/** JPEG: APP1(EXIF/XMP), APP3–APP13 (IPTC dahil), APP15 ve COM atılır. APP0/APP2(ICC)/APP14 kalır. */
function stripJpeg(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 2)]
  let i = 2
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error('Bozuk JPEG')
    const marker = buf[i + 1]
    if (marker === 0xff) { i++; continue }
    if (marker === 0xd9) { parts.push(buf.subarray(i)); return Buffer.concat(parts) }
    if (marker === 0xda) { parts.push(buf.subarray(i)); return Buffer.concat(parts) } // SOS: kalan = piksel verisi
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { parts.push(buf.subarray(i, i + 2)); i += 2; continue }
    const len = buf.readUInt16BE(i + 2)
    if (len < 2 || i + 2 + len > buf.length) throw new Error('Bozuk JPEG')
    const drop = marker === 0xfe || marker === 0xe1 || (marker >= 0xe3 && marker <= 0xed) || marker === 0xef
    if (!drop) parts.push(buf.subarray(i, i + 2 + len))
    i += 2 + len
  }
  throw new Error('Bozuk JPEG')
}

const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'])

function stripPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)]
  let i = 8
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i)
    const type = buf.toString('latin1', i + 4, i + 8)
    const end = i + 12 + len
    if (end > buf.length) throw new Error('Bozuk PNG')
    if (!PNG_DROP.has(type)) parts.push(buf.subarray(i, end))
    i = end
    if (type === 'IEND') break
  }
  return Buffer.concat(parts)
}

function stripWebp(buf: Buffer): Buffer {
  const parts: Buffer[] = []
  let i = 12
  while (i + 8 <= buf.length) {
    const type = buf.toString('latin1', i, i + 4)
    const size = buf.readUInt32LE(i + 4)
    const end = i + 8 + size + (size & 1)
    if (end > buf.length + 1) throw new Error('Bozuk WebP')
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = Buffer.from(buf.subarray(i, Math.min(end, buf.length)))
      if (type === 'VP8X') chunk[8] &= ~(0x08 | 0x04) // EXIF + XMP bayrakları
      parts.push(chunk)
    }
    i = end
  }
  const body = Buffer.concat(parts)
  const head = Buffer.alloc(12)
  head.write('RIFF', 0, 'latin1')
  head.writeUInt32LE(body.length + 4, 4)
  head.write('WEBP', 8, 'latin1')
  return Buffer.concat([head, body])
}

/** EXIF/GPS/XMP/IPTC/yorum bloklarını çıkarır; piksel verisine dokunmaz. */
export function stripMetadata(buf: Buffer, format: 'jpg' | 'png' | 'webp'): Buffer {
  if (format === 'jpg') return stripJpeg(buf)
  if (format === 'png') return stripPng(buf)
  return stripWebp(buf)
}

/** Test/denetim: dosyada metadata bloğu var mı? Bulunan blok adlarını döndürür. */
export function findMetadata(buf: Buffer, format: 'jpg' | 'png' | 'webp'): string[] {
  const found: string[] = []
  if (format === 'jpg') {
    let i = 2
    while (i + 4 <= buf.length && buf[i] === 0xff) {
      const m = buf[i + 1]
      if (m === 0xda || m === 0xd9) break
      const len = buf.readUInt16BE(i + 2)
      if (m === 0xfe || m === 0xe1 || (m >= 0xe3 && m <= 0xed) || m === 0xef) found.push(`APP/COM 0x${m.toString(16)}`)
      i += 2 + len
    }
  } else if (format === 'png') {
    let i = 8
    while (i + 12 <= buf.length) {
      const len = buf.readUInt32BE(i)
      const type = buf.toString('latin1', i + 4, i + 8)
      if (PNG_DROP.has(type)) found.push(type)
      i += 12 + len
    }
  } else {
    let i = 12
    while (i + 8 <= buf.length) {
      const type = buf.toString('latin1', i, i + 4)
      const size = buf.readUInt32LE(i + 4)
      if (type === 'EXIF' || type === 'XMP ') found.push(type.trim())
      i += 8 + size + (size & 1)
    }
  }
  return found
}
