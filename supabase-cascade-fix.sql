-- LongevityAI — hesap silme CASCADE düzeltmesi (kalıcı şema düzeltmesi)
-- Sorun: user_supplements.user_id → profiles.id FK'sinde ON DELETE CASCADE yok.
-- Bu yüzden auth.users silinince (profiles CASCADE ile düşerken) user_supplements
-- satırı FK ihlali yaratıyor ve silme 500 dönüyor.
-- Çözüm: FK'yi CASCADE ile yeniden tanımla. İdempotent.

ALTER TABLE user_supplements DROP CONSTRAINT IF EXISTS user_supplements_user_id_fkey;
ALTER TABLE user_supplements ADD CONSTRAINT user_supplements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
