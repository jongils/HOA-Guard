import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseExpensesCsv } from '../dashboard/lib/parse.js';
import { detectContractSplitting } from '../dashboard/lib/contractSplitting.js';
import { detectPriceOutliers } from '../dashboard/lib/priceOutlier.js';
import { detectRepeatedVendor } from '../dashboard/lib/repeatedVendor.js';

const records = parseExpensesCsv(readFileSync('dashboard/data/mock-expenses.csv', 'utf-8'));

describe('detectPriceOutliers', () => {
  const flags = detectPriceOutliers(records);

  it('flags the elevator maintenance price spike in 2024', () => {
    expect(flags.some((f) => f.recordIds.includes('4'))).toBe(true);
  });

  it('flags the fire-safety inspection price spike in 2024', () => {
    expect(flags.some((f) => f.recordIds.includes('19'))).toBe(true);
  });

  it('does not flag the landscaping category (stable, competitively bid prices)', () => {
    expect(flags.some((f) => f.category === '조경')).toBe(false);
  });

  it('does not flag the 2025 annual security contract against its 2024 quarterly-split history', () => {
    // The 2024 security contracts were split into quarters (smaller totals per contract).
    // Comparing raw totals against the 2025 annual renewal would falsely look like a price spike;
    // normalizing by periodMonths avoids that false positive.
    expect(flags.some((f) => f.recordIds.includes('28'))).toBe(false);
  });

  it('attaches historical reference data to every flag', () => {
    for (const flag of flags) {
      expect(flag.reference.historyMonthlyRates).toBeDefined();
      expect(flag.reference.historyMedianRate).toBeGreaterThan(0);
    }
  });
});

describe('detectRepeatedVendor', () => {
  const flags = detectRepeatedVendor(records);

  it('flags 5 consecutive uncompetitive contracts for elevator maintenance', () => {
    const flag = flags.find((f) => f.category === '승강기유지보수');
    expect(flag?.reference.consecutiveCount).toBe(5);
  });

  it('flags the 3-year streak for cleaning after the vendor returns', () => {
    const flag = flags.find((f) => f.category === '청소');
    expect(flag?.reference.consecutiveCount).toBe(3);
  });

  it('does not flag landscaping, which is competitively bid every year', () => {
    expect(flags.some((f) => f.category === '조경')).toBe(false);
  });

  it('flags security, since the 2023 annual contract and 2024 quarterly contracts form one streak', () => {
    const flag = flags.find((f) => f.category === '보안');
    expect(flag?.reference.consecutiveCount).toBe(5);
  });
});

describe('detectContractSplitting', () => {
  const flags = detectContractSplitting(records);

  it('flags the 2024 quarterly security contracts as split', () => {
    expect(flags).toHaveLength(1);
    expect(flags[0].category).toBe('보안');
    expect(flags[0].recordIds).toEqual(['24', '25', '26', '27']);
  });

  it('does not flag the single annual security contracts', () => {
    const flag = flags[0];
    expect(flag.recordIds).not.toContain('21');
    expect(flag.recordIds).not.toContain('28');
  });
});
