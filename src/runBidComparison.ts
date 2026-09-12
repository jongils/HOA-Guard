import { compareQuotes } from './bidComparison.js';
import { loadBidBenchmarksFromFile, loadQuoteSubmissionsFromFile } from './data/loadBidData.js';

const benchmarks = loadBidBenchmarksFromFile('data/market-bid-benchmarks.csv');
const quotes = loadQuoteSubmissionsFromFile('data/sample-quotes.csv');

const results = compareQuotes(quotes, benchmarks);

console.log(`${quotes.length}건의 견적서를 유사 단지 낙찰가 데이터(${benchmarks.length}건)와 비교했습니다.\n`);

for (const result of results) {
  console.log(`[${result.verdict}] ${result.description}`);
  console.log('  판단 근거:', JSON.stringify(result.reference));
  console.log();
}
