export type Category = "Food" | "Transport" | "Bills" | "Entertainment" | "Health" | "Shopping" | "Other";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  note: string;
  date: string; // ISO string
  user_id: string;
}

export interface User {
  id: string;
  email: string;
}

export type IncomeCategory = 'Salary' | 'Bonus' | 'Investment' | 'Gift' | 'Other';

export interface Income {
  id: string;
  amount: number;
  category: IncomeCategory;
  note: string;
  date: string;
  user_id: string;
}

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
}
