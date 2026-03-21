import { processChat } from '@/shared/local-ai';
import { Income, Expense } from '@/shared/models';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, expenseCategories, incomeCategories } = await req.json();

    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [ { data: incomes }, { data: expenses } ] = await Promise.all([
      supabase.from('incomes').select('*').order('date', { ascending: false }),
      supabase.from('expenses').select('*').order('date', { ascending: false })
    ]);

    console.log('Chat API Request:', { 
      messageLength: message?.length, 
      expensesCount: expenses?.length || 0,
      incomesCount: incomes?.length || 0,
    });

    const result = await processChat(
      message, 
      (expenses as Expense[]) || [], 
      expenseCategories || [],
      incomeCategories || [],
      (incomes as Income[]) || []
    );

    console.log('Chat API Response:', { answer: result.answer.substring(0, 80), actionsCount: result.actions.length });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
