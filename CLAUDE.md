# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

건설회사 그룹(3사 통합관리 + 남광토건/극동건설/금광기업)의 조직도 및 인사정보를 관리하는 웹 애플리케이션.
임원이 부서/부서원을 파악하고, 직원이 PDF 이력서 기반으로 인사정보를 자가 등록하는 시스템.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router) + TypeScript + React 19
- **스타일링**: Tailwind CSS 4
- **DB**: SQLite (Prisma 6 ORM, `prisma/dev.db`)
- **인증**: 쿠키 기반 HMAC 세션 (bcryptjs)
- **AI**: Google Gemini Flash (이력서 PDF 추출)
- **파일 업로드**: 이력서 PDF → `public/uploads/`

## 주요 명령어

```bash
npm run dev              # 개발 서버 (http://localhost:3000)
npm run build            # 프로덕션 빌드
npm run db:push          # Prisma 스키마를 DB에 반영
npm run db:generate      # Prisma 클라이언트 재생성
npx tsx prisma/seed.ts   # 시드 데이터 생성 (기존 데이터 초기화됨)
```

## 계정

- 관리자: `admin@nk.com` / `admin`

## 라우팅 구조

```
/ ........................ 홈 (회사 배너, 비로그인 시 배너 숨김)
├── (app)/ ............... Navbar 레이아웃 그룹
│   ├── login ............ 로그인
│   ├── signup ........... 회원가입
│   ├── register ......... 인사정보 등록 (2단계: PDF→폼)
│   ├── profile .......... 프로필 카드
│   ├── dashboard ........ 팀별 대시보드 (?company= 필터)
│   └── admin/
│       └── teams ........ 팀 관리 (ADMIN 전용)
└── api/
    ├── auth/ ............ register, login, logout, me
    ├── admin/ ........... locations CRUD, teams CRUD
    ├── employees/ ....... CRUD (ACTIVE 필터)
    ├── teams/ ........... 목록 (company, type 필터)
    ├── extract-resume/ .. Gemini Flash PDF 추출
    └── upload/ .......... PDF 업로드
```

## 데이터 모델

- **User**: 계정 (email, password, role: ADMIN/EMPLOYEE)
- **Location**: 거점 (company: 회사명, type: HQ/SITE, name)
- **Team**: 팀 (Location 소속)
- **Employee**: 직원 (Team 소속, User 1:1 연결, status: ACTIVE/INACTIVE)

## 조직 구조

- **3사 통합관리**: 3사 공통 조직 (재무관리팀, 법무팀, 감사팀 등)
- **남광토건/극동건설/금광기업**: 각 회사별 본사/현장 → 팀
- 대시보드에서 각 회사 선택 시 3사 통합관리 부서가 맨 위에 함께 표시

## 핵심 규칙

- 회사 구분: `Location.company` (3사 통합관리/남광토건/극동건설/금광기업)
- 직급(`position`): 사원, 대리, 과장, 차장, 부장
- 직책(`role`): 팀원, 팀장, 부서장
- "팀원" = 팀장을 제외한 팀 구성원
- 조직도: 팀장은 수평선 왼쪽 끝에 직접 연결, 팀원은 위로 수직선 연결
  - 4명 이하: 전부 수평선 위
  - 5명 이상: 교차 배치 (위→아래→위→아래)
  - 직급 높은 순으로 왼쪽부터 배치
- 홈 배너: 비로그인 시 숨김, 로그인 시 표시
- 관리자: 팀원 정보 수정/삭제/부서이동 가능
- 인사정보 등록: PDF 드래그앤드롭 → Gemini AI 추출 → 폼 수정 → 등록 → 프로필 카드
- 경로 alias: `@/*` → `./src/*`
