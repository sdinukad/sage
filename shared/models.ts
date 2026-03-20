export type Category = string;

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

export interface ChatAction {
  type: 'query' | 'add' | 'edit' | 'unknown';
  data?: {
      matchedIds?: string[];
      newExpense?: Partial<Expense>;
      editExpense?: { id: string; changes: Partial<Expense> };
  };
  confirmationText?: string;
}

export interface ChatResponse {
  answer: string;
  actions: ChatAction[];
}
