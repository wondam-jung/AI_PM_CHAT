import { useState, useEffect } from 'react'
import EvalPanel from '../components/EvalPanel'
import { fetchConversations } from '../services/supabase'

export default function AdminDashboard() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await fetchConversations()
      setConversations(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const sessions = [...new Set(conversations.map(c => c.session_id))]

  const agentStats = conversations
    .filter(c => c.agents_used)
    .flatMap(c => c.agents_used || [])
    .reduce((acc, agent) => {
      acc[agent] = (acc[agent] || 0) + 1
      return acc
    }, {})

  const filteredConversations = selectedSession
    ? conversations.filter(c => c.session_id === selectedSession)
    : conversations

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        대화 기록을 불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
        오류: {error}<br />
        <span style={{ fontSize: '13px', color: '#64748b' }}>Supabase 환경변수 및 스키마를 확인해주세요.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'inherit' }}>
      <aside style={{
        width: '240px',
        borderRight: '1px solid #e2e8f0',
        background: '#f8fafc',
        overflowY: 'auto',
        padding: '16px',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px', color: '#475569' }}>
          세션 목록 ({sessions.length})
        </div>
        <button
          onClick={() => setSelectedSession(null)}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '8px 10px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: !selectedSession ? '#e0e7ff' : 'transparent',
            color: !selectedSession ? '#4338ca' : '#475569',
            marginBottom: '4px',
            fontSize: '13px',
          }}
        >
          전체 보기
        </button>
        {sessions.map(sessionId => (
          <button
            key={sessionId}
            onClick={() => setSelectedSession(sessionId)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: selectedSession === sessionId ? '#e0e7ff' : 'transparent',
              color: selectedSession === sessionId ? '#4338ca' : '#475569',
              marginBottom: '4px',
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sessionId.slice(0, 8)}...
          </button>
        ))}

        <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px', color: '#475569' }}>
            에이전트 통계
          </div>
          {Object.entries(agentStats).map(([agent, count]) => (
            <div key={agent} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              padding: '4px 0',
              color: '#64748b',
            }}>
              <span>{agent}</span>
              <span style={{ fontWeight: 600, color: '#4338ca' }}>{count}회</span>
            </div>
          ))}
          {Object.keys(agentStats).length === 0 && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>기록 없음</div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            관리자 대시보드
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            전체 대화 기록: {conversations.length}개 메시지 / 세션: {sessions.length}개
          </p>
        </div>

        <button
          onClick={loadConversations}
          style={{
            marginBottom: '16px',
            padding: '6px 16px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#475569',
          }}
        >
          새로고침
        </button>

        {filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>
            대화 기록이 없습니다
          </div>
        ) : (
          filteredConversations.map((conv, i) => (
            <div key={conv.id || i} style={{ marginBottom: '16px' }}>
              {conv.role === 'assistant' && (
                <EvalPanel message={{
                  role: conv.role,
                  agentsUsed: conv.agents_used,
                  skillsUsed: conv.skills_used,
                  evalResult: conv.eval_result,
                }} />
              )}
              <div style={{
                background: conv.role === 'user' ? '#f0f4ff' : '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}>
                  <span style={{ fontWeight: 600, color: conv.role === 'user' ? '#4338ca' : '#15803d' }}>
                    {conv.role === 'user' ? '사용자' : 'AI PM'}
                  </span>
                  <span>{conv.session_id?.slice(0, 8)}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#1a1a2e', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {conv.content}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
