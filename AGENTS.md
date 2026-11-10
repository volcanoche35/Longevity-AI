<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Geliştirme süreci (superpowers mimarisi, 2026-11-11 itibariyle zorunlu)

Bu projede her yeni feature / davranış değişikliği şu zinciri izler:

1. **brainstorming** — ne istendiği ve neden netleşmeden kod yazılmaz. Küçük/triviyal
   değişiklikler hariç (ör. metin düzeltme, CSS rengi).
2. **writing-plans** — onaylanan tasarımdan adım adım, test'e bağlı bir plan çıkar.
3. **Uygulama** — plan subagent'larla (subagent-driven-development) ya da inline
   (executing-plans) hayata geçirilir.
4. **test-driven-development** — her yeni modül/değişiklik `scripts/test-*.cjs` kalıbında
   bir test alır. `npm test` ile tüm paket doğrulanır (16 test dosyası, Node native
   assert, framework yok — mevcut kalıbı koru).
5. **verification-before-completion** — "bitti" demeden önce gerçek komut çıktısı
   (`npm test`, `npm run build`, manuel deploy kontrolü) gösterilir. Kanıtsız "çalışıyor"
   iddiası yok.
6. **systematic-debugging** — bug'da önce kök neden (ör. 504 → IPv6-only dinleme +
   firewall), sonra fix. Yama üstüne yama yok.

Bu disiplin geçmişteki gerçek arızalardan çıktı: 504 hatası (IPv6/firewall), bayat
service worker cache, container'da eksik CLI bağımlılığı (vectorcraft-cli/photocraft-cli —
2026-11-02'de `60dbb4e` ile çözüldü, Coolify build_command'ın `scripts/fetch-craft-cli.sh`'yi
çağırdığı panelden ayrıca doğrulanmalı).
