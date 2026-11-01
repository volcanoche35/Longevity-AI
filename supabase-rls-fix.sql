-- LongevityAI — RLS DÜZELTMESİ (kritik gizlilik)
-- Sorun: Önceden var olan "herkese okuma" (permissive) politikaları, doğru politikayla
-- OR'lanarak her anon isteğin TÜM kullanıcıların verisini okumasına izin veriyor.
-- Çözüm: İlgili tablolardaki TÜM politikaları sil, RLS'i aç, yalnızca doğru politikayı kur.

-- 1) Tüm mevcut politikaları temizle (katalog hariç)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('user_supplements','profiles','wellness_entries','daymarks','reminders','reminder_acks')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) RLS açık (güvence)
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daymarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_acks    ENABLE ROW LEVEL SECURITY;

-- 3) Yalnızca "kendi kaydın" politikası
CREATE POLICY "own user_supplements" ON user_supplements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "own wellness_entries" ON wellness_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own daymarks" ON daymarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own reminder_acks" ON reminder_acks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOT: supplements_library (katalog) bilerek herkese okunur kalır — dokunulmaz.
