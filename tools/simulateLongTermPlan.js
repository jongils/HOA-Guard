import { readFileSync } from 'node:fs';
import { parseMaintenanceItemsCsv, parseReserveFundCsv } from '../dashboard/lib/parse.js';
import { findChronicShortfalls, simulateLongTermPlan } from '../dashboard/lib/longTermPlanSimulator.js';

const reserveFund = parseReserveFundCsv(readFileSync('dashboard/data/reserve-fund-status.csv', 'utf-8'));
const items = parseMaintenanceItemsCsv(readFileSync('dashboard/data/maintenance-items.csv', 'utf-8'));

const results = simulateLongTermPlan(reserveFund, items);

console.log(`${results[0].year}~${results.at(-1).year}년(${results.length}년) 장기수선계획 시뮬레이션\n`);

for (const year of results) {
  console.log(`[${year.year}] 기초 ${year.startingBalance.toLocaleString()}원 + 적립 ${year.contribution.toLocaleString()}원 → 기말 ${year.endingBalance.toLocaleString()}원`);
  for (const paid of year.paidItems) {
    console.log(`  집행: ${paid.name} ${paid.cost.toLocaleString()}원${paid.delayYears > 0 ? ` (${paid.delayYears}년 지연가)` : ''}`);
  }
  for (const delayed of year.delayedItems) {
    console.log(`  이월: ${delayed.name} ${delayed.currentCost.toLocaleString()}원 (${delayed.delayYears}년째 지연)`);
  }
}

const shortfalls = findChronicShortfalls(results);
console.log(`\n${results.length}년 내 끝내 집행하지 못한 항목: ${shortfalls.length}건`);
for (const s of shortfalls) {
  console.log(`  ${s.name}: 원가 ${s.originalCost.toLocaleString()}원 → 현재 ${s.currentCost.toLocaleString()}원 (${(s.extraCostRatio * 100).toFixed(0)}% 증가)`);
}
