import { readFileSync } from 'node:fs';
import { compareQuotes } from '../dashboard/lib/bidComparison.js';
import { parseBidBenchmarksCsv, parseQuoteSubmissionsCsv } from '../dashboard/lib/parse.js';

const benchmarks = parseBidBenchmarksCsv(readFileSync('dashboard/data/market-bid-benchmarks.csv', 'utf-8'));
const quotes = parseQuoteSubmissionsCsv(readFileSync('dashboard/data/sample-quotes.csv', 'utf-8'));

const results = compareQuotes(quotes, benchmarks);

console.log(`${quotes.length}건의 견적서를 유사 단지 낙찰가 데이터(${benchmarks.length}건)와 비교했습니다.\n`);

for (const result of results) {
  console.log(`[${result.verdict}] ${result.description}`);
  console.log('  판단 근거:', JSON.stringify(result.reference));
  console.log();
}
