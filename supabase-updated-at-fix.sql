-- ═══════════════════════════════════════════════════════════════
-- LongevityAI — updated_at Düzeltmesi
-- Sorun: user_supplements tablosunda updated_at sütunu yok,
-- ama bir BEFORE UPDATE trigger'ı bunu bekliyor. Bu yüzden
-- takviye GÜNCELLEME (düzenleme) işlemleri hata veriyor:
--   "record new has no field updated_at"
-- Çözüm: sütunu ekle. Trigger zaten mevcut, sütun gelince çalışır.
--
-- Supabase Dashboard → SQL Editor → yapıştır → Run.
-- İdempotenttir (tekrar çalıştırmak güvenli).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE user_supplements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Var olan satırların updated_at değerini created_at'ten doldur
UPDATE user_supplements
  SET updated_at = created_at
  WHERE updated_at IS NULL;
