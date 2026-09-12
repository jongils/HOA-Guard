import type { AnomalyFlag, ExpenseRecord } from '../types.js';
import { groupBy } from './groupBy.js';
import { iqrBounds, median, zScore } from './stats.js';

const DEFAULT_THRESHOLD_RATIO = 1.2; // 시세(과거 이력) 대비 20%+ 과다 견적

export interface PriceOutlierOptions {
  thresholdRatio?: number;
}

/**
 * 같은 카테고리의 "과거" 계약만을 비교군으로 사용한다 (미래 데이터 참조 방지).
 * 비교할 과거 이력이 없는 최초 계약은 판단 근거가 없어 대상에서 제외한다.
 * 계약 기간(연간/분기 등)이 다른 계약끼리 총액을 그대로 비교하면 왜곡되므로,
 * 월 단가(amount / periodMonths)로 정규화한 뒤 비교한다.
 */
export function detectPriceOutliers(
  records: ExpenseRecord[],
  options: PriceOutlierOptions = {},
): AnomalyFlag[] {
  const thresholdRatio = options.thresholdRatio ?? DEFAULT_THRESHOLD_RATIO;
  const flags: AnomalyFlag[] = [];

  const byCategory = groupBy(records, (r) => r.category);

  for (const categoryRecords of byCategory.values()) {
    const sorted = [...categoryRecords].sort((a, b) => a.contractDate.localeCompare(b.contractDate));
    const monthlyRate = (r: ExpenseRecord) => r.amount / r.periodMonths;

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const history = sorted.slice(0, i).map(monthlyRate);
      if (history.length === 0) continue;

      const historyMedianRate = median(history);
      const currentRate = monthlyRate(current);
      const ratio = currentRate / historyMedianRate;

      if (ratio >= thresholdRatio) {
        const bounds = iqrBounds(history);
        flags.push({
          type: 'PRICE_OUTLIER',
          vendor: current.vendor,
          category: current.category,
          recordIds: [current.id],
          description: `${current.category} 계약(${current.vendor}, ${current.contractDate}) 금액이 과거 이력 대비 시세보다 ${((ratio - 1) * 100).toFixed(1)}% 높습니다.`,
          reference: {
            amount: current.amount,
            monthlyRate: Math.round(currentRate),
            historyMedianRate: Math.round(historyMedianRate),
            ratioToHistoryMedian: Number(ratio.toFixed(3)),
            thresholdRatio,
            historySampleSize: history.length,
            historyMonthlyRates: history.map(Math.round),
            iqrBounds: bounds,
            zScoreVsHistory: Number(zScore(currentRate, history).toFixed(2)),
          },
        });
      }
    }
  }

  return flags;
}
