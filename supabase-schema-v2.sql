-- LongevityAI — Supabase şema v2 (GENİŞLETİR, mevcut tabloları DÜŞÜRMEZ)
-- Supabase Dashboard → SQL Editor'da bir kez çalıştırın. Tekrar çalıştırmak güvenlidir (idempotent).
-- Mevcut: supplements_library, user_supplements, profiles, biomarkers — sütunlar korunur.

-- ── 1) user_supplements: yeni sütunlar ───────────────────────────────
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS dose_plan   JSONB;  -- {parts:[{label,amount,unit}], form, dailyCount, dailyAmount, dailyUnit}
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS time_of_day TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS notes       TEXT;
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS frequency   TEXT;  -- uygulamadaki serbest "sıklık" metni
CREATE INDEX IF NOT EXISTS idx_user_supplements_user ON user_supplements(user_id);

-- ── 2) profiles: yeni sütunlar (profiles.id = auth.users.id varsayılır) ─
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age                  INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm            NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg            NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sex                  TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal                 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medications          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conditions           TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allergies            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete  BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_profile_consent   BOOLEAN DEFAULT FALSE;

-- ── 3) Yeni tablolar ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wellness_entries (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  energy     INT CHECK (energy    BETWEEN 1 AND 5),
  sleep      INT CHECK (sleep     BETWEEN 1 AND 5),
  digestion  INT CHECK (digestion BETWEEN 1 AND 5),
  note       TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, day)
);

CREATE TABLE IF NOT EXISTS daymarks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day           DATE NOT NULL,
  supplement_id BIGINT NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, day, supplement_id)
);

CREATE TABLE IF NOT EXISTS reminders (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  time         TEXT NOT NULL CHECK (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  kind         TEXT NOT NULL CHECK (kind IN ('supplement','walk','general')),
  note         TEXT DEFAULT '',
  snooze_until TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminder_acks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  day         DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, reminder_id, day)
);

CREATE INDEX IF NOT EXISTS idx_wellness_user_day ON wellness_entries(user_id, day);
CREATE INDEX IF NOT EXISTS idx_daymarks_user_day ON daymarks(user_id, day);
CREATE INDEX IF NOT EXISTS idx_reminders_user    ON reminders(user_id);

-- ── 4) RLS: kullanıcı yalnızca kendi kaydını görür/yazar ─────────────
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daymarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_acks    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own user_supplements" ON user_supplements;
CREATE POLICY "own user_supplements" ON user_supplements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profiles: standart Supabase düzeni, satır anahtarı id = auth.uid()
DROP POLICY IF EXISTS "own profile" ON profiles;
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own wellness_entries" ON wellness_entries;
CREATE POLICY "own wellness_entries" ON wellness_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own daymarks" ON daymarks;
CREATE POLICY "own daymarks" ON daymarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own reminders" ON reminders;
CREATE POLICY "own reminders" ON reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own reminder_acks" ON reminder_acks;
CREATE POLICY "own reminder_acks" ON reminder_acks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Katalog herkese okunur (yalnız SELECT)
ALTER TABLE supplements_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read library" ON supplements_library;
CREATE POLICY "read library" ON supplements_library FOR SELECT USING (true);
