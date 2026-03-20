import { Category, Expense, ChatAction, ChatResponse } from './models';

const MODEL = 'gemini-3-flash-preview';

function getApiUrl() {
    const key = process.env.GEMINI_API_KEY;
    return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
}

async function callGemini(prompt: string): Promise<any> {
    const url = getApiUrl();
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${text}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean up markdown code blocks if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(text);
    } catch (e) {
        // Fallback: search for JSON in the text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (innerE) {}
        }
        console.error("Gemini JSON Parse Error:", e, "Raw Text:", text);
        return { answer: text, actions: [] };
    }
}

export async function categoriseExpense(note: string): Promise<Category> {
    const prompt = `Given this expense description, return ONLY one of these categories with no other text: Food, Transport, Bills, Entertainment, Health, Shopping, Other. Description: ${note}`;
    
    try {
        const url = getApiUrl();
        const response = await fetch(url, {
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

export async function processSageChat(
    message: string,
    expenses: Expense[]
): Promise<ChatResponse> {
    const prompt = `You are Sage, a helpful personal accountant. 
    Analyze the user's message and current expenses. 
    A user message might contain MULTIPLE requests (e.g., "I spent 10 on lunch and 15 on coffee").
    
    For each request in the message, identify the intent:
    1. QUERY: Ask for information about their spending.
    2. ADD: Record a new expense.
    3. EDIT: Modify an existing expense.

    Return ONLY JSON:
    {
        "answer": "Greeting and summary of what you found",
        "actions": [
            {
                "type": "query" | "add" | "edit" | "unknown",
                "data": {
                    "matchedIds": ["uuid", ...],
                    "newExpense": { "amount": number, "category": "Food"|"Transport"|"Bills"|"Entertainment"|"Health"|"Shopping"|"Other", "note": "string", "date": "ISO string" },
                    "editExpense": { "id": "uuid", "changes": { ... } }
                },
                "confirmationText": "Confirmation question for this action"
            }
        ]
    }

    If no expenses match a query, return matchedIds: [].
    If recording multiple expenses, add multiple items to the "actions" array.

    Current Date: ${new Date().toISOString()}
    Expenses: ${JSON.stringify(expenses)}
    User Message: ${message}`;

    try {
        const result = await callGemini(prompt);
        return {
            answer: result.answer || "Processed your request.",
            actions: result.actions || []
        };
    } catch (error) {
        console.error("Sage Chat Error:", error);
        return {
            answer: "Sorry, I'm having trouble processing that right now.",
            actions: []
        };
    }
}
