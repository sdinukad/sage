export type Category = string;
export interface AICategory { name: string; hints?: string; }

export interface Expense {
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

export interface User {
  id: string;
  email: string;
}

export type IncomeCategory = string;

export interface Income {
  id: string;
  amount: number;
  currency: string;
  base_amount: number;
  base_currency: string;
  exchange_rate: number;
  category: IncomeCategory;
  note: string;
  date: string;
  user_id: string;
}

export interface CurrencyConfig {
  code: string;
  name: string;
  locale: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  // Major Globals
  { code: 'USD', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', locale: 'de-DE', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', locale: 'zh-CN', flag: '🇨🇳' },
  // Regional Favorites (South Asia/Middle East)
  { code: 'LKR', name: 'Sri Lankan Rupee', locale: 'en-LK', flag: '🇱🇰' },
  { code: 'INR', name: 'Indian Rupee', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'AED', name: 'UAE Dirham', locale: 'ar-AE', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', locale: 'ar-SA', flag: '🇸🇦' },
  { code: 'PKR', name: 'Pakistani Rupee', locale: 'en-PK', flag: '🇵🇰' },
  { code: 'BDT', name: 'Bangladeshi Taka', locale: 'bn-BD', flag: '🇧🇩' },
  { code: 'QAR', name: 'Qatari Riyal', locale: 'ar-QA', flag: '🇶🇦' },
  // Asia Pacific
  { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', flag: '🇨🇦' },
  { code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG', flag: '🇸🇬' },
  { code: 'NZD', name: 'New Zealand Dollar', locale: 'en-NZ', flag: '🇳🇿' },
  { code: 'MYR', name: 'Malaysian Ringgit', locale: 'ms-MY', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', locale: 'th-TH', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', locale: 'id-ID', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', locale: 'en-PH', flag: '🇵🇭' },
  { code: 'VND', name: 'Vietnamese Dong', locale: 'vi-VN', flag: '🇻🇳' },
  { code: 'KRW', name: 'South Korean Won', locale: 'ko-KR', flag: '🇰🇷' },
  { code: 'HKD', name: 'Hong Kong Dollar', locale: 'zh-HK', flag: '🇭🇰' },
  // Europe & Americas
  { code: 'CHF', name: 'Swiss Franc', locale: 'de-CH', flag: '🇨🇭' },
  { code: 'SEK', name: 'Swedish Krona', locale: 'sv-SE', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', locale: 'nb-NO', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', locale: 'da-DK', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', locale: 'pl-PL', flag: '🇵🇱' },
  { code: 'TRY', name: 'Turkish Lira', locale: 'tr-TR', flag: '🇹🇷' },
  { code: 'MXN', name: 'Mexican Peso', locale: 'es-MX', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', locale: 'pt-BR', flag: '🇧🇷' },
  { code: 'CLP', name: 'Chilean Peso', locale: 'es-CL', flag: '🇨🇱' },
  { code: 'COP', name: 'Colombian Peso', locale: 'es-CO', flag: '🇨🇴' },
  // Africa & Others
  { code: 'ZAR', name: 'South African Rand', locale: 'en-ZA', flag: '🇿🇦' },
  { code: 'KES', name: 'Kenyan Shilling', locale: 'en-KE', flag: '🇰🇪' },
  { code: 'NGN', name: 'Nigerian Naira', locale: 'en-NG', flag: '🇳🇬' },
  { code: 'EGP', name: 'Egyptian Pound', locale: 'ar-EG', flag: '🇪🇬' },
  { code: 'ILS', name: 'Israeli Shekel', locale: 'he-IL', flag: '🇮🇱' },
];

export interface ChatAction {
  type: 'query' | 'add_expense' | 'add_income' | 'edit_expense' | 'edit_income' | 'unknown';
  data?: {
      matchedIds?: string[];
      newExpense?: Partial<Expense>;
      newIncome?: Partial<Income>;
      editExpense?: { id: string; changes: Partial<Expense> };
      editIncome?: { id: string; changes: Partial<Income> };
  };
  confirmationText?: string;
}

export interface ChatResponse {
  answer: string;
  actions: ChatAction[];
  confidence?: number;
}
