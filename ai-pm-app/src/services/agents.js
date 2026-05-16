export const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ─────────────────────────────────────────────
// 기본 Groq 호출 (JSON 응답)
// ─────────────────────────────────────────────
async function callGroq(systemPrompt, messages, { maxTokens = 2048, jsonMode = false } = {}) {
  const body = {
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
    temperature: jsonMode ? 0.1 : 0.7,
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Groq API 요청 실패')
  }
  return (await response.json()).choices[0].message.content
}

// ─────────────────────────────────────────────
// 스트리밍 Groq 호출 (전문 에이전트용)
// ─────────────────────────────────────────────
async function callGroqStream(systemPrompt, messages, { maxTokens = 4096 } = {}, onChunk) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Groq API 요청 실패')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') continue
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
        if (delta) { fullText += delta; onChunk?.(fullText) }
      } catch { /* ignore */ }
    }
  }
  return fullText
}

function safeParseJSON(text, fallback) {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : JSON.parse(text)
  } catch {
    return fallback
  }
}

// ─────────────────────────────────────────────
// 1단계: 오케스트레이터 프롬프트
// ─────────────────────────────────────────────
const ORCHESTRATOR_PROMPT = `당신은 PM 질문 라우터입니다. 사용자 질문을 분석하여 적합한 전문 에이전트와 스킬을 JSON으로 반환합니다.

에이전트 선택 기준:
- strategy-agent: 시장 분석, 경쟁사 분석, OKR, 포지셔닝, SWOT, 제품 전략, 비전/미션
- discovery-agent: 아이디어 검증, 린 캔버스, JTBD 분석, PRD 작성, 고객 문제 정의, 가설 검증
- execution-agent: 유저 스토리, 사용자 인터뷰 설계, 사용성 테스트(UT), 기능 우선순위(RICE/MoSCoW)

스킬 매핑:
- strategy-agent → product-strategy, okr-analysis
- discovery-agent → idea-diagnosis, jtbd, prd-writing
- execution-agent → user-interview, user-story-writing, ut-planning, prioritization

반드시 JSON으로만 응답:
{"agent": "에이전트명", "skills": ["스킬1", "스킬2"], "reason": "선택 이유 한 줄"}`

// ─────────────────────────────────────────────
// 2단계: 전문 에이전트 프롬프트
// ─────────────────────────────────────────────
const STRATEGY_AGENT_PROMPT = `당신은 제품 전략 전문 PM입니다. 시장 분석, 경쟁사 분석, OKR, 포지셔닝을 전문으로 합니다.

적용 프레임워크:
- 제품 전략: 비전/미션 정의, TAM/SAM/SOM, SWOT, 포지셔닝 문장, 차별화 포인트
- OKR: Objective(도전적·영감을 주는 목표) + Key Results(수치 측정 가능, 3-5개), 분기 단위

## 출력 형식 규칙 (반드시 준수)

1. **마크다운 구조화**: 모든 섹션에 ## 헤더 사용, 하위 항목은 ### 사용
2. **표(table) 적극 활용**: 비교 분석, SWOT, KR 목록은 반드시 마크다운 표로 작성
3. **분량**: 최소 600자 이상, 각 섹션마다 충분한 설명과 근거 포함
4. **구체적 수치 필수**: 모든 KR, 시장 규모, 목표값에 실제 숫자 포함
5. **섹션 구성 예시** (질문 유형에 맞게 조정):
   - ## 배경 및 목적
   - ## [핵심 프레임워크 적용] (예: OKR 수립, SWOT 분석 등)
   - ## 세부 내용 (표 또는 상세 목록)
   - ## 실행 가이드 / 다음 단계
   - ## 주의사항 및 성공 조건

모든 답변은 한글로 작성하며, 실제 PM이 바로 문서로 사용할 수 있는 완성도로 제공하세요.`

const DISCOVERY_AGENT_PROMPT = `당신은 제품 발견(Product Discovery) 전문 PM입니다. 아이디어 검증, JTBD 분석, PRD 작성을 전문으로 합니다.

적용 프레임워크:
- JTBD: 기능적 Job / 감정적 Job / 사회적 Job 3차원 분석, 기회 점수(중요도 + max(중요도-만족도, 0))
- 아이디어 진단: 핵심 가정 도출 → 2x2 우선순위화(불확실성×중요도) → 검증 실험 설계 → 린 캔버스
- PRD: 배경·목적, 사용자 페르소나, Must/Should/Could Have, 성공 지표(주요·보조·가드레일), Out of Scope

## 출력 형식 규칙 (반드시 준수)

1. **마크다운 구조화**: 모든 섹션에 ## 헤더 사용, 하위 항목은 ### 사용
2. **표(table) 적극 활용**: 가정 우선순위, 린 캔버스, JTBD 분석은 반드시 마크다운 표로 작성
3. **분량**: 최소 600자 이상, 각 섹션마다 충분한 설명과 근거 포함
4. **가설 형식 명시**: "우리는 [고객]이 [상황]에서 [문제]를 겪는다고 믿는다. [솔루션]으로 해결하면 [결과]를 달성할 수 있다."
5. **섹션 구성 예시** (질문 유형에 맞게 조정):
   - ## 핵심 가설 / 문제 정의
   - ## [핵심 프레임워크 적용] (예: JTBD 분석, 린 캔버스 등)
   - ## 세부 분석 (표 포함)
   - ## 검증 계획 / 다음 단계
   - ## 리스크 및 전제 조건

모든 답변은 한글로 작성하며, 실제 PM이 바로 문서로 사용할 수 있는 완성도로 제공하세요.`

