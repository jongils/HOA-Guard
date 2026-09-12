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

### 1. 대시보드 보기 (npm 설치 불필요)

`dashboard/index.html`은 순수 HTML + JavaScript로, 열리는 순간 브라우저가 `dashboard/data/*.csv`를
직접 `fetch`해서 이상탐지·견적 비교를 그 자리에서 계산합니다. 미리 만들어 둘 빌드 결과물이 없고,
Node.js/npm도 필요 없습니다.

- **바로 보기**: **https://jongils.github.io/HOA-Guard/** (GitHub Pages, `main`에 push하면 자동 배포)
- **로컬에서 보기**: 브라우저가 `file://`로 연 페이지에서는 로컬 CSV `fetch`를 막을 수 있으므로,
  아무 정적 서버로 `dashboard/` 폴더를 띄워서 열어야 합니다. Node가 있다면:
  ```bash
  npm run serve   # http://localhost:8000 (외부 패키지 설치 없이 Node 내장 http만 사용)
  ```
  Node 없이도 `python3 -m http.server --directory dashboard`처럼 아무 정적 서버나 사용 가능합니다.

### 2. 데이터 수정하기 (재생성 단계 없음)

`dashboard/data/` 안의 CSV 파일만 고치면 됩니다 — GitHub 웹 UI에서 직접 편집해도 되고, 로컬에서
고쳐서 커밋해도 됩니다. `main`에 push되는 즉시 GitHub Pages가 재배포되고, 페이지를 새로고침하면
새 데이터로 다시 계산된 결과가 바로 보입니다. 별도의 "재생성" 커맨드가 없습니다.

- `dashboard/data/mock-expenses.csv` — 관리비 지출 이력
- `dashboard/data/market-bid-benchmarks.csv` — 유사 단지 낙찰가 데이터
- `dashboard/data/sample-quotes.csv` — 비교할 견적서

각 파일의 컬럼 형식은 기존 목업 데이터를 참고하세요.

### 3. 이상탐지·견적비교 로직

- **가격 이상탐지**: 같은 항목의 과거 계약 이력(월 단가로 정규화) 대비 20%+ 과다 견적 탐지
- **반복 수의계약 탐지**: 경쟁입찰 없이 동일 업체와 연속으로 수의계약을 반복하는 패턴 탐지
- **계약 쪼개기 탐지**: 입찰 기준액을 회피하기 위해 계약을 여러 건으로 분할한 패턴 탐지
- **견적 비교**: 유사 규모 단지(소형/중형/대형) 낙찰가 대비 시세 대비 20%+ 높으면 `HIGH`(고가 의심),
  ~17%+ 낮으면 `LOW`(품질/누락 확인 권장), 그 사이는 `NORMAL`
- **입찰 공고문 검증**: [`templates/bid-announcement-template.md`](templates/bid-announcement-template.md) 표준
  템플릿으로 작성한 공고문을 검증 — 공고 기간이 너무 짧거나, 특정 브랜드를 지정했거나, 평가 배점
  합계가 100점이 아니면 플래깅

모든 판정은 사용된 대조 데이터(과거 이력, 통계값, 임계값)를 `reference`로 함께 제공해
블랙박스 판정이 되지 않도록 합니다. 로직은 `dashboard/lib/`에 있으며, 대시보드(`dashboard/app.js`)와
아래 CLI 도구가 이 로직을 그대로 공유합니다.

### 4. 개발용 CLI / 테스트 (선택 사항 — npm 필요)

사이트를 "운영"하는 데는 필요 없고, 터미널에서 빠르게 리포트를 보거나 로직을 검증하고 싶을 때만 씁니다.

```bash
npm install
npm run detect             # 이상탐지 콘솔 리포트 (tools/output/anomaly-log.jsonl에 append-only 기록)
npm run compare-bids       # 견적 비교 콘솔 리포트
npm run check-announcement # 입찰 공고문 검증 예시 실행
npm test                   # dashboard/lib/ 로직 단위 테스트 (24개)
```

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
