import type { AnnouncementFlag, AnnouncementInput } from './types.js';

const MIN_NOTICE_DAYS = 10; // 예시 기준: 공고~마감 최소 기간 (단지 규약에 맞게 조정 가능)
const WEIGHT_TOLERANCE = 0.01;

/**
 * 자유 텍스트가 아닌 구조화된 공고 항목만 검사한다 — 애매한 문구 판단은 여전히
 * 사람(대표회의)의 몫이며, 여기서는 객관적으로 확인 가능한 조건만 플래깅한다.
 */
export function checkAnnouncement(input: AnnouncementInput): AnnouncementFlag[] {
  const flags: AnnouncementFlag[] = [];

  const noticeDays = daysBetween(input.publishedAt, input.deadlineAt);
  if (noticeDays < MIN_NOTICE_DAYS) {
    flags.push({
      type: 'SHORT_NOTICE_PERIOD',
      description: `공고 기간이 ${noticeDays}일로, 권장 최소 기간(${MIN_NOTICE_DAYS}일)보다 짧습니다. 특정 업체만 사전에 준비할 시간을 벌 수 있습니다.`,
      reference: { publishedAt: input.publishedAt, deadlineAt: input.deadlineAt, noticeDays, minNoticeDays: MIN_NOTICE_DAYS },
    });
  }

  if (input.specifiedBrands.length > 0) {
    flags.push({
      type: 'BRAND_SPECIFIED',
      description: `특정 브랜드/제품(${input.specifiedBrands.join(', ')})을 지정했습니다. 동등 이상 제품을 허용하는 문구로 대체하는 것을 권장합니다.`,
      reference: { specifiedBrands: input.specifiedBrands },
    });
  }

  const totalWeight = input.evaluationCriteria.reduce((sum, c) => sum + c.weight, 0);
  if (input.evaluationCriteria.length === 0 || Math.abs(totalWeight - 100) > WEIGHT_TOLERANCE) {
    flags.push({
      type: 'EVALUATION_WEIGHT_INVALID',
      description: `평가기준 배점 합계가 ${totalWeight}점입니다. 100점 만점의 세부 배점표가 사전에 공개되어야 자의적 심사를 막을 수 있습니다.`,
      reference: { evaluationCriteria: input.evaluationCriteria, totalWeight },
    });
  }

  return flags;
}

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}
