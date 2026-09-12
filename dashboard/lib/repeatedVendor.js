import { groupBy } from './groupBy.js';

const DEFAULT_STREAK_THRESHOLD = 3; // 동일 업체 연속 수의계약 허용 횟수

/**
 * 같은 카테고리 안에서 동일 업체가 경쟁입찰 없이 연속으로 수의계약을 반복하면 플래깅한다.
 * 경쟁입찰이 끼거나 업체가 바뀌면 연속 횟수는 끊긴다.
 */
export function detectRepeatedVendor(records, options = {}) {
  const streakThreshold = options.streakThreshold ?? DEFAULT_STREAK_THRESHOLD;
  const flags = [];

  const byCategory = groupBy(records, (r) => r.category);

  for (const categoryRecords of byCategory.values()) {
    const sorted = [...categoryRecords].sort((a, b) => a.contractDate.localeCompare(b.contractDate));

    let streak = [];
    const flushStreak = () => {
      if (streak.length >= streakThreshold) {
        flags.push(buildFlag(streak, streakThreshold));
      }
      streak = [];
    };

    for (const record of sorted) {
      const sameVendorAsStreak = streak.length === 0 || streak[streak.length - 1].vendor === record.vendor;

      if (record.contractType === '수의계약' && sameVendorAsStreak) {
        streak.push(record);
      } else if (record.contractType === '수의계약') {
        flushStreak();
        streak = [record];
      } else {
        flushStreak();
      }
    }
    flushStreak();
  }

  return flags;
}

function buildFlag(streak, threshold) {
  const vendor = streak[0].vendor;
  const category = streak[0].category;
  return {
    type: 'REPEATED_VENDOR',
    vendor,
    category,
    recordIds: streak.map((r) => r.id),
    description: `${category} 계약에서 ${vendor}가 경쟁입찰 없이 ${streak.length}회 연속 수의계약을 체결했습니다.`,
    reference: {
      consecutiveCount: streak.length,
      threshold,
      contractDates: streak.map((r) => r.contractDate),
      amounts: streak.map((r) => r.amount),
    },
  };
}
