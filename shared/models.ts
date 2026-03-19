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
