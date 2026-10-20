export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'member';
  householdId: string;
  householdName: string;
  mustChangePassword: boolean;
  authenticated: boolean;
}

export interface HouseholdMember {
  id: string;
  full_name: string;
  username: string;
  role: 'admin' | 'member';
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  expense_type?: string;
  is_active: boolean;
}

export interface ExpenseShare {
  id: string;
  user_id: string;
  full_name?: string;
  amount_paise: number;
  share_type: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount_paise: number;
  category_id?: string;
  category_name?: string;
  beneficiary_id?: string;
  beneficiary_name?: string;
}

export interface Expense {
  id: string;
  expense_type: 'personal' | 'on_behalf' | 'common';
  description: string;
  amount_paise: number;
  category_id?: string;
  category_name?: string;
  paid_by: string;
  paid_by_name?: string;
  expense_date: string;
  split_method?: string;
  notes?: string;
  status: 'active' | 'reversed';
  created_at: string;
  items?: ExpenseItem[];
  shares?: ExpenseShare[];
}

export interface OnBehalfPurchase {
  id: string;
  description: string;
  expense_date: string;
  amount_paise: number;
  confirmed_paid_paise: number;
  paid_by: string;
  paid_by_name: string;
  notes?: string;
  items: Array<{
    id: string;
    description: string;
    amount_paise: number;
    category_name?: string;
    beneficiary_id: string;
    beneficiary_name: string;
  }>;
}

export interface OnBehalfForMePurchase {
  id: string;
  description: string;
  expense_date: string;
  paid_by: string;
  paid_by_name: string;
  notes?: string;
  my_total_paise: number;
  my_confirmed_paise: number;
  my_items: Array<{
    id: string;
    description: string;
    category_name?: string;
    my_share: number;
  }>;
}

export interface PairwiseDebt {
  creditorId: string;
  creditorName: string;
  grossOwe: number;
  confirmedPaid: number;
  crossOffset?: number;
  outstanding: number;
}

export interface PairwiseCredit {
  debtorId: string;
  debtorName: string;
  grossOwed: number;
  confirmedPaid: number;
  crossOffset?: number;
  outstanding: number;
}

export interface BalanceSummary {
  personalSpending: number;
  commonShare: number;
  commonPaid: number;
  advancedForOthers: number;
  owedToMe: number;
  owedByMe: number;
  pairwise: PairwiseCredit[];
  myDebts: PairwiseDebt[];
}

export interface Settlement {
  id: string;
  household_id: string;
  payer_id: string;
  payer_name: string;
  recipient_id: string;
  recipient_name: string;
  amount_paise: number;
  method: 'cash' | 'upi';
  status: 'pending' | 'verification_pending' | 'confirmed' | 'rejected' | 'cancelled';
  transaction_reference?: string;
  note?: string;
  expense_share_id?: string;
  claimed_at: string;
  confirmed_at?: string;
  confirmed_by?: string;
  confirmed_by_name?: string;
  created_at: string;
}

export interface UpiProfile {
  upi_id: string;
  display_name: string;
}

export interface ParsedAiExpense {
  expense_type: 'personal' | 'on_behalf' | 'common';
  description: string;
  amount_paise: number;
  expense_date: string;
  category?: string;
  notes?: string;
  split_method?: 'equal' | 'custom' | string;
  paid_by_id?: string;
  paid_by_name?: string;
  shares?: Array<{
    user_id: string;
    user_name: string;
    amount_paise: number;
  }>;
  items?: Array<{
    description: string;
    beneficiary_id: string;
    beneficiary_name?: string;
    amount_paise: number;
    category?: string;
  }>;
  summary?: string;
}

export interface AnalyticsKpi {
  totalSpendingPaise: number;
  personalSpendingPaise: number;
  commonSharePaise: number;
  onBehalfPaidPaise: number;
  transactionCount: number;
  dailyAveragePaise: number;
  topCategoryName: string;
  topCategoryPaise: number;
}

export interface AnalyticsTypeDistribution {
  personalPaise: number;
  personalPercentage: number;
  commonPaise: number;
  commonPercentage: number;
  onBehalfPaise: number;
  onBehalfPercentage: number;
}

export interface AnalyticsCategory {
  categoryName: string;
  totalPaise: number;
  percentage: number;
  count: number;
  personalPaise: number;
  commonPaise: number;
  onBehalfPaise: number;
}

export interface AnalyticsDailyTrend {
  date: string;
  totalPaise: number;
  personalPaise: number;
  commonPaise: number;
  onBehalfPaise: number;
  cumulativePaise: number;
  count: number;
}

export interface AnalyticsRoommate {
  roommateId: string;
  roommateName: string;
  totalPaise: number;
  count: number;
}

export interface AnalyticsTopTransaction {
  id: string;
  description: string;
  expenseDate: string;
  expenseType: 'personal' | 'common' | 'on_behalf';
  categoryName: string;
  amountPaise: number;
  otherUserName?: string;
}

export interface AnalyticsData {
  kpi: AnalyticsKpi;
  typeDistribution: AnalyticsTypeDistribution;
  categories: AnalyticsCategory[];
  dailyTrend: AnalyticsDailyTrend[];
  roommates: AnalyticsRoommate[];
  topTransactions: AnalyticsTopTransaction[];
}

export type AnalyticsVisualMode = 'donut' | 'trend' | 'distribution' | 'roommates' | 'table';

