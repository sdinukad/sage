export type Category = string;

export interface Expense {
  id: string;
  amount: number;              // Original amount (immutable)
  currency: string;            // Original currency code e.g. 'LKR' (immutable)
  base_amount: number;         // Converted to user's base currency (derived)
  base_currency: string;       // User's base currency at time of conversion (derived)
  exchange_rate: number;       // Rate used: amount * exchange_rate = base_amount (derived)
  category: Category;
  note: string;
  date: string; // ISO string
  user_id: string;
}

export interface Income {
  id: string;
  amount: number;
  currency: string;
  base_amount: number;
  base_currency: string;
  exchange_rate: number;
  category: Category;
  note: string;
  date: string; // ISO string
  user_id: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  category: string;
  note: string;
  type: 'expense' | 'income';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_week?: number;    // 0-6
  day_of_month?: number;   // 1-31
  month_of_year?: number;  // 1-12
  start_date: string;
  active: boolean;
  last_processed_date?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AICategory {
  name: string;
  hints?: string;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  locale: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'LKR', name: 'Sri Lankan Rupee', locale: 'en-LK', flag: '🇱🇰' },
  { code: 'USD', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  { code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG', flag: '🇸🇬' },
  { code: 'AED', name: 'UAE Dirham', locale: 'ar-AE', flag: '🇦🇪' },
  { code: 'CHF', name: 'Swiss Franc', locale: 'de-CH', flag: '🇨🇭' },
  { code: 'THB', name: 'Thai Baht', locale: 'th-TH', flag: '🇹🇭' },
  { code: 'MYR', name: 'Malaysian Ringgit', locale: 'ms-MY', flag: '🇲🇾' },
  { code: 'KRW', name: 'South Korean Won', locale: 'ko-KR', flag: '🇰🇷' },
  { code: 'NZD', name: 'New Zealand Dollar', locale: 'en-NZ', flag: '🇳🇿' },
];

export interface ChatAction {
  type: 'query' | 'add' | 'edit' | 'add_expense' | 'add_income' | 'edit_expense' | 'edit_income' | 'add_recurring' | 'edit_recurring' | 'unknown';
  data?: {
      matchedIds?: string[];
      newExpense?: Partial<Expense>;
      newIncome?: Partial<Income>;
      newRecurring?: Partial<RecurringTransaction>;
      editExpense?: { id: string; changes: Partial<Expense> };
      editIncome?: { id: string; changes: Partial<Income> };
      editRecurring?: { id: string; changes: Partial<RecurringTransaction> };
  };
  confirmationText?: string;
}

export interface ChatResponse {
  answer: string;
  actions: ChatAction[];
  confidence?: number;
}
