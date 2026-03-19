import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense } from '@/shared/models';

export async function POST(req: NextRequest) {
  try {
    const { query, expenses } = await req.json();
    if (!query || !expenses) {
      return NextResponse.json({ error: 'Query and expenses are required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are Sage, an AI expense assistant. Given the user's query and their list of expenses, provide a helpful answer and identify which expense IDs (if any) are relevant.
Expenses: ${JSON.stringify(expenses)}
User Query: "${query}"

Return ONLY a JSON object:
{
  "answer": "your natural language response",
  "matchedIds": ["uuid1", "uuid2"]
}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Query Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
