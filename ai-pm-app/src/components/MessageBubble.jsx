import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ message, streaming = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isAssistant = message.role === 'assistant'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isAssistant ? 'flex-start' : 'flex-end',
      marginBottom: '16px',
    }}>
      <div style={{ maxWidth: isAssistant ? '85%' : '70%', position: 'relative' }}>

        {/* 말풍선 */}
        <div style={{
          background: isAssistant ? '#f8faff' : '#4F46E5',
          color: isAssistant ? '#1a1a2e' : '#ffffff',
          borderRadius: isAssistant ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          padding: isAssistant ? '20px 24px' : '12px 16px',
          fontSize: '14px',
          lineHeight: '1.75',
          border: isAssistant ? '1px solid #e2e8f0' : 'none',
          wordBreak: 'break-word',
        }}>
          {isAssistant ? (
            <div className="markdown-body">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {streaming && (
                <span style={{
                  display: 'inline-block', width: '2px', height: '14px',
                  background: '#4F46E5', marginLeft: '2px', verticalAlign: 'middle',
                  animation: 'cursor-blink 0.8s ease-in-out infinite',
                }} />
              )}
            </div>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          )}
        </div>

        {/* 복사 버튼 */}
        {isAssistant && (
          <button
            onClick={handleCopy}
            style={{
              marginTop: '6px',
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              color: copied ? '#10b981' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        )}

        {/* 에이전트/스킬 태그 */}
        {isAssistant && message.agentsUsed?.length > 0 && (
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span>🤖 {message.agentsUsed.join(', ')}</span>
            {message.skillsUsed?.length > 0 && (
              <span>🔧 {message.skillsUsed.join(', ')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
