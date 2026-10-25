/**
 * Node test altyapısı: TypeScript dosyalarını transpile ederek require etmek ve
 * sahte bir tarayıcı (window + localStorage) kurmak için.
 *
 * Neden: bu projede tarayıcı test runner'ı yok; depolama davranışını (kota,
 * bozuk JSON, erişim engeli, storage olayı) gerçek Node içinde ölçmek gerekiyor.
 */
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

require.extensions['.ts'] = function loadTypeScript(mod, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  mod._compile(outputText, filename)
}

/** localStorage benzeri; failWrite/failRead test sırasında değiştirilebilir. */
function makeStorage({ initial = {}, failWrite = null, failRead = null } = {}) {
  const map = new Map(Object.entries(initial))
  const api = {
    map,
    failWrite,
    failRead,
    getItem(key) {
      if (api.failRead) throw api.failRead
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      if (api.failWrite) throw api.failWrite
      map.set(key, String(value))
    },
    removeItem(key) {
      if (api.failWrite) throw api.failWrite
      map.delete(key)
    },
    clear() { map.clear() },
    key(index) { return [...map.keys()][index] ?? null },
    get length() { return map.size },
  }
  return api
}

function quotaError() {
  const error = new Error('The quota has been exceeded.')
  error.name = 'QuotaExceededError'
  return error
}

/**
 * global.window kurar. storage: makeStorage() sonucu veya 'throws'
 * (erişim engelli tarayıcı senaryosu).
 */
function installBrowser({ storage, confirm } = {}) {
  const store = storage === undefined ? makeStorage() : storage
  const listeners = new Map()
  const win = {
    confirm: confirm ?? (() => true),
    addEventListener(type, fn) {
      const bucket = listeners.get(type) ?? []
      bucket.push(fn)
      listeners.set(type, bucket)
    },
    removeEventListener(type, fn) {
      const bucket = listeners.get(type) ?? []
      listeners.set(type, bucket.filter(item => item !== fn))
    },
  }
  Object.defineProperty(win, 'localStorage', {
    configurable: true,
    get() {
      if (store === 'throws') throw new Error('SecurityError: localStorage engellendi')
      return store
    },
  })
  global.window = win
  return {
    window: win,
    storage: store === 'throws' ? null : store,
    fire(type, event) {
      for (const fn of listeners.get(type) ?? []) fn(event)
    },
    listenerCount(type) {
      return (listeners.get(type) ?? []).length
    },
    uninstall() { delete global.window },
  }
}

/** Modül önbelleğini temizleyip yeniden yükler = "sayfa yenilendi". */
function freshRequire(target) {
  const resolved = require.resolve(target)
  delete require.cache[resolved]
  return require(resolved)
}

/** Gerçek Supabase paketi yerine sahte; ağa çıkılmaz. */
function stubSupabase() {
  const originalLoad = Module._load
  Module._load = function patched(request, parent, isMain) {
    if (request === '@supabase/supabase-js') {
      return { createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }) }
    }
    return originalLoad.call(this, request, parent, isMain)
  }
}

module.exports = {
  installBrowser,
  makeStorage,
  quotaError,
  freshRequire,
  stubSupabase,
  libPath: name => path.join(__dirname, '..', 'src', 'lib', name),
}
