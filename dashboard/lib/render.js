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
