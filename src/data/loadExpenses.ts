import { readFileSync } from 'node:fs';
import type { ExpenseRecord } from '../types.js';
import { parseCsvRows } from './csv.js';

export function parseExpensesCsv(csv: string): ExpenseRecord[] {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    contractDate: row.contractDate,
    vendor: row.vendor,
    category: row.category,
    contractType: row.contractType as ExpenseRecord['contractType'],
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    note: row.note,
  }));
}

export function loadExpensesFromFile(path: string): ExpenseRecord[] {
  return parseExpensesCsv(readFileSync(path, 'utf-8'));
}
