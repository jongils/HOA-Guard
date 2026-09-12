import { readFileSync } from 'node:fs';
import { parseExpensesCsv } from '../dashboard/lib/parse.js';
import { detectContractSplitting } from '../dashboard/lib/contractSplitting.js';
import { detectPriceOutliers } from '../dashboard/lib/priceOutlier.js';
import { detectRepeatedVendor } from '../dashboard/lib/repeatedVendor.js';
import { appendFlags } from './appendOnlyLog.js';

const records = parseExpensesCsv(readFileSync('dashboard/data/mock-expenses.csv', 'utf-8'));

const flags = [
  ...detectPriceOutliers(records),
  ...detectRepeatedVendor(records),
  ...detectContractSplitting(records),
];

console.log(`총 ${records.length}건의 지출 이력 중 ${flags.length}건의 이상탐지 플래그 발생\n`);

for (const flag of flags) {
  console.log(`[${flag.type}] ${flag.description}`);
  console.log('  판단 근거:', JSON.stringify(flag.reference));
  console.log();
}

if (flags.length > 0) {
  appendFlags(flags);
  console.log('플래그를 tools/output/anomaly-log.jsonl 에 append 했습니다.');
}
