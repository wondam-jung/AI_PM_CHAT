import { useState, useEffect } from 'react'
import { fetchSessions } from '../services/supabase'
import { GROQ_MODEL } from '../services/agents'
import { useAuth } from '../context/AuthContext'

export default function ChatHistorySidebar({ currentSessionId, onSelectSession, onNewChat }) {
  const { user, signOut } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [currentSessionId])

  async function loadSessions() {
    try {
      const data = await fetchSessions()
      setSessions(data)
    } catch {
      // Supabase 미연결 시 무시
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* 로고 */}
      <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '18px' }}>💼</span>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>AI PM</span>
        </div>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          + 새 대화
        </button>
      </div>

      {/* 세션 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '11px', color: '#475569', padding: '6px 8px', fontWeight: 600, letterSpacing: '0.05em' }}>
          대화 기록
        </div>
        {loading ? (
          <div style={{ color: '#475569', fontSize: '12px', padding: '12px 8px' }}>불러오는 중...</div>
        ) : sessions.length === 0 ? (
          <div style={{ color: '#475569', fontSize: '12px', padding: '12px 8px' }}>대화 기록이 없습니다</div>
        ) : (
          sessions.map(session => {
            const isActive = session.session_id === currentSessionId
            const preview = session.content?.slice(0, 40) || '새 대화'
            const date = new Date(session.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            return (
              <button
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? '#1e293b' : 'transparent',
                  marginBottom: '2px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1e293b80' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontSize: '12px',
                  color: isActive ? '#e2e8f0' : '#94a3b8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.4',
                }}>
                  {preview}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>{date}</div>
              </button>
            )
          })
        )}
      </div>

      {/* 하단: 사용자 정보 + 로그아웃 */}
      <div style={{ borderTop: '1px solid #1e293b', padding: '12px 14px' }}>
        {/* 모델 정보 */}
        <div style={{ fontSize: '11px', color: '#475569', marginBottom: '10px' }}>
          <div style={{ color: '#64748b', marginBottom: '2px' }}>사용 모델</div>
          <div style={{ color: '#94a3b8', fontWeight: 600 }}>{GROQ_MODEL}</div>
          <div style={{ color: '#334155' }}>via Groq</div>
        </div>

        {/* 사용자 정보 */}
        {user && (
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="프로필"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', fontWeight: 700 }}>
                  {(user.user_metadata?.name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.user_metadata?.name || '사용자'}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              style={{ width: '100%', padding: '6px', background: 'transparent', border: '1px solid #1e293b', borderRadius: '6px', color: '#475569', fontSize: '12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
