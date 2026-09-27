const DEFAULT_YEARS_TO_SIMULATE = 20;

/**
 * 적립금 현황과 장기수선계획 항목을 바탕으로 향후 N년간 연도별 수선 시나리오를 시뮬레이션한다.
 *
 * 규칙:
 * - 매년 연간 적립액(세대수 × 월 적립액 × 12)이 먼저 쌓인다.
 * - 예정 연도가 된 항목부터(가장 오래 밀린 항목 우선) 적립금이 허용하는 만큼 순서대로 집행한다.
 * - 적립금이 부족해 그 해에 집행하지 못한 항목은 다음 해로 이월되며, 밀린 연수만큼
 *   `estimatedCost * (1 + delayInflationRate) ^ delayYears`로 공사비가 불어난다고 가정한다
 *   (공사 지연 시 비용 증가 반영). 항목이 집행되면 다음 주기로 예정 연도가 갱신된다.
 * - 여러 항목이 동시에 자금 부족을 겪을 때는 원래 예정 연도가 이를수록(더 오래 밀린 항목일수록)
 *   먼저 지급을 시도한다 — 임의 우선순위가 아니라 "얼마나 오래 미뤄졌는가"라는 근거로 결정한다.
 */
export function simulateLongTermPlan(reserveFund, maintenanceItems, options = {}) {
  const yearsToSimulate = options.yearsToSimulate ?? DEFAULT_YEARS_TO_SIMULATE;
  const startYear = new Date(reserveFund.asOfDate).getFullYear();
  const annualContribution = reserveFund.monthlyContributionPerUnit * 12 * reserveFund.unitCount;

  const state = maintenanceItems.map((item) => ({
    ...item,
    nextDueYear: item.lastPerformedYear + item.cycleYears,
  }));

  let balance = reserveFund.currentBalance;
  const yearlyResults = [];

  for (let year = startYear; year < startYear + yearsToSimulate; year++) {
    const startingBalance = balance;
    balance += annualContribution;

    const dueItems = state
      .filter((item) => item.nextDueYear <= year)
      .sort((a, b) => a.nextDueYear - b.nextDueYear || a.id.localeCompare(b.id));

    const paidItems = [];
    const delayedItems = [];

    for (const item of dueItems) {
      const delayYears = year - item.nextDueYear;
      const cost = item.estimatedCost * (1 + item.delayInflationRate) ** delayYears;

      if (balance >= cost) {
        balance -= cost;
        paidItems.push({ id: item.id, name: item.name, category: item.category, cost: Math.round(cost), delayYears });
        item.nextDueYear = year + item.cycleYears;
      } else {
        delayedItems.push({
          id: item.id,
          name: item.name,
          category: item.category,
          originalCost: item.estimatedCost,
          currentCost: Math.round(cost),
          delayYears,
        });
      }
    }

    yearlyResults.push({
      year,
      startingBalance: Math.round(startingBalance),
      contribution: annualContribution,
      paidItems,
      delayedItems,
      endingBalance: Math.round(balance),
    });
  }

  return yearlyResults;
}

/** 시뮬레이션 마지막 해에도 집행되지 못한 항목 = 이 기간 안에 감당하지 못한 만성 자금 부족 항목. */
export function findChronicShortfalls(yearlyResults) {
  const lastYear = yearlyResults[yearlyResults.length - 1];
  return lastYear.delayedItems.map((item) => ({
    ...item,
    extraCost: item.currentCost - item.originalCost,
    extraCostRatio: Number((item.currentCost / item.originalCost - 1).toFixed(3)),
  }));
}
