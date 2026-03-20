import { processSageChatStream } from '@/shared/gemini';
import { Income, Expense } from '@/shared/models';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('CRITICAL: GEMINI_API_KEY is null or undefined in API route');
    } else {
      console.log(`GEMINI_API_KEY is present (starts with ${apiKey.substring(0, 5)}...)`);
    }

    if (!apiKey) {
      console.error('Missing GEMINI_API_KEY');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    // Initialize Supabase client to fetch incomes
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

    console.log('Chat API Request context:', { 
      messageLength: message?.length, 
      expensesCount: expenses?.length || 0,
      incomesCount: incomes?.length || 0,
      hasGeminiKey: !!apiKey
    });

    const stream = await processSageChatStream(message, (expenses as Expense[]) || [], (incomes as Income[]) || []);

    console.log('Chat API Streaming started');
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
