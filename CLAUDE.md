# AI PM 프로젝트 규칙

## 진행 원칙
- 프로젝트는 단계적으로 진행한다. 각 단계가 완료된 후 다음 단계로 넘어간다.
- 작업 완료 후 즉시 배포하지 않는다. 항상 TC를 작성하고 코드 레벨 테스트 수행 결과를 리포팅한다.
- 사용자가 직접 검증해야 하는 항목은 명확히 구분하여 안내한다.
- 모든 산출물과 서비스의 기본 언어는 한글로 제공한다.

## 작업 기록
- 모든 작업 완료 후 project_log.md에 날짜, 작업 내용, 완료 여부, 다음 단계를 기록한다.

## 환경변수 관리
- 모든 민감 정보(API Key, DB 접속 정보 등)는 .env 파일로 관리한다.
- .env 파일은 반드시 .gitignore에 포함한다.
- .env.example 파일을 제공하여 필요한 환경변수 목록을 문서화한다.

## 기술 스택
- Frontend: React + Vite
- DB: Supabase (MCP 연동)
- AI: Anthropic Claude API (@anthropic-ai/sdk)
- 소스코드 관리: GitHub
- 배포: Vercel

## 에이전트 구성
- ai-pm: 오케스트레이션 에이전트 (사용자 요청 라우팅)
- strategy-agent: 시장/경쟁사/OKR 전략 전문
- discovery-agent: 아이디어 검증, PRD, JTBD 전문
- execution-agent: 유저 스토리, 인터뷰, UT 계획 전문
- eval-agent: 답변 품질 평가 (JSON 반환)

## PM 스킬 목록
product-strategy, okr-analysis, user-interview, idea-diagnosis, jtbd,
prd-writing, prioritization, user-story-writing, ut-planning

## 진행 단계
1. 프로젝트 계획 및 기반 설정
2. Agent 및 Skill 정의
3. React + Vite 앱 구조 설정
4. DB 연동 (Supabase)
5. 로컬 테스트
6. GitHub 연동 및 Vercel 배포
