import { type NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/shared/local-ai';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { query, expenses } = await req.json();
    if (!query || !expenses) {
      return NextResponse.json({ error: 'Query and expenses are required' }, { status: 400 });
    }

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('locale, currency')
      .eq('id', user.id)
      .single();

    const locale = profile?.locale || 'en-LK';
    const currency = profile?.currency || 'LKR';

    const data = await processQuery(query, expenses, locale, currency);

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Query Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
