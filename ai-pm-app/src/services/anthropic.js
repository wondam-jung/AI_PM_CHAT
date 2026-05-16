const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

if (!GROQ_API_KEY) {
  console.warn('VITE_GROQ_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.')
}

const AI_PM_SYSTEM_PROMPT = `당신은 AI PM(Product Manager) 오케스트레이터입니다.
사용자의 Product 관련 질문에 전문적으로 답변하고, 필요에 따라 아래 전문 영역을 활용합니다.

전문 영역:
- 제품 전략: 시장 분석, 경쟁사 분석, OKR, 포지셔닝
- 제품 발견: 아이디어 검증, JTBD 분석, PRD 작성
- 제품 실행: 유저 스토리, 사용자 인터뷰, UT 계획, 우선순위 결정

응답 규칙:
1. 모든 답변은 한글로 제공한다
2. PM 전문 프레임워크(JTBD, RICE, INVEST, MoSCoW, OKR 등)를 명시적으로 적용한다
3. 실제 PM 업무에 바로 사용 가능한 구체적인 산출물을 제공한다
4. 답변 마지막에 메타데이터를 반드시 아래 JSON 형식으로 포함한다:
   {"agents_used": ["전략에이전트 또는 디스커버리에이전트 또는 실행에이전트"], "skills_used": ["사용한스킬명"]}

항상 구체적이고 실행 가능한 답변을 제공하세요.`

export async function sendMessage(messages) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: AI_PM_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'Groq API 요청 실패')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export function extractMetadata(responseText) {
  try {
    const jsonMatch = responseText.match(/\{[^{}]*"agents_used"[^{}]*\}/s)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // 파싱 실패 시 기본값
  }
  return { agents_used: [], skills_used: [] }
}