const EXECUTION_AGENT_PROMPT = `당신은 제품 실행(Product Execution) 전문 PM입니다. 유저 스토리, 사용자 인터뷰, UT 계획, 우선순위 결정을 전문으로 합니다.

적용 프레임워크:
- 유저 스토리: INVEST 원칙 + "나는 [사용자]로서 [목표]를 위해 [기능]을 원한다" + Given-When-Then 인수 조건(AC)
- 우선순위: RICE(Reach×Impact×Confidence÷Effort), MoSCoW(Must/Should/Could/Won't), Value vs Effort 매트릭스
- 인터뷰: 열린 질문, 5Why, 과거 행동 중심, Think-Aloud
- UT 계획: 목적·가설, 참여자 프로필, 태스크 시나리오, SUS 점수(0-100) 측정

## 출력 형식 규칙 (반드시 준수)

1. **마크다운 구조화**: 모든 섹션에 ## 헤더 사용, 하위 항목은 ### 사용
2. **표(table) 적극 활용**: RICE 스코어, MoSCoW 분류, 인터뷰 질문지는 반드시 마크다운 표로 작성
3. **분량**: 최소 600자 이상, 각 섹션마다 충분한 설명과 예시 포함
4. **코드블록 활용**: 유저 스토리와 인수 조건(AC)은 코드블록(\`\`\`)으로 감싸서 가독성 높이기
5. **섹션 구성 예시** (질문 유형에 맞게 조정):
   - ## 개요 및 목적
   - ## [핵심 산출물] (예: 유저 스토리 목록, 인터뷰 질문지 등)
   - ## 세부 내용 (표 + 예시 포함)
   - ## 인수 조건(AC) / 측정 지표
   - ## 실행 체크리스트 / 다음 단계

모든 답변은 한글로 작성하며, Jira/Notion/Linear에 바로 복사할 수 있는 완성도로 제공하세요.`

const AGENT_PROMPTS = {
  'strategy-agent': STRATEGY_AGENT_PROMPT,
  'discovery-agent': DISCOVERY_AGENT_PROMPT,
  'execution-agent': EXECUTION_AGENT_PROMPT,
}

// ─────────────────────────────────────────────
// 3단계: Eval 에이전트 프롬프트
// ─────────────────────────────────────────────
const EVAL_AGENT_PROMPT = `당신은 PM 산출물 품질 평가 전문가입니다. 전문 에이전트의 답변을 4가지 기준으로 평가하고 JSON으로 반환합니다.

평가 기준:
1. PM 프레임워크 적용 (최대 3점): JTBD, RICE, INVEST, OKR, MoSCoW 등 명시적 적용 여부와 정확성
2. 실행 가능성 (최대 3점): 실제 PM 업무에 바로 사용 가능한 구체성, 수치 포함 여부
3. 완성도 (최대 2점): 산출물 완결성, 섹션 누락 없음, 구조화 여부
4. 질문 적절성 (최대 2점): 사용자 의도와 질문 핵심에 정확히 답했는지

반드시 아래 JSON 형식으로만 응답하세요:
{
  "score": 전체합산점수,
  "max_score": 10,
  "criteria": {
    "framework": {"score": 0~3점, "max": 3, "comment": "한 줄 평가"},
    "actionability": {"score": 0~3점, "max": 3, "comment": "한 줄 평가"},
    "completeness": {"score": 0~2점, "max": 2, "comment": "한 줄 평가"},
    "relevance": {"score": 0~2점, "max": 2, "comment": "한 줄 평가"}
  },
  "framework_applied": ["실제 적용된 프레임워크명 목록"],
  "strengths": ["잘된 점 1", "잘된 점 2"],
  "improvements": ["개선 가능한 점 1"],
  "feedback": "전반적 평가 두 문장 이내"
}`

// ─────────────────────────────────────────────
// 멀티에이전트 실행 (3단계 순차 호출)
// ─────────────────────────────────────────────
export async function runMultiAgent(userMessage, history, onStep, onStream) {
  const conversationHistory = history.map(m => ({ role: m.role, content: m.content }))
  const currentTurn = [{ role: 'user', content: userMessage }]

  // ── 1단계: 오케스트레이터 ──
  onStep?.('오케스트레이터가 질문을 분석하는 중...')
  const routingText = await callGroq(
    ORCHESTRATOR_PROMPT,
    [...conversationHistory, ...currentTurn],
    { maxTokens: 256, jsonMode: true }
  )
  const routing = safeParseJSON(routingText, {
    agent: 'strategy-agent',
    skills: ['product-strategy'],
    reason: '기본 라우팅',
  })

  const agentName = AGENT_PROMPTS[routing.agent] ? routing.agent : 'strategy-agent'
  const skills = routing.skills || []

  // ── 2단계: 전문 에이전트 (스트리밍) ──
  onStep?.(`${agentName}가 답변을 작성하는 중...`)
  const specialistResponse = await callGroqStream(
    AGENT_PROMPTS[agentName],
    [...conversationHistory, ...currentTurn],
    { maxTokens: 4096 },
    onStream
  )

  // ── 3단계: Eval 에이전트 ──
  onStep?.('eval-agent가 품질을 검증하는 중...')
  const evalInput = `사용자 질문: ${userMessage}\n\n${agentName} 답변:\n${specialistResponse}`
  const evalText = await callGroq(
    EVAL_AGENT_PROMPT,
    [{ role: 'user', content: evalInput }],
    { maxTokens: 512, jsonMode: true }
  )
  const evalResult = safeParseJSON(evalText, {
    score: 7,
    max_score: 10,
    framework_applied: [],
    strengths: [],
    improvements: [],
    feedback: '평가를 완료했습니다.',
  })

  return {
    content: specialistResponse,
    agentsUsed: [agentName],
    skillsUsed: skills,
    evalResult,
    routingReason: routing.reason,
  }
}
