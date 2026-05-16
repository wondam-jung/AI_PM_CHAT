import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import EvalPanel from './EvalPanel'
import { parseFile, formatFileContext } from '../services/fileParser'

export default function ChatWindow({ messages, streamingContent, onSend, loading, loadingStep }) {
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState(null) // { name, content }
  const [fileLoading, setFileLoading] = useState(false)
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, loading])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileLoading(true)
    try {
      const content = await parseFile(file)
      setAttachedFile({ name: file.name, content })
    } catch (err) {
      alert(err.message)
    } finally {
      setFileLoading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return
    const fullMessage = attachedFile
      ? trimmed + formatFileContext(attachedFile.name, attachedFile.content)
      : trimmed
    onSend(fullMessage, trimmed)
    setInput('')
    setAttachedFile(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && !streamingContent && (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '80px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>💼</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>AI PM에게 물어보세요</div>
            <div style={{ fontSize: '13px', marginTop: '8px', color: '#94a3b8' }}>
              전략 수립 · OKR · PRD · 유저 스토리 · 사용성 테스트
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'assistant' && <EvalPanel message={msg} />}
            <MessageBubble message={msg} />
          </div>
        ))}

        {/* 실시간 스트리밍 버블 */}
        {streamingContent && (
          <div>
            <MessageBubble message={{ role: 'assistant', content: streamingContent }} streaming />
          </div>
        )}

        {/* 로딩 인디케이터 (오케스트레이터 / eval 단계) */}
        {loading && !streamingContent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', background: '#f0f4ff',
              borderRadius: '4px 16px 16px 16px',
            }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#4F46E5', display: 'inline-block',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
              {loadingStep && (
                <span style={{ fontSize: '13px', color: '#4F46E5', fontWeight: 500 }}>
                  {loadingStep}
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', background: '#fff' }}>
        {/* 첨부 파일 칩 */}
        {attachedFile && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '6px', padding: '4px 10px', marginBottom: '8px',
            fontSize: '12px', color: '#1d4ed8',
          }}>
            📎 {attachedFile.name}
            <button
              onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#93c5fd', fontSize: '14px', lineHeight: 1, padding: 0 }}
            >×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          {/* 파일 첨부 버튼 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || fileLoading}
            title="파일 첨부 (PDF, DOCX, PPTX, TXT)"
            style={{
              width: '38px', height: '38px', flexShrink: 0,
              background: '#f1f5f9', border: '1px solid #e2e8f0',
              borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: fileLoading ? '#94a3b8' : '#64748b',
            }}
          >
            {fileLoading ? '⏳' : '📎'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,.md"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="PM 관련 질문을 입력하세요... (Shift+Enter 줄바꿈)"
            disabled={loading}
            rows={2}
            style={{
              flex: 1, resize: 'none',
              border: '1px solid #e2e8f0', borderRadius: '8px',
              padding: '10px 14px', fontSize: '14px', outline: 'none',
              fontFamily: 'inherit', lineHeight: '1.5', color: '#1a1a2e',
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              height: '38px', padding: '0 20px', flexShrink: 0,
              background: loading || !input.trim() ? '#c7d2fe' : '#4F46E5',
              color: '#fff', border: 'none', borderRadius: '8px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            전송
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
