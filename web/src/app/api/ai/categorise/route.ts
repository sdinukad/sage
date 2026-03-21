import { NextRequest, NextResponse } from 'next/server';
import { classifyCategory } from '@/shared/local-ai';

export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json();
    if (!note) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    const category = classifyCategory(note);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('AI Categorise Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
