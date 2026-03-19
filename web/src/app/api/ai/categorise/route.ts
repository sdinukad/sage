import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json();
    if (!note) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `Categorise the following expense note into one of these categories: Food, Transport, Bills, Entertainment, Health, Shopping, Other.
Note: "${note}"
Return only the category name.`;
    
    const result = await model.generateContent(prompt);
    const category = result.response.text().trim();

    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('AI Categorise Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
