import { readFileSync } from 'node:fs';
import type { ExpenseRecord } from '../types.js';

export function parseExpensesCsv(csv: string): ExpenseRecord[] {
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = Object.fromEntries(header.map((key, i) => [key, cells[i]]));
    return {
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
    };
  });
}

export function loadExpensesFromFile(path: string): ExpenseRecord[] {
  return parseExpensesCsv(readFileSync(path, 'utf-8'));
}
