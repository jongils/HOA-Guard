import { mkdirSync, writeFileSync } from 'node:fs';
import { compareQuotes } from './bidComparison.js';
import { loadBidBenchmarksFromFile, loadQuoteSubmissionsFromFile } from './data/loadBidData.js';
import { loadExpensesFromFile } from './data/loadExpenses.js';
import { detectContractSplitting } from './detectors/contractSplitting.js';
import { detectPriceOutliers } from './detectors/priceOutlier.js';
import { detectRepeatedVendor } from './detectors/repeatedVendor.js';
import type { AnomalyFlag, BidComparisonResult, ExpenseRecord } from './types.js';

const OUTPUT_PATH = 'dashboard/index.html';

const FLAG_LABELS: Record<AnomalyFlag['type'], string> = {
  PRICE_OUTLIER: '가격 이상탐지',
  REPEATED_VENDOR: '반복 수의계약',
  CONTRACT_SPLITTING: '계약 쪼개기',
};

const VERDICT_LABELS: Record<BidComparisonResult['verdict'], string> = {
  HIGH: '고가 의심',
  NORMAL: '적정 범위',
  LOW: '저가 의심',
  NO_BENCHMARK: '비교 데이터 없음',
};

function won(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function renderReferenceTable(reference: Record<string, unknown>): string {
  const rows = Object.entries(reference)
    .map(([key, value]) => {
      const rendered = Array.isArray(value) || typeof value === 'object'
        ? escapeHtml(JSON.stringify(value))
        : escapeHtml(String(value));
      return `<tr><th>${escapeHtml(key)}</th><td>${rendered}</td></tr>`;
    })
    .join('');
  return `<table class="reference-table">${rows}</table>`;
}

function renderFlagCard(flag: AnomalyFlag): string {
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

function renderBidCard(result: BidComparisonResult): string {
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

function renderRecordRow(record: ExpenseRecord, flaggedIds: Set<string>): string {
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

function buildHtml(records: ExpenseRecord[], flags: AnomalyFlag[], bidResults: BidComparisonResult[]): string {
  const flaggedIds = new Set(flags.flatMap((f) => f.recordIds));
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
  const countByType = (type: AnomalyFlag['type']) => flags.filter((f) => f.type === type).length;
  const countByVerdict = (verdict: BidComparisonResult['verdict']) => bidResults.filter((r) => r.verdict === verdict).length;
  const sortedRecords = [...records].sort((a, b) => a.contractDate.localeCompare(b.contractDate));
  const generatedAt = new Date().toISOString();

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HOA-Guard 공개 대시보드</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f7f7f5; --card-bg: #ffffff; --text: #1f2328; --muted: #6b7280;
    --border: #e5e7eb; --accent: #2563eb;
    --price: #dc2626; --vendor: #d97706; --split: #7c3aed; --flagged: #b91c1c;
    --verdict-high: #dc2626; --verdict-normal: #16a34a; --verdict-low: #d97706; --verdict-none: #6b7280;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #16181d; --card-bg: #1f2228; --text: #e5e7eb; --muted: #9ca3af; --border: #333844; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
  .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
  header h1 { margin: 0 0 4px; font-size: 1.6rem; }
  header p { margin: 0; color: var(--muted); font-size: 0.9rem; }
  .governance { margin: 20px 0; padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); font-size: 0.85rem; color: var(--muted); }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 24px 0; }
  .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .stat-card .value { font-size: 1.4rem; font-weight: 700; }
  .stat-card .label { font-size: 0.8rem; color: var(--muted); }
  h2 { font-size: 1.1rem; margin: 32px 0 12px; }
  .flag-card { background: var(--card-bg); border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
  .flag-PRICE_OUTLIER { border-left-color: var(--price); }
  .flag-REPEATED_VENDOR { border-left-color: var(--vendor); }
  .flag-CONTRACT_SPLITTING { border-left-color: var(--split); }
  .verdict-HIGH { border-left-color: var(--verdict-high); }
  .verdict-NORMAL { border-left-color: var(--verdict-normal); }
  .verdict-LOW { border-left-color: var(--verdict-low); }
  .verdict-NO_BENCHMARK { border-left-color: var(--verdict-none); }
  .flag-card-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
  .flag-meta { color: var(--muted); font-size: 0.85rem; }
  .flag-description { margin: 6px 0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; color: #fff; }
  .badge-PRICE_OUTLIER { background: var(--price); }
  .badge-REPEATED_VENDOR { background: var(--vendor); }
  .badge-CONTRACT_SPLITTING { background: var(--split); }
  .badge-flagged { background: var(--flagged); }
  .verdict-badge-HIGH { background: var(--verdict-high); }
  .verdict-badge-NORMAL { background: var(--verdict-normal); }
  .verdict-badge-LOW { background: var(--verdict-low); }
  .verdict-badge-NO_BENCHMARK { background: var(--verdict-none); }
  details summary { cursor: pointer; color: var(--accent); font-size: 0.85rem; }
  .reference-table { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: 0.8rem; }
  .reference-table th, .reference-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--border); word-break: break-all; }
  .reference-table th { width: 40%; color: var(--muted); font-weight: 500; }
  table.records { width: 100%; border-collapse: collapse; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; font-size: 0.85rem; }
  table.records th, table.records td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }
  table.records .num { text-align: right; }
  .flagged-row { background: rgba(220, 38, 38, 0.07); }
  .table-scroll { overflow-x: auto; }
  .muted-note { color: var(--muted); font-size: 0.85rem; }
  footer { margin-top: 40px; color: var(--muted); font-size: 0.78rem; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>HOA-Guard 공개 대시보드</h1>
    <p>공동주택 관리비 지출 이상탐지 현황 · 생성 시각 ${escapeHtml(generatedAt)}</p>
  </header>

  <div class="governance">
    이 대시보드는 <strong>AI 의결권을 갖지 않습니다.</strong> 아래 표시된 항목은 판단이 아니라 대표회의와 주민이
    함께 확인해야 할 <strong>대조 데이터 기반 이상탐지 결과</strong>입니다. 모든 플래그에는 판단 근거를 함께
    공개합니다 (블랙박스 판정 금지). 현재 데이터는 프로토타입 검증용 목업입니다.
  </div>

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
    유사 규모 단지(소형/중형/대형) 낙찰가 데이터(<code>data/market-bid-benchmarks.csv</code>) 대비
    월 단가 기준으로 비교한 결과입니다. 입찰 공고문 표준 템플릿과 특정업체 유리 조건 검사는
    <a href="https://github.com/jongils/HOA-Guard/blob/main/templates/bid-announcement-template.md">templates/bid-announcement-template.md</a>와
    <code>npm run check-announcement</code>를 참고하세요.
  </p>

  <footer>
    HOA-Guard 프로토타입 · data/mock-expenses.csv 기반 · <code>npm run dashboard</code>로 재생성
  </footer>
</div>
</body>
</html>
`;
}

const records = loadExpensesFromFile('data/mock-expenses.csv');
const flags = [
  ...detectPriceOutliers(records),
  ...detectRepeatedVendor(records),
  ...detectContractSplitting(records),
];

const benchmarks = loadBidBenchmarksFromFile('data/market-bid-benchmarks.csv');
const quotes = loadQuoteSubmissionsFromFile('data/sample-quotes.csv');
const bidResults = compareQuotes(quotes, benchmarks);

mkdirSync('dashboard', { recursive: true });
writeFileSync(OUTPUT_PATH, buildHtml(records, flags, bidResults), 'utf-8');
console.log(`대시보드를 생성했습니다: ${OUTPUT_PATH} (지출 ${records.length}건, 플래그 ${flags.length}건, 견적 비교 ${bidResults.length}건)`);
