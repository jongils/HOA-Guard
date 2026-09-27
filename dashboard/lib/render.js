const FLAG_LABELS = {
  PRICE_OUTLIER: '가격 이상탐지',
  REPEATED_VENDOR: '반복 수의계약',
  CONTRACT_SPLITTING: '계약 쪼개기',
};

const VERDICT_LABELS = {
  HIGH: '고가 의심',
  NORMAL: '적정 범위',
  LOW: '저가 의심',
  NO_BENCHMARK: '비교 데이터 없음',
};

export function won(amount) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function renderReferenceTable(reference) {
  const rows = Object.entries(reference)
    .map(([key, value]) => {
      const rendered = Array.isArray(value) || (value !== null && typeof value === 'object')
        ? escapeHtml(JSON.stringify(value))
        : escapeHtml(String(value));
      return `<tr><th>${escapeHtml(key)}</th><td>${rendered}</td></tr>`;
    })
    .join('');
  return `<table class="reference-table">${rows}</table>`;
}

function renderFlagCard(flag) {
  return `
    <article class="flag-card flag-${flag.type}">
      <div class="flag-card-header">
        <span class="badge badge-${flag.type}">${FLAG_LABELS[flag.type]}</span>
        <span class="flag-meta">${escapeHtml(flag.category)} · ${escapeHtml(flag.vendor)}</span>
      </div>
      <p class="flag-description">${escapeHtml(flag.description)}</p>
      <details>
        <summary>판단 근거(대조 데이터) 보기</summary>
        ${renderReferenceTable(flag.reference)}
      </details>
    </article>`;
}

function renderBidCard(result) {
  return `
    <article class="flag-card verdict-${result.verdict}">
      <div class="flag-card-header">
        <span class="badge verdict-badge-${result.verdict}">${VERDICT_LABELS[result.verdict]}</span>
        <span class="flag-meta">${escapeHtml(result.category)}(${escapeHtml(result.complexSizeBand)}) · ${escapeHtml(result.vendor)}</span>
      </div>
      <p class="flag-description">${escapeHtml(result.description)}</p>
      <details>
        <summary>판단 근거(대조 데이터) 보기</summary>
        ${renderReferenceTable(result.reference)}
      </details>
    </article>`;
}

function renderMaintenanceRow(yearRow) {
  const items = [...yearRow.paidItems.map((p) => ({ ...p, status: '집행' })), ...yearRow.delayedItems.map((d) => ({ ...d, status: '이월' }))];
  const itemsCell = items.length === 0
    ? '-'
    : items
        .map((it) => {
          const cost = it.cost ?? it.currentCost;
          const badge = it.status === '이월' ? 'badge-flagged' : 'verdict-badge-NORMAL';
          return `<span class="badge ${badge}">${escapeHtml(it.status)}</span> ${escapeHtml(it.name)} (${won(cost)}${it.delayYears > 0 ? `, ${it.delayYears}년 지연가` : ''})`;
        })
        .join('<br>');
  return `
    <tr>
      <td>${yearRow.year}</td>
      <td class="num">${won(yearRow.startingBalance)}</td>
      <td class="num">${won(yearRow.contribution)}</td>
      <td>${itemsCell}</td>
      <td class="num">${won(yearRow.endingBalance)}</td>
    </tr>`;
}

function renderShortfallCard(shortfall) {
  return `
    <article class="flag-card verdict-HIGH">
      <div class="flag-card-header">
        <span class="badge verdict-badge-HIGH">만성 자금 부족</span>
        <span class="flag-meta">${escapeHtml(shortfall.category)} · ${escapeHtml(shortfall.name)}</span>
      </div>
      <p class="flag-description">
        시뮬레이션 기간 내내 적립금이 부족해 ${shortfall.delayYears}년째 미집행 상태입니다.
        원래 예상 공사비 ${won(shortfall.originalCost)}가 지금 기준 ${won(shortfall.currentCost)}로
        ${(shortfall.extraCostRatio * 100).toFixed(0)}% 늘어난 상태입니다. 적립금 인상 등 대책 논의가 필요합니다.
      </p>
      <details>
        <summary>판단 근거(대조 데이터) 보기</summary>
        ${renderReferenceTable(shortfall)}
      </details>
    </article>`;
}

/** 적립금 현황·연도별 시뮬레이션·만성 자금 부족 항목을 받아 장기수선계획 섹션 HTML을 만든다. */
export function renderLongTermPlanSection(reserveFund, yearlyResults, chronicShortfalls) {
  const lastYear = yearlyResults.at(-1);
  return `
  <h2>장기수선계획 시뮬레이터 (${yearlyResults[0].year}~${lastYear.year}, ${yearlyResults.length}년)</h2>
  <div class="stats">
    <div class="stat-card"><div class="value">${won(reserveFund.currentBalance)}</div><div class="label">현재 적립금 (${escapeHtml(reserveFund.asOfDate)})</div></div>
    <div class="stat-card"><div class="value">${reserveFund.unitCount}</div><div class="label">세대수</div></div>
    <div class="stat-card"><div class="value">${won(reserveFund.monthlyContributionPerUnit * 12 * reserveFund.unitCount)}</div><div class="label">연간 적립액</div></div>
    <div class="stat-card"><div class="value">${chronicShortfalls.length}</div><div class="label">만성 자금 부족 항목</div></div>
  </div>
  ${chronicShortfalls.length > 0
    ? chronicShortfalls.map(renderShortfallCard).join('')
    : '<p>시뮬레이션 기간 내 자금 부족으로 미집행된 항목이 없습니다.</p>'}
  <details>
    <summary>연도별 상세 시뮬레이션 보기</summary>
    <div class="table-scroll">
      <table class="records">
        <thead><tr><th>연도</th><th class="num">기초 잔액</th><th class="num">연간 적립액</th><th>집행/이월 항목</th><th class="num">기말 잔액</th></tr></thead>
        <tbody>${yearlyResults.map(renderMaintenanceRow).join('')}</tbody>
      </table>
    </div>
  </details>
  <p class="muted-note">
    적립금이 부족한 해에는 가장 오래 밀린 항목부터 우선 집행하고, 집행하지 못한 항목은 다음 해로 이월되며
    매년 <code>delayInflationRate</code>만큼 공사비가 늘어난다고 가정합니다 (<code>dashboard/data/maintenance-items.csv</code>에서 조정 가능).
  </p>`;
}

