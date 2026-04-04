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
  recurring_id?: string;
  created_at?: string;
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
  recurring_id?: string;
  created_at?: string;
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
  interval?: number;
  day_of_week?: number;    // 0-6
  day_of_month?: number;   // 1-31
  month_of_year?: number;  // 1-12
  start_date: string;
  active: boolean;
  last_processed_date?: string;
  created_at: string;
}

/**
 * Extracts scheduling fields from a date and frequency for recurring transactions.
 */
export function getRecurringSchedule(dateStr: string, frequency: string) {
  const date = new Date(dateStr);
  const day_of_week = date.getDay();
  const day_of_month = date.getDate();
  const month_of_year = date.getMonth() + 1;

  switch (frequency) {
    case 'daily':
      return {};
    case 'weekly':
      return { day_of_week };
    case 'monthly':
      return { day_of_month };
    case 'yearly':
      return { day_of_month, month_of_year };
    default:
      return {};
  }
}

/**
 * Generates a human-readable string for a recurring transaction's frequency.
 */
export function formatFrequency(recurring: RecurringTransaction): string {
  const { frequency, interval = 1, day_of_week, day_of_month, month_of_year } = recurring;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const getOrdinal = (n: number | null | undefined) => {
    if (n === null || n === undefined) return '';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 10) === 10 ? 0 : (v % 10)] || s[0]);
  };

  const hasScheduleValue = (v: unknown) => v !== null && v !== undefined;

  const intervalText = interval > 1 ? `Every ${interval} ` : 'Every ';

  switch (frequency) {
    case 'daily':
      return interval > 1 ? `Every ${interval} days` : 'Daily';
    case 'weekly':
      const dayName = hasScheduleValue(day_of_week) ? days[day_of_week!] : '';
      return `${intervalText}week${interval > 1 ? 's' : ''}${dayName ? ` on ${dayName}` : ''}`;
    case 'monthly':
      const dom = hasScheduleValue(day_of_month) ? getOrdinal(day_of_month) : '';
      return `${intervalText}month${interval > 1 ? 's' : ''}${dom ? ` on the ${dom}` : ''}`;
    case 'yearly':
      const domYearly = hasScheduleValue(day_of_month) ? getOrdinal(day_of_month) : '';
      const monthName = hasScheduleValue(month_of_year) ? months[month_of_year!] : '';
      return `${intervalText}year${interval > 1 ? 's' : ''}${monthName ? ` on ${monthName}${domYearly ? ` ${domYearly}` : ''}` : ''}`;
    default:
      return frequency;
  }
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  pendingAction?: ChatAction;
  confidence?: number;
}
