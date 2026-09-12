import { describe, expect, it } from 'vitest';
import { compareQuote, compareQuotes } from '../src/bidComparison.js';
import { loadBidBenchmarksFromFile, loadQuoteSubmissionsFromFile } from '../src/data/loadBidData.js';
import type { QuoteSubmission } from '../src/types.js';

const benchmarks = loadBidBenchmarksFromFile('data/market-bid-benchmarks.csv');
const quotes = loadQuoteSubmissionsFromFile('data/sample-quotes.csv');
const results = compareQuotes(quotes, benchmarks);

describe('compareQuotes with sample data', () => {
  it('flags the overpriced elevator maintenance quote as HIGH', () => {
    const result = results.find((r) => r.quoteId === '1');
    expect(result?.verdict).toBe('HIGH');
  });

  it('treats the market-rate cleaning quote for a large complex as NORMAL', () => {
    const result = results.find((r) => r.quoteId === '2');
    expect(result?.verdict).toBe('NORMAL');
  });

  it('flags the overpriced security quote as HIGH', () => {
    const result = results.find((r) => r.quoteId === '3');
    expect(result?.verdict).toBe('HIGH');
  });

  it('treats the market-rate small-complex elevator quote as NORMAL', () => {
    const result = results.find((r) => r.quoteId === '4');
    expect(result?.verdict).toBe('NORMAL');
  });

  it('flags the unusually cheap cleaning quote as LOW', () => {
    const result = results.find((r) => r.quoteId === '5');
    expect(result?.verdict).toBe('LOW');
  });

  it('attaches benchmark reference data to every comparison', () => {
    for (const result of results) {
      expect(result.reference.benchmarkSampleSize).toBeGreaterThan(0);
      expect(result.reference.benchmarkMedianRate).toBeGreaterThan(0);
    }
  });
});

describe('compareQuote with no matching benchmark', () => {
  it('returns NO_BENCHMARK when the category/size band has no comparable data', () => {
    const quote: QuoteSubmission = {
      id: '99',
      category: '조경',
      vendor: '테스트조경',
      complexSizeBand: '소형',
      amount: 5_000_000,
      periodMonths: 12,
      submittedAt: '2025-09-01',
    };
    const result = compareQuote(quote, benchmarks);
    expect(result.verdict).toBe('NO_BENCHMARK');
  });
});
