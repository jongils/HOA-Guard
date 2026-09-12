export type ContractType = '수의계약' | '경쟁입찰';

export interface ExpenseRecord {
  id: string;
  contractDate: string;
  vendor: string;
  category: string;
  contractType: ContractType;
  quantity: number;
  unitPrice: number;
  amount: number;
  periodMonths: number;
  note?: string;
}

export interface AnomalyFlag {
  type: 'PRICE_OUTLIER' | 'REPEATED_VENDOR' | 'CONTRACT_SPLITTING';
  vendor: string;
  category: string;
  recordIds: string[];
  description: string;
  reference: Record<string, unknown>;
}

export type ComplexSizeBand = '소형' | '중형' | '대형';

/** 유사 규모 단지의 실제 낙찰가 데이터 (외부 시세 비교 기준) */
export interface BidBenchmark {
  id: string;
  category: string;
  complexSizeBand: ComplexSizeBand;
  amount: number;
  periodMonths: number;
  contractDate: string;
  source: string;
}

/** 우리 단지가 받은 견적서 */
export interface QuoteSubmission {
  id: string;
  category: string;
  vendor: string;
  complexSizeBand: ComplexSizeBand;
  amount: number;
  periodMonths: number;
  submittedAt: string;
}

export type BidComparisonVerdict = 'HIGH' | 'NORMAL' | 'LOW' | 'NO_BENCHMARK';

export interface BidComparisonResult {
  quoteId: string;
  category: string;
  vendor: string;
  complexSizeBand: ComplexSizeBand;
  verdict: BidComparisonVerdict;
  description: string;
  reference: Record<string, unknown>;
}

/** 표준화된 입찰 공고문 입력 (자유 텍스트가 아닌 구조화된 항목만 검증) */
export interface AnnouncementInput {
  title: string;
  category: string;
  publishedAt: string;
  deadlineAt: string;
  eligibility: string[];
  evaluationCriteria: { name: string; weight: number }[];
  specifiedBrands: string[];
}

export interface AnnouncementFlag {
  type: 'SHORT_NOTICE_PERIOD' | 'BRAND_SPECIFIED' | 'EVALUATION_WEIGHT_INVALID';
  description: string;
  reference: Record<string, unknown>;
}
