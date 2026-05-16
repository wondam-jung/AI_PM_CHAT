import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export async function saveConversation({ sessionId, role, content, agentsUsed, skillsUsed, evalResult }) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      session_id: sessionId,
      role,
      content,
      agents_used: agentsUsed || null,
      skills_used: skillsUsed || null,
      eval_result: evalResult || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchConversations() {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchConversationsBySession(sessionId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function fetchSessions() {
  const { data, error } = await supabase
    .from('conversations')
    .select('session_id, content, created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: false })

  if (error) throw error

  const seen = new Set()
  return (data || []).filter(row => {
    if (seen.has(row.session_id)) return false
    seen.add(row.session_id)
    return true
  })
}
