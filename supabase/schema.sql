-- AI PM 앱 Supabase 스키마
-- Supabase 콘솔 > SQL Editor에서 아래 SQL을 실행하여 테이블을 생성하세요.

-- 대화 기록 테이블
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  agents_used JSONB,
  skills_used JSONB,
  eval_result JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 세션별 조회 최적화 인덱스
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Knowledge Base 테이블 (사용자 자료 업로드)
CREATE TABLE knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- RLS(Row Level Security) 정책 설정
-- 개발 단계에서는 anon 키로 접근 허용 (운영 환경에서는 인증 정책 추가 필요)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_anon_all" ON conversations
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "knowledge_base_anon_all" ON knowledge_base
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 확인용 조회
-- SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM knowledge_base ORDER BY uploaded_at DESC;
