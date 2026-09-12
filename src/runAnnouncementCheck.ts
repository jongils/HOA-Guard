import { checkAnnouncement } from './bidAnnouncementChecker.js';
import type { AnnouncementInput } from './types.js';

const goodExample: AnnouncementInput = {
  title: '202X년도 단지 승강기 유지보수 용역 입찰 공고',
  category: '승강기유지보수',
  publishedAt: '2025-09-01',
  deadlineAt: '2025-09-15',
  eligibility: ['승강기 유지관리업 등록업체', '최근 3년 이내 동종 실적 1건 이상'],
  evaluationCriteria: [
    { name: '가격', weight: 40 },
    { name: '기술/수행능력', weight: 30 },
    { name: '실적/신뢰도', weight: 20 },
    { name: '기타', weight: 10 },
  ],
  specifiedBrands: [],
};

const badExample: AnnouncementInput = {
  title: '202X년도 단지 보안 용역 입찰 공고',
  category: '보안',
  publishedAt: '2025-09-01',
  deadlineAt: '2025-09-05',
  eligibility: ['경비업 등록업체'],
  evaluationCriteria: [{ name: '가격', weight: 60 }],
  specifiedBrands: ['OO사 관제 시스템'],
};

for (const [label, announcement] of [
  ['정상 예시', goodExample],
  ['문제 예시', badExample],
] as const) {
  const flags = checkAnnouncement(announcement);
  console.log(`--- ${label}: ${announcement.title} ---`);
  if (flags.length === 0) {
    console.log('플래그 없음 (표준 템플릿 조건 충족)');
  }
  for (const flag of flags) {
    console.log(`[${flag.type}] ${flag.description}`);
    console.log('  판단 근거:', JSON.stringify(flag.reference));
  }
  console.log();
}
