import { readFileSync } from 'node:fs';
import type { BidBenchmark, ComplexSizeBand, QuoteSubmission } from '../types.js';
import { parseCsvRows } from './csv.js';

export function parseBidBenchmarksCsv(csv: string): BidBenchmark[] {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    category: row.category,
    complexSizeBand: row.complexSizeBand as ComplexSizeBand,
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    contractDate: row.contractDate,
    source: row.source,
  }));
}

export function loadBidBenchmarksFromFile(path: string): BidBenchmark[] {
  return parseBidBenchmarksCsv(readFileSync(path, 'utf-8'));
}

export function parseQuoteSubmissionsCsv(csv: string): QuoteSubmission[] {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    category: row.category,
    vendor: row.vendor,
    complexSizeBand: row.complexSizeBand as ComplexSizeBand,
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    submittedAt: row.submittedAt,
  }));
}

export function loadQuoteSubmissionsFromFile(path: string): QuoteSubmission[] {
  return parseQuoteSubmissionsCsv(readFileSync(path, 'utf-8'));
}
