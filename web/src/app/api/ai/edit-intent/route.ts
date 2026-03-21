import { type NextRequest, NextResponse } from 'next/server';
import { processEditIntent } from '@/shared/local-ai';

export async function POST(req: NextRequest) {
  try {
    const { message, expenses } = await req.json();
    if (!message || !expenses) {
      return NextResponse.json({ error: 'Message and expenses are required' }, { status: 400 });
    }

    const data = await processEditIntent(message, expenses);

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Edit Intent Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
