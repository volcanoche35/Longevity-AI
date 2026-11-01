-- LongevityAI — KVKK açık rıza kaydı için alanlar
-- Aydınlatma metni sürümü ve rıza zamanının kanıtı için (KVKK m.10 açık rıza).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
