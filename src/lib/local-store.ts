/**
 * Güvenli yerel depolama katmanı (localStorage).
 *
 * Neden ayrı dosya: demo verisi ve profil aynı hata semantiğini paylaşmalı.
 * Kurallar:
 *  - SSR'de (window yok) okuma boş döner, yazma hata verir — sunucuda sahte kayıt üretilmez.
 *  - Depolama erişimi engelliyse uygulama çökmez; mod 'memory' olarak işaretlenir.
 *  - Yazma başarısızsa (kota, engel, sessiz yutma) hata FIRLATILIR; çağıran taraf
 *    başarılıymış gibi davranamaz.
 */

export type StorageMode = 'local' | 'memory'

export interface StorageState {
  /** 'local' = kalıcı, 'memory' = sadece bu oturumun belleği (kayıt kaybolur) */
  mode: StorageMode
  /** son depolama hatasının Türkçe açıklaması, hata yoksa null */
  error: string | null
}

let mode: StorageMode = 'local'
let lastError: string | null = null

export function storageState(): StorageState {
  return { mode, error: lastError }
}

function describe(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const rec = err as { name?: unknown; message?: unknown }
    const name = typeof rec.name === 'string' ? rec.name : ''
    const message = typeof rec.message === 'string' ? rec.message : ''
    if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      return `${fallback}: cihaz depolama alanı dolu`
    }
    if (message) return `${fallback}: ${message}`
  }
  return fallback
}

function getStorage(): Storage {
  if (typeof window === 'undefined') {
    const error = 'Tarayıcı yok (sunucu) — kalıcı kayıt yapılamıyor.'
    mode = 'memory'
    lastError = error
    throw new Error(error)
  }
  let store: Storage | null = null
  try {
    store = window.localStorage
  } catch (err) {
    const error = describe(err, 'Cihaz depolamasına erişilemiyor')
    mode = 'memory'
    lastError = error
    throw new Error(error)
  }
  if (!store) {
    const error = 'Cihaz depolamasına erişilemiyor'
    mode = 'memory'
    lastError = error
    throw new Error(error)
  }
  return store
}

export interface RawRead {
  raw: string | null
  mode: StorageMode
  error: string | null
}

/** Okuma asla fırlatmaz; hata varsa error alanında döner. */
export function readRaw(key: string): RawRead {
  try {
    const raw = getStorage().getItem(key)
    mode = 'local'
    lastError = null
    return { raw, mode, error: null }
  } catch (err) {
    const error = describe(err, 'Cihaz depolaması okunamadı')
    mode = 'memory'
    lastError = error
    return { raw: null, mode, error }
  }
}

/** Yazma başarısızsa fırlatır. Sessizce yutan tarayıcılar geri okumayla yakalanır. */
export function writeRaw(key: string, raw: string): void {
  try {
    const store = getStorage()
    store.setItem(key, raw)
    if (store.getItem(key) !== raw) {
      throw new Error('yazma doğrulanamadı, depolama reddetti')
    }
    mode = 'local'
    lastError = null
  } catch (err) {
    const error = describe(err, 'Cihaz depolamasına yazılamadı')
    mode = 'memory'
    lastError = error
    throw new Error(error)
  }
}

/** Silme başarısızsa fırlatır. */
export function removeRaw(key: string): void {
  try {
    getStorage().removeItem(key)
    mode = 'local'
    lastError = null
  } catch (err) {
    const error = describe(err, 'Cihaz depolamasından silinemedi')
    mode = 'memory'
    lastError = error
    throw new Error(error)
  }
}

/**
 * Aynı tarayıcıdaki diğer sekmelerde yapılan değişiklikleri dinler.
 * storage olayı yalnızca DİĞER sekmelerde tetiklenir (yazan sekmede değil).
 */
export function onStorageKey(
  key: string,
  cb: (event: { key: string | null; newValue: string | null }) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {}
  const handler = (event: StorageEvent) => {
    if (event.key !== null && event.key !== key) return
    cb({ key: event.key, newValue: event.newValue ?? null })
  }
  window.addEventListener('storage', handler as EventListener)
  return () => window.removeEventListener('storage', handler as EventListener)
}