export function renderExternalChannelsSection(channels, hasIssues) {
  return `
  <h2>외부 신고·비교 채널</h2>
  ${hasIssues ? '<p class="muted-note">위에서 이상탐지·자금 부족 항목이 발견됐다면, 아래 채널에서 추가로 확인하거나 신고할 수 있습니다.</p>' : ''}
  ${channels
    .map(
      (c) => `
    <article class="flag-card">
      <div class="flag-card-header"><span class="flag-meta">${escapeHtml(c.operator)}</span></div>
      <p class="flag-description"><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.description)}</p>
    </article>`,
    )
    .join('')}
  <p class="muted-note">이 프로토타입은 실제 API 연동이 아니라 참고용 안내입니다. 실제 접속 전 각 기관의 공식 웹사이트 주소를 직접 확인하세요.</p>`;
}

function renderRecordRow(record, flaggedIds) {
  const isFlagged = flaggedIds.has(record.id);
  return `
    <tr class="${isFlagged ? 'flagged-row' : ''}">
      <td>${escapeHtml(record.contractDate)}</td>
      <td>${escapeHtml(record.category)}</td>
      <td>${escapeHtml(record.vendor)}</td>
      <td>${escapeHtml(record.contractType)}</td>
      <td class="num">${won(record.amount)}</td>
      <td>${isFlagged ? '<span class="badge badge-flagged">이상탐지</span>' : ''}</td>
    </tr>`;
}

/** records/flags/bidResults를 받아 대시보드 본문(.wrap 안, 헤더·거버넌스 문구 제외) HTML을 만든다. */
export function renderDashboardBody(records, flags, bidResults) {
  const flaggedIds = new Set(flags.flatMap((f) => f.recordIds));
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const countByType = (type) => flags.filter((f) => f.type === type).length;
  const countByVerdict = (verdict) => bidResults.filter((r) => r.verdict === verdict).length;
  const sortedRecords = [...records].sort((a, b) => a.contractDate.localeCompare(b.contractDate));

  return `
  <div class="stats">
    <div class="stat-card"><div class="value">${records.length}</div><div class="label">총 지출 건수</div></div>
    <div class="stat-card"><div class="value">${won(totalAmount)}</div><div class="label">총 지출액</div></div>
    <div class="stat-card"><div class="value">${flags.length}</div><div class="label">이상탐지 플래그</div></div>
    <div class="stat-card"><div class="value">${countByType('PRICE_OUTLIER')}</div><div class="label">가격 이상탐지</div></div>
    <div class="stat-card"><div class="value">${countByType('REPEATED_VENDOR')}</div><div class="label">반복 수의계약</div></div>
    <div class="stat-card"><div class="value">${countByType('CONTRACT_SPLITTING')}</div><div class="label">계약 쪼개기</div></div>
  </div>

  <h2>이상탐지 내역 (${flags.length}건)</h2>
  ${flags.length > 0 ? flags.map(renderFlagCard).join('') : '<p>현재 이상탐지된 항목이 없습니다.</p>'}

  <h2>전체 지출 내역 (${records.length}건)</h2>
  <div class="table-scroll">
    <table class="records">
      <thead><tr><th>계약일</th><th>항목</th><th>업체</th><th>계약방식</th><th class="num">금액</th><th>상태</th></tr></thead>
      <tbody>${sortedRecords.map((r) => renderRecordRow(r, flaggedIds)).join('')}</tbody>
    </table>
  </div>

  <h2>입찰 비교 어시스턴트 — 견적 대조 (${bidResults.length}건)</h2>
  <div class="stats">
    <div class="stat-card"><div class="value">${countByVerdict('HIGH')}</div><div class="label">고가 의심</div></div>
    <div class="stat-card"><div class="value">${countByVerdict('NORMAL')}</div><div class="label">적정 범위</div></div>
    <div class="stat-card"><div class="value">${countByVerdict('LOW')}</div><div class="label">저가 의심</div></div>
  </div>
  ${bidResults.length > 0 ? bidResults.map(renderBidCard).join('') : '<p>비교할 견적서가 없습니다.</p>'}
  <p class="muted-note">
    유사 규모 단지(소형/중형/대형) 낙찰가 데이터(<code>dashboard/data/market-bid-benchmarks.csv</code>) 대비
    월 단가 기준으로 비교한 결과입니다. 입찰 공고문 표준 템플릿과 특정업체 유리 조건 검사는
    <a href="https://github.com/jongils/HOA-Guard/blob/main/templates/bid-announcement-template.md">templates/bid-announcement-template.md</a>와
    <code>npm run check-announcement</code>를 참고하세요.
  </p>`;
}
