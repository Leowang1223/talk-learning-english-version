-- ========================================
-- Talk Learning - 資料庫表格清理與重建
-- ========================================
-- 此腳本會先刪除現有表格，然後重新創建所有表格
-- ⚠️ 警告：這會刪除所有現有資料！

-- ========== 刪除現有表格 ==========
DROP TABLE IF EXISTS public.flashcards CASCADE;
DROP TABLE IF EXISTS public.flashcard_decks CASCADE;
DROP TABLE IF EXISTS public.conversation_sessions CASCADE;
DROP TABLE IF EXISTS public.lesson_history CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ========== 創建 Profiles 表 ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========== 創建 Lesson History 表 ==========
CREATE TABLE public.lesson_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  total_score NUMERIC(5,2) NOT NULL,
  questions_count INTEGER NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  pronunciation_score NUMERIC(5,2),
  fluency_score NUMERIC(5,2),
  accuracy_score NUMERIC(5,2),
  comprehension_score NUMERIC(5,2),
  confidence_score NUMERIC(5,2),
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

CREATE INDEX idx_lesson_history_user ON lesson_history(user_id);
CREATE INDEX idx_lesson_history_lesson ON lesson_history(lesson_id);
CREATE INDEX idx_lesson_history_completed ON lesson_history(completed_at DESC);

ALTER TABLE public.lesson_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own lesson history"
  ON public.lesson_history FOR ALL
  USING (auth.uid() = user_id);

-- ========== 創建 Conversation Sessions 表 ==========
CREATE TABLE public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'conversation',
  mode TEXT,
  completed_at TIMESTAMPTZ NOT NULL,
  messages_count INTEGER DEFAULT 0,
  report_id TEXT,
  settings JSONB,
  conversation_data JSONB,
  scenario_id TEXT,
  user_role TEXT,
  ai_role TEXT,
  checkpoints JSONB,
  reviewed_lessons JSONB,
  vocabulary_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversation_user ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_session ON conversation_sessions(session_id);
CREATE INDEX idx_conversation_completed ON conversation_sessions(completed_at DESC);

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.conversation_sessions FOR ALL
  USING (auth.uid() = user_id);

-- ========== 創建 Flashcard Decks 表 ==========
CREATE TABLE public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deck_name)
);

ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decks"
  ON public.flashcard_decks FOR ALL
  USING (auth.uid() = user_id);

-- ========== 創建 Flashcards 表 ==========
CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  pinyin TEXT,
  back TEXT NOT NULL,
  deck_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcards_user ON flashcards(user_id);
CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id);

-- ========== 完成 ==========
-- 執行以下查詢驗證表格創建成功
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
