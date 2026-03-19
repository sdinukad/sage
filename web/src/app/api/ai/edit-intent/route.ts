import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense } from '@/shared/models';

export async function POST(req: NextRequest) {
  try {
    const { message, expenses } = await req.json();
    if (!message || !expenses) {
      return NextResponse.json({ error: 'Message and expenses are required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `User wants to edit an expense. Identify which expense ID they mean and what to change.
Expenses: ${JSON.stringify(expenses)}
Message: "${message}"

Return ONLY a JSON object:
{
  "expenseId": "uuid or null",
  "changes": { "amount": 123, "category": "Food", "note": "...", "date": "..." },
  "confirmationText": "I found the expense for 'Uber' yesterday. Change amount to 1200?"
}`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Edit Intent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
