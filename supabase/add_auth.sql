-- ① user_id 컬럼 추가 (이미 있으면 오류 무시)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- ② 기존 anon 전체 허용 정책 삭제
DROP POLICY IF EXISTS "conversations_anon_all" ON conversations;

-- ③ 로그인 사용자만 자신의 대화 조회/저장
CREATE POLICY "conversations_user_select" ON conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "conversations_user_insert" ON conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ④ knowledge_base는 기존 정책 유지 (필요 시 동일 패턴 적용)
