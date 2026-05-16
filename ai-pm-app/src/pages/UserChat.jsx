import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ChatWindow from '../components/ChatWindow'
import ChatHistorySidebar from '../components/ChatHistorySidebar'
import { runMultiAgent } from '../services/agents'
import { saveConversation, fetchConversationsBySession } from '../services/supabase'

function toDisplayMsg(raw) {
  return {
    role: raw.role,
    content: raw.content,
    agentsUsed: raw.agents_used || [],
    skillsUsed: raw.skills_used || [],
    evalResult: raw.eval_result || null,
  }
}

export default function UserChat() {
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [messages, setMessages] = useState([])
  const [streamingContent, setStreamingContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')

  const handleNewChat = useCallback(() => {
    setSessionId(uuidv4())
    setMessages([])
    setStreamingContent('')
  }, [])

  const handleSelectSession = useCallback(async (sid) => {
    setSessionId(sid)
    setStreamingContent('')
    try {
      const rows = await fetchConversationsBySession(sid)
      setMessages((rows || []).map(toDisplayMsg))
    } catch {
      setMessages([])
    }
  }, [])

  const handleSend = async (fullMessage, displayText) => {
    const userMsg = { role: 'user', content: displayText ?? fullMessage }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setStreamingContent('')
    setLoadingStep('오케스트레이터가 질문을 분석하는 중...')

    try {
      await saveConversation({ sessionId, role: 'user', content: fullMessage })

      const result = await runMultiAgent(
        fullMessage,
        messages,
        setLoadingStep,
        (chunk) => {
          setStreamingContent(chunk)
          setLoadingStep('')
        }
      )

      setStreamingContent('')
      setLoadingStep('eval-agent가 품질을 검증하는 중...')

      const assistantMsg = {
        role: 'assistant',
        content: result.content,
        agentsUsed: result.agentsUsed,
        skillsUsed: result.skillsUsed,
        evalResult: result.evalResult,
        routingReason: result.routingReason,
      }
      setMessages(prev => [...prev, assistantMsg])

      await saveConversation({
        sessionId,
        role: 'assistant',
        content: result.content,
        agentsUsed: result.agentsUsed,
        skillsUsed: result.skillsUsed,
        evalResult: result.evalResult,
      })
    } catch (err) {
      setStreamingContent('')
      setMessages(prev => [...prev, { role: 'assistant', content: `오류: ${err.message}` }])
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* 왼쪽 히스토리 사이드바 */}
      <ChatHistorySidebar
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
      />

      {/* 채팅 메인 영역 (중앙 정렬, 최대 760px) */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', background: '#ffffff', overflow: 'hidden' }}>
        <div style={{ width: '100%', maxWidth: '760px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <ChatWindow
            messages={messages}
            streamingContent={streamingContent}
            onSend={handleSend}
            loading={loading}
            loadingStep={loadingStep}
          />
        </div>
      </div>
    </div>
  )
}
