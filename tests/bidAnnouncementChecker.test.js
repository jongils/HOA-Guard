import { describe, expect, it } from 'vitest';
import { checkAnnouncement } from '../dashboard/lib/bidAnnouncementChecker.js';

const compliant = {
  title: '테스트 공고',
  category: '승강기유지보수',
  publishedAt: '2025-09-01',
  deadlineAt: '2025-09-15',
  eligibility: ['승강기 유지관리업 등록업체'],
  evaluationCriteria: [
    { name: '가격', weight: 40 },
    { name: '기술력', weight: 30 },
    { name: '실적', weight: 30 },
  ],
  specifiedBrands: [],
};

describe('checkAnnouncement', () => {
  it('returns no flags for a fully compliant announcement', () => {
    expect(checkAnnouncement(compliant)).toEqual([]);
  });

  it('flags a notice period shorter than the minimum', () => {
    const flags = checkAnnouncement({ ...compliant, deadlineAt: '2025-09-05' });
    expect(flags.some((f) => f.type === 'SHORT_NOTICE_PERIOD')).toBe(true);
  });

  it('flags a specified brand/product requirement', () => {
    const flags = checkAnnouncement({ ...compliant, specifiedBrands: ['OO사 제품'] });
    expect(flags.some((f) => f.type === 'BRAND_SPECIFIED')).toBe(true);
  });

  it('flags evaluation criteria that do not sum to 100', () => {
    const flags = checkAnnouncement({ ...compliant, evaluationCriteria: [{ name: '가격', weight: 60 }] });
    expect(flags.some((f) => f.type === 'EVALUATION_WEIGHT_INVALID')).toBe(true);
  });

  it('flags missing evaluation criteria entirely', () => {
    const flags = checkAnnouncement({ ...compliant, evaluationCriteria: [] });
    expect(flags.some((f) => f.type === 'EVALUATION_WEIGHT_INVALID')).toBe(true);
  });

  it('can raise multiple flags at once', () => {
    const flags = checkAnnouncement({
      ...compliant,
      deadlineAt: '2025-09-03',
      specifiedBrands: ['OO사 제품'],
      evaluationCriteria: [{ name: '가격', weight: 60 }],
    });
    expect(flags).toHaveLength(3);
  });
});
