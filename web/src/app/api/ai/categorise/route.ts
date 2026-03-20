import { NextRequest, NextResponse } from 'next/server';
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
    const { note } = await req.json();
    if (!note) {
      return NextResponse.json({ error: 'Note is required' }, { status: 400 });
    }

    const currentModel = getModel();

    const prompt = `Categorise the following expense note into one of these categories: Food, Transport, Bills, Entertainment, Health, Shopping, Other.
Note: "${note}"
Return only the category name.`;
    
    const result = await currentModel.generateContent(prompt);
    const category = result.response.text().trim();

    return NextResponse.json({ category });
  } catch (error) {
    console.error('AI Categorise Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
