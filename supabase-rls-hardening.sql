-- LongevityAI — RLS sertleştirme (sahiplik kontrolü)
-- Amaç: Bir kullanıcı yalnızca KENDİ takviyesine işaret ekleyebilir,
-- başkasının user_supplements.id değerini (ardışık, tahmin edilebilir BIGINT)
-- kendi daymark kaydına yazamaz. Aynısı hatırlatma onayları için geçerli.
-- İdempotent (DROP IF EXISTS + CREATE). Birden fazla kez çalıştırılabilir.

DROP POLICY IF EXISTS "own daymarks" ON daymarks;
CREATE POLICY "own daymarks" ON daymarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM user_supplements s
    WHERE s.id = supplement_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "own reminder_acks" ON reminder_acks;
CREATE POLICY "own reminder_acks" ON reminder_acks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM reminders r
    WHERE r.id = reminder_id AND r.user_id = auth.uid()
  ));
