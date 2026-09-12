import { appendFlags } from './appendOnlyLog.js';
import { loadExpensesFromFile } from './data/loadExpenses.js';
import { detectContractSplitting } from './detectors/contractSplitting.js';
import { detectPriceOutliers } from './detectors/priceOutlier.js';
import { detectRepeatedVendor } from './detectors/repeatedVendor.js';

const records = loadExpensesFromFile('data/mock-expenses.csv');

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
  console.log('플래그를 data/output/anomaly-log.jsonl 에 append 했습니다.');
}
