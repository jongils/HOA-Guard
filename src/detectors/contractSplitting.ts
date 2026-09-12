import type { AnomalyFlag, ExpenseRecord } from '../types.js';
import { groupBy } from './groupBy.js';

const DEFAULT_BIDDING_THRESHOLD = 30_000_000; // 예시 기준: 이 금액 이상은 경쟁입찰이 필요하다고 가정 (실제 법정 기준은 단지별 규정 확인 필요)

export interface ContractSplittingOptions {
  biddingThreshold?: number;
}

/**
 * 같은 업체·카테고리·연도 안에서 여러 건의 계약으로 나눠 체결했는데,
 * 개별 계약은 입찰 기준액 미달이지만 합산하면 기준액을 넘는 "계약 쪼개기" 패턴을 탐지한다.
 * 연도 단위로 묶는 것은 단순화한 근사치이며, 연말/연초에 걸친 분할은 놓칠 수 있다.
 */
export function detectContractSplitting(
  records: ExpenseRecord[],
  options: ContractSplittingOptions = {},
): AnomalyFlag[] {
  const biddingThreshold = options.biddingThreshold ?? DEFAULT_BIDDING_THRESHOLD;
  const flags: AnomalyFlag[] = [];

  const byVendorCategoryYear = groupBy(
    records,
    (r) => `${r.vendor}::${r.category}::${r.contractDate.slice(0, 4)}`,
  );

  for (const group of byVendorCategoryYear.values()) {
    if (group.length < 2) continue;

    const allBelowThreshold = group.every((r) => r.amount < biddingThreshold);
    const total = group.reduce((sum, r) => sum + r.amount, 0);

    if (allBelowThreshold && total >= biddingThreshold) {
      const sorted = [...group].sort((a, b) => a.contractDate.localeCompare(b.contractDate));
      flags.push({
        type: 'CONTRACT_SPLITTING',
        vendor: sorted[0].vendor,
        category: sorted[0].category,
        recordIds: sorted.map((r) => r.id),
        description: `${sorted[0].category} 계약에서 ${sorted[0].vendor}와 ${sorted.length}건으로 나눠 체결한 계약의 합계(${total.toLocaleString()}원)가 입찰 기준액(${biddingThreshold.toLocaleString()}원)을 초과합니다.`,
        reference: {
          contractCount: sorted.length,
          contractDates: sorted.map((r) => r.contractDate),
          individualAmounts: sorted.map((r) => r.amount),
          totalAmount: total,
          biddingThreshold,
        },
      });
    }
  }

  return flags;
}
