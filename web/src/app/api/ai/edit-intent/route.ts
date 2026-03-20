import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let genAI: GoogleGenerativeAI;
let model: GenerativeModel;

function getModel() {
  if (!model) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
  }
  return model;
}

export async function POST(req: NextRequest) {
  try {
    const { message, expenses } = await req.json();
    if (!message || !expenses) {
      return NextResponse.json({ error: 'Message and expenses are required' }, { status: 400 });
    }

    const currentModel = getModel();

    const prompt = `User wants to edit an expense. Identify which expense ID they mean and what to change.
Expenses: ${JSON.stringify(expenses)}
Message: "${message}"

Return ONLY a JSON object:
{
  "expenseId": "uuid or null",
  "changes": { "amount": 123, "category": "Food", "note": "...", "date": "..." },
  "confirmationText": "I found the expense for 'Uber' yesterday. Change amount to 1200?"
}`;
    
    const result = await currentModel.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Edit Intent Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
