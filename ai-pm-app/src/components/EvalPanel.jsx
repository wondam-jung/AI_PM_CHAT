import { useState } from 'react'

const CRITERIA_LABELS = {
  framework:     { label: 'PM 프레임워크 적용', max: 3 },
  actionability: { label: '실행 가능성',         max: 3 },
  completeness:  { label: '완성도',               max: 2 },
  relevance:     { label: '질문 적절성',           max: 2 },
}

function ScoreBar({ score, max }) {
  const pct = Math.round((score / max) * 100)
  const color = pct === 100 ? '#10b981' : pct >= 67 ? '#4F46E5' : pct >= 33 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
      <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color, minWidth: '32px', textAlign: 'right' }}>
        {score}/{max}
      </span>
    </div>
  )
}

function TotalScoreRing({ score, max }) {
  const pct = score / max
  const color = pct >= 0.8 ? '#10b981' : pct >= 0.6 ? '#4F46E5' : pct >= 0.4 ? '#f59e0b' : '#ef4444'
  const label = pct >= 0.8 ? '우수' : pct >= 0.6 ? '양호' : pct >= 0.4 ? '보통' : '미흡'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        background: `conic-gradient(${color} ${pct * 360}deg, #e2e8f0 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '14px', color,
        }}>
          {score}
        </div>
      </div>
      <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

export default function EvalPanel({ message }) {
  const [open, setOpen] = useState(false)

  if (!message || message.role !== 'assistant') return null
  const { agentsUsed = [], skillsUsed = [], evalResult, routingReason } = message
  if (!agentsUsed.length && !evalResult) return null

  const eval_ = evalResult || {}
  const criteria = eval_.criteria || {}
  const score = eval_.score ?? 0
  const maxScore = eval_.max_score ?? 10

  return (
    <div style={{
      margin: '0 0 6px 0',
      border: '1px solid #e0e7ff',
      borderRadius: '10px',
      background: '#fafbff',
      fontSize: '13px',
      overflow: 'hidden',
      maxWidth: '85%',
    }}>
      {/* 헤더 (항상 표시) */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* 총점 링 */}
        {eval_.score !== undefined && (
          <TotalScoreRing score={score} max={maxScore} />
        )}

        {/* 요약 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            {agentsUsed.map(a => (
              <span key={a} style={{ background: '#e0e7ff', color: '#4338ca', borderRadius: '4px', padding: '1px 8px', fontSize: '11px', fontWeight: 600 }}>
                🤖 {a}
              </span>
            ))}
            {skillsUsed.map(s => (
              <span key={s} style={{ background: '#dcfce7', color: '#15803d', borderRadius: '4px', padding: '1px 8px', fontSize: '11px', fontWeight: 600 }}>
                🔧 {s}
              </span>
            ))}
          </div>
          {eval_.feedback && (
            <div style={{ color: '#475569', fontSize: '12px', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {eval_.feedback}
            </div>
          )}
        </div>

        <span style={{ color: '#94a3b8', fontSize: '12px', flexShrink: 0 }}>
          {open ? '▲ 접기' : '▼ 상세'}
        </span>
      </button>

      {/* 상세 패널 */}
      {open && (
        <div style={{ borderTop: '1px solid #e0e7ff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* 라우팅 이유 */}
          {routingReason && (
            <div style={{ background: '#eff6ff', borderRadius: '6px', padding: '8px 12px', color: '#3b82f6', fontSize: '12px' }}>
              <strong>라우팅 판단:</strong> {routingReason}
            </div>
          )}

          {/* 기준별 점수 */}
          {Object.keys(criteria).length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '10px' }}>평가 기준별 점수</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(CRITERIA_LABELS).map(([key, { label, max }]) => {
                  const c = criteria[key]
                  if (!c) return null
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                        <span style={{ color: '#475569', fontSize: '12px', minWidth: '130px' }}>{label}</span>
                        <ScoreBar score={c.score} max={max} />
                      </div>
                      {c.comment && (
                        <div style={{ color: '#64748b', fontSize: '11px', marginLeft: '140px', lineHeight: '1.4' }}>
                          {c.comment}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 적용 프레임워크 */}
          {eval_.framework_applied?.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>적용된 프레임워크</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {eval_.framework_applied.map(f => (
                  <span key={f} style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 강점 / 개선점 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {eval_.strengths?.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '6px', fontSize: '12px' }}>✅ 강점</div>
                {eval_.strengths.map((s, i) => (
                  <div key={i} style={{ color: '#166534', fontSize: '12px', lineHeight: '1.5', marginBottom: '3px' }}>· {s}</div>
                ))}
              </div>
            )}
            {eval_.improvements?.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, color: '#b45309', marginBottom: '6px', fontSize: '12px' }}>💡 개선점</div>
                {eval_.improvements.map((s, i) => (
                  <div key={i} style={{ color: '#92400e', fontSize: '12px', lineHeight: '1.5', marginBottom: '3px' }}>· {s}</div>
                ))}
              </div>
            )}
          </div>

          {/* 종합 피드백 */}
          {eval_.feedback && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', color: '#475569', fontSize: '12px', lineHeight: '1.6' }}>
              <strong style={{ color: '#334155' }}>종합 피드백</strong><br />
              {eval_.feedback}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
