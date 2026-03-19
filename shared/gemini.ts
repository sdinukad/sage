import { Category, Expense } from './models';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<any> {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                response_mime_type: "application/json",
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

export async function categoriseExpense(note: string): Promise<Category> {
    const prompt = `Given this expense description, return ONLY one of these categories with no other text: Food, Transport, Bills, Entertainment, Health, Shopping, Other. Description: ${note}`;
    
    try {
        // Adjusting call to return plain text for single category
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });
        const data = await response.json();
        const category = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() as Category;
        
        const validCategories: Category[] = ["Food", "Transport", "Bills", "Entertainment", "Health", "Shopping", "Other"];
        return validCategories.includes(category) ? category : "Other";
    } catch (error) {
        return "Other";
    }
}

export async function parseNaturalQuery(
    query: string, 
    expenses: Expense[]
): Promise<{ answer: string; matchedIds: string[] }> {
    const prompt = `You are an expense assistant. Answer the user's question using only the provided expense data. Return ONLY this JSON:
    { "answer": string, "matchedIds": string[] }
    Expenses: ${JSON.stringify(expenses)}
    Question: ${query}`;

    try {
        const result = await callGemini(prompt);
        return {
            answer: result.answer || "Sorry, I couldn't understand that.",
            matchedIds: result.matchedIds || []
        };
    } catch (error) {
        return { answer: "Sorry, I couldn't understand that.", matchedIds: [] };
    }
}

export async function parseEditIntent(
    message: string, 
    expenses: Expense[]
): Promise<{
    expenseId: string | null,
    changes: Partial<Pick<Expense, 'amount'|'category'|'date'|'note'>> | null,
    confirmationText: string
}> {
    const prompt = `You are an expense editor. Identify which expense the user wants to edit and what changes to make. Return ONLY this JSON:
    {
      "expenseId": string or null,
      "changes": { "amount"?: number, "category"?: string, "date"?: ISO string, "note"?: string } or null,
      "confirmationText": string (e.g. 'Change the Uber on March 5 from 850 to 1200?')
    }
    If unclear, set expenseId and changes to null, ask for clarification in confirmationText.
    Expenses: ${JSON.stringify(expenses)}
    Message: ${message}`;

    try {
        const result = await callGemini(prompt);
        return {
            expenseId: result.expenseId || null,
            changes: result.changes || null,
            confirmationText: result.confirmationText || "I'm not sure what you want to change."
        };
    } catch (error) {
        return {
            expenseId: null,
            changes: null,
            confirmationText: "Sorry, I couldn't parse your edit request."
        };
    }
}
