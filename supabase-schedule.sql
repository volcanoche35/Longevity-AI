-- LongevityAI — Adım 3: takviye kullanım saatleri (schedule)
-- Her takviye için günlük kullanım saatleri listesi (JSONB dizi, "HH:MM" formatında).
-- Örnek: ["08:00", "20:00"]
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;
