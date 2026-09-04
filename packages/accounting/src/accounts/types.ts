export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  type: AccountType;
  isActive: boolean;
}

export interface CreateAccountInput {
  code: string;
  nameAr: string;
  nameEn?: string;
  type: AccountType;
  isActive?: boolean;
}
