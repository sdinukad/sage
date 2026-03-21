import { type NextRequest, NextResponse } from 'next/server';
import { processQuery } from '@/shared/local-ai';

export async function POST(req: NextRequest) {
  try {
    const { query, expenses } = await req.json();
    if (!query || !expenses) {
      return NextResponse.json({ error: 'Query and expenses are required' }, { status: 400 });
    }

    const data = await processQuery(query, expenses);

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Query Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
