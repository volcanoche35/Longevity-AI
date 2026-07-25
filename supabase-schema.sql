-- Supplements table
CREATE TABLE supplements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  time_of_day TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat history
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical rules for RAG
CREATE TABLE medical_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplement_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'danger')),
  source TEXT
);

-- Indexes
CREATE INDEX idx_supplements_user ON supplements(user_id);
CREATE INDEX idx_chat_user ON chat_messages(user_id);

-- RLS policies
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own supplements" ON supplements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own messages" ON chat_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read medical rules" ON medical_rules
  FOR SELECT USING (true);
