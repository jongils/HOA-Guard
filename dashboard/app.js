import { parseExpensesCsv, parseBidBenchmarksCsv, parseQuoteSubmissionsCsv } from './lib/parse.js';
import { detectPriceOutliers } from './lib/priceOutlier.js';
import { detectRepeatedVendor } from './lib/repeatedVendor.js';
import { detectContractSplitting } from './lib/contractSplitting.js';
import { compareQuotes } from './lib/bidComparison.js';
import { renderDashboardBody } from './lib/render.js';

async function loadCsv(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} 로드 실패 (HTTP ${res.status})`);
  return res.text();
}

async function main() {
  const [expensesCsv, benchmarksCsv, quotesCsv] = await Promise.all([
    loadCsv('data/mock-expenses.csv'),
    loadCsv('data/market-bid-benchmarks.csv'),
    loadCsv('data/sample-quotes.csv'),
  ]);

  const records = parseExpensesCsv(expensesCsv);
  const flags = [
    ...detectPriceOutliers(records),
    ...detectRepeatedVendor(records),
    ...detectContractSplitting(records),
  ];

  const benchmarks = parseBidBenchmarksCsv(benchmarksCsv);
  const quotes = parseQuoteSubmissionsCsv(quotesCsv);
  const bidResults = compareQuotes(quotes, benchmarks);

  document.getElementById('generated-at').textContent =
    `공동주택 관리비 지출 이상탐지 현황 · 조회 시각 ${new Date().toISOString()} (브라우저에서 실시간 계산)`;
  document.getElementById('app').innerHTML = renderDashboardBody(records, flags, bidResults);
}

main().catch((err) => {
  document.getElementById('app').innerHTML =
    `<p style="color:#dc2626">데이터를 불러오지 못했습니다: ${err.message}</p>
     <p class="muted-note">이 페이지는 CSV를 fetch로 직접 불러옵니다 — file://로 연 경우 브라우저가 로컬 파일 fetch를 막을 수 있습니다.
     GitHub Pages로 접속하거나, <code>dashboard</code> 폴더에서 로컬 정적 서버(예: <code>python3 -m http.server</code>)를 띄워 확인하세요.</p>`;
});
