# HOA-Guard (공동주택 AI 감사관)

**HOA**는 "Homeowners Association"(입주자대표회의/공동주택 관리조합)의 약자입니다.

아파트 관리사무소·입주자대표회의의 비리(관리비 부정지출, 수의계약 유착, 입찰 조작 등)를 줄이기 위한
**AI 기반 투명성/감사 시스템**입니다.

## 핵심 원칙

AI는 의결권을 갖지 않습니다. 의사결정 주체(입주자대표회의)는 그대로 유지하되, 그 위에
**강제적인 투명성/이상탐지 레이어**를 씌웁니다. 목표는 "정보 비대칭 해소"이지 "인간 대체"가 아닙니다.

- AI에게 의결권/승인권을 주는 기능은 만들지 않습니다.
- 모든 이상탐지 결과는 판단 근거(대조 데이터)를 함께 제시합니다 — 블랙박스 판정 금지.
- 로그는 append-only 구조로 설계합니다 (수정/삭제 이력이 남아야 함).

## 시스템 구성

1. **지출 이상탐지 엔진** — 관리비 지출/계약 데이터 기반 이상치 탐지, 대표회의·주민 앱 동시 알림
2. **계약/입찰 비교 어시스턴트** — 견적서 대조 리포트, 입찰 공고문 표준화
3. **투명성 아카이브 + 자동 요약** — 회의록/계약서/예결산 자연어 요약
4. **장기수선계획 시뮬레이터** — 노후도·적립금 기반 장기 수선 시나리오
5. **외부 연동 감사 채널** — 구청/K-apt 연동, 이상탐지 발생 시 신고 절차 연결

## 도입 우선순위

1. 1단계 (MVP): 지출 이상탐지 + 공개 대시보드
2. 2단계: 입찰 비교 어시스턴트
3. 3단계: 장기수선계획 시뮬레이터 + 외부 감사 연동

## 현재 상태

1단계 MVP(지출 이상탐지 엔진 + 공개 대시보드) 프로토타입 구현 완료, 2단계(입찰 비교 어시스턴트) 프로토타입
구현 중. 자세한 배경은 [`docs/handoff.md`](docs/handoff.md)를 참고하세요.

## 사용 방법

### 1. 설치

```bash
npm install
```

### 2. 지출 이상탐지 엔진 실행

기술 스택: Node.js + TypeScript. `data/mock-expenses.csv`의 목업 관리비 지출 데이터를 대상으로
아래 3가지 이상탐지 로직을 검증합니다.

- **가격 이상탐지**: 같은 항목의 과거 계약 이력(월 단가로 정규화) 대비 20%+ 과다 견적 탐지
- **반복 수의계약 탐지**: 경쟁입찰 없이 동일 업체와 연속으로 수의계약을 반복하는 패턴 탐지
- **계약 쪼개기 탐지**: 입찰 기준액을 회피하기 위해 계약을 여러 건으로 분할한 패턴 탐지

```bash
npm run detect     # 이상탐지 실행 및 콘솔 리포트 출력
npm test           # 탐지 로직 단위 테스트
npm run typecheck  # 타입 검사
```

모든 플래그는 판단에 사용된 대조 데이터(과거 이력, 통계값, 임계값)를 `reference` 필드에 함께 담아
블랙박스 판정이 되지 않도록 합니다. 플래그는 `data/output/anomaly-log.jsonl`에 append-only로 기록됩니다.

실제 데이터로 검증하려면 `data/mock-expenses.csv`를 같은 형식(계약일/업체/항목/계약방식/금액/계약기간)의
실데이터로 교체한 뒤 다시 실행하면 됩니다.

### 3. 공개 대시보드 생성 및 확인

```bash
npm run dashboard   # dashboard/index.html 생성
```

외부 서버 없이 브라우저에서 파일을 바로 열어보거나, 정적 호스팅할 수 있습니다. 전체 지출 내역과
이상탐지 플래그, 견적서 시세 비교 결과, 각 판정의 판단 근거(대조 데이터)를 한 화면에서 확인할 수 있습니다.

`main`에 `dashboard/**` 변경이 push되면 `.github/workflows/deploy-pages.yml`이 자동으로
GitHub Pages에 배포합니다 → **https://jongils.github.io/HOA-Guard/**

### 4. 입찰 비교 어시스턴트 (2단계, 프로토타입)

견적서를 유사 규모 단지(소형/중형/대형)의 실제 낙찰가 데이터(`data/market-bid-benchmarks.csv`)와
자동 대조합니다. 1단계 이상탐지 엔진과 같은 방식(월 단가 정규화, 판단 근거 공개)으로 동작합니다.

```bash
npm run compare-bids       # data/sample-quotes.csv의 견적을 시세와 비교
npm run check-announcement # 입찰 공고문 표준 조건(공고기간/브랜드 지정/배점표) 검증 예시 실행
```

- **견적 비교**: 시세 대비 20%+ 높으면 `HIGH`(고가 의심), ~17%+ 낮으면 `LOW`(품질/누락 확인 권장), 그 사이는 `NORMAL`
- **입찰 공고문 검증**: [`templates/bid-announcement-template.md`](templates/bid-announcement-template.md) 표준 템플릿으로
  작성한 공고문을 `checkAnnouncement()`로 검증 — 공고 기간이 너무 짧거나, 특정 브랜드를 지정했거나,
  평가 배점 합계가 100점이 아니면 플래깅

### 5. GitHub 이슈/PR에서 Claude 호출 (`@claude`)

이슈나 PR 코멘트에 `@claude`를 멘션하면 [Claude Code Action](https://github.com/anthropics/claude-code-action)이
자동으로 응답하거나 작업합니다 (`.github/workflows/claude.yml`). 최초 1회만 아래 설정이 필요합니다 (설정 완료됨).

1. Claude Code CLI가 설치된 환경에서 로그인용 OAuth 토큰을 발급합니다.
   ```bash
   claude setup-token
   ```
2. 발급된 토큰을 저장소 시크릿으로 등록합니다.
   `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: 위에서 발급받은 토큰
3. 이슈나 PR 코멘트에 `@claude 이 함수 리팩터링 해줘` 처럼 멘션하면 워크플로가 트리거됩니다.
