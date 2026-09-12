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
