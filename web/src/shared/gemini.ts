import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense, ChatResponse, Income, ChatAction, AICategory } from './models';

const MODELS = [
    'gemini-3.1-flash-lite-preview', // Fastest & Primary
    'gemini-2.5-flash',              // Secondary robust fallback
    'gemma-3-27b-it',                // Free tier exhausted
    'gemma-3-12b-it', 
    'gemma-3-4b-it',  
    'gemma-3-1b-it',
];

// Initialize the SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GeminiResponse {
    answer?: string;
    actions?: ChatAction[];
}

async function callGemini(prompt: string): Promise<GeminiResponse> {
    let lastError: Error | unknown;

    for (const modelName of MODELS) {
        try {
            console.log(`Calling Gemini SDK with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName
            });
            
            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            console.log(`Gemini raw text received from ${modelName} (first 100 chars):`, text.substring(0, 100));

            try {
                return JSON.parse(text) as GeminiResponse;
            } catch (e) {
                console.warn(`JSON.parse failed for ${modelName}, trying regex match`, e);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        return JSON.parse(jsonMatch[0]) as GeminiResponse;
                    } catch (innerE) {
                        console.error(`Regex JSON match parse failed for ${modelName}`, innerE);
                    }
                }
                // If it's just text, treat it as the answer
                return { answer: text, actions: [] };
            }
        } catch (err: unknown) {
            const e = err as Error;
            console.error(`Error with model ${modelName}:`, e.message || e);
            lastError = e;
            // Continue to next model in loop
            continue;
        }
    }

    // If we get here, all models failed
    console.error('All models failed in callGemini.');
    throw lastError || new Error('All models failed');
}

// categoriseExpense removed as it was hardcoded and is now superseded by dynamic categories.

export async function processSageChat(
    message: string,
    expenses: Expense[],
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = [],
    incomes: Income[] = []
): Promise<ChatResponse> {
    const buildCatString = (cats: AICategory[], fallback: string) => {
        if (cats.length === 0) return fallback;
        return cats.map(c => c.hints ? `${c.name} (Hints: ${c.hints})` : c.name).join(', ');
    };
    const expCats = buildCatString(expenseCategories, 'Food, Transport, Bills, Entertainment, Health, Shopping, Other');
    const incCats = buildCatString(incomeCategories, 'Salary, Bonus, Investment, Gift, Other');

    const prompt = `You are Sage, a helpful personal accountant. 
    Analyze the user's message, current expenses, and current incomes. 
    You can now track both EXPENSES and INCOMES (e.g., salary, bonus).
    
    Expense Categories: ${expCats}
    Income Categories: ${incCats}
    
    For each request in the message, identify the intent:
    1. QUERY: Ask for information about spending or income.
    2. ADD_EXPENSE: Record a new expense.
    3. ADD_INCOME: Record a new income.
    4. EDIT_EXPENSE: Modify an existing expense.
    5. EDIT_INCOME: Modify an existing income.

    Return ONLY this JSON structure:
    {
        "answer": "A human-like greeting and summary",
        "actions": [
            {
                "type": "query" | "add_expense" | "add_income" | "edit_expense" | "edit_income" | "unknown",
                "data": {
                    "matchedIds": ["uuid", ...],
                    "newExpense": { "amount": number, "category": "...", "note": "...", "date": "ISO string" },
                    "newIncome": { "amount": number, "category": "Salary"|"Bonus"|"Investment"|"Gift"|"Other", "note": "...", "date": "ISO string" },
                    "editExpense": { "id": "uuid", "changes": { ... } },
                    "editIncome": { "id": "uuid", "changes": { ... } }
                },
                "confirmationText": "Clear confirmation question for this action"
            }
        ]
    }

    Current Date: ${new Date().toISOString()}
    Expenses: ${JSON.stringify(expenses)}
    Incomes: ${JSON.stringify(incomes)}
    User Message: ${message}`;

    try {
        const result = await callGemini(prompt);
        return {
            answer: result.answer || "Processed your request.",
            actions: result.actions || []
        };
    } catch (error) {
        console.error("Sage Chat Logic Error:", error);
        return {
            answer: "Sorry, I'm having trouble processing that right now.",
            actions: []
        };
    }
}

export async function processSageChatStream(
    message: string,
    expenses: Expense[],
    expenseCategories: AICategory[] = [],
    incomeCategories: AICategory[] = [],
    incomes: Income[] = []
): Promise<ReadableStream> {
    const buildCatString = (cats: AICategory[], fallback: string) => {
        if (cats.length === 0) return fallback;
        return cats.map(c => c.hints ? `${c.name} (Hints: ${c.hints})` : c.name).join(', ');
    };
    const expCats = buildCatString(expenseCategories, 'Food, Transport, Bills, Entertainment, Health, Shopping, Other');
    const incCats = buildCatString(incomeCategories, 'Salary, Bonus, Investment, Gift, Other');

    const prompt = `You are Sage, a helpful personal accountant. 
    Analyze the user's message, current expenses, and current incomes. 
    You can now track both EXPENSES and INCOMES (e.g., salary, bonus).
    
    Expense Categories: ${expCats}
    Income Categories: ${incCats}
    
    For each request in the message, identify the intent:
    1. QUERY: Ask for information about spending or income.
    2. ADD_EXPENSE: Record a new expense.
    3. ADD_INCOME: Record a new income.
    4. EDIT_EXPENSE: Modify an existing expense.
    5. EDIT_INCOME: Modify an existing income.

    Return ONLY this JSON structure:
    {
        "answer": "A human-like greeting and summary",
        "actions": [
            {
                "type": "query" | "add_expense" | "add_income" | "edit_expense" | "edit_income" | "unknown",
                "data": {
                    "matchedIds": ["uuid", ...],
                    "newExpense": { "amount": number, "category": "...", "note": "...", "date": "ISO string" },
                    "newIncome": { "amount": number, "category": "Salary"|"Bonus"|"Investment"|"Gift"|"Other", "note": "...", "date": "ISO string" },
                    "editExpense": { "id": "uuid", "changes": { ... } },
                    "editIncome": { "id": "uuid", "changes": { ... } }
                },
                "confirmationText": "Clear confirmation question for this action"
            }
        ]
    }

    Current Date: ${new Date().toISOString()}
    Expenses: ${JSON.stringify(expenses)}
    Incomes: ${JSON.stringify(incomes)}
    User Message: ${message}`;

    let lastError: Error | unknown;

    for (const modelName of MODELS) {
        try {
            console.log(`Attempting streaming with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ 
                model: modelName
            });
            
            const result = await model.generateContentStream(prompt);
            
            // If we successfully get the result object, we can start the stream
            // Note: The actual streaming errors happen inside the for-await loop, 
            // but the initial connection/demand check happens here.
            
            const encoder = new TextEncoder();
            return new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of result.stream) {
                            controller.enqueue(encoder.encode(chunk.text()));
                        }
                        controller.close();
                    } catch (err) {
                        console.error(`Streaming error during iteration with ${modelName}:`, err);
                        // We can't easily fallback once the stream has started sending data to the client,
                        // but we can at least log it.
                        controller.error(err);
                    }
                }
            });
        } catch (err: unknown) {
            const e = err as { message?: string, status?: number };
            console.error(`Failed to start stream with model ${modelName}:`, e.message || e);
            lastError = e;
            // Only fallback if it's a transient error or not found
            if (e.status === 503 || e.status === 429 || e.status === 404) {
                continue;
            }
            throw e; // For other errors, fail fast
        }
    }

    throw lastError || new Error('All models failed to start streaming');
}
