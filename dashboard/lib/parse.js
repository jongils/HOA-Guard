export function parseCsvRows(csv) {
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((key, i) => [key, cells[i]]));
  });
}

export function parseExpensesCsv(csv) {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    contractDate: row.contractDate,
    vendor: row.vendor,
    category: row.category,
    contractType: row.contractType,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unitPrice),
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    note: row.note,
  }));
}

export function parseBidBenchmarksCsv(csv) {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    category: row.category,
    complexSizeBand: row.complexSizeBand,
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    contractDate: row.contractDate,
    source: row.source,
  }));
}

export function parseQuoteSubmissionsCsv(csv) {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    category: row.category,
    vendor: row.vendor,
    complexSizeBand: row.complexSizeBand,
    amount: Number(row.amount),
    periodMonths: Number(row.periodMonths),
    submittedAt: row.submittedAt,
  }));
}

/** 단일 행짜리 CSV(현재 적립금 스냅샷)에서 첫 행만 파싱한다. */
export function parseReserveFundCsv(csv) {
  const [row] = parseCsvRows(csv);
  return {
    asOfDate: row.asOfDate,
    unitCount: Number(row.unitCount),
    currentBalance: Number(row.currentBalance),
    monthlyContributionPerUnit: Number(row.monthlyContributionPerUnit),
  };
}

export function parseMaintenanceItemsCsv(csv) {
  return parseCsvRows(csv).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    cycleYears: Number(row.cycleYears),
    lastPerformedYear: Number(row.lastPerformedYear),
    estimatedCost: Number(row.estimatedCost),
    delayInflationRate: Number(row.delayInflationRate),
  }));
}
