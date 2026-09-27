import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMaintenanceItemsCsv, parseReserveFundCsv } from '../dashboard/lib/parse.js';
import { findChronicShortfalls, simulateLongTermPlan } from '../dashboard/lib/longTermPlanSimulator.js';

const reserveFund = parseReserveFundCsv(readFileSync('dashboard/data/reserve-fund-status.csv', 'utf-8'));
const items = parseMaintenanceItemsCsv(readFileSync('dashboard/data/maintenance-items.csv', 'utf-8'));
const results = simulateLongTermPlan(reserveFund, items);

describe('simulateLongTermPlan', () => {
  it('projects one row per simulated year, starting from the reserve fund snapshot year', () => {
    expect(results).toHaveLength(20);
    expect(results[0].year).toBe(2025);
    expect(results.at(-1).year).toBe(2044);
  });

  it('pays the exterior painting on schedule in 2026 at nominal cost (funds allow it)', () => {
    const year2026 = results.find((r) => r.year === 2026);
    const paid = year2026.paidItems.find((p) => p.name === '외벽도장');
    expect(paid).toMatchObject({ cost: 180_000_000, delayYears: 0 });
  });

  it('delays the roof waterproofing by a year, then pays it with 1-year delay inflation applied', () => {
    const year2026 = results.find((r) => r.year === 2026);
    expect(year2026.delayedItems.some((d) => d.name === '옥상방수')).toBe(true);

    const year2027 = results.find((r) => r.year === 2027);
    const paid = year2027.paidItems.find((p) => p.name === '옥상방수');
    expect(paid.delayYears).toBe(1);
    expect(paid.cost).toBe(Math.round(100_000_000 * 1.05));
  });

  it('never manages to fund the elevator replacement within the 20-year horizon', () => {
    const elevatorEverPaid = results.some((r) => r.paidItems.some((p) => p.name === '승강기 교체'));
    expect(elevatorEverPaid).toBe(false);
    expect(results.at(-1).delayedItems.some((d) => d.name === '승강기 교체')).toBe(true);
  });

  it('keeps the ending balance of one year equal to the starting balance of the next', () => {
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i + 1].startingBalance).toBe(results[i].endingBalance);
    }
  });
});

describe('findChronicShortfalls', () => {
  it('flags the elevator replacement as a chronic shortfall with the inflated cost and increase ratio', () => {
    const shortfalls = findChronicShortfalls(results);
    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0].name).toBe('승강기 교체');
    expect(shortfalls[0].currentCost).toBeGreaterThan(shortfalls[0].originalCost);
    expect(shortfalls[0].extraCostRatio).toBeGreaterThan(1); // 원가 대비 100%+ 증가
  });
});
